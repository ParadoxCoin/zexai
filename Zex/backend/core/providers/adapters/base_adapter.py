"""
Base Video Provider Adapter
Abstract base class for all video generation provider adapters
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum


class VideoGenerationType(str, Enum):
    TEXT_TO_VIDEO = "text_to_video"
    IMAGE_TO_VIDEO = "image_to_video"
    VIDEO_TO_VIDEO = "video_to_video"


@dataclass
class VideoGenerationParams:
    """Standardized video generation parameters"""
    prompt: str
    model_id: str
    duration: int = 5
    aspect_ratio: str = "16:9"
    quality: Optional[str] = None
    mode: Optional[str] = None
    negative_prompt: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    seed: Optional[int] = None
    extra_params: Optional[Dict[str, Any]] = None


@dataclass
class VideoGenerationResult:
    """Standardized video generation result"""
    success: bool
    task_id: str
    status: str  # pending, processing, completed, failed
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    error_message: Optional[str] = None
    provider_response: Optional[Dict[str, Any]] = None


class BaseVideoAdapter(ABC):
    """Abstract base class for video provider adapters"""
    
    PROVIDER_NAME: str = "base"
    SUPPORTED_MODELS: List[str] = []
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url
    
    @abstractmethod
    def transform_params(self, params: VideoGenerationParams) -> Dict[str, Any]:
        """
        Transform standardized params to provider-specific format
        Each provider has different parameter names and formats
        """
        pass
    
    @abstractmethod
    async def generate_video(self, params: VideoGenerationParams) -> VideoGenerationResult:
        """
        Start video generation task
        Returns task_id and initial status
        """
        pass
    
    @abstractmethod
    async def get_task_status(self, task_id: str) -> VideoGenerationResult:
        """
        Get current status of video generation task
        """
        pass
    
    @abstractmethod
    async def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a running video generation task
        """
        pass
    
    def transform_aspect_ratio(self, aspect_ratio: str) -> str:
        """
        Transform aspect ratio to provider-specific format
        Override in subclass if provider uses different format
        Default: "16:9" -> "16:9"
        """
        return aspect_ratio
    
    def transform_duration(self, duration: int) -> Any:
        """
        Transform duration to provider-specific format
        Override in subclass if provider uses different format
        Default: 5 -> 5
        """
        return duration
    
    def transform_quality(self, quality: Optional[str]) -> Optional[Any]:
        """
        Transform quality to provider-specific format
        Override in subclass if provider uses different format
        """
        return quality
