"""
Video Provider Adapters Package
Export all video provider adapters and factory function
"""
from typing import Optional
from .base_adapter import (
    BaseVideoAdapter,
    VideoGenerationParams,
    VideoGenerationResult,
    VideoGenerationType
)
from .fal_adapter import FalAIAdapter
from .goapi_adapter import GoAPIAdapter, PiAPIAdapter
from .replicate_adapter import ReplicateAdapter
from .kie_adapter import KieAIAdapter
from .pollo_adapter import PolloVideoAdapter


# Provider registry
PROVIDER_ADAPTERS = {
    "fal": FalAIAdapter,
    "goapi": GoAPIAdapter,
    "piapi": PiAPIAdapter,
    "replicate": ReplicateAdapter,
    "kie": KieAIAdapter,
    "pollo": PolloVideoAdapter,
}


def get_video_adapter(
    provider_name: str,
    api_key: str,
    **kwargs
) -> Optional[BaseVideoAdapter]:
    """
    Factory function to get video adapter by provider name
    
    Args:
        provider_name: Name of the provider (fal, goapi, piapi, replicate, kie)
        api_key: API key for the provider
        **kwargs: Additional provider-specific arguments
    
    Returns:
        Video adapter instance or None if provider not found
    """
    adapter_class = PROVIDER_ADAPTERS.get(provider_name.lower())
    if adapter_class:
        return adapter_class(api_key, **kwargs)
    return None


def get_supported_providers() -> list:
    """Get list of supported provider names"""
    return list(PROVIDER_ADAPTERS.keys())


__all__ = [
    # Base classes
    "BaseVideoAdapter",
    "VideoGenerationParams", 
    "VideoGenerationResult",
    "VideoGenerationType",
    # Adapters
    "FalAIAdapter",
    "GoAPIAdapter",
    "PiAPIAdapter",
    "ReplicateAdapter",
    "KieAIAdapter",
    "PolloVideoAdapter",
    # Factory
    "get_video_adapter",
    "get_supported_providers",
    "PROVIDER_ADAPTERS",
]
