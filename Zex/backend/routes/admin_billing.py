"""
Admin Billing Management Routes
CRUD for subscription plans, promo codes, special packages, and credit config
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional
from types import SimpleNamespace
from pydantic import BaseModel, Field
from datetime import datetime
import logging
import uuid

from core.security import get_current_admin_user, get_current_super_admin
from core.database import get_db
from core.rate_limiter import limiter, RateLimits
from core.audit import AuditLogService, AuditAction, ResourceType

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/billing", tags=["Admin - Billing Management"])


# ============================================
# Schemas
# ============================================

class SubscriptionPlanUpdate(BaseModel):
    display_name: Optional[str] = None
    monthly_price: Optional[float] = None
    monthly_credits: Optional[int] = None
    description: Optional[str] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None


class CreditConfigUpdate(BaseModel):
    min_purchase_usd: Optional[float] = Field(None, ge=1, le=100)
    max_purchase_usd: Optional[float] = Field(None, ge=10, le=10000)
    credits_per_usd: Optional[int] = Field(None, ge=10, le=1000)
    bulk_discounts: Optional[dict] = None


class PromoCodeCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=30)
    discount_type: str = Field(..., pattern="^(percent|fixed|credits|trial)$")
    discount_value: float = Field(..., gt=0)
    applicable_to: List[str] = ["all"]
    min_purchase: float = 0
    max_uses: Optional[int] = None
    max_uses_per_user: int = 1
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    specific_plans: Optional[List[str]] = None


class PromoCodeUpdate(BaseModel):
    discount_value: Optional[float] = None
    max_uses: Optional[int] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class SpecialPackageCreate(BaseModel):
    name: str
    description: Optional[str] = None
    original_price: float
    discounted_price: float
    credits: int
    bonus_credits: int = 0
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    max_purchases: Optional[int] = None
    is_featured: bool = False
    badge: Optional[str] = None


class SpecialPackageUpdate(BaseModel):
    name: Optional[str] = None
    discounted_price: Optional[float] = None
    credits: Optional[int] = None
    bonus_credits: Optional[int] = None
    valid_until: Optional[datetime] = None
    max_purchases: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None


# ============================================
# Subscription Plan Endpoints
# ============================================

@router.get("/plans")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_subscription_plans(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List all subscription plans"""
    try:
        response = db.table("subscription_plans").select("*").order("sort_order").execute()
        return {"success": True, "plans": response.data or []}
    except Exception as e:
        logger.error(f"Error listing plans: {e}")
        raise HTTPException(500, f"Failed to list plans: {str(e)}")


@router.put("/plans/{plan_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_subscription_plan(
    request: Request,
    plan_id: str,
    plan_data: SubscriptionPlanUpdate,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Update a subscription plan"""
    try:
        # Check exists
        existing = db.table("subscription_plans").select("*").eq("id", plan_id).execute()
        if not existing.data:
            raise HTTPException(404, f"Plan '{plan_id}' not found")
        
        old_data = existing.data[0]
        
        # Build update
        update_data = {}
        if plan_data.display_name is not None:
            update_data["display_name"] = plan_data.display_name
        if plan_data.monthly_price is not None:
            update_data["monthly_price"] = plan_data.monthly_price
        if plan_data.monthly_credits is not None:
            update_data["monthly_credits"] = plan_data.monthly_credits
        if plan_data.description is not None:
            update_data["description"] = plan_data.description
        if plan_data.features is not None:
            update_data["features"] = plan_data.features
        if plan_data.is_active is not None:
            update_data["is_active"] = plan_data.is_active
        
        if not update_data:
            return {"success": True, "message": "No changes"}
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        response = db.table("subscription_plans").update(update_data).eq("id", plan_id).execute()
        
        # Audit
        await AuditLogService.log(
            db=db,
            user_id=str(current_user.id),
            action=AuditAction.UPDATE,
            resource_type=ResourceType.SETTINGS,
            resource_id=plan_id,
            details=f"Updated subscription plan: {plan_id}",
            old_value=str(old_data.get("monthly_price")),
            new_value=str(plan_data.monthly_price) if plan_data.monthly_price else None,
            success=True
        )
        
        return {"success": True, "plan": response.data[0] if response.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating plan: {e}")
        raise HTTPException(500, f"Failed to update plan: {str(e)}")


# ============================================
# Credit Config Endpoints
# ============================================

@router.get("/credit-config")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_credit_config(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Get credit configuration"""
    try:
        response = db.table("credit_config").select("*").limit(1).execute()
        if response.data:
            return {"success": True, "config": response.data[0]}
        return {"success": True, "config": {
            "min_purchase_usd": 5,
            "max_purchase_usd": 500,
            "credits_per_usd": 100,
            "bulk_discounts": {"50": 5, "100": 10, "250": 15, "500": 20}
        }}
    except Exception as e:
        logger.error(f"Error getting credit config: {e}")
        raise HTTPException(500, f"Failed to get config: {str(e)}")


@router.put("/credit-config")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_credit_config(
    request: Request,
    config_data: CreditConfigUpdate,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Update credit configuration"""
    try:
        update_data = {}
        if config_data.min_purchase_usd is not None:
            update_data["min_purchase_usd"] = config_data.min_purchase_usd
        if config_data.max_purchase_usd is not None:
            update_data["max_purchase_usd"] = config_data.max_purchase_usd
        if config_data.credits_per_usd is not None:
            update_data["credits_per_usd"] = config_data.credits_per_usd
        if config_data.bulk_discounts is not None:
            update_data["bulk_discounts"] = config_data.bulk_discounts
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        update_data["updated_by"] = str(current_user.id)
        
        # Check if exists
        existing = db.table("credit_config").select("id").limit(1).execute()
        if existing.data:
            db.table("credit_config").update(update_data).eq("id", existing.data[0]["id"]).execute()
        else:
            db.table("credit_config").insert(update_data).execute()
        
        return {"success": True, "message": "Kredi ayarları güncellendi"}
    except Exception as e:
        logger.error(f"Error updating credit config: {e}")
        raise HTTPException(500, f"Failed to update config: {str(e)}")


# ============================================
# Promo Code Endpoints
# ============================================

@router.get("/promo-codes")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_promo_codes(
    request: Request,
    active_only: bool = False,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List all promo codes"""
    try:
        query = db.table("promo_codes").select("*").order("created_at", desc=True)
        if active_only:
            query = query.eq("is_active", True)
        response = query.execute()
        return {"success": True, "promo_codes": response.data or []}
    except Exception as e:
        logger.error(f"Error listing promo codes: {e}")
        raise HTTPException(500, f"Failed to list promo codes: {str(e)}")


@router.post("/promo-codes")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def create_promo_code(
    request: Request,
    promo_data: PromoCodeCreate,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Create a new promo code"""
    try:
        # Check if code exists
        existing = db.table("promo_codes").select("id").eq("code", promo_data.code.upper()).execute()
        if existing.data:
            raise HTTPException(400, f"Promo kod '{promo_data.code}' zaten mevcut")
        
        # Create
        response = db.table("promo_codes").insert({
            "code": promo_data.code.upper(),
            "discount_type": promo_data.discount_type,
            "discount_value": promo_data.discount_value,
            "applicable_to": promo_data.applicable_to,
            "min_purchase": promo_data.min_purchase,
            "max_uses": promo_data.max_uses,
            "max_uses_per_user": promo_data.max_uses_per_user,
            "valid_from": promo_data.valid_from.isoformat() if promo_data.valid_from else None,
            "valid_until": promo_data.valid_until.isoformat() if promo_data.valid_until else None,
            "specific_plans": promo_data.specific_plans,
            "is_active": True,
            "created_by": str(current_user.id)
        }).execute()
        
        logger.info(f"Promo code created: {promo_data.code} by {current_user.email}")
        
        return {"success": True, "promo_code": response.data[0] if response.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating promo code: {e}")
        raise HTTPException(500, f"Failed to create promo code: {str(e)}")


@router.put("/promo-codes/{code_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_promo_code(
    request: Request,
    code_id: str,
    promo_data: PromoCodeUpdate,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Update a promo code"""
    try:
        update_data = {}
        if promo_data.discount_value is not None:
            update_data["discount_value"] = promo_data.discount_value
        if promo_data.max_uses is not None:
            update_data["max_uses"] = promo_data.max_uses
        if promo_data.valid_until is not None:
            update_data["valid_until"] = promo_data.valid_until.isoformat()
        if promo_data.is_active is not None:
            update_data["is_active"] = promo_data.is_active
        
        if not update_data:
            return {"success": True, "message": "No changes"}
        
        response = db.table("promo_codes").update(update_data).eq("id", code_id).execute()
        return {"success": True, "promo_code": response.data[0] if response.data else None}
    except Exception as e:
        logger.error(f"Error updating promo code: {e}")
        raise HTTPException(500, f"Failed to update promo code: {str(e)}")


@router.delete("/promo-codes/{code_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def delete_promo_code(
    request: Request,
    code_id: str,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Delete a promo code"""
    try:
        db.table("promo_codes").delete().eq("id", code_id).execute()
        return {"success": True, "message": "Promo kod silindi"}
    except Exception as e:
        logger.error(f"Error deleting promo code: {e}")
        raise HTTPException(500, f"Failed to delete promo code: {str(e)}")


# ============================================
# Special Package Endpoints
# ============================================

@router.get("/special-packages")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_special_packages(
    request: Request,
    active_only: bool = False,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List all special packages"""
    try:
        query = db.table("special_packages").select("*").order("created_at", desc=True)
        if active_only:
            query = query.eq("is_active", True)
        response = query.execute()
        return {"success": True, "packages": response.data or []}
    except Exception as e:
        logger.error(f"Error listing packages: {e}")
        raise HTTPException(500, f"Failed to list packages: {str(e)}")


@router.post("/special-packages")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def create_special_package(
    request: Request,
    package_data: SpecialPackageCreate,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Create a new special package"""
    try:
        response = db.table("special_packages").insert({
            "name": package_data.name,
            "description": package_data.description,
            "original_price": package_data.original_price,
            "discounted_price": package_data.discounted_price,
            "credits": package_data.credits,
            "bonus_credits": package_data.bonus_credits,
            "valid_from": package_data.valid_from.isoformat() if package_data.valid_from else None,
            "valid_until": package_data.valid_until.isoformat() if package_data.valid_until else None,
            "max_purchases": package_data.max_purchases,
            "is_featured": package_data.is_featured,
            "badge": package_data.badge,
            "is_active": True
        }).execute()
        
        return {"success": True, "package": response.data[0] if response.data else None}
    except Exception as e:
        logger.error(f"Error creating package: {e}")
        raise HTTPException(500, f"Failed to create package: {str(e)}")


@router.put("/special-packages/{package_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_special_package(
    request: Request,
    package_id: str,
    package_data: SpecialPackageUpdate,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Update a special package"""
    try:
        update_data = {}
        for field, value in package_data.dict(exclude_unset=True).items():
            if value is not None:
                if isinstance(value, datetime):
                    update_data[field] = value.isoformat()
                else:
                    update_data[field] = value
        
        if not update_data:
            return {"success": True, "message": "No changes"}
        
        response = db.table("special_packages").update(update_data).eq("id", package_id).execute()
        return {"success": True, "package": response.data[0] if response.data else None}
    except Exception as e:
        logger.error(f"Error updating package: {e}")
        raise HTTPException(500, f"Failed to update package: {str(e)}")


@router.delete("/special-packages/{package_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def delete_special_package(
    request: Request,
    package_id: str,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Delete a special package"""
    try:
        db.table("special_packages").delete().eq("id", package_id).execute()
        return {"success": True, "message": "Paket silindi"}
    except Exception as e:
        logger.error(f"Error deleting package: {e}")
        raise HTTPException(500, f"Failed to delete package: {str(e)}")


# ============================================
# Duration Discounts Endpoints
# ============================================

@router.get("/durations")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_subscription_durations(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List subscription duration options"""
    try:
        response = db.table("subscription_durations").select("*").order("months").execute()
        return {"success": True, "durations": response.data or []}
    except Exception as e:
        # Return defaults
        return {"success": True, "durations": [
            {"id": "1_month", "months": 1, "discount_percent": 0, "label": "Aylık"},
            {"id": "6_months", "months": 6, "discount_percent": 10, "label": "6 Ay (%10 İndirim)"},
            {"id": "12_months", "months": 12, "discount_percent": 20, "label": "Yıllık (%20 İndirim)"}
        ]}
