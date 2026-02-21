"""
Notification Service
Handles in-app notifications, email alerts, and webhook triggers
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
import logging
import json

from core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    """Types of notifications"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    SYSTEM = "system"


class NotificationCategory(str, Enum):
    """Categories for notifications"""
    CREDIT = "credit"           # Credit related
    GENERATION = "generation"   # AI generation complete
    SUBSCRIPTION = "subscription"  # Subscription changes
    SYSTEM = "system"           # System announcements
    SECURITY = "security"       # Security alerts
    BILLING = "billing"         # Payment/billing
    REFERRAL = "referral"       # Referral rewards


class NotificationService:
    """
    Service for managing user notifications.
    
    Usage:
        await notification_service.send(
            user_id="user-123",
            title="Krediniz azaldı",
            message="Kredi bakiyeniz 10'un altına düştü.",
            category=NotificationCategory.CREDIT,
            notification_type=NotificationType.WARNING
        )
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        logger.info("NotificationService initialized")
    
    async def send(
        self,
        user_id: str,
        title: str,
        message: str,
        category: NotificationCategory = NotificationCategory.SYSTEM,
        notification_type: NotificationType = NotificationType.INFO,
        action_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict]:
        """
        Send a notification to a user.
        
        Args:
            user_id: Target user ID
            title: Notification title
            message: Notification body
            category: Category for grouping
            notification_type: Type (info, success, warning, error)
            action_url: Optional URL for click action
            metadata: Additional data
            
        Returns:
            Created notification record or None
        """
        supabase = get_supabase_client()
        if not supabase:
            logger.warning("Supabase not available, skipping notification")
            return None
        
        try:
            notification = {
                "user_id": user_id,
                "title": title,
                "message": message,
                "category": category.value,
                "type": notification_type.value,
                "action_url": action_url,
                "metadata": metadata or {},
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = supabase.table("notifications").insert(notification).execute()
            
            if result.data:
                logger.info(f"Notification sent to user {user_id}: {title}")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return None
    
    async def send_to_all(
        self,
        title: str,
        message: str,
        category: NotificationCategory = NotificationCategory.SYSTEM,
        notification_type: NotificationType = NotificationType.INFO,
        action_url: Optional[str] = None
    ) -> int:
        """
        Send a notification to all active users.
        
        Returns:
            Count of notifications sent
        """
        supabase = get_supabase_client()
        if not supabase:
            return 0
        
        try:
            # Get all active users
            users = supabase.table("profiles").select("id").execute()
            
            count = 0
            for user in (users.data or []):
                result = await self.send(
                    user_id=user["id"],
                    title=title,
                    message=message,
                    category=category,
                    notification_type=notification_type,
                    action_url=action_url,
                    metadata={"broadcast": True}
                )
                if result:
                    count += 1
            
            logger.info(f"Broadcast notification sent to {count} users")
            return count
            
        except Exception as e:
            logger.error(f"Failed to broadcast notification: {e}")
            return 0
    
    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 20,
        unread_only: bool = False
    ) -> List[Dict]:
        """Get notifications for a user"""
        supabase = get_supabase_client()
        if not supabase:
            return []
        
        try:
            query = supabase.table("notifications")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)
            
            if unread_only:
                query = query.eq("is_read", False)
            
            result = query.execute()
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get notifications: {e}")
            return []
    
    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications"""
        supabase = get_supabase_client()
        if not supabase:
            return 0
        
        try:
            result = supabase.table("notifications")\
                .select("id", count="exact")\
                .eq("user_id", user_id)\
                .eq("is_read", False)\
                .execute()
            
            return result.count or 0
            
        except Exception as e:
            logger.error(f"Failed to get unread count: {e}")
            return 0
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read"""
        supabase = get_supabase_client()
        if not supabase:
            return False
        
        try:
            result = supabase.table("notifications")\
                .update({"is_read": True, "read_at": datetime.utcnow().isoformat()})\
                .eq("id", notification_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return len(result.data or []) > 0
            
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False
    
    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        supabase = get_supabase_client()
        if not supabase:
            return 0
        
        try:
            result = supabase.table("notifications")\
                .update({"is_read": True, "read_at": datetime.utcnow().isoformat()})\
                .eq("user_id", user_id)\
                .eq("is_read", False)\
                .execute()
            
            count = len(result.data or [])
            logger.info(f"Marked {count} notifications as read for user {user_id}")
            return count
            
        except Exception as e:
            logger.error(f"Failed to mark all as read: {e}")
            return 0
    
    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification"""
        supabase = get_supabase_client()
        if not supabase:
            return False
        
        try:
            result = supabase.table("notifications")\
                .delete()\
                .eq("id", notification_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete notification: {e}")
            return False


# Singleton instance
_notification_service = None


def get_notification_service() -> NotificationService:
    """Get notification service singleton"""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service


# ============================================
# Convenience Functions for Common Notifications
# ============================================

async def notify_low_credits(user_id: str, current_balance: int, threshold: int = 10):
    """Send low credit warning"""
    service = get_notification_service()
    await service.send(
        user_id=user_id,
        title="Kredi Uyarısı",
        message=f"Kredi bakiyeniz {current_balance} krediye düştü. Hizmetlerin kesintisiz devam etmesi için kredi yükleyin.",
        category=NotificationCategory.CREDIT,
        notification_type=NotificationType.WARNING,
        action_url="/credits",
        metadata={"balance": current_balance, "threshold": threshold}
    )


async def notify_generation_complete(user_id: str, generation_type: str, generation_id: str):
    """Notify user that their AI generation is complete"""
    service = get_notification_service()
    type_names = {
        "image": "Görsel",
        "video": "Video",
        "audio": "Ses",
        "chat": "Chat"
    }
    await service.send(
        user_id=user_id,
        title=f"{type_names.get(generation_type, generation_type)} Hazır!",
        message=f"{type_names.get(generation_type, generation_type)} oluşturma işleminiz tamamlandı.",
        category=NotificationCategory.GENERATION,
        notification_type=NotificationType.SUCCESS,
        action_url=f"/media",
        metadata={"generation_id": generation_id, "type": generation_type}
    )


async def notify_subscription_change(user_id: str, new_plan: str, action: str = "upgraded"):
    """Notify about subscription change"""
    service = get_notification_service()
    action_messages = {
        "upgraded": f"Aboneliğiniz {new_plan} planına yükseltildi!",
        "downgraded": f"Aboneliğiniz {new_plan} planına düşürüldü.",
        "cancelled": "Aboneliğiniz iptal edildi.",
        "renewed": f"{new_plan} aboneliğiniz yenilendi."
    }
    await service.send(
        user_id=user_id,
        title="Abonelik Değişikliği",
        message=action_messages.get(action, f"Abonelik durumunuz güncellendi: {new_plan}"),
        category=NotificationCategory.SUBSCRIPTION,
        notification_type=NotificationType.INFO,
        action_url="/billing",
        metadata={"plan": new_plan, "action": action}
    )


async def notify_referral_reward(user_id: str, reward_credits: int, referral_name: str):
    """Notify about referral reward"""
    service = get_notification_service()
    await service.send(
        user_id=user_id,
        title="Referans Ödülü!",
        message=f"{referral_name} sizin davetinizle katıldı. {reward_credits} kredi kazandınız!",
        category=NotificationCategory.REFERRAL,
        notification_type=NotificationType.SUCCESS,
        action_url="/referral",
        metadata={"reward": reward_credits, "referral": referral_name}
    )
