"""
Analytics Service
Provides statistics and metrics for the admin dashboard
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging

from core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for generating analytics data"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        logger.info("AnalyticsService initialized")
    
    async def get_overview(self) -> Dict[str, Any]:
        """Get dashboard overview stats"""
        supabase = get_supabase_client()
        
        total_users = 0
        active_users = 0
        today_revenue = 0.0
        today_generations = 0
        growth_rate = 0.0
        
        if not supabase:
            logger.warning("No Supabase client available for analytics")
            return {
                "total_users": total_users,
                "active_users": active_users,
                "today_revenue": today_revenue,
                "today_generations": today_generations,
                "growth_rate": growth_rate
            }
        
        today = datetime.utcnow().date().isoformat()
        week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        
        # Get total users (separate try/catch for resilience)
        try:
            users_result = supabase.table("users").select("id", count="exact").execute()
            total_users = users_result.count or 0
        except Exception as e:
            logger.warning(f"Failed to get total users: {e}")
        
        # Get active users (last 7 days based on updated_at since last_activity may not exist)
        try:
            active_result = supabase.table("users").select("id", count="exact")\
                .gte("updated_at", week_ago).execute()
            active_users = active_result.count or 0
        except Exception as e:
            logger.warning(f"Failed to get active users: {e}")
        
        # Get today's revenue
        try:
            revenue_result = supabase.table("payments").select("amount")\
                .eq("status", "completed").gte("created_at", today).execute()
            today_revenue = sum(p.get("amount", 0) for p in (revenue_result.data or []))
        except Exception as e:
            logger.warning(f"Failed to get today revenue: {e}")
        
        # Get total generations today
        try:
            gen_result = supabase.table("generations").select("id", count="exact")\
                .gte("created_at", today).execute()
            today_generations = gen_result.count or 0
        except Exception as e:
            logger.warning(f"Failed to get today generations: {e}")
        
        # Calculate growth rate (compare this week vs last week)
        try:
            two_weeks_ago = (datetime.utcnow() - timedelta(days=14)).isoformat()
            last_week_result = supabase.table("users").select("id", count="exact")\
                .gte("created_at", two_weeks_ago).lt("created_at", week_ago).execute()
            this_week_result = supabase.table("users").select("id", count="exact")\
                .gte("created_at", week_ago).execute()
            
            last_week = last_week_result.count or 0
            this_week = this_week_result.count or 0
            
            if last_week > 0:
                growth_rate = round((this_week - last_week) / last_week * 100, 1)
        except Exception as e:
            logger.warning(f"Failed to calculate growth rate: {e}")
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "today_revenue": round(today_revenue, 2),
            "today_generations": today_generations,
            "growth_rate": growth_rate
        }
    
    def _get_empty_overview(self) -> Dict[str, Any]:
        """Return empty data when no database connection"""
        return {
            "total_users": 0,
            "active_users": 0,
            "today_revenue": 0.0,
            "today_generations": 0,
            "growth_rate": 0.0
        }
    
    async def get_revenue_stats(
        self, 
        period: str = "week",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get revenue statistics"""
        supabase = get_supabase_client()
        
        # Calculate date range
        if period == "day":
            days = 1
        elif period == "week":
            days = 7
        elif period == "month":
            days = 30
        else:
            days = 7
        
        start = datetime.utcnow() - timedelta(days=days)
        
        if not supabase:
            return self._get_mock_revenue(days)
        
        try:
            result = supabase.table("payments").select("amount, created_at, payment_type")\
                .eq("status", "completed")\
                .gte("created_at", start.isoformat())\
                .order("created_at")\
                .execute()
            
            # Group by date
            daily_revenue = {}
            subscription_total = 0
            credit_total = 0
            
            for payment in (result.data or []):
                date = payment["created_at"][:10]
                amount = payment.get("amount", 0)
                
                if date not in daily_revenue:
                    daily_revenue[date] = 0
                daily_revenue[date] += amount
                
                if payment.get("payment_type") == "subscription":
                    subscription_total += amount
                else:
                    credit_total += amount
            
            # Format for chart
            chart_data = [
                {"date": date, "revenue": round(amount, 2)}
                for date, amount in sorted(daily_revenue.items())
            ]
            
            total = sum(daily_revenue.values())
            
            return {
                "chart_data": chart_data,
                "total": round(total, 2),
                "subscription_total": round(subscription_total, 2),
                "credit_total": round(credit_total, 2),
                "period": period
            }
            
        except Exception as e:
            logger.error(f"Failed to get revenue stats: {e}")
            return self._get_mock_revenue(days)
    
    def _get_mock_revenue(self, days: int) -> Dict[str, Any]:
        """Return empty revenue data"""
        return {
            "chart_data": [],
            "total": 0,
            "subscription_total": 0,
            "credit_total": 0,
            "period": "week"
        }
    
    async def get_usage_stats(self, period: str = "week") -> Dict[str, Any]:
        """Get service usage statistics"""
        supabase = get_supabase_client()
        
        days = 7 if period == "week" else 30 if period == "month" else 1
        start = datetime.utcnow() - timedelta(days=days)
        
        if not supabase:
            return self._get_mock_usage(days)
        
        try:
            result = supabase.table("generations").select("type, created_at")\
                .gte("created_at", start.isoformat())\
                .execute()
            
            # Group by service type
            service_counts = {
                "image": 0,
                "video": 0,
                "chat": 0,
                "audio": 0
            }
            
            daily_usage = {}
            
            for output in (result.data or []):
                service = output.get("type", "other")
                date = output["created_at"][:10]
                
                if service in service_counts:
                    service_counts[service] += 1
                
                if date not in daily_usage:
                    daily_usage[date] = 0
                daily_usage[date] += 1
            
            # Format for charts
            service_chart = [
                {"name": "Image", "value": service_counts["image"], "color": "#3B82F6"},
                {"name": "Video", "value": service_counts["video"], "color": "#8B5CF6"},
                {"name": "Chat", "value": service_counts["chat"], "color": "#10B981"},
                {"name": "Audio", "value": service_counts["audio"], "color": "#F59E0B"}
            ]
            
            trend_chart = [
                {"date": date, "count": count}
                for date, count in sorted(daily_usage.items())
            ]
            
            return {
                "service_breakdown": service_chart,
                "trend_data": trend_chart,
                "total": sum(service_counts.values()),
                "period": period
            }
            
        except Exception as e:
            logger.error(f"Failed to get usage stats: {e}")
            return self._get_mock_usage(days)
    
    def _get_mock_usage(self, days: int) -> Dict[str, Any]:
        """Return mock usage data"""
        import random
        
        service_chart = [
            {"name": "Image", "value": random.randint(500, 1500), "color": "#3B82F6"},
            {"name": "Video", "value": random.randint(200, 600), "color": "#8B5CF6"},
            {"name": "Chat", "value": random.randint(1000, 3000), "color": "#10B981"},
            {"name": "Audio", "value": random.randint(100, 400), "color": "#F59E0B"}
        ]
        
        trend_chart = []
        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=days-i-1)).strftime("%Y-%m-%d")
            trend_chart.append({"date": date, "count": random.randint(100, 500)})
        
        return {
            "service_breakdown": service_chart,
            "trend_data": trend_chart,
            "total": sum(s["value"] for s in service_chart),
            "period": "week"
        }
    
    async def get_provider_stats(self) -> Dict[str, Any]:
        """Get provider statistics"""
        supabase = get_supabase_client()
        
        if not supabase:
            return self._get_mock_provider_stats()
        
        try:
            # Get provider usage from generations
            result = supabase.table("generations").select("model, status, created_at")\
                .gte("created_at", (datetime.utcnow() - timedelta(days=7)).isoformat())\
                .execute()
            
            providers = {}
            
            for output in (result.data or []):
                provider = output.get("model", "unknown").split("/")[0] if output.get("model") else "unknown"
                
                if provider not in providers:
                    providers[provider] = {
                        "total": 0,
                        "success": 0,
                        "failed": 0,
                        "response_times": []
                    }
                
                providers[provider]["total"] += 1
                
                if output.get("status") == "completed":
                    providers[provider]["success"] += 1
                elif output.get("status") == "failed":
                    providers[provider]["failed"] += 1
                
                if output.get("response_time_ms"):
                    providers[provider]["response_times"].append(output["response_time_ms"])
            
            # Calculate stats
            provider_stats = []
            for name, data in providers.items():
                avg_time = sum(data["response_times"]) / len(data["response_times"]) if data["response_times"] else 0
                success_rate = (data["success"] / data["total"] * 100) if data["total"] > 0 else 0
                
                provider_stats.append({
                    "name": name,
                    "total": data["total"],
                    "success_rate": round(success_rate, 1),
                    "avg_response_time": round(avg_time, 0)
                })
            
            # Pie chart data
            pie_data = [
                {"name": p["name"], "value": p["total"]}
                for p in sorted(provider_stats, key=lambda x: x["total"], reverse=True)[:5]
            ]
            
            return {
                "providers": provider_stats,
                "pie_data": pie_data,
                "total_requests": sum(p["total"] for p in provider_stats)
            }
            
        except Exception as e:
            logger.error(f"Failed to get provider stats: {e}")
            return self._get_mock_provider_stats()
    
    def _get_mock_provider_stats(self) -> Dict[str, Any]:
        """Return mock provider stats"""
        providers = [
            {"name": "OpenAI", "total": 1500, "success_rate": 99.2, "avg_response_time": 1200},
            {"name": "FAL", "total": 1200, "success_rate": 98.5, "avg_response_time": 3500},
            {"name": "ElevenLabs", "total": 400, "success_rate": 97.8, "avg_response_time": 800},
            {"name": "Fireworks", "total": 800, "success_rate": 99.0, "avg_response_time": 600}
        ]
        
        pie_data = [{"name": p["name"], "value": p["total"]} for p in providers]
        
        return {
            "providers": providers,
            "pie_data": pie_data,
            "total_requests": sum(p["total"] for p in providers)
        }
    
    async def get_user_growth(self, period: str = "month") -> Dict[str, Any]:
        """Get user growth statistics"""
        supabase = get_supabase_client()
        
        days = 30 if period == "month" else 7
        
        if not supabase:
            return self._get_mock_user_growth(days)
        
        try:
            start = datetime.utcnow() - timedelta(days=days)
            
            result = supabase.table("users").select("created_at")\
                .gte("created_at", start.isoformat())\
                .order("created_at")\
                .execute()
            
            # Group by date
            daily_signups = {}
            cumulative = 0
            
            for user in (result.data or []):
                date = user["created_at"][:10]
                if date not in daily_signups:
                    daily_signups[date] = 0
                daily_signups[date] += 1
            
            # Create cumulative chart
            chart_data = []
            running_total = 0
            
            for date in sorted(daily_signups.keys()):
                running_total += daily_signups[date]
                chart_data.append({
                    "date": date,
                    "new_users": daily_signups[date],
                    "total": running_total
                })
            
            return {
                "chart_data": chart_data,
                "new_users": sum(daily_signups.values()),
                "period": period
            }
            
        except Exception as e:
            logger.error(f"Failed to get user growth: {e}")
            return self._get_mock_user_growth(days)
    
    def _get_mock_user_growth(self, days: int) -> Dict[str, Any]:
        """Return mock user growth data"""
        import random
        
        chart_data = []
        running_total = 1000
        
        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=days-i-1)).strftime("%Y-%m-%d")
            new_users = random.randint(10, 50)
            running_total += new_users
            chart_data.append({
                "date": date,
                "new_users": new_users,
                "total": running_total
            })
        
        return {
            "chart_data": chart_data,
            "new_users": sum(d["new_users"] for d in chart_data),
            "period": "month"
        }


# Singleton instance
_analytics_service = None

def get_analytics_service() -> AnalyticsService:
    """Get analytics service singleton"""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service
