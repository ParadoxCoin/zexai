"""
Enhanced AI Provider Manager with Supabase Integration
Robust error handling, retry logic, fallback mechanisms, and real-time monitoring
"""

import asyncio
import httpx
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from enum import Enum
import json
from dataclasses import dataclass

from core.config import settings
from core.logger import app_logger as logger
from core.supabase_client import get_supabase_client, is_supabase_enabled
from core.database import get_database

class ProviderStatus(Enum):
    """Provider status enumeration"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    MAINTENANCE = "maintenance"

class ServiceType(Enum):
    """AI service types"""
    CHAT = "chat"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    SYNAPSE = "synapse"

@dataclass
class ProviderConfig:
    """Provider configuration"""
    name: str
    base_url: str
    api_key: str
    timeout: int = 30
    max_retries: int = 3
    retry_delay: float = 1.0
    rate_limit_per_minute: int = 60
    priority: int = 1  # Lower number = higher priority

@dataclass
class ProviderHealth:
    """Provider health status"""
    name: str
    status: ProviderStatus
    response_time: float
    error_rate: float
    last_check: datetime
    consecutive_failures: int = 0

class AIProviderManager:
    """Enhanced AI Provider Manager with Supabase integration"""
    
    def __init__(self):
        self.providers: Dict[ServiceType, List[ProviderConfig]] = {}
        self.health_status: Dict[str, ProviderHealth] = {}
        self.circuit_breakers: Dict[str, Dict[str, Any]] = {}
        self.request_counts: Dict[str, Dict[str, int]] = {}
        self._monitoring_task: Optional[asyncio.Task] = None
        
        # Initialize providers synchronously
        self._initialize_providers()
    
    def start_monitoring(self):
        """Starts the background health monitoring task."""
        if self._monitoring_task is None:
            logger.info("Starting AI provider health monitoring...")
            self._monitoring_task = asyncio.create_task(self._start_health_monitoring())
        else:
            logger.warning("Health monitoring is already running.")

    async def stop_monitoring(self):
        """Stops the background health monitoring task."""
        if self._monitoring_task and not self._monitoring_task.done():
            logger.info("Stopping AI provider health monitoring...")
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                logger.info("Health monitoring task stopped.")
        self._monitoring_task = None

    def _initialize_providers(self):
        """Initialize AI providers configuration"""
        
        # Chat providers
        self.providers[ServiceType.CHAT] = [
            ProviderConfig(
                name="fireworks",
                base_url="https://api.fireworks.ai/inference/v1",
                api_key=settings.FIREWORKS_API_KEY,
                priority=1
            ),
            ProviderConfig(
                name="openai",
                base_url="https://api.openai.com/v1",
                api_key=settings.OPENAI_API_KEY,
                priority=2
            )
        ]
        
        # Image providers
        self.providers[ServiceType.IMAGE] = [
            ProviderConfig(
                name="fal",
                base_url="https://fal.run/fal-ai",
                api_key=settings.FAL_API_KEY,
                priority=1
            ),
            ProviderConfig(
                name="replicate",
                base_url="https://api.replicate.com/v1",
                api_key=settings.REPLICATE_API_KEY,
                priority=2
            )
        ]
        
        # Video providers
        self.providers[ServiceType.VIDEO] = [
            ProviderConfig(
                name="pollo",
                base_url="https://api.pollo.ai/v1",
                api_key=settings.POLLO_API_KEY,
                priority=1
            ),
            ProviderConfig(
                name="replicate",
                base_url="https://api.replicate.com/v1",
                api_key=settings.REPLICATE_API_KEY,
                priority=2
            ),
            ProviderConfig(
                name="fal",
                base_url="https://fal.run/fal-ai",
                api_key=settings.FAL_API_KEY,
                priority=1
            ),
            ProviderConfig(
                name="piapi",
                base_url="https://api.piapi.ai/api",
                api_key=getattr(settings, "PIAPI_API_KEY", ""),
                priority=3
            ),
            ProviderConfig(
                name="goapi",
                base_url="https://api.goapi.ai",
                api_key=getattr(settings, "GOAPI_API_KEY", ""),
                priority=3
            )
        ]
        
        # Audio providers
        self.providers[ServiceType.AUDIO] = [
            ProviderConfig(
                name="elevenlabs",
                base_url="https://api.elevenlabs.io/v1",
                api_key=settings.ELEVENLABS_API_KEY,
                priority=1
            ),
            ProviderConfig(
                name="google_tts",
                base_url="https://texttospeech.googleapis.com/v1",
                api_key=settings.GOOGLE_TTS_API_KEY if hasattr(settings, 'GOOGLE_TTS_API_KEY') else "",
                priority=2
            )
        ]
        
        # Initialize health status
        for service_type, providers in self.providers.items():
            for provider in providers:
                if provider.api_key:  # Only track providers with API keys
                    self.health_status[provider.name] = ProviderHealth(
                        name=provider.name,
                        status=ProviderStatus.HEALTHY,
                        response_time=0.0,
                        error_rate=0.0,
                        last_check=datetime.utcnow()
                    )
                    
                    # Initialize circuit breaker
                    self.circuit_breakers[provider.name] = {
                        "state": "closed",  # closed, open, half-open
                        "failure_count": 0,
                        "last_failure": None,
                        "next_attempt": datetime.utcnow()
                    }
    
    async def _get_provider_api_key(self, provider_name: str, fallback_key: str) -> str:
        """
        Get provider API key - tries Key Vault first, then fallback to settings
        """
        # Try Key Vault first (encrypted storage)
        try:
            from core.key_vault import get_provider_key
            vault_key = await get_provider_key(provider_name)
            if vault_key:
                return vault_key
        except Exception:
            pass  # Vault not available, use fallback
        
        return fallback_key
    
    async def make_request(
        self,
        service_type: ServiceType,
        endpoint: str,
        data: Dict[str, Any],
        user_id: str,
        preferred_provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """Make AI provider request with fallback and error handling"""
        
        providers = self.providers.get(service_type, [])
        if not providers:
            raise Exception(f"No providers configured for {service_type.value}")
        
        # Filter providers with API keys
        available_providers = [p for p in providers if p.api_key]
        if not available_providers:
            raise Exception(f"No API keys configured for {service_type.value} providers")
        
        # Sort by priority and health
        available_providers.sort(key=lambda p: (
            p.priority,
            self.health_status.get(p.name, ProviderHealth("", ProviderStatus.DOWN, 0, 100, datetime.utcnow())).consecutive_failures
        ))
        
        # Try preferred provider first if specified and available
        if preferred_provider:
            preferred = next((p for p in available_providers if p.name == preferred_provider), None)
            if preferred and self._is_provider_available(preferred.name):
                available_providers.remove(preferred)
                available_providers.insert(0, preferred)
        
        last_error = None
        
        for provider in available_providers:
            if not self._is_provider_available(provider.name):
                continue
            
            try:
                # Check rate limits
                if not self._check_rate_limit(provider.name):
                    logger.warning(f"Rate limit exceeded for {provider.name}")
                    continue
                
                # Make request with retry logic
                result = await self._make_provider_request(provider, endpoint, data, user_id)
                
                # Update health status on success
                await self._update_health_status(provider.name, True, result.get("response_time", 0))
                
                # Log successful request
                await self._log_provider_request(provider.name, service_type.value, True, user_id)
                
                return {
                    "success": True,
                    "data": result,
                    "provider": provider.name,
                    "service_type": service_type.value
                }
                
            except Exception as e:
                last_error = e
                logger.error(f"Provider {provider.name} failed: {str(e)}")
                
                # Update health status on failure
                await self._update_health_status(provider.name, False, 0)
                
                # Log failed request
                await self._log_provider_request(provider.name, service_type.value, False, user_id, str(e))
                
                continue
        
        # All providers failed
        error_msg = f"All {service_type.value} providers failed. Last error: {str(last_error)}"
        logger.error(error_msg)
        
        # Notify via Supabase real-time
        await self._notify_provider_failure(service_type.value, user_id, error_msg)
        
        raise Exception(error_msg)
    
    async def _make_provider_request(
        self,
        provider: ProviderConfig,
        endpoint: str,
        data: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """Make request to specific provider with retry logic"""
        
        # Get API key from vault (with fallback to provider.api_key)
        api_key = await self._get_provider_api_key(provider.name, provider.api_key)
        
        for attempt in range(provider.max_retries + 1):
            try:
                start_time = datetime.utcnow()
                
                async with httpx.AsyncClient(timeout=provider.timeout) as client:
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "User-Agent": f"AI-SaaS-Platform/1.0 (user:{user_id})"
                    }
                    
                    # Provider-specific header adjustments
                    if provider.name == "fal":
                        headers["Authorization"] = f"Key {api_key}"
                    elif provider.name == "elevenlabs":
                        headers["xi-api-key"] = api_key
                        del headers["Authorization"]
                    
                    response = await client.post(
                        f"{provider.base_url}/{endpoint}",
                        headers=headers,
                        json=data
                    )
                    
                    response_time = (datetime.utcnow() - start_time).total_seconds()
                    
                    if response.status_code == 200:
                        result = response.json()
                        result["response_time"] = response_time
                        return result
                    
                    elif response.status_code == 429:  # Rate limited
                        if attempt < provider.max_retries:
                            wait_time = provider.retry_delay * (2 ** attempt)
                            logger.warning(f"Rate limited by {provider.name}, waiting {wait_time}s")
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            raise Exception(f"Rate limited by {provider.name}")
                    
                    else:
                        error_detail = response.text
                        raise Exception(f"HTTP {response.status_code}: {error_detail}")
            
            except httpx.TimeoutException:
                if attempt < provider.max_retries:
                    wait_time = provider.retry_delay * (2 ** attempt)
                    logger.warning(f"Timeout from {provider.name}, retrying in {wait_time}s")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    raise Exception(f"Timeout from {provider.name}")
            
            except Exception as e:
                if attempt < provider.max_retries:
                    wait_time = provider.retry_delay * (2 ** attempt)
                    logger.warning(f"Error from {provider.name}: {str(e)}, retrying in {wait_time}s")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    raise e
        
        raise Exception(f"All retry attempts failed for {provider.name}")
    
    def _is_provider_available(self, provider_name: str) -> bool:
        """Check if provider is available (circuit breaker logic)"""
        breaker = self.circuit_breakers.get(provider_name, {})
        
        if breaker.get("state") == "open":
            # Check if we should try again
            if datetime.utcnow() >= breaker.get("next_attempt", datetime.utcnow()):
                breaker["state"] = "half-open"
                return True
            return False
        
        return True
    
    def _check_rate_limit(self, provider_name: str) -> bool:
        """Check provider rate limits"""
        now = datetime.utcnow()
        minute_key = now.strftime("%Y-%m-%d-%H-%M")
        
        if provider_name not in self.request_counts:
            self.request_counts[provider_name] = {}
        
        current_count = self.request_counts[provider_name].get(minute_key, 0)
        provider_config = next(
            (p for providers in self.providers.values() for p in providers if p.name == provider_name),
            None
        )
        
        if provider_config and current_count >= provider_config.rate_limit_per_minute:
            return False
        
        # Increment counter
        self.request_counts[provider_name][minute_key] = current_count + 1
        
        # Cleanup old counters
        cutoff = (now - timedelta(minutes=2)).strftime("%Y-%m-%d-%H-%M")
        self.request_counts[provider_name] = {
            k: v for k, v in self.request_counts[provider_name].items() if k > cutoff
        }
        
        return True
    
    async def _update_health_status(self, provider_name: str, success: bool, response_time: float):
        """Update provider health status"""
        if provider_name not in self.health_status:
            return
        
        health = self.health_status[provider_name]
        health.last_check = datetime.utcnow()
        
        if success:
            health.consecutive_failures = 0
            health.response_time = response_time
            
            # Update circuit breaker
            breaker = self.circuit_breakers[provider_name]
            breaker["state"] = "closed"
            breaker["failure_count"] = 0
            
            # Determine status based on response time
            if response_time < 2.0:
                health.status = ProviderStatus.HEALTHY
            elif response_time < 5.0:
                health.status = ProviderStatus.DEGRADED
            else:
                health.status = ProviderStatus.DEGRADED
        
        else:
            health.consecutive_failures += 1
            
            # Update circuit breaker
            breaker = self.circuit_breakers[provider_name]
            breaker["failure_count"] += 1
            breaker["last_failure"] = datetime.utcnow()
            
            # Open circuit breaker after 5 consecutive failures
            if breaker["failure_count"] >= 5:
                breaker["state"] = "open"
                breaker["next_attempt"] = datetime.utcnow() + timedelta(minutes=5)
                health.status = ProviderStatus.DOWN
            else:
                health.status = ProviderStatus.DEGRADED
        
        # Sync to Supabase for real-time monitoring
        await self._sync_health_to_supabase(provider_name, health)
    
    async def _sync_health_to_supabase(self, provider_name: str, health: ProviderHealth):
        """Sync provider health to Supabase for real-time monitoring"""
        if not is_supabase_enabled():
            return
        
        try:
            supabase = get_supabase_client()
            if supabase:
                health_data = {
                    "provider_name": provider_name,
                    "status": health.status.value,
                    "response_time": health.response_time,
                    "error_rate": health.error_rate,
                    "consecutive_failures": health.consecutive_failures,
                    "last_check": health.last_check.isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                supabase.table("provider_health").upsert(health_data, on_conflict="provider_name").execute()
                
        except Exception as e:
            logger.warning(f"Failed to sync provider health to Supabase: {e}")
    
    async def _log_provider_request(
        self,
        provider_name: str,
        service_type: str,
        success: bool,
        user_id: str,
        error_message: str = None
    ):
        """Log provider request for analytics"""
        try:
            db = get_database()
            
            log_entry = {
                "provider_name": provider_name,
                "service_type": service_type,
                "success": success,
                "user_id": user_id,
                "error_message": error_message,
                "timestamp": datetime.utcnow()
            }
            
            await db.provider_requests.insert_one(log_entry)
            
        except Exception as e:
            logger.error(f"Failed to log provider request: {e}")
    
    async def _notify_provider_failure(self, service_type: str, user_id: str, error_message: str):
        """Notify about provider failure via Supabase real-time"""
        if not is_supabase_enabled():
            return
        
        try:
            supabase = get_supabase_client()
            if supabase:
                notification = {
                    "type": "provider_failure",
                    "service_type": service_type,
                    "user_id": user_id,
                    "error_message": error_message,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                supabase.table("system_notifications").insert(notification).execute()
                
        except Exception as e:
            logger.warning(f"Failed to notify provider failure: {e}")
    
    async def _start_health_monitoring(self):
        """Start background health monitoring"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                await self._perform_health_checks()
            except asyncio.CancelledError:
                logger.info("Health monitoring task is stopping.")
                break
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
    
    async def _perform_health_checks(self):
        """Perform health checks on all providers"""
        for service_type, providers in self.providers.items():
            for provider in providers:
                if not provider.api_key:
                    continue
                
                try:
                    # Simple health check request
                    start_time = datetime.utcnow()
                    
                    async with httpx.AsyncClient(timeout=10) as client:
                        # Provider-specific health check endpoints
                        health_endpoint = self._get_health_endpoint(provider.name)
                        if not health_endpoint:
                            continue
                        
                        headers = {"Authorization": f"Bearer {provider.api_key}"}
                        if provider.name == "elevenlabs":
                            headers = {"xi-api-key": provider.api_key}
                        
                        response = await client.get(
                            f"{provider.base_url}/{health_endpoint}",
                            headers=headers
                        )
                        
                        response_time = (datetime.utcnow() - start_time).total_seconds()
                        
                        if response.status_code == 200:
                            await self._update_health_status(provider.name, True, response_time)
                        else:
                            await self._update_health_status(provider.name, False, 0)
                
                except Exception as e:
                    await self._update_health_status(provider.name, False, 0)
    
    def _get_health_endpoint(self, provider_name: str) -> Optional[str]:
        """Get health check endpoint for provider"""
        health_endpoints = {
            "fireworks": "models",
            "openai": "models",
            "fal": "models",
            "replicate": "models",
            "elevenlabs": "voices",
            "pollo": "models"
        }
        
        return health_endpoints.get(provider_name)
    
    def get_provider_status(self) -> Dict[str, Any]:
        """Get current provider status"""
        status = {}
        
        for provider_name, health in self.health_status.items():
            breaker = self.circuit_breakers.get(provider_name, {})
            
            status[provider_name] = {
                "status": health.status.value,
                "response_time": health.response_time,
                "consecutive_failures": health.consecutive_failures,
                "last_check": health.last_check.isoformat(),
                "circuit_breaker_state": breaker.get("state", "closed"),
                "available": self._is_provider_available(provider_name)
            }
        
        return status

# Global provider manager instance
ai_provider_manager = AIProviderManager()
