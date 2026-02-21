"""
Webhook handlers for external service callbacks
"""
from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe payment webhooks"""
    return {"status": "ok", "message": "Webhook received"}


@router.post("/pollo")
async def pollo_webhook(request: Request):
    """Handle Pollo.ai generation callbacks"""
    return {"status": "ok", "message": "Webhook received"}


@router.get("/health")
async def webhook_health():
    """Webhook health check"""
    return {"status": "healthy"}
