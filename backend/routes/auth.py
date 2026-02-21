"""
Authentication routes
Handles user registration, login, and token management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from datetime import datetime
import uuid

from schemas.auth import UserCreate, UserLogin, AuthResponse, UserResponse
# Removed legacy imports: hash_password, verify_password, create_access_token
from core.database import get_db
from core.config import settings
from services.auth_service import AuthService
# Commented out OAuth service for now as it might need refactoring too
# from services.oauth_service import (
#     oauth,
#     get_google_user_info,
#     get_github_user_info,
#     get_discord_user_info,
#     create_or_update_oauth_user
# )


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse)
async def register_user(user_data: UserCreate):
    """
    Register a new user using Supabase Auth
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
async def login_user(credentials: UserLogin):
    """
    Login user using Supabase Auth
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

