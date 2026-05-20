"""
Synapse (Agent) service routes
Handles autonomous agent tasks with asynchronous execution and credit-based billing
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from datetime import datetime
from typing import List
import httpx
import uuid
import hmac
import hashlib
import json

from schemas.synapse import (
    SynapseTaskCreate,
    SynapseTaskResponse,
    SynapseTaskStatus,
    SynapseLogsResponse,
    SynapseLogEntry,
    SynapseWebhookPayload,
    SynapseTaskListResponse
)
from core.security import get_current_user
from core.database import get_db
from core.credits import CreditManager
from services.synapse_service import synapse_service
from core.config import settings
from core.logger import app_logger as logger


router = APIRouter(prefix="/synapse", tags=["Synapse Agent"])


# The background task logic is now in synapse_service.py's call_manus_api method


@router.post("/tasks", response_model=SynapseTaskResponse)
async def create_synapse_task(
    request: SynapseTaskCreate,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Create a new Synapse agent task
    Task runs asynchronously in the background
    """
    # Create task and get initial response
    response = await synapse_service.create_synapse_task(request, current_user, db)
    
    # Start Manus API call in background
    background_tasks.add_task(
        synapse_service.call_manus_api,
        task_id=response.task_id,
        objective=request.objective,
        context=request.context,
        constraints=request.constraints,
        max_credits=request.max_credits,
        max_duration=request.max_duration_minutes,
        db=db
    )
    
    return response


@router.get("/tasks", response_model=SynapseTaskListResponse)
async def list_synapse_tasks(
    limit: int = 20,
    offset: int = 0,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    List Synapse agent tasks for the current user
    """
    return await synapse_service.list_tasks(current_user.id, db, limit, offset)


@router.get("/tasks/{task_id}", response_model=SynapseTaskStatus)
async def get_task_status(
    task_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get the status of a Synapse task
    """
    return await synapse_service.get_task_status(task_id, current_user.id, db)


@router.get("/tasks/{task_id}/logs", response_model=SynapseLogsResponse)
async def get_task_logs(
    task_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get all logs for a Synapse task (for Agent Interaction/Log Screen)
    """
    return await synapse_service.get_task_logs(task_id, current_user.id, db)


@router.post("/webhook")
async def manus_webhook(
    request: Request,
    db = Depends(get_db)
):
    """
    Webhook endpoint for Manus API callbacks
    Receives task status updates, logs, and completion notifications
    """
    # 1. Secure signature verification
    if not settings.SYNAPSE_WEBHOOK_SECRET or settings.SYNAPSE_WEBHOOK_SECRET == "super_secure_synapse_webhook_secret_2026":
        if not settings.DEBUG:
            logger.error("SYNAPSE_WEBHOOK_SECRET is not configured or is using the default insecure value in production")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Webhook authentication is misconfigured"
            )
        else:
            logger.warning("SYNAPSE_WEBHOOK_SECRET is using default insecure value in DEBUG mode")

    signature = request.headers.get("X-Synapse-Signature")
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature header is missing"
        )
    
    # Read raw body bytes
    body = await request.body()
    
    # Compute signature using settings.SYNAPSE_WEBHOOK_SECRET
    secret_bytes = settings.SYNAPSE_WEBHOOK_SECRET.encode("utf-8")
    computed_signature = hmac.new(
        secret_bytes,
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(computed_signature, signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature"
        )
    
    # Parse payload manually
    try:
        data = json.loads(body)
        payload = SynapseWebhookPayload(**data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid webhook payload: {str(e)}"
        )
        
    return await synapse_service.handle_manus_webhook(payload, db)

