"""
Synapse (Agent) service schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class SynapseTaskCreate(BaseModel):
    """Schema for creating a new Synapse agent task"""
    objective: str = Field(..., min_length=10, max_length=5000, description="What the agent should accomplish")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context data for the task")
    constraints: Optional[List[str]] = Field(default=None, description="Constraints or rules for the agent")
    max_credits: Optional[int] = Field(default=150, description="Maximum Manus credits this task can consume")
    max_duration_minutes: Optional[int] = Field(default=30, description="Maximum duration in minutes")


class SynapseTaskResponse(BaseModel):
    """Schema for Synapse task response"""
    task_id: str
    status: str  # pending, running, completed, failed, clarification_needed
    objective: str
    created_at: datetime
    estimated_cost: float  # Estimated credit cost


class SynapseTaskStatus(BaseModel):
    """Schema for Synapse task status"""
    task_id: str
    status: str
    objective: str
    result_url: Optional[str] = None
    credits_consumed: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    current_step: Optional[str] = None


class SynapseLogEntry(BaseModel):
    """Schema for a single Synapse log entry"""
    log_message: str
    log_type: str  # info, error, user_question
    created_at: datetime


class SynapseLogsResponse(BaseModel):
    """Schema for Synapse task logs"""
    task_id: str
    logs: List[SynapseLogEntry]


class SynapseWebhookPayload(BaseModel):
    """Schema for incoming Manus API webhook"""
    task_id: str
    status: str
    outcome: Optional[Dict[str, Any]] = None
    usage: Optional[Dict[str, Any]] = None  # Contains credits_consumed, duration_seconds
    log_message: Optional[str] = None
    log_type: Optional[str] = None


class SynapseTaskListResponse(BaseModel):
    """Schema for listing Synapse tasks"""
    tasks: List[SynapseTaskStatus]
    total: int
    limit: int
    offset: int

