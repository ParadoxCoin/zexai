"""
Admin Key Vault Routes
API endpoints for managing encrypted API keys
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from types import SimpleNamespace
from datetime import datetime
import logging

from core.security import get_current_admin_user, get_current_super_admin
from core.key_vault import get_key_vault, KeyInfo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/vault", tags=["Admin - Key Vault"])


# ============================================
# Schemas
# ============================================

class KeyResponse(BaseModel):
    """Key information response (without actual key value)"""
    id: str
    provider_id: str
    key_name: str
    key_prefix: str
    is_active: bool
    rotation_count: int
    last_rotated_at: Optional[str] = None
    last_used_at: Optional[str] = None
    created_at: str
    created_by: Optional[str] = None


class KeyListResponse(BaseModel):
    """Key list response"""
    keys: List[KeyResponse]
    total: int


class KeyCreateRequest(BaseModel):
    """Create new key request"""
    provider_id: str = Field(..., min_length=2, max_length=50)
    key_name: str = Field(default="primary", min_length=2, max_length=50)
    api_key: str = Field(..., min_length=5, description="The actual API key value")
    
    class Config:
        json_schema_extra = {
            "example": {
                "provider_id": "openai",
                "key_name": "primary",
                "api_key": "sk-..."
            }
        }


class KeyUpdateRequest(BaseModel):
    """Update (rotate) key request"""
    api_key: str = Field(..., min_length=10, description="New API key value")


class KeyToggleRequest(BaseModel):
    """Toggle key active status"""
    is_active: bool


# ============================================
# Helper Functions
# ============================================

def key_info_to_response(key: KeyInfo) -> KeyResponse:
    """Convert KeyInfo to response model"""
    return KeyResponse(
        id=key.id,
        provider_id=key.provider_id,
        key_name=key.key_name,
        key_prefix=key.key_prefix,
        is_active=key.is_active,
        rotation_count=key.rotation_count,
        last_rotated_at=key.last_rotated_at.isoformat() if key.last_rotated_at else None,
        last_used_at=key.last_used_at.isoformat() if key.last_used_at else None,
        created_at=key.created_at.isoformat() if key.created_at else None,
        created_by=key.created_by
    )


# ============================================
# Endpoints
# ============================================

@router.get("/keys", response_model=KeyListResponse)
async def list_keys(
    request: Request,
    provider_id: Optional[str] = Query(None, description="Filter by provider"),
    include_inactive: bool = Query(False, description="Include inactive keys"),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """List all API keys (masked, without actual values)"""
    vault = get_key_vault()
    
    keys = await vault.list_keys(provider_id=provider_id)
    
    if not include_inactive:
        keys = [k for k in keys if k.is_active]
    
    return KeyListResponse(
        keys=[key_info_to_response(k) for k in keys],
        total=len(keys)
    )


@router.get("/keys/{key_id}", response_model=KeyResponse)
async def get_key(
    request: Request,
    key_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get key details (without actual value)"""
    vault = get_key_vault()
    
    key_info = await vault.get_key_info(key_id)
    
    if not key_info:
        raise HTTPException(status_code=404, detail=f"Key {key_id} not found")
    
    return key_info_to_response(key_info)


@router.post("/keys", response_model=KeyResponse)
async def create_key(
    request: Request,
    key_data: KeyCreateRequest,
    current_user: SimpleNamespace = Depends(get_current_super_admin)
):
    """
    Create/store a new API key (Super Admin only)
    
    The key will be encrypted before storage.
    This is the only time the key value needs to be provided.
    """
    vault = get_key_vault()
    
    try:
        key_info = await vault.store_key(
            provider_id=key_data.provider_id,
            key_name=key_data.key_name,
            plain_key=key_data.api_key,
            created_by=current_user.id
        )
        
        logger.info(f"Key created for {key_data.provider_id}/{key_data.key_name} by user {current_user.id}")
        
        return key_info_to_response(key_info)
        
    except Exception as e:
        logger.error(f"Failed to create key: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/keys/{key_id}", response_model=KeyResponse)
async def update_key(
    request: Request,
    key_id: str,
    update_data: KeyUpdateRequest,
    current_user: SimpleNamespace = Depends(get_current_super_admin)
):
    """
    Update (rotate) an API key (Super Admin only)
    
    This performs a key rotation - the old key is replaced with the new one.
    """
    vault = get_key_vault()
    
    # Get existing key info
    key_info = await vault.get_key_info(key_id)
    if not key_info:
        raise HTTPException(status_code=404, detail=f"Key {key_id} not found")
    
    try:
        updated_key = await vault.rotate_key(
            provider_id=key_info.provider_id,
            key_name=key_info.key_name,
            new_key=update_data.api_key,
            rotated_by=current_user.id
        )
        
        logger.info(f"Key rotated for {key_info.provider_id}/{key_info.key_name} by user {current_user.id}")
        
        return key_info_to_response(updated_key)
        
    except Exception as e:
        logger.error(f"Failed to rotate key: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keys/{key_id}/rotate", response_model=KeyResponse)
async def rotate_key(
    request: Request,
    key_id: str,
    update_data: KeyUpdateRequest,
    current_user: SimpleNamespace = Depends(get_current_super_admin)
):
    """
    Rotate an API key (alias for PUT /keys/{id})
    
    This is an explicit rotation endpoint for clarity.
    """
    return await update_key(request, key_id, update_data, current_user)


@router.patch("/keys/{key_id}/toggle", response_model=KeyResponse)
async def toggle_key(
    request: Request,
    key_id: str,
    toggle_data: KeyToggleRequest,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Toggle key active status"""
    vault = get_key_vault()
    
    key_info = await vault.toggle_key(key_id, toggle_data.is_active)
    
    if not key_info:
        raise HTTPException(status_code=404, detail=f"Key {key_id} not found")
    
    logger.info(f"Key {key_id} toggled to {'active' if toggle_data.is_active else 'inactive'} by user {current_user.id}")
    
    return key_info_to_response(key_info)


@router.delete("/keys/{key_id}")
async def delete_key(
    request: Request,
    key_id: str,
    hard_delete: bool = Query(False, description="Permanently delete (cannot be undone)"),
    current_user: SimpleNamespace = Depends(get_current_super_admin)
):
    """
    Delete an API key (Super Admin only)
    
    By default, this is a soft delete (deactivation).
    Use hard_delete=true to permanently remove the key.
    """
    vault = get_key_vault()
    
    key_info = await vault.get_key_info(key_id)
    if not key_info:
        raise HTTPException(status_code=404, detail=f"Key {key_id} not found")
    
    if hard_delete:
        success = await vault.hard_delete_key(key_id)
        action = "permanently deleted"
    else:
        success = await vault.delete_key(key_id)
        action = "deactivated"
    
    if success:
        logger.info(f"Key {key_id} {action} by user {current_user.id}")
        return {"success": True, "message": f"Key {action}"}
    
    raise HTTPException(status_code=500, detail="Failed to delete key")


@router.get("/providers")
async def list_supported_providers(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """List supported providers for key vault"""
    return {
        "providers": [
            {"id": "openai", "name": "OpenAI", "env_var": "OPENAI_API_KEY"},
            {"id": "anthropic", "name": "Anthropic (Claude)", "env_var": "ANTHROPIC_API_KEY"},
            {"id": "google", "name": "Google (Gemini)", "env_var": "GEMINI_API_KEY"},
            {"id": "elevenlabs", "name": "ElevenLabs", "env_var": "ELEVENLABS_API_KEY"},
            {"id": "replicate", "name": "Replicate", "env_var": "REPLICATE_API_KEY"},
            {"id": "fal", "name": "FAL.AI", "env_var": "FAL_API_KEY"},
            {"id": "pollo", "name": "Pollo.ai", "env_var": "POLLO_API_KEY"},
            {"id": "piapi", "name": "PiAPI", "env_var": "PIAPI_API_KEY"},
            {"id": "goapi", "name": "GoAPI", "env_var": "GOAPI_API_KEY"},
            {"id": "kie", "name": "Kie.ai", "env_var": "KIE_API_KEY"},
            {"id": "openrouter", "name": "OpenRouter", "env_var": "OPENROUTER_API_KEY"},
            {"id": "fireworks", "name": "Fireworks", "env_var": "FIREWORKS_API_KEY"},
        ]
    }


@router.get("/stats")
async def get_vault_stats(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get key vault statistics"""
    vault = get_key_vault()
    
    all_keys = await vault.list_keys()
    
    active_keys = [k for k in all_keys if k.is_active]
    inactive_keys = [k for k in all_keys if not k.is_active]
    
    # Keys by provider
    by_provider = {}
    for key in all_keys:
        if key.provider_id not in by_provider:
            by_provider[key.provider_id] = 0
        by_provider[key.provider_id] += 1
    
    # Recently rotated (last 30 days)
    from datetime import timedelta, timezone
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recently_rotated = 0
    for k in all_keys:
        if k.last_rotated_at:
            # Make comparison timezone-aware
            try:
                rotated_at = k.last_rotated_at
                if rotated_at.tzinfo is None:
                    rotated_at = rotated_at.replace(tzinfo=timezone.utc)
                if rotated_at > thirty_days_ago:
                    recently_rotated += 1
            except Exception:
                pass
    
    return {
        "total_keys": len(all_keys),
        "active_keys": len(active_keys),
        "inactive_keys": len(inactive_keys),
        "keys_by_provider": by_provider,
        "recently_rotated": recently_rotated,
        "providers_with_keys": list(by_provider.keys())
    }
