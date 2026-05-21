"""
Polygon RPC Proxy — ZexAI Backend
Routes frontend JSON-RPC calls to Alchemy without exposing the API key.

Security:
  - Requires valid Supabase JWT (get_current_user).
  - Only whitelisted read-only eth_* methods are forwarded (no state-changing calls).
  - Request body size is capped at 16 KB.
  - Response is streamed directly from Alchemy with a 10-second timeout.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
import httpx
from typing import Any

from core.security import get_current_user
from core.config import settings
from core.logger import app_logger as logger

router = APIRouter(prefix="/rpc", tags=["RPC Proxy"])

# ── Alchemy endpoint — key lives ONLY in Railway env ──────────────────────────
_ALCHEMY_URL: str = settings.ALCHEMY_RPC_URL

# Whitelist of read-only JSON-RPC methods we're willing to proxy.
# This prevents the frontend from triggering eth_sendRawTransaction or
# any other state-changing / expensive method through our key.
_ALLOWED_METHODS: frozenset = frozenset({
    "eth_blockNumber",
    "eth_getBalance",
    "eth_call",
    "eth_getTransactionByHash",
    "eth_getTransactionReceipt",
    "eth_getTransactionCount",
    "eth_estimateGas",
    "eth_gasPrice",
    "eth_maxPriorityFeePerGas",
    "eth_getCode",
    "eth_getLogs",
    "eth_getStorageAt",
    "eth_chainId",
    "net_version",
    "eth_getBlockByNumber",
    "eth_getBlockByHash",
    # Multicall / aggregate
    "eth_getProof",
})

# Maximum request body: 16 KB
_MAX_BODY_BYTES = 16_384


@router.post("/polygon", summary="Polygon RPC Proxy")
async def polygon_rpc_proxy(
    request: Request,
    _current_user=Depends(get_current_user),
) -> Any:
    """
    Proxies whitelisted read-only Polygon JSON-RPC calls to Alchemy.
    Requires a valid user JWT — key never leaves the server.
    """
    if not _ALCHEMY_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RPC provider is not configured on this server.",
        )

    # ── Read and size-check body ───────────────────────────────────────────────
    body_bytes = await request.body()
    if len(body_bytes) > _MAX_BODY_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Request body too large.",
        )

    try:
        import json as _json
        payload = _json.loads(body_bytes)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON body.",
        )

    # ── Method whitelist check ─────────────────────────────────────────────────
    # Supports both single requests {"method": ...} and batch [{"method": ...}]
    requests_list = payload if isinstance(payload, list) else [payload]
    for rpc_req in requests_list:
        method = rpc_req.get("method", "")
        if method not in _ALLOWED_METHODS:
            logger.warning(
                f"[RPC Proxy] Blocked method '{method}' for user {_current_user.id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"RPC method '{method}' is not permitted through this proxy.",
            )

    # ── Forward to Alchemy ─────────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            alchemy_response = await client.post(
                _ALCHEMY_URL,
                content=body_bytes,
                headers={"Content-Type": "application/json"},
            )
        return JSONResponse(
            content=alchemy_response.json(),
            status_code=alchemy_response.status_code,
        )
    except httpx.TimeoutException:
        logger.error("[RPC Proxy] Alchemy request timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="RPC provider timed out.",
        )
    except Exception as exc:
        logger.error(f"[RPC Proxy] Alchemy request failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="RPC provider returned an error.",
        )
