"""
Media generation schemas (Image & Video)
"""
from pydantic import BaseModel, Field
from typing import Optional


class ImageRequest(BaseModel):
    """Schema for image generation request"""
    prompt: str = Field(..., min_length=1, max_length=2000)
    provider: str = "fal-flux-pro"
    size: str = "1024x1024"
    num_images: int = Field(default=1, ge=1, le=4)


class ImageResponse(BaseModel):
    """Schema for image generation response"""
    image_url: str
    provider: str
    size: str
    credits_charged: float
    generation_time: float


class VideoRequest(BaseModel):
    """Schema for video generation request"""
    prompt: str = Field(..., min_length=1, max_length=2000)
    provider: str = "pika"
    duration: int = Field(default=3, ge=1, le=10)  # seconds


class VideoResponse(BaseModel):
    """Schema for video generation response"""
    video_url: str
    provider: str
    duration: int
    credits_charged: float
    generation_time: float

