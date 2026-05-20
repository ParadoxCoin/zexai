"""
WebSocket configuration for real-time updates
Handles live notifications, progress updates, and real-time data
"""
from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Dict, List, Set, Optional, Any
import json
import asyncio
import logging
from datetime import datetime
from core.security import get_current_user
from core.database import get_database
from core.logger import app_logger as logger
import jwt
from core.config import settings


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        # Active connections: {user_id: [websocket1, websocket2, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Task connections: {task_id: websocket}
        self.task_connections: Dict[str, WebSocket] = {}
        # Admin connections for real-time stats
        self.admin_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, user_id: str = None):
        """Accept WebSocket connection"""
        await websocket.accept()
        
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
            logger.info(f"User {user_id} connected via WebSocket")
        else:
            # Anonymous connection (for public updates)
            logger.info("Anonymous WebSocket connection established")
    
    async def disconnect(self, websocket: WebSocket, user_id: str = None):
        """Handle WebSocket disconnection"""
        if user_id and user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            logger.info(f"User {user_id} disconnected from WebSocket")
        
        # Remove from admin connections
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)
        
        # Remove from task connections
        task_ids_to_remove = []
        for task_id, ws in self.task_connections.items():
            if ws == websocket:
                task_ids_to_remove.append(task_id)
        
        for task_id in task_ids_to_remove:
            del self.task_connections[task_id]
    
    async def send_personal_message(self, message: str, user_id: str):
        """Send message to specific user"""
        if user_id in self.active_connections:
            connections = self.active_connections[user_id].copy()
            for connection in connections:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Failed to send message to user {user_id}: {e}")
                    # Remove broken connection
                    if connection in self.active_connections[user_id]:
                        self.active_connections[user_id].remove(connection)
    
    async def send_task_update(self, task_id: str, message: str):
        """Send update to specific task connection"""
        if task_id in self.task_connections:
            try:
                await self.task_connections[task_id].send_text(message)
            except Exception as e:
                logger.error(f"Failed to send task update for {task_id}: {e}")
                # Remove broken connection
                if task_id in self.task_connections:
                    del self.task_connections[task_id]
    
    async def broadcast_to_admins(self, message: str):
        """Broadcast message to all admin connections"""
        if self.admin_connections:
            connections = self.admin_connections.copy()
            for connection in connections:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Failed to send admin broadcast: {e}")
                    # Remove broken connection
                    if connection in self.admin_connections:
                        self.admin_connections.remove(connection)
    
    async def broadcast_to_all(self, message: str):
        """Broadcast message to all connected users"""
        all_connections = []
        
        # Collect all connections
        for user_connections in self.active_connections.values():
            all_connections.extend(user_connections)
        
        all_connections.extend(self.admin_connections)
        
        # Send to all connections
        for connection in all_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to broadcast message: {e}")


# Global connection manager
manager = ConnectionManager()


class WebSocketMessage:
    """WebSocket message utilities"""
    
    @staticmethod
    def create_message(message_type: str, data: Any, timestamp: str = None) -> str:
        """Create structured WebSocket message"""
        if timestamp is None:
            timestamp = datetime.utcnow().isoformat()
        
        message = {
            "type": message_type,
            "data": data,
            "timestamp": timestamp
        }
        
        return json.dumps(message)
    
    @staticmethod
    def credit_update(user_id: str, new_balance: float, change: float = None):
        """Create credit update message"""
        data = {
            "user_id": user_id,
            "new_balance": new_balance,
            "change": change
        }
        return WebSocketMessage.create_message("credit_update", data)
    
    @staticmethod
    def task_progress(task_id: str, status: str, progress: int = None, result: Any = None):
        """Create task progress message"""
        data = {
            "task_id": task_id,
            "status": status,
            "progress": progress,
            "result": result
        }
        return WebSocketMessage.create_message("task_progress", data)
    
    @staticmethod
    def notification(user_id: str, title: str, message: str, notification_type: str = "info"):
        """Create notification message"""
        data = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notification_type
        }
        return WebSocketMessage.create_message("notification", data)
    
    @staticmethod
    def admin_stats(stats: Dict[str, Any]):
        """Create admin stats update message"""
        return WebSocketMessage.create_message("admin_stats", stats)
    
    @staticmethod
    def system_announcement(title: str, message: str, priority: str = "normal"):
        """Create system announcement message"""
        data = {
            "title": title,
            "message": message,
            "priority": priority
        }
        return WebSocketMessage.create_message("system_announcement", data)


async def authenticate_websocket(websocket: WebSocket, token: str = None) -> Optional[str]:
    """Authenticate WebSocket connection"""
    try:
        if not token:
            return None
        
        # 1. Try decoding locally (fast path)
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            user_id = payload.get('user_id')
            if user_id:
                return user_id
        except Exception:
            pass

        # 2. Try validating with Supabase client directly
        try:
            from core.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            if supabase:
                auth_response = supabase.auth.get_user(token)
                if auth_response and auth_response.user:
                    return auth_response.user.id
        except Exception as supabase_err:
            logger.debug(f"Supabase websocket auth fallback note: {supabase_err}")
        
        return None
        
    except Exception as e:
        logger.error(f"WebSocket authentication error: {e}")
        return None


async def websocket_endpoint(websocket: WebSocket, token: str = None):
    """Main WebSocket endpoint with secure post-handshake authentication"""
    user_id = None
    
    try:
        # Legacy: token provided in query params
        if token:
            user_id = await authenticate_websocket(websocket, token)
            await manager.connect(websocket, user_id)
            
            welcome_message = WebSocketMessage.create_message(
                "connection_established",
                {"user_id": user_id, "timestamp": datetime.utcnow().isoformat()}
            )
            await websocket.send_text(welcome_message)
        else:
            # Post-handshake flow: accept connection anonymously first
            await websocket.accept()
            logger.info("Anonymous WebSocket connected, waiting for authentication...")
            
            # Wait for the "auth" message within 10 seconds
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
                message = json.loads(data)
                if message.get("type") == "auth":
                    auth_token = message.get("token")
                    user_id = await authenticate_websocket(websocket, auth_token)
                    if not user_id:
                        logger.warning("Post-handshake WebSocket auth failed: Invalid token")
                        await websocket.close(code=4001, reason="Authentication failed")
                        return
                    
                    # Register connection under authenticated user_id
                    if user_id not in manager.active_connections:
                        manager.active_connections[user_id] = []
                    manager.active_connections[user_id].append(websocket)
                    logger.info(f"User {user_id} successfully authenticated via post-handshake WebSocket")
                    
                    welcome_message = WebSocketMessage.create_message(
                        "connection_established",
                        {"user_id": user_id, "timestamp": datetime.utcnow().isoformat()}
                    )
                    await websocket.send_text(welcome_message)
                else:
                    logger.warning("First WebSocket message was not of type 'auth'")
                    await websocket.close(code=4001, reason="Authentication required as first message")
                    return
            except asyncio.TimeoutError:
                logger.warning("WebSocket authentication timeout: 'auth' message not received within 10s")
                await websocket.close(code=4001, reason="Authentication timeout")
                return
            except Exception as auth_err:
                logger.error(f"Error during post-handshake WebSocket auth: {auth_err}")
                await websocket.close(code=4001, reason="Authentication failed")
                return
        
        # Keep connection alive and handle messages
        while True:
            try:
                # Wait for client message
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                await handle_websocket_message(websocket, message, user_id)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await websocket.send_text(WebSocketMessage.create_message(
                    "error",
                    {"message": "Invalid JSON format"}
                ))
            except Exception as e:
                logger.error(f"WebSocket message handling error: {e}")
                await websocket.send_text(WebSocketMessage.create_message(
                    "error",
                    {"message": "Message processing failed"}
                ))
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket, user_id)


async def handle_websocket_message(websocket: WebSocket, message: Dict[str, Any], user_id: str):
    """Handle incoming WebSocket messages"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # Respond to ping with pong
        await websocket.send_text(WebSocketMessage.create_message("pong", {}))
    
    elif message_type == "subscribe_task":
        # Subscribe to task updates
        task_id = message.get("task_id")
        if task_id:
            manager.task_connections[task_id] = websocket
            await websocket.send_text(WebSocketMessage.create_message(
                "task_subscribed",
                {"task_id": task_id}
            ))
    
    elif message_type == "subscribe_admin":
        # Subscribe to admin updates (admin only)
        if user_id:
            db = get_database()
            user = await db.users.find_one({"id": user_id})
            if user and user.get("role") == "admin":
                manager.admin_connections.add(websocket)
                await websocket.send_text(WebSocketMessage.create_message(
                    "admin_subscribed",
                    {}
                ))
    
    elif message_type == "get_balance":
        # Get current credit balance
        if user_id:
            db = get_database()
            credit_record = await db.user_credits.find_one({"user_id": user_id})
            balance = credit_record.get("credits_balance", 0) if credit_record else 0
            
            await websocket.send_text(WebSocketMessage.credit_update(user_id, balance))
    
    else:
        # Unknown message type
        await websocket.send_text(WebSocketMessage.create_message(
            "error",
            {"message": f"Unknown message type: {message_type}"}
        ))


# WebSocket event handlers for real-time updates

async def notify_credit_update(user_id: str, new_balance: float, change: float = None):
    """Notify user of credit balance update"""
    message = WebSocketMessage.credit_update(user_id, new_balance, change)
    await manager.send_personal_message(message, user_id)


async def notify_task_progress(task_id: str, status: str, progress: int = None, result: Any = None):
    """Notify task progress update"""
    message = WebSocketMessage.task_progress(task_id, status, progress, result)
    await manager.send_task_update(task_id, message)


async def notify_user(user_id: str, title: str, message: str, notification_type: str = "info"):
    """Send notification to user"""
    notification = WebSocketMessage.notification(user_id, title, message, notification_type)
    await manager.send_personal_message(notification, user_id)


async def notify_admins(stats: Dict[str, Any]):
    """Notify admins of stats update"""
    message = WebSocketMessage.admin_stats(stats)
    await manager.broadcast_to_admins(message)


async def broadcast_announcement(title: str, message: str, priority: str = "normal"):
    """Broadcast system announcement to all users"""
    announcement = WebSocketMessage.system_announcement(title, message, priority)
    await manager.broadcast_to_all(announcement)

