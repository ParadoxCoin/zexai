from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

from core.database import get_database
from core.security import get_current_user
from core.audio_models_extended import ALL_AUDIO_MODELS, TTS_MODELS, MUSIC_MODELS, SFX_MODELS, AUDIO_TOOLS, MUSIC_STYLES, VOICE_PRESETS
from core.ai_provider_manager import ai_provider_manager, ServiceType
from core.credits import CreditManager


router = APIRouter(prefix="/audio-extended", tags=["Audio Extended"])

# --- Schemas ---

class AudioGenerateRequest(BaseModel):
    model_id: str
    prompt: Optional[str] = None
    text: Optional[str] = None # For TTS
    voice_id: Optional[str] = None # For TTS/Clone
    duration: Optional[int] = None # For Music
    
    # Advanced Params
    negative_prompt: Optional[str] = None
    
    # Music Specific
    instrumental: bool = False
    style: Optional[str] = None
    
    # TTS Specific
    speed: float = 1.0
    pitch: float = 0.0

class AudioGenerateResponse(BaseModel):
    success: bool
    task_id: str
    status: str
    credits_used: int
    estimated_time: float

# --- Endpoints ---

@router.get("/models")
async def get_audio_models(category: Optional[str] = None, current_user = Depends(get_current_user)):
    """Get available audio models (TTS, Music, SFX)"""
    
    if category == "tts":
        return {"models": TTS_MODELS, "presets": VOICE_PRESETS}
    elif category == "music":
        return {"models": MUSIC_MODELS, "styles": MUSIC_STYLES}
    elif category == "sfx":
        return {"models": SFX_MODELS}
    elif category == "tools":
        return {"models": AUDIO_TOOLS}
    
    return {
        "tts": TTS_MODELS,
        "music": MUSIC_MODELS,
        "sfx": SFX_MODELS,
        "tools": AUDIO_TOOLS
    }

@router.post("/generate", response_model=AudioGenerateResponse)
async def generate_audio(request: AudioGenerateRequest, current_user = Depends(get_current_user)):
    """Generate audio (Music, SFX, or TTS)"""
    
    db = get_database()
    model = ALL_AUDIO_MODELS.get(request.model_id)
    if not model:
        # Check tools
        model = AUDIO_TOOLS.get(request.model_id)
        if not model:
             raise HTTPException(status_code=404, detail="Model not found")

    # Determine Request Type & Credits
    req_type = "audio"
    credits_cost = 0
    
    # Pricing Logic (Simplified)
    if request.model_id in TTS_MODELS:
        req_type = "tts"
        # Character based pricing
        char_count = len(request.text or "")
        cost_per_char = model.get("cost_per_char", 0.0001)
        cost_usd = char_count * cost_per_char
        # Minimum charge
        cost_usd = max(cost_usd, 0.01)
        
    elif request.model_id in MUSIC_MODELS:
        req_type = "music"
        cost_usd = model.get("cost_per_generation", 0.05)
        
    elif request.model_id in SFX_MODELS:
        req_type = "sfx"
        cost_usd = model.get("cost_usd", 0.02)
        
    else:
        # Tool or other
        cost_usd = model.get("cost_usd", 0.02)
    
    credits_cost = int(cost_usd * 100 * 2) # Multiplier 2.0 default
    
    # Check Credits
    await CreditManager.check_sufficient_credits(db, current_user["id"], credits_cost)
    
    # Create Task
    task_id = str(uuid.uuid4())
    
    # Route to Provider (Simplified Routing)
    provider_name = model["provider"].lower().replace(".","").replace(" ","_")
    
    # Map to ServiceType
    service_type = ServiceType.AUDIO
    
    # Construct Provider Payload
    payload = {
        "model": model["name"], # or map to provider specific ID
        "task_id": task_id
    }
    
    if req_type == "tts":
        payload["text"] = request.text
        payload["voice_id"] = request.voice_id
    else:
        payload["prompt"] = request.prompt
        
    # NOTE: Actual Provider API call is mocked/handled by AIProviderManager or specific service class.
    # For now, we simulate success response to fix the routin error and integration structure.
    # In a real scenario, we would call `audio_service.generate()` similar to video_service.
    
    # Log to DB
    generation_record = {
        "id": task_id,
        "user_id": current_user["id"],
        "type": req_type,
        "model_id": request.model_id,
        "status": "processing",
        "credits_cost": credits_cost,
        "created_at": datetime.utcnow(),
        "provider": provider_name
    }
    await db.generations.insert_one(generation_record)
    
    # Deduct credits
    await CreditManager.deduct_credits(db, current_user["id"], "audio", credits_cost, {"task_id": task_id})
    
    return {
        "success": True,
        "task_id": task_id,
        "status": "processing",
        "credits_used": credits_cost,
        "estimated_time": 10.0 # Mock
    }

@router.get("/tasks/{task_id}")
async def get_audio_task(task_id: str, current_user = Depends(get_current_user)):
    """Get status of audio generation task"""
    db = get_database()
    task = await db.generations.find_one({"id": task_id, "user_id": current_user["id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    return {
        "id": task["id"],
        "status": task["status"],
        "result_url": task.get("output_url"),
        "progress": task.get("progress", 0)
    }
