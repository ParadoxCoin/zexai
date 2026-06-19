"""
Redis caching service for improved performance
"""
import json
import redis
import asyncio
from typing import Any, Optional, Union
from datetime import timedelta
import logging
from core.config import settings

logger = logging.getLogger(__name__)

class CacheService:
    """Redis-based caching service"""
    
    def __init__(self):
        self.redis_client = None
        self._connect()
    
    def _connect(self):
        """Connect to Redis"""
        try:
            redis_url = settings.REDIS_URL if hasattr(settings, 'REDIS_URL') else "redis://localhost:6379"
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            logger.info("✅ Connected to Redis cache")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Caching disabled.")
            self.redis_client = None
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.redis_client:
            return None
        
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL"""
        if not self.redis_client:
            return False
        
        try:
            serialized_value = json.dumps(value, default=str)
            if ttl:
                self.redis_client.setex(key, ttl, serialized_value)
            else:
                self.redis_client.set(key, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.redis_client:
            return False
        
        try:
            result = self.redis_client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.redis_client:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.redis_client:
            return False
        
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Cache exists error: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment numeric value in cache"""
        if not self.redis_client:
            return None
        
        try:
            return self.redis_client.incrby(key, amount)
        except Exception as e:
            logger.error(f"Cache increment error: {e}")
            return None


# Global cache instance
cache_service = CacheService()


# Cache decorator for functions
def cache_result(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results
    
    Args:
        ttl: Time to live in seconds (default: 5 minutes)
        key_prefix: Prefix for cache key
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = await cache_service.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_service.set(cache_key, result, ttl)
            logger.debug(f"Cached result for {cache_key}")
            
            return result
        return wrapper
    return decorator


# Cache key generators
class CacheKeys:
    """Standard cache key patterns"""
    
    @staticmethod
    def user_balance(user_id: str) -> str:
        return f"user:balance:{user_id}"
    
    @staticmethod
    def service_costs() -> str:
        return "service:costs"
    
    @staticmethod
    def ai_models(service_type: str) -> str:
        return f"models:{service_type}"
    
    @staticmethod
    def user_stats(user_id: str) -> str:
        return f"user:stats:{user_id}"
    
    @staticmethod
    def platform_stats() -> str:
        return "platform:stats"
    
    @staticmethod
    def recent_users(limit: int) -> str:
        return f"users:recent:{limit}"
    
    @staticmethod
    def top_models(limit: int) -> str:
        return f"models:top:{limit}"


# Cache invalidation helpers
class CacheInvalidation:
    """Helper functions for cache invalidation"""
    
    @staticmethod
    async def invalidate_user_data(user_id: str):
        """Invalidate all user-related cache"""
        patterns = [
            f"user:balance:{user_id}",
            f"user:stats:{user_id}",
            f"user:*:{user_id}"
        ]
        
        for pattern in patterns:
            await cache_service.delete_pattern(pattern)
        logger.info(f"Invalidated user cache for {user_id}")
    
    @staticmethod
    async def invalidate_platform_stats():
        """Invalidate platform statistics cache"""
        await cache_service.delete_pattern("platform:*")
        await cache_service.delete_pattern("users:*")
        await cache_service.delete_pattern("models:top:*")
        logger.info("Invalidated platform stats cache")
    
    @staticmethod
    async def invalidate_service_costs():
        """Invalidate service costs cache"""
        await cache_service.delete(CacheKeys.service_costs())
        logger.info("Invalidated service costs cache")

