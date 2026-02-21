"""
Chat service schemas
"""
from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    """Schema for chat completion request"""
    message: str = Field(..., min_length=1, max_length=10000)
    model: str = "llama-v3p1-70b-instruct"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1000, ge=1, le=4000)


class ChatResponse(BaseModel):
    """Schema for chat completion response"""
    response: str
    model: str
    tokens_used: int
    credits_charged: float
    response_time: float

