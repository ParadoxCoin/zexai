"""
Audit Log Service
Tracks all admin operations for security and compliance
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from enum import Enum


class AuditAction(str, Enum):
    """Types of audit actions"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    TOGGLE = "toggle"
    HEALTH_CHECK = "health_check"
    EXPORT = "export"
    IMPORT = "import"
    LOGIN = "login"
    LOGOUT = "logout"
    BULK_ACTION = "bulk_action"


class ResourceType(str, Enum):
    """Types of resources being audited"""
    MODEL = "model"
    PROVIDER = "provider"
    SETTINGS = "settings"
    USER = "user"
    CREDITS = "credits"
    API_KEY = "api_key"
    ROLE = "role"
    TASK = "task"
    SYSTEM = "system"


class AuditLogEntry(BaseModel):
    """Audit log entry schema"""
    id: Optional[str] = None
    user_id: str
    user_email: Optional[str] = None
    action: AuditAction
    resource_type: ResourceType
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None
    success: bool = True
    created_at: Optional[datetime] = None


class AuditLogService:
    """Service for managing audit logs"""
    
    # In-memory storage for development (replace with DB in production)
    _logs: List[Dict[str, Any]] = []
    
    @classmethod
    async def log(
        cls,
        db,
        user_id: str,
        action: AuditAction,
        resource_type: ResourceType,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        user_email: Optional[str] = None,
        details: Optional[str] = None,
        success: bool = True
    ) -> Optional[str]:
        """
        Create an audit log entry
        
        Args:
            db: Database connection
            user_id: ID of the user performing the action
            action: Type of action (create, update, delete, etc.)
            resource_type: Type of resource being modified
            resource_id: ID of the specific resource
            resource_name: Human-readable name of the resource
            old_value: Previous value (for updates)
            new_value: New value (for creates/updates)
            ip_address: Client IP address
            user_agent: Client user agent string
            user_email: User's email for display
            details: Additional context
            success: Whether the action was successful
            
        Returns:
            ID of the created log entry
        """
        import uuid
        
        log_entry = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": user_email,
            "action": action.value if isinstance(action, AuditAction) else action,
            "resource_type": resource_type.value if isinstance(resource_type, ResourceType) else resource_type,
            "resource_id": resource_id,
            "resource_name": resource_name,
            "old_value": old_value,
            "new_value": new_value,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "details": details,
            "success": success,
            "created_at": datetime.utcnow().isoformat()
        }
        
        try:
            if db:
                # Save to database
                result = await db.table("audit_logs").insert(log_entry).execute()
                if result.data:
                    return result.data[0].get("id")
        except Exception as e:
            print(f"Audit log DB error (saving to memory): {e}")
        
        # Fallback to in-memory storage
        cls._logs.append(log_entry)
        
        # Keep only last 1000 entries in memory
        if len(cls._logs) > 1000:
            cls._logs = cls._logs[-1000:]
        
        return log_entry["id"]
    
    @classmethod
    async def get_logs(
        cls,
        db,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Retrieve audit logs with filtering
        
        Args:
            db: Database connection
            user_id: Filter by user
            action: Filter by action type
            resource_type: Filter by resource type
            resource_id: Filter by specific resource
            start_date: Filter from date
            end_date: Filter to date
            limit: Maximum number of results
            offset: Pagination offset
            
        Returns:
            List of audit log entries
        """
        try:
            if db:
                query = db.table("audit_logs").select("*")
                
                if user_id:
                    query = query.eq("user_id", user_id)
                if action:
                    query = query.eq("action", action)
                if resource_type:
                    query = query.eq("resource_type", resource_type)
                if resource_id:
                    query = query.eq("resource_id", resource_id)
                if start_date:
                    query = query.gte("created_at", start_date.isoformat())
                if end_date:
                    query = query.lte("created_at", end_date.isoformat())
                
                query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
                
                result = await query.execute()
                if result.data:
                    return result.data
        except Exception as e:
            print(f"Audit log DB query error: {e}")
        
        # Fallback to in-memory filtering
        logs = cls._logs.copy()
        
        if user_id:
            logs = [l for l in logs if l.get("user_id") == user_id]
        if action:
            logs = [l for l in logs if l.get("action") == action]
        if resource_type:
            logs = [l for l in logs if l.get("resource_type") == resource_type]
        if resource_id:
            logs = [l for l in logs if l.get("resource_id") == resource_id]
        
        # Sort by created_at descending
        logs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return logs[offset:offset + limit]
    
    @classmethod
    async def get_stats(cls, db, days: int = 7) -> Dict[str, Any]:
        """
        Get audit log statistics
        
        Args:
            db: Database connection
            days: Number of days to analyze
            
        Returns:
            Statistics dictionary
        """
        since = datetime.utcnow() - timedelta(days=days)
        logs = await cls.get_logs(db, start_date=since, limit=10000)
        
        # Count by action
        action_counts = {}
        resource_counts = {}
        user_counts = {}
        daily_counts = {}
        
        for log in logs:
            action = log.get("action", "unknown")
            action_counts[action] = action_counts.get(action, 0) + 1
            
            resource = log.get("resource_type", "unknown")
            resource_counts[resource] = resource_counts.get(resource, 0) + 1
            
            user = log.get("user_email") or log.get("user_id", "unknown")
            user_counts[user] = user_counts.get(user, 0) + 1
            
            date = log.get("created_at", "")[:10]  # YYYY-MM-DD
            daily_counts[date] = daily_counts.get(date, 0) + 1
        
        return {
            "total_logs": len(logs),
            "by_action": action_counts,
            "by_resource": resource_counts,
            "by_user": dict(sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
            "by_day": daily_counts,
            "period_days": days
        }
    
    @classmethod
    async def clear_old_logs(cls, db, days: int = 90) -> int:
        """
        Delete logs older than specified days
        
        Args:
            db: Database connection
            days: Days to keep
            
        Returns:
            Number of deleted logs
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        count = 0
        
        try:
            if db:
                result = await db.table("audit_logs").delete().lt("created_at", cutoff.isoformat()).execute()
                count = len(result.data) if result.data else 0
        except Exception as e:
            print(f"Audit log cleanup error: {e}")
        
        # Clean in-memory logs too
        old_count = len(cls._logs)
        cls._logs = [l for l in cls._logs if l.get("created_at", "") >= cutoff.isoformat()]
        count += old_count - len(cls._logs)
        
        return count


# Decorator for easy audit logging
def audit_log(action: AuditAction, resource_type: ResourceType):
    """
    Decorator to automatically log function calls
    
    Usage:
        @audit_log(AuditAction.CREATE, ResourceType.MODEL)
        async def create_model(...):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract common params if available
            db = kwargs.get("db")
            current_user = kwargs.get("current_user")
            request = kwargs.get("request")
            
            user_id = getattr(current_user, "id", None) if current_user else None
            user_email = getattr(current_user, "email", None) if current_user else None
            ip_address = getattr(request, "client", {}).host if request else None
            
            try:
                result = await func(*args, **kwargs)
                
                # Log successful action
                await AuditLogService.log(
                    db=db,
                    user_id=user_id or "system",
                    user_email=user_email,
                    action=action,
                    resource_type=resource_type,
                    ip_address=ip_address,
                    success=True
                )
                
                return result
            except Exception as e:
                # Log failed action
                await AuditLogService.log(
                    db=db,
                    user_id=user_id or "system",
                    user_email=user_email,
                    action=action,
                    resource_type=resource_type,
                    ip_address=ip_address,
                    details=str(e),
                    success=False
                )
                raise
        
        return wrapper
    return decorator
