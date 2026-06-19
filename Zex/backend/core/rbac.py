"""
Role-Based Access Control (RBAC) Utilities
Handles permission checking, role management, and access control
"""
from enum import Enum
from typing import List, Optional, Set
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from types import SimpleNamespace
import logging

logger = logging.getLogger(__name__)


class Permission(str, Enum):
    """All available permissions in the system"""
    # Super Admin
    ALL = "*"
    
    # AI Features (Customer)
    AI_VIDEO = "ai:video"
    AI_IMAGE = "ai:image"
    AI_AUDIO = "ai:audio"
    AI_CHAT = "ai:chat"
    AI_SYNAPSE = "ai:synapse"
    AI_PRIORITY = "ai:priority"
    
    # Profile (Customer)
    PROFILE_READ = "profile:read"
    PROFILE_UPDATE = "profile:update"
    CREDITS_VIEW = "credits:view"
    CREDITS_PURCHASE = "credits:purchase"
    
    # Admin: User Management
    USERS_READ = "users:read"
    USERS_UPDATE = "users:update"
    USERS_DELETE = "users:delete"
    USERS_CREDITS = "users:credits"
    USERS_ROLES = "users:roles"
    
    # Admin: Provider Management
    PROVIDERS_READ = "providers:read"
    PROVIDERS_MANAGE = "providers:manage"
    FAILOVER_MANAGE = "failover:manage"
    
    # Admin: Model Management
    MODELS_READ = "models:read"
    MODELS_MANAGE = "models:manage"
    
    # Admin: System
    AUDIT_READ = "audit:read"
    SETTINGS_MANAGE = "settings:manage"
    ROLES_MANAGE = "roles:manage"


class RoleType(str, Enum):
    """Types of roles"""
    STAFF = "staff"      # Admin, Moderator, etc.
    CUSTOMER = "customer"  # Regular customers


# Default permissions for each role (fallback if DB unavailable)
DEFAULT_ROLE_PERMISSIONS = {
    "super_admin": [Permission.ALL],
    "admin": [
        Permission.USERS_READ, Permission.USERS_UPDATE, Permission.USERS_CREDITS,
        Permission.PROVIDERS_READ, Permission.PROVIDERS_MANAGE, Permission.FAILOVER_MANAGE,
        Permission.MODELS_READ, Permission.MODELS_MANAGE, Permission.AUDIT_READ,
        Permission.SETTINGS_MANAGE, Permission.AI_VIDEO, Permission.AI_IMAGE,
        Permission.AI_AUDIO, Permission.AI_CHAT, Permission.AI_SYNAPSE,
        Permission.PROFILE_READ, Permission.PROFILE_UPDATE
    ],
    "moderator": [
        Permission.USERS_READ, Permission.USERS_UPDATE, Permission.AUDIT_READ,
        Permission.AI_VIDEO, Permission.AI_IMAGE, Permission.AI_AUDIO,
        Permission.AI_CHAT, Permission.AI_SYNAPSE, Permission.PROFILE_READ,
        Permission.PROFILE_UPDATE
    ],
    "customer": [
        Permission.AI_VIDEO, Permission.AI_IMAGE, Permission.AI_AUDIO,
        Permission.AI_CHAT, Permission.AI_SYNAPSE, Permission.PROFILE_READ,
        Permission.PROFILE_UPDATE, Permission.CREDITS_VIEW, Permission.CREDITS_PURCHASE
    ],
    "premium_customer": [
        Permission.AI_VIDEO, Permission.AI_IMAGE, Permission.AI_AUDIO,
        Permission.AI_CHAT, Permission.AI_SYNAPSE, Permission.AI_PRIORITY,
        Permission.PROFILE_READ, Permission.PROFILE_UPDATE, Permission.CREDITS_VIEW,
        Permission.CREDITS_PURCHASE
    ],
    "trial_customer": [
        Permission.AI_VIDEO, Permission.AI_IMAGE, Permission.AI_CHAT,
        Permission.PROFILE_READ, Permission.PROFILE_UPDATE, Permission.CREDITS_VIEW
    ]
}


def get_role_permissions(role: str, db=None) -> Set[str]:
    """
    Get permissions for a role.
    Tries database first, falls back to defaults.
    """
    # Try to fetch from database
    if db:
        try:
            response = db.table("roles").select("permissions").eq("id", role).execute()
            if response.data and response.data[0].get("permissions"):
                return set(response.data[0]["permissions"])
        except Exception as e:
            logger.warning(f"Failed to fetch role permissions from DB: {e}")
    
    # Fallback to defaults
    if role in DEFAULT_ROLE_PERMISSIONS:
        return set(p.value if isinstance(p, Permission) else p for p in DEFAULT_ROLE_PERMISSIONS[role])
    
    # Unknown role gets basic customer permissions
    return set(p.value for p in DEFAULT_ROLE_PERMISSIONS.get("customer", []))


def has_permission(user: SimpleNamespace, permission: str, db=None) -> bool:
    """
    Check if a user has a specific permission.
    
    Args:
        user: User object with role attribute
        permission: Permission string to check
        db: Optional database connection for dynamic role lookup
        
    Returns:
        bool: True if user has permission
    """
    if not user:
        return False
    
    # Get user's role
    user_role = getattr(user, "role", "customer")
    
    # Get permissions for this role
    permissions = get_role_permissions(user_role, db)
    
    # Super admin has all permissions
    if Permission.ALL.value in permissions or "*" in permissions:
        return True
    
    # Check specific permission
    return permission in permissions


def has_any_permission(user: SimpleNamespace, permissions: List[str], db=None) -> bool:
    """Check if user has any of the given permissions"""
    return any(has_permission(user, p, db) for p in permissions)


def has_all_permissions(user: SimpleNamespace, permissions: List[str], db=None) -> bool:
    """Check if user has all of the given permissions"""
    return all(has_permission(user, p, db) for p in permissions)


def is_staff_role(role: str) -> bool:
    """Check if a role is a staff role (admin, moderator, etc.)"""
    staff_roles = {"super_admin", "admin", "moderator"}
    return role in staff_roles


def is_customer_role(role: str) -> bool:
    """Check if a role is a customer role"""
    customer_roles = {"customer", "premium_customer", "trial_customer"}
    return role in customer_roles


def require_permission(permission: str):
    """
    FastAPI dependency factory that requires a specific permission.
    
    Usage:
        @router.get("/admin/users")
        async def list_users(
            current_user = Depends(require_permission(Permission.USERS_READ.value))
        ):
            ...
    """
    from core.security import get_current_user
    from core.supabase_client import get_db
    
    async def permission_checker(
        current_user: SimpleNamespace = Depends(get_current_user),
        db = Depends(get_db)
    ) -> SimpleNamespace:
        if not has_permission(current_user, permission, db):
            logger.warning(
                f"Permission denied: User {current_user.email} lacks '{permission}' "
                f"(role: {getattr(current_user, 'role', 'unknown')})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires '{permission}'"
            )
        return current_user
    
    return permission_checker


def require_any_permission(*permissions: str):
    """
    FastAPI dependency factory that requires any of the given permissions.
    """
    from core.security import get_current_user
    from core.supabase_client import get_db
    
    async def permission_checker(
        current_user: SimpleNamespace = Depends(get_current_user),
        db = Depends(get_db)
    ) -> SimpleNamespace:
        if not has_any_permission(current_user, list(permissions), db):
            logger.warning(
                f"Permission denied: User {current_user.email} lacks any of {permissions}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires one of {permissions}"
            )
        return current_user
    
    return permission_checker


def require_staff():
    """
    FastAPI dependency that requires user to be staff (admin, moderator, etc.)
    """
    from core.security import get_current_user
    
    async def staff_checker(
        current_user: SimpleNamespace = Depends(get_current_user)
    ) -> SimpleNamespace:
        user_role = getattr(current_user, "role", "customer")
        if not is_staff_role(user_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff access required"
            )
        return current_user
    
    return staff_checker


# Helper to get user's permission list (for frontend)
def get_user_permissions(user: SimpleNamespace, db=None) -> List[str]:
    """Get list of all permissions for a user"""
    user_role = getattr(user, "role", "customer")
    permissions = get_role_permissions(user_role, db)
    
    # Expand wildcard
    if "*" in permissions:
        return [p.value for p in Permission if p != Permission.ALL]
    
    return list(permissions)
