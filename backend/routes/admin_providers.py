"""
Admin Provider Management API
CRUD operations for AI providers with health monitoring
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from types import SimpleNamespace

from core.security import get_current_admin_user
from core.database import get_db
from core.logger import app_logger as logger
from core.rate_limiter import limiter, RateLimits
from core.ai_provider_manager import ai_provider_manager
from core.failover_manager import failover_manager, ProviderStatus, FailoverConfig
from core.audit import AuditLogService, AuditAction, ResourceType

router = APIRouter(prefix="/admin/providers", tags=["Admin - Provider Management"])


# ============================================
# Schemas
# ============================================

class ProviderCreate(BaseModel):
    """Create new provider"""
    name: str = Field(..., description="Provider name (e.g., PiAPI, GoAPI)")
    display_name: str = Field(..., description="Display name for UI")
    api_key: Optional[str] = Field(None, description="API key (if stored in DB)")
    api_endpoint: Optional[str] = Field(None, description="Custom API endpoint")
    provider_type: str = Field("video", description="Type: video, image, audio, chat")
    rate_limit: int = Field(100, description="Requests per minute")
    timeout: int = Field(300, description="Request timeout in seconds")
    is_active: bool = Field(True, description="Is provider active")
    config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional config")


class ProviderUpdate(BaseModel):
    """Update provider"""
    display_name: Optional[str] = None
    api_key: Optional[str] = None
    api_endpoint: Optional[str] = None
    rate_limit: Optional[int] = None
    timeout: Optional[int] = None
    is_active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class ProviderResponse(BaseModel):
    """Provider response"""
    id: str
    name: str
    display_name: str
    provider_type: str
    api_endpoint: Optional[str]
    rate_limit: int
    timeout: int
    is_active: bool
    status: str  # healthy, degraded, down, unknown
    response_time: Optional[float]
    consecutive_failures: int
    last_check: Optional[str]
    model_count: int
    config: Dict[str, Any]
    created_at: str
    updated_at: str


class ProviderListResponse(BaseModel):
    """Provider list response"""
    providers: List[ProviderResponse]
    total: int
    summary: Dict[str, int]  # healthy, degraded, down counts


# ============================================
# Helper Functions
# ============================================

def get_provider_health(provider_name: str) -> Dict[str, Any]:
    """Get provider health from ai_provider_manager"""
    try:
        all_status = ai_provider_manager.get_provider_status()
        return all_status.get(provider_name, {
            "status": "unknown",
            "response_time": None,
            "consecutive_failures": 0,
            "last_check": None
        })
    except Exception:
        return {
            "status": "unknown",
            "response_time": None,
            "consecutive_failures": 0,
            "last_check": None
        }


def count_provider_models(db, provider_name: str) -> int:
    """Count models for a provider"""
    try:
        resp = db.table("ai_models").select("id", count="exact").eq("provider", provider_name).execute()
        return resp.count or 0
    except Exception:
        return 0


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=ProviderListResponse)
@limiter.limit(RateLimits.ADMIN_READ)
async def list_providers(
    request: Request,
    provider_type: Optional[str] = None,
    active_only: bool = False,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List all providers with health status"""
    try:
        # Get providers from database
        query = db.table("api_providers").select("*")
        
        if provider_type:
            query = query.eq("provider_type", provider_type)
        
        if active_only:
            query = query.eq("is_active", True)
        
        response = query.order("name").execute()
        db_providers = response.data or []
        
        # Enrich with health status and model count
        providers = []
        summary = {"healthy": 0, "degraded": 0, "down": 0, "unknown": 0}
        
        for p in db_providers:
            health = get_provider_health(p["name"])
            model_count = count_provider_models(db, p["name"])
            
            status = health.get("status", "unknown")
            summary[status] = summary.get(status, 0) + 1
            
            display_name = p.get("display_name", p["name"])
            # Branding Cleanup
            if p["name"].lower() in ("kie", "kie.ai"):
                display_name = "Premium"
            
            providers.append(ProviderResponse(
                id=p["id"],
                name=p["name"],
                display_name=display_name,
                provider_type=p.get("provider_type", "video"),
                api_endpoint=p.get("api_endpoint"),
                rate_limit=p.get("rate_limit", 100),
                timeout=p.get("timeout", 300),
                is_active=p.get("is_active", True),
                status=status,
                response_time=health.get("response_time"),
                consecutive_failures=health.get("consecutive_failures", 0),
                last_check=health.get("last_check"),
                model_count=model_count,

                config=p.get("config", {}),
                created_at=p.get("created_at", ""),
                updated_at=p.get("updated_at", "")
            ))
        
        return ProviderListResponse(
            providers=providers,
            total=len(providers),
            summary=summary
        )
        
    except Exception as e:
        logger.error(f"Error listing providers: {e}")
        # Return hardcoded providers as fallback
        return get_hardcoded_providers()


@router.post("", response_model=ProviderResponse)
@limiter.limit(RateLimits.ADMIN_WRITE)
async def create_provider(
    request: Request,
    provider: ProviderCreate,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Create a new provider"""
    try:
        # Check if provider exists
        existing = db.table("api_providers").select("id").eq("name", provider.name).execute()
        if existing.data:
            raise HTTPException(400, f"Provider '{provider.name}' already exists")
        
        # Create provider
        provider_data = {
            "name": provider.name,
            "display_name": provider.display_name,
            "provider_type": provider.provider_type,
            "api_endpoint": provider.api_endpoint,
            "rate_limit": provider.rate_limit,
            "timeout": provider.timeout,
            "is_active": provider.is_active,
            "config": provider.config or {},
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Store API key securely (encrypted or in separate table)
        if provider.api_key:
            provider_data["api_key_hash"] = "***"  # In production, encrypt this
        
        response = db.table("api_providers").insert(provider_data).execute()
        
        if not response.data:
            raise HTTPException(500, "Failed to create provider")
        
        created = response.data[0]
        health = get_provider_health(provider.name)
        
        logger.info(f"Admin {current_user.id} created provider: {provider.name}")
        
        return ProviderResponse(
            id=created["id"],
            name=created["name"],
            display_name=created["display_name"],
            provider_type=created["provider_type"],
            api_endpoint=created.get("api_endpoint"),
            rate_limit=created["rate_limit"],
            timeout=created["timeout"],
            is_active=created["is_active"],
            status=health.get("status", "unknown"),
            response_time=health.get("response_time"),
            consecutive_failures=0,
            last_check=None,
            model_count=0,
            config=created.get("config", {}),
            created_at=created["created_at"],
            updated_at=created["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating provider: {e}")
        raise HTTPException(500, f"Failed to create provider: {str(e)}")


@router.put("/{provider_id}", response_model=ProviderResponse)
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_provider(
    request: Request,
    provider_id: str,
    updates: ProviderUpdate,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Update a provider"""
    try:
        # Check if provider exists
        existing = db.table("api_providers").select("*").eq("id", provider_id).execute()
        if not existing.data:
            raise HTTPException(404, "Provider not found")
        
        provider = existing.data[0]
        
        # Prepare update data
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        # Update
        response = db.table("api_providers").update(update_data).eq("id", provider_id).execute()
        
        if not response.data:
            raise HTTPException(500, "Failed to update provider")
        
        updated = response.data[0]
        health = get_provider_health(updated["name"])
        model_count = count_provider_models(db, updated["name"])
        
        logger.info(f"Admin {current_user.id} updated provider: {updated['name']}")
        
        return ProviderResponse(
            id=updated["id"],
            name=updated["name"],
            display_name=updated.get("display_name", updated["name"]),
            provider_type=updated.get("provider_type", "video"),
            api_endpoint=updated.get("api_endpoint"),
            rate_limit=updated.get("rate_limit", 100),
            timeout=updated.get("timeout", 300),
            is_active=updated.get("is_active", True),
            status=health.get("status", "unknown"),
            response_time=health.get("response_time"),
            consecutive_failures=health.get("consecutive_failures", 0),
            last_check=health.get("last_check"),
            model_count=model_count,
            config=updated.get("config", {}),
            created_at=updated.get("created_at", ""),
            updated_at=updated["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating provider: {e}")
        raise HTTPException(500, f"Failed to update provider: {str(e)}")


@router.delete("/{provider_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def delete_provider(
    request: Request,
    provider_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Delete a provider"""
    try:
        # Check if provider exists
        existing = db.table("api_providers").select("name").eq("id", provider_id).execute()
        if not existing.data:
            raise HTTPException(404, "Provider not found")
        
        provider_name = existing.data[0]["name"]
        
        # Check if provider has models
        model_count = count_provider_models(db, provider_name)
        if model_count > 0:
            raise HTTPException(400, f"Cannot delete provider with {model_count} models. Reassign models first.")
        
        # Delete
        db.table("api_providers").delete().eq("id", provider_id).execute()
        
        logger.info(f"Admin {current_user.id} deleted provider: {provider_name}")
        
        return {"success": True, "message": f"Provider '{provider_name}' deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting provider: {e}")
        raise HTTPException(500, f"Failed to delete provider: {str(e)}")


@router.post("/{provider_id}/toggle")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def toggle_provider(
    request: Request,
    provider_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Toggle provider active status"""
    try:
        existing = db.table("api_providers").select("name, is_active").eq("id", provider_id).execute()
        if not existing.data:
            raise HTTPException(404, "Provider not found")
        
        current_status = existing.data[0]["is_active"]
        new_status = not current_status
        
        db.table("api_providers").update({
            "is_active": new_status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", provider_id).execute()
        
        logger.info(f"Admin {current_user.id} toggled provider {existing.data[0]['name']} to {new_status}")
        
        return {
            "success": True,
            "provider_id": provider_id,
            "is_active": new_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling provider: {e}")
        raise HTTPException(500, f"Failed to toggle provider: {str(e)}")


@router.post("/{provider_id}/health-check")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def trigger_health_check(
    request: Request,
    provider_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Trigger health check for a provider"""
    try:
        existing = db.table("api_providers").select("name").eq("id", provider_id).execute()
        if not existing.data:
            raise HTTPException(404, "Provider not found")
        
        provider_name = existing.data[0]["name"]
        
        # Trigger health check via ai_provider_manager
        # This is a simplified version - in production, this would be async
        try:
            # Attempt to get provider status (triggers check if stale)
            health = get_provider_health(provider_name)
            
            return {
                "success": True,
                "provider": provider_name,
                "status": health.get("status", "unknown"),
                "response_time": health.get("response_time"),
                "checked_at": datetime.utcnow().isoformat()
            }
        except Exception as check_error:
            return {
                "success": False,
                "provider": provider_name,
                "status": "error",
                "error": str(check_error),
                "checked_at": datetime.utcnow().isoformat()
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering health check: {e}")
        raise HTTPException(500, f"Failed to trigger health check: {str(e)}")


# ============================================
# Fallback: Hardcoded Providers
# ============================================

def get_hardcoded_providers() -> ProviderListResponse:
    """Return hardcoded providers when DB is unavailable"""
    hardcoded = [
        # Video providers
        {"name": "piapi", "display_name": "PiAPI", "type": "video"},
        {"name": "goapi", "display_name": "GoAPI", "type": "video"},
        {"name": "fal", "display_name": "Fal.ai", "type": "video"},
        {"name": "replicate", "display_name": "Replicate", "type": "video"},
        {"name": "pollo", "display_name": "Pollo.ai", "type": "video"},
        {"name": "kie", "display_name": "KIE AI", "type": "video"},
        # Chat/LLM providers
        {"name": "openai", "display_name": "OpenAI", "type": "chat"},
        {"name": "anthropic", "display_name": "Anthropic", "type": "chat"},
        {"name": "fireworks", "display_name": "Fireworks.ai", "type": "chat"},
        {"name": "openrouter", "display_name": "OpenRouter", "type": "chat"},
        {"name": "gemini", "display_name": "Google Gemini", "type": "chat"},
    ]
    
    providers = []
    summary = {"healthy": 0, "degraded": 0, "down": 0, "unknown": 0}
    
    for p in hardcoded:
        health = get_provider_health(p["name"])
        status = health.get("status", "unknown")
        summary[status] = summary.get(status, 0) + 1
        
        providers.append(ProviderResponse(
            id=p["name"],
            name=p["name"],
            display_name=p["display_name"],
            provider_type=p["type"],
            api_endpoint=None,
            rate_limit=100,
            timeout=300,
            is_active=True,
            status=status,
            response_time=health.get("response_time"),
            consecutive_failures=health.get("consecutive_failures", 0),
            last_check=health.get("last_check"),
            model_count=0,
            config={},
            created_at="",
            updated_at=""
        ))
    
    return ProviderListResponse(
        providers=providers,
        total=len(providers),
        summary=summary
    )


# ============================================
# Failover Management Endpoints
# ============================================

class FailoverStatusResponse(BaseModel):
    """Failover status for all providers"""
    summary: Dict[str, Any]
    providers: Dict[str, Any]
    config: Dict[str, Any]


class ProviderPriorityUpdate(BaseModel):
    """Update provider priority order"""
    category: str = Field(..., description="Category (video, image, chat, etc.)")
    provider_ids: List[str] = Field(..., description="Ordered list of provider IDs")


class ProviderResetRequest(BaseModel):
    """Reset provider health metrics"""
    provider_id: str = Field(..., description="Provider ID to reset")


@router.get("/failover/status", response_model=FailoverStatusResponse)
@limiter.limit(RateLimits.ADMIN_READ)
async def get_failover_status(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get failover status for all providers"""
    try:
        all_statuses = failover_manager.get_all_statuses()
        summary = failover_manager.get_summary()
        
        config = {
            "failure_threshold": FailoverConfig.FAILURE_THRESHOLD,
            "recovery_cooldown_seconds": FailoverConfig.RECOVERY_COOLDOWN,
            "degraded_threshold_ms": FailoverConfig.DEGRADED_THRESHOLD_MS,
            "health_check_interval_seconds": FailoverConfig.HEALTH_CHECK_INTERVAL
        }
        
        return FailoverStatusResponse(
            summary=summary,
            providers=all_statuses,
            config=config
        )
        
    except Exception as e:
        logger.error(f"Error getting failover status: {e}")
        raise HTTPException(500, f"Failed to get failover status: {str(e)}")


@router.get("/failover/provider/{provider_id}")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_provider_failover_status(
    request: Request,
    provider_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get failover status for a specific provider"""
    try:
        tracker = failover_manager.get_provider_status(provider_id)
        
        if not tracker:
            raise HTTPException(404, f"Provider '{provider_id}' not found in failover system")
        
        return {
            "success": True,
            **tracker.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting provider failover status: {e}")
        raise HTTPException(500, f"Failed to get provider failover status: {str(e)}")


@router.post("/failover/priority")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def set_provider_priority(
    request: Request,
    priority_update: ProviderPriorityUpdate,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Set provider priority order for a category"""
    try:
        failover_manager.set_provider_priority(
            priority_update.category,
            priority_update.provider_ids
        )
        
        # Audit log
        await AuditLogService.log(
            db=db,
            user_id=str(current_user.id),
            action=AuditAction.UPDATE,
            resource_type=ResourceType.PROVIDER,
            resource_id=priority_update.category,
            details=f"Updated provider priority for category '{priority_update.category}': {priority_update.provider_ids}",
            success=True
        )
        
        logger.info(f"Admin {current_user.id} set provider priority for {priority_update.category}")
        
        return {
            "success": True,
            "category": priority_update.category,
            "provider_order": priority_update.provider_ids
        }
        
    except Exception as e:
        logger.error(f"Error setting provider priority: {e}")
        raise HTTPException(500, f"Failed to set provider priority: {str(e)}")


@router.post("/failover/reset/{provider_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def reset_provider_health(
    request: Request,
    provider_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Reset health metrics for a provider (clears failure count)"""
    try:
        tracker = failover_manager.get_provider_status(provider_id)
        if not tracker:
            raise HTTPException(404, f"Provider '{provider_id}' not found in failover system")
        
        failover_manager.reset_provider(provider_id)
        
        # Audit log
        await AuditLogService.log(
            db=db,
            user_id=str(current_user.id),
            action=AuditAction.UPDATE,
            resource_type=ResourceType.PROVIDER,
            resource_id=provider_id,
            details=f"Reset health metrics for provider '{provider_id}'",
            success=True
        )
        
        logger.info(f"Admin {current_user.id} reset provider health for {provider_id}")
        
        new_status = failover_manager.get_provider_status(provider_id)
        return {
            "success": True,
            "provider_id": provider_id,
            "status": new_status.to_dict() if new_status else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting provider health: {e}")
        raise HTTPException(500, f"Failed to reset provider health: {str(e)}")


@router.get("/failover/chain/{category}")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_failover_chain(
    request: Request,
    category: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get current failover chain for a category"""
    try:
        available = failover_manager.get_available_providers(category)
        best = failover_manager.get_best_provider(category)
        
        # Get details for each provider in chain
        chain_details = []
        for idx, pid in enumerate(available):
            tracker = failover_manager.get_provider_status(pid)
            if tracker:
                chain_details.append({
                    "position": idx + 1,
                    "is_primary": pid == best,
                    **tracker.to_dict()
                })
        
        return {
            "success": True,
            "category": category,
            "best_provider": best,
            "chain_length": len(available),
            "failover_chain": chain_details
        }
        
    except Exception as e:
        logger.error(f"Error getting failover chain: {e}")
        raise HTTPException(500, f"Failed to get failover chain: {str(e)}")


@router.post("/failover/register")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def register_provider_failover(
    request: Request,
    provider_id: str,
    provider_name: str,
    category: str = "general",
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Register a provider in the failover system"""
    try:
        failover_manager.register_provider(provider_id, provider_name, category)
        
        # Audit log
        await AuditLogService.log(
            db=db,
            user_id=str(current_user.id),
            action=AuditAction.CREATE,
            resource_type=ResourceType.PROVIDER,
            resource_id=provider_id,
            details=f"Registered provider '{provider_name}' in failover system for category '{category}'",
            success=True
        )
        
        logger.info(f"Admin {current_user.id} registered provider {provider_id} for failover")
        
        tracker = failover_manager.get_provider_status(provider_id)
        return {
            "success": True,
            "provider_id": provider_id,
            "provider_name": provider_name,
            "category": category,
            "status": tracker.to_dict() if tracker else None
        }
        
    except Exception as e:
        logger.error(f"Error registering provider failover: {e}")
        raise HTTPException(500, f"Failed to register provider failover: {str(e)}")


# ============================================
# Video Models Management (New Unified Architecture)
# ============================================

class VideoModelCreate(BaseModel):
    """Create video model"""
    id: str = Field(..., description="Model ID (e.g., kie_kling26_hd_5s)")
    provider_id: str = Field(..., description="Provider ID")
    name: str = Field(..., description="Model name")
    display_name: Optional[str] = None
    description: Optional[str] = None
    model_type: str = Field("text_to_video", description="Model type")
    endpoint: str = Field(..., description="API endpoint path")
    credits: int = Field(100, description="Credit cost")
    duration_options: List[int] = [5]
    quality_rating: int = 3
    speed_rating: int = 3
    badge: Optional[str] = None
    is_active: bool = True
    is_featured: bool = False
    sort_order: int = 100


class VideoModelUpdate(BaseModel):
    """Update video model"""
    provider_id: Optional[str] = None
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    endpoint: Optional[str] = None
    credits: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    sort_order: Optional[int] = None


@router.get("/video-models")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_video_models(
    request: Request,
    provider_id: Optional[str] = None,
    include_inactive: bool = False,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List all video models from unified architecture"""
    try:
        query = db.table("video_models").select("*")
        
        if not include_inactive:
            query = query.eq("is_active", True)
        if provider_id:
            query = query.eq("provider_id", provider_id)
        
        result = query.order("sort_order").execute()
        return {"models": result.data or [], "total": len(result.data or [])}
    
    except Exception as e:
        logger.error(f"Error listing video models: {e}")
        raise HTTPException(500, f"Failed to list video models: {str(e)}")


@router.post("/video-models")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def create_video_model(
    request: Request,
    model: VideoModelCreate,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Create a new video model"""
    try:
        data = model.model_dump()
        data["created_at"] = datetime.utcnow().isoformat()
        data["updated_at"] = datetime.utcnow().isoformat()
        
        result = db.table("video_models").insert(data).execute()
        if not result.data:
            raise HTTPException(400, "Failed to create model")
        
        logger.info(f"Admin {current_user.id} created video model: {model.id}")
        return result.data[0]
    
    except Exception as e:
        logger.error(f"Error creating video model: {e}")
        raise HTTPException(500, f"Failed to create video model: {str(e)}")


@router.put("/video-models/{model_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_video_model(
    request: Request,
    model_id: str,
    updates: VideoModelUpdate,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Update a video model"""
    try:
        data = {k: v for k, v in updates.model_dump().items() if v is not None}
        data["updated_at"] = datetime.utcnow().isoformat()
        
        result = db.table("video_models").update(data).eq("id", model_id).execute()
        if not result.data:
            raise HTTPException(404, "Model not found")
        
        logger.info(f"Admin {current_user.id} updated video model: {model_id}")
        return result.data[0]
    
    except Exception as e:
        logger.error(f"Error updating video model: {e}")
        raise HTTPException(500, f"Failed to update video model: {str(e)}")


@router.delete("/video-models/{model_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def delete_video_model(
    request: Request,
    model_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Delete a video model (soft delete)"""
    try:
        db.table("video_models").update({
            "is_active": False,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", model_id).execute()
        
        logger.info(f"Admin {current_user.id} deleted video model: {model_id}")
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Error deleting video model: {e}")
        raise HTTPException(500, f"Failed to delete video model: {str(e)}")


# ============================================
# Provider API Keys Management
# ============================================

class ProviderKeyCreate(BaseModel):
    """Create provider API key"""
    provider_id: str = Field(..., description="Provider ID (e.g., kie, fal)")
    key_name: str = Field("primary", description="Key name")
    api_key: str = Field(..., description="API key value")


@router.get("/keys")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_provider_keys(
    request: Request,
    provider_id: Optional[str] = None,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List all provider API keys (masked)"""
    try:
        query = db.table("provider_keys").select("id, provider_id, key_name, is_active, usage_count, last_used_at, created_at, api_key")
        if provider_id:
            query = query.eq("provider_id", provider_id)
        
        result = query.order("provider_id").execute()
        
        # Mask API keys
        keys = []
        for key in (result.data or []):
            api_key = key.get("api_key", "")
            masked = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "****"
            keys.append({
                "id": key["id"],
                "provider_id": key["provider_id"],
                "key_name": key["key_name"],
                "key_preview": masked,
                "is_active": key["is_active"],
                "usage_count": key.get("usage_count", 0),
                "last_used_at": key.get("last_used_at"),
                "created_at": key.get("created_at")
            })
        
        return {"keys": keys, "total": len(keys)}
    
    except Exception as e:
        logger.error(f"Error listing provider keys: {e}")
        raise HTTPException(500, f"Failed to list provider keys: {str(e)}")


@router.post("/keys")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def create_provider_key(
    request: Request,
    key: ProviderKeyCreate,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Add or update a provider API key"""
    try:
        data = {
            "provider_id": key.provider_id,
            "key_name": key.key_name,
            "api_key": key.api_key,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Upsert
        result = db.table("provider_keys").upsert(
            data,
            on_conflict="provider_id,key_name"
        ).execute()
        
        if not result.data:
            raise HTTPException(400, "Failed to save key")
        
        logger.info(f"Admin {current_user.id} saved API key for provider: {key.provider_id}")
        
        saved = result.data[0]
        api_key = saved.get("api_key", "")
        return {
            "id": saved["id"],
            "provider_id": saved["provider_id"],
            "key_name": saved["key_name"],
            "key_preview": f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "****",
            "is_active": saved["is_active"]
        }
    
    except Exception as e:
        logger.error(f"Error creating provider key: {e}")
        raise HTTPException(500, f"Failed to create provider key: {str(e)}")


@router.delete("/keys/{key_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def delete_provider_key(
    request: Request,
    key_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Delete a provider API key"""
    try:
        db.table("provider_keys").delete().eq("id", key_id).execute()
        logger.info(f"Admin {current_user.id} deleted API key: {key_id}")
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Error deleting provider key: {e}")
        raise HTTPException(500, f"Failed to delete provider key: {str(e)}")


@router.post("/keys/{key_id}/toggle")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def toggle_provider_key(
    request: Request,
    key_id: str,
    is_active: bool,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Toggle a provider API key active status"""
    try:
        db.table("provider_keys").update({
            "is_active": is_active,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", key_id).execute()
        
        logger.info(f"Admin {current_user.id} toggled API key {key_id} to {is_active}")
        return {"success": True, "is_active": is_active}
    
    except Exception as e:
        logger.error(f"Error toggling provider key: {e}")
        raise HTTPException(500, f"Failed to toggle provider key: {str(e)}")

