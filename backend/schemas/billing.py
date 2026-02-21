"""
Billing and subscription schemas with multi-payment support
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PaymentMethod(str, Enum):
    """Available payment methods"""
    LEMONSQUEEZY = "lemonsqueezy"
    TWOCHECKOUT = "2checkout"
    NOWPAYMENTS = "nowpayments"
    BINANCE = "binance"
    METAMASK = "metamask"


class SubscriptionPlan(BaseModel):
    """Schema for subscription plan details"""
    id: str
    name: str
    monthly_price: float
    monthly_credits: int
    description: Optional[str] = None
    features: Optional[list] = None


class PricingPackage(BaseModel):
    """Schema for one-time credit package"""
    id: str
    name: str
    usd_price: float
    credit_amount: int
    discount_percent: float = 0


class PaymentOption(BaseModel):
    """Schema for payment method option"""
    method: PaymentMethod
    name: str
    description: str
    logo_url: Optional[str] = None
    discount_percent: float = 0  # Extra discount for this payment method
    final_price: float  # Price after discount


class PriceBreakdown(BaseModel):
    """Schema for price breakdown with discounts"""
    original_price: float
    payment_method_discount: float = 0  # e.g., 15% for MetaMask
    package_discount: float = 0  # e.g., 10% for Starter package
    final_price: float
    currency: str = "USD"


class SubscriptionStatus(BaseModel):
    """Schema for user subscription status"""
    has_subscription: bool
    plan_name: Optional[str] = None
    status: Optional[str] = None  # active, canceled, past_due, trialing
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: Optional[bool] = None
    monthly_credits: Optional[int] = None
    next_billing_date: Optional[datetime] = None


class CreateCheckoutRequest(BaseModel):
    """Schema for creating a checkout session"""
    item_type: str = Field(..., description="Type: 'subscription' or 'top_up'")
    item_id: str = Field(..., description="Plan ID or Package ID")
    payment_method: PaymentMethod = Field(..., description="Selected payment method")


class CheckoutResponse(BaseModel):
    """Schema for checkout session response"""
    success: bool
    payment_method: PaymentMethod
    checkout_url: Optional[str] = None  # For redirect-based payments
    payment_data: Optional[dict] = None  # For MetaMask/Web3 payments
    price_breakdown: PriceBreakdown
    session_id: Optional[str] = None


class WebhookPaymentData(BaseModel):
    """Schema for payment webhook data"""
    payment_id: str
    user_id: str
    item_type: str  # subscription or top_up
    item_id: str
    payment_method: str
    amount_paid: float
    currency: str
    status: str  # completed, pending, failed

