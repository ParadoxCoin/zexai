"""
Video generation schemas for Pollo.ai integration
Supports 40+ models and 20+ effects
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class VideoType(str, Enum):
    """Video generation types"""
    TEXT_TO_VIDEO = "text_to_video"
    IMAGE_TO_VIDEO = "image_to_video"
    VIDEO_TO_VIDEO = "video_to_video"


class VideoQuality(int, Enum):
    """Video quality rating (1-5 stars)"""
    BASIC = 1
    GOOD = 2
    GREAT = 3
    EXCELLENT = 4
    PREMIUM = 5


class VideoSpeed(str, Enum):
    """Video generation speed"""
    VERY_FAST = "very_fast"
    FAST = "fast"
    MEDIUM = "medium"
    SLOW = "slow"


class SocialMediaFormat(str, Enum):
    """Social media export formats"""
    MP4_1080P = "mp4_1080p"
    INSTAGRAM_REELS = "instagram_reels"
    TIKTOK = "tiktok"
    YOUTUBE_SHORTS = "youtube_shorts"


class ModelParameter(BaseModel):
    """Schema for a single model parameter"""
    label: str
    type: str  # 'enum', 'range', 'boolean'
    values: Optional[List] = None  # For enum type
    min: Optional[float] = None  # For range type
    max: Optional[float] = None  # For range type
    step: Optional[float] = None  # For range type
    default: Optional[Any] = None
    mapping_type: Optional[str] = None  # 'argument', 'sku_switch', 'sku_suffix'
    sku_map: Optional[Dict[str, str]] = None
    description: Optional[str] = None


class ModelCapabilities(BaseModel):
    """Schema for model capabilities"""
    parameters: Optional[Dict[str, ModelParameter]] = None


class VideoModelInfo(BaseModel):
    """Schema for video model information"""
    id: str
    provider: str
    name: str
    type: VideoType
    duration: Optional[int] = 5  # seconds - made optional as capabilities may define it
    credits: int  # cost in app credits
    quality: VideoQuality
    speed: VideoSpeed
    badge: Optional[str] = None  # e.g., "🔥 En Yeni!", "⭐ En Kaliteli!"
    example_video_url: Optional[str] = None
    description: Optional[str] = None
    capabilities: Optional[Dict] = None  # Dynamic capabilities for the model


class VideoGenerateRequest(BaseModel):
    """Schema for video generation request"""
    model_id: str = Field(..., description="Selected model ID")
    prompt: str = Field(..., min_length=3, max_length=2000, description="Text prompt for video generation")
    image_url: Optional[str] = Field(None, description="Image URL for image-to-video (optional)")
    video_url: Optional[str] = Field(None, description="Video URL for video-to-video (optional)")
    aspect_ratio: Optional[str] = Field("16:9", description="Aspect ratio: 16:9, 9:16, 1:1")
    negative_prompt: Optional[str] = Field(None, description="What to avoid in the video")
    
    # Dynamic Parameters supported by Capabilities System
    duration: Optional[int] = Field(None, description="Target video duration in seconds")
    resolution: Optional[str] = Field(None, description="Target video resolution e.g. 720p, 1080p")
    quality: Optional[str] = Field(None, description="Quality preset e.g. standard, high, premium")


class VideoGenerateResponse(BaseModel):
    """Schema for video generation response"""
    success: bool
    task_id: str
    status: str  # pending, processing, completed, failed
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    credits_used: int
    model_used: str
    download_formats: Optional[Dict[str, str]] = None
    estimated_time: Optional[int] = None  # seconds


class VideoEffectInfo(BaseModel):
    """Schema for video effect information"""
    id: str
    name: str
    description: str
    credits: int
    icon: str  # emoji
    example_url: Optional[str] = None
    requires_two_images: bool = False  # e.g., AI Kissing needs 2 faces
    category: Optional[str] = None  # romantic, transform, fun, animation, avatar, time, style, motion, background


class VideoEffectRequest(BaseModel):
    """Schema for applying video effect"""
    effect_id: str
    image_url: str
    image_url_2: Optional[str] = None  # For effects requiring 2 images


class EffectPackage(BaseModel):
    """Schema for effect package (bundle)"""
    id: str
    name: str
    description: str
    effects: List[str]  # List of effect IDs
    total_credits: int
    discount_percent: float
    icon: str


class VideoTaskStatus(BaseModel):
    """Schema for video task status"""
    task_id: str
    status: str  # pending, processing, completed, failed
    progress: int  # 0-100
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class SocialMediaExportRequest(BaseModel):
    """Schema for social media export"""
    video_url: str
    format: SocialMediaFormat
    add_watermark: bool = False

