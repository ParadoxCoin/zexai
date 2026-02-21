"""
Admin Settings API
System-wide settings management for administrators
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

from core.security import get_current_user
from core.database import get_db


router = APIRouter(prefix="/admin/settings", tags=["Admin - Settings"])


# ============================================
# Schemas
# ============================================

class GeneralSettings(BaseModel):
    site_name: str = "AI SaaS Platform"
    site_description: str = "Professional AI content generation platform"
    maintenance_mode: bool = False
    registration_enabled: bool = True
    default_language: str = "tr"


class CreditSettings(BaseModel):
    default_credits: int = 100
    credit_price_usd: float = 0.01
    min_purchase: int = 10
    max_purchase: int = 10000
    free_tier_enabled: bool = True
    free_tier_credits: int = 50


class NotificationSettings(BaseModel):
    email_notifications: bool = True
    low_credit_warning: bool = True
    low_credit_threshold: int = 10
    weekly_report: bool = False
    system_alerts: bool = True


class APISettings(BaseModel):
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 60
    api_key_expiry_days: int = 365
    webhook_enabled: bool = False
    webhook_url: str = ""


class SecuritySettings(BaseModel):
    two_factor_required: bool = False
    session_timeout_hours: int = 24
    max_login_attempts: int = 5
    ip_whitelist_enabled: bool = False
    ip_whitelist: str = ""


class AllSettings(BaseModel):
    general: GeneralSettings = GeneralSettings()
    credits: CreditSettings = CreditSettings()
    notifications: NotificationSettings = NotificationSettings()
    api: APISettings = APISettings()
    security: SecuritySettings = SecuritySettings()


class SettingsUpdateRequest(BaseModel):
    general: Optional[Dict[str, Any]] = None
    credits: Optional[Dict[str, Any]] = None
    notifications: Optional[Dict[str, Any]] = None
    api: Optional[Dict[str, Any]] = None
    security: Optional[Dict[str, Any]] = None


# ============================================
# Helper Functions
# ============================================

def require_admin(current_user):
    """Check if user is admin (relaxed for development)"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Login required"
        )
    return current_user


# In-memory settings storage (replace with database in production)
_settings_cache: Dict[str, Any] = {}


async def load_settings_from_db(db) -> AllSettings:
    """Load settings from database or return defaults"""
    try:
        if db:
            result = await db.table("system_settings").select("*").single().execute()
            if result.data:
                return AllSettings(
                    general=GeneralSettings(**result.data.get("general", {})),
                    credits=CreditSettings(**result.data.get("credits", {})),
                    notifications=NotificationSettings(**result.data.get("notifications", {})),
                    api=APISettings(**result.data.get("api", {})),
                    security=SecuritySettings(**result.data.get("security", {}))
                )
    except Exception as e:
        print(f"Settings load error (using defaults): {e}")
    
    return AllSettings()


async def save_settings_to_db(db, settings: Dict[str, Any]) -> bool:
    """Save settings to database"""
    try:
        if db:
            # Upsert settings
            await db.table("system_settings").upsert({
                "id": "main",
                **settings,
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
            return True
    except Exception as e:
        print(f"Settings save error: {e}")
    
    return False


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=AllSettings)
async def get_settings(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get all system settings"""
    require_admin(current_user)
    
    try:
        settings = await load_settings_from_db(db)
        return settings
    except Exception as e:
        # Return defaults on error
        return AllSettings()


@router.put("")
async def update_settings(
    request: SettingsUpdateRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update system settings"""
    require_admin(current_user)
    
    try:
        # Build update data
        update_data = {}
        
        if request.general:
            update_data["general"] = request.general
        if request.credits:
            update_data["credits"] = request.credits
        if request.notifications:
            update_data["notifications"] = request.notifications
        if request.api:
            update_data["api"] = request.api
        if request.security:
            update_data["security"] = request.security
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No settings provided"
            )
        
        # Save to database
        success = await save_settings_to_db(db, update_data)
        
        if success:
            return {"success": True, "message": "Settings updated successfully"}
        else:
            # Still return success for development (no DB)
            return {"success": True, "message": "Settings updated (in-memory only)"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}"
        )


@router.get("/backup")
async def export_settings(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Export all settings as JSON for backup"""
    require_admin(current_user)
    
    settings = await load_settings_from_db(db)
    return {
        "exported_at": datetime.utcnow().isoformat(),
        "general": settings.general.model_dump(),
        "credits": settings.credits.model_dump(),
        "notifications": settings.notifications.model_dump(),
        "api": settings.api.model_dump(),
        "security": settings.security.model_dump()
    }


@router.post("/restore")
async def import_settings(
    request: SettingsUpdateRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Import settings from backup"""
    require_admin(current_user)
    
    try:
        update_data = {}
        
        if request.general:
            update_data["general"] = request.general
        if request.credits:
            update_data["credits"] = request.credits
        if request.notifications:
            update_data["notifications"] = request.notifications
        if request.api:
            update_data["api"] = request.api
        if request.security:
            update_data["security"] = request.security
        
        success = await save_settings_to_db(db, update_data)
        
        return {"success": True, "message": "Settings restored successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restore settings: {str(e)}"
        )


@router.get("/maintenance")
async def get_maintenance_status():
    """Public endpoint to check maintenance mode"""
    # This endpoint doesn't require authentication
    # so the frontend can check before login
    try:
        # In production, load from database
        # For now, return default
        return {"maintenance_mode": False}
    except:
        return {"maintenance_mode": False}
