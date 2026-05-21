"""
Payment Service — ZexAI
Handles LemonSqueezy (card) and NowPayments (crypto) integrations.
All DB operations use Supabase (not MongoDB).
"""
import uuid
import hmac
import hashlib
import json
import logging
from datetime import datetime
from typing import Optional
import httpx

from core.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# LemonSqueezy
# ─────────────────────────────────────────────────────────────────

async def create_lemonsqueezy_checkout(
    session_id: str,
    item_name: str,
    price_usd: float,
    email: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """
    Create a LemonSqueezy custom-price checkout and return the URL.
    Requires LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_ID.
    """
    if not settings.LEMONSQUEEZY_API_KEY:
        raise ValueError("LEMONSQUEEZY_API_KEY is not configured")
    if not settings.LEMONSQUEEZY_STORE_ID or not settings.LEMONSQUEEZY_VARIANT_ID:
        raise ValueError("LEMONSQUEEZY_STORE_ID / LEMONSQUEEZY_VARIANT_ID not configured")

    payload = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "custom_price": int(price_usd * 100),          # cents
                "product_options": {
                    "name": item_name,
                    "description": f"ZexAI AI Platform Credits — ref:{session_id}",
                    "redirect_url": success_url,
                },
                "checkout_data": {
                    "email": email,
                    "custom": {"session_id": session_id},
                },
                "checkout_options": {
                    "button_color": "#7C3AED",
                    "logo": True,
                    "dark": True,
                },
            },
            "relationships": {
                "store": {
                    "data": {"type": "stores", "id": str(settings.LEMONSQUEEZY_STORE_ID)}
                },
                "variant": {
                    "data": {"type": "variants", "id": str(settings.LEMONSQUEEZY_VARIANT_ID)}
                },
            },
        }
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://api.lemonsqueezy.com/v1/checkouts",
            headers={
                "Authorization": f"Bearer {settings.LEMONSQUEEZY_API_KEY}",
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            json=payload,
        )

    if resp.status_code not in (200, 201):
        logger.error(f"[LemonSqueezy] Checkout error {resp.status_code}: {resp.text[:400]}")
        raise ValueError(f"LemonSqueezy API error: {resp.status_code}")

    data = resp.json()
    checkout_url = data["data"]["attributes"]["url"]
    logger.info(f"[LemonSqueezy] Checkout created: {checkout_url[:60]}… session={session_id}")
    return checkout_url


async def create_lemonsqueezy_subscription_checkout(
    session_id: str,
    variant_id: str,
    email: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """
    Create a LemonSqueezy subscription checkout (recurring billing) using variant_id.
    """
    if not settings.LEMONSQUEEZY_API_KEY:
        raise ValueError("LEMONSQUEEZY_API_KEY is not configured")
    if not settings.LEMONSQUEEZY_STORE_ID:
        raise ValueError("LEMONSQUEEZY_STORE_ID is not configured")

    payload = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "product_options": {
                    "redirect_url": success_url,
                },
                "checkout_data": {
                    "email": email,
                    "custom": {"session_id": session_id},
                },
                "checkout_options": {
                    "button_color": "#7C3AED",
                    "logo": True,
                    "dark": True,
                },
            },
            "relationships": {
                "store": {
                    "data": {"type": "stores", "id": str(settings.LEMONSQUEEZY_STORE_ID)}
                },
                "variant": {
                    "data": {"type": "variants", "id": str(variant_id)}
                },
            },
        }
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://api.lemonsqueezy.com/v1/checkouts",
            headers={
                "Authorization": f"Bearer {settings.LEMONSQUEEZY_API_KEY}",
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            json=payload,
        )

    if resp.status_code not in (200, 201):
        logger.error(f"[LemonSqueezy Sub] Checkout error {resp.status_code}: {resp.text[:400]}")
        raise ValueError(f"LemonSqueezy API error: {resp.status_code}")

    data = resp.json()
    checkout_url = data["data"]["attributes"]["url"]
    logger.info(f"[LemonSqueezy Sub] Subscription checkout created: {checkout_url[:60]}… session={session_id}")
    return checkout_url


def verify_lemonsqueezy_signature(payload_bytes: bytes, received_sig: str) -> bool:
    """Verify the X-Signature header from LemonSqueezy webhook."""
    if not settings.LEMONSQUEEZY_WEBHOOK_SECRET:
        if settings.DEBUG:
            logger.warning("[LemonSqueezy] WEBHOOK_SECRET not set — skipping signature check (DEBUG)")
            return True
        logger.error("[LemonSqueezy] WEBHOOK_SECRET not set in production — rejecting webhook")
        return False
    expected = hmac.new(
        settings.LEMONSQUEEZY_WEBHOOK_SECRET.encode(),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, received_sig or "")


# ─────────────────────────────────────────────────────────────────
# NowPayments
# ─────────────────────────────────────────────────────────────────

async def create_nowpayments_invoice(
    session_id: str,
    item_name: str,
    price_usd: float,
    success_url: str,
    cancel_url: str,
) -> str:
    """
    Create a NowPayments invoice and return the hosted invoice URL.
    Requires NOWPAYMENTS_API_KEY.
    """
    if not settings.NOWPAYMENTS_API_KEY:
        raise ValueError("NOWPAYMENTS_API_KEY is not configured")

    # MANUS_CALLBACK_BASE_URL must be set in Railway env (e.g. https://api.zexai.io).
    # No hardcoded fallback — missing URL means misconfigured deployment.
    callback_base = settings.MANUS_CALLBACK_BASE_URL
    if not callback_base:
        raise ValueError("MANUS_CALLBACK_BASE_URL is not configured — set it in Railway env")

    payload = {
        "price_amount": price_usd,
        "price_currency": "usd",
        "order_id": session_id,
        "order_description": item_name,
        "ipn_callback_url": f"{callback_base}/api/v1/billing/webhooks/nowpayments",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "is_fee_paid_by_user": False,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://api.nowpayments.io/v1/invoice",
            headers={
                "x-api-key": settings.NOWPAYMENTS_API_KEY,
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if resp.status_code not in (200, 201):
        logger.error(f"[NowPayments] Invoice error {resp.status_code}: {resp.text[:400]}")
        raise ValueError(f"NowPayments API error: {resp.status_code}")

    data = resp.json()
    invoice_url = data.get("invoice_url") or data.get("invoiceUrl")
    logger.info(f"[NowPayments] Invoice created: {invoice_url[:60]}… session={session_id}")
    return invoice_url


def verify_nowpayments_signature(payload_bytes: bytes, received_sig: str) -> bool:
    """
    Verify NowPayments IPN HMAC-SHA512 signature.
    NowPayments sorts the JSON keys before computing the signature.
    """
    if not settings.NOWPAYMENTS_IPN_SECRET:
        if settings.DEBUG:
            logger.warning("[NowPayments] IPN_SECRET not set — skipping signature check (DEBUG)")
            return True
        logger.error("[NowPayments] IPN_SECRET not set in production — rejecting webhook")
        return False
    try:
        body_dict = json.loads(payload_bytes)
        sorted_str = json.dumps(
            dict(sorted(body_dict.items())), separators=(",", ":")
        )
        expected = hmac.new(
            settings.NOWPAYMENTS_IPN_SECRET.encode(),
            sorted_str.encode(),
            hashlib.sha512,
        ).hexdigest()
        return hmac.compare_digest(expected, received_sig or "")
    except Exception as e:
        logger.error(f"[NowPayments] Signature verification error: {e}")
        return False


# ─────────────────────────────────────────────────────────────────
# Supabase Payment Processing (replaces old MongoDB process_successful_payment)
# ─────────────────────────────────────────────────────────────────

async def process_payment_supabase(db, payment: dict, extra: Optional[dict] = None) -> bool:
    """
    Mark a payment as completed and credit the user's account.
    All DB operations use Supabase (postgrest client).
    
    Args:
        db: Supabase client (from get_db dependency)
        payment: row from pending_payments table
        extra: optional extra fields to merge into the payment update
    Returns:
        True on success, False on failure
    """
    user_id = str(payment["user_id"])
    credits = int(payment.get("credits", 0))
    amount_usd = float(payment.get("amount_usd", 0))
    session_id = payment["session_id"]

    try:
        # ── 1. Credit the user ──────────────────────────────────────
        credit_resp = (
            db.table("user_credits")
            .select("credits_balance")
            .eq("user_id", user_id)
            .execute()
        )

        if credit_resp.data:
            current_balance = float(credit_resp.data[0].get("credits_balance", 0))
            db.table("user_credits").update({
                "credits_balance": current_balance + credits,
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("user_id", user_id).execute()
        else:
            # First purchase — create the row
            db.table("user_credits").insert({
                "user_id": user_id,
                "credits_balance": credits,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }).execute()

        logger.info(f"[Payment] +{credits} credits → user {user_id}")

        # ── 2. Update pending_payments ──────────────────────────────
        update_data: dict = {
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
        }
        if extra:
            update_data.update(extra)

        db.table("pending_payments").update(update_data).eq("session_id", session_id).execute()

        # ── 3. Billing transaction log ──────────────────────────────
        tx_type = "subscription" if payment.get("item_type") == "subscription" else "purchase"
        db.table("billing_transactions").insert({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": tx_type,
            "amount_usd": amount_usd,
            "credits_added": credits,
            "payment_method": payment.get("payment_method", "unknown"),
            "status": "completed",
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
        }).execute()

        # ── 3.5. Subscription activation ─────────────────────────────
        if payment.get("item_type") == "subscription":
            from datetime import timedelta
            period_start = datetime.utcnow().isoformat()
            period_end = (datetime.utcnow() + timedelta(days=30)).isoformat()
            
            sub_id = str(uuid.uuid4())
            db.table("user_subscriptions").insert({
                "id": sub_id,
                "user_id": user_id,
                "plan_id": payment.get("item_id", "basic"),
                "payment_method": payment.get("payment_method", "lemonsqueezy"),
                "status": "active",
                "current_period_start": period_start,
                "current_period_end": period_end,
                "cancel_at_period_end": False,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
            
            logger.info(f"[Subscription] Active subscription created: sub_id={sub_id} plan={payment.get('item_id')} for user {user_id}")

        # ── 4. Referral commission (best-effort) ───────────────────
        try:
            from services.referral_service import referral_service
            await referral_service.process_commission(
                user_id=user_id,
                purchase_amount=amount_usd,
            )
        except Exception as ref_err:
            logger.warning(f"[Payment] Referral commission error (non-fatal): {ref_err}")

        logger.info(
            f"[Payment] ✅ Completed session={session_id} user={user_id} "
            f"credits={credits} usd=${amount_usd}"
        )
        return True

    except Exception as e:
        logger.error(f"[Payment] ❌ process_payment_supabase failed: {e}", exc_info=True)
        return False


# ─────────────────────────────────────────────────────────────────
# Pending payment helpers
# ─────────────────────────────────────────────────────────────────

def create_pending_payment(
    db,
    session_id: str,
    user_id: str,
    item_type: str,
    payment_method: str,
    amount_usd: float,
    credits: int,
) -> None:
    """Insert a pending_payments row in Supabase."""
    db.table("pending_payments").insert({
        "session_id": session_id,
        "user_id": user_id,
        "item_type": item_type,
        "payment_method": payment_method,
        "amount_usd": amount_usd,
        "credits": credits,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    }).execute()
    logger.debug(f"[Payment] Pending payment created: session={session_id}")


def get_pending_payment(db, session_id: str) -> Optional[dict]:
    """Fetch a pending_payments row by session_id."""
    result = (
        db.table("pending_payments")
        .select("*")
        .eq("session_id", session_id)
        .execute()
    )
    return result.data[0] if result.data else None
