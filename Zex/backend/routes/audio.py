"""Audio generation routes - TTS, Music, SFX"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import json
import httpx
import asyncio

from core.security import get_current_user
from core.database import get_db
from core.credits import CreditManager
from core.config import settings
from services.model_service import model_service
from core.notification_service import notify_generation_complete
from core.unified_model_registry import model_registry
from core.kie_models import KIE_MUSIC_MODELS, KIE_TTS_MODELS

router = APIRouter(prefix="/audio", tags=["Audio Generation"])

class TTSRequest(BaseModel):
    model_id: str
    text: str
    voice_id: Optional[str] = "default"
    voice: Optional[str] = None
    speed: float = 1.0

class MusicRequest(BaseModel):
    model_id: str
    prompt: str
    duration: int = 30  # seconds

class AudioToolRequest(BaseModel):
    tool_id: str
    audio_url: str

# Audio Model Response
class AudioModelInfo(BaseModel):
    id: str
    provider: str
    name: str
    type: str
    credits: int
    quality: int
    speed: str
    badge: Optional[str] = None
    description: Optional[str] = None

@router.get("/models")
async def get_audio_models(type: Optional[str] = None, db = Depends(get_db)):
    """Get all active audio models from the unified registry"""
    try:
        registry_models = await model_registry.get_models(db, category="audio", type=type, active_only=True)
        
        result = []
        for m in registry_models:
            # Use predefined credits if available (Source of Truth)
            credits = m.get("kie_credits") or m.get("credits")
            if credits is None:
                cost_usd = float(m.get("cost_usd", 0))
                multiplier = float(m.get("cost_multiplier", 2.0))
                credits = int(cost_usd * multiplier * 100)
            
            provider_display = m.get("provider", "unknown")
            
            result.append(AudioModelInfo(
                id=m["id"],
                provider=provider_display,
                name=m.get("name", m["id"]),
                type=m.get("type", "audio"),
                credits=max(credits, 5),
                quality=m.get("quality", 4),
                speed=m.get("speed", "medium"),
                badge=m.get("badge"),
                description=m.get("description")
            ))
        return result
    except Exception as e:
        # Registry can fail if DB is temporarily unavailable or overrides are malformed.
        # For audio we always have a reliable Kie.ai catalog fallback.
        print(f"[AudioRoutes] Failed to fetch models from registry, falling back to Kie catalog: {e}")
        fallback = {**KIE_MUSIC_MODELS, **KIE_TTS_MODELS}

        result = []
        for mid, m in fallback.items():
            if type and (m.get("type") or "").lower() != type.lower():
                continue
            credits = m.get("kie_credits") or m.get("credits")
            if credits is None:
                cost_usd = float(m.get("cost_usd", 0))
                multiplier = float(m.get("cost_multiplier", 2.0))
                credits = int(cost_usd * multiplier * 100)
            result.append(AudioModelInfo(
                id=mid,
                provider="kie.ai",
                name=m.get("name", mid),
                type=m.get("type", "audio"),
                credits=int(max(float(credits), 5)),
                quality=int(m.get("quality", 4)),
                speed=str(m.get("speed", "medium")),
                badge=m.get("badge"),
                description=m.get("description")
            ))

        return result

@router.get("/models/tts")
async def get_tts_models(db = Depends(get_db)):
    """Get TTS models only from the unified registry"""
    try:
        registry_models = await model_registry.get_models(db, category="audio", type="text_to_speech", active_only=True)
        
        result = []
        for m in registry_models:
            # Use predefined credits if available (Source of Truth)
            credits = m.get("kie_credits") or m.get("credits")
            if credits is None:
                cost_usd = float(m.get("cost_usd", 0))
                multiplier = float(m.get("cost_multiplier", 2.0))
                credits = int(cost_usd * multiplier * 100)
            
            provider_display = m.get("provider", "unknown")
            
            result.append(AudioModelInfo(
                id=m["id"],
                provider=provider_display,
                name=m.get("name", m["id"]),
                type="text_to_speech",
                credits=max(credits, 5),
                quality=m.get("quality", 4),
                speed=m.get("speed", "medium"),
                badge=m.get("badge"),
                description=m.get("description")
            ))
        return result
    except Exception as e:
        print(f"[AudioRoutes] Failed to fetch TTS models from registry, falling back to Kie catalog: {e}")
        result = []
        for mid, m in KIE_TTS_MODELS.items():
            credits = m.get("kie_credits") or m.get("credits")
            if credits is None:
                cost_usd = float(m.get("cost_usd", 0))
                multiplier = float(m.get("cost_multiplier", 2.0))
                credits = int(cost_usd * multiplier * 100)
            result.append(AudioModelInfo(
                id=mid,
                provider="kie.ai",
                name=m.get("name", mid),
                type="text_to_speech",
                credits=int(max(float(credits), 5)),
                quality=int(m.get("quality", 4)),
                speed=str(m.get("speed", "medium")),
                badge=m.get("badge"),
                description=m.get("description")
            ))
        return result

@router.post("/tts")
async def text_to_speech(req: TTSRequest, user = Depends(get_current_user), db = Depends(get_db)):
    # 1. Fetch Model Details
    model = await model_service.get_model_by_id(db, req.model_id)
    if not model:
        raise HTTPException(404, "TTS model not found")
    
    if model["type"] != "text_to_speech":
        raise HTTPException(400, "Invalid model type for TTS")

    # 2. Calculate Credits from unified CreditManager (respects DB overrides)
    char_count = len(req.text)
    credits = await CreditManager.get_service_cost(
        db, "audio", (char_count / 1000.0), model_id=req.model_id
    )
    
    if credits < 1: credits = 1
    
    # 3. Credit Check
    await CreditManager.check_sufficient_credits(db, user.id, credits)
    
    task_id = str(uuid.uuid4())
    
    # 4. Resolve provider
    provider_id = model.get("provider_id")
    
    # 5. Call Provider API
    provider_task_id = None
    output_url = None
    status_val = "processing"
    selected_voice_id = req.voice_id or "default"
    if req.voice and selected_voice_id == "default":
        selected_voice_id = req.voice

    try:
        if provider_id == "kie":
            from services.kie_service import kie_service
            result = await kie_service.generate_tts(
                model_id=model.get("provider_model_id") or model.get("model_id") or req.model_id,
                text=req.text,
                voice_id=selected_voice_id if selected_voice_id != "default" else "Rachel",
                speed=req.speed
            )
            
            if result.get("success"):
                provider_task_id = result.get("task_id")
                status_val = "processing"
            else:
                raise HTTPException(500, f"Kie.ai TTS API error: {result}")

        else:
            raise HTTPException(400, "Unsupported TTS provider. Audio generation must use Kie.ai.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Provider API error: {str(e)}")

    # 6. Save to DB
    generation_record = {
        "id": task_id,
        "user_id": user.id,
        "type": "audio_tts",
        "prompt": req.text,
        "model_id": req.model_id,
        "status": status_val,
        "credits_cost": credits,
        "created_at": datetime.utcnow().isoformat(),
        "output_url": output_url,
        "metadata": {
            "provider_id": provider_id,
            "voice_id": selected_voice_id,
            "speed": req.speed,
            "char_count": char_count,
            "provider_task_id": provider_task_id
        }
    }
    
    try:
        db.table("generations").insert(generation_record).execute()
        
        # Also add to media_outputs if completed
        if status_val == "completed" and output_url:
            media_output = {
                "id": task_id,
                "user_id": user.id,
                "service_type": "audio",
                "file_url": output_url,
                "prompt": req.text,
                "model_name": model["name"],
                "generation_details": {
                    "model_id": req.model_id,
                    "type": "tts"
                },
                "credits_charged": credits,
                "status": "completed",
                "created_at": datetime.utcnow().isoformat()
            }
            db.table("media_outputs").insert(media_output).execute()
            
            # Send Notification
            try:
                import asyncio
                asyncio.create_task(notify_generation_complete(
                    user_id=user.id,
                    generation_type="audio",
                    generation_id=task_id
                ))
            except Exception as notify_err:
                print(f"Failed to send push notification for {task_id}: {notify_err}")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # 7. Deduct Credits
    await CreditManager.deduct_credits(db, user.id, "audio_tts", credits, {"task_id": task_id})
    
    return {
        "success": True, 
        "task_id": task_id, 
        "credits_used": credits, 
        "status": status_val,
        "output_url": output_url
    }

@router.post("/music")
async def generate_music(req: MusicRequest, user = Depends(get_current_user), db = Depends(get_db)):
    model = await model_service.get_model_by_id(db, req.model_id)
    if not model or model["type"] != "music_generation":
        # Fallback to check if it's a generic audio model
        if not model:
             raise HTTPException(404, "Music model not found")
    
    # Calculate Credits from unified CreditManager (respects DB overrides)
    credits = await CreditManager.get_service_cost(
        db, "audio", 1.0, model_id=req.model_id
    )
    
    await CreditManager.check_sufficient_credits(db, user.id, credits)
    
    task_id = str(uuid.uuid4())
    
    # Provider integration for Music (e.g. Suno, Udio via Pollo or others)
    # Assuming Pollo for now if provider is pollo
    provider_id = model.get("provider_id")
    provider_config = await model_service.get_provider_config(db, provider_id)
    
    provider_task_id = None
    
    try:
        if provider_id == "pollo":
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{provider_config['base_url']}/music/generate",
                    headers={
                        "Authorization": f"Bearer {provider_config['api_key']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "prompt": req.prompt,
                        "duration": req.duration,
                        "model": model.get("provider_model_id")
                    },
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    provider_task_id = data.get("task_id")
        elif provider_id in ("kie", "kie.ai") or not provider_id:
            # Fallback to kie.ai if provider is kie.ai or none
            from services.kie_service import kie_service
            
            # Note: req.duration is int (e.g. 30), pass it appropriately
            result = await kie_service.generate_music(
                model_id=model.get("provider_model_id", req.model_id),
                prompt=req.prompt,
                duration=req.duration
            )
            
            if result.get("success"):
                provider_task_id = result.get("task_id")

    except Exception:
        pass # Log error but continue to create record as processing
    
    generation_record = {
        "id": task_id,
        "user_id": user.id,
        "type": "audio_music",
        "prompt": req.prompt,
        "model_id": req.model_id,
        "status": "processing",
        "credits_cost": credits,
        "created_at": datetime.utcnow().isoformat(),
        "metadata": {
            "duration": req.duration,
            "provider_id": provider_id,
            "provider_task_id": provider_task_id
        }
    }
    
    try:
        db.table("generations").insert(generation_record).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    await CreditManager.deduct_credits(db, user.id, "audio_music", credits, {"task_id": task_id})
    
    return {"success": True, "task_id": task_id, "credits_used": credits}

@router.get("/tasks/{task_id}")
async def get_task(task_id: str, user = Depends(get_current_user), db = Depends(get_db)):
    response = db.table("generations").select("*").eq("id", task_id).eq("user_id", user.id).execute()
    if not response.data:
        raise HTTPException(404, "Task not found")
    return response.data[0]

@router.get("/my-audio")
async def get_my_audio(limit: int = 20, user = Depends(get_current_user), db = Depends(get_db)):
    # Query generations for audio types
    response = db.table("generations").select("*")\
        .eq("user_id", user.id)\
        .in_("type", ["audio_tts", "audio_music"])\
        .order("created_at", desc=True)\
        .limit(limit)\
        .execute()
        
    generations = response.data or []
    from services.kie_service import kie_service
    
    # Dynamically resolve any processing tasks
    updated = False
    for gen in generations:
        if gen.get("status") == "processing":
            provider_task_id = gen.get("metadata", {}).get("provider_task_id")
            if provider_task_id:
                try:
                    # Depending on type, check status
                    if gen.get("type") == "audio_music":
                        status_res = await kie_service.get_music_status(provider_task_id)
                        if status_res and status_res.get("status") == "success" and status_res.get("audio_url"):
                            gen["status"] = "completed"
                            gen["output_url"] = status_res.get("audio_url")
                            # update DB
                            db.table("generations").update({
                                "status": "completed",
                                "output_url": status_res.get("audio_url")
                            }).eq("id", gen["id"]).execute()
                            updated = True
                        elif status_res and status_res.get("status") == "failed":
                            gen["status"] = "failed"
                            db.table("generations").update({"status": "failed"}).eq("id", gen["id"]).execute()
                            updated = True
                    elif gen.get("type") == "audio_tts":
                        status_res = await kie_service.get_market_task_status(provider_task_id)
                        if status_res and status_res.get("status") == "success" and status_res.get("audio_url"):
                            audio_url = status_res.get("audio_url")
                            gen["status"] = "completed"
                            gen["output_url"] = audio_url
                            db.table("generations").update({
                                "status": "completed",
                                "output_url": audio_url
                            }).eq("id", gen["id"]).execute()

                            try:
                                existing = db.table("media_outputs").select("id").eq("id", gen["id"]).execute()
                                if not existing.data:
                                    db.table("media_outputs").insert({
                                        "id": gen["id"],
                                        "user_id": gen["user_id"],
                                        "service_type": "audio",
                                        "file_url": audio_url,
                                        "prompt": gen.get("prompt"),
                                        "model_name": gen.get("model_id"),
                                        "generation_details": {
                                            "model_id": gen.get("model_id"),
                                            "type": "tts"
                                        },
                                        "credits_charged": gen.get("credits_cost", 0),
                                        "status": "completed",
                                        "created_at": gen.get("created_at")
                                    }).execute()
                            except Exception as media_err:
                                print(f"Failed to upsert TTS media output for {gen['id']}: {media_err}")
                            updated = True
                        elif status_res and status_res.get("status") == "failed":
                            gen["status"] = "failed"
                            db.table("generations").update({"status": "failed"}).eq("id", gen["id"]).execute()
                            updated = True
                except Exception:
                    pass

    # Map output_url to file_url for the frontend if needed
    for gen in generations:
        gen["file_url"] = gen.get("output_url", "")
        
    return {"outputs": generations}
