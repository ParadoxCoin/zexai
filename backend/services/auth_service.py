"""
Authentication Service
Handles user registration, login, and token management using Supabase
"""
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import logging
import asyncio

from core.database import get_db
from core.logger import app_logger as logger
from core.email_service import get_email_service

class AuthService:
    """Supabase authentication service"""
    
    @staticmethod
    async def register_user(email: str, password: str, full_name: str = "") -> Dict[str, Any]:
        """Register a new user using Supabase Auth"""
        db = await get_db()
        
        try:
            # Sign up with Supabase
            response = db.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "full_name": full_name,
                        "role": "user",
                        "package": "free"
                    }
                }
            })
            
            if not response.user:
                raise Exception("Registration failed")
                
            user = response.user
            
            # Send welcome email (async, don't block registration)
            try:
                email_service = get_email_service()
                asyncio.create_task(
                    email_service.send_welcome_email(
                        user_email=email,
                        user_name=full_name or email.split('@')[0],
                        credits=100  # Default starting credits
                    )
                )
                logger.info(f"Welcome email queued for {email}")
            except Exception as email_error:
                logger.warning(f"Failed to send welcome email: {email_error}")
            
            # Return auth response structure
            return {
                "user_id": user.id,
                "email": user.email,
                "full_name": user.user_metadata.get("full_name", ""),
                "role": user.user_metadata.get("role", "user"),
                "package": user.user_metadata.get("package", "free"),
                "access_token": response.session.access_token if response.session else None,
                "token_type": "bearer"
            }
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    @staticmethod
    async def login_user(email: str, password: str) -> Dict[str, Any]:
        """Login user using Supabase Auth"""
        db = await get_db()
        
        try:
            response = db.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if not response.user or not response.session:
                raise Exception("Login failed")
                
            user = response.user
            
            return {
                "user_id": user.id,
                "email": user.email,
                "full_name": user.user_metadata.get("full_name", ""),
                "role": user.user_metadata.get("role", "user"),
                "package": user.user_metadata.get("package", "free"),
                "access_token": response.session.access_token,
                "token_type": "bearer"
            }
            
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID from Supabase"""
        db = await get_db()
        try:
            # Try to get from public.users table first (if it exists and is synced)
            response = db.table("users").select("*").eq("id", user_id).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception:
            return None
    
    @staticmethod
    async def change_password(user_id: str, new_password: str) -> bool:
        """Change user password using Supabase Admin"""
        db = await get_db()
        try:
            # Use admin API to update user password
            response = db.auth.admin.update_user_by_id(
                user_id,
                {"password": new_password}
            )
            return bool(response.user)
        except Exception as e:
            logger.error(f"Password change error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to change password"
            )

    @staticmethod
    async def update_user_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile in public.users table"""
        db = await get_db()
        try:
            # Update public.users table
            response = db.table("users").update(data).eq("id", user_id).execute()
            
            # If full_name is updated, also update auth metadata
            if "full_name" in data:
                db.auth.admin.update_user_by_id(
                    user_id,
                    {"user_metadata": {"full_name": data["full_name"]}}
                )
                
            if response.data:
                return response.data[0]
            raise Exception("Profile update returned no data")
            
        except Exception as e:
            logger.error(f"Profile update error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
