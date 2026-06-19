"""
Supabase Real-time Service
Handles real-time subscriptions for credit updates and task status
"""
from typing import Optional, Callable, Dict, Any
from core.supabase_client import get_supabase_public_client, is_supabase_enabled
from core.logger import app_logger as logger


class RealtimeService:
    """Manages Supabase Real-time subscriptions"""
    
    def __init__(self):
        self.use_supabase = is_supabase_enabled()
        self.subscriptions: Dict[str, Any] = {}
    
    def subscribe_to_credits(
        self, 
        user_id: str, 
        callback: Callable[[Dict[str, Any]], None]
    ) -> Optional[Any]:
        """
        Subscribe to credit updates for a user
        
        Args:
            user_id: User ID to subscribe to
            callback: Function to call when credits are updated
            
        Returns:
            Subscription channel or None if failed
        """
        if not self.use_supabase:
            logger.warning("⚠️ Supabase not enabled, real-time subscriptions unavailable")
            return None
        
        try:
            supabase = get_supabase_public_client()
            if not supabase:
                logger.error("❌ Supabase public client not available")
                return None
            
            # Subscribe to user_credits table changes
            channel = supabase.channel(f"user_credits_{user_id}")
            
            channel.on(
                "postgres_changes",
                {
                    "event": "*",  # INSERT, UPDATE, DELETE
                    "schema": "public",
                    "table": "user_credits",
                    "filter": f"user_id=eq.{user_id}"
                },
                callback
            )
            
            channel.subscribe()
            self.subscriptions[f"credits_{user_id}"] = channel
            
            logger.info(f"✅ Subscribed to credit updates for user {user_id}")
            return channel
            
        except Exception as e:
            logger.error(f"❌ Failed to subscribe to credits: {e}")
            return None
    
    def subscribe_to_tasks(
        self,
        user_id: str,
        task_type: str,  # "image", "video", "audio"
        callback: Callable[[Dict[str, Any]], None]
    ) -> Optional[Any]:
        """
        Subscribe to task status updates
        
        Args:
            user_id: User ID
            task_type: Type of task ("image", "video", "audio")
            callback: Function to call when task status changes
            
        Returns:
            Subscription channel or None if failed
        """
        if not self.use_supabase:
            logger.warning("⚠️ Supabase not enabled, real-time subscriptions unavailable")
            return None
        
        try:
            supabase = get_supabase_public_client()
            if not supabase:
                logger.error("❌ Supabase public client not available")
                return None
            
            # Note: Tasks are stored in MongoDB, not Supabase
            # For real-time task updates, we would need to:
            # 1. Create a tasks table in Supabase, OR
            # 2. Use WebSocket from backend to push updates
            
            # For now, we'll use WebSocket approach (see websocket.py)
            logger.info(f"ℹ️ Task subscriptions use WebSocket (see core/websocket.py)")
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to subscribe to tasks: {e}")
            return None
    
    def unsubscribe(self, subscription_key: str) -> bool:
        """Unsubscribe from a channel"""
        try:
            if subscription_key in self.subscriptions:
                channel = self.subscriptions[subscription_key]
                supabase = get_supabase_public_client()
                if supabase:
                    supabase.remove_channel(channel)
                del self.subscriptions[subscription_key]
                logger.info(f"✅ Unsubscribed from {subscription_key}")
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Failed to unsubscribe: {e}")
            return False
    
    def unsubscribe_all(self) -> bool:
        """Unsubscribe from all channels"""
        try:
            for key in list(self.subscriptions.keys()):
                self.unsubscribe(key)
            return True
        except Exception as e:
            logger.error(f"❌ Failed to unsubscribe all: {e}")
            return False


# Global instance
realtime_service = RealtimeService()
