"""
User profile and API key management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from datetime import datetime
import uuid
import secrets
import hashlib

from schemas.user import (
    UserProfileResponse,
    UserProfileUpdate,
    PasswordChange,
    APIKeyCreate,
    APIKeyResponse,
    APIKeyCreatedResponse,
    TransactionListResponse,
    Transaction,
    UserStats
)
from core.security import get_current_user
from core.database import get_db
from core.logger import app_logger as logger
from core.rate_limiter import limiter, RateLimits
from services.auth_service import AuthService


router = APIRouter(prefix="/user", tags=["User Profile"])


# ============================================
# Credits Balance Endpoint (for Dashboard)
# ============================================

@router.get("/credits/balance")
async def get_credits_balance(
    request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get current user's credit balance
    """
    try:
        credit_response = db.table("user_credits").select("credits_balance").eq("user_id", current_user.id).execute()
        balance = float(credit_response.data[0]["credits_balance"]) if credit_response.data else 0.0
        return {"balance": balance, "user_id": current_user.id}
    except Exception as e:
        logger.error(f"Error fetching credit balance: {str(e)}")
        return {"balance": 0, "user_id": current_user.id}


# ============================================
# User Profile Endpoints
# ============================================

@router.get("/me", response_model=UserProfileResponse)
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_current_user_profile(
    request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get current user's profile information
    """
    try:
        # Get user profile from Supabase public.users
        response = db.table("users").select("*").eq("id", current_user.id).execute()
        
        if not response.data:
            # Fallback to current_user data if not found in public table (shouldn't happen with triggers)
            return UserProfileResponse(
                user_id=current_user.id,
                email=current_user.email,
                full_name=current_user.full_name,
                role=current_user.role,
                package="free",
                created_at=current_user.created_at
            )
            
        profile = response.data[0]
        
        # Map fields to response model
        return UserProfileResponse(
            user_id=profile["id"],
            email=profile["email"],
            full_name=profile.get("full_name"),
            avatar_url=profile.get("avatar_url"),
            bio=profile.get("bio"),
            website=profile.get("website"),
            social_links=profile.get("social_links", {}),
            preferences=profile.get("preferences", {}),
            role=profile.get("role", "user"),
            package=profile.get("package", "free"),
            created_at=profile["created_at"],
            last_login=profile.get("updated_at") # Using updated_at as proxy for now
        )
    
    except Exception as e:
        logger.error(f"Error fetching user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user profile"
        )


@router.put("/profile", response_model=UserProfileResponse)
@limiter.limit(RateLimits.PROFILE_UPDATE)
async def update_user_profile(
    request: Request,
    profile_update: UserProfileUpdate,
    current_user = Depends(get_current_user)
):
    """
    Update user profile information
    """
    try:
        # Prepare update data (only include non-None fields)
        update_data = {
            k: v for k, v in profile_update.model_dump().items() 
            if v is not None
        }
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # Update profile using AuthService
        updated_profile = await AuthService.update_user_profile(current_user.id, update_data)
        
        logger.info(f"User {current_user.id} updated profile")
        
        return UserProfileResponse(
            user_id=updated_profile["id"],
            email=updated_profile["email"],
            full_name=updated_profile.get("full_name"),
            avatar_url=updated_profile.get("avatar_url"),
            bio=updated_profile.get("bio"),
            website=updated_profile.get("website"),
            social_links=updated_profile.get("social_links", {}),
            preferences=updated_profile.get("preferences", {}),
            role=updated_profile.get("role", "user"),
            package=updated_profile.get("package", "free"),
            created_at=updated_profile["created_at"],
            last_login=updated_profile.get("updated_at")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


@router.put("/password")
@limiter.limit(RateLimits.PROFILE_UPDATE)
async def change_password(
    request: Request,
    password_change: PasswordChange,
    current_user = Depends(get_current_user)
):
    """
    Change user password
    """
    try:
        # Note: We can't verify the old password easily with Supabase Admin API without signing in
        # For security, we should ideally sign in with the old password first
        try:
            await AuthService.login_user(current_user.email, password_change.current_password)
        except Exception:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Change password
        await AuthService.change_password(current_user.id, password_change.new_password)
        
        logger.info(f"User {current_user.id} changed password")
        return {"message": "Password changed successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )


# ============================================
# API Key Management Endpoints
# ============================================

def generate_api_key() -> tuple[str, str]:
    """
    Generate a secure API key
    Returns: (full_key, hashed_key)
    """
    # Generate random key
    key = f"sk_live_{secrets.token_urlsafe(32)}"
    
    # Hash the key for storage
    hashed = hashlib.sha256(key.encode()).hexdigest()
    
    return key, hashed


@router.post("/api-key", response_model=APIKeyCreatedResponse)
@limiter.limit(RateLimits.PROFILE_UPDATE)
async def create_api_key(
    request: Request,
    key_data: APIKeyCreate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Create a new API key for the user
    """
    try:
        # Generate API key
        full_key, hashed_key = generate_api_key()
        key_prefix = full_key[:12]  # sk_live_xxx
        
        # Create API key record in Supabase
        api_key_record = {
            "user_id": current_user.id,
            "name": key_data.name,
            "description": key_data.description,
            "key_hash": hashed_key,
            "key_prefix": key_prefix,
            "is_active": True
        }
        
        response = db.table("user_api_keys").insert(api_key_record).execute()
        
        if not response.data:
             raise Exception("Failed to insert API key")
             
        created_record = response.data[0]
        
        logger.info(f"User {current_user.id} created API key: {key_data.name}")
        
        return APIKeyCreatedResponse(
            id=created_record["id"],
            name=key_data.name,
            api_key=full_key,
            key_prefix=key_prefix,
            created_at=created_record["created_at"]
        )
    
    except Exception as e:
        logger.error(f"Error creating API key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key"
        )


@router.get("/api-keys", response_model=list[APIKeyResponse])
@limiter.limit(RateLimits.PUBLIC_READ)
async def list_api_keys(
    request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    List all API keys for the current user
    """
    try:
        response = db.table("user_api_keys").select("*").eq("user_id", current_user.id).execute()
        
        return [
            APIKeyResponse(
                id=key["id"],
                user_id=key["user_id"],
                name=key["name"],
                description=key.get("description"),
                key_prefix=key["key_prefix"],
                created_at=key["created_at"],
                last_used_at=key.get("last_used_at"),
                is_active=key.get("is_active", True)
            )
            for key in response.data
        ]
    
    except Exception as e:
        logger.error(f"Error listing API keys: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list API keys"
        )


@router.delete("/api-key/{key_id}")
@limiter.limit(RateLimits.PROFILE_UPDATE)
async def delete_api_key(
    request: Request,
    key_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Delete an API key
    """
    try:
        response = db.table("user_api_keys").delete().eq("id", key_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        logger.info(f"User {current_user.id} deleted API key {key_id}")
        return {"message": "API key deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting API key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete API key"
        )


# ============================================
# Transaction History Endpoints
# ============================================

@router.get("/transactions", response_model=TransactionListResponse)
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_user_transactions(
    request: Request,
    page: int = 1,
    page_size: int = 50,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get user's transaction history with pagination
    """
    try:
        # Calculate range
        start = (page - 1) * page_size
        end = start + page_size - 1
        
        # Get total count
        count_response = db.table("usage_logs").select("*", count="exact").eq("user_id", current_user.id).execute()
        total = count_response.count
        
        # Get transactions
        response = db.table("usage_logs")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("created_at", desc=True)\
            .range(start, end)\
            .execute()
            
        logs = response.data
        
        # Get current balance
        credit_response = db.table("user_credits").select("credits_balance").eq("user_id", current_user.id).execute()
        current_balance = float(credit_response.data[0]["credits_balance"]) if credit_response.data else 0.0
        
        # Convert logs to transactions
        transactions = []
        for log in logs:
            transactions.append(Transaction(
                id=log["id"],
                user_id=log["user_id"],
                type=log["activity"], # Using activity column from usage_logs
                amount=-float(log["cost"]),  # Negative for usage
                balance_after=current_balance,  # Simplified
                description=f"{log['activity']} - {log.get('details', {}).get('model', 'Unknown')}",
                metadata=log.get("details"),
                created_at=log["created_at"]
            ))
        
        return TransactionListResponse(
            transactions=transactions,
            total=total,
            page=page,
            page_size=page_size,
            has_more=start + len(transactions) < total
        )
    
    except Exception as e:
        logger.error(f"Error fetching transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch transactions"
        )


@router.get("/stats", response_model=UserStats)
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_user_stats(
    request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get user statistics
    """
    try:
        # Get credit balance
        credit_response = db.table("user_credits").select("credits_balance").eq("user_id", current_user.id).execute()
        current_balance = float(credit_response.data[0]["credits_balance"]) if credit_response.data else 0.0
        
        # Get usage logs
        response = db.table("usage_logs").select("*").eq("user_id", current_user.id).limit(1000).execute()
        logs = response.data
        
        # Calculate stats
        total_spent = sum(float(log.get("cost", 0)) for log in logs)
        
        generations_by_type = {}
        for log in logs:
            service_type = log.get("activity", "unknown")
            generations_by_type[service_type] = generations_by_type.get(service_type, 0) + 1
        
        last_activity = logs[0]["created_at"] if logs else None
        
        return UserStats(
            total_credits_purchased=0,  # TODO: Calculate from billing records
            total_credits_spent=total_spent,
            current_balance=current_balance,
            total_generations=len(logs),
            generations_by_type=generations_by_type,
            last_activity=last_activity
        )
    
    except Exception as e:
        logger.error(f"Error fetching user stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user stats"
        )

