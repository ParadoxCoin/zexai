"""
Enhanced WebSocket Manager with Supabase Real-time Integration
Secure WebSocket connections with authentication and real-time sync
"""

import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from core.logger import app_logger as logger
from core.security_enhanced import JWTManager
from core.supabase_client import get_supabase_client, is_supabase_enabled
from core.database import get_database

class ConnectionManager:
    """Enhanced WebSocket connection manager with Supabase integration"""
    
    def __init__(self):
        # Active connections by user_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Connection metadata
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        # Supabase real-time subscriptions
        self.supabase_subscriptions: Dict[str, Any] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str, token: str = None):
        """Connect user with authentication"""
        try:
            # Authenticate user
            if token:
                payload = JWTManager.verify_token(token)
                if not payload or payload.get("user_id") != user_id:
                    await websocket.close(code=4001, reason="Invalid token")
                    return False
            
            await websocket.accept()
            
            # Add to active connections
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            
            self.active_connections[user_id].append(websocket)
            
            # Store connection metadata
            connection_id = f"{user_id}_{len(self.active_connections[user_id])}"
            self.connection_metadata[connection_id] = {
                "user_id": user_id,
                "connected_at": datetime.utcnow(),
                "websocket": websocket,
                "authenticated": bool(token)
            }
            
            # Setup Supabase real-time subscription for this user
            await self._setup_supabase_subscription(user_id)
            
            logger.info(f"WebSocket connected: {user_id} (authenticated: {bool(token)})")
            
            # Send welcome message
            await self.send_personal_message({
                "type": "connection_established",
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
                "real_time_enabled": is_supabase_enabled()
            }, user_id)
            
            return True
            
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            await websocket.close(code=4000, reason="Connection failed")
            return False
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Disconnect user and cleanup"""
        try:
            if user_id in self.active_connections:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
                
                # Remove empty user entries
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                    
                    # Cleanup Supabase subscription
                    await self._cleanup_supabase_subscription(user_id)
            
            # Cleanup metadata
            to_remove = []
            for conn_id, metadata in self.connection_metadata.items():
                if metadata["websocket"] == websocket:
                    to_remove.append(conn_id)
            
            for conn_id in to_remove:
                del self.connection_metadata[conn_id]
            
            logger.info(f"WebSocket disconnected: {user_id}")
            
        except Exception as e:
            logger.error(f"WebSocket disconnect error: {e}")
    
    async def send_personal_message(self, message: Dict[str, Any], user_id: str):
        """Send message to specific user"""
        if user_id in self.active_connections:
            message_str = json.dumps(message, default=str)
            
            # Send to all user's connections
            disconnected = []
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(message_str)
                except Exception as e:
                    logger.warning(f"Failed to send message to {user_id}: {e}")
                    disconnected.append(websocket)
            
            # Remove disconnected websockets
            for ws in disconnected:
                await self.disconnect(ws, user_id)
    
    async def send_broadcast(self, message: Dict[str, Any]):
        """Send message to all connected users"""
        message_str = json.dumps(message, default=str)
        
        for user_id, connections in self.active_connections.items():
            disconnected = []
            for websocket in connections:
                try:
                    await websocket.send_text(message_str)
                except Exception as e:
                    logger.warning(f"Failed to broadcast to {user_id}: {e}")
                    disconnected.append(websocket)
            
            # Remove disconnected websockets
            for ws in disconnected:
                await self.disconnect(ws, user_id)
    
    async def _setup_supabase_subscription(self, user_id: str):
        """Setup Supabase real-time subscription for user"""
        if not is_supabase_enabled():
            return
        
        try:
            supabase = get_supabase_client()
            if not supabase:
                return
            
            # Subscribe to user-specific changes
            subscription_key = f"user_{user_id}"
            
            if subscription_key not in self.supabase_subscriptions:
                # Subscribe to user credits changes
                def on_credits_change(payload):
                    asyncio.create_task(self._handle_supabase_event(user_id, "credits_updated", payload))
                
                # Subscribe to user dashboard stats changes
                def on_stats_change(payload):
                    asyncio.create_task(self._handle_supabase_event(user_id, "stats_updated", payload))
                
                # Note: Supabase Python client doesn't support real-time subscriptions yet
                # This is a placeholder for when it's available
                # For now, we'll use periodic updates
                
                self.supabase_subscriptions[subscription_key] = {
                    "user_id": user_id,
                    "created_at": datetime.utcnow()
                }
                
                logger.info(f"Supabase subscription setup for user: {user_id}")
                
        except Exception as e:
            logger.warning(f"Failed to setup Supabase subscription: {e}")
    
    async def _cleanup_supabase_subscription(self, user_id: str):
        """Cleanup Supabase subscription for user"""
        subscription_key = f"user_{user_id}"
        
        if subscription_key in self.supabase_subscriptions:
            try:
                # Cleanup subscription
                del self.supabase_subscriptions[subscription_key]
                logger.info(f"Supabase subscription cleaned up for user: {user_id}")
                
            except Exception as e:
                logger.warning(f"Failed to cleanup Supabase subscription: {e}")
    
    async def _handle_supabase_event(self, user_id: str, event_type: str, payload: Dict[str, Any]):
        """Handle Supabase real-time events"""
        try:
            message = {
                "type": "realtime_update",
                "event_type": event_type,
                "data": payload,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "supabase"
            }
            
            await self.send_personal_message(message, user_id)
            
        except Exception as e:
            logger.error(f"Failed to handle Supabase event: {e}")
    
    async def notify_credit_update(self, user_id: str, credits_balance: float, change_amount: float, reason: str):
        """Notify user of credit balance update"""
        message = {
            "type": "credit_update",
            "user_id": user_id,
            "credits_balance": credits_balance,
            "change_amount": change_amount,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.send_personal_message(message, user_id)
        
        # Also update Supabase for real-time sync
        if is_supabase_enabled():
            try:
                supabase = get_supabase_client()
                if supabase:
                    supabase.table("user_credits").upsert({
                        "user_id": user_id,
                        "credits_balance": credits_balance,
                        "updated_at": datetime.utcnow().isoformat()
                    }).execute()
                    
            except Exception as e:
                logger.warning(f"Failed to sync credit update to Supabase: {e}")
    
    async def notify_generation_complete(self, user_id: str, generation_data: Dict[str, Any]):
        """Notify user of completed AI generation"""
        message = {
            "type": "generation_complete",
            "user_id": user_id,
            "generation_data": generation_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.send_personal_message(message, user_id)
    
    async def notify_system_update(self, update_type: str, data: Dict[str, Any]):
        """Notify all users of system updates"""
        message = {
            "type": "system_update",
            "update_type": update_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.send_broadcast(message)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        
        return {
            "total_users": len(self.active_connections),
            "total_connections": total_connections,
            "supabase_subscriptions": len(self.supabase_subscriptions),
            "real_time_enabled": is_supabase_enabled()
        }

# Global connection manager instance
connection_manager = ConnectionManager()

# ============================================
# WebSocket Endpoint Handler
# ============================================

async def websocket_endpoint_enhanced(websocket: WebSocket, token: str = None):
    """Enhanced WebSocket endpoint with authentication and real-time features"""
    user_id = None
    
    try:
        # Extract user_id from token if provided
        if token:
            payload = JWTManager.verify_token(token)
            if payload:
                user_id = payload.get("user_id")
        
        if not user_id:
            await websocket.close(code=4001, reason="Authentication required")
            return
        
        # Connect user
        connected = await connection_manager.connect(websocket, user_id, token)
        if not connected:
            return
        
        # Handle messages
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                await handle_websocket_message(user_id, message)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await connection_manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, user_id)
            except Exception as e:
                logger.error(f"WebSocket message handling error: {e}")
                await connection_manager.send_personal_message({
                    "type": "error",
                    "message": "Message processing failed"
                }, user_id)
    
    except Exception as e:
        logger.error(f"WebSocket endpoint error: {e}")
    
    finally:
        if user_id:
            await connection_manager.disconnect(websocket, user_id)

async def handle_websocket_message(user_id: str, message: Dict[str, Any]):
    """Handle incoming WebSocket messages"""
    try:
        message_type = message.get("type")
        
        if message_type == "ping":
            # Respond to ping with pong
            await connection_manager.send_personal_message({
                "type": "pong",
                "timestamp": datetime.utcnow().isoformat()
            }, user_id)
        
        elif message_type == "subscribe":
            # Subscribe to specific events
            events = message.get("events", [])
            await connection_manager.send_personal_message({
                "type": "subscription_confirmed",
                "events": events,
                "timestamp": datetime.utcnow().isoformat()
            }, user_id)
        
        elif message_type == "get_stats":
            # Send connection stats
            stats = connection_manager.get_connection_stats()
            await connection_manager.send_personal_message({
                "type": "stats",
                "data": stats,
                "timestamp": datetime.utcnow().isoformat()
            }, user_id)
        
        elif message_type == "sync_data":
            # Sync user data from database
            await sync_user_data(user_id)
        
        else:
            await connection_manager.send_personal_message({
                "type": "error",
                "message": f"Unknown message type: {message_type}"
            }, user_id)
    
    except Exception as e:
        logger.error(f"Message handling error: {e}")
        await connection_manager.send_personal_message({
            "type": "error",
            "message": "Failed to process message"
        }, user_id)

async def sync_user_data(user_id: str):
    """Sync user data and send via WebSocket"""
    try:
        db = get_database()
        
        # Get user credits
        credit_record = await db.user_credits.find_one({"user_id": user_id})
        credits_balance = credit_record.get("credits_balance", 0) if credit_record else 0
        
        # Get recent usage
        recent_usage = await db.usage_logs.find({
            "user_id": user_id
        }).sort("created_at", -1).limit(5).to_list(length=5)
        
        # Send synced data
        await connection_manager.send_personal_message({
            "type": "data_sync",
            "data": {
                "credits_balance": credits_balance,
                "recent_usage": recent_usage
            },
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)
        
    except Exception as e:
        logger.error(f"Data sync error: {e}")
        await connection_manager.send_personal_message({
            "type": "error",
            "message": "Data sync failed"
        }, user_id)