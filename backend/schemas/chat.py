"""
Chat service schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict


class ChatMessage(BaseModel):
    """Individual chat message for history"""
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    """Schema for chat completion request"""
    message: str = Field(..., min_length=1, max_length=10000)
    model: str = "llama-3.3-70b"
    conversation_id: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2000, ge=1, le=8000)
    system_prompt: Optional[str] = None
    history: Optional[List[Dict]] = None


class ChatResponse(BaseModel):
    """Schema for chat completion response"""
    response: str
    model: str
    tokens_used: int
    credits_charged: float
    response_time: float
    conversation_id: Optional[str] = None
