"""
User profile and API key management schemas
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============================================
# User Profile Schemas
# ============================================

class UserProfileResponse(BaseModel):
    """User profile information"""
    user_id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    preferences: Optional[Dict[str, Any]] = None
    role: str
    package: str
    created_at: datetime
    last_login: Optional[datetime] = None


class UserProfileUpdate(BaseModel):
    """Update user profile"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    bio: Optional[str] = Field(None, max_length=500)
    website: Optional[str] = Field(None, max_length=200)
    social_links: Optional[Dict[str, str]] = None
    preferences: Optional[Dict[str, Any]] = None


class PasswordChange(BaseModel):
    """Change user password"""
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)


# ============================================
# API Key Schemas
# ============================================

class APIKeyCreate(BaseModel):
    """Create a new API key"""
    name: str = Field(..., min_length=1, max_length=100, description="Friendly name for the API key")
    description: Optional[str] = Field(None, max_length=500)


class APIKeyResponse(BaseModel):
    """API key information"""
    id: str
    user_id: str
    name: str
    description: Optional[str]
    key_prefix: str  # First 8 characters for identification
    created_at: datetime
    last_used_at: Optional[datetime] = None
    is_active: bool


class APIKeyCreatedResponse(BaseModel):
    """Response when API key is created (includes full key)"""
    id: str
    name: str
    api_key: str  # Full key - only shown once!
    key_prefix: str
    created_at: datetime
    message: str = "Store this API key securely. It will not be shown again."


# ============================================
# Transaction History Schemas
# ============================================

class TransactionType:
    """Transaction types"""
    CREDIT_PURCHASE = "credit_purchase"
    IMAGE_GENERATION = "image_generation"
    VIDEO_GENERATION = "video_generation"
    AUDIO_GENERATION = "audio_generation"
    CHAT = "chat"
    SYNAPSE = "synapse"
    ADMIN_ADJUSTMENT = "admin_adjustment"
    REFUND = "refund"


class Transaction(BaseModel):
    """User transaction record"""
    id: str
    user_id: str
    type: str
    amount: float  # Credits (positive for purchase, negative for usage)
    balance_after: float  # Balance after this transaction
    description: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime


class TransactionListResponse(BaseModel):
    """List of transactions with pagination"""
    transactions: List[Transaction]
    total: int
    page: int
    page_size: int
    has_more: bool


# ============================================
# User Stats Schemas
# ============================================

class UserStats(BaseModel):
    """User statistics"""
    total_credits_purchased: float
    total_credits_spent: float
    current_balance: float
    total_generations: int
    generations_by_type: Dict[str, int]
    last_activity: Optional[datetime]

