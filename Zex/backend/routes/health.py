"""
Health check endpoints.

Security:
  - /health — public, minimal info (for load balancers/uptime monitors)
  - /health/detailed — admin-only, exposes memory/disk/Redis internals
"""
from fastapi import APIRouter, Depends, HTTPException
from core.database import get_db
from core.config import settings
from core.security import get_current_admin_user
import psutil
from redis.asyncio import Redis as AsyncRedis
from datetime import datetime

router = APIRouter(tags=["Health"])

async def get_redis_client() -> AsyncRedis:
    """Dependency to get a Redis client."""
    try:
        redis_client = AsyncRedis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        return redis_client
    except Exception as e:
        return None

@router.get("/health")
async def health_check(
    db = Depends(get_db),
    redis: AsyncRedis = Depends(get_redis_client)
):
    """
    Basic health check — publicly accessible for load balancers and uptime monitors.
    Returns minimal information only (no system internals).
    """
    db_status = "disconnected"
    try:
        if hasattr(db, "table"):
            db_status = "connected"
    except Exception:
        pass

    cache_status = "disconnected"
    if redis:
        try:
            cache_status = "connected"
        except Exception:
            pass

    if db_status == "disconnected":
        raise HTTPException(
            status_code=503,
            detail="Service unhealthy: Database connection failed."
        )

    return {
        "status": "healthy",
        "database": db_status,
        "cache": cache_status,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/health/detailed")
async def detailed_health_check(
    db = Depends(get_db),
    redis: AsyncRedis = Depends(get_redis_client),
    _admin = Depends(get_current_admin_user),  # Admin JWT required — exposes system internals
):
    """
    Detailed health status with system resources.
    Requires admin JWT — exposes memory, disk, and Redis internals.
    """
    checks = {}

    # Database check
    try:
        if hasattr(db, "table"):
            checks["database"] = {"status": "healthy"}
        else:
            checks["database"] = {"status": "unhealthy", "error": "Invalid database client"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}

    # Redis check
    if redis:
        try:
            checks["redis"] = {"status": "healthy"}
        except Exception as e:
            checks["redis"] = {"status": "unhealthy", "error": str(e)}
    else:
        checks["redis"] = {"status": "unhealthy", "error": "Redis client not available"}

    # System resource checks
    try:
        memory = psutil.virtual_memory()
        checks["memory"] = {
            "status": "healthy",
            "usage_percent": memory.percent,
            "available_gb": round(memory.available / (1024**3), 2)
        }

        disk = psutil.disk_usage('/')
        checks["disk"] = {
            "status": "healthy",
            "usage_percent": round((disk.used / disk.total) * 100, 2),
            "free_gb": round(disk.free / (1024**3), 2)
        }
    except Exception as e:
        checks["system_resources"] = {"status": "unhealthy", "error": str(e)}

    # Determine overall status
    is_healthy = all(check.get("status") == "healthy" for check in checks.values())

    if not is_healthy:
        raise HTTPException(
            status_code=503,
            detail={"status": "unhealthy", "checks": checks}
        )

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks
    }
