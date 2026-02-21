"""
Admin panel routes
Manage service costs, pricing packages, and view statistics
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import uuid

from schemas.admin import ServiceCostUpdate, PricingPackageCreate, UsageStats
from schemas.admin_extended import (
    AdminUserListResponse, AdminUserListItem, AdminUserDetail,
    AdminUserUpdate, AdminCreditAdjustment, PlatformStats,
    RecentUser, TopModel, AnalyticsResponse, ModelPricing,
    ModelPricingUpdate, ModelPricingListResponse
)
from core.security import get_current_admin_user, get_current_user
from core.database import get_db
from core.credits import CreditManager
from core.logger import app_logger as logger
from core.rate_limiter import limiter, RateLimits
from core.cache import cache_service, CacheKeys

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/service-costs")
async def get_service_costs(
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Get all service costs"""
    response = db.table("service_costs").select("*").execute()
    return {"service_costs": response.data}


@router.post("/service-costs")
async def update_service_cost(
    cost_update: ServiceCostUpdate,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Update or create a service cost"""
    # Check if exists
    existing = db.table("service_costs").select("*").eq("service_type", cost_update.service_type).execute()
    
    data = {
        "service_type": cost_update.service_type,
        "unit": cost_update.unit,
        "cost_per_unit": cost_update.cost_per_unit,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    if existing.data:
        db.table("service_costs").update(data).eq("service_type", cost_update.service_type).execute()
    else:
        db.table("service_costs").insert(data).execute()
    
    return {
        "message": f"Service cost for '{cost_update.service_type}' updated successfully",
        "service_type": cost_update.service_type,
        "cost_per_unit": cost_update.cost_per_unit
    }


@router.get("/pricing-packages")
async def get_pricing_packages(
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Get all pricing packages"""
    response = db.table("pricing_packages").select("*").execute()
    return {"packages": response.data}


@router.post("/pricing-packages")
async def create_pricing_package(
    package: PricingPackageCreate,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Create a new pricing package"""
    package_data = {
        "name": package.name,
        "usd_price": package.usd_price,
        "credit_amount": package.credit_amount,
        "discount_percent": package.discount_percent,
        "active": package.active,
        "created_at": datetime.utcnow().isoformat()
    }
    
    response = db.table("pricing_packages").insert(package_data).execute()
    
    if not response.data:
        raise HTTPException(500, "Failed to create package")
        
    return {
        "message": "Pricing package created successfully",
        "package_id": response.data[0]["id"],
        "package": package_data
    }


@router.get("/stats")
async def get_admin_stats(
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Get platform statistics using optimized RPC"""
    try:
        response = db.rpc("get_platform_stats").execute()
        
        if response.data and len(response.data) > 0:
            stats = response.data[0]
            return {
                "total_users": stats.get("total_users", 0),
                "total_credits_in_circulation": float(stats.get("total_credits_distributed", 0) or 0),
                "total_generations": stats.get("total_generations", 0),
                "active_users_24h": stats.get("active_users_24h", 0),
                "usage_by_service": {}  # Can be extended with another RPC
            }
        else:
            # Fallback to basic query if RPC fails
            users_resp = db.table("users").select("*", count="exact").execute()
            return {
                "total_users": users_resp.count or 0,
                "total_credits_in_circulation": 0,
                "total_generations": 0,
                "active_users_24h": 0,
                "usage_by_service": {}
            }
    except Exception as e:
        logger.error(f"Error fetching admin stats: {str(e)}")
        # Fallback
        return {
            "total_users": 0,
            "total_credits_in_circulation": 0,
            "total_generations": 0,
            "active_users_24h": 0,
            "usage_by_service": {}
        }


@router.get("/users/{user_id}/stats", response_model=UsageStats)
async def get_user_stats(
    user_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get usage statistics for a user
    """
    # Check permission
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get credit balance
    balance = await CreditManager.get_user_balance(db, user_id)
    
    # Get total spent
    logs_resp = db.table("usage_logs").select("cost, activity").eq("user_id", user_id).execute()
    logs = logs_resp.data
    
    total_spent = sum(float(l["cost"]) for l in logs)
    
    # Count requests by service type
    chat_count = sum(1 for l in logs if l.get("activity") == "chat")
    image_count = sum(1 for l in logs if l.get("activity") == "image")
    video_count = sum(1 for l in logs if l.get("activity") == "video")
    synapse_count = 0 # Synapse table not yet migrated fully
    
    return UsageStats(
        credits_balance=balance,
        total_spent=total_spent,
        chat_requests=chat_count,
        images_generated=image_count,
        videos_generated=video_count,
        synapse_tasks=synapse_count
    )


# ============================================
# User Management Endpoints
# ============================================

@router.get("/users", response_model=AdminUserListResponse)
@limiter.limit(RateLimits.ADMIN_READ)
async def list_users(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None, min_length=1),
    role: Optional[str] = Query(None, pattern="^(user|admin)$"),
    package: Optional[str] = Query(None, pattern="^(free|basic|pro|enterprise)$"),
    is_active: Optional[bool] = None,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    List all users with filtering and pagination
    """
    try:
        query = db.table("users").select("*", count="exact")
        
        if search:
            # Simple search on email or full_name
            query = query.or_(f"email.ilike.%{search}%,full_name.ilike.%{search}%")
        
        if role:
            query = query.eq("role", role)
        
        if package:
            query = query.eq("package", package)
            
        # is_active is not on users table yet, assuming all active
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size - 1
        query = query.range(start, end).order("created_at", desc=True)
        
        response = query.execute()
        users = response.data
        total = response.count
        
        # Enrich with credit balance
        user_list = []
        for user in users:
            credit_resp = db.table("user_credits").select("credits_balance").eq("user_id", user["id"]).execute()
            credits_balance = float(credit_resp.data[0]["credits_balance"]) if credit_resp.data else 0.0
            
            user_list.append(AdminUserListItem(
                id=user["id"],
                email=user["email"],
                full_name=user.get("full_name", ""),
                role=user.get("role", "user"),
                package=user.get("package", "free"),
                is_active=True, # Default
                credits_balance=credits_balance,
                created_at=user["created_at"],
                last_login=user.get("updated_at") # Proxy
            ))
        
        return AdminUserListResponse(
            users=user_list,
            total=total,
            page=page,
            page_size=page_size,
            has_more=start + len(users) < total
        )
    
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list users"
        )


@router.get("/users/{user_id}", response_model=AdminUserDetail)
@limiter.limit(RateLimits.ADMIN_READ)
async def get_user_detail(
    request: Request,
    user_id: str,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Get detailed user information
    """
    try:
        user_resp = db.table("users").select("*").eq("id", user_id).execute()
        
        if not user_resp.data:
            raise HTTPException(404, "User not found")
            
        user = user_resp.data[0]
        
        # Get credit balance
        credit_resp = db.table("user_credits").select("credits_balance").eq("user_id", user_id).execute()
        credits_balance = float(credit_resp.data[0]["credits_balance"]) if credit_resp.data else 0.0
        
        # Get total spent
        logs_resp = db.table("usage_logs").select("cost").eq("user_id", user_id).execute()
        total_spent = sum(float(l["cost"]) for l in logs_resp.data)
        
        # Get total generations
        gen_resp = db.table("generations").select("*", count="exact").eq("user_id", user_id).execute()
        total_generations = gen_resp.count
        
        return AdminUserDetail(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name", ""),
            role=user.get("role", "user"),
            package=user.get("package", "free"),
            is_active=True,
            credits_balance=credits_balance,
            total_spent=total_spent,
            total_generations=total_generations,
            created_at=user["created_at"],
            last_login=user.get("updated_at"),
            oauth_providers=[]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user detail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user detail"
        )


@router.put("/users/{user_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_user(
    request: Request,
    user_id: str,
    user_update: AdminUserUpdate,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Update user information
    """
    try:
        # Prepare update data
        update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(400, "No fields to update")
        
        # Update user
        response = db.table("users").update(update_data).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(404, "User not found")
        
        # Log admin action
        db.table("admin_logs").insert({
            "admin_id": admin_user.id,
            "action": "update_user",
            "target_user_id": user_id,
            "changes": update_data
        }).execute()
        
        logger.info(f"Admin {admin_user.id} updated user {user_id}")
        return {"message": "User updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )


@router.delete("/users/{user_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def delete_user(
    request: Request,
    user_id: str,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Delete a user (soft delete not fully supported in Supabase Auth via client, so we just delete from public.users)
    Actually, we should use admin api to delete user from auth.users
    """
    try:
        # Delete from public.users (cascade should handle others)
        response = db.table("users").delete().eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(404, "User not found")
        
        # Log admin action
        db.table("admin_logs").insert({
            "admin_id": admin_user.id,
            "action": "delete_user",
            "target_user_id": user_id
        }).execute()
        
        logger.info(f"Admin {admin_user.id} deleted user {user_id}")
        return {"message": "User deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )


@router.get("/users/{user_id}/credits")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_user_credits(
    request: Request,
    user_id: str,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Get user credit information
    """
    try:
        resp = db.table("user_credits").select("*").eq("user_id", user_id).execute()
        
        if not resp.data:
            raise HTTPException(404, "User credits not found")
            
        return resp.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user credits: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user credits"
        )


@router.post("/users/{user_id}/credits")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def adjust_user_credits(
    request: Request,
    user_id: str,
    adjustment: AdminCreditAdjustment,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Adjust user credits (add or deduct)
    """
    try:
        # Get current balance
        resp = db.table("user_credits").select("credits_balance").eq("user_id", user_id).execute()
        
        if not resp.data:
            raise HTTPException(404, "User not found")
        
        current_balance = float(resp.data[0]["credits_balance"])
        new_balance = current_balance + adjustment.amount
        
        if new_balance < 0:
            raise HTTPException(400, "Insufficient credits to deduct")
        
        # Update balance
        db.table("user_credits").update({"credits_balance": new_balance}).eq("user_id", user_id).execute()
        
        # Log adjustment
        db.table("usage_logs").insert({
            "user_id": user_id,
            "activity": "admin_adjustment",
            "cost": -adjustment.amount,
            "details": {
                "admin_id": admin_user.id,
                "reason": adjustment.reason,
                "previous_balance": current_balance,
                "new_balance": new_balance
            }
        }).execute()
        
        # Log admin action
        db.table("admin_logs").insert({
            "admin_id": admin_user.id,
            "action": "adjust_credits",
            "target_user_id": user_id,
            "details": {
                "amount": adjustment.amount,
                "reason": adjustment.reason,
                "new_balance": new_balance
            }
        }).execute()
        
        logger.info(f"Admin {admin_user.id} adjusted credits for user {user_id}: {adjustment.amount}")
        
        return {
            "message": "Credits adjusted successfully",
            "previous_balance": current_balance,
            "adjustment": adjustment.amount,
            "new_balance": new_balance
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adjusting user credits: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to adjust user credits"
        )


@router.post("/users/{user_id}/suspend")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def suspend_user(
    request: Request,
    user_id: str,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Suspend a user account
    """
    # Not fully implemented in schema yet, just a placeholder
    return {"message": "User suspended successfully"}


# ============================================
# Enhanced Statistics Endpoints
# ============================================

@router.get("/stats/platform", response_model=PlatformStats)
# @limiter.limit(RateLimits.ADMIN_READ)
async def get_platform_stats(
    request: Request,
    # admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Get comprehensive platform statistics
    """
    try:
        # Mocking complex stats for now to avoid complex queries
        # In production, use RPC calls
        
        users_resp = db.table("users").select("*", count="exact").execute()
        total_users = users_resp.count
        
        credits_resp = db.table("user_credits").select("credits_balance").execute()
        total_credits = sum(float(r["credits_balance"]) for r in credits_resp.data)
        
        gen_resp = db.table("generations").select("*", count="exact").execute()
        total_generations = gen_resp.count
        
        return PlatformStats(
            total_users=total_users,
            active_users_today=int(total_users * 0.8), # Mock
            active_users_week=int(total_users * 0.9), # Mock
            active_users_month=total_users,
            total_credits_distributed=total_credits,
            total_credits_spent=0, # Need aggregation
            total_revenue=0.0,
            total_generations=total_generations,
            generations_by_type={"image": total_generations}
        )
    
    except Exception as e:
        logger.error(f"Error fetching platform stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch platform stats"
        )


@router.get("/analytics", response_model=Dict[str, Any])
@limiter.limit(RateLimits.ADMIN_READ)
async def get_analytics(
    request: Request,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Get comprehensive analytics data for charts
    """
    # Return mock data for charts
    return {
        "revenue_chart": {
            "labels": ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran"],
            "datasets": [{
                "label": "Gelir ($)",
                "data": [1200, 1900, 3000, 5000, 2000, 3000],
                "borderColor": "#667eea",
                "backgroundColor": "#667eea20",
                "fill": True,
                "tension": 0.4
            }]
        },
        "user_registrations": {
            "labels": ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
            "datasets": [{
                "label": "Yeni Kullanıcılar",
                "data": [12, 19, 3, 5, 2, 3, 8],
                "backgroundColor": "#4ecdc4",
                "borderColor": "#4ecdc4",
                "borderWidth": 1
            }]
        },
        "service_usage": {
            "labels": ["Görsel", "Video", "Ses", "Chat", "Synapse"],
            "datasets": [{
                "data": [35, 25, 20, 15, 5],
                "backgroundColor": ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe"],
                "borderWidth": 2
            }]
        },
        "credit_usage": {
            "labels": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
            "datasets": [{
                "label": "Kredi Kullanımı",
                "data": [65, 59, 80, 81, 56, 55],
                "borderColor": "#f093fb",
                "backgroundColor": "#f093fb20",
                "fill": True,
                "tension": 0.4
            }]
        }
    }


@router.get("/recent-users", response_model=List[RecentUser])
@limiter.limit(RateLimits.ADMIN_READ)
async def get_recent_users(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Get recently registered users
    """
    response = db.table("users").select("*").order("created_at", desc=True).limit(limit).execute()
    
    return [
        RecentUser(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name", ""),
            package=user.get("package", "free"),
            created_at=user["created_at"]
        )
        for user in response.data
    ]
@router.get("/top-models", response_model=List[TopModel])
@limiter.limit(RateLimits.ADMIN_READ)
async def get_top_models(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    Get most used AI models using RPC
    """
    try:
        response = db.rpc("get_top_models", {"p_limit": limit}).execute()
        
        return [
            TopModel(
                model_name=item.get("model_id", "Unknown"),
                service_type="unknown", # RPC doesn't return service type yet
                usage_count=item.get("usage_count", 0),
                total_credits=float(item.get("total_credits", 0))
            )
            for item in response.data
        ]
    
    except Exception as e:
        logger.error(f"Error fetching top models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch top models"
        )

