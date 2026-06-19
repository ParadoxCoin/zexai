"""
Authentication routes
Handles user registration, login, and token management.

Security:
  - Rate limited: 5/min register, 10/min login (credential stuffing koruması).
  - Supabase Auth backed — passwords are never stored in our DB.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from datetime import datetime
import uuid

from schemas.auth import UserCreate, UserLogin, AuthResponse, UserResponse
from core.database import get_db
from core.config import settings
from services.auth_service import AuthService
from core.rate_limiter import limiter, RateLimits


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse)
@limiter.limit(RateLimits.AUTH_REGISTER)
async def register_user(request: Request, user_data: UserCreate):
    """
    Register a new user using Supabase Auth.
    Rate limited to 5 requests/minute per IP to prevent abuse.
    """
    try:
        result = await AuthService.register_user(
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name
        )
        
        return AuthResponse(
            message="User registered successfully",
            token=result["access_token"],
            user=UserResponse(
                id=result["user_id"],
                email=result["email"],
                full_name=result["full_name"],
                role=result["role"],
                package=result["package"]
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse)
@limiter.limit(RateLimits.AUTH_LOGIN)
async def login_user(request: Request, credentials: UserLogin):
    """
    Login user using Supabase Auth.
    Rate limited to 10 requests/minute per IP to prevent credential stuffing.
    """
    try:
        result = await AuthService.login_user(
            email=credentials.email,
            password=credentials.password
        )
        
        return AuthResponse(
            message="Login successful",
            token=result["access_token"],
            user=UserResponse(
                id=result["user_id"],
                email=result["email"],
                full_name=result["full_name"],
                role=result["role"],
                package=result["package"]
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


# ============================================
# OAuth Routes (Temporarily Disabled)
# ============================================
# OAuth implementation needs to be updated for Supabase Auth (signInWithOAuth)
# For now, we disable these to prevent errors until refactored.

@router.get("/google")
async def google_login(request: Request):
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/google/callback")
async def google_callback(request: Request):
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/github")
async def github_login(request: Request):
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/github/callback")
async def github_callback(request: Request):
    raise HTTPException(status_code=501, detail="Not implemented yet")
