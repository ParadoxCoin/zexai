"""
Provider Failover Manager
Automatic failover to backup providers when primary fails
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from enum import Enum
import asyncio

from core.audit import AuditLogService, AuditAction, ResourceType


class ProviderStatus(str, Enum):
    """Provider health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    UNKNOWN = "unknown"


class FailoverConfig:
    """Configuration for failover behavior"""
    
    # Number of consecutive failures before marking provider as down
    FAILURE_THRESHOLD = 3
    
    # Seconds to wait before retrying a down provider
    RECOVERY_COOLDOWN = 300  # 5 minutes
    
    # Maximum response time (ms) before considering degraded
    DEGRADED_THRESHOLD_MS = 5000
    
    # Check interval for background health monitoring
    HEALTH_CHECK_INTERVAL = 60  # seconds


class ProviderHealthTracker:
    """Tracks health metrics for a single provider"""
    
    def __init__(self, provider_id: str, provider_name: str):
        self.provider_id = provider_id
        self.provider_name = provider_name
        self.consecutive_failures = 0
        self.total_requests = 0
        self.failed_requests = 0
        self.last_success: Optional[datetime] = None
        self.last_failure: Optional[datetime] = None
        self.last_response_time_ms: Optional[float] = None
        self.status = ProviderStatus.UNKNOWN
        self.marked_down_at: Optional[datetime] = None
        self.average_response_time_ms = 0.0
        self.response_times: List[float] = []
    
    def record_success(self, response_time_ms: float):
        """Record a successful request"""
        self.consecutive_failures = 0
        self.total_requests += 1
        self.last_success = datetime.utcnow()
        self.last_response_time_ms = response_time_ms
        self.marked_down_at = None
        
        # Track recent response times (keep last 20)
        self.response_times.append(response_time_ms)
        if len(self.response_times) > 20:
            self.response_times.pop(0)
        self.average_response_time_ms = sum(self.response_times) / len(self.response_times)
        
        # Update status
        if response_time_ms > FailoverConfig.DEGRADED_THRESHOLD_MS:
            self.status = ProviderStatus.DEGRADED
        else:
            self.status = ProviderStatus.HEALTHY
    
    def record_failure(self, error: str = None):
        """Record a failed request"""
        self.consecutive_failures += 1
        self.failed_requests += 1
        self.total_requests += 1
        self.last_failure = datetime.utcnow()
        
        # Check if should mark as down
        if self.consecutive_failures >= FailoverConfig.FAILURE_THRESHOLD:
            self.status = ProviderStatus.DOWN
            self.marked_down_at = datetime.utcnow()
        else:
            self.status = ProviderStatus.DEGRADED
    
    def is_available(self) -> bool:
        """Check if provider is available for requests"""
        if self.status == ProviderStatus.DOWN:
            # Check if cooldown has passed
            if self.marked_down_at:
                cooldown_end = self.marked_down_at + timedelta(seconds=FailoverConfig.RECOVERY_COOLDOWN)
                if datetime.utcnow() < cooldown_end:
                    return False
                # Cooldown passed, allow retry
                self.status = ProviderStatus.UNKNOWN
        return True
    
    def get_priority_score(self) -> float:
        """
        Calculate priority score for provider selection.
        Lower score = higher priority
        """
        score = 0.0
        
        # Status weight
        status_weights = {
            ProviderStatus.HEALTHY: 0,
            ProviderStatus.DEGRADED: 50,
            ProviderStatus.UNKNOWN: 75,
            ProviderStatus.DOWN: 1000
        }
        score += status_weights.get(self.status, 100)
        
        # Response time factor
        if self.average_response_time_ms > 0:
            score += self.average_response_time_ms / 100  # 1 point per 100ms
        
        # Failure rate factor
        if self.total_requests > 0:
            failure_rate = self.failed_requests / self.total_requests
            score += failure_rate * 100  # 100 points for 100% failure rate
        
        return score
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            "provider_id": self.provider_id,
            "provider_name": self.provider_name,
            "status": self.status.value,
            "consecutive_failures": self.consecutive_failures,
            "total_requests": self.total_requests,
            "failed_requests": self.failed_requests,
            "success_rate": round((1 - self.failed_requests / max(1, self.total_requests)) * 100, 2),
            "last_success": self.last_success.isoformat() if self.last_success else None,
            "last_failure": self.last_failure.isoformat() if self.last_failure else None,
            "avg_response_time_ms": round(self.average_response_time_ms, 2),
            "is_available": self.is_available(),
            "priority_score": round(self.get_priority_score(), 2)
        }


class FailoverManager:
    """
    Manages provider failover and health tracking.
    
    Usage:
        # Before making request
        provider = await failover_manager.get_best_provider("video")
        
        # After request
        failover_manager.record_success(provider_id, response_time_ms)
        # or
        failover_manager.record_failure(provider_id, error)
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.trackers: Dict[str, ProviderHealthTracker] = {}
        self.provider_priorities: Dict[str, List[str]] = {}  # category -> [provider_ids]
        self._initialized = True
    
    def register_provider(self, provider_id: str, provider_name: str, category: str = "general", priority: int = 0):
        """Register a provider for tracking"""
        if provider_id not in self.trackers:
            self.trackers[provider_id] = ProviderHealthTracker(provider_id, provider_name)
        
        # Add to category priorities
        if category not in self.provider_priorities:
            self.provider_priorities[category] = []
        if provider_id not in self.provider_priorities[category]:
            self.provider_priorities[category].append(provider_id)
    
    def record_success(self, provider_id: str, response_time_ms: float):
        """Record successful request for provider"""
        if provider_id in self.trackers:
            self.trackers[provider_id].record_success(response_time_ms)
    
    def record_failure(self, provider_id: str, error: str = None):
        """Record failed request for provider"""
        if provider_id in self.trackers:
            self.trackers[provider_id].record_failure(error)
    
    def get_provider_status(self, provider_id: str) -> Optional[ProviderHealthTracker]:
        """Get health tracker for specific provider"""
        return self.trackers.get(provider_id)
    
    def get_all_statuses(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all providers"""
        return {pid: tracker.to_dict() for pid, tracker in self.trackers.items()}
    
    def get_available_providers(self, category: str = "general") -> List[str]:
        """Get list of available providers for category, sorted by priority"""
        providers = self.provider_priorities.get(category, list(self.trackers.keys()))
        
        available = []
        for pid in providers:
            tracker = self.trackers.get(pid)
            if tracker and tracker.is_available():
                available.append((pid, tracker.get_priority_score()))
        
        # Sort by priority score (lower is better)
        available.sort(key=lambda x: x[1])
        return [pid for pid, _ in available]
    
    def get_best_provider(self, category: str = "general") -> Optional[str]:
        """Get the best available provider for category"""
        available = self.get_available_providers(category)
        return available[0] if available else None
    
    def get_fallback_chain(self, category: str = "general", exclude: List[str] = None) -> List[str]:
        """
        Get ordered list of providers to try (fallback chain).
        Excludes already failed providers.
        """
        exclude = exclude or []
        available = self.get_available_providers(category)
        return [pid for pid in available if pid not in exclude]
    
    async def execute_with_failover(
        self,
        category: str,
        operation: callable,
        max_retries: int = 3,
        db = None,
        user_id: str = None
    ) -> Tuple[str, Any]:
        """
        Execute operation with automatic failover.
        
        Args:
            category: Provider category (e.g., "video", "image")
            operation: Async function that takes provider_id and returns result
            max_retries: Maximum number of providers to try
            db: Database connection for audit logging
            user_id: User ID for audit logging
            
        Returns:
            Tuple of (provider_id, result)
            
        Raises:
            Exception if all providers fail
        """
        tried_providers = []
        last_error = None
        
        for attempt in range(max_retries):
            provider_id = self.get_best_provider(category)
            
            # Skip already tried providers
            while provider_id and provider_id in tried_providers:
                chain = self.get_fallback_chain(category, tried_providers)
                provider_id = chain[0] if chain else None
            
            if not provider_id:
                break
            
            tried_providers.append(provider_id)
            start_time = datetime.utcnow()
            
            try:
                result = await operation(provider_id)
                
                # Calculate response time
                response_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                self.record_success(provider_id, response_time_ms)
                
                return provider_id, result
                
            except Exception as e:
                last_error = e
                self.record_failure(provider_id, str(e))
                
                # Log failover attempt
                if db and user_id:
                    await AuditLogService.log(
                        db=db,
                        user_id=user_id,
                        action=AuditAction.UPDATE,
                        resource_type=ResourceType.PROVIDER,
                        resource_id=provider_id,
                        details=f"Provider failed, attempting failover. Error: {str(e)[:100]}",
                        success=False
                    )
                
                continue
        
        # All providers failed
        raise Exception(f"All providers failed. Last error: {last_error}")
    
    def set_provider_priority(self, category: str, provider_ids: List[str]):
        """Set priority order for providers in a category"""
        self.provider_priorities[category] = provider_ids
    
    def reset_provider(self, provider_id: str):
        """Reset a provider's health metrics"""
        if provider_id in self.trackers:
            name = self.trackers[provider_id].provider_name
            self.trackers[provider_id] = ProviderHealthTracker(provider_id, name)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary of all provider health"""
        total = len(self.trackers)
        healthy = sum(1 for t in self.trackers.values() if t.status == ProviderStatus.HEALTHY)
        degraded = sum(1 for t in self.trackers.values() if t.status == ProviderStatus.DEGRADED)
        down = sum(1 for t in self.trackers.values() if t.status == ProviderStatus.DOWN)
        
        return {
            "total_providers": total,
            "healthy": healthy,
            "degraded": degraded,
            "down": down,
            "unknown": total - healthy - degraded - down,
            "categories": list(self.provider_priorities.keys())
        }


# Global singleton instance
failover_manager = FailoverManager()


# Initialize common providers
def init_providers():
    """Initialize commonly used providers"""
    providers = [
        # Video providers
        ("piapi", "PiAPI", "video"),
        ("goapi", "GoAPI", "video"),
        ("fal", "Fal.ai", "video"),
        ("replicate", "Replicate", "video"),
        ("pollo", "Pollo.ai", "video"),
        ("kie", "KIE AI", "video"),
        # Chat/LLM providers
        ("openai", "OpenAI", "chat"),
        ("anthropic", "Anthropic", "chat"),
        ("fireworks", "Fireworks.ai", "chat"),
        ("openrouter", "OpenRouter", "chat"),
        ("gemini", "Google Gemini", "chat"),
        # Image providers
        ("fal", "Fal.ai", "image"),
        ("replicate", "Replicate", "image"),
        ("openai", "OpenAI", "image"),
    ]
    
    for pid, name, category in providers:
        failover_manager.register_provider(pid, name, category)


# Auto-initialize on import
init_providers()
