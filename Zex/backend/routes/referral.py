from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from core.security import get_current_user
from services.referral_service import referral_service

router = APIRouter(tags=["Referral"])

@router.post("/referral/create")
async def create_referral_code(current_user = Depends(get_current_user)):
    """Generates a referral code for the current user."""
    try:
        code = await referral_service.create_referral_code_for_user(str(current_user.id))
        return {"status": "success", "code": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/referral/stats")
async def get_referral_stats(current_user = Depends(get_current_user)):
    """Gets referral stats for the current user."""
    try:
        # We can fetch directly from Supabase here or add a method in service
        # For simplicity, let's use the service or direct query if service method missing
        # But let's assume we want to return the code and stats from referral_codes table
        
        # Re-using the logic from create to ensure it exists and get data
        # In a real app, we might want a separate 'get' method that doesn't create
        code = await referral_service.create_referral_code_for_user(str(current_user.id))
        
        # Fetch full details
        data = referral_service.supabase.table("referral_codes").select("*").eq("user_id", str(current_user.id)).execute()
        
        return {"status": "success", "data": data.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/referral/history")
async def get_referral_history(current_user = Depends(get_current_user)):
    """Gets earning history."""
    try:
        data = referral_service.supabase.table("referral_earnings").select("*").eq("referrer_id", str(current_user.id)).order("created_at", desc=True).execute()
        return {"status": "success", "data": data.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
