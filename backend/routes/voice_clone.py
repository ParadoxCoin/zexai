"""
Voice Clone API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

from core.security import get_current_user
from services.voice_clone_service import voice_clone_service
from core.logger import logger


router = APIRouter(prefix="/voice", tags=["voice-clone"])


class GenerateSpeechRequest(BaseModel):
    voice_id: str
    text: str
    stability: float = 0.5
    similarity_boost: float = 0.75


@router.post("/clone")
async def clone_voice(
    name: str = Form(...),
    audio: UploadFile = File(...),
    description: str = Form(""),
    current_user = Depends(get_current_user)
):
    """Clone a voice from audio sample"""
    try:
        # Validate file
        if not audio.content_type or not audio.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="Sadece ses dosyası yükleyebilirsiniz")
        
        # Read audio data
        audio_data = await audio.read()
        
        # Check file size (max 10MB)
        if len(audio_data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Dosya 10MB'dan büyük olamaz")
        
        # TODO: Add credit deduction here when credit system is properly integrated
        
        # Clone voice - use current_user.id (SimpleNamespace attribute access)
        result = await voice_clone_service.clone_voice(
            user_id=current_user.id,
            name=name,
            audio_data=audio_data,
            description=description
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clone voice error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_voices(current_user = Depends(get_current_user)):
    """Get user's cloned voices"""
    voices = await voice_clone_service.list_user_voices(current_user.id)
    return {"voices": voices}


@router.delete("/{clone_id}")
async def delete_voice(clone_id: str, current_user = Depends(get_current_user)):
    """Delete a cloned voice"""
    result = await voice_clone_service.delete_voice(current_user.id, clone_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/generate")
async def generate_speech(
    request: GenerateSpeechRequest,
    current_user = Depends(get_current_user)
):
    """Generate speech using cloned voice"""
    # TODO: Add credit deduction here
    
    result = await voice_clone_service.generate_speech(
        voice_id=request.voice_id,
        text=request.text,
        stability=request.stability,
        similarity_boost=request.similarity_boost
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result


@router.get("/available")
async def get_available_voices(current_user = Depends(get_current_user)):
    """Get all available ElevenLabs voices"""
    voices = await voice_clone_service.get_available_voices()
    return {"voices": voices}
