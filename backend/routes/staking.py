from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime

from core.database import get_db
from core.security import get_current_user
from services.staking_service import StakingService
from core.logger import app_logger as logger

router = APIRouter()

class ClaimRequest(BaseModel):
    wallet_address: str
    message: str
    signature: str

@router.post("/claim")
async def claim_staking_rewards(
    claim_req: ClaimRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Verifies the user's signature and their staked balance on Polygon,
    and grants platform credits based on their staking tier.
    """
    logger.info(f"User {current_user.id} attempting to claim staking rewards with wallet {claim_req.wallet_address}")
    
    # Delegate to the StakingService for Web3 interaction
    result = await StakingService.process_monthly_claim(
        db=db,
        user_id=current_user.id,
        wallet_address=claim_req.wallet_address,
        message=claim_req.message,
        signature=claim_req.signature
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Staking doğrulaması başarısız oldu.")
        )
        
    return result

@router.get("/status")
async def get_claim_status(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Checks if the user has already claimed this month's rewards"""
    current_month = datetime.utcnow().strftime('%Y-%m')
    try:
        claim_check = db.table("staking_claims").select("*").eq("user_id", current_user.id).eq("claim_month", current_month).execute()
        has_claimed = claim_check.data and len(claim_check.data) > 0
        return {"has_claimed_this_month": has_claimed}
    except Exception as e:
        logger.warning(f"Error checking status: {e}")
        return {"has_claimed_this_month": False}
