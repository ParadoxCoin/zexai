"""
Enhanced Admin Pricing Management with Supabase Real-time Integration
Frontend-Backend API uyumluluğu için eksik endpoint'ler
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from types import SimpleNamespace

from core.database import get_database
# Correct the import from core.security
from core.security import get_current_admin_user
from core.supabase_client import get_supabase_client, is_supabase_enabled
from core.logger import app_logger as logger
from core.rate_limiter import limiter, RateLimits

router = APIRouter(prefix="/admin", tags=["Admin Pricing Enhanced"])

# ============================================
# Missing Schemas for Frontend Compatibility
# ============================================

class PricingPackageCreate(BaseModel):
    """Create pricing package schema"""
    name: str
    usd_price: float
    credit_amount: int
    discount_percent: float = 0.0
    active: bool = True
    features: List[str] = []
    description: str = ""

class PricingPackageUpdate(BaseModel):
    """Update pricing package schema"""
    name: Optional[str] = None
    usd_price: Optional[float] = None
    credit_amount: Optional[int] = None
    discount_percent: Optional[float] = None
    active: Optional[bool] = None
    features: Optional[List[str]] = None
    description: Optional[str] = None

class ServiceCostUpdate(BaseModel):
    """Service cost update schema"""
    service_type: str
    unit: str
    cost_per_unit: float
    active: bool = True

class SubscriptionPlanCreate(BaseModel):
    """Subscription plan creation schema"""
    id: str
    name: str
    monthly_price: float
    monthly_credits: int
    description: str
    features: List[str]
    active: bool = True

# ============================================
# Missing Pricing Packages Endpoints
# ============================================

@router.get("/pricing-packages")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_pricing_packages(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Get all pricing packages (Frontend compatibility)"""
    try:
        packages = await db.pricing_packages.find({}).sort("created_at", -1).to_list(length=100)
        
        # Real-time sync with Supabase
        if is_supabase_enabled():
            try:
                supabase = get_supabase_client()
                if supabase:
                    # Sync packages to Supabase for real-time updates
                    for package in packages:
                        package_data = {
                            "id": package.get("id", str(package["_id"])),
                            "name": package["name"],
                            "usd_price": package["usd_price"],
                            "credit_amount": package["credit_amount"],
                            "active": package.get("active", True),
                            "updated_at": datetime.utcnow().isoformat()
                        }
                        
                        # Upsert to Supabase
                        supabase.table("pricing_packages").upsert(package_data).execute()
                        
            except Exception as e:
                logger.warning(f"Failed to sync packages to Supabase: {e}")
        
        return {
            "success": True,
            "packages": packages,
            "total": len(packages)
        }
        
    except Exception as e:
        logger.error(f"Error fetching pricing packages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pricing packages"
        )

@router.post("/pricing-packages")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def create_pricing_package(
    request: Request,
    package_data: PricingPackageCreate,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Create new pricing package (Frontend compatibility)"""
    try:
        import uuid
        
        package_id = str(uuid.uuid4())
        new_package = {
            "id": package_id,
            "name": package_data.name,
            "usd_price": package_data.usd_price,
            "credit_amount": package_data.credit_amount,
            "discount_percent": package_data.discount_percent,
            "active": package_data.active,
            "features": package_data.features,
            "description": package_data.description,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": current_user.id
        }
        
        # Insert to MongoDB
        await db.pricing_packages.insert_one(new_package)
        
        # Real-time sync with Supabase
        if is_supabase_enabled():
            try:
                supabase = get_supabase_client()
                if supabase:
                    supabase_data = {
                        "id": package_id,
                        "name": package_data.name,
                        "usd_price": package_data.usd_price,
                        "credit_amount": package_data.credit_amount,
                        "active": package_data.active,
                        "created_at": datetime.utcnow().isoformat()
                    }
                    
                    supabase.table("pricing_packages").insert(supabase_data).execute()
                    logger.info(f"Package synced to Supabase: {package_id}")
                    
            except Exception as e:
                logger.warning(f"Failed to sync package to Supabase: {e}")
        
        logger.info(f"Admin {current_user.id} created pricing package: {package_data.name}")
        
        return {
            "success": True,
            "message": "Pricing package created successfully",
            "package_id": package_id,
            "package": new_package
        }
        
    except Exception as e:
        logger.error(f"Error creating pricing package: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create pricing package"
        )

@router.put("/pricing-packages/{package_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_pricing_package(
    request: Request,
    package_id: str,
    package_data: PricingPackageUpdate,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Update pricing package (Frontend compatibility)"""
    try:
        # Find existing package
        existing = await db.pricing_packages.find_one({"id": package_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Prepare update data
        update_data = {"updated_at": datetime.utcnow()}
        
        for field, value in package_data.model_dump(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        # Update in MongoDB
        await db.pricing_packages.update_one(
            {"id": package_id},
            {"$set": update_data}
        )
        
        # Real-time sync with Supabase
        if is_supabase_enabled():
            try:
                supabase = get_supabase_client()
                if supabase:
                    supabase_data = {
                        "id": package_id,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    # Add updated fields
                    for field, value in update_data.items():
                        if field in ["name", "usd_price", "credit_amount", "active"]:
                            supabase_data[field] = value
                    
                    supabase.table("pricing_packages").update(supabase_data).eq("id", package_id).execute()
                    logger.info(f"Package update synced to Supabase: {package_id}")
                    
            except Exception as e:
                logger.warning(f"Failed to sync package update to Supabase: {e}")
        
        logger.info(f"Admin {current_user.id} updated pricing package: {package_id}")
        
        return {
            "success": True,
            "message": "Pricing package updated successfully",
            "package_id": package_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pricing package: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update pricing package"
        )

@router.delete("/pricing-packages/{package_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def delete_pricing_package(
    request: Request,
    package_id: str,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Delete pricing package (Frontend compatibility)"""
    try:
        # Soft delete - mark as inactive
        result = await db.pricing_packages.update_one(
            {"id": package_id},
            {"$set": {"active": False, "deleted_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Real-time sync with Supabase
        if is_supabase_enabled():
            try:
                supabase = get_supabase_client()
                if supabase:
                    supabase.table("pricing_packages").update({
                        "active": False,
                        "updated_at": datetime.utcnow().isoformat()
                    }).eq("id", package_id).execute()
                    
            except Exception as e:
                logger.warning(f"Failed to sync package deletion to Supabase: {e}")
        
        logger.info(f"Admin {current_user.id} deleted pricing package: {package_id}")
        
        return {
            "success": True,
            "message": "Pricing package deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pricing package: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete pricing package"
        )

# ============================================
# Service Costs Management
# ============================================

@router.get("/service-costs")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_service_costs(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Get all service costs"""
    try:
        costs = await db.service_costs.find({}).sort("service_type", 1).to_list(length=100)
        
        return {
            "success": True,
            "service_costs": costs,
            "total": len(costs)
        }
        
    except Exception as e:
        logger.error(f"Error fetching service costs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch service costs"
        )

@router.post("/service-costs")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_service_cost(
    request: Request,
    cost_data: ServiceCostUpdate,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Update service cost"""
    try:
        # Update or create service cost
        await db.service_costs.update_one(
            {"service_type": cost_data.service_type},
            {
                "$set": {
                    "service_type": cost_data.service_type,
                    "unit": cost_data.unit,
                    "cost_per_unit": cost_data.cost_per_unit,
                    "active": cost_data.active,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        # Real-time sync with Supabase
        if is_supabase_enabled():
            try:
                supabase = get_supabase_client()
                if supabase:
                    supabase_data = {
                        "service_type": cost_data.service_type,
                        "unit": cost_data.unit,
                        "cost_per_unit": cost_data.cost_per_unit,
                        "active": cost_data.active,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    supabase.table("service_costs").upsert(supabase_data).execute()
                    
            except Exception as e:
                logger.warning(f"Failed to sync service cost to Supabase: {e}")
        
        logger.info(f"Admin {current_user.id} updated service cost: {cost_data.service_type}")
        
        return {
            "success": True,
            "message": "Service cost updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating service cost: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update service cost"
        )

# ============================================
# Subscription Plans Management
# ============================================

@router.get("/subscription-plans")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_subscription_plans(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Get all subscription plans"""
    try:
        plans = await db.subscription_plans.find({"active": True}).to_list(length=100)
        
        return {
            "success": True,
            "plans": plans,
            "total": len(plans)
        }
        
    except Exception as e:
        logger.error(f"Error fetching subscription plans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subscription plans"
        )

@router.post("/subscription-plans")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def create_subscription_plan(
    request: Request,
    plan_data: SubscriptionPlanCreate,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Create subscription plan"""
    try:
        new_plan = {
            "id": plan_data.id,
            "name": plan_data.name,
            "monthly_price": plan_data.monthly_price,
            "monthly_credits": plan_data.monthly_credits,
            "description": plan_data.description,
            "features": plan_data.features,
            "active": plan_data.active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": current_user.id
        }
        
        await db.subscription_plans.insert_one(new_plan)
        
        # Real-time sync with Supabase
        if is_supabase_enabled():
            try:
                supabase = get_supabase_client()
                if supabase:
                    supabase_data = {
                        "id": plan_data.id,
                        "name": plan_data.name,
                        "monthly_price": plan_data.monthly_price,
                        "monthly_credits": plan_data.monthly_credits,
                        "active": plan_data.active,
                        "created_at": datetime.utcnow().isoformat()
                    }
                    
                    supabase.table("subscription_plans").insert(supabase_data).execute()
                    
            except Exception as e:
                logger.warning(f"Failed to sync subscription plan to Supabase: {e}")
        
        logger.info(f"Admin {current_user.id} created subscription plan: {plan_data.name}")
        
        return {
            "success": True,
            "message": "Subscription plan created successfully",
            "plan": new_plan
        }
        
    except Exception as e:
        logger.error(f"Error creating subscription plan: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription plan"
        )

# ============================================
# Real-time Updates with Supabase
# ============================================

@router.get("/pricing/sync-supabase")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def sync_pricing_to_supabase(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Sync all pricing data to Supabase for real-time updates"""
    if not is_supabase_enabled():
        raise HTTPException(status_code=400, detail="Supabase not enabled")
    
    try:
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase client not available")
        
        sync_results = {
            "pricing_packages": 0,
            "service_costs": 0,
            "subscription_plans": 0
        }
        
        # Sync pricing packages
        packages = await db.pricing_packages.find({"active": True}).to_list(length=100)
        for package in packages:
            package_data = {
                "id": package.get("id", str(package["_id"])),
                "name": package["name"],
                "usd_price": package["usd_price"],
                "credit_amount": package["credit_amount"],
                "active": package.get("active", True),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            supabase.table("pricing_packages").upsert(package_data).execute()
            sync_results["pricing_packages"] += 1
        
        # Sync service costs
        costs = await db.service_costs.find({}).to_list(length=100)
        for cost in costs:
            cost_data = {
                "service_type": cost["service_type"],
                "unit": cost["unit"],
                "cost_per_unit": cost["cost_per_unit"],
                "active": cost.get("active", True),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            supabase.table("service_costs").upsert(cost_data).execute()
            sync_results["service_costs"] += 1
        
        # Sync subscription plans
        plans = await db.subscription_plans.find({"active": True}).to_list(length=100)
        for plan in plans:
            plan_data = {
                "id": plan["id"],
                "name": plan["name"],
                "monthly_price": plan["monthly_price"],
                "monthly_credits": plan["monthly_credits"],
                "active": plan.get("active", True),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            supabase.table("subscription_plans").upsert(plan_data).execute()
            sync_results["subscription_plans"] += 1
        
        logger.info(f"Admin {current_user.id} synced pricing data to Supabase: {sync_results}")
        
        return {
            "success": True,
            "message": "Pricing data synced to Supabase successfully",
            "sync_results": sync_results
        }
        
    except Exception as e:
        logger.error(f"Error syncing pricing data to Supabase: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync pricing data to Supabase"
        )
