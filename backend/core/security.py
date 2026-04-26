from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from types import SimpleNamespace
from core.config import settings
from core.logger import app_logger as logger

security = HTTPBearer()

async def get_current_user(
    request: Request,
    token: HTTPAuthorizationCredentials = Depends(security)
) -> SimpleNamespace:
    """
    LOCAL DEV MODE: Always returns luxor00 as admin to bypass Supabase rate limits.
    """
    # For local development, we skip token verification and return a mock admin
    return SimpleNamespace(
        id="mock-admin-id",
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
