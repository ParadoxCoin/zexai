"""
Notifications API
User notification endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from types import SimpleNamespace
import logging

from core.security import get_current_user
from core.notification_service import get_notification_service, NotificationCategory, NotificationType
from core.config import settings
from schemas.notification import PushSubscription

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ============================================
# Response Models
# ============================================

class NotificationResponse(BaseModel):
    """Single notification"""
    id: str
    title: str
    message: str
    category: str
    type: str
    action_url: Optional[str]
    metadata: Dict[str, Any]
    is_read: bool
    created_at: str


class NotificationListResponse(BaseModel):
    """List of notifications"""
    notifications: List[NotificationResponse]
    unread_count: int
    total: int


class UnreadCountResponse(BaseModel):
    """Unread count response"""
    count: int


class MarkReadRequest(BaseModel):
    """Mark as read request"""
    notification_ids: Optional[List[str]] = None  # If empty, mark all as read


class UnsubscribeRequest(BaseModel):
    """Unsubscribe request"""
    endpoint: str


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    limit: int = Query(20, ge=1, le=50),
    unread_only: bool = Query(False),
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """Get user's notifications"""
    service = get_notification_service()
    
    notifications = await service.get_user_notifications(
        user_id=current_user.id,
        limit=limit,
        unread_only=unread_only
    )
    
    unread_count = await service.get_unread_count(current_user.id)
    
    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                id=n.get("id"),
                title=n.get("title"),
                message=n.get("message"),
                category=n.get("category", "system"),
                type=n.get("type", "info"),
                action_url=n.get("action_url"),
                metadata=n.get("metadata", {}),
                is_read=n.get("is_read", False),
                created_at=n.get("created_at", "")
            )
            for n in notifications
        ],
        unread_count=unread_count,
        total=len(notifications)
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """Get count of unread notifications"""
    service = get_notification_service()
    count = await service.get_unread_count(current_user.id)
    return UnreadCountResponse(count=count)


@router.post("/mark-read")
async def mark_as_read(
    request: MarkReadRequest,
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """Mark notifications as read"""
    service = get_notification_service()
    
    if not request.notification_ids:
        # Mark all as read
        count = await service.mark_all_as_read(current_user.id)
        return {"success": True, "marked_count": count}
    
    # Mark specific notifications
    success_count = 0
    for notification_id in request.notification_ids:
        if await service.mark_as_read(notification_id, current_user.id):
            success_count += 1
    
    return {"success": True, "marked_count": success_count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """Delete a notification"""
    service = get_notification_service()
    
    success = await service.delete_notification(notification_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True}


@router.delete("")
async def delete_all_read(
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """Delete all read notifications"""
    from core.supabase_client import get_supabase_client
    
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not available")
    
    try:
        result = supabase.table("notifications")\
            .delete()\
            .eq("user_id", current_user.id)\
            .eq("is_read", True)\
            .execute()
        
        return {"success": True, "deleted_count": len(result.data or [])}
    except Exception as e:
        logger.error(f"Failed to delete notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/push/public-key")
async def get_vapid_public_key():
    """Get VAPID public key for web push subscription"""
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=501, detail="Web Push is not configured")
    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/push/subscribe")
async def subscribe_push(
    subscription: PushSubscription,
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """Save user web push subscription"""
    service = get_notification_service()
    success = await service.save_push_subscription(current_user.id, subscription.model_dump())
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save push subscription")
    
    return {"success": True, "message": "Subscription saved"}


@router.post("/push/unsubscribe")
async def unsubscribe_push(
    request: UnsubscribeRequest,
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """Remove user web push subscription"""
    service = get_notification_service()
    # Always return success to not block frontend if already deleted
    await service.delete_push_subscription(current_user.id, request.endpoint)
    
    return {"success": True, "message": "Subscription removed"}
