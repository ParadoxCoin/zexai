from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class AdminUserListItem(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    package: str
    is_active: bool
    credits_balance: float
    created_at: datetime
    last_login: Optional[datetime] = None

class AdminUserListResponse(BaseModel):
    users: List[AdminUserListItem]
    total: int
    page: int
    page_size: int
    has_more: bool

class AdminUserDetail(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    package: str
    is_active: bool
    credits_balance: float
    total_spent: float
    total_generations: int
    created_at: datetime
    last_login: Optional[datetime] = None
    oauth_providers: List[str] = []

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    package: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None

class AdminCreditAdjustment(BaseModel):
    amount: float
    reason: str

class PlatformStats(BaseModel):
    total_users: int
    active_users_today: int
    active_users_week: int
    active_users_month: int
    total_credits_distributed: float
    total_credits_spent: float
    total_revenue: float
    total_generations: int
    generations_by_type: Dict[str, int]

class RecentUser(BaseModel):
    id: str
    email: str
    full_name: str
    package: str
    created_at: datetime

class TopModel(BaseModel):
    model_name: str
    service_type: str
    usage_count: int
    total_credits: float

    model_config = ConfigDict(protected_namespaces=())

class AnalyticsResponse(BaseModel):
    data: Dict[str, Any]

class ModelPricing(BaseModel):
    model_id: str
    service_type: str
    credits: int

    model_config = ConfigDict(protected_namespaces=())

class ModelPricingUpdate(BaseModel):
    model_id: str
    service_type: str
    credits: int

class ModelPricingListResponse(BaseModel):
    pricing: List[ModelPricing]
