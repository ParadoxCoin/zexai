"""
Credit system management and middleware
Handles credit checking, deduction, and logging using Supabase.

ATOMIC OPERATIONS: deduct_credits / add_credits / refund_credits now use
Supabase RPC (PostgreSQL stored procedures in supabase/atomic_credits.sql)
to prevent race conditions. Both the balance update and the usage_log INSERT
execute inside a single database transaction — parallel requests can no longer
exploit a stale read to spend credits they don't have.
"""
from fastapi import HTTPException, status, Depends
from datetime import datetime
from types import SimpleNamespace
from typing import Dict, Any, Optional
import uuid
import json

# Flag: True when Supabase RPC functions exist in the database.
# Set to False only if you haven't run supabase/atomic_credits.sql yet;
# a WARNING will be logged and the legacy (non-atomic) path will be used.
ATOMIC_OPS_AVAILABLE: bool = True

from core.database import get_db
from core.security import get_current_user
from core.exceptions import (
    CreditInsufficientError, DatabaseError, ValidationError
)
from core.cache import cache_service, CacheKeys, CacheInvalidation
from core.websocket import notify_credit_update
from core.logger import app_logger as logger
from core.unified_model_registry import model_registry



class CreditManager:
    """Manages credit operations for users using Supabase"""
    
    @staticmethod
    async def get_service_cost(
        db, 
        service_type: str, 
        unit_amount: float = 1.0, 
        model_id: Optional[str] = None,
        duration: Optional[int] = None,
        resolution: Optional[str] = None
    ) -> float:
        """
        Get the credit cost for a service.
        If model_id is provided, it attempts to fetch model-specific pricing from the registry.
        """
        try:
            # 1. Attempt model-specific pricing if model_id is provided
            if model_id:
                try:
                    models = await model_registry.get_models(db, active_only=False)
                    model = next((m for m in models if m["id"] == model_id), None)
                    
                    if model:
                        cost_usd = float(model.get("cost_usd", 0))
                        multiplier = float(model.get("cost_multiplier", 2.0))
                        # Credits = cost * multiplier * 100
                        base_credits = float(model.get("credits") or (cost_usd * multiplier * 100))
                        
                        # 1. Duration Scaling (Per-Second Pricing)
                        final_credits = base_credits
                        if service_type == "video" and duration:
                            is_per_second = model.get("per_second_pricing", False)
                            base_duration = float(model.get("base_duration", 5))
                            
                            if is_per_second:
                                # Scale linearly: (duration / base_duration) * base_credits
                                final_credits = (duration / base_duration) * base_credits
                        
                        # 2. Quality/Resolution Multiplier
                        if service_type == "video" and resolution:
                            multipliers = model.get("quality_multipliers", {})
                            if not multipliers:
                                # Fallback to hardcoded defaults
                                multipliers = {"720p": 1.0, "1080p": 1.5, "4K": 2.5}
                            
                            res_mult = float(multipliers.get(resolution, multipliers.get(resolution.lower(), 1.0)))
                            final_credits = final_credits * res_mult

                        # Special handling for chat: cost is per 1000 units (tokens)
                        if model.get("category") == "chat":
                            return (float(final_credits) * unit_amount) # unit_amount should be tokens/1000
                        
                        if final_credits > 0:
                            return float(final_credits) * unit_amount
                except Exception as e:
                    logger.warning(f"Failed to fetch model-specific cost for {model_id}: {e}")

            # 2. Fallback to service-level costs
            # Default costs
            default_costs = {
                "chat": 1,      # 1 credit per 1000 tokens
                "image": 5,     # 5 credits per image
                "video": 10,    # 10 credits per second
                "synapse": 2    # 2 credits per Manus credit
            }
            
            # Try to fetch from DB service_costs table
            try:
                response = db.table("service_costs").select("cost_per_unit").eq("service_type", service_type).execute()
                if response.data:
                    cost_per_unit = response.data[0]["cost_per_unit"]
                else:
                    cost_per_unit = default_costs.get(service_type, 1)
            except Exception:
                cost_per_unit = default_costs.get(service_type, 1)
            
            return float(cost_per_unit) * unit_amount
            
        except Exception as e:
            logger.error(f"Error getting service cost: {e}")
            return 1.0 * unit_amount

    @staticmethod
    async def calculate_chat_cost(db, model_id: str, tokens: int) -> float:
        """
        Calculate credit cost for chat based on tokens.
        Default is 1 credit per 1000 tokens unless specified in ai_models.
        """
        return await CreditManager.get_service_cost(db, "chat", unit_amount=tokens/1000.0, model_id=model_id)

    
    @staticmethod
    async def check_sufficient_credits(db, user_id: str, required_credits: float):
        """Check if user has sufficient credits"""
        balance = await CreditManager.get_user_balance(db, user_id)
        if balance < required_credits:
            raise CreditInsufficientError(required_credits, balance)
    
    @staticmethod
    async def get_user_balance(db, user_id: str) -> float:
        """Get user's current credit balance"""
        try:
            response = db.table("user_credits").select("credits_balance").eq("user_id", user_id).execute()
            
            if response.data:
                return float(response.data[0]["credits_balance"])
            
            # If no record, create one with 0 credits (or default)
            # Note: The trigger 'handle_new_user' should have created this, but just in case
            try:
                db.table("user_credits").insert({
                    "user_id": user_id,
                    "credits_balance": 0.0
                }).execute()
                return 0.0
            except Exception as e:
                logger.error(f"Error creating user credits: {e}")
                return 0.0
                
        except Exception as e:
            logger.error(f"Error getting user balance: {e}")
            return 0.0
    
    @staticmethod
    async def deduct_credits(
        db,
        user_id: str,
        service_type: str,
        cost: float,
        details: Dict[str, Any] = None
    ) -> float:
        """
        Atomically deduct credits from user balance and log the usage.
        Uses a Supabase RPC (PostgreSQL stored procedure) so that the balance
        read, conditional check, update, and usage_log INSERT all happen in a
        single database transaction — eliminating race-condition exploits.
        Returns the new balance.
        """
        details_payload = details or {}

        # ── ATOMIC PATH (preferred) ──────────────────────────────────────────
        if ATOMIC_OPS_AVAILABLE:
            try:
                rpc_response = db.rpc(
                    "atomic_deduct_credits",
                    {
                        "p_user_id": user_id,
                        "p_cost": cost,
                        "p_service_type": service_type,
                        "p_details": json.dumps(details_payload),
                    }
                ).execute()

                # Supabase RPC returns the new balance as a scalar
                new_balance = float(rpc_response.data)

                # Notify user via WebSocket (fire-and-forget)
                await notify_credit_update(user_id, new_balance, -cost)

                # Low-credit email check (non-blocking)
                LOW_CREDIT_THRESHOLD = 50
                try:
                    import asyncio
                    from core.email_service import get_email_service
                    prev_balance = new_balance + cost
                    if new_balance < LOW_CREDIT_THRESHOLD and prev_balance >= LOW_CREDIT_THRESHOLD:
                        user_result = db.table("users").select("email, full_name").eq("id", user_id).execute()
                        if user_result.data:
                            user_data = user_result.data[0]
                            email_service = get_email_service()
                            asyncio.create_task(
                                email_service.send_credits_low(
                                    user_email=user_data.get("email"),
                                    user_name=user_data.get("full_name", "Kullanıcı"),
                                    current_credits=int(new_balance)
                                )
                            )
                            logger.info(f"Low credits email queued for {user_id}")
                except Exception as email_error:
                    logger.warning(f"Failed to send low credits email: {email_error}")

                return new_balance

            except Exception as rpc_err:
                err_str = str(rpc_err)
                # Map PostgreSQL INSUFFICIENT_CREDITS exception → CreditInsufficientError
                if "INSUFFICIENT_CREDITS" in err_str:
                    current = await CreditManager.get_user_balance(db, user_id)
                    raise CreditInsufficientError(cost, current)
                # If RPC doesn't exist yet, fall through to legacy path with warning
                if "does not exist" in err_str or "function" in err_str.lower():
                    logger.warning(
                        "[Credits] atomic_deduct_credits RPC not found — "
                        "falling back to non-atomic path. "
                        "Please run supabase/atomic_credits.sql!"
                    )
                else:
                    logger.error(f"[Credits] RPC deduct_credits failed: {rpc_err}")
                    raise DatabaseError(f"Credit deduction failed: {err_str}")

        # ── LEGACY FALLBACK (non-atomic — only used if RPC missing) ─────────
        logger.warning("[Credits] Using LEGACY non-atomic credit deduction. RACE CONDITION RISK!")
        current_balance = await CreditManager.get_user_balance(db, user_id)
        if current_balance < cost:
            raise CreditInsufficientError(cost, current_balance)

        try:
            new_balance = current_balance - cost
            update_response = db.table("user_credits").update({
                "credits_balance": new_balance,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).execute()

            if not update_response.data:
                raise DatabaseError("Failed to update credit balance")

            db.table("usage_logs").insert({
                "user_id": user_id,
                "service_type": service_type,
                "cost": cost,
                "details": json.dumps(details_payload),
                "created_at": datetime.utcnow().isoformat()
            }).execute()

            await notify_credit_update(user_id, new_balance, -cost)
            return new_balance

        except Exception as e:
            logger.error(f"Error deducting credits (legacy): {e}")
            raise DatabaseError(f"Credit deduction failed: {str(e)}")
    
    @staticmethod
    async def refund_credits(db, user_id: str, amount: float, details: Dict[str, Any] = None):
        """Atomically refund credits to user."""
        details_payload = details or {}
        if ATOMIC_OPS_AVAILABLE:
            try:
                rpc_response = db.rpc(
                    "atomic_add_credits",
                    {
                        "p_user_id": user_id,
                        "p_amount": amount,
                        "p_service_type": "refund",
                        "p_details": json.dumps(details_payload),
                    }
                ).execute()
                new_balance = float(rpc_response.data)
                await notify_credit_update(user_id, new_balance, amount)
                return
            except Exception as rpc_err:
                err_str = str(rpc_err)
                if "does not exist" in err_str or "function" in err_str.lower():
                    logger.warning("[Credits] atomic_add_credits RPC not found — falling back.")
                else:
                    logger.error(f"[Credits] RPC refund_credits failed: {rpc_err}")
                    return

        # Legacy fallback
        try:
            current_balance = await CreditManager.get_user_balance(db, user_id)
            new_balance = current_balance + amount
            db.table("user_credits").update({
                "credits_balance": new_balance,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).execute()
            db.table("usage_logs").insert({
                "user_id": user_id,
                "service_type": "refund",
                "cost": -amount,
                "details": json.dumps(details_payload),
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            await notify_credit_update(user_id, new_balance, amount)
        except Exception as e:
            logger.error(f"Error refunding credits (legacy): {e}")

    @staticmethod
    async def add_credits(db, user_id: str, amount: float, reason: str = "purchase"):
        """Atomically add credits to user balance."""
        details_payload = {"reason": reason}
        if ATOMIC_OPS_AVAILABLE:
            try:
                rpc_response = db.rpc(
                    "atomic_add_credits",
                    {
                        "p_user_id": user_id,
                        "p_amount": amount,
                        "p_service_type": "credit_purchase",
                        "p_details": json.dumps(details_payload),
                    }
                ).execute()
                new_balance = float(rpc_response.data)
                await notify_credit_update(user_id, new_balance, amount)
                return
            except Exception as rpc_err:
                err_str = str(rpc_err)
                if "does not exist" in err_str or "function" in err_str.lower():
                    logger.warning("[Credits] atomic_add_credits RPC not found — falling back.")
                else:
                    logger.error(f"[Credits] RPC add_credits failed: {rpc_err}")
                    return

        # Legacy fallback
        try:
            current_balance = await CreditManager.get_user_balance(db, user_id)
            new_balance = current_balance + amount
            db.table("user_credits").update({
                "credits_balance": new_balance,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).execute()
            db.table("usage_logs").insert({
                "user_id": user_id,
                "service_type": "credit_purchase",
                "cost": -amount,
                "details": json.dumps(details_payload),
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            await notify_credit_update(user_id, new_balance, amount)
        except Exception as e:
            logger.error(f"Error adding credits (legacy): {e}")


async def check_credits_dependency(
    service_type: str,
    estimated_units: float = 1.0
):
    """
    FastAPI dependency factory for credit checking
    """
    async def _check(
        current_user: SimpleNamespace = Depends(get_current_user),
        db = Depends(get_db)
    ):
        cost = await CreditManager.get_service_cost(db, service_type, estimated_units)
        balance = await CreditManager.get_user_balance(db, current_user.id)
        
        if balance < cost:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient credits. Required: {cost}, Available: {balance}"
            )
        
        return {"cost": cost, "balance": balance}
    
    return _check

