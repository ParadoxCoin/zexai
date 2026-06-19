"""
Analytics background tasks
Handles data aggregation, reporting, and analytics processing (Supabase Version)
"""
from celery import Task
from core.celery_app import celery_app
from core.database import get_database
from core.cache import cache_service, CacheKeys, CacheInvalidation
from core.logger import app_logger as logger
from datetime import datetime, timedelta
from typing import Dict, Any, List
import asyncio


class AnalyticsTask(Task):
    """Base class for analytics tasks"""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle analytics task failure"""
        logger.error(f"Analytics task {task_id} failed: {exc}")
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle analytics task success"""
        logger.info(f"Analytics task {task_id} completed successfully")


@celery_app.task(bind=True, base=AnalyticsTask, name="update_platform_analytics")
def update_platform_analytics(self, **kwargs):
    """
    Update platform analytics and cache the results (Supabase Version)
    """
    async def run():
        try:
            result = await _calculate_platform_analytics()
            # Cache the results
            cache_key = CacheKeys.platform_stats()
            await cache_service.set(cache_key, result, 300)
            logger.info("Platform analytics updated successfully")
            return {"status": "completed", "timestamp": datetime.utcnow().isoformat()}
        except Exception as e:
            logger.error(f"Platform analytics update failed: {e}")
            raise

    return asyncio.run(run())


async def _calculate_platform_analytics() -> Dict[str, Any]:
    """Calculate comprehensive platform analytics using Supabase"""
    try:
        db = await get_database()
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        month_ago = (now - timedelta(days=30)).isoformat()
        
        # User statistics
        total_users_res = db.table("users").select("id", count="exact").execute()
        total_users = total_users_res.count or 0
        
        new_users_res = db.table("users").select("id", count="exact").gte("created_at", today).execute()
        new_users_today = new_users_res.count or 0
        
        # Generation statistics
        total_gen_res = db.table("ai_generations").select("id", count="exact").execute()
        total_generations = total_gen_res.count or 0
        
        gen_today_res = db.table("ai_generations").select("id", count="exact").gte("created_at", today).execute()
        generations_today = gen_today_res.count or 0
        
        # Generation by service type (Simplified for now - pulling last 100 and grouping)
        # In production, this should use an RPC/SQL function for performance
        service_res = db.table("ai_generations").select("service_type").gte("created_at", month_ago).limit(1000).execute()
        service_data = service_res.data or []
        generations_by_service = {}
        for item in service_data:
            stype = item["service_type"]
            generations_by_service[stype] = generations_by_service.get(stype, 0) + 1
        
        return {
            "timestamp": now.isoformat(),
            "users": {
                "total": total_users,
                "new_today": new_users_today
            },
            "generations": {
                "total": total_generations,
                "today": generations_today,
                "by_service": generations_by_service
            }
        }
    except Exception as e:
        logger.error(f"Failed to calculate platform analytics: {e}")
        raise


async def _calculate_user_analytics(user_id: str) -> Dict[str, Any]:
    """Calculate analytics for a specific user using Supabase"""
    try:
        db = await get_database()
        
        # Total generations
        gen_res = db.table("ai_generations").select("id", count="exact").eq("user_id", user_id).execute()
        total_generations = gen_res.count or 0
        
        # Current balance
        credit_res = db.table("user_credits").select("credits_balance").eq("user_id", user_id).execute()
        current_balance = credit_res.data[0]["credits_balance"] if credit_res.data else 0
        
        return {
            "user_id": user_id,
            "generations": {"total": total_generations},
            "credits": {"current_balance": current_balance}
        }
    except Exception as e:
        logger.error(f"Failed to calculate user analytics: {e}")
        raise
