"""
Gamification Routes
API endpoints for gamification features
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from core.security import get_current_user
from services.gamification_service import GamificationService
from core.supabase_client import get_supabase_client
from core.logger import app_logger as logger
import traceback

router = APIRouter(prefix="/gamification", tags=["Gamification"])

def get_gamification_service():
    supabase = get_supabase_client()
    return GamificationService(supabase)

@router.get("/stats")
async def get_stats(
    current_user: dict = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Get user's gamification stats (level, XP, streak, etc.)"""
    try:
        user_id = getattr(current_user, 'id', None)
        logger.info(f"Gamification stats request for user: {user_id}")
        stats = await service.get_user_stats(user_id)
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"Gamification stats error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/daily-claim")
async def claim_daily_reward(
    current_user: dict = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Claim daily streak reward"""
    try:
        result = await service.claim_daily_reward(current_user.id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/achievements")
async def get_achievements(
    current_user: dict = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Get user's achievements"""
    try:
        achievements = await service.get_achievements(current_user.id)
        return {"success": True, "data": achievements}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/achievements/new")
async def get_new_achievements(
    current_user: dict = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Get newly unlocked achievements (for popup notifications)"""
    try:
        new_achievements = await service.get_new_achievements(current_user.id)
        return {"success": True, "data": new_achievements}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leaderboard")
async def get_leaderboard(
    period: str = "weekly",
    limit: int = 10,
    service: GamificationService = Depends(get_gamification_service)
):
    """Get leaderboard"""
    try:
        leaderboard = await service.get_leaderboard(period, limit)
        return {"success": True, "data": leaderboard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/levels")
async def get_levels():
    """Get all level definitions"""
    try:
        supabase = get_supabase_client()
        result = supabase.table('gamification_levels').select('*').order('level').execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
