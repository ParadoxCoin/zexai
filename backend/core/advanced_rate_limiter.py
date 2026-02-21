"""
Advanced Rate Limiter
Provides sophisticated rate limiting with user-specific and IP-based limits
"""
from fastapi import Request, HTTPException, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Dict, Optional, Callable
import time
import asyncio
from datetime import datetime, timedelta
import redis
from core.config import settings
from core.logger import app_logger as logger

class AdvancedRateLimiter:
    """Advanced rate limiter with multiple strategies and tier support"""
    
    def __init__(self):
        self.redis_client = None
        self._connect_redis()
        self._tier_limits_cache = {}
        self._cache_expires_at = 0
        
        # Default rate limit configurations (fallback if DB unavailable)
        self.default_limits = {
            "free": {
                "image": {"per_minute": 5, "per_hour": 30, "per_day": 100, "burst": 2},
                "video": {"per_minute": 2, "per_hour": 10, "per_day": 30, "burst": 1},
                "chat": {"per_minute": 10, "per_hour": 100, "per_day": 500, "burst": 3},
                "synapse": {"per_minute": 3, "per_hour": 20, "per_day": 50, "burst": 1},
                "api": {"per_minute": 30, "per_hour": 500, "per_day": 2000, "burst": 10},
            },
            "basic": {
                "image": {"per_minute": 20, "per_hour": 200, "per_day": 1000, "burst": 5},
                "video": {"per_minute": 5, "per_hour": 50, "per_day": 200, "burst": 2},
                "chat": {"per_minute": 50, "per_hour": 500, "per_day": 3000, "burst": 10},
                "synapse": {"per_minute": 10, "per_hour": 100, "per_day": 500, "burst": 3},
                "api": {"per_minute": 100, "per_hour": 2000, "per_day": 10000, "burst": 20},
            },
            "pro": {
                "image": {"per_minute": 100, "per_hour": 1000, "per_day": 5000, "burst": 20},
                "video": {"per_minute": 20, "per_hour": 200, "per_day": 1000, "burst": 5},
                "chat": {"per_minute": 200, "per_hour": 2000, "per_day": 15000, "burst": 30},
                "synapse": {"per_minute": 50, "per_hour": 500, "per_day": 3000, "burst": 10},
                "api": {"per_minute": 500, "per_hour": 10000, "per_day": 50000, "burst": 50},
            },
            "enterprise": {
                "image": {"per_minute": 500, "per_hour": 5000, "per_day": 50000, "burst": 50},
                "video": {"per_minute": 100, "per_hour": 1000, "per_day": 10000, "burst": 20},
                "chat": {"per_minute": 1000, "per_hour": 10000, "per_day": 100000, "burst": 100},
                "synapse": {"per_minute": 200, "per_hour": 2000, "per_day": 20000, "burst": 30},
                "api": {"per_minute": 2000, "per_hour": 50000, "per_day": 500000, "burst": 200},
            },
            "admin": {
                # Admins have very high limits
                "image": {"per_minute": 9999, "per_hour": 99999, "per_day": 999999, "burst": 500},
                "video": {"per_minute": 9999, "per_hour": 99999, "per_day": 999999, "burst": 500},
                "chat": {"per_minute": 9999, "per_hour": 99999, "per_day": 999999, "burst": 500},
                "synapse": {"per_minute": 9999, "per_hour": 99999, "per_day": 999999, "burst": 500},
                "api": {"per_minute": 9999, "per_hour": 99999, "per_day": 999999, "burst": 500},
            }
        }
        
        # Legacy limits for backward compatibility
        self.limits = {
            "auth": {"per_ip": "10/minute", "per_user": "20/minute"},
            "ai_generation": {"per_ip": "30/minute", "per_user": "100/minute", "per_user_premium": "500/minute"},
            "api_calls": {"per_ip": "100/minute", "per_user": "1000/minute", "per_user_premium": "5000/minute"},
            "file_upload": {"per_ip": "20/minute", "per_user": "50/minute"}
        }
    
    def _connect_redis(self):
        """Connect to Redis for rate limiting storage"""
        try:
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info("✅ Connected to Redis for rate limiting")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Using in-memory rate limiting.")
            self.redis_client = None
    
    async def check_rate_limit(self, 
                              request: Request, 
                              limit_type: str, 
                              user_id: Optional[str] = None,
                              user_role: Optional[str] = "user") -> bool:
        """
        Check if request is within rate limits
        
        Args:
            request: FastAPI request object
            limit_type: Type of limit to check (auth, ai_generation, etc.)
            user_id: User ID if authenticated
            user_role: User role (user, premium, admin)
        
        Returns:
            True if within limits, raises HTTPException if exceeded
        """
        ip_address = get_remote_address(request)
        current_time = int(time.time())
        
        # Get limit configuration
        limits_config = self.limits.get(limit_type, {})
        
        # Check IP-based limits
        ip_limit = limits_config.get("per_ip")
        if ip_limit:
            if not await self._check_limit(f"ip:{ip_address}:{limit_type}", ip_limit, current_time):
                logger.warning(f"Rate limit exceeded for IP {ip_address} on {limit_type}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded for IP address. Limit: {ip_limit}"
                )
        
        # Check user-based limits if authenticated
        if user_id:
            # Determine user limit based on role
            if user_role == "admin":
                # Admins have no limits
                return True
            elif user_role == "premium":
                user_limit = limits_config.get("per_user_premium") or limits_config.get("per_user")
            else:
                user_limit = limits_config.get("per_user")
            
            if user_limit:
                if not await self._check_limit(f"user:{user_id}:{limit_type}", user_limit, current_time):
                    logger.warning(f"Rate limit exceeded for user {user_id} on {limit_type}")
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded for user. Limit: {user_limit}"
                    )
        
        return True
    
    async def _check_limit(self, key: str, limit: str, current_time: int) -> bool:
        """
        Check individual rate limit
        
        Args:
            key: Redis key for the limit
            limit: Limit string (e.g., "10/minute")
            current_time: Current timestamp
        
        Returns:
            True if within limit, False if exceeded
        """
        # Parse limit string
        count, period = limit.split("/")
        count = int(count)
        
        period_seconds = {
            "second": 1,
            "minute": 60,
            "hour": 3600,
            "day": 86400
        }.get(period, 60)
        
        if self.redis_client:
            return await self._check_redis_limit(key, count, period_seconds, current_time)
        else:
            return await self._check_memory_limit(key, count, period_seconds, current_time)
    
    async def _check_redis_limit(self, key: str, count: int, period_seconds: int, current_time: int) -> bool:
        """Check rate limit using Redis"""
        try:
            # Use Redis sliding window
            window_start = current_time - period_seconds
            
            # Remove old entries
            self.redis_client.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            current_count = self.redis_client.zcard(key)
            
            if current_count >= count:
                return False
            
            # Add current request
            self.redis_client.zadd(key, {str(current_time): current_time})
            self.redis_client.expire(key, period_seconds)
            
            return True
            
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            # Fallback to allowing request if Redis fails
            return True
    
    async def _check_memory_limit(self, key: str, count: int, period_seconds: int, current_time: int) -> bool:
        """Check rate limit using in-memory storage (fallback)"""
        # Simple in-memory implementation
        # Note: This won't work across multiple processes
        if not hasattr(self, '_memory_store'):
            self._memory_store = {}
        
        if key not in self._memory_store:
            self._memory_store[key] = []
        
        # Clean old entries
        window_start = current_time - period_seconds
        self._memory_store[key] = [
            timestamp for timestamp in self._memory_store[key] 
            if timestamp > window_start
        ]
        
        # Check limit
        if len(self._memory_store[key]) >= count:
            return False
        
        # Add current request
        self._memory_store[key].append(current_time)
        return True
    
    async def get_rate_limit_status(self, 
                                   request: Request, 
                                   limit_type: str, 
                                   user_id: Optional[str] = None) -> Dict[str, int]:
        """
        Get current rate limit status
        
        Returns:
            Dictionary with remaining requests and reset time
        """
        ip_address = get_remote_address(request)
        current_time = int(time.time())
        
        limits_config = self.limits.get(limit_type, {})
        status = {}
        
        # IP limit status
        ip_limit = limits_config.get("per_ip")
        if ip_limit:
            count, period = ip_limit.split("/")
            count = int(count)
            period_seconds = {"minute": 60, "hour": 3600, "day": 86400}.get(period, 60)
            
            key = f"ip:{ip_address}:{limit_type}"
            used = await self._get_current_usage(key, period_seconds, current_time)
            
            status["ip"] = {
                "limit": count,
                "used": used,
                "remaining": max(0, count - used),
                "reset_time": current_time + period_seconds
            }
        
        # User limit status
        if user_id:
            user_limit = limits_config.get("per_user")
            if user_limit:
                count, period = user_limit.split("/")
                count = int(count)
                period_seconds = {"minute": 60, "hour": 3600, "day": 86400}.get(period, 60)
                
                key = f"user:{user_id}:{limit_type}"
                used = await self._get_current_usage(key, period_seconds, current_time)
                
                status["user"] = {
                    "limit": count,
                    "used": used,
                    "remaining": max(0, count - used),
                    "reset_time": current_time + period_seconds
                }
        
        return status
    
    async def _get_current_usage(self, key: str, period_seconds: int, current_time: int) -> int:
        """Get current usage count for a key"""
        if self.redis_client:
            try:
                window_start = current_time - period_seconds
                self.redis_client.zremrangebyscore(key, 0, window_start)
                return self.redis_client.zcard(key)
            except Exception:
                return 0
        else:
            if not hasattr(self, '_memory_store') or key not in self._memory_store:
                return 0
            
            window_start = current_time - period_seconds
            valid_requests = [
                timestamp for timestamp in self._memory_store[key] 
                if timestamp > window_start
            ]
            return len(valid_requests)

# Global instance
advanced_limiter = AdvancedRateLimiter()

# Decorator for easy rate limiting
def rate_limit(limit_type: str):
    """
    Decorator for rate limiting endpoints
    
    Args:
        limit_type: Type of limit to apply
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request and user info from function arguments
            request = None
            user_id = None
            user_role = "user"
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif hasattr(arg, 'id'):  # User object
                    user_id = arg.id
                    user_role = getattr(arg, 'role', 'user')
            
            if request:
                await advanced_limiter.check_rate_limit(
                    request, limit_type, user_id, user_role
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Specific rate limit decorators
def auth_rate_limit(func):
    """Rate limit for authentication endpoints"""
    return rate_limit("auth")(func)

def ai_generation_rate_limit(func):
    """Rate limit for AI generation endpoints"""
    return rate_limit("ai_generation")(func)

def api_rate_limit(func):
    """Rate limit for general API endpoints"""
    return rate_limit("api_calls")(func)

def file_upload_rate_limit(func):
    """Rate limit for file upload endpoints"""
    return rate_limit("file_upload")(func)

# Alias for backward compatibility
rate_limit_generation = ai_generation_rate_limit


# ===============================================
# Enhanced Tier-Based Rate Limiting (Phase 8)
# ===============================================

async def check_service_rate_limit(
    request: Request,
    service_type: str,
    user_id: Optional[str] = None,
    user_tier: str = "free",
    db = None
) -> bool:
    """
    Check tier-based rate limit for a specific service
    
    Args:
        request: FastAPI request object
        service_type: Type of service (image, video, chat, synapse, api)
        user_id: User ID
        user_tier: User's subscription tier (free, basic, pro, enterprise, admin)
        db: Database connection (optional, for violation logging)
    
    Returns:
        True if within limits, raises HTTPException if exceeded
    """
    ip_address = get_remote_address(request)
    current_time = int(time.time())
    
    # Get limits for this tier and service
    tier_limits = advanced_limiter.default_limits.get(user_tier, advanced_limiter.default_limits["free"])
    service_limits = tier_limits.get(service_type, tier_limits.get("api", {"per_minute": 10}))
    
    per_minute = service_limits.get("per_minute", 10)
    burst_limit = service_limits.get("burst", 5)
    
    # Create unique keys for rate limiting
    minute_key = f"rl:{user_id or ip_address}:{service_type}:min"
    burst_key = f"rl:{user_id or ip_address}:{service_type}:burst"
    
    # Check burst limit (10-second window)
    if not await advanced_limiter._check_time_limit(burst_key, burst_limit, 10, current_time):
        await _log_violation(db, user_id, ip_address, service_type, "burst", burst_limit, request)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Çok hızlı istek! 10 saniyede maksimum {burst_limit} istek."
        )
    
    # Check per-minute limit
    if not await advanced_limiter._check_time_limit(minute_key, per_minute, 60, current_time):
        await _log_violation(db, user_id, ip_address, service_type, "per_minute", per_minute, request)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit aşıldı! Dakikada maksimum {per_minute} istek ({user_tier} tier)."
        )
    
    return True


async def _log_violation(
    db, 
    user_id: Optional[str], 
    ip_address: str, 
    service_type: str, 
    limit_type: str, 
    limit_value: int,
    request: Request
):
    """Log rate limit violation to database"""
    if not db:
        logger.warning(f"Rate limit violation: {ip_address} - {service_type} - {limit_type}")
        return
    
    try:
        db.table("rate_limit_violations").insert({
            "user_id": user_id,
            "ip_address": ip_address,
            "service_type": service_type,
            "limit_type": limit_type,
            "limit_value": limit_value,
            "current_usage": limit_value + 1,
            "endpoint": str(request.url.path),
            "user_agent": request.headers.get("user-agent", "")[:500]
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log rate limit violation: {e}")


# Add time-based limit check method to AdvancedRateLimiter
original_init = AdvancedRateLimiter.__init__

def enhanced_init(self):
    original_init(self)
    self._check_time_limit = self._check_time_limit_method

AdvancedRateLimiter.__init__ = enhanced_init

async def _check_time_limit_method(self, key: str, limit: int, period_seconds: int, current_time: int) -> bool:
    """Check rate limit within a time period"""
    if self.redis_client:
        try:
            window_start = current_time - period_seconds
            self.redis_client.zremrangebyscore(key, 0, window_start)
            current_count = self.redis_client.zcard(key)
            
            if current_count >= limit:
                return False
            
            self.redis_client.zadd(key, {str(current_time): current_time})
            self.redis_client.expire(key, period_seconds)
            return True
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            return True
    else:
        # Fallback to in-memory
        if not hasattr(self, '_memory_store'):
            self._memory_store = {}
        
        if key not in self._memory_store:
            self._memory_store[key] = []
        
        window_start = current_time - period_seconds
        self._memory_store[key] = [t for t in self._memory_store[key] if t > window_start]
        
        if len(self._memory_store[key]) >= limit:
            return False
        
        self._memory_store[key].append(current_time)
        return True

AdvancedRateLimiter._check_time_limit_method = _check_time_limit_method


# Service-specific decorators with tier support
def image_rate_limit(tier: str = "free"):
    """Rate limit for image generation endpoints"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user = None
            user_tier = tier
            for arg in args:
                if hasattr(arg, 'id'):
                    user = arg
                    # Get tier from subscription if available
                    user_tier = getattr(arg, 'subscription_tier', tier)
            
            await check_service_rate_limit(request, "image", str(user.id) if user else None, user_tier)
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

def video_rate_limit(tier: str = "free"):
    """Rate limit for video generation endpoints"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user = None
            user_tier = tier
            for arg in args:
                if hasattr(arg, 'id'):
                    user = arg
                    user_tier = getattr(arg, 'subscription_tier', tier)
            
            await check_service_rate_limit(request, "video", str(user.id) if user else None, user_tier)
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

def chat_rate_limit(tier: str = "free"):
    """Rate limit for chat endpoints"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user = None
            user_tier = tier
            for arg in args:
                if hasattr(arg, 'id'):
                    user = arg
                    user_tier = getattr(arg, 'subscription_tier', tier)
            
            await check_service_rate_limit(request, "chat", str(user.id) if user else None, user_tier)
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

def synapse_rate_limit(tier: str = "free"):
    """Rate limit for synapse/agent endpoints"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user = None
            user_tier = tier
            for arg in args:
                if hasattr(arg, 'id'):
                    user = arg
                    user_tier = getattr(arg, 'subscription_tier', tier)
            
            await check_service_rate_limit(request, "synapse", str(user.id) if user else None, user_tier)
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator