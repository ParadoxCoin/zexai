"""
Database schemas for generated media output logging and management
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List

class MediaOutput(BaseModel):
    """Schema for a generated media item stored in the database."""
    
    # Core Fields
    id: str = Field(..., description="Unique ID for the media item (e.g., UUID)")
    user_id: str = Field(..., description="ID of the user who generated the item")
    service_type: str = Field(..., description="Type of service (image, video, audio)")
    
    # Output File Information (optional for pending videos)
    file_url: Optional[str] = Field("", description="Public URL of the generated file (R2 URL)")
    thumbnail_url: Optional[str] = Field(None, description="URL of the low-res preview/thumbnail")
    
    # Generation Details
    prompt: str = Field(..., description="The prompt used for generation")
    model_name: Optional[str] = Field(None, description="The AI model used for generation")
    generation_details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Extra details (size, duration, parameters)")
    
    # Credit and Status
    credits_charged: Optional[float] = Field(0, description="Total credits deducted for this generation")
    status: str = Field("pending", description="Generation status (pending, completed, failed)")
    
    # Showcase and Library Management
    is_showcase: bool = Field(False, description="Whether the user wants this item to be displayed in the public showcase")
    
    # Timestamps
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = Field(None, description="Date when the item should be automatically deleted (for 2-month library)")

    class Config:
        # Allow extra fields for flexibility
        extra = "allow"
        
class MediaOutputList(BaseModel):
    """Schema for listing media outputs."""
    outputs: List[MediaOutput]
    
class ShowcaseUpdate(BaseModel):
    """Schema for updating the showcase status of a media item."""
    is_showcase: bool = Field(..., description="New showcase status")
