"""
Security utilities: Supabase Auth integration with RBAC
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from types import SimpleNamespace
from core.config import settings
from core.supabase_client import get_supabase_client
import logging

logger = logging.getLogger(__name__)

# HTTP Bearer token security
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> SimpleNamespace:
    """
    FastAPI dependency to get current authenticated user using Supabase Auth.
    Fetches role from public.users table for RBAC.
    """
    token = credentials.credentials
    supabase = get_supabase_client()
    
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable"
        )
        
    try:
        # Verify token using Supabase Auth
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
            
        auth_user = user_response.user
        
        # Default user data from auth
        user_data = {
            "id": auth_user.id,
            "email": auth_user.email,
            "role": "customer",  # Default role
            "full_name": auth_user.user_metadata.get("full_name", ""),
            "created_at": auth_user.created_at,
            "is_active": True
        }
        
        # Fetch role and is_active from public.users table
        try:
            profile_resp = supabase.table("users").select(
                "role, is_active, full_name, package"
            ).eq("id", auth_user.id).execute()
            
            if profile_resp.data:
                profile = profile_resp.data[0]
                user_data["role"] = profile.get("role", "customer")
                user_data["is_active"] = profile.get("is_active", True)
                user_data["full_name"] = profile.get("full_name") or user_data["full_name"]
                user_data["package"] = profile.get("package", "free")
        except Exception as e:
            logger.warning(f"Could not fetch user profile, using defaults: {e}")
        
        # Check admin email list override
        if auth_user.email in settings.admin_emails_list:
            user_data["role"] = "super_admin"
        
        # Check if user is active
        if not user_data.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended"
            )
        
        return SimpleNamespace(**user_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


async def get_current_admin_user(
    current_user: SimpleNamespace = Depends(get_current_user)
) -> SimpleNamespace:
    """
    FastAPI dependency to ensure current user is staff (admin, moderator, super_admin).
    Uses RBAC role checking.
    """
    from core.rbac import is_staff_role
    
    user_role = getattr(current_user, "role", "customer")
    
    # Check if user has staff role
    if is_staff_role(user_role):
        return current_user
    
    # Check admin email list as fallback
    if current_user.email in settings.admin_emails_list:
        return current_user
    
    logger.warning(f"Admin access denied for {current_user.email} (role: {user_role})")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required"
    )


async def get_current_super_admin(
    current_user: SimpleNamespace = Depends(get_current_user)
) -> SimpleNamespace:
    """
    FastAPI dependency for super admin only operations (role management, etc.)
    """
    user_role = getattr(current_user, "role", "customer")
    
    if user_role == "super_admin" or current_user.email in settings.admin_emails_list:
        return current_user
    
    logger.warning(f"Super admin access denied for {current_user.email}")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Super admin access required"
    )

