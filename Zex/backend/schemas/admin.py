"""
Admin panel schemas
"""
from pydantic import BaseModel, Field
from typing import Optional


class ServiceCostUpdate(BaseModel):
    """Schema for updating service costs"""
    service_type: str
    unit: str
    cost_per_unit: float = Field(..., gt=0)


class PricingPackageCreate(BaseModel):
    """Schema for creating a pricing package"""
    name: str
    usd_price: float = Field(..., gt=0)
    credit_amount: float = Field(..., gt=0)
    discount_percent: Optional[float] = Field(default=0, ge=0, le=100)
    active: bool = True


class UsageStats(BaseModel):
    """Schema for user usage statistics"""
    credits_balance: float
    total_spent: float
    chat_requests: int
    images_generated: int
    videos_generated: int
    synapse_tasks: int

