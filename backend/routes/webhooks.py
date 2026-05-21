"""
Webhook handlers for external service callbacks.

NOTE: Production payment webhooks (LemonSqueezy, NowPayments, MetaMask) are
handled in billing.py with full HMAC signature verification.
These stub endpoints are intentionally closed to prevent fake-payment attacks.
"""
from fastapi import APIRouter, Request, HTTPException, status

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """
    Stripe is not a configured payment provider for this platform.
    Endpoint is closed to prevent spoofed payment callbacks.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Stripe is not a supported payment provider. This endpoint is disabled."
    )


@router.post("/pollo")
async def pollo_webhook(request: Request):
    """
    Legacy Pollo.ai callback stub — disabled.
    Pollo.ai generation status is now polled directly via the provider API.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This callback endpoint is no longer active."
    )


@router.get("/health")
async def webhook_health():
    """Webhook subsystem health check"""
    return {"status": "healthy", "note": "Active webhooks: /billing/webhooks/lemonsqueezy, /billing/webhooks/nowpayments"}

