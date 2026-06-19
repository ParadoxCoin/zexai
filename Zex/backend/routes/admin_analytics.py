"""
Admin Analytics Routes
API endpoints for analytics dashboard
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from types import SimpleNamespace
import logging

from core.security import get_current_admin_user
from core.analytics import get_analytics_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/analytics", tags=["Admin - Analytics"])


# ============================================
# Response Models
# ============================================

class OverviewResponse(BaseModel):
    """Dashboard overview response"""
    total_users: int
    active_users: int
    today_revenue: float
    today_generations: int
    growth_rate: float


class RevenueResponse(BaseModel):
    """Revenue statistics response"""
    chart_data: List[Dict[str, Any]]
    total: float
    subscription_total: float
    credit_total: float
    period: str


class UsageResponse(BaseModel):
    """Usage statistics response"""
    service_breakdown: List[Dict[str, Any]]
    trend_data: List[Dict[str, Any]]
    total: int
    period: str


class ProviderResponse(BaseModel):
    """Provider statistics response"""
    providers: List[Dict[str, Any]]
    pie_data: List[Dict[str, Any]]
    total_requests: int


class UserGrowthResponse(BaseModel):
    """User growth response"""
    chart_data: List[Dict[str, Any]]
    new_users: int
    period: str


# ============================================
# Endpoints
# ============================================

@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get dashboard overview statistics"""
    service = get_analytics_service()
    data = await service.get_overview()
    return OverviewResponse(**data)


@router.get("/revenue", response_model=RevenueResponse)
async def get_revenue(
    period: str = Query("week", pattern="^(day|week|month)$"),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """
    Get revenue statistics
    
    - period: day, week, or month
    """
    service = get_analytics_service()
    data = await service.get_revenue_stats(period=period)
    return RevenueResponse(**data)


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    period: str = Query("week", pattern="^(day|week|month)$"),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """
    Get usage statistics by service type
    
    - period: day, week, or month
    """
    service = get_analytics_service()
    data = await service.get_usage_stats(period=period)
    return UsageResponse(**data)


@router.get("/providers", response_model=ProviderResponse)
async def get_providers(
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Get provider performance statistics"""
    service = get_analytics_service()
    data = await service.get_provider_stats()
    return ProviderResponse(**data)


@router.get("/user-growth", response_model=UserGrowthResponse)
async def get_user_growth(
    period: str = Query("month", pattern="^(week|month)$"),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """
    Get user growth statistics
    
    - period: week or month
    """
    service = get_analytics_service()
    data = await service.get_user_growth(period=period)
    return UserGrowthResponse(**data)


@router.get("/all")
async def get_all_analytics(
    period: str = Query("week", pattern="^(day|week|month)$"),
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """
    Get all analytics data in one call
    
    Useful for initial dashboard load.
    """
    service = get_analytics_service()
    
    overview = await service.get_overview()
    revenue = await service.get_revenue_stats(period=period)
    usage = await service.get_usage_stats(period=period)
    providers = await service.get_provider_stats()
    growth = await service.get_user_growth(period="month")
    
    return {
        "overview": overview,
        "revenue": revenue,
        "usage": usage,
        "providers": providers,
        "user_growth": growth
    }
