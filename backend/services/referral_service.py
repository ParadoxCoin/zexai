import random
import string
from typing import Optional, List
from datetime import datetime
from core.supabase_client import get_supabase_client

class ReferralService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def generate_referral_code(self, length=8) -> str:
        """Generates a random alphanumeric code."""
        chars = string.ascii_uppercase + string.digits
        return "MANUS-" + ''.join(random.choice(chars) for _ in range(length))

    async def create_referral_code_for_user(self, user_id: str) -> str:
        """Creates a unique referral code for a user if they don't have one."""
        # Check if exists
        existing = self.supabase.table("referral_codes").select("code").eq("user_id", user_id).execute()
        if existing.data:
            return existing.data[0]["code"]

        # Generate unique code
        while True:
            code = self.generate_referral_code()
            # Check collision
            check = self.supabase.table("referral_codes").select("id").eq("code", code).execute()
            if not check.data:
                break
        
        # Insert
        self.supabase.table("referral_codes").insert({
            "user_id": user_id,
            "code": code,
            "total_referrals": 0,
            "total_earnings": 0.00
        }).execute()
        
        return code

    async def register_referral(self, new_user_id: str, referral_code: str):
        """Links a new user to a referrer."""
        if not referral_code:
            return
            
        # Find referrer
        referrer_data = self.supabase.table("referral_codes").select("user_id").eq("code", referral_code).execute()
        if not referrer_data.data:
            return # Invalid code
            
        referrer_id = referrer_data.data[0]["user_id"]
        
        # Prevent self-referral
        if referrer_id == new_user_id:
            return

        # Create link
        self.supabase.table("referrals").insert({
            "referrer_id": referrer_id,
            "referred_id": new_user_id,
            "status": "active"
        }).execute()
        
        # Increment count
        # Note: Ideally use a stored procedure or trigger for atomicity
        # For now, simple update
        current_stats = self.supabase.table("referral_codes").select("total_referrals").eq("user_id", referrer_id).execute()
        current_count = current_stats.data[0]["total_referrals"] if current_stats.data else 0
        
        self.supabase.table("referral_codes").update({
            "total_referrals": current_count + 1
        }).eq("user_id", referrer_id).execute()

    async def process_commission(self, user_id: str, purchase_amount: float):
        """
        Called when a user makes a payment.
        Checks if they were referred, calculates commission, and records it.
        """
        # Check if user was referred
        referral = self.supabase.table("referrals").select("referrer_id").eq("referred_id", user_id).execute()
        if not referral.data:
            return # Not referred
            
        referrer_id = referral.data[0]["referrer_id"]
        
        # Determine Rate (Mock: Check if Staker)
        # TODO: Implement actual Staker check logic
        is_staker = False 
        commission_rate = 0.02 if is_staker else 0.01
        
        commission_amount = purchase_amount * commission_rate
        
        # Record Earning
        self.supabase.table("referral_earnings").insert({
            "referrer_id": referrer_id,
            "source_user_id": user_id,
            "amount": commission_amount,
            "purchase_amount": purchase_amount,
            "commission_rate": commission_rate,
            "status": "pending"
        }).execute()
        
        # Update Total Earnings
        current_stats = self.supabase.table("referral_codes").select("total_earnings").eq("user_id", referrer_id).execute()
        current_total = current_stats.data[0]["total_earnings"] if current_stats.data else 0.0
        
        self.supabase.table("referral_codes").update({
            "total_earnings": float(current_total) + commission_amount
        }).eq("user_id", referrer_id).execute()
        
        return commission_amount

referral_service = ReferralService()
