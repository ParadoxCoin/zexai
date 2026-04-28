"""
User dashboard routes
Provides statistics and recent activity for user dashboard using Supabase
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json

from pydantic import BaseModel
from core.security import get_current_user
from core.database import get_db
from core.logger import app_logger as logger
from core.rate_limiter import limiter, RateLimits


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ============================================
# Schemas
# ============================================

class DashboardStats(BaseModel):
    """User dashboard statistics"""
    credits_balance: float
    credits_spent_today: float
    credits_spent_week: float
    credits_spent_month: float
    generations_today: int
    generations_week: int
    generations_month: int
    total_generations: int
    favorite_model: Optional[str] = None


class RecentActivity(BaseModel):
    """Recent activity item"""
    id: str
    type: str  # image, video, audio, chat
    title: str
    thumbnail_url: Optional[str] = None
    credits_charged: float
    created_at: datetime


class UsageSummary(BaseModel):
    """Usage summary by service type"""
    service_type: str
    count: int
    total_credits: float
    percentage: float


class QuickAction(BaseModel):
    """Quick action suggestion"""
    title: str
    description: str
    icon: str
    link: str
    priority: int


# ============================================
# Dashboard Endpoints
# ============================================

@router.get("/stats", response_model=DashboardStats)
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_dashboard_stats(
    request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get user dashboard statistics using optimized usage_logs
    """
    try:
        # Get credit balance from user_credits with fallback
        credit_response = db.table("user_credits").select("credits_balance").eq("user_id", current_user.id).execute()
        credits_balance = float(credit_response.data[0]["credits_balance"]) if credit_response.data else 0.0
        
        # Calculate time ranges
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        week_start = (now - timedelta(days=7)).isoformat()
        month_start = (now - timedelta(days=30)).isoformat()
        
        # 1. Total Generations (Fallback logic)
        # Try usage_logs first
        total_resp = db.table("usage_logs").select("id", count="exact").eq("user_id", current_user.id).execute()
        total_generations = total_resp.count or 0
        
        # If usage_logs is empty, try image_generations as fallback
        if total_generations == 0:
            img_total = db.table("image_generations").select("id", count="exact").eq("user_id", current_user.id).execute()
            total_generations = img_total.count or 0
            
        # 2. Credits Spent (Month/Week/Today)
        month_resp = db.table("usage_logs").select("cost").eq("user_id", current_user.id).gte("created_at", month_start).execute()
        credits_spent_month = sum([float(item.get("cost") or 0) for item in month_resp.data]) if month_resp.data else 0.0
        
        week_resp = db.table("usage_logs").select("cost").eq("user_id", current_user.id).gte("created_at", week_start).execute()
        credits_spent_week = sum([float(item.get("cost") or 0) for item in week_resp.data]) if week_resp.data else 0.0
        
        today_resp = db.table("usage_logs").select("cost").eq("user_id", current_user.id).gte("created_at", today_start).execute()
        credits_spent_today = sum([float(item.get("cost") or 0) for item in today_resp.data]) if today_resp.data else 0.0
        
        # 3. Category Breakdown for the 4 Cards
        # We'll fetch all-time counts per service_type from usage_logs
        usage_all = db.table("usage_logs").select("service_type").eq("user_id", current_user.id).execute()
        
        gen_counts = {"image": 0, "video": 0, "audio": 0, "chat": 0}
        if usage_all.data:
            for item in usage_all.data:
                s_type = item["service_type"].lower()
                if s_type in gen_counts:
                    gen_counts[s_type] += 1
        else:
            # Fallback for counts if usage_logs is empty
            img_c = db.table("image_generations").select("id", count="exact").eq("user_id", current_user.id).execute()
            gen_counts["image"] = img_c.count or 0
            
        # 4. Favorite Model
        favorite_model = "Flux.1"
        if usage_all.data:
            types = [i["service_type"] for i in usage_all.data]
            favorite_model = max(set(types), key=types.count).title()

        return DashboardStats(
            credits_balance=credits_balance,
            credits_spent_today=credits_spent_today,
            credits_spent_week=credits_spent_week,
            credits_spent_month=credits_spent_month,
            generations_today=len([i for i in usage_all.data if i.get("created_at", "") >= today_start]) if usage_all.data else 0,
            generations_week=len([i for i in usage_all.data if i.get("created_at", "") >= week_start]) if usage_all.data else 0,
            generations_month=len([i for i in usage_all.data if i.get("created_at", "") >= month_start]) if usage_all.data else 0,
            total_generations=total_generations,
            favorite_model=favorite_model
        )
    
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard stats"
        )


@router.get("/recent-activity", response_model=List[RecentActivity])
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_recent_activity(
    request: Request,
    limit: int = Query(10, ge=1, le=50),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get user's recent activity from usage_logs (with fallback)
    """
    try:
        # Get recent logs
        response = db.table("usage_logs")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
            
        data = response.data or []
        
        # Fallback to image_generations if no usage_logs
        if not data:
            img_resp = db.table("image_generations")\
                .select("*")\
                .eq("user_id", current_user.id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            # Map image_generations to usage_logs format
            for img in (img_resp.data or []):
                data.append({
                    "id": img["id"],
                    "service_type": "image",
                    "cost": 5, # default
                    "created_at": img["created_at"],
                    "details": {
                        "prompt": img.get("prompt", ""),
                        "image_url": img.get("output_url", "")
                    }
                })
            
        activities = []
        for item in data:
            details = item.get("details", {})
            if isinstance(details, str):
                try:
                    details = json.loads(details)
                except:
                    details = {}
                    
            # Generate title
            title = details.get("prompt", "")
            if not title:
                title = f"{item['service_type'].title()} Generation"
                
            title = title[:50] + "..." if len(title) > 50 else title
            
            activities.append(RecentActivity(
                id=item["id"],
                type=item["service_type"],
                title=title,
                thumbnail_url=details.get("image_url") or details.get("output_url"),
                credits_charged=item.get("cost", 0),
                created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            ))
        
        return activities
    
    except Exception as e:
        logger.error(f"Error fetching recent activity: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch recent activity"
        )


@router.get("/usage-summary", response_model=List[UsageSummary])
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_usage_summary(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get usage summary from usage_logs
    """
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Fetch all logs for the period
        response = db.table("usage_logs")\
            .select("service_type, cost")\
            .eq("user_id", current_user.id)\
            .gte("created_at", start_date)\
            .execute()
            
        summary_dict = {}
        total_count = 0
        
        for item in response.data:
            s_type = item["service_type"]
            cost = item.get("cost", 0)
            
            if s_type not in summary_dict:
                summary_dict[s_type] = {"count": 0, "total_credits": 0.0}
            
            summary_dict[s_type]["count"] += 1
            summary_dict[s_type]["total_credits"] += cost
            total_count += 1
            
        summary = []
        for s_type, data in summary_dict.items():
            percentage = (data["count"] / total_count * 100) if total_count > 0 else 0
            summary.append(UsageSummary(
                service_type=s_type,
                count=data["count"],
                total_credits=data["total_credits"],
                percentage=round(percentage, 2)
            ))
        
        summary.sort(key=lambda x: x.count, reverse=True)
        return summary
    
    except Exception as e:
        logger.error(f"Error fetching usage summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch usage summary"
        )
    
    except Exception as e:
        logger.error(f"Error fetching usage summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch usage summary"
        )


@router.get("/quick-actions", response_model=List[QuickAction])
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_quick_actions(
    request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get personalized quick action suggestions
    """
    try:
        # Get user's credit balance
        credit_response = db.table("user_credits").select("credits_balance").eq("user_id", current_user.id).execute()
        credits_balance = float(credit_response.data[0]["credits_balance"]) if credit_response.data else 0.0
        
        # Get user's recent activity count
        week_start = (datetime.utcnow() - timedelta(days=7)).isoformat()
        recent_response = db.table("generations").select("*", count="exact").eq("user_id", current_user.id).gte("created_at", week_start).execute()
        recent_count = recent_response.count
        
        actions = []
        
        # Low credits warning
        if credits_balance < 100:
            actions.append(QuickAction(
                title="Kredi Satın Al",
                description="Krediniz azalıyor. Hemen kredi satın alın.",
                icon="credit-card",
                link="/billing/subscription",
                priority=1
            ))
        
        # No recent activity
        if recent_count == 0:
            actions.append(QuickAction(
                title="İlk Görselinizi Oluşturun",
                description="AI ile muhteşem görseller oluşturmaya başlayın.",
                icon="image",
                link="/image/generate",
                priority=2
            ))
        
        # Always show popular actions
        actions.extend([
            QuickAction(
                title="Görsel Oluştur",
                description="AI ile benzersiz görseller oluşturun",
                icon="image",
                link="/image/generate",
                priority=3
            ),
            QuickAction(
                title="Video Oluştur",
                description="Metinden video üretin",
                icon="video",
                link="/video/generate",
                priority=4
            ),
            QuickAction(
                title="Sesli Konuşma",
                description="AI ile sohbet edin",
                icon="message-circle",
                link="/chat",
                priority=5
            ),
            QuickAction(
                title="Medya Kütüphanesi",
                description="Oluşturduğunuz içeriklere göz atın",
                icon="folder",
                link="/library",
                priority=6
            )
        ])
        
        # Sort by priority
        actions.sort(key=lambda x: x.priority)
        
        return actions[:6]  # Return top 6
    
    except Exception as e:
        logger.error(f"Error fetching quick actions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch quick actions"
        )

