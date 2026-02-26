"""
Video Service
Handles video generation operations with multi-provider support
"""
from typing import Dict, Any, Optional
from datetime import datetime
import uuid
from fastapi import HTTPException

from schemas.video import VideoGenerateRequest, VideoGenerateResponse, VideoTaskStatus
from schemas.output import MediaOutputList, MediaOutput
from core.providers.adapters import (
    get_video_adapter,
    VideoGenerationParams,
    VideoGenerationResult
)
from core.config import settings
from core.credits import CreditManager
from core.pollo_models import POLLO_VIDEO_MODELS
from core.kie_models import KIE_VIDEO_MODELS  # Premium kie.ai video models


class VideoService:
    """Video generation service with multi-provider support"""
    
    # Provider API key settings names (must match config.py)
    PROVIDER_API_KEYS = {
        "fal": "FAL_API_KEY",
        "goapi": "GOAPI_API_KEY",
        "piapi": "PIAPI_API_KEY",
        "replicate": "REPLICATE_API_KEY",
        "pollo": "POLLO_API_KEY",
        "kie": "KIE_API_KEY",  # ~30% cheaper than other providers
    }
    
    # Model to preferred provider mapping
    # Admin can change this in the database
    MODEL_PROVIDER_MAP = {
        # fal.ai models (Now mapped to Pollo as primary source)
        "hailuo_minimax_text": "pollo",
        "hailuo_minimax_image": "pollo",
        "kling25_turbo_text": "fal",
        "kling25_turbo_image": "fal",
        "kling21_master_text": "fal",
        "luma_dream_text": "pollo",
        "luma_dream_image": "pollo",
        "luma_ray2_text": "pollo",
        "runway_gen3_text": "pollo",
        "runway_gen3_image": "pollo",
        "runway_turbo_text": "pollo",
        "wan_cogvideo_text": "fal",
        "hunyuan_video_text": "fal",
        "hunyuan_video_image": "fal",
        # Veo models (Pollo/Replicate)
        "veo3_text": "pollo",
        "veo3_fast_text": "pollo",
        "veo31_text": "pollo",
        "veo31_image": "pollo",
        "veo31_video": "pollo",
        # Sora models (Pollo)
        "sora2_text": "pollo",
        "sora2_image": "pollo",
        "sora_turbo_text": "pollo",
        # Pika models
        "pika20_text": "pollo",
        "pika20_image": "pollo",
        "pika15_text": "pollo",
        # PixVerse
        "pixverse_v3_text": "pollo",
        "pixverse_v3_image": "pollo",
        # Vidu
        "vidu15_text": "pollo",
        "vidu15_image": "pollo",
        # Seedance
        "seedance_mochi1_text": "pollo",
        # Midjourney
        "midjourney_video_text": "fal",
        # kie.ai models - all use kie provider
        "kie_veo31_quality": "kie",
        "kie_veo31_fast": "kie",
        "kie_sora2_pro_10s": "kie",
        "kie_sora2_pro_15s": "kie",
        "kie_kling26_hd_5s": "kie",
        "kie_kling26_hd_10s": "kie",
        "kie_kling26_pro_5s": "kie",
        "kie_kling26_pro_10s": "kie",
        "kie_runway_aleph_5s": "kie",
        "kie_runway_aleph_10s": "kie",
        "kie_wan26_fast": "kie",
        "kie_wan26_hd": "kie",
        "kie_hailuo23_fast": "kie",
        "kie_hailuo23_hd": "kie",
        # Audio-enabled models
        "kie_kling26_audio_5s": "kie",
        "kie_kling26_audio_10s": "kie",
    }
    
    def _get_provider_for_model(self, model_id: str, db=None) -> str:
        """
        Get provider for model.
        First checks database for admin override, then uses default mapping.
        """
        # TODO: Check database for admin-set provider
        # This allows admin panel to change provider for a model
        return self.MODEL_PROVIDER_MAP.get(model_id, "fal")
    
    async def _get_api_key_async(self, provider: str) -> str:
        """Get API key for provider - tries multiple sources in order"""
        from core.supabase_client import get_supabase_client
        
        # 1. Try new provider_keys table first (unified architecture - plain text)
        try:
            db = get_supabase_client()
            result = db.table("provider_keys").select("api_key").eq("provider_id", provider).eq("is_active", True).limit(1).execute()
            if result.data and result.data[0].get("api_key"):
                print(f"[DEBUG] Got key from provider_keys table for {provider}")
                return result.data[0]["api_key"]
        except Exception as e:
            print(f"[DEBUG] provider_keys table failed for {provider}: {e}")
        
        # 2. Try old provider_api_keys table (encrypted - KeyVault panel)
        try:
            db = get_supabase_client()
            result = db.table("provider_api_keys").select("encrypted_key").eq("provider_id", provider).eq("is_active", True).limit(1).execute()
            if result.data and result.data[0].get("encrypted_key"):
                encrypted = result.data[0]["encrypted_key"]
                # Try to decrypt
                try:
                    from core.key_vault import KeyVaultService
                    vault = KeyVaultService()
                    decrypted = vault.decrypt_key(encrypted)
                    if decrypted:
                        print(f"[DEBUG] Got key from provider_api_keys (decrypted) for {provider}")
                        return decrypted
                except Exception as decrypt_err:
                    print(f"[DEBUG] Decryption failed for {provider}: {decrypt_err}")
        except Exception as e:
            print(f"[DEBUG] provider_api_keys table failed for {provider}: {e}")
        
        # 3. Fallback to settings/env
        return self._get_api_key(provider)
    
    def _get_api_key(self, provider: str) -> str:
        """Get API key for provider from settings (sync fallback)"""
        key_name = self.PROVIDER_API_KEYS.get(provider)
        if not key_name:
            raise ValueError(f"Unknown provider: {provider}")
        
        api_key = getattr(settings, key_name, None)
        if not api_key:
            raise ValueError(f"API key not configured for provider: {provider}")
        
        return api_key
    
    async def start_video_generation(
        self, 
        request: VideoGenerateRequest, 
        current_user, 
        db
    ) -> VideoGenerateResponse:
        """
        Start video generation task using appropriate provider
        """
        task_id = str(uuid.uuid4())
        
        # Get model info from both Pollo and kie.ai catalogs
        model_info = POLLO_VIDEO_MODELS.get(request.model_id) or KIE_VIDEO_MODELS.get(request.model_id)
        if not model_info:
            raise HTTPException(status_code=404, detail=f"Model {request.model_id} not found")
        
        # Calculate credits
        cost_usd = float(model_info.get("pollo_cost_usd", 0.30))
        multiplier = float(model_info.get("cost_multiplier", 2.0))
        credits_required = max(1, int(cost_usd * multiplier * 100))
        
        # Check credits
        await CreditManager.check_sufficient_credits(db, current_user.id, credits_required)
        
        # Get provider for this model
        provider = self._get_provider_for_model(request.model_id, db)
        
        try:
            api_key = await self._get_api_key_async(provider)
            print(f"[DEBUG] Got API key for provider {provider}: {api_key[:10] if api_key else 'NONE'}...")
            
            adapter = get_video_adapter(provider, api_key)
            print(f"[DEBUG] Video adapter created: {adapter}")
            
            if not adapter:
                raise HTTPException(status_code=500, detail=f"Provider {provider} not supported")
            
            # Build generation params
            params = VideoGenerationParams(
                prompt=request.prompt,
                model_id=request.model_id,
                duration=request.duration or 5,
                aspect_ratio=request.aspect_ratio or "16:9",
                quality=request.quality,
                mode=getattr(request, 'mode', None),
                negative_prompt=getattr(request, 'negative_prompt', None),
                image_url=request.image_url,
                video_url=getattr(request, 'video_url', None),
            )
            print(f"[DEBUG] Generation params: {params}")
            
            # Start generation
            result = await adapter.generate_video(params)
            print(f"[DEBUG] Adapter result: success={result.success}, task_id={result.task_id}, error={result.error_message}")
            
            if not result.success:
                raise HTTPException(status_code=500, detail=result.error_message or "Generation failed")
            
            # Deduct credits
            await CreditManager.deduct_credits(
                db, 
                current_user.id, 
                "video_generation",
                credits_required,
                details={"model": model_info.get('name', request.model_id)}
            )
            
            # Create generation record
            generation_record = {
                "id": task_id,
                "user_id": current_user.id,
                "type": "video",
                "prompt": request.prompt,
                "model_id": request.model_id,
                "status": "pending",
                "provider": provider,
                "provider_task_id": result.task_id,
                "credits_used": credits_required,
                "created_at": datetime.utcnow().isoformat(),
                "metadata": {
                    "duration": request.duration,
                    "quality": request.quality,
                    "aspect_ratio": request.aspect_ratio,
                    "provider_response": result.provider_response
                }
            }
            
            try:
                db.table("generations").insert(generation_record).execute()
            except Exception as e:
                # Refund credits on DB error
                await CreditManager.add_credits(db, current_user.id, credits_required, "Refund: DB error")
                raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
            
            return VideoGenerateResponse(
                success=True,
                task_id=task_id,
                status="pending",
                credits_used=credits_required,
                model_used=request.model_id,
                estimated_time=60
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")
    
    async def get_task_status_and_update(
        self, 
        task_id: str, 
        user_id: str, 
        db
    ) -> VideoTaskStatus:
        """
        Get task status and update from provider if still processing
        """
        try:
            result = db.table("generations").select("*").eq("id", task_id).eq("user_id", user_id).single().execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="Task not found")
            
            task = result.data
            current_status = task.get("status", "pending")
            
            # If still processing, check provider for update
            if current_status in ["pending", "processing"]:
                provider = task.get("provider", "fal")
                provider_task_id = task.get("provider_task_id")
                
                if provider_task_id:
                    try:
                        api_key = await self._get_api_key_async(provider)
                        adapter = get_video_adapter(provider, api_key)
                        
                        if adapter:
                            provider_result = await adapter.get_task_status(provider_task_id)
                            
                            # Update database if status changed
                            if provider_result.status != current_status:
                                update_data = {"status": provider_result.status}
                                
                                if provider_result.video_url:
                                    update_data["file_url"] = provider_result.video_url
                                    update_data["completed_at"] = datetime.utcnow().isoformat()
                                
                                if provider_result.status == "failed":
                                    update_data["error_message"] = provider_result.error_message
                                
                                db.table("generations").update(update_data).eq("id", task_id).execute()
                                task.update(update_data)
                    except Exception:
                        pass  # Continue with cached status
            
            return VideoTaskStatus(
                task_id=task_id,
                status=task.get("status", "pending"),
                progress=task.get("progress", 0),
                video_url=task.get("file_url"),
                thumbnail_url=task.get("thumbnail_url"),
                error_message=task.get("error_message"),
                created_at=datetime.fromisoformat(task["created_at"]),
                completed_at=datetime.fromisoformat(task["completed_at"]) if task.get("completed_at") else None
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    async def get_user_media_outputs(
        self, 
        user_id: str, 
        db, 
        limit: int = 20, 
        offset: int = 0
    ) -> MediaOutputList:
        """
        Get user's video outputs
        """
        try:
            # Get total count
            count_response = db.table("media_outputs").select("*", count="exact").eq("user_id", user_id).eq("service_type", "video").execute()
            total = count_response.count or 0
            
            # Get paginated items
            response = db.table("media_outputs").select("*")\
                .eq("user_id", user_id)\
                .eq("service_type", "video")\
                .order("created_at", desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            outputs = [MediaOutput(**o) for o in response.data] if response.data else []
            
            return MediaOutputList(
                outputs=outputs,
                total=total,
                limit=limit,
                offset=offset
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


video_service = VideoService()
