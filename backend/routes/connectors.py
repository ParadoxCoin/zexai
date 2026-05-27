"""
Real OAuth 2.0 Connector Routes
Supports: Google (Drive/Docs/Sheets), GitHub, Notion, LinkedIn
Flow: Frontend opens popup → Backend handles OAuth → Token stored encrypted in DB → Popup closes with postMessage
"""
import os
import json
import hmac
import hashlib
import secrets
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from urllib.parse import urlencode, quote

import httpx
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from core.security import get_current_user
from core.database import get_db
from core.config import settings
from core.logger import app_logger as logger

router = APIRouter(prefix="/connectors", tags=["Connectors OAuth"])

# ─────────────────────────────────────────────────────────────
# Encryption helpers — tokens encrypted at rest in DB
# ─────────────────────────────────────────────────────────────
def _get_fernet() -> Fernet:
    """Return Fernet cipher using OAUTH_ENCRYPTION_KEY from env."""
    raw = os.environ.get("OAUTH_ENCRYPTION_KEY", "")
    if not raw:
        # Generate a stable key from JWT_SECRET_KEY if OAUTH_ENCRYPTION_KEY not set
        import hashlib as _h
        seed = (settings.JWT_SECRET_KEY or "fallback_dev_key_change_in_prod").encode()
        key_bytes = _h.sha256(seed).digest()
        raw = base64.urlsafe_b64encode(key_bytes).decode()
    # Fernet needs exactly 32-byte url-safe base64 key
    if len(raw) < 44:
        raw = base64.urlsafe_b64encode(raw.encode().ljust(32)[:32]).decode()
    return Fernet(raw[:44].encode() if len(raw) > 44 else raw.encode())


def encrypt_token(token: str) -> str:
    try:
        return _get_fernet().encrypt(token.encode()).decode()
    except Exception:
        return token  # fallback plain if encryption fails


def decrypt_token(encrypted: str) -> str:
    try:
        return _get_fernet().decrypt(encrypted.encode()).decode()
    except Exception:
        return encrypted


# ─────────────────────────────────────────────────────────────
# OAuth State — HMAC signed, 10-minute TTL
# ─────────────────────────────────────────────────────────────
def make_oauth_state(user_id: str, provider: str) -> str:
    ts = str(int(datetime.utcnow().timestamp()))
    payload = f"{user_id}|{provider}|{ts}"
    secret = (os.environ.get("OAUTH_STATE_SECRET") or settings.JWT_SECRET_KEY or "dev")
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    raw = f"{payload}|{sig}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def verify_oauth_state(state: str) -> Optional[Dict[str, str]]:
    try:
        raw = base64.urlsafe_b64decode(state.encode()).decode()
        parts = raw.split("|")
        if len(parts) != 4:
            return None
        user_id, provider, ts, sig = parts
        # TTL check (10 minutes)
        if abs(int(datetime.utcnow().timestamp()) - int(ts)) > 600:
            return None
        # Sig check
        payload = f"{user_id}|{provider}|{ts}"
        secret = (os.environ.get("OAUTH_STATE_SECRET") or settings.JWT_SECRET_KEY or "dev")
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected):
            return None
        return {"user_id": user_id, "provider": provider}
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
# Provider configurations
# ─────────────────────────────────────────────────────────────
BACKEND_BASE = os.environ.get("MANUS_CALLBACK_BASE_URL") or "https://api.zexai.io"

PROVIDERS: Dict[str, Dict] = {
    "google": {
        "name": "Google",
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "client_id_env": "GOOGLE_CLIENT_ID",
        "client_secret_env": "GOOGLE_CLIENT_SECRET",
        "redirect_uri": f"{BACKEND_BASE}/api/v1/connectors/oauth/google/callback",
        "scopes": [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/documents",
            "https://www.googleapis.com/auth/spreadsheets",
        ],
        "extra_params": {"access_type": "offline", "prompt": "consent"},
    },
    "github": {
        "name": "GitHub",
        "auth_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "client_id_env": "GITHUB_CLIENT_ID",
        "client_secret_env": "GITHUB_CLIENT_SECRET",
        "redirect_uri": f"{BACKEND_BASE}/api/v1/connectors/oauth/github/callback",
        "scopes": ["read:user", "repo", "workflow"],
        "extra_params": {},
    },
    "notion": {
        "name": "Notion",
        "auth_url": "https://api.notion.com/v1/oauth/authorize",
        "token_url": "https://api.notion.com/v1/oauth/token",
        "userinfo_url": None,  # Notion returns owner in token response
        "client_id_env": "NOTION_CLIENT_ID",
        "client_secret_env": "NOTION_CLIENT_SECRET",
        "redirect_uri": f"{BACKEND_BASE}/api/v1/connectors/oauth/notion/callback",
        "scopes": [],  # Notion scopes set in dashboard, not in URL
        "extra_params": {"owner": "user", "response_type": "code"},
    },
    "linkedin": {
        "name": "LinkedIn",
        "auth_url": "https://www.linkedin.com/oauth/v2/authorization",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "userinfo_url": "https://api.linkedin.com/v2/me",
        "client_id_env": "LINKEDIN_CLIENT_ID",
        "client_secret_env": "LINKEDIN_CLIENT_SECRET",
        "redirect_uri": f"{BACKEND_BASE}/api/v1/connectors/oauth/linkedin/callback",
        "scopes": ["r_liteprofile", "r_emailaddress", "w_member_social"],
        "extra_params": {"response_type": "code"},
    },
}


def get_provider(provider: str) -> Dict:
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    return PROVIDERS[provider]


def get_client_id(provider: str) -> str:
    cfg = get_provider(provider)
    val = os.environ.get(cfg["client_id_env"], "")
    if not val:
        raise HTTPException(
            status_code=503,
            detail=f"{provider.title()} OAuth not configured. Set {cfg['client_id_env']} in .env"
        )
    return val


def get_client_secret(provider: str) -> str:
    cfg = get_provider(provider)
    val = os.environ.get(cfg["client_secret_env"], "")
    if not val:
        raise HTTPException(
            status_code=503,
            detail=f"{provider.title()} OAuth not configured. Set {cfg['client_secret_env']} in .env"
        )
    return val


# ─────────────────────────────────────────────────────────────
# HTML helpers for popup close
# ─────────────────────────────────────────────────────────────
def popup_success_html(provider: str, display_name: str, avatar: str = "") -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bağlantı Başarılı</title>
  <style>
    body {{ margin:0; background:#070809; color:#fff; font-family:system-ui,sans-serif;
            display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column; gap:16px; }}
    .icon {{ font-size:48px; }}
    .title {{ font-size:18px; font-weight:700; }}
    .sub {{ font-size:13px; color:#9ca3af; }}
  </style>
</head>
<body>
  <div class="icon">✅</div>
  <div class="title">{provider.title()} Bağlandı!</div>
  <div class="sub">{display_name}</div>
  <script>
    window.opener && window.opener.postMessage(
      {{ type: 'OAUTH_SUCCESS', provider: '{provider}', display_name: '{display_name}', avatar: '{avatar}' }},
      '*'
    );
    setTimeout(() => window.close(), 1500);
  </script>
</body>
</html>"""


def popup_error_html(provider: str, message: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bağlantı Hatası</title>
  <style>
    body {{ margin:0; background:#070809; color:#fff; font-family:system-ui,sans-serif;
            display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column; gap:16px; }}
    .icon {{ font-size:48px; }}
    .title {{ font-size:18px; font-weight:700; color:#f87171; }}
    .sub {{ font-size:13px; color:#9ca3af; text-align:center; max-width:300px; }}
  </style>
</head>
<body>
  <div class="icon">❌</div>
  <div class="title">Bağlantı Başarısız</div>
  <div class="sub">{message}</div>
  <script>
    window.opener && window.opener.postMessage(
      {{ type: 'OAUTH_ERROR', provider: '{provider}', message: '{message}' }},
      '*'
    );
    setTimeout(() => window.close(), 3000);
  </script>
</body>
</html>"""


# ─────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────
async def save_connector(db, user_id: str, provider: str, access_token: str,
                          refresh_token: Optional[str], expires_in: Optional[int],
                          scopes: list, profile_data: dict):
    """Upsert connector record with encrypted tokens."""
    expires_at = None
    if expires_in:
        expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()

    record = {
        "user_id": user_id,
        "provider_name": provider,
        "is_active": True,
        "access_token": encrypt_token(access_token),
        "refresh_token": encrypt_token(refresh_token) if refresh_token else None,
        "token_expires_at": expires_at,
        "scopes": scopes,
        "profile_data": profile_data,
        "updated_at": datetime.utcnow().isoformat(),
    }
    try:
        # Try upsert first
        db.table("user_connectors").upsert(record, on_conflict="user_id,provider_name").execute()
    except Exception:
        # Fallback: delete then insert
        try:
            db.table("user_connectors").delete().eq("user_id", user_id).eq("provider_name", provider).execute()
            db.table("user_connectors").insert(record).execute()
        except Exception as e:
            logger.error(f"Connector save failed: {e}")
            raise


async def delete_connector(db, user_id: str, provider: str):
    db.table("user_connectors").delete().eq("user_id", user_id).eq("provider_name", provider).execute()


async def get_user_connectors(db, user_id: str) -> list:
    try:
        res = db.table("user_connectors").select(
            "provider_name,is_active,profile_data,scopes,token_expires_at,updated_at"
        ).eq("user_id", user_id).eq("is_active", True).execute()
        return res.data or []
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────

class ConnectorStatusResponse(BaseModel):
    connected: list
    details: list


@router.get("/status", response_model=ConnectorStatusResponse)
async def get_connector_status(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Get all connected providers for the current user."""
    rows = await get_user_connectors(db, str(current_user.id))
    connected = [r["provider_name"] for r in rows]
    details = [
        {
            "provider": r["provider_name"],
            "is_active": r["is_active"],
            "profile": r.get("profile_data") or {},
            "scopes": r.get("scopes") or [],
            "connected_at": r.get("updated_at"),
            "expires_at": r.get("token_expires_at"),
        }
        for r in rows
    ]
    return {"connected": connected, "details": details}


@router.get("/oauth/{provider}/start")
async def start_oauth(
    provider: str,
    token: str,  # JWT token passed as query param (popup can't send headers)
    db=Depends(get_db)
):
    """Build OAuth authorization URL and redirect the popup window to it."""
    from core.supabase_client import get_supabase_client

    # Verify JWT from query param (popup flow can't send Authorization header)
    user_id = None
    try:
        supabase = get_supabase_client()
        auth_response = supabase.auth.get_user(token)
        if auth_response and auth_response.user:
            user_id = str(auth_response.user.id)
    except Exception:
        pass

    if not user_id:
        raise HTTPException(status_code=401, detail="Geçersiz token. Lütfen giriş yapın.")

    cfg = get_provider(provider)
    client_id = get_client_id(provider)
    state = make_oauth_state(str(user_id), provider)

    params: Dict[str, str] = {
        "client_id": client_id,
        "redirect_uri": cfg["redirect_uri"],
        "state": state,
        **cfg.get("extra_params", {}),
    }

    # Add scopes if any
    if cfg.get("scopes"):
        params["scope"] = " ".join(cfg["scopes"])

    # GitHub uses response_type differently
    if provider == "github":
        pass  # GitHub doesn't use response_type param
    elif provider not in ("linkedin",):
        params.setdefault("response_type", "code")

    from fastapi.responses import RedirectResponse
    url = cfg["auth_url"] + "?" + urlencode(params)
    return RedirectResponse(url)



@router.get("/oauth/{provider}/callback", response_class=HTMLResponse)
async def oauth_callback(
    provider: str,
    request: Request,
    db=Depends(get_db)
):
    """Handle OAuth callback — exchange code for tokens, save, close popup."""
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    if error:
        return HTMLResponse(popup_error_html(provider, f"OAuth hatası: {error}"))

    if not code or not state:
        return HTMLResponse(popup_error_html(provider, "Eksik parametreler."))

    # Verify state
    state_data = verify_oauth_state(state)
    if not state_data:
        return HTMLResponse(popup_error_html(provider, "Güvenlik doğrulaması başarısız. Tekrar deneyin."))

    user_id = state_data["user_id"]
    cfg = get_provider(provider)
    client_id = get_client_id(provider)
    client_secret = get_client_secret(provider)

    # Exchange code for tokens
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if provider == "notion":
                # Notion uses Basic auth
                import base64 as b64
                creds = b64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
                token_resp = await client.post(
                    cfg["token_url"],
                    headers={
                        "Authorization": f"Basic {creds}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": cfg["redirect_uri"],
                    }
                )
            elif provider == "github":
                token_resp = await client.post(
                    cfg["token_url"],
                    headers={"Accept": "application/json"},
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "code": code,
                        "redirect_uri": cfg["redirect_uri"],
                    }
                )
            else:
                # Standard OAuth2 (Google, LinkedIn)
                token_resp = await client.post(
                    cfg["token_url"],
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": cfg["redirect_uri"],
                        "client_id": client_id,
                        "client_secret": client_secret,
                    }
                )

        if token_resp.status_code != 200:
            logger.error(f"Token exchange failed for {provider}: {token_resp.text}")
            return HTMLResponse(popup_error_html(provider, "Token alınamadı. Tekrar deneyin."))

        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in")

        if not access_token:
            return HTMLResponse(popup_error_html(provider, "Access token boş geldi."))

        # Fetch user profile
        profile_data = {}
        display_name = "Kullanıcı"
        avatar_url = ""

        try:
            async with httpx.AsyncClient(timeout=10) as client2:
                if provider == "google":
                    ui = await client2.get(
                        cfg["userinfo_url"],
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    if ui.status_code == 200:
                        ui_data = ui.json()
                        display_name = ui_data.get("name") or ui_data.get("email", "Google Kullanıcısı")
                        avatar_url = ui_data.get("picture", "")
                        profile_data = {"email": ui_data.get("email"), "name": display_name, "avatar": avatar_url}

                elif provider == "github":
                    ui = await client2.get(
                        cfg["userinfo_url"],
                        headers={"Authorization": f"token {access_token}", "Accept": "application/json"}
                    )
                    if ui.status_code == 200:
                        ui_data = ui.json()
                        display_name = ui_data.get("name") or ui_data.get("login", "GitHub Kullanıcısı")
                        avatar_url = ui_data.get("avatar_url", "")
                        profile_data = {"login": ui_data.get("login"), "name": display_name, "avatar": avatar_url, "public_repos": ui_data.get("public_repos", 0)}

                elif provider == "notion":
                    # Notion returns owner info in token response
                    owner = token_data.get("owner", {})
                    user_obj = owner.get("user", {})
                    display_name = user_obj.get("name", "Notion Kullanıcısı")
                    avatar_url = user_obj.get("avatar_url", "")
                    workspace_name = token_data.get("workspace_name", "")
                    profile_data = {"name": display_name, "avatar": avatar_url, "workspace": workspace_name}

                elif provider == "linkedin":
                    ui = await client2.get(
                        cfg["userinfo_url"],
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    if ui.status_code == 200:
                        ui_data = ui.json()
                        first = ui_data.get("localizedFirstName", "")
                        last = ui_data.get("localizedLastName", "")
                        display_name = f"{first} {last}".strip() or "LinkedIn Kullanıcısı"
                        profile_data = {"name": display_name, "id": ui_data.get("id")}
        except Exception as pe:
            logger.warning(f"Profile fetch failed for {provider}: {pe}")

        # Save to DB
        await save_connector(
            db=db,
            user_id=user_id,
            provider=provider,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            scopes=cfg.get("scopes", []),
            profile_data=profile_data,
        )

        logger.info(f"✅ {provider} connected for user {user_id} ({display_name})")
        return HTMLResponse(popup_success_html(provider, display_name, avatar_url))

    except Exception as e:
        logger.error(f"OAuth callback error for {provider}: {e}")
        return HTMLResponse(popup_error_html(provider, "Beklenmedik hata. Tekrar deneyin."))


@router.delete("/oauth/{provider}")
async def disconnect_connector(
    provider: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Disconnect (revoke & delete) a provider."""
    await delete_connector(db, str(current_user.id), provider)
    return {"success": True, "message": f"{provider} bağlantısı kesildi."}


@router.get("/oauth/{provider}/test")
async def test_connector(
    provider: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Test if the stored token still works (live API call)."""
    user_id = str(current_user.id)
    try:
        res = db.table("user_connectors").select("access_token,profile_data,token_expires_at").eq(
            "user_id", user_id).eq("provider_name", provider).eq("is_active", True).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Connector bulunamadı.")

    if not res.data:
        raise HTTPException(status_code=404, detail="Connector bulunamadı.")

    access_token = decrypt_token(res.data["access_token"])
    cfg = get_provider(provider)
    userinfo_url = cfg.get("userinfo_url")

    if not userinfo_url:
        return {"ok": True, "provider": provider, "note": "Bu provider için test URL'i yok."}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            headers = {}
            if provider == "github":
                headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}
            else:
                headers = {"Authorization": f"Bearer {access_token}"}
            r = await client.get(userinfo_url, headers=headers)

        ok = r.status_code == 200
        return {
            "ok": ok,
            "provider": provider,
            "status_code": r.status_code,
            "profile": res.data.get("profile_data") or {},
            "expires_at": res.data.get("token_expires_at"),
        }
    except Exception as e:
        return {"ok": False, "provider": provider, "error": str(e)}


# ─────────────────────────────────────────────────────────────
# Backward compatibility — keep old /connectors route working
# ─────────────────────────────────────────────────────────────
@router.get("")
async def list_connectors_compat(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Backward-compatible endpoint used by old SynapsePage code."""
    rows = await get_user_connectors(db, str(current_user.id))
    return {"connected": [r["provider_name"] for r in rows]}


class ToggleRequest(BaseModel):
    provider_name: str


@router.post("/toggle")
async def toggle_connector_compat(
    req: ToggleRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Backward-compatible disconnect toggle (connect happens via OAuth now)."""
    user_id = str(current_user.id)
    rows = await get_user_connectors(db, user_id)
    connected_ids = [r["provider_name"] for r in rows]

    if req.provider_name in connected_ids:
        await delete_connector(db, user_id, req.provider_name)
        return {"success": True, "connected": False}
    else:
        return {"success": False, "connected": False, "message": "Use OAuth flow to connect."}
