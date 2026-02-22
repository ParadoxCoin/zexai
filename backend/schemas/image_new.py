"""
Image generation schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class ImageType(str, Enum):
    text_to_image = "text_to_image"
    image_to_image = "image_to_image"
    controlnet = "controlnet"
    specialized = "specialized"
    upscaler = "upscaler"
    background_remover = "background_remover"
    text_to_video = "text_to_video"
    text_to_music = "text_to_music"


class AspectRatio(str, Enum):
    square = "1:1"
    landscape = "16:9"
    portrait = "9:16"
    wide = "21:9"
    ultra_wide = "32:9"


class ImageQuality(int, Enum):
    low = 3
    medium = 4
    high = 5


class ImageSpeed(str, Enum):
    very_fast = "very_fast"
    fast = "fast"
    medium = "medium"
    slow = "slow"


class SocialFormat(str, Enum):
    instagram_post = "instagram_post"
    instagram_story = "instagram_story"
    facebook_post = "facebook_post"
    twitter_post = "twitter_post"
    linkedin_post = "linkedin_post"


# Request Models
class ImageGenerateRequest(BaseModel):
    model_id: str
    prompt: str
    negative_prompt: Optional[str] = None
    aspect_ratio: Optional[AspectRatio] = AspectRatio.square
    num_images: int = Field(default=1, ge=1, le=10)
    seed: Optional[int] = None
    guidance_scale: Optional[float] = Field(default=7.5, ge=1.0, le=20.0)
    image_url: Optional[str] = None
    strength: Optional[float] = Field(default=0.75, ge=0.0, le=1.0)

    model_config = ConfigDict(protected_namespaces=())


class ImageToImageRequest(BaseModel):
    model_id: str
    image_url: str
    prompt: str
    negative_prompt: Optional[str] = None
    strength: float = Field(default=0.8, ge=0.1, le=1.0)
    num_images: int = Field(default=1, ge=1, le=4)


class ImageToolRequest(BaseModel):
    tool_id: str
    image_url: str
    prompt: Optional[str] = None
    image_url_2: Optional[str] = None  # For face swap


class SpecializedGeneratorRequest(BaseModel):
    generator_id: str
    prompt: str
    style: Optional[str] = None


class PromptEnhanceRequest(BaseModel):
    basic_prompt: str
    style: Optional[str] = None
    quality_boost: bool = True


# Response Models
class ImageModelInfo(BaseModel):
    id: str
    provider: str
    name: str
    type: ImageType
    credits: int
    quality: ImageQuality
    speed: ImageSpeed
    badge: Optional[str]
    example_url: str
    description: Optional[str]
    capabilities: Optional[dict] = {}

    model_config = ConfigDict(protected_namespaces=())


class ImageToolInfo(BaseModel):
    id: str
    name: str
    provider: str
    credits: int
    description: str
    icon: str
    requires_two_images: bool = False


class SpecializedGeneratorInfo(BaseModel):
    id: str
    name: str
    provider: str
    credits: int
    description: str
    icon: str
    example_url: str


class ImageGenerateResponse(BaseModel):
    success: bool
    task_id: str
    status: str
    credits_used: int
    model_used: str
    estimated_time: int

    model_config = ConfigDict(protected_namespaces=())


class ImageTaskStatus(BaseModel):
    task_id: str
    status: str
    progress: int
    image_urls: Optional[List[str]]
    thumbnail_urls: Optional[List[str]]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]


class PromptEnhanceResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str
    improvements: List[str]

