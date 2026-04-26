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
    mock_id = "00000000-0000-0000-0000-000000000000"
    
    # Auto-create mock user in DB if it doesn't exist (prevents foreign key errors)
    if settings.DEBUG:
        try:
            supabase = get_supabase_client()
            check = supabase.table("users").select("id").eq("id", mock_id).execute()
            if not check.data:
                supabase.table("users").insert({
                    "id": mock_id,
                    "email": "luxor00@gmail.com",
                    "full_name": "Luxor Admin (Local)",
                    "role": "super_admin",
                    "is_active": True
                }).execute()
                logger.info(f"✅ Created mock user {mock_id} in database")
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
