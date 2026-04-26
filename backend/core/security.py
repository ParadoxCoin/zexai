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
    LOCAL DEV MODE: Always returns luxor00 as admin to bypass Supabase rate limits.
    """
    # For local development, we skip token verification and return a mock admin
    # For local development, we use the real admin user ID from production to satisfy FKs
    mock_id = "5c8cd695-942b-407d-b59f-71d29b06cdfd"
    
    # Auto-create mock user in auth.users AND public.users if it doesn't exist
    try:
        supabase = get_supabase_client()
        # Check in public.users first
        check = supabase.table("users").select("id").eq("id", mock_id).execute()
        
        if not check.data:
            logger.info(f"Mock user {mock_id} not found in public.users, attempting to create...")
            
            # 1. Try to create in auth.users using Admin API
            # This is necessary because of the foreign key constraint: REFERENCES auth.users(id)
            try:
                # We use a dummy email and password. 'upsert' isn't available for auth, 
                # so we just try to get or create.
                admin_auth = supabase.auth.admin.get_user_by_id(mock_id)
                if not admin_auth:
                    supabase.auth.admin.create_user({
                        "id": mock_id,
                        "email": "luxor00@gmail.com",
                        "password": "password123",
                        "email_confirm": True
                    })
                    logger.info(f"✅ Created mock user {mock_id} in auth.users")
            except Exception as auth_e:
                # If it already exists or fails, we continue to public.users
                logger.debug(f"Auth user check/create note: {auth_e}")

            # 2. Create in public.users
            supabase.table("users").insert({
                "id": mock_id,
                "email": "luxor00@gmail.com",
                "full_name": "Luxor Admin (Local)",
                "role": "super_admin",
                "is_active": True
            }).execute()
            logger.info(f"✅ Created mock user {mock_id} in public.users")
    except Exception as e:
        logger.warning(f"⚠️ Could not auto-create mock user: {e}")

    return SimpleNamespace(
        id=mock_id,
        email="luxor00@gmail.com",
        role="super_admin",
        full_name="Luxor Admin (Local)",
        is_active=True
    )

async def get_current_admin_user(
    current_user: SimpleNamespace = Depends(get_current_user)
) -> SimpleNamespace:
    # In local mode, everyone is admin!
    return current_user

async def get_current_super_admin(
    current_user: SimpleNamespace = Depends(get_current_user)
) -> SimpleNamespace:
    return current_user
