"""
Avatar Routes - Talking Avatar Video Generation
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from core.security import get_current_user
from services.avatar_service import avatar_service
from core.logger import logger


router = APIRouter(prefix="/avatar", tags=["avatar"])


class CreateTalkRequest(BaseModel):
    image_url: str
    text: str
    voice_id: Optional[str] = "tr-TR-AhmetNeural"


class CreateTalkWithAudioRequest(BaseModel):
    image_url: str
    audio_url: str


@router.get("/voices")
async def get_voices():
    """Get available voices for TTS"""
    voices = await avatar_service.get_voices()
    return {"success": True, "data": voices}


@router.post("/generate")
async def create_talk(
    request: CreateTalkRequest,
    current_user = Depends(get_current_user)
):
    """
    Generate a talking avatar video from image and text
    """
    try:
        user_id = getattr(current_user, 'id', None)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        logger.info(f"Avatar generation request from user {user_id}")
        
        result = await avatar_service.create_talk(
            user_id=user_id,
            image_url=request.image_url,
            text=request.text,
            voice_id=request.voice_id
        )
        
        if not result.get("success"):
            if result.get("error") == "insufficient_credits":
                raise HTTPException(status_code=402, detail=result.get("message"))
            raise HTTPException(status_code=400, detail=result.get("message", "Generation failed"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Avatar generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-with-audio")
async def create_talk_with_audio(
    request: CreateTalkWithAudioRequest,
    current_user = Depends(get_current_user)
):
    """
    Generate a talking avatar video from image and custom audio
    """
    try:
        user_id = getattr(current_user, 'id', None)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        result = await avatar_service.create_talk_with_audio(
            user_id=user_id,
            image_url=request.image_url,
            audio_url=request.audio_url
        )
        
        if not result.get("success"):
            if result.get("error") == "insufficient_credits":
                raise HTTPException(status_code=402, detail=result.get("message"))
            raise HTTPException(status_code=400, detail=result.get("message"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Avatar with audio error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}")
async def get_talk_status(
    job_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get the status of an avatar generation job
    """
    try:
        result = await avatar_service.get_talk_status(job_id)
        
        if not result.get("success"):
            raise HTTPException(status_code=404, detail="Job not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/credits-cost")
async def get_credits_cost():
    """Get credit costs for different video durations"""
    return {
        "success": True,
        "data": {
            "costs": avatar_service.CREDIT_COSTS,
            "description": "Kredi maliyetleri saniye başına"
        }
    }


@router.get("/voices/premium")
async def get_premium_voices(
    current_user = Depends(get_current_user)
):
    """Get premium ElevenLabs voices for avatar generation"""
    try:
        from services.voice_clone_service import voice_clone_service
        
        # Get ElevenLabs available voices
        el_voices = await voice_clone_service.get_available_voices()
        
        # Format for frontend
        premium_voices = []
        for v in el_voices[:20]:  # Limit to 20 voices
            premium_voices.append({
                "id": v.get("voice_id", ""),
                "name": v.get("name", "Unknown"),
                "language": "multilingual",
                "gender": v.get("labels", {}).get("gender", "neutral"),
                "provider": "ElevenLabs",
                "flag": "🌍",
                "preview_url": v.get("preview_url", ""),
                "category": v.get("category", "premade"),
            })
        
        return {"success": True, "data": premium_voices}
        
    except Exception as e:
        logger.error(f"Get premium voices error: {str(e)}")
        return {"success": True, "data": []}


@router.get("/voices/cloned")
async def get_cloned_voices(
    current_user = Depends(get_current_user)
):
    """Get user's cloned voices"""
    try:
        from services.voice_clone_service import voice_clone_service
        
        user_id = getattr(current_user, 'id', None)
        if not user_id:
            return {"success": True, "data": []}
        
        cloned = await voice_clone_service.list_user_voices(user_id)
        
        voices = []
        for v in cloned:
            if v.get("status") == "ready":
                voices.append({
                    "id": v.get("elevenlabs_voice_id", v.get("id", "")),
                    "name": v.get("name", "Klonlanmış Ses"),
                    "language": "multilingual",
                    "gender": "neutral",
                    "provider": "clone",
                    "flag": "🎤",
                    "clone_id": v.get("id"),
                })
        
        return {"success": True, "data": voices}
        
    except Exception as e:
        logger.error(f"Get cloned voices error: {str(e)}")
        return {"success": True, "data": []}
