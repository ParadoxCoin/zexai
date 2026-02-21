"""
Admin Rate Limits Management Routes
CRUD for rate limit tiers and violation monitoring
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional
from types import SimpleNamespace
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import logging

from core.security import get_current_admin_user, get_current_super_admin
from core.database import get_db
from core.rate_limiter import limiter, RateLimits

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/rate-limits", tags=["Admin - Rate Limiting"])


# ============================================
# Schemas
# ============================================

class RateLimitTierUpdate(BaseModel):
    per_minute: Optional[int] = Field(None, ge=1, le=100000)
    per_hour: Optional[int] = Field(None, ge=1, le=1000000)
    per_day: Optional[int] = Field(None, ge=1, le=10000000)
    burst_limit: Optional[int] = Field(None, ge=1, le=1000)
    is_active: Optional[bool] = None


class IPBlacklistCreate(BaseModel):
    ip_address: str
    reason: str
    blocked_until: Optional[datetime] = None  # None = permanent


# ============================================
# Rate Limit Tiers
# ============================================

@router.get("/tiers")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_rate_limit_tiers(
    request: Request,
    tier_name: Optional[str] = None,
    service_type: Optional[str] = None,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List all rate limit tier configurations"""
    try:
        query = db.table("rate_limit_tiers").select("*")
        
        if tier_name:
            query = query.eq("tier_name", tier_name)
        if service_type:
            query = query.eq("service_type", service_type)
        
        response = query.order("tier_name").order("service_type").execute()
        
        return {
            "success": True,
            "tiers": response.data or [],
            "total": len(response.data or [])
        }
    except Exception as e:
        logger.error(f"Error listing rate limit tiers: {e}")
        raise HTTPException(500, f"Failed to list tiers: {str(e)}")


@router.put("/tiers/{tier_id}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def update_rate_limit_tier(
    request: Request,
    tier_id: str,
    tier_data: RateLimitTierUpdate,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Update a rate limit tier configuration"""
    try:
        # Check exists
        existing = db.table("rate_limit_tiers").select("*").eq("id", tier_id).execute()
        if not existing.data:
            raise HTTPException(404, f"Tier '{tier_id}' not found")
        
        # Build update
        update_data = {}
        if tier_data.per_minute is not None:
            update_data["per_minute"] = tier_data.per_minute
        if tier_data.per_hour is not None:
            update_data["per_hour"] = tier_data.per_hour
        if tier_data.per_day is not None:
            update_data["per_day"] = tier_data.per_day
        if tier_data.burst_limit is not None:
            update_data["burst_limit"] = tier_data.burst_limit
        if tier_data.is_active is not None:
            update_data["is_active"] = tier_data.is_active
        
        if not update_data:
            return {"success": True, "message": "No changes"}
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        db.table("rate_limit_tiers").update(update_data).eq("id", tier_id).execute()
        
        logger.info(f"Rate limit tier updated: {tier_id} by {current_user.email}")
        
        return {"success": True, "message": "Tier güncellendi"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating tier: {e}")
        raise HTTPException(500, f"Failed to update tier: {str(e)}")


# ============================================
# Violations Monitoring
# ============================================

@router.get("/violations")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_rate_limit_violations(
    request: Request,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    service_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List recent rate limit violations"""
    try:
        query = db.table("rate_limit_violations").select("*")
        
        if user_id:
            query = query.eq("user_id", user_id)
        if ip_address:
            query = query.ilike("ip_address", f"%{ip_address}%")
        if service_type:
            query = query.eq("service_type", service_type)
        
        response = query.order("timestamp", desc=True).range(offset, offset + limit - 1).execute()
        
        return {
            "success": True,
            "violations": response.data or [],
            "count": len(response.data or [])
        }
    except Exception as e:
        logger.error(f"Error listing violations: {e}")
        raise HTTPException(500, f"Failed to list violations: {str(e)}")


@router.get("/violations/stats")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_violation_stats(
    request: Request,
    hours: int = Query(24, ge=1, le=168),
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """Get violation statistics for the specified time period"""
    try:
        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        
        # Total violations
        all_violations = db.table("rate_limit_violations").select("id, service_type, ip_address, user_id").gte("timestamp", cutoff).execute()
        violations = all_violations.data or []
        
        # Count by service
        by_service = {}
        for v in violations:
            svc = v.get("service_type", "unknown")
            by_service[svc] = by_service.get(svc, 0) + 1
        
        # Top offending IPs
        ip_counts = {}
        for v in violations:
            ip = v.get("ip_address", "unknown")
            ip_counts[ip] = ip_counts.get(ip, 0) + 1
        
        top_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Top offending users
        user_counts = {}
        for v in violations:
            uid = v.get("user_id")
            if uid:
                user_counts[uid] = user_counts.get(uid, 0) + 1
        
        top_users = sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "success": True,
            "period_hours": hours,
            "total_violations": len(violations),
            "by_service": by_service,
            "top_offending_ips": [{"ip": ip, "count": count} for ip, count in top_ips],
            "top_offending_users": [{"user_id": uid, "count": count} for uid, count in top_users]
        }
    except Exception as e:
        logger.error(f"Error getting violation stats: {e}")
        raise HTTPException(500, f"Failed to get stats: {str(e)}")


# ============================================
# IP Blacklist
# ============================================

@router.get("/blacklist")
@limiter.limit(RateLimits.ADMIN_READ)
async def list_ip_blacklist(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """List all blacklisted IPs"""
    try:
        response = db.table("ip_blacklist").select("*").order("created_at", desc=True).execute()
        return {"success": True, "blacklist": response.data or []}
    except Exception as e:
        logger.error(f"Error listing blacklist: {e}")
        raise HTTPException(500, f"Failed to list blacklist: {str(e)}")


@router.post("/blacklist")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def add_to_blacklist(
    request: Request,
    data: IPBlacklistCreate,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Add an IP to the blacklist"""
    try:
        # Check if already exists
        existing = db.table("ip_blacklist").select("id").eq("ip_address", data.ip_address).execute()
        if existing.data:
            raise HTTPException(400, "IP zaten kara listede")
        
        db.table("ip_blacklist").insert({
            "ip_address": data.ip_address,
            "reason": data.reason,
            "blocked_until": data.blocked_until.isoformat() if data.blocked_until else None,
            "created_by": str(current_user.id)
        }).execute()
        
        logger.warning(f"IP blacklisted: {data.ip_address} by {current_user.email}")
        
        return {"success": True, "message": f"IP {data.ip_address} kara listeye eklendi"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding to blacklist: {e}")
        raise HTTPException(500, f"Failed to add to blacklist: {str(e)}")


@router.delete("/blacklist/{ip_address}")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def remove_from_blacklist(
    request: Request,
    ip_address: str,
    current_user: SimpleNamespace = Depends(get_current_super_admin),
    db = Depends(get_db)
):
    """Remove an IP from the blacklist"""
    try:
        db.table("ip_blacklist").delete().eq("ip_address", ip_address).execute()
        logger.info(f"IP removed from blacklist: {ip_address} by {current_user.email}")
        return {"success": True, "message": f"IP {ip_address} kara listeden çıkarıldı"}
    except Exception as e:
        logger.error(f"Error removing from blacklist: {e}")
        raise HTTPException(500, f"Failed to remove from blacklist: {str(e)}")
