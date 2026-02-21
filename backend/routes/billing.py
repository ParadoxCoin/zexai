"""
Billing and subscription routes with multi-payment support
Supports: LemonSqueezy, 2Checkout, NowPayments, Binance Pay, MetaMask
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
from core.database import get_database
from core.credits import CreditManager
from core.config import settings
from core.payment_security import (
    WebhookVerifier, BlockchainVerifier, PaymentIdempotency, 
    PaymentProviderClient, InvoiceGenerator
)
import json
from services.referral_service import referral_service


router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])


# Subscription plan definitions
SUBSCRIPTION_PLANS = {
    "basic": {
        "id": "basic",
        "name": "Basic",
        "monthly_price": 25.0,
        "monthly_credits": 2500,
        "description": "Perfect for individuals and small projects",
        "features": [
            "2,500 credits per month",
            "All AI services (Chat, Image, Video)",
            "Basic Synapse agent access",
            "Email support"
        ]
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "monthly_price": 75.0,
        "monthly_credits": 8000,
        "description": "For professionals and growing businesses",
        "features": [
            "8,000 credits per month",
            "All AI services (Chat, Image, Video)",
            "Full Synapse agent access",
            "Priority support",
            "Advanced analytics"
        ]
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "monthly_price": 250.0,
        "monthly_credits": 30000,
        "description": "For large teams and high-volume usage",
        "features": [
            "30,000 credits per month",
            "All AI services (Chat, Image, Video)",
            "Unlimited Synapse agent access",
            "Dedicated support",
            "Custom integrations",
            "SLA guarantee"
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
            description="Pay with your Binance account",
            logo_url="/assets/binance-logo.png",
            discount_percent=0,
            final_price=item_price
        ),
        PaymentOption(
            method=PaymentMethod.METAMASK,
            name="MetaMask (Your Token)",
            description=f"Pay with our token and get {settings.METAMASK_DISCOUNT_PERCENT}% extra discount!",
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
    db = Depends(get_database)
):
    """Get current user's subscription status"""
    subscription = await db.user_subscriptions.find_one({
        "user_id": current_user.id,
        "status": {"$in": ["active", "trialing", "past_due"]}
    })
    
    if not subscription:
        return SubscriptionStatus(has_subscription=False)
    
    plan_id = subscription.get("plan_id")
    plan_data = SUBSCRIPTION_PLANS.get(plan_id, {})
    
    return SubscriptionStatus(
        has_subscription=True,
        plan_name=plan_data.get("name", plan_id),
        status=subscription["status"],
        current_period_end=subscription.get("current_period_end"),
        cancel_at_period_end=subscription.get("cancel_at_period_end", False),
        monthly_credits=plan_data.get("monthly_credits"),
        next_billing_date=subscription.get("current_period_end")
    )


@router.post("/checkout/create", response_model=CheckoutResponse)
async def create_checkout(
    request: CreateCheckoutRequest,
    http_request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Create a checkout session for subscription or top-up
    Supports multiple payment methods
    """
    # Get item details
    if request.item_type == "subscription":
        if request.item_id not in SUBSCRIPTION_PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan ID")
        
        item_data = SUBSCRIPTION_PLANS[request.item_id]
        item_price = item_data["monthly_price"]
        item_name = f"{item_data['name']} Subscription"
        credits = item_data["monthly_credits"]
        
    elif request.item_type == "top_up":
        package = await db.pricing_packages.find_one({"id": request.item_id, "active": True})
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        item_price = package["usd_price"]
        item_name = f"{package['name']} Credit Package"
        credits = package["credit_amount"]
        
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")
    
    # Calculate final price with discounts
    price_breakdown = calculate_final_price(item_price, request.payment_method)
    
    # Create payment session ID
    session_id = str(uuid.uuid4())
    
    # Store pending payment
    payment_record = {
        "session_id": session_id,
        "user_id": current_user.id,
        "item_type": request.item_type,
        "item_id": request.item_id,
        "payment_method": request.payment_method.value,
        "original_price": item_price,
        "final_price": price_breakdown.final_price,
        "credits": credits,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    await db.pending_payments.insert_one(payment_record)
    
    # Build callback URLs
    origin = http_request.headers.get('origin') or settings.FRONTEND_URL
    success_url = f"{origin}/payment/success?session={session_id}"
    cancel_url = f"{origin}/pricing?canceled=1"
    
    # Route to appropriate payment provider
    try:
        if request.payment_method == PaymentMethod.LEMONSQUEEZY:
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

async def create_lemonsqueezy_checkout(session_id: str, item_name: str, price: float, email: str, success_url: str, cancel_url: str) -> str:
    """Create LemonSqueezy checkout session"""
    if not settings.LEMONSQUEEZY_API_KEY:
        raise ValueError("LemonSqueezy API key not configured")
    
    # LemonSqueezy API implementation
    # https://docs.lemonsqueezy.com/api/checkouts
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.lemonsqueezy.com/v1/checkouts",
            headers={
                "Authorization": f"Bearer {settings.LEMONSQUEEZY_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "data": {
                    "type": "checkouts",
                    "attributes": {
                        "custom_price": int(price * 100),  # Convert to cents
                        "product_options": {
                            "name": item_name,
                            "description": f"Session: {session_id}"
                        },
                        "checkout_data": {
                            "email": email,
                            "custom": {"session_id": session_id}
                        },
                        "checkout_options": {
                            "button_color": "#7C3AED"
                        },
                        "redirect_url": success_url
                    }
                }
            },
            timeout=20.0
        )
        
        if response.status_code not in (200, 201):
            raise ValueError(f"LemonSqueezy error: {response.status_code}")
        
        data = response.json()
        return data["data"]["attributes"]["url"]


async def create_2checkout_session(session_id: str, item_name: str, price: float, email: str, success_url: str, cancel_url: str) -> str:
    """Create 2Checkout session"""
    if not settings.TWOCHECKOUT_API_KEY:
        raise ValueError("2Checkout API key not configured")
    
    # 2Checkout API implementation
    # https://knowledgecenter.2checkout.com/API-Integration
    # Placeholder - implement based on 2Checkout docs
    return f"https://secure.2checkout.com/checkout/buy?session={session_id}"


async def create_nowpayments_invoice(session_id: str, item_name: str, price: float, success_url: str, cancel_url: str) -> str:
    """Create NowPayments invoice"""
    if not settings.NOWPAYMENTS_API_KEY:
        raise ValueError("NowPayments API key not configured")
    
    # NowPayments API implementation
    # https://documenter.getpostman.com/view/7907941/S1a32n38
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.nowpayments.io/v1/invoice",
            headers={
                "x-api-key": settings.NOWPAYMENTS_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "price_amount": price,
                "price_currency": "usd",
                "order_id": session_id,
                "order_description": item_name,
                "ipn_callback_url": f"{settings.MANUS_CALLBACK_BASE_URL}/api/v1/billing/webhooks/nowpayments",
                "success_url": success_url,
                "cancel_url": cancel_url
            },
            timeout=20.0
        )
        
        if response.status_code not in (200, 201):
            raise ValueError(f"NowPayments error: {response.status_code}")
        
        data = response.json()
        return data["invoice_url"]


async def create_binance_payment(session_id: str, item_name: str, price: float) -> str:
    """Create Binance Pay order"""
    if not settings.BINANCE_API_KEY:
        raise ValueError("Binance API key not configured")
    
    # Binance Pay API implementation
    # https://developers.binance.com/docs/binance-pay/introduction
    # Placeholder - implement based on Binance docs
    return f"https://pay.binance.com/checkout/{session_id}"


@router.post("/webhooks/lemonsqueezy")
async def lemonsqueezy_webhook(request: Request, db = Depends(get_database)):
    """Webhook for LemonSqueezy payment events"""
    try:
        payload = await request.json()
        
        # Extract session_id from custom data
        custom_data = payload.get("meta", {}).get("custom_data", {})
        session_id = custom_data.get("session_id")
        
        if not session_id:
            return {"status": "error", "message": "Missing session_id"}
        
        # Find pending payment
        payment = await db.pending_payments.find_one({"session_id": session_id})
        
        if not payment:
            return {"status": "error", "message": "Payment not found"}
        
        # Mark as completed and add credits
        await process_successful_payment(db, payment)
        
        return {"status": "ok"}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/webhooks/nowpayments")
async def nowpayments_webhook(request: Request, db = Depends(get_database)):
    """Webhook for NowPayments IPN"""
    try:
        payload = await request.json()
        
        # Verify IPN signature
        if settings.NOWPAYMENTS_IPN_SECRET:
            signature = request.headers.get("x-nowpayments-sig")
            # Verify signature logic here
        
        order_id = payload.get("order_id")
        payment_status = payload.get("payment_status")
        
        if payment_status == "finished":
            payment = await db.pending_payments.find_one({"session_id": order_id})
            
            if payment:
                await process_successful_payment(db, payment)
        
        return {"status": "ok"}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/webhooks/metamask")
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
        
        # Verify transaction on blockchain
        blockchain_verifier = BlockchainVerifier()
        verification_result = await blockchain_verifier.verify_transaction(
            tx_hash,
            payment["final_price"],
            settings.COMPANY_WALLET_ADDRESS
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
    db = Depends(get_database)
):
    """Cancel user's subscription"""
    subscription = await db.user_subscriptions.find_one({
        "user_id": current_user.id,
        "status": {"$in": ["active", "trialing"]}
    })
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if immediate:
        update_data["status"] = "canceled"
        update_data["canceled_at"] = datetime.utcnow()
    else:
        update_data["cancel_at_period_end"] = True
    
    await db.user_subscriptions.update_one(
        {"id": subscription["id"]},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Subscription canceled successfully",
        "immediate": immediate,
        "active_until": subscription.get("current_period_end") if not immediate else None
    }




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
    db = Depends(get_database)
):
    """
    Get user's billing transaction history
    """
    try:
        query = {"user_id": current_user.id}
        
        # Get total count
        total = await db.billing_transactions.count_documents(query)
        
        # Get paginated transactions
        skip = (page - 1) * page_size
        cursor = db.billing_transactions.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        transactions = await cursor.to_list(length=page_size)
        
        # Convert to response model
        transaction_list = [BillingTransaction(**txn) for txn in transactions]
        
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
    db = Depends(get_database)
):
    """
    Get user's invoices
    """
    try:
        query = {"user_id": current_user.id}
        
        # Get total count
        total = await db.invoices.count_documents(query)
        
        # Get paginated invoices
        skip = (page - 1) * page_size
        cursor = db.invoices.find(query).sort("issued_at", -1).skip(skip).limit(page_size)
        invoices = await cursor.to_list(length=page_size)
        
        # Convert to response model
        invoice_list = [Invoice(**inv) for inv in invoices]
        
        return InvoiceListResponse(
            invoices=invoice_list,
            total=total,
            page=page,
            page_size=page_size,
            has_more=skip + len(invoices) < total
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
    db = Depends(get_database)
):
    """
    Get invoice details
    """
    try:
        invoice = await db.invoices.find_one({
            "id": invoice_id,
            "user_id": current_user.id
        })
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        
        return Invoice(**invoice)
    
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
    db = Depends(get_database)
):
    """
    Download invoice as PDF
    """
    try:
        invoice = await db.invoices.find_one({
            "id": invoice_id,
            "user_id": current_user.id
        })
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        
        # Generate and return PDF invoice
        try:
            # Generate PDF invoice
            pdf_data = await InvoiceGenerator.generate_invoice_pdf(invoice)
            
            # Return PDF file
            from fastapi.responses import FileResponse
            import tempfile
            import os
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(pdf_data)
                tmp_path = tmp_file.name
            
            return FileResponse(
                tmp_path,
                media_type="application/pdf",
                filename=f"invoice_{invoice['invoice_number']}.pdf",
                background=lambda: os.unlink(tmp_path)  # Clean up temp file
            )
            
        except Exception as e:
            logger.error(f"Failed to generate invoice PDF: {e}")
            # Fallback to JSON response
            return {
                "message": "PDF generation temporarily unavailable",
                "invoice_id": invoice_id,
                "invoice_number": invoice.get("invoice_number"),
                "amount_usd": invoice.get("amount_usd"),
                "status": invoice.get("status")
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
    db = Depends(get_database)
):
    """
    Request a refund for a transaction
    """
    try:
        # Find transaction
        transaction = await db.billing_transactions.find_one({
            "id": refund_request.transaction_id,
            "user_id": current_user.id
        })
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        if transaction.get("status") == "refunded":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction already refunded"
            )
        
        # Create refund record
        refund_id = str(uuid.uuid4())
        refund_record = {
            "id": refund_id,
            "user_id": current_user.id,
            "transaction_id": refund_request.transaction_id,
            "amount_usd": transaction.get("amount_usd", 0),
            "credits_to_deduct": transaction.get("credits_added", 0),
            "reason": refund_request.reason,
            "status": "pending",  # pending, approved, rejected
            "created_at": datetime.utcnow()
        }
        
        await db.refunds.insert_one(refund_record)
        
        logger.info(f"User {current_user.id} requested refund for transaction {refund_request.transaction_id}")
        
        return {
            "message": "Refund request submitted successfully",
            "refund_id": refund_id,
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
    db = Depends(get_database)
):
    """
    Get billing period usage statistics
    """
    try:
        # Get current billing period (simplified - last 30 days)
        period_end = datetime.utcnow()
        period_start = period_end - timedelta(days=30)
        
        # Get credits purchased in period
        purchase_pipeline = [
            {
                "$match": {
                    "user_id": current_user.id,
                    "created_at": {"$gte": period_start, "$lte": period_end},
                    "status": "completed"
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$credits_added"}}}
        ]
        purchase_result = await db.billing_transactions.aggregate(purchase_pipeline).to_list(length=1)
        credits_purchased = purchase_result[0]["total"] if purchase_result else 0
        
        # Get credits spent in period
        spent_pipeline = [
            {
                "$match": {
                    "user_id": current_user.id,
                    "created_at": {"$gte": period_start, "$lte": period_end}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$credits_charged"}}}
        ]
        spent_result = await db.usage_logs.aggregate(spent_pipeline).to_list(length=1)
        credits_spent = spent_result[0]["total"] if spent_result else 0
        
        # Get current balance
        credit_record = await db.user_credits.find_one({"user_id": current_user.id})
        credits_remaining = credit_record.get("credits_balance", 0) if credit_record else 0
        
        # Get spending by service
        service_pipeline = [
            {
                "$match": {
                    "user_id": current_user.id,
                    "created_at": {"$gte": period_start, "$lte": period_end}
                }
            },
            {"$group": {"_id": "$service_type", "total": {"$sum": "$credits_charged"}}}
        ]
        service_result = await db.usage_logs.aggregate(service_pipeline).to_list(length=100)
        spending_by_service = {item["_id"]: item["total"] for item in service_result}
        
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
    payment_method: PaymentMethod
    promo_code: Optional[str] = None


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
