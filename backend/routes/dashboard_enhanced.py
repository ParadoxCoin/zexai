"""
Enhanced Dashboard with Supabase Real-time Integration
Missing dashboard endpoints for frontend compatibility
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from core.database import get_database
from core.security import get_current_user
from core.supabase_client import get_supabase_client, is_supabase_enabled
from core.logger import app_logger as logger
from core.rate_limiter import limiter, RateLimits

router = APIRouter(prefix="/dashboard", tags=["Dashboard Enhanced"])

# ============================================
# Missing Schemas
# ============================================

class QuickAction(BaseModel):
    """Quick action schema"""
    id: str
    title: str
    description: str
    icon: str
    action_type: str
    endpoint: str
    enabled: bool = True

class DashboardStats(BaseModel):
    """Dashboard statistics schema"""
    total_credits: float
    credits_used_today: float
    credits_used_this_month: float
    total_generations: int
    favorite_service: str
    recent_activity_count: int

class UsageChart(BaseModel):
    """Usage chart data schema"""
    labels: List[str]
    datasets: List[Dict[str, Any]]

# ============================================
# Missing Quick Actions Endpoint
# ============================================

@router.get("/quick-actions")
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_quick_actions(
    request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get quick actions for dashboard (Frontend compatibility)"""
    try:
        # Get user's credit balance for conditional actions
        credit_record = await db.user_credits.find_one({"user_id": current_user.id})
        credits_balance = credit_record.get("credits_balance", 0) if credit_record else 0
        
        # Get user's recent activity to suggest actions
        recent_usage = await db.usage_logs.find({
            "user_id": current_user.id,
            "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
        }).sort("created_at", -1).limit(10).to_list(length=10)
        
        # Determine most used service
        service_usage = {}
        for usage in recent_usage:
            service = usage.get("service_type", "unknown")
            service_usage[service] = service_usage.get(service, 0) + 1
        
        most_used_service = max(service_usage.keys(), default="chat") if service_usage else "chat"
        
        # Define quick actions based on user behavior and credits
        quick_actions = [
            {
                "id": "generate_image",
                "title": "Generate Image",
                "description": "Create AI-generated images",
                "icon": "image",
                "action_type": "navigate",
                "endpoint": "/image-generation",
                "enabled": credits_balance >= 5,
                "cost_credits": 5
            },
            {
                "id": "start_chat",
                "title": "Start Chat",
                "description": "Chat with AI assistant",
                "icon": "message-circle",
                "action_type": "navigate",
                "endpoint": "/chat",
                "enabled": credits_balance >= 1,
                "cost_credits": 1
            },
            {
                "id": "create_video",
                "title": "Create Video",
                "description": "Generate AI videos",
                "icon": "video",
                "action_type": "navigate",
                "endpoint": "/video-generation",
                "enabled": credits_balance >= 20,
                "cost_credits": 20
            },
            {
                "id": "generate_audio",
                "title": "Generate Audio",
                "description": "Create AI audio content",
                "icon": "headphones",
                "action_type": "navigate",
                "endpoint": "/audio-generation",
                "enabled": credits_balance >= 3,
                "cost_credits": 3
            },
            {
                "id": "buy_credits",
                "title": "Buy Credits",
                "description": "Purchase more credits",
                "icon": "credit-card",
                "action_type": "navigate",
                "endpoint": "/pricing",
                "enabled": True,
                "priority": credits_balance < 10
            },
            {
                "id": "view_history",
                "title": "View History",
                "description": "See your generation history",
                "icon": "history",
                "action_type": "navigate",
                "endpoint": "/history",
                "enabled": True
            }
        ]
        
        # Sort by priority and enabled status
        quick_actions.sort(key=lambda x: (not x.get("priority", False), not x["enabled"]))
        
        # Real-time sync with Supabase for personalized actions
        if is_supabase_enabled():
            try:
                supabase = get_supabase_client()
                if supabase:
                    # Store user preferences in Supabase for real-time updates
                    user_prefs = {
                        "user_id": current_user.id,
                        "most_used_service": most_used_service,
                        "credits_balance": credits_balance,
                        "last_activity": datetime.utcnow().isoformat(),
                        "quick_actions_generated": len(quick_actions)
                    }
                    
                    supabase.table("user_dashboard_prefs").upsert(user_prefs).execute()
                    
            except Exception as e:
                logger.warning(f"Failed to sync dashboard prefs to Supabase: {e}")
        
        return {
            "success": True,
            "quick_actions": quick_actions,
            "user_context": {
                "credits_balance": credits_balance,
                "most_used_service": most_used_service,
                "recent_activity_count": len(recent_usage)
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching quick actions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch quick actions"
        )

# ============================================
# Enhanced Dashboard Statistics
# ============================================

@router.get("/stats/enhanced")
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_enhanced_dashboard_stats(
    request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get enhanced dashboard statistics with real-time data"""
    try:
        # Get current credit balance
        credit_record = await db.user_credits.find_one({"user_id": current_user.id})
        total_credits = credit_record.get("credits_balance", 0) if credit_record else 0
        
        # Get usage statistics
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today.replace(day=1)
        
        # Credits used today
        today_usage = await db.usage_logs.aggregate([
            {
                "$match": {
                    "user_id": current_user.id,
                    "created_at": {"$gte": today}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$credits_charged"}}}
        ]).to_list(length=1)
        
        credits_used_today = today_usage[0]["total"] if today_usage else 0
        
        # Credits used this month
        month_usage = await db.usage_logs.aggregate([
            {
                "$match": {
                    "user_id": current_user.id,
                    "created_at": {"$gte": month_start}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$credits_charged"}}}
        ]).to_list(length=1)
        
        credits_used_this_month = month_usage[0]["total"] if month_usage else 0
        
        # Total generations
        total_generations = await db.usage_logs.count_documents({"user_id": current_user.id})
        
        # Favorite service
        service_stats = await db.usage_logs.aggregate([
            {"$match": {"user_id": current_user.id}},
            {"$group": {"_id": "$service_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]).to_list(length=1)
        
        favorite_service = service_stats[0]["_id"] if service_stats else "chat"
        
        # Recent activity count (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_activity_count = await db.usage_logs.count_documents({
            "user_id": current_user.id,
            "created_at": {"$gte": week_ago}
        })
        
        # Usage trend (last 30 days)
        usage_trend = await db.usage_logs.aggregate([
            {
                "$match": {
                    "user_id": current_user.id,
                    "created_at": {"$gte": datetime.utcnow() - timedelta(days=30)}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$created_at"
                        }
                    },
                    "credits": {"$sum": "$credits_charged"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]).to_list(length=30)
        
        stats = {
            "total_credits": total_credits,
            "credits_used_today": credits_used_today,
            "credits_used_this_month": credits_used_this_month,
            "total_generations": total_generations,
            "favorite_service": favorite_service,
            "recent_activity_count": recent_activity_count,
            "usage_trend": usage_trend,
            "credit_efficiency": {
                "avg_credits_per_generation": credits_used_this_month / max(recent_activity_count, 1),
                "most_efficient_service": favorite_service,
                "monthly_budget_used": (credits_used_this_month / max(total_credits + credits_used_this_month, 1)) * 100
            }
        }
        
        # Real-time sync with Supabase
        if is_supabase_enabled():
            try:
                supabase = get_supabase_client()
                if supabase:
                    # Store dashboard stats in Supabase for real-time updates
                    dashboard_data = {
                        "user_id": current_user.id,
                        "total_credits": total_credits,
                        "credits_used_today": credits_used_today,
                        "credits_used_this_month": credits_used_this_month,
                        "total_generations": total_generations,
                        "favorite_service": favorite_service,
                        "last_updated": datetime.utcnow().isoformat()
                    }
                    
                    supabase.table("user_dashboard_stats").upsert(dashboard_data).execute()
                    
                    # Also update user_credits table for real-time balance updates
                    supabase.table("user_credits").upsert({
                        "user_id": current_user.id,
                        "credits_balance": total_credits,
                        "updated_at": datetime.utcnow().isoformat()
                    }).execute()
                    
            except Exception as e:
                logger.warning(f"Failed to sync dashboard stats to Supabase: {e}")
        
        return {
            "success": True,
            "stats": stats,
            "real_time_enabled": is_supabase_enabled()
        }
        
    except Exception as e:
        logger.error(f"Error fetching enhanced dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard statistics"
        )

# ============================================
# Usage Charts Data
# ============================================

@router.get("/charts/usage")
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_usage_charts(
    request: Request,
    period: str = "30d",  # 7d, 30d, 90d
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get usage charts data for dashboard"""
    try:
        # Determine date range
        if period == "7d":
            days = 7
        elif period == "90d":
            days = 90
        else:
            days = 30
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Daily usage data
        daily_usage = await db.usage_logs.aggregate([
            {
                "$match": {
                    "user_id": current_user.id,
                    "created_at": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at"
                            }
                        },
                        "service": "$service_type"
                    },
                    "credits": {"$sum": "$credits_charged"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.date": 1}}
        ]).to_list(length=1000)
        
        # Process data for charts
        dates = []
        services = set()
        
        for item in daily_usage:
            dates.append(item["_id"]["date"])
            services.add(item["_id"]["service"])
        
        # Get unique dates
        unique_dates = sorted(list(set(dates)))
        services = sorted(list(services))
        
        # Create datasets for each service
        datasets = []
        colors = {
            "chat": "#3B82F6",
            "image": "#10B981", 
            "video": "#F59E0B",
            "audio": "#8B5CF6",
            "synapse": "#EF4444"
        }
        
        for service in services:
            data = []
            for date in unique_dates:
                # Find usage for this service on this date
                usage = next((item for item in daily_usage 
                            if item["_id"]["date"] == date and item["_id"]["service"] == service), None)
                data.append(usage["credits"] if usage else 0)
            
            datasets.append({
                "label": service.title(),
                "data": data,
                "borderColor": colors.get(service, "#6B7280"),
                "backgroundColor": colors.get(service, "#6B7280") + "20",
                "fill": True
            })
        
        chart_data = {
            "labels": unique_dates,
            "datasets": datasets
        }
        
        # Service distribution pie chart
        service_totals = await db.usage_logs.aggregate([
            {
                "$match": {
                    "user_id": current_user.id,
                    "created_at": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": "$service_type",
                    "credits": {"$sum": "$credits_charged"},
                    "count": {"$sum": 1}
                }
            }
        ]).to_list(length=100)
        
        pie_data = {
            "labels": [item["_id"].title() for item in service_totals],
            "datasets": [{
                "data": [item["credits"] for item in service_totals],
                "backgroundColor": [colors.get(item["_id"], "#6B7280") for item in service_totals]
            }]
        }
        
        return {
            "success": True,
            "period": period,
            "line_chart": chart_data,
            "pie_chart": pie_data,
            "summary": {
                "total_days": len(unique_dates),
                "total_services": len(services),
                "total_credits": sum(item["credits"] for item in service_totals),
                "total_requests": sum(item["count"] for item in service_totals)
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching usage charts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch usage charts"
        )

# ============================================
# Real-time Dashboard Updates
# ============================================

@router.get("/realtime/status")
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_realtime_status(
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get real-time dashboard status"""
    try:
        if not is_supabase_enabled():
            return {
                "success": True,
                "realtime_enabled": False,
                "message": "Real-time updates not available"
            }
        
        supabase = get_supabase_client()
        if not supabase:
            return {
                "success": True,
                "realtime_enabled": False,
                "message": "Supabase client not available"
            }
        
        # Test Supabase connection
        try:
            # Try to fetch user data from Supabase
            result = supabase.table("user_credits").select("*").eq("user_id", current_user.id).execute()
            
            return {
                "success": True,
                "realtime_enabled": True,
                "supabase_connected": True,
                "user_data_synced": len(result.data) > 0,
                "available_channels": [
                    "user_credits",
                    "user_dashboard_stats", 
                    "usage_logs",
                    "pricing_packages"
                ]
            }
            
        except Exception as e:
            logger.warning(f"Supabase connection test failed: {e}")
            return {
                "success": True,
                "realtime_enabled": False,
                "supabase_connected": False,
                "error": str(e)
            }
        
    except Exception as e:
        logger.error(f"Error checking realtime status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check realtime status"
        )