"""
Analytics background tasks
Handles data aggregation, reporting, and analytics processing
"""
try:
    from celery import Task
    from core.celery_app import celery_app
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    Task = object
    celery_app = None
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


def update_platform_analytics(self=None, **kwargs):
    if not CELERY_AVAILABLE:
        return {"status": "skipped", "reason": "Celery not available"}
    """
    Update platform analytics and cache the results
    """
    try:
        # Run analytics update
        result = asyncio.run(_calculate_platform_analytics())
        
        # Cache the results
        asyncio.run(_cache_analytics_results(result))
        
        logger.info("Platform analytics updated successfully")
        
        return {
            "status": "completed",
            "analytics_updated": True,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Platform analytics update failed: {e}")
        raise


def calculate_user_analytics(self=None, user_id: str = None, **kwargs):
    if not CELERY_AVAILABLE:
        return {"status": "skipped", "reason": "Celery not available"}
    """
    Calculate analytics for a specific user
    
    Args:
        user_id: User ID to calculate analytics for
    """
    try:
        result = asyncio.run(_calculate_user_analytics(user_id))
        
        # Cache user analytics
        cache_key = CacheKeys.user_stats(user_id)
        asyncio.run(cache_service.set(cache_key, result, 300))  # 5 minutes
        
        logger.info(f"User analytics calculated for {user_id}")
        
        return {
            "status": "completed",
            "user_id": user_id,
            "analytics": result
        }
        
    except Exception as e:
        logger.error(f"User analytics calculation failed for {user_id}: {e}")
        raise


def generate_daily_report(self=None, date: str = None, **kwargs):
    if not CELERY_AVAILABLE:
        return {"status": "skipped", "reason": "Celery not available"}
    """
    Generate daily analytics report
    
    Args:
        date: Date to generate report for (YYYY-MM-DD format)
    """
    try:
        if not date:
            date = datetime.utcnow().strftime("%Y-%m-%d")
        
        report = asyncio.run(_generate_daily_report_data(date))
        
        # Save report to database
        asyncio.run(_save_daily_report(date, report))
        
        logger.info(f"Daily report generated for {date}")
        
        return {
            "status": "completed",
            "date": date,
            "report": report
        }
        
    except Exception as e:
        logger.error(f"Daily report generation failed: {e}")
        raise


def update_model_usage_stats(self=None, **kwargs):
    if not CELERY_AVAILABLE:
        return {"status": "skipped", "reason": "Celery not available"}
    """
    Update AI model usage statistics
    """
    try:
        stats = asyncio.run(_calculate_model_usage_stats())
        
        # Cache model stats
        cache_key = "models:usage_stats"
        asyncio.run(cache_service.set(cache_key, stats, 600))  # 10 minutes
        
        logger.info("Model usage statistics updated")
        
        return {
            "status": "completed",
            "model_stats": stats
        }
        
    except Exception as e:
        logger.error(f"Model usage stats update failed: {e}")
        raise


async def _calculate_platform_analytics() -> Dict[str, Any]:
    """Calculate comprehensive platform analytics"""
    try:
        db = get_database()
        
        # Time ranges
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # User statistics
        total_users = await db.users.count_documents({})
        active_today = await db.users.count_documents({"last_login": {"$gte": today}})
        active_week = await db.users.count_documents({"last_login": {"$gte": week_ago}})
        active_month = await db.users.count_documents({"last_login": {"$gte": month_ago}})
        
        # New user registrations
        new_users_today = await db.users.count_documents({
            "created_at": {"$gte": today}
        })
        new_users_week = await db.users.count_documents({
            "created_at": {"$gte": week_ago}
        })
        new_users_month = await db.users.count_documents({
            "created_at": {"$gte": month_ago}
        })
        
        # Generation statistics
        total_generations = await db.ai_generations.count_documents({})
        generations_today = await db.ai_generations.count_documents({
            "created_at": {"$gte": today}
        })
        generations_week = await db.ai_generations.count_documents({
            "created_at": {"$gte": week_ago}
        })
        generations_month = await db.ai_generations.count_documents({
            "created_at": {"$gte": month_ago}
        })
        
        # Generation by service type
        service_pipeline = [
            {"$match": {"created_at": {"$gte": month_ago}}},
            {"$group": {"_id": "$service_type", "count": {"$sum": 1}}}
        ]
        service_stats = await db.ai_generations.aggregate(service_pipeline).to_list(length=100)
        generations_by_service = {item["_id"]: item["count"] for item in service_stats}
        
        # Credit statistics
        credits_pipeline = [
            {"$group": {"_id": None, "total_balance": {"$sum": "$credits_balance"}}}
        ]
        credits_result = await db.user_credits.aggregate(credits_pipeline).to_list(length=1)
        total_credits_in_circulation = credits_result[0]["total_balance"] if credits_result else 0
        
        # Usage statistics
        usage_pipeline = [
            {"$match": {"created_at": {"$gte": month_ago}}},
            {"$group": {"_id": None, "total_spent": {"$sum": "$cost"}}}
        ]
        usage_result = await db.usage_logs.aggregate(usage_pipeline).to_list(length=1)
        total_credits_spent = usage_result[0]["total_spent"] if usage_result else 0
        
        # Top models
        model_pipeline = [
            {"$match": {"created_at": {"$gte": month_ago}}},
            {"$group": {"_id": "$model_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        top_models = await db.ai_generations.aggregate(model_pipeline).to_list(length=10)
        
        # Revenue (placeholder - should be calculated from billing records)
        total_revenue = 0.0
        
        return {
            "timestamp": now.isoformat(),
            "users": {
                "total": total_users,
                "active_today": active_today,
                "active_week": active_week,
                "active_month": active_month,
                "new_today": new_users_today,
                "new_week": new_users_week,
                "new_month": new_users_month
            },
            "generations": {
                "total": total_generations,
                "today": generations_today,
                "week": generations_week,
                "month": generations_month,
                "by_service": generations_by_service
            },
            "credits": {
                "in_circulation": total_credits_in_circulation,
                "spent_month": total_credits_spent
            },
            "revenue": {
                "total": total_revenue
            },
            "top_models": top_models
        }
        
    except Exception as e:
        logger.error(f"Failed to calculate platform analytics: {e}")
        raise


async def _calculate_user_analytics(user_id: str) -> Dict[str, Any]:
    """Calculate analytics for a specific user"""
    try:
        db = get_database()
        
        # Time ranges
        now = datetime.utcnow()
        month_ago = now - timedelta(days=30)
        
        # User generations
        total_generations = await db.ai_generations.count_documents({"user_id": user_id})
        monthly_generations = await db.ai_generations.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": month_ago}
        })
        
        # Generations by service type
        service_pipeline = [
            {"$match": {"user_id": user_id, "created_at": {"$gte": month_ago}}},
            {"$group": {"_id": "$service_type", "count": {"$sum": 1}}}
        ]
        service_stats = await db.ai_generations.aggregate(service_pipeline).to_list(length=100)
        generations_by_service = {item["_id"]: item["count"] for item in service_stats}
        
        # Credit usage
        usage_pipeline = [
            {"$match": {"user_id": user_id, "created_at": {"$gte": month_ago}}},
            {"$group": {"_id": None, "total_spent": {"$sum": "$cost"}}}
        ]
        usage_result = await db.usage_logs.aggregate(usage_pipeline).to_list(length=1)
        credits_spent = usage_result[0]["total_spent"] if usage_result else 0
        
        # Current credit balance
        credit_record = await db.user_credits.find_one({"user_id": user_id})
        current_balance = credit_record.get("credits_balance", 0) if credit_record else 0
        
        # Favorite models
        model_pipeline = [
            {"$match": {"user_id": user_id, "created_at": {"$gte": month_ago}}},
            {"$group": {"_id": "$model_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        favorite_models = await db.ai_generations.aggregate(model_pipeline).to_list(length=5)
        
        return {
            "user_id": user_id,
            "timestamp": now.isoformat(),
            "generations": {
                "total": total_generations,
                "monthly": monthly_generations,
                "by_service": generations_by_service
            },
            "credits": {
                "current_balance": current_balance,
                "spent_month": credits_spent
            },
            "favorite_models": favorite_models
        }
        
    except Exception as e:
        logger.error(f"Failed to calculate user analytics for {user_id}: {e}")
        raise


async def _generate_daily_report_data(date: str) -> Dict[str, Any]:
    """Generate daily report data for a specific date"""
    try:
        db = get_database()
        
        # Parse date
        report_date = datetime.strptime(date, "%Y-%m-%d")
        next_day = report_date + timedelta(days=1)
        
        # Daily statistics
        new_users = await db.users.count_documents({
            "created_at": {"$gte": report_date, "$lt": next_day}
        })
        
        total_generations = await db.ai_generations.count_documents({
            "created_at": {"$gte": report_date, "$lt": next_day}
        })
        
        # Generations by service
        service_pipeline = [
            {"$match": {"created_at": {"$gte": report_date, "$lt": next_day}}},
            {"$group": {"_id": "$service_type", "count": {"$sum": 1}}}
        ]
        service_stats = await db.ai_generations.aggregate(service_pipeline).to_list(length=100)
        
        # Credit usage
        usage_pipeline = [
            {"$match": {"created_at": {"$gte": report_date, "$lt": next_day}}},
            {"$group": {"_id": None, "total_spent": {"$sum": "$cost"}}}
        ]
        usage_result = await db.usage_logs.aggregate(usage_pipeline).to_list(length=1)
        credits_spent = usage_result[0]["total_spent"] if usage_result else 0
        
        return {
            "date": date,
            "new_users": new_users,
            "total_generations": total_generations,
            "generations_by_service": {item["_id"]: item["count"] for item in service_stats},
            "credits_spent": credits_spent
        }
        
    except Exception as e:
        logger.error(f"Failed to generate daily report for {date}: {e}")
        raise


async def _calculate_model_usage_stats() -> Dict[str, Any]:
    """Calculate AI model usage statistics"""
    try:
        db = get_database()
        
        # Time range
        month_ago = datetime.utcnow() - timedelta(days=30)
        
        # Model usage pipeline
        model_pipeline = [
            {"$match": {"created_at": {"$gte": month_ago}}},
            {"$group": {
                "_id": {
                    "model_id": "$model_id",
                    "service_type": "$service_type"
                },
                "count": {"$sum": 1},
                "unique_users": {"$addToSet": "$user_id"}
            }},
            {"$project": {
                "model_id": "$_id.model_id",
                "service_type": "$_id.service_type",
                "usage_count": "$count",
                "unique_users": {"$size": "$unique_users"}
            }},
            {"$sort": {"usage_count": -1}}
        ]
        
        model_stats = await db.ai_generations.aggregate(model_pipeline).to_list(length=100)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "model_usage": model_stats
        }
        
    except Exception as e:
        logger.error(f"Failed to calculate model usage stats: {e}")
        raise


async def _cache_analytics_results(analytics: Dict[str, Any]):
    """Cache analytics results"""
    try:
        # Cache platform stats
        await cache_service.set(CacheKeys.platform_stats(), analytics, 300)  # 5 minutes
        
        # Invalidate related caches
        await CacheInvalidation.invalidate_platform_stats()
        
        logger.info("Analytics results cached successfully")
        
    except Exception as e:
        logger.error(f"Failed to cache analytics results: {e}")


async def _save_daily_report(date: str, report: Dict[str, Any]):
    """Save daily report to database"""
    try:
        db = get_database()
        
        report_record = {
            "date": date,
            "report": report,
            "created_at": datetime.utcnow()
        }
        
        await db.daily_reports.update_one(
            {"date": date},
            {"$set": report_record},
            upsert=True
        )
        
        logger.info(f"Daily report saved for {date}")
        
    except Exception as e:
        logger.error(f"Failed to save daily report for {date}: {e}")

