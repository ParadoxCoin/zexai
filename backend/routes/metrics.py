"""
Metrics endpoint for Prometheus monitoring
Provides application metrics for observability
"""
from fastapi import APIRouter, Response, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import time
import psutil
from datetime import datetime, timedelta

from core.database import get_database
from core.security import get_current_user
# Correct the import from schemas.user
from schemas.user import UserProfileResponse
from .health import get_redis_client # Re-use the redis dependency from health route
from redis.asyncio import Redis as AsyncRedis

router = APIRouter(tags=["Metrics"])

# --- Prometheus Metrics Definitions ---
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)
REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)
ACTIVE_USERS = Gauge(
    'active_users_total',
    'Total number of active users (logged in last 24h)'
)
CREDIT_BALANCE_TOTAL = Gauge(
    'credit_balance_total',
    'Total credit balance across all users'
)
AI_REQUESTS_TOTAL = Counter(
    'ai_requests_total',
    'Total AI service requests',
    ['service_type', 'model', 'status']
)
SYSTEM_MEMORY_USAGE = Gauge(
    'system_memory_usage_percent',
    'System memory usage percentage'
)
SYSTEM_CPU_USAGE = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage'
)

@router.get("/metrics", summary="Get Prometheus Metrics")
async def get_metrics(db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    Endpoint for Prometheus to scrape application and system metrics.
    """
    # --- Update System Metrics ---
    try:
        memory = psutil.virtual_memory()
        SYSTEM_MEMORY_USAGE.set(memory.percent)
        
        cpu_percent = psutil.cpu_percent(interval=None) # non-blocking
        SYSTEM_CPU_USAGE.set(cpu_percent)
    except Exception:
        # Avoid failing the whole endpoint if psutil fails
        pass

    # --- Update Application Metrics from Database ---
    try:
        # Count active users (logged in within last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        active_users_count = await db.users.count_documents({
            "last_login": {"$gte": yesterday},
            "is_active": True
        })
        ACTIVE_USERS.set(active_users_count)
        
        # Calculate total credit balance
        pipeline = [{"$group": {"_id": None, "total": {"$sum": "$balance"}}}]
        result = await db.user_credits.aggregate(pipeline).to_list(1)
        total_credits = result[0]["total"] if result else 0
        CREDIT_BALANCE_TOTAL.set(total_credits)
        
    except Exception:
        # Don't fail the metrics endpoint if the database is temporarily unavailable
        pass
    
    # --- Generate and Return Prometheus Format ---
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

@router.get("/metrics/health", summary="Get Detailed Health Metrics")
async def metrics_health(
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: AsyncRedis = Depends(get_redis_client)
):
    """
    Provides detailed health and performance metrics for system components.
    """
    # --- System Metrics ---
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    cpu_percent = psutil.cpu_percent(interval=None)
    
    # --- Database Health ---
    db_healthy = False
    db_response_time = None
    try:
        start_time = time.monotonic()
        await db.command("ping")
        db_response_time = (time.monotonic() - start_time) * 1000  # ms
        db_healthy = True
    except Exception:
        pass
    
    # --- Cache Health ---
    cache_healthy = False
    cache_response_time = None
    if redis:
        try:
            start_time = time.monotonic()
            await redis.ping()
            cache_response_time = (time.monotonic() - start_time) * 1000  # ms
            cache_healthy = True
        except Exception:
            pass
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "system": {
            "memory": {"usage_percent": memory.percent, "available_gb": round(memory.available / (1024**3), 2)},
            "disk": {"usage_percent": round(disk.percent, 2), "free_gb": round(disk.free / (1024**3), 2)},
            "cpu": {"usage_percent": cpu_percent}
        },
        "services": {
            "database": {"healthy": db_healthy, "response_time_ms": db_response_time},
            "cache": {"healthy": cache_healthy, "response_time_ms": cache_response_time}
        }
    }

@router.get("/metrics/business", summary="Get Business KPIs (Admin Only)")
async def business_metrics(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserProfileResponse = Depends(get_current_user) # Use the correct schema
):
    """
    Provides key business intelligence metrics. Requires admin privileges.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # --- User Metrics ---
        total_users = await db.users.count_documents({})
        active_users = await db.users.count_documents({"is_active": True})
        
        # --- Credit Metrics ---
        pipeline = [{"$group": {"_id": None, "total": {"$sum": "$balance"}}}]
        result = await db.user_credits.aggregate(pipeline).to_list(1)
        total_credits = result[0]["total"] if result else 0
        
        # --- Usage & Revenue Metrics (last 30 days) ---
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        usage_stats = await db.usage_logs.aggregate([
            {"$match": {"created_at": {"$gte": thirty_days_ago}}},
            {"$group": {"_id": "$service_type", "count": {"$sum": 1}, "total_cost": {"$sum": "$cost"}}}
        ]).to_list(None)
        
        revenue_stats = await db.billing_transactions.aggregate([
            {"$match": {"created_at": {"$gte": thirty_days_ago}, "status": "completed"}},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$usd_amount"}, "count": {"$sum": 1}}}
        ]).to_list(1)
        
        total_revenue = revenue_stats[0]["total_revenue"] if revenue_stats else 0
        transaction_count = revenue_stats[0]["count"] if revenue_stats else 0
        
        return {
            "users": {"total": total_users, "active": active_users},
            "credits": {"total_balance": total_credits},
            "usage_last_30_days": {"by_service": usage_stats},
            "revenue_last_30_days": {"total_usd": total_revenue, "transaction_count": transaction_count}
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch business metrics: {str(e)}")

# --- Metric Tracking Helper Functions ---
def track_request_metrics(request, response, process_time):
    """Callable from a middleware to track request metrics."""
    path = request.url.path
    REQUEST_COUNT.labels(method=request.method, endpoint=path, status_code=response.status_code).inc()
    REQUEST_DURATION.labels(method=request.method, endpoint=path).observe(process_time)

def track_ai_request(service_type: str, model: str, status: str):
    """Callable from AI service layers to track AI model usage."""
    AI_REQUESTS_TOTAL.labels(service_type=service_type, model=model, status=status).inc()
