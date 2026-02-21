"""
Enhanced Admin Panel with Supabase Real-time Integration
Complete admin functionality with real-time monitoring and management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import uuid
from types import SimpleNamespace

from core.database import get_database
# Correct the import from core.security
from core.security import get_current_admin_user
from core.security_enhanced import AdminManager, SecurityAudit
from core.supabase_client import get_supabase_client, is_supabase_enabled
from core.logger import app_logger as logger
from core.rate_limiter import limiter, RateLimits
from core.ai_provider_manager import ai_provider_manager
from core.websocket_enhanced import connection_manager

router = APIRouter(prefix="/admin", tags=["Admin Enhanced"])

# ============================================
# Enhanced Schemas
# ============================================

class UserManagementAction(BaseModel):
    """User management action schema"""
    action: str  # suspend, activate, delete, add_credits, set_role
    user_ids: List[str]
    reason: str
    value: Optional[Any] = None  # For actions that need a value (credits, role)

class SystemStats(BaseModel):
    """System statistics schema"""
    total_users: int
    active_users: int
    total_credits_issued: float
    total_credits_used: float
    total_revenue: float
    provider_status: Dict[str, Any]
    system_health: Dict[str, Any]

class AdminNotification(BaseModel):
    """Admin notification schema"""
    type: str
    title: str
    message: str
    priority: str = "normal"  # low, normal, high, critical
    target_users: Optional[List[str]] = None  # None = all users

# ============================================
# Real-time System Statistics
# ============================================

@router.get("/stats/realtime")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_realtime_system_stats(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Get real-time system statistics with Supabase integration"""
    # Initialize with safe defaults
    total_users = 0
    active_users = 0
    new_users_24h = 0
    total_credits_balance = 0
    total_generations = 0
    provider_status = {}
    connection_stats = {"total_connections": 0, "total_users": 0}
    
    try:
        # Basic user statistics using Supabase
        if db:
            try:
                users_resp = db.table("users").select("*", count="exact").execute()
                total_users = users_resp.count or 0
            except Exception as e:
                logger.warning(f"Failed to fetch user count: {e}")
            
            # Active users = total users (is_active column doesn't exist in users table)
            active_users = total_users
            
            # Users registered in last 24 hours
            try:
                from datetime import datetime, timedelta
                yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
                new_users_resp = db.table("users").select("*", count="exact").gte("created_at", yesterday).execute()
                new_users_24h = new_users_resp.count or 0
            except Exception as e:
                logger.warning(f"Failed to fetch new users: {e}")
            
            # Credit statistics
            try:
                credits_resp = db.table("user_credits").select("credits_balance").execute()
                total_credits_balance = sum(float(r.get("credits_balance", 0) or 0) for r in credits_resp.data) if credits_resp.data else 0
            except Exception as e:
                logger.warning(f"Failed to fetch credits: {e}")
            
            # Total generations
            try:
                generations_resp = db.table("generations").select("*", count="exact").execute()
                total_generations = generations_resp.count or 0
            except Exception as e:
                logger.warning(f"Failed to fetch generations: {e}")
        
        # Provider status (don't fail if this errors)
        try:
            provider_status = ai_provider_manager.get_provider_status()
        except Exception as e:
            logger.warning(f"Failed to fetch provider status: {e}")
            provider_status = {}
        
        # WebSocket connections (don't fail if this errors)
        try:
            connection_stats = connection_manager.get_connection_stats()
        except Exception as e:
            logger.warning(f"Failed to fetch connection stats: {e}")
            connection_stats = {"total_connections": 0, "total_users": 0}
        
        # System health
        system_health = {
            "database_connected": db is not None,
            "supabase_enabled": is_supabase_enabled(),
            "active_websocket_connections": connection_stats.get("total_connections", 0),
            "provider_health": len([p for p in provider_status.values() if isinstance(p, dict) and p.get("status") == "healthy"]),
            "total_providers": len(provider_status)
        }
        
        stats = {
            "users": {
                "total": total_users,
                "active": active_users,
                "new_24h": new_users_24h,
                "growth_rate": (new_users_24h / max(total_users - new_users_24h, 1)) * 100 if total_users > 0 else 0
            },
            "credits": {
                "total_balance": total_credits_balance,
                "total_used_30d": 0,
                "avg_per_user": total_credits_balance / max(total_users, 1)
            },
            "usage": {
                "total_generations": total_generations,
                "avg_per_user": total_generations / max(active_users, 1)
            },
            "revenue": {
                "total_30d": 0,
                "avg_per_user": 0
            },
            "providers": provider_status,
            "system": system_health,
            "realtime": {
                "websocket_connections": connection_stats,
                "last_updated": datetime.utcnow().isoformat()
            }
        }
        
        return {
            "success": True,
            "stats": stats,
            "real_time_enabled": is_supabase_enabled()
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}")
        # Return partial data instead of failing completely
        return {
            "success": False,
            "stats": {
                "users": {"total": 0, "active": 0, "new_24h": 0, "growth_rate": 0},
                "credits": {"total_balance": 0, "total_used_30d": 0, "avg_per_user": 0},
                "usage": {"total_generations": 0, "avg_per_user": 0},
                "revenue": {"total_30d": 0, "avg_per_user": 0},
                "providers": {},
                "system": {"database_connected": False, "supabase_enabled": False},
                "realtime": {"websocket_connections": {}, "last_updated": datetime.utcnow().isoformat()}
            },
            "real_time_enabled": False,
            "error": str(e)
        }

# ============================================
# Enhanced User Management
# ============================================

@router.get("/users/advanced")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_users_advanced(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Get users with advanced filtering and search using Supabase"""
    if not db:
        return {
            "success": False,
            "users": [],
            "pagination": {"page": page, "page_size": page_size, "total": 0, "total_pages": 0, "has_more": False},
            "filters": {"search": search, "role": role, "status": status, "sort_by": sort_by, "sort_order": sort_order},
            "error": "Database not connected"
        }
    
    try:
        # Build query
        query = db.table("users").select("*", count="exact")
        
        if search:
            query = query.or_(f"email.ilike.%{search}%,full_name.ilike.%{search}%")
        
        if role:
            query = query.eq("role", role)
        
        if status == "active":
            query = query.eq("is_active", True)
        elif status == "inactive":
            query = query.eq("is_active", False)
        
        # Pagination
        skip = (page - 1) * page_size
        desc = sort_order == "desc"
        
        query = query.order(sort_by, desc=desc).range(skip, skip + page_size - 1)
        
        response = query.execute()
        total = response.count or 0
        users = response.data or []
        
        # Enrich user data with credits
        enriched_users = []
        for user in users:
            # Get credit balance (with error handling)
            try:
                credit_resp = db.table("user_credits").select("credits_balance").eq("user_id", user["id"]).execute()
                credits_balance = float(credit_resp.data[0].get("credits_balance", 0)) if credit_resp.data else 0
            except Exception:
                credits_balance = 0
            
            enriched_user = {
                **user,
                "credits_balance": credits_balance,
                "usage_30d": {"total_requests": 0, "total_credits": 0},
                "last_activity": None,
                "total_spent": 0
            }
            
            enriched_users.append(enriched_user)
        
        return {
            "success": True,
            "users": enriched_users,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
                "has_more": skip + len(users) < total
            },
            "filters": {
                "search": search,
                "role": role,
                "status": status,
                "sort_by": sort_by,
                "sort_order": sort_order
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        return {
            "success": False,
            "users": [],
            "pagination": {"page": page, "page_size": page_size, "total": 0, "total_pages": 0, "has_more": False},
            "filters": {"search": search, "role": role, "status": status, "sort_by": sort_by, "sort_order": sort_order},
            "error": str(e)
        }

@router.post("/users/bulk-action")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def perform_bulk_user_action(
    request: Request,
    action_data: UserManagementAction,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Perform bulk actions on users using Supabase"""
    try:
        results = []
        
        for user_id in action_data.user_ids:
            try:
                # Find user
                user_resp = db.table("users").select("*").eq("id", user_id).execute()
                if not user_resp.data:
                    results.append({"user_id": user_id, "success": False, "error": "User not found"})
                    continue
                
                user = user_resp.data[0]
                
                # Perform action
                if action_data.action == "suspend":
                    db.table("users").update({
                        "is_active": False,
                        "suspended_at": datetime.utcnow().isoformat()
                    }).eq("id", user_id).execute()
                    
                elif action_data.action == "activate":
                    db.table("users").update({
                        "is_active": True,
                        "suspended_at": None
                    }).eq("id", user_id).execute()
                    
                elif action_data.action == "add_credits":
                    if not action_data.value or action_data.value <= 0:
                        results.append({"user_id": user_id, "success": False, "error": "Invalid credit amount"})
                        continue
                    
                    # Get current balance
                    credit_resp = db.table("user_credits").select("credits_balance").eq("user_id", user_id).execute()
                    current_balance = float(credit_resp.data[0].get("credits_balance", 0)) if credit_resp.data else 0
                    new_balance = current_balance + action_data.value
                    
                    db.table("user_credits").upsert({
                        "user_id": user_id,
                        "credits_balance": new_balance
                    }).execute()
                    
                elif action_data.action == "set_role":
                    if action_data.value not in ["user", "admin"]:
                        results.append({"user_id": user_id, "success": False, "error": "Invalid role"})
                        continue
                    
                    db.table("users").update({
                        "role": action_data.value
                    }).eq("id", user_id).execute()
                
                results.append({"user_id": user_id, "success": True})
                
            except Exception as e:
                logger.error(f"Bulk action failed for user {user_id}: {e}")
                results.append({"user_id": user_id, "success": False, "error": str(e)})
        
        success_count = len([r for r in results if r["success"]])
        
        logger.info(f"Admin {current_user.id} performed bulk action {action_data.action} on {len(action_data.user_ids)} users, {success_count} successful")
        
        return {
            "success": True,
            "message": f"Bulk action completed: {success_count}/{len(action_data.user_ids)} successful",
            "results": results,
            "summary": {
                "total": len(action_data.user_ids),
                "successful": success_count,
                "failed": len(action_data.user_ids) - success_count
            }
        }
        
    except Exception as e:
        logger.error(f"Bulk user action error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform bulk user action"
        )

# ============================================
# System Notifications
# ============================================

@router.post("/notifications/send")
@limiter.limit(RateLimits.ADMIN_WRITE)
async def send_system_notification(
    request: Request,
    notification: AdminNotification,
    current_user: SimpleNamespace = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Send system notification to users using Supabase"""
    try:
        # Create notification record
        notification_id = str(uuid.uuid4())
        notification_record = {
            "id": notification_id,
            "type": notification.type,
            "title": notification.title,
            "message": notification.message,
            "priority": notification.priority,
            "target_users": notification.target_users,
            "created_by": current_user.id,
            "created_at": datetime.utcnow().isoformat(),
            "sent_count": 0
        }
        
        # Insert into Supabase
        db.table("system_notifications").insert(notification_record).execute()
        
        # Send via WebSocket
        websocket_message = {
            "type": "system_notification",
            "id": notification_id,
            "title": notification.title,
            "message": notification.message,
            "priority": notification.priority,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        sent_count = 0
        
        if notification.target_users:
            for user_id in notification.target_users:
                await connection_manager.send_personal_message(websocket_message, user_id)
                sent_count += 1
        else:
            await connection_manager.send_broadcast(websocket_message)
            sent_count = connection_manager.get_connection_stats().get("total_users", 0)
        
        # Update sent count
        db.table("system_notifications").update({
            "sent_count": sent_count,
            "sent_at": datetime.utcnow().isoformat()
        }).eq("id", notification_id).execute()
        
        logger.info(f"Admin {current_user.id} sent system notification to {sent_count} users")
        
        return {
            "success": True,
            "message": f"Notification sent to {sent_count} users",
            "notification_id": notification_id,
            "sent_count": sent_count
        }
        
    except Exception as e:
        logger.error(f"System notification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send system notification"
        )

# ============================================
# Provider Management
# ============================================

@router.get("/providers/status")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_provider_status(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get AI provider status and health"""
    try:
        provider_status = ai_provider_manager.get_provider_status()
        
        # Safe counting with isinstance check
        healthy = len([p for p in provider_status.values() if isinstance(p, dict) and p.get("status") == "healthy"])
        degraded = len([p for p in provider_status.values() if isinstance(p, dict) and p.get("status") == "degraded"])
        down = len([p for p in provider_status.values() if isinstance(p, dict) and p.get("status") == "down"])
        
        return {
            "success": True,
            "providers": provider_status,
            "summary": {
                "total": len(provider_status),
                "healthy": healthy,
                "degraded": degraded,
                "down": down
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Provider status error: {e}")
        return {
            "success": False,
            "providers": {},
            "summary": {"total": 0, "healthy": 0, "degraded": 0, "down": 0},
            "last_updated": datetime.utcnow().isoformat(),
            "error": str(e)
        }

# ============================================
# Real-time Monitoring
# ============================================

@router.get("/monitoring/realtime")
@limiter.limit(RateLimits.ADMIN_READ)
async def get_realtime_monitoring(
    request: Request,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get real-time monitoring data"""
    try:
        # WebSocket connections
        connection_stats = connection_manager.get_connection_stats()
        
        # Provider status
        provider_status = ai_provider_manager.get_provider_status()
        
        # System health
        system_health = {
            "websocket_connections": connection_stats,
            "provider_health": provider_status,
            "supabase_enabled": is_supabase_enabled(),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return {
            "success": True,
            "monitoring": system_health,
            "alerts": [],  # TODO: Implement alerting system
            "real_time_enabled": True
        }
        
    except Exception as e:
        logger.error(f"Real-time monitoring error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get monitoring data"
        )
