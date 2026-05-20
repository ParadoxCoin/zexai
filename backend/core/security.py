from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from types import SimpleNamespace
from core.config import settings
from core.logger import app_logger as logger
from core.supabase_client import get_supabase_client

security = HTTPBearer()

async def get_current_user(
    request: Request,
    token: HTTPAuthorizationCredentials = Depends(security)
) -> SimpleNamespace:
    """
    Get the current authenticated user using Supabase JWT.
    """
    raw_token = token.credentials
    supabase = get_supabase_client()
    if not supabase:
        logger.error("Supabase client is not initialized or configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable"
        )
    
    try:
        # Verify and fetch user from Supabase auth using raw JWT
        auth_response = supabase.auth.get_user(raw_token)
        if not auth_response or not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        auth_user = auth_response.user
        user_id = auth_user.id
        email = auth_user.email
        
        # Default properties from auth metadata
        user_metadata = getattr(auth_user, "user_metadata", {}) or {}
        role = user_metadata.get("role", "user")
        full_name = user_metadata.get("full_name", "")
        is_active = True
        
        # Try to fetch additional profile details from public.users table
        try:
            profile_response = supabase.table("users").select("*").eq("id", user_id).execute()
            if profile_response.data:
                profile = profile_response.data[0]
                role = profile.get("role", role)
                full_name = profile.get("full_name", full_name)
                is_active = profile.get("is_active", True)
        except Exception as profile_err:
            logger.warning(f"Could not fetch user profile for {user_id} from public.users: {profile_err}")

        if is_active is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended or inactive"
            )
            
        return SimpleNamespace(
            id=user_id,
            email=email,
            role=role,
            full_name=full_name,
            is_active=is_active
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

async def get_current_admin_user(
    current_user: SimpleNamespace = Depends(get_current_user)
) -> SimpleNamespace:
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def get_current_super_admin(
    current_user: SimpleNamespace = Depends(get_current_user)
) -> SimpleNamespace:
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required"
        )
    return current_user
