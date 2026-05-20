"""
Billing and subscription routes with multi-payment support
Supports: LemonSqueezy, NowPayments, Binance Pay, MetaMask
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import httpx
import uuid
import hmac
import hashlib

from schemas.billing import (
    SubscriptionPlan,
    PricingPackage,
    PaymentMethod,
    PaymentOption,
    PriceBreakdown,
    SubscriptionStatus,
    CreateCheckoutRequest,
    CheckoutResponse,
    WebhookPaymentData
)
from core.security import get_current_user
from core.database import get_database, get_db
from core.credits import CreditManager
from core.config import settings
from core.payment_security import (
    WebhookVerifier, BlockchainVerifier, PaymentIdempotency,
    PaymentProviderClient, InvoiceGenerator
)
import json
from services.referral_service import referral_service
from services.payment_service import (
    create_lemonsqueezy_checkout,
    create_lemonsqueezy_subscription_checkout,
    create_nowpayments_invoice,
    verify_lemonsqueezy_signature,
    verify_nowpayments_signature,
    process_payment_supabase,
    create_pending_payment,
    get_pending_payment,
)


router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])


# Subscription plan definitions
SUBSCRIPTION_PLANS = {
    "basic": {
        "id": "basic",
        "name": "Basic",
        "monthly_price": 9.0,
        "monthly_credits": 1000,
        "description": "Perfect for individuals and small projects",
        "features": [
            "1.000 Kredi/Ay (Kişisel Yaratıcı Yakıt)",
            "Yaratıcı Stüdyo Erişimi (Chat, Görsel & Video)",
            "Ultra Hızlı FLUX Pro & Veo Modelleri",
            "Standart Email Desteği"
        ]
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "monthly_price": 29.0,
        "monthly_credits": 3300,
        "description": "For professionals and growing businesses",
        "features": [
            "3.300 Kredi/Ay (Yoğun Yaratım Gücü)",
            "Öncelikli Render Sırası (Sıfır Bekleme)",
            "Synapse Otonom Yapay Zeka Ajanları",
            "Gelişmiş Model Analitiği & Raporlama",
            "7/24 VIP Destek Hattı"
        ]
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "monthly_price": 99.0,
        "monthly_credits": 11750,
        "description": "For large teams and high-volume usage",
        "features": [
            "11.750 Kredi/Ay (Sınırsız Üretim Gücü)",
            "Özel API Rotasyon Altyapısı (Maksimum Hız)",
            "Ultra Yüksek Çözünürlük (8K Çıktı Desteği)",
            "Kurumsal SLA Garantisi & Özel Temsilci",
            "Birebir Çözüm Ortağı & Entegrasyon Desteği"
        ]
    }
}


def calculate_final_price(base_price: float, payment_method: PaymentMethod, package_discount: float = 0) -> PriceBreakdown:
    """
    Calculate final price with discounts
    - MetaMask: 15% extra discount
    - Package discount: varies by package
    """
    payment_discount = 0
    
    if payment_method == PaymentMethod.METAMASK:
        payment_discount = settings.METAMASK_DISCOUNT_PERCENT
    
    # Apply payment method discount
    price_after_payment_discount = base_price * (1 - payment_discount / 100)
    
    # Apply package discount (already included in base_price for packages)
    final_price = price_after_payment_discount
    
    return PriceBreakdown(
        original_price=base_price,
        payment_method_discount=payment_discount,
        package_discount=package_discount,
        final_price=round(final_price, 2),
        currency="USD"
    )


@router.get("/payment-methods", response_model=List[PaymentOption])
async def get_payment_methods(item_price: float = 10.0):
    """
    Get all available payment methods with pricing
    """
    methods = [
        PaymentOption(
            method=PaymentMethod.LEMONSQUEEZY,
            name="Credit/Debit Card (LemonSqueezy)",
            description="Visa, Mastercard, American Express",
            logo_url="/assets/lemonsqueezy-logo.png",
            discount_percent=0,
            final_price=item_price
        ),
        PaymentOption(
            method=PaymentMethod.TWOCHECKOUT,
            name="Credit/Debit Card (2Checkout)",
            description="Alternative card processor",
            logo_url="/assets/2checkout-logo.png",
            discount_percent=0,
            final_price=item_price
        ),
        PaymentOption(
            method=PaymentMethod.NOWPAYMENTS,
            name="Crypto (NowPayments)",
            description="Bitcoin, Ethereum, USDT, and 100+ coins",
            logo_url="/assets/nowpayments-logo.png",
            discount_percent=0,
            final_price=item_price
        ),
        PaymentOption(
            method=PaymentMethod.BINANCE,
            name="Binance Pay",
            description="Pay instantly with your Binance app",
            logo_url="/assets/binance-logo.png",
            discount_percent=5,
            final_price=round(item_price * 0.95, 2)
        ),
        PaymentOption(
            method=PaymentMethod.METAMASK,
            name="ZEX Token (Polygon)",
            description=f"Pay with $ZEX on Polygon and get {settings.METAMASK_DISCOUNT_PERCENT}% extra discount!",
            logo_url="/assets/metamask-logo.png",
            discount_percent=settings.METAMASK_DISCOUNT_PERCENT,
            final_price=round(item_price * (1 - settings.METAMASK_DISCOUNT_PERCENT / 100), 2)
        )
    ]
    
    return methods


@router.get("/plans")
async def get_subscription_plans(db = Depends(get_database)):
    """Get all available subscription plans from database"""
    try:
        # Try to get from subscription_plans table (Supabase)
        response = db.table("subscription_plans").select("*").eq("is_active", True).order("sort_order").execute()
        plans = response.data or []
        
        if plans:
            # Format for frontend
            return {
                "plans": [
                    {
                        "id": p.get("plan_id", p.get("id")),
                        "name": p.get("name"),
                        "display_name": p.get("display_name", p.get("name")),
                        "monthly_price": float(p.get("monthly_price", p.get("price_monthly", 0))),
                        "yearly_price": float(p.get("price_yearly", 0)) if p.get("price_yearly") else None,
                        "monthly_credits": p.get("monthly_credits", p.get("credits_monthly", 0)),
                        "description": p.get("description", ""),
                        "features": p.get("features", []),
                        "is_popular": p.get("is_popular", False)
                    }
                    for p in plans
                ],
                "success": True
            }
    except Exception as e:
        logger.warning(f"Failed to get plans from DB: {e}")
    
    # Fallback to hardcoded plans
    return {
        "plans": [
            SubscriptionPlan(**plan_data).model_dump()
            for plan_data in SUBSCRIPTION_PLANS.values()
        ],
        "success": True
    }


@router.get("/packages")
async def get_top_up_packages(db = Depends(get_database)):
    """Get available one-time credit purchase packages"""
    try:
        # Try to get from special_packages table (Supabase)
        response = db.table("special_packages").select("*").eq("is_active", True).execute()
        packages = response.data or []
        
        # If no packages in DB, return default packages
        if not packages:
            packages = [
                {"id": "starter", "name": "Starter", "credits": 500, "price": 4.99, "discount": 0, "popular": False},
                {"id": "basic", "name": "Basic", "credits": 1500, "price": 12.99, "discount": 13, "popular": False},
                {"id": "popular", "name": "Popular", "credits": 5000, "price": 39.99, "discount": 20, "popular": True},
                {"id": "pro", "name": "Pro", "credits": 12000, "price": 89.99, "discount": 25, "popular": False},
                {"id": "enterprise", "name": "Enterprise", "credits": 30000, "price": 199.99, "discount": 33, "popular": False},
            ]
        
        return {"packages": packages, "success": True}
    except Exception as e:
        # Fallback to default packages
        return {
            "packages": [
                {"id": "starter", "name": "Starter", "credits": 500, "price": 4.99, "discount": 0, "popular": False},
                {"id": "basic", "name": "Basic", "credits": 1500, "price": 12.99, "discount": 13, "popular": False},
                {"id": "popular", "name": "Popular", "credits": 5000, "price": 39.99, "discount": 20, "popular": True},
                {"id": "pro", "name": "Pro", "credits": 12000, "price": 89.99, "discount": 25, "popular": False},
                {"id": "enterprise", "name": "Enterprise", "credits": 30000, "price": 199.99, "discount": 33, "popular": False},
            ],
            "success": True
        }


@router.get("/credit-config")
async def get_credit_config(db = Depends(get_database)):
    """Get credit pricing configuration from database"""
    try:
        # Get pricing config
        pricing_resp = db.table("credit_config").select("*").eq("config_key", "pricing").execute()
        pricing = pricing_resp.data[0]["config_value"] if pricing_resp.data else {}
        
        # Get bulk discounts
        bulk_resp = db.table("credit_config").select("*").eq("config_key", "bulk_discounts").execute()
        bulk_discounts = bulk_resp.data[0]["config_value"] if bulk_resp.data else {}
        
        # Get payment methods
        payment_resp = db.table("credit_config").select("*").eq("config_key", "payment_methods").execute()
        payment_methods = payment_resp.data[0]["config_value"] if payment_resp.data else {}
        
        return {
            "success": True,
            "credits_per_usd": pricing.get("credits_per_usd", 100),
            "min_purchase_usd": pricing.get("min_purchase_usd", 5),
            "max_purchase_usd": pricing.get("max_purchase_usd", 500),
            "bulk_discounts": bulk_discounts,
            "payment_methods": payment_methods
        }
    except Exception as e:
        logger.warning(f"Failed to get credit config: {e}")
        # Fallback defaults
        return {
            "success": True,
            "credits_per_usd": 100,
            "min_purchase_usd": 5,
            "max_purchase_usd": 500,
            "bulk_discounts": {"50": 5, "100": 10, "200": 15, "500": 25},
            "payment_methods": {
                "card": {"enabled": True, "bonus_percent": 0},
                "crypto": {"enabled": True, "bonus_percent": 5},
                "binance": {"enabled": True, "bonus_percent": 5},
                "metamask": {"enabled": True, "bonus_percent": 15}
            }
        }


@router.get("/special-packages")
async def get_special_packages(db = Depends(get_database)):
    """Get special/featured credit packages from database"""
    try:
        response = db.table("special_packages").select("*").eq("is_active", True).order("sort_order").execute()
        packages = response.data or []
        
        return {
            "success": True,
            "packages": [
                {
                    "id": str(p.get("id")),
                    "name": p.get("name"),
                    "description": p.get("description", ""),
                    "credits": p.get("credits", 0),
                    "bonus_credits": p.get("bonus_credits", 0),
                    "original_price": float(p.get("original_price", 0)),
                    "discounted_price": float(p.get("discounted_price", 0)),
                    "badge": p.get("badge"),
                    "is_featured": p.get("is_featured", False)
                }
                for p in packages
            ]
        }
    except Exception as e:
        logger.warning(f"Failed to get special packages: {e}")
        return {"success": True, "packages": []}


@router.get("/subscription/status", response_model=SubscriptionStatus)
async def get_subscription_status(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get current user's subscription status"""
    try:
        response = db.table("user_subscriptions").select("*").eq("user_id", str(current_user.id)).in_("status", ["active", "trialing", "past_due"]).execute()
        if not response.data:
            return SubscriptionStatus(has_subscription=False)
        
        subscription = response.data[0]
        plan_id = subscription.get("plan_id")
        
        # Get subscription plan details
        plan_resp = db.table("subscription_plans").select("*").eq("id", plan_id).execute()
        plan_data = plan_resp.data[0] if plan_resp.data else SUBSCRIPTION_PLANS.get(plan_id, {})
        
        return SubscriptionStatus(
            has_subscription=True,
            plan_name=plan_data.get("display_name") or plan_data.get("name") or plan_id,
            status=subscription["status"],
            current_period_end=subscription.get("current_period_end"),
            cancel_at_period_end=subscription.get("cancel_at_period_end", False),
            monthly_credits=plan_data.get("monthly_credits"),
            next_billing_date=subscription.get("current_period_end")
        )
    except Exception as e:
        logger.error(f"Error checking subscription status: {e}")
        return SubscriptionStatus(has_subscription=False)


@router.post("/checkout/create", response_model=CheckoutResponse)
async def create_checkout(
    request: CreateCheckoutRequest,
    http_request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Create a checkout session for subscription or top-up
    Supports multiple payment methods
    """
    # Get item details
    if request.item_type == "subscription":
        # Check plan in database (id is a string slug like 'basic', 'pro', 'enterprise')
        plan_resp = db.table("subscription_plans").select("*").eq("id", request.item_id).execute()
        plan_data = plan_resp.data[0] if plan_resp.data else None

        if plan_data:
            item_price = float(plan_data.get("monthly_price", 0))
            item_name = f"{plan_data.get('display_name') or plan_data.get('name')} Subscription"
            credits = int(plan_data.get("monthly_credits", 0))
        else:
            if request.item_id not in SUBSCRIPTION_PLANS:
                raise HTTPException(status_code=400, detail="Invalid plan ID")
            item_data = SUBSCRIPTION_PLANS[request.item_id]
            item_price = item_data["monthly_price"]
            item_name = f"{item_data['name']} Subscription"
            credits = item_data["monthly_credits"]
        
    elif request.item_type == "top_up":
        # Check package in database
        is_uuid = False
        try:
            uuid.UUID(str(request.item_id))
            is_uuid = True
        except ValueError:
            pass

        package = None
        if is_uuid:
            pkg_resp = db.table("special_packages").select("*").eq("id", request.item_id).eq("is_active", True).execute()
            if pkg_resp.data:
                package = pkg_resp.data[0]

        if package:
            item_price = float(package.get("price", package.get("discounted_price", 0)))
            item_name = f"{package.get('name')} Credit Package"
            credits = int(package.get("credits", 0))
        else:
            # Fallback to hardcoded packages
            default_packages = {
                "starter": (4.99, 500, "Starter"),
                "basic": (12.99, 1500, "Basic"),
                "popular": (39.99, 5000, "Popular"),
                "pro": (89.99, 12000, "Pro"),
                "enterprise": (199.99, 30000, "Enterprise"),
            }
            if request.item_id not in default_packages:
                raise HTTPException(status_code=404, detail="Package not found")
            price, crd, name = default_packages[request.item_id]
            item_price = price
            item_name = f"{name} Credit Package"
            credits = crd
        
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")
    
    # Calculate final price with discounts
    price_breakdown = calculate_final_price(item_price, request.payment_method)
    
    # Create payment session ID
    session_id = str(uuid.uuid4())
    
    # Store pending payment (schema-friendly column mapping)
    payment_record = {
        "session_id": session_id,
        "user_id": str(current_user.id),
        "item_type": request.item_type,
        "item_id": request.item_id,
        "payment_method": request.payment_method.value,
        "amount_usd": float(price_breakdown.final_price),
        "credits": int(credits),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
    
    db.table("pending_payments").insert(payment_record).execute()
    
    # Build callback URLs
    origin = http_request.headers.get('origin') or settings.FRONTEND_URL
    success_url = f"{origin}/payment/success?session={session_id}"
    cancel_url = f"{origin}/pricing?canceled=1"
    
    # Route to appropriate payment provider
    try:
        if request.payment_method == PaymentMethod.LEMONSQUEEZY:
            if request.item_type == "subscription":
                # Match plans to their custom variant IDs
                variant_id = None
                if request.item_id == "basic":
                    variant_id = settings.LEMONSQUEEZY_BASIC_VARIANT_ID or settings.LEMONSQUEEZY_VARIANT_ID
                elif request.item_id == "pro":
                    variant_id = settings.LEMONSQUEEZY_PRO_VARIANT_ID or settings.LEMONSQUEEZY_VARIANT_ID
                elif request.item_id == "enterprise":
                    variant_id = settings.LEMONSQUEEZY_ENTERPRISE_VARIANT_ID or settings.LEMONSQUEEZY_VARIANT_ID
                
                if not variant_id:
                    # Fallback to primary variant
                    variant_id = settings.LEMONSQUEEZY_VARIANT_ID
                
                checkout_url = await create_lemonsqueezy_subscription_checkout(
                    session_id=session_id,
                    variant_id=variant_id,
                    email=current_user.email,
                    success_url=success_url,
                    cancel_url=cancel_url
                )
            else:
                checkout_url = await create_lemonsqueezy_checkout(
                    session_id, item_name, price_breakdown.final_price, 
                    current_user.email, success_url, cancel_url
                )
            
            return CheckoutResponse(
                success=True,
                payment_method=request.payment_method,
                checkout_url=checkout_url,
                price_breakdown=price_breakdown,
                session_id=session_id
            )
        
        elif request.payment_method == PaymentMethod.TWOCHECKOUT:
            checkout_url = await create_2checkout_session(
                session_id, item_name, price_breakdown.final_price,
                current_user.email, success_url, cancel_url
            )
            
            return CheckoutResponse(
                success=True,
                payment_method=request.payment_method,
                checkout_url=checkout_url,
                price_breakdown=price_breakdown,
                session_id=session_id
            )
        
        elif request.payment_method == PaymentMethod.NOWPAYMENTS:
            checkout_url = await create_nowpayments_invoice(
                session_id, item_name, price_breakdown.final_price,
                success_url, cancel_url
            )
            
            return CheckoutResponse(
                success=True,
                payment_method=request.payment_method,
                checkout_url=checkout_url,
                price_breakdown=price_breakdown,
                session_id=session_id
            )
        
        elif request.payment_method == PaymentMethod.BINANCE:
            checkout_url = await create_binance_payment(
                session_id, item_name, price_breakdown.final_price
            )
            
            return CheckoutResponse(
                success=True,
                payment_method=request.payment_method,
                checkout_url=checkout_url,
                price_breakdown=price_breakdown,
                session_id=session_id
            )
        
        elif request.payment_method == PaymentMethod.METAMASK:
            # MetaMask payment data (for Web3 frontend)
            payment_data = {
                "contract_address": settings.METAMASK_CONTRACT_ADDRESS,
                "recipient_address": settings.COMPANY_WALLET_ADDRESS,
                "amount_usd": price_breakdown.final_price,
                "session_id": session_id,
                "discount_applied": settings.METAMASK_DISCOUNT_PERCENT
            }
            
            return CheckoutResponse(
                success=True,
                payment_method=request.payment_method,
                payment_data=payment_data,
                price_breakdown=price_breakdown,
                session_id=session_id
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create checkout: {str(e)}"
        )


# Payment provider helper functions

# create_lemonsqueezy_checkout and create_nowpayments_invoice are now
# imported from services.payment_service — see top of file.

async def create_2checkout_session(session_id: str, item_name: str, price: float, email: str, success_url: str, cancel_url: str) -> str:
    """Create 2Checkout session (placeholder)"""
    if not settings.TWOCHECKOUT_API_KEY:
        raise ValueError("2Checkout API key not configured")
    return f"https://secure.2checkout.com/checkout/buy?session={session_id}"


async def create_binance_payment(session_id: str, item_name: str, price: float) -> str:
    """Create Binance Pay order"""
    if not settings.BINANCE_API_KEY or not settings.BINANCE_SECRET:
        raise ValueError("Binance Pay API keys not configured")
    
    # Binance Pay API Base URL
    base_url = "https://bpay.binanceapi.com/binancepay/openapi/v2/order"
    
    # Header requirements for Binance Pay
    # https://developers.binance.com/docs/binance-pay/api-order-create
    nonce = str(uuid.uuid4())[:32]
    timestamp = str(int(datetime.utcnow().timestamp() * 1000))
    
    payload = {
        "env": {"terminalType": "WEB"},
        "orderAmount": price,
        "orderCurrency": "USD",
        "merchantTradeNo": session_id,
        "goods": {
            "goodsType": "01",
            "goodsCategory": "D000",
            "referenceGoodsId": "credits",
            "goodsName": item_name,
        },
        "returnUrl": f"{settings.FRONTEND_URL}/payment/success?session={session_id}",
        "cancelUrl": f"{settings.FRONTEND_URL}/pricing"
    }
    
    json_payload = json.dumps(payload)
    signature_payload = f"{timestamp}\n{nonce}\n{json_payload}\n"
    signature = hmac.new(
        settings.BINANCE_SECRET.encode('utf-8'),
        signature_payload.encode('utf-8'),
        hashlib.sha512
    ).hexdigest().upper()
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            base_url,
            headers={
                "Content-Type": "application/json",
                "BinancePay-Timestamp": timestamp,
                "BinancePay-Nonce": nonce,
                "BinancePay-Certificate-SN": settings.BINANCE_API_KEY,
                "BinancePay-Signature": signature
            },
            data=json_payload
        )
        
        if response.status_code != 200:
            raise ValueError(f"Binance Pay error: {response.text}")
        
        data = response.json()
        if data.get("status") != "SUCCESS":
            raise ValueError(f"Binance Pay failed: {data.get('errorMessage')}")
        
        return data["data"]["checkoutUrl"]


@router.get("/webhooks/lemonsqueezy")
@router.get("/webhooks/lemonsqueezy/")
async def lemonsqueezy_webhook_get():
    """
    Handle GET requests gracefully (e.g. from ping tests, validation checkers, or direct browser checks)
    to prevent 405 Method Not Allowed errors.
    """
    return {
        "status": "active",
        "message": "LemonSqueezy webhook endpoint is fully active. Please send POST requests for webhook event deliveries."
    }


@router.post("/webhooks/lemonsqueezy")
@router.post("/webhooks/lemonsqueezy/")
async def lemonsqueezy_webhook(request: Request, db = Depends(get_db)):
    """
    Webhook for LemonSqueezy payment events (order_created).
    Uses Supabase for all DB operations.
    """
    from core.logger import app_logger as logger
    payload_bytes = await request.body()

    # ── Signature check ──────────────────────────────────────────
    received_sig = request.headers.get("X-Signature", "")
    if not verify_lemonsqueezy_signature(payload_bytes, received_sig):
        logger.warning("[LemonSqueezy webhook] Invalid signature — rejected")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(payload_bytes)
        event_name = payload.get("meta", {}).get("event_name", "")
        logger.info(f"[LemonSqueezy webhook] event={event_name}")

        if event_name in ("order_created", "subscription_created"):
            custom_data = payload.get("meta", {}).get("custom_data", {})
            session_id = custom_data.get("session_id")

            if not session_id:
                logger.warning(f"[LemonSqueezy webhook] Missing session_id in custom_data for event={event_name}")
                return {"status": "ok", "note": "no session_id"}

            payment = get_pending_payment(db, session_id)
            if not payment:
                logger.warning(f"[LemonSqueezy webhook] Payment not found: {session_id}")
                return {"status": "ok", "note": "payment not found"}

            if payment.get("status") == "completed":
                return {"status": "ok", "note": "already processed"}

            ls_order_id = payload.get("data", {}).get("id", "")
            await process_payment_supabase(db, payment, extra={
                "lemonsqueezy_order_id": str(ls_order_id)
            })

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"[LemonSqueezy webhook] Error: {e}", exc_info=True)
        # Return 200 to prevent LemonSqueezy from retrying on a bug
        return {"status": "error", "message": str(e)}


@router.get("/webhooks/nowpayments")
@router.get("/webhooks/nowpayments/")
async def nowpayments_webhook_get():
    """
    Handle GET requests gracefully (e.g. from ping tests, validation checkers, or direct browser checks)
    to prevent 405 Method Not Allowed errors.
    """
    return {
        "status": "active",
        "message": "NowPayments webhook endpoint is fully active. Please send POST requests for webhook event deliveries."
    }


@router.post("/webhooks/nowpayments")
@router.post("/webhooks/nowpayments/")
async def nowpayments_webhook(request: Request, db = Depends(get_db)):
    """
    Webhook for NowPayments IPN callbacks.
    Uses Supabase for all DB operations.
    """
    from core.logger import app_logger as logger
    payload_bytes = await request.body()

    # ── Signature check ──────────────────────────────────────────
    received_sig = request.headers.get("x-nowpayments-sig", "")
    if not verify_nowpayments_signature(payload_bytes, received_sig):
        logger.warning("[NowPayments webhook] Invalid IPN signature — rejected")
        raise HTTPException(status_code=403, detail="Invalid IPN signature")

    try:
        payload = json.loads(payload_bytes)
        payment_status = payload.get("payment_status", "")
        order_id = payload.get("order_id", "")  # This is our session_id
        payment_id = payload.get("payment_id", "")

        logger.info(
            f"[NowPayments webhook] status={payment_status} "
            f"order={order_id} payment_id={payment_id}"
        )

        if payment_status in ("finished", "confirmed"):
            payment = get_pending_payment(db, order_id)
            if not payment:
                logger.warning(f"[NowPayments webhook] Payment not found: {order_id}")
                return {"status": "ok", "note": "payment not found"}

            if payment.get("status") == "completed":
                return {"status": "ok", "note": "already processed"}

            await process_payment_supabase(db, payment, extra={
                "nowpayments_payment_id": str(payment_id),
                "paid_currency": payload.get("pay_currency", ""),
                "paid_amount": payload.get("actually_paid") or payload.get("pay_amount"),
            })

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"[NowPayments webhook] Error: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}


@router.get("/webhooks/metamask")
@router.get("/webhooks/metamask/")
async def metamask_webhook_get():
    """
    Handle GET requests gracefully (e.g. from ping tests, validation checkers, or direct browser checks)
    to prevent 405 Method Not Allowed errors.
    """
    return {
        "status": "active",
        "message": "MetaMask webhook endpoint is fully active. Please send POST requests for webhook transaction updates."
    }


@router.post("/webhooks/metamask")
@router.post("/webhooks/metamask/")
async def metamask_webhook(request: Request, db = Depends(get_database)):
    """
    Webhook for MetaMask payment confirmation
    Frontend calls this after transaction is confirmed on blockchain
    """
    try:
        payload = await request.json()
        
        session_id = payload.get("session_id")
        tx_hash = payload.get("tx_hash")
        
        if not session_id or not tx_hash:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Find pending payment
        payment = await db.pending_payments.find_one({"session_id": session_id})
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Check for duplicate processing
        if await PaymentIdempotency.is_duplicate_payment(tx_hash, "metamask"):
            return {"status": "ok", "message": "Already processed"}
        
        # Verify transaction on blockchain (Polygon)
        blockchain_verifier = BlockchainVerifier()
        verification_result = await blockchain_verifier.verify_transaction(
            tx_hash,
            payment["final_price"],
            settings.COMPANY_WALLET_ADDRESS,
            token_contract=settings.METAMASK_CONTRACT_ADDRESS  # $ZEX Token Address
        )
        
        if not verification_result["verified"]:
            logger.error(f"Blockchain verification failed: {verification_result['error']}")
            raise HTTPException(
                status_code=400, 
                detail=f"Transaction verification failed: {verification_result['error']}"
            )
        
        # Mark as completed and add credits
        await process_successful_payment(db, payment, tx_hash=tx_hash, blockchain_data=verification_result)
        
        # Mark as processed
        await PaymentIdempotency.mark_payment_processed(
            tx_hash, "metamask", {"session_id": session_id, "verification": verification_result}
        )
        
        return {"status": "ok", "message": "Payment processed successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def process_successful_payment(db, payment: dict, tx_hash: str = None, payment_id: str = None, blockchain_data: dict = None):
    """
    Process a successful payment and add credits to user
    """
    # Add credits to user
    await CreditManager.add_credits(
        db,
        payment["user_id"],
        payment["credits"],
        reason=f"{payment['item_type']}_purchase_{payment['item_id']}"
    )

    # Process Referral Commission
    try:
        await referral_service.process_commission(
            user_id=payment["user_id"],
            purchase_amount=payment["final_price"]
        )
    except Exception as e:
        # Log error but don't fail the payment processing
        # In production, this should be logged to Sentry
        print(f"Referral processing error: {str(e)}")
    
    # Update payment status
    update_data = {
        "status": "completed",
        "completed_at": datetime.utcnow()
    }
    
    if tx_hash:
        update_data["tx_hash"] = tx_hash
    
    if payment_id:
        update_data["payment_id"] = payment_id
    
    if blockchain_data:
        update_data["blockchain_verification"] = blockchain_data
        
    # Create invoice record
    invoice_id = str(uuid.uuid4())
    invoice_data = {
        "id": invoice_id,
        "user_id": payment["user_id"],
        "invoice_number": f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{invoice_id[:8].upper()}",
        "amount_usd": payment["final_price"],
        "credits_purchased": payment["credits"],
        "payment_method": payment["payment_method"],
        "status": "paid",
        "issued_at": datetime.utcnow(),
        "paid_at": datetime.utcnow(),
        "item_description": f"{payment['item_type'].title()} - {payment['item_id']}",
        "customer_email": "",  # Will be filled from user data
        "download_url": f"/api/v1/billing/invoices/{invoice_id}/download"
    }
    
    # Get user email for invoice and send payment success email
    user = await db.users.find_one({"id": payment["user_id"]})
    if user:
        invoice_data["customer_email"] = user.get("email", "")
        
        # Send payment success email
        try:
            import asyncio
            from core.email_service import get_email_service
            from core.credits import CreditManager
            
            # Get new balance
            new_balance = await CreditManager.get_user_balance(db, payment["user_id"])
            
            email_service = get_email_service()
            asyncio.create_task(
                email_service.send_payment_success(
                    user_email=user.get("email"),
                    user_name=user.get("full_name", "Kullanıcı"),
                    amount=f"${payment['final_price']:.2f}",
                    description=f"{payment['item_type'].title()} - {payment['item_id']}",
                    new_balance=int(new_balance)
                )
            )
            logger.info(f"Payment success email queued for {user.get('email')}")
        except Exception as email_error:
            logger.warning(f"Failed to send payment success email: {email_error}")
    
    await db.invoices.insert_one(invoice_data)
    
    await db.pending_payments.update_one(
        {"session_id": payment["session_id"]},
        {"$set": update_data}
    )
    
    # If subscription, create subscription record
    if payment["item_type"] == "subscription":
        plan_data = SUBSCRIPTION_PLANS.get(payment["item_id"])
        
        subscription = {
            "id": str(uuid.uuid4()),
            "user_id": payment["user_id"],
            "plan_id": payment["item_id"],
            "payment_method": payment["payment_method"],
            "status": "active",
            "current_period_start": datetime.utcnow(),
            "current_period_end": datetime.utcnow() + timedelta(days=30),
            "cancel_at_period_end": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.user_subscriptions.insert_one(subscription)
        
        # Update user's package
        await db.users.update_one(
            {"id": payment["user_id"]},
            {"$set": {"package": payment["item_id"]}}
        )


@router.post("/subscription/cancel")
async def cancel_subscription(
    immediate: bool = False,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Cancel user's subscription"""
    try:
        response = db.table("user_subscriptions").select("*").eq("user_id", str(current_user.id)).in_("status", ["active", "trialing"]).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        subscription = response.data[0]
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        
        if immediate:
            update_data["status"] = "canceled"
            update_data["canceled_at"] = datetime.utcnow().isoformat()
        else:
            update_data["cancel_at_period_end"] = True
            
        db.table("user_subscriptions").update(update_data).eq("id", subscription["id"]).execute()
        
        return {
            "success": True,
            "message": "Subscription canceled successfully",
            "immediate": immediate,
            "active_until": subscription.get("current_period_end") if not immediate else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error canceling subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")




from fastapi import Query
from pydantic import BaseModel
from typing import Optional
from core.logger import app_logger as logger
from core.rate_limiter import limiter, RateLimits


# ============================================
# Extended Billing Schemas
# ============================================

class BillingTransaction(BaseModel):
    """Billing transaction record"""
    id: str
    user_id: str
    type: str  # purchase, refund, subscription
    amount_usd: float
    credits_added: float
    payment_method: str
    status: str  # pending, completed, failed, refunded
    transaction_id: Optional[str] = None
    created_at: datetime


class BillingTransactionListResponse(BaseModel):
    """Paginated billing transactions"""
    transactions: List[BillingTransaction]
    total: int
    page: int
    page_size: int
    has_more: bool


class Invoice(BaseModel):
    """Invoice details"""
    id: str
    user_id: str
    invoice_number: str
    amount_usd: float
    credits_purchased: float
    payment_method: str
    status: str  # paid, pending, failed
    issued_at: datetime
    paid_at: Optional[datetime] = None
    download_url: Optional[str] = None


class InvoiceListResponse(BaseModel):
    """Paginated invoices"""
    invoices: List[Invoice]
    total: int
    page: int
    page_size: int
    has_more: bool


class RefundRequest(BaseModel):
    """Refund request"""
    transaction_id: str
    reason: str


class UsageStatsResponse(BaseModel):
    """Usage statistics for billing"""
    current_period_start: datetime
    current_period_end: datetime
    credits_purchased: float
    credits_spent: float
    credits_remaining: float
    spending_by_service: Dict[str, float]


# ============================================
# Transaction History Endpoints
# ============================================

@router.get("/transactions", response_model=BillingTransactionListResponse)
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_billing_transactions(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get user's billing transaction history
    """
    try:
        user_uuid = str(current_user.id)
        skip = (page - 1) * page_size
        
        # Get count
        count_resp = db.table("billing_transactions").select("id", count="exact").eq("user_id", user_uuid).execute()
        total = count_resp.count or 0
        
        # Get records
        records_resp = db.table("billing_transactions").select("*").eq("user_id", user_uuid).order("created_at", desc=True).range(skip, skip + page_size - 1).execute()
        transactions = records_resp.data or []
        
        transaction_list = []
        for txn in transactions:
            created_at_val = txn.get("created_at")
            if isinstance(created_at_val, str):
                try:
                    created_at_val = datetime.fromisoformat(created_at_val.replace("Z", "+00:00"))
                except ValueError:
                    created_at_val = datetime.utcnow()
            else:
                created_at_val = datetime.utcnow()
                
            transaction_list.append(BillingTransaction(
                id=str(txn.get("id")),
                user_id=str(txn.get("user_id")),
                type=str(txn.get("type", "purchase")),
                amount_usd=float(txn.get("amount_usd", 0)),
                credits_added=float(txn.get("credits_added", 0)),
                payment_method=str(txn.get("payment_method", "unknown")),
                status=str(txn.get("status", "completed")),
                transaction_id=str(txn.get("session_id", "")) or None,
                created_at=created_at_val
            ))
        
        return BillingTransactionListResponse(
            transactions=transaction_list,
            total=total,
            page=page,
            page_size=page_size,
            has_more=skip + len(transactions) < total
        )
    
    except Exception as e:
        logger.error(f"Error fetching billing transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch billing transactions"
        )


# ============================================
# Invoice Management Endpoints
# ============================================

@router.get("/invoices", response_model=InvoiceListResponse)
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_invoices(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get user's invoices (dynamically generated from billing_transactions)
    """
    try:
        user_uuid = str(current_user.id)
        skip = (page - 1) * page_size
        
        # Get count from completed transactions
        count_resp = db.table("billing_transactions").select("id", count="exact").eq("user_id", user_uuid).eq("status", "completed").execute()
        total = count_resp.count or 0
        
        # Get records
        records_resp = db.table("billing_transactions").select("*").eq("user_id", user_uuid).eq("status", "completed").order("created_at", desc=True).range(skip, skip + page_size - 1).execute()
        transactions = records_resp.data or []
        
        invoice_list = []
        for txn in transactions:
            created_at_val = txn.get("created_at")
            if isinstance(created_at_val, str):
                try:
                    created_at_val = datetime.fromisoformat(created_at_val.replace("Z", "+00:00"))
                except ValueError:
                    created_at_val = datetime.utcnow()
            else:
                created_at_val = datetime.utcnow()
                
            date_str = created_at_val.strftime("%Y%m%d")
            short_id = str(txn.get("id"))[:8].upper()
            invoice_num = f"INV-{date_str}-{short_id}"
            
            invoice_list.append(Invoice(
                id=str(txn.get("id")),
                user_id=str(txn.get("user_id")),
                invoice_number=invoice_num,
                amount_usd=float(txn.get("amount_usd", 0)),
                credits_purchased=float(txn.get("credits_added", 0)),
                payment_method=str(txn.get("payment_method", "unknown")),
                status="paid",
                issued_at=created_at_val,
                paid_at=created_at_val,
                download_url=f"/api/v1/billing/invoices/{txn.get('id')}/download"
            ))
            
        return InvoiceListResponse(
            invoices=invoice_list,
            total=total,
            page=page,
            page_size=page_size,
            has_more=skip + len(transactions) < total
        )
    
    except Exception as e:
        logger.error(f"Error fetching invoices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch invoices"
        )


@router.get("/invoices/{invoice_id}", response_model=Invoice)
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_invoice_detail(
    request: Request,
    invoice_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get invoice details
    """
    try:
        user_uuid = str(current_user.id)
        resp = db.table("billing_transactions").select("*").eq("id", invoice_id).eq("user_id", user_uuid).execute()
        if not resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
            
        txn = resp.data[0]
        created_at_val = txn.get("created_at")
        if isinstance(created_at_val, str):
            try:
                created_at_val = datetime.fromisoformat(created_at_val.replace("Z", "+00:00"))
            except ValueError:
                created_at_val = datetime.utcnow()
        else:
            created_at_val = datetime.utcnow()
            
        date_str = created_at_val.strftime("%Y%m%d")
        short_id = str(txn.get("id"))[:8].upper()
        invoice_num = f"INV-{date_str}-{short_id}"
        
        return Invoice(
            id=str(txn.get("id")),
            user_id=str(txn.get("user_id")),
            invoice_number=invoice_num,
            amount_usd=float(txn.get("amount_usd", 0)),
            credits_purchased=float(txn.get("credits_added", 0)),
            payment_method=str(txn.get("payment_method", "unknown")),
            status="paid",
            issued_at=created_at_val,
            paid_at=created_at_val,
            download_url=f"/api/v1/billing/invoices/{txn.get('id')}/download"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching invoice detail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch invoice detail"
        )


@router.get("/invoices/{invoice_id}/download")
@limiter.limit(RateLimits.PUBLIC_READ)
async def download_invoice(
    request: Request,
    invoice_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Download invoice as PDF
    """
    try:
        user_uuid = str(current_user.id)
        resp = db.table("billing_transactions").select("*").eq("id", invoice_id).eq("user_id", user_uuid).execute()
        if not resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
            
        txn = resp.data[0]
        created_at_val = txn.get("created_at")
        if isinstance(created_at_val, str):
            try:
                created_at_val = datetime.fromisoformat(created_at_val.replace("Z", "+00:00"))
            except ValueError:
                created_at_val = datetime.utcnow()
        else:
            created_at_val = datetime.utcnow()
            
        date_str = created_at_val.strftime("%Y%m%d")
        short_id = str(txn.get("id"))[:8].upper()
        invoice_num = f"INV-{date_str}-{short_id}"
        
        invoice_data = {
            "id": str(txn.get("id")),
            "invoice_number": invoice_num,
            "amount_usd": float(txn.get("amount_usd", 0)),
            "credits_purchased": float(txn.get("credits_added", 0)),
            "payment_method": str(txn.get("payment_method", "unknown")),
            "status": "paid",
            "issued_at": created_at_val,
            "paid_at": created_at_val
        }
        
        # Generate and return PDF invoice
        try:
            pdf_data = await InvoiceGenerator.generate_invoice_pdf(invoice_data)
            
            from fastapi.responses import FileResponse
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(pdf_data)
                tmp_path = tmp_file.name
            
            return FileResponse(
                tmp_path,
                media_type="application/pdf",
                filename=f"invoice_{invoice_num}.pdf",
                background=lambda: os.unlink(tmp_path)
            )
            
        except Exception as e:
            logger.error(f"Failed to generate invoice PDF: {e}")
            return {
                "message": "PDF generation temporarily unavailable",
                "invoice_id": invoice_id,
                "invoice_number": invoice_num,
                "amount_usd": invoice_data.get("amount_usd"),
                "status": "paid"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download invoice"
        )


# ============================================
# Refund Management
# ============================================

@router.post("/refund")
@limiter.limit(RateLimits.PROFILE_UPDATE)
async def request_refund(
    request: Request,
    refund_request: RefundRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Request a refund for a transaction
    """
    try:
        user_uuid = str(current_user.id)
        resp = db.table("billing_transactions").select("*").eq("id", refund_request.transaction_id).eq("user_id", user_uuid).execute()
        if not resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
            
        transaction = resp.data[0]
        if transaction.get("status") == "refunded":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction already refunded"
            )
            
        # Update transaction status
        db.table("billing_transactions").update({"status": "refund_requested"}).eq("id", refund_request.transaction_id).execute()
        
        logger.info(f"User {current_user.id} requested refund for transaction {refund_request.transaction_id}")
        
        return {
            "message": "Refund request submitted successfully",
            "refund_id": str(transaction.get("id")),
            "status": "pending",
            "note": "Your refund request will be reviewed within 3-5 business days"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting refund: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to request refund"
        )


# ============================================
# Usage Statistics
# ============================================

@router.get("/usage-stats", response_model=UsageStatsResponse)
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_usage_stats(
    request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get billing period usage statistics
    """
    try:
        user_uuid = str(current_user.id)
        period_end = datetime.utcnow()
        period_start = period_end - timedelta(days=30)
        
        # 1. Get credits purchased in period
        purchases_resp = db.table("billing_transactions").select("credits_added").eq("user_id", user_uuid).eq("status", "completed").gte("created_at", period_start.isoformat()).lte("created_at", period_end.isoformat()).execute()
        credits_purchased = sum(float(x.get("credits_added", 0)) for x in purchases_resp.data) if purchases_resp.data else 0
        
        # 2. Get credits spent in period
        spent_resp = db.table("usage_logs").select("cost").eq("user_id", user_uuid).gte("created_at", period_start.isoformat()).lte("created_at", period_end.isoformat()).execute()
        credits_spent = sum(float(x.get("cost", 0)) for x in spent_resp.data) if spent_resp.data else 0
        
        # 3. Get current balance
        credits_resp = db.table("user_credits").select("credits_balance").eq("user_id", user_uuid).execute()
        credits_remaining = float(credits_resp.data[0].get("credits_balance", 0)) if credits_resp.data else 0
        
        # 4. Get spending by service
        spending_by_service = {}
        if spent_resp.data:
            for log in spent_resp.data:
                svc = log.get("service_type", "unknown")
                spending_by_service[svc] = spending_by_service.get(svc, 0.0) + float(log.get("cost", 0))
                
        return UsageStatsResponse(
            current_period_start=period_start,
            current_period_end=period_end,
            credits_purchased=credits_purchased,
            credits_spent=credits_spent,
            credits_remaining=credits_remaining,
            spending_by_service=spending_by_service
        )
    
    except Exception as e:
        logger.error(f"Error fetching usage stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch usage stats"
        )


# ============================================
# Promo Code Validation (User-facing)
# ============================================

from core.database import get_db

class PromoCodeValidation(BaseModel):
    code: str
    item_type: str = "subscription"  # subscription or credit
    item_id: Optional[str] = None
    amount: Optional[float] = None


@router.post("/validate-promo")
async def validate_promo_code(
    request: Request,
    data: PromoCodeValidation,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Validate a promo code and return discount details"""
    try:
        # Find promo code
        response = db.table("promo_codes").select("*").eq("code", data.code.upper()).eq("is_active", True).execute()
        
        if not response.data:
            return {"valid": False, "message": "Geçersiz promo kodu"}
        
        promo = response.data[0]
        now = datetime.utcnow()
        
        # Check validity dates
        if promo.get("valid_from") and datetime.fromisoformat(promo["valid_from"].replace("Z", "+00:00")) > now:
            return {"valid": False, "message": "Promo kodu henüz aktif değil"}
        
        if promo.get("valid_until") and datetime.fromisoformat(promo["valid_until"].replace("Z", "+00:00")) < now:
            return {"valid": False, "message": "Promo kodunun süresi dolmuş"}
        
        # Check max uses
        if promo.get("max_uses") and promo.get("current_uses", 0) >= promo["max_uses"]:
            return {"valid": False, "message": "Promo kod limiti dolmuş"}
        
        # Check user usage limit
        user_uses = db.table("promo_code_uses").select("id").eq("promo_code_id", promo["id"]).eq("user_id", str(current_user.id)).execute()
        if len(user_uses.data or []) >= promo.get("max_uses_per_user", 1):
            return {"valid": False, "message": "Bu promo kodunu zaten kullandınız"}
        
        # Check applicable_to
        applicable = promo.get("applicable_to", ["all"])
        if "all" not in applicable and data.item_type not in applicable:
            return {"valid": False, "message": f"Bu kod {data.item_type} için geçerli değil"}
        
        # Check minimum purchase
        if data.amount and promo.get("min_purchase", 0) > data.amount:
            return {"valid": False, "message": f"Minimum {promo['min_purchase']} USD gerekli"}
        
        # Calculate discount
        discount_info = {
            "type": promo["discount_type"],
            "value": promo["discount_value"],
            "description": ""
        }
        
        if promo["discount_type"] == "percent":
            discount_info["description"] = f"%{int(promo['discount_value'])} indirim"
        elif promo["discount_type"] == "fixed":
            discount_info["description"] = f"${promo['discount_value']} indirim"
        elif promo["discount_type"] == "credits":
            discount_info["description"] = f"+{int(promo['discount_value'])} bonus kredi"
        elif promo["discount_type"] == "trial":
            discount_info["description"] = f"{int(promo['discount_value'])} gün ücretsiz deneme"
        
        return {
            "valid": True,
            "code": promo["code"],
            "discount": discount_info,
            "promo_id": promo["id"]
        }
        
    except Exception as e:
        logger.error(f"Error validating promo: {e}")
        return {"valid": False, "message": "Doğrulama hatası"}


# ============================================
# Flexible Credit Purchase
# ============================================

class FlexibleCreditRequest(BaseModel):
    amount_usd: float = Field(..., ge=5, le=500)
    payment_method: str  # 'lemonsqueezy', 'nowpayments', 'metamask', 'binance'
    promo_code: Optional[str] = None


@router.post("/checkout/flexible-credit")
async def flexible_credit_checkout(
    data: FlexibleCreditRequest,
    http_request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Create a checkout session for flexible credit purchase.
    Routes to LemonSqueezy (card) or NowPayments (crypto) based on payment_method.
    """
    from core.logger import app_logger as logger

    session_id = str(uuid.uuid4())
    origin = http_request.headers.get("origin") or settings.FRONTEND_URL
    success_url = f"{origin}/billing?success=1&session={session_id}"
    cancel_url  = f"{origin}/billing?canceled=1"

    # Kredi hesapla (1 USD = 100 kredi varsayılan)
    credits_per_usd = 100
    try:
        cfg = db.table("credit_config").select("credits_per_usd").limit(1).execute()
        if cfg.data:
            credits_per_usd = int(cfg.data[0].get("credits_per_usd", 100))
    except Exception:
        pass

    credits = int(data.amount_usd * credits_per_usd)
    item_name = f"ZexAI Credits — ${data.amount_usd:.0f}"
    user_email = getattr(current_user, "email", "") or ""

    # ── Pending payment kaydet ────────────────────────────────────
    create_pending_payment(
        db=db,
        session_id=session_id,
        user_id=str(current_user.id),
        item_type="flexible_credits",
        payment_method=data.payment_method,
        amount_usd=data.amount_usd,
        credits=credits,
    )

    # ── Route to payment provider ─────────────────────────────────
    try:
        if data.payment_method == "lemonsqueezy":
            checkout_url = await create_lemonsqueezy_checkout(
                session_id=session_id,
                item_name=item_name,
                price_usd=data.amount_usd,
                email=user_email,
                success_url=success_url,
                cancel_url=cancel_url,
            )
            return {"success": True, "checkout_url": checkout_url, "session_id": session_id}

        elif data.payment_method == "nowpayments":
            checkout_url = await create_nowpayments_invoice(
                session_id=session_id,
                item_name=item_name,
                price_usd=data.amount_usd,
                success_url=success_url,
                cancel_url=cancel_url,
            )
            return {"success": True, "checkout_url": checkout_url, "session_id": session_id}

        elif data.payment_method == "metamask":
            # Web3 frontend handles the tx — return payment data
            return {
                "success": True,
                "payment_method": "metamask",
                "session_id": session_id,
                "payment_data": {
                    "contract_address": settings.METAMASK_CONTRACT_ADDRESS,
                    "recipient_address": settings.COMPANY_WALLET_ADDRESS,
                    "amount_usd": data.amount_usd,
                    "session_id": session_id,
                    "discount_applied": settings.METAMASK_DISCOUNT_PERCENT,
                },
            }

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported payment method: {data.payment_method}")

    except HTTPException:
        raise
    except ValueError as ve:
        logger.error(f"[checkout/flexible-credit] Config error: {ve}")
        raise HTTPException(status_code=503, detail=str(ve))
    except Exception as e:
        logger.error(f"[checkout/flexible-credit] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Checkout session creation failed")


@router.get("/credit-config")
async def get_credit_config_public(db = Depends(get_db)):
    """Get credit configuration for purchase page"""
    try:
        response = db.table("credit_config").select("*").limit(1).execute()
        if response.data:
            config = response.data[0]
            return {
                "min_purchase_usd": config.get("min_purchase_usd", 5),
                "max_purchase_usd": config.get("max_purchase_usd", 500),
                "credits_per_usd": config.get("credits_per_usd", 100),
                "bulk_discounts": config.get("bulk_discounts", {})
            }
        return {
            "min_purchase_usd": 5,
            "max_purchase_usd": 500,
            "credits_per_usd": 100,
            "bulk_discounts": {"50": 5, "100": 10, "250": 15, "500": 20}
        }
    except Exception as e:
        return {
            "min_purchase_usd": 5,
            "max_purchase_usd": 500,
            "credits_per_usd": 100,
            "bulk_discounts": {}
        }


@router.post("/calculate-price")
async def calculate_price(
    request: Request,
    amount_usd: float = Query(..., ge=5, le=500),
    promo_code: Optional[str] = None,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Calculate price with discounts for flexible credit purchase"""
    try:
        # Get config
        config_resp = db.table("credit_config").select("*").limit(1).execute()
        config = config_resp.data[0] if config_resp.data else {
            "credits_per_usd": 100,
            "bulk_discounts": {"50": 5, "100": 10, "250": 15, "500": 20}
        }
        
        credits_per_usd = config.get("credits_per_usd", 100)
        bulk_discounts = config.get("bulk_discounts", {})
        
        # Calculate bulk discount
        bulk_discount_percent = 0
        for threshold, discount in sorted(bulk_discounts.items(), key=lambda x: float(x[0]), reverse=True):
            if amount_usd >= float(threshold):
                bulk_discount_percent = discount
                break
        
        # Calculate base credits
        base_credits = int(amount_usd * credits_per_usd)
        
        # Apply bulk discount to price
        discounted_price = amount_usd * (1 - bulk_discount_percent / 100)
        
        # Promo code discount
        promo_discount = 0
        promo_bonus_credits = 0
        promo_info = None
        
        if promo_code:
            promo_resp = db.table("promo_codes").select("*").eq("code", promo_code.upper()).eq("is_active", True).execute()
            if promo_resp.data:
                promo = promo_resp.data[0]
                promo_info = {"code": promo["code"], "type": promo["discount_type"]}
                
                if promo["discount_type"] == "percent":
                    promo_discount = discounted_price * (promo["discount_value"] / 100)
                elif promo["discount_type"] == "fixed":
                    promo_discount = min(promo["discount_value"], discounted_price)
                elif promo["discount_type"] == "credits":
                    promo_bonus_credits = int(promo["discount_value"])
        
        final_price = max(0, discounted_price - promo_discount)
        total_credits = base_credits + promo_bonus_credits
        
        return {
            "original_price": amount_usd,
            "bulk_discount_percent": bulk_discount_percent,
            "promo_discount": round(promo_discount, 2),
            "final_price": round(final_price, 2),
            "base_credits": base_credits,
            "bonus_credits": promo_bonus_credits,
            "total_credits": total_credits,
            "promo_applied": promo_info
        }
        
    except Exception as e:
        logger.error(f"Error calculating price: {e}")
        raise HTTPException(500, "Fiyat hesaplama hatası")


@router.get("/special-packages")
async def get_active_special_packages(db = Depends(get_db)):
    """Get active special packages for display"""
    try:
        now = datetime.utcnow().isoformat()
        response = db.table("special_packages").select("*").eq("is_active", True).execute()
        
        # Filter by date
        packages = []
        for pkg in response.data or []:
            valid_from = pkg.get("valid_from")
            valid_until = pkg.get("valid_until")
            
            if valid_from and valid_from > now:
                continue
            if valid_until and valid_until < now:
                continue
            
            packages.append(pkg)
        
        return {"success": True, "packages": packages}
    except Exception as e:
        return {"success": True, "packages": []}


@router.get("/durations")
async def get_subscription_durations(db = Depends(get_db)):
    """Get available subscription duration options"""
    try:
        response = db.table("subscription_durations").select("*").eq("is_active", True).order("months").execute()
        return {"durations": response.data or [
            {"id": "1_month", "months": 1, "discount_percent": 0, "label": "Aylık"},
            {"id": "6_months", "months": 6, "discount_percent": 10, "label": "6 Ay (%10 İndirim)"},
            {"id": "12_months", "months": 12, "discount_percent": 20, "label": "Yıllık (%20 İndirim)"}
        ]}
    except Exception:
        return {"durations": [
            {"id": "1_month", "months": 1, "discount_percent": 0, "label": "Aylık"},
            {"id": "6_months", "months": 6, "discount_percent": 10, "label": "6 Ay (%10 İndirim)"},
            {"id": "12_months", "months": 12, "discount_percent": 20, "label": "Yıllık (%20 İndirim)"}
        ]}


@router.get("/plans")
async def get_subscription_plans(db = Depends(get_db)):
    """Get active subscription plans (Frontend tab placeholder)"""
    try:
        response = db.table("subscription_plans").select("*").eq("is_active", True).execute()
        return {"plans": response.data or []}
    except Exception:
        return {"plans": []}


@router.get("/packages")
async def get_billing_packages(db = Depends(get_db)):
    """Get billing packages for BillingPage"""
    try:
        response = db.table("special_packages").select("*").eq("is_active", True).execute()
        packages = []
        for pkg in response.data or []:
            packages.append({
                "id": str(pkg.get("id")),
                "name": pkg.get("name", "Standard Package"),
                "credits": pkg.get("credits", 1000),
                "price": float(pkg.get("price", 10.0)),
                "discount": float(pkg.get("discount", 0.0)),
                "popular": pkg.get("is_popular", False)
            })
        return {"success": True, "data": packages}
    except Exception:
        return {"success": True, "data": []}

