"""
Unified Video Service
Database-driven provider and model management
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid
from fastapi import HTTPException
import httpx

from schemas.video import (
    VideoGenerateRequest,
    VideoGenerateResponse
)
from core.config import settings
from core.credits import CreditManager
from core.unified_model_registry import model_registry


class UnifiedVideoService:
    """
    Database-driven video generation service
    - Reads providers and models from database
    - No hardcoded model mappings
    - Admin can control everything via panel
    """
    
    _providers_cache: Dict[str, Any] = {}
    _models_cache: Dict[str, Any] = {}
    _cache_time: Optional[datetime] = None
    CACHE_TTL = 300  # 5 minutes
    
    def __init__(self):
        self._providers_cache = {}
        self._models_cache = {}
    
    async def _refresh_cache(self, db) -> None:
        """Refresh provider and model cache from registry (hybrid base + DB overrides)"""
        now = datetime.utcnow()
        
        if (self._cache_time and 
            (now - self._cache_time).total_seconds() < self.CACHE_TTL):
            return
        
        try:
            # 1. Load providers
            providers_result = db.table("providers").select("*").eq("is_active", True).execute()
            self._providers_cache = {p["id"]: p for p in (providers_result.data or [])}
            
            # 2. Load models from UNIFIED REGISTRY (ai_models table + base models)
            models = await model_registry.get_models(db, category="video", active_only=True)
            self._models_cache = {m["id"]: m for m in models}
            
            self._cache_time = now
            print(f"[VideoService] Unified cache refreshed: {len(self._providers_cache)} providers, {len(self._models_cache)} models")
            
        except Exception as e:
            print(f"[VideoService] Unified cache refresh failed: {e}")
    
    async def get_model(self, db, model_id: str) -> Optional[Dict]:
        """Get model info from cache/database"""
        await self._refresh_cache(db)
        return self._models_cache.get(model_id)
    
    async def get_provider(self, db, provider_id: str) -> Optional[Dict]:
        """Get provider info from cache/database"""
        await self._refresh_cache(db)
        return self._providers_cache.get(provider_id)
    
    async def get_provider_key(self, db, provider_id: str) -> Optional[str]:
        """Get API key for provider from database"""
        try:
            result = db.table("provider_keys").select("api_key").eq(
                "provider_id", provider_id
            ).eq("is_active", True).limit(1).execute()
            
            if result.data:
                # Update usage stats
                try:
                    db.table("provider_keys").update({
                        "last_used_at": datetime.utcnow().isoformat(),
                        "usage_count": result.data[0].get("usage_count", 0) + 1
                    }).eq("provider_id", provider_id).execute()
                except:
                    pass
                
                return result.data[0]["api_key"]
        except Exception as e:
            print(f"[VideoService] Key lookup failed for {provider_id}: {e}")
        
        # Fallback to settings
        env_map = {
            "kie": "KIE_API_KEY",
            "fal": "FAL_API_KEY",
            "replicate": "REPLICATE_API_KEY",
            "pollo": "POLLO_API_KEY",
        }
        key_name = env_map.get(provider_id)
        if key_name:
            return getattr(settings, key_name, None)
        
        return None
    
    async def list_models(self, db, model_type: Optional[str] = None) -> List[Dict]:
        """List all active models, optionally filtered by type"""
        await self._refresh_cache(db)
        
        models = list(self._models_cache.values())
        
        if model_type:
            models = [m for m in models if m.get("model_type") == model_type]
        
        # Sort by sort_order, then by name
        models.sort(key=lambda m: (m.get("sort_order", 100), m.get("name", "")))
        
        return models
    
    async def list_providers(self, db) -> List[Dict]:
        """List all active providers"""
        await self._refresh_cache(db)
        
        providers = list(self._providers_cache.values())
        providers.sort(key=lambda p: p.get("priority", 100))
        
        return providers
    
    async def start_video_generation(
        self,
        request: VideoGenerateRequest,
        current_user,
        db
    ) -> VideoGenerateResponse:
        """
        Start video generation using database-driven configuration
        """
        task_id = str(uuid.uuid4())
        
        # 1. Get model from database
        model = await self.get_model(db, request.model_id)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model {request.model_id} not found")
        
        # 2. Get provider
        provider_id = model.get("provider_id")
        provider = await self.get_provider(db, provider_id)
        if not provider:
            raise HTTPException(status_code=500, detail=f"Provider {provider_id} not configured")
        
        # 3. Get credits cost from unified CreditManager (respects DB overrides)
        credits_required = await CreditManager.get_service_cost(
            db, "video", 1.0, 
            model_id=request.model_id,
            duration=request.duration,
            resolution=request.resolution
        )
        
        # 4. Check credits
        await CreditManager.check_sufficient_credits(db, current_user.id, credits_required)
        
        # 5. Get API key
        api_key = await self.get_provider_key(db, provider_id)
        if not api_key:
            raise HTTPException(status_code=500, detail=f"API key not configured for {provider_id}")
        
        # 6. Build request - different structure for different providers
        endpoint = model.get("endpoint")
        base_url = provider.get("base_url")
        
        # Kie.ai uses standardized Market API (from core.kie_video_models)
        if provider_id == "kie":
            from core.kie_video_models import build_kie_request
            
            kie_request = build_kie_request(
                model_id=request.model_id,
                prompt=request.prompt,
                aspect_ratio=request.aspect_ratio or "16:9",
                duration=request.duration or 5,
                sound="audio" in request.model_id,
                image_url=request.image_url,
                video_url=request.video_url  # For V2V models
            )
            full_url = kie_request["url"]
            request_data = kie_request["data"]
        else:
            # Other providers use standard endpoint
            full_url = f"{base_url}{endpoint}"
            request_data = {
                "prompt": request.prompt,
                "duration": request.duration or 5,
                "aspectRatio": request.aspect_ratio or "16:9"
            }
            if request.image_url:
                request_data["imageUrl"] = request.image_url
        
        print(f"[UnifiedVideoService] URL: {full_url}")
        print(f"[UnifiedVideoService] Request: {request_data}")
        
        # 7. Make API call
        provider_task_id = None
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    full_url,
                    json=request_data,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                )
            
            try:
                data = response.json()
            except:
                data = {}
            
            if data is None:
                data = {}
            
            # Debug: Print full API response
            print(f"[UnifiedVideoService] API Response status: {response.status_code}")
            print(f"[UnifiedVideoService] API Response data: {data}")
            
            # Check Kie.ai specific response format
            if provider_id == "kie":
                if data.get("code") != 200 and response.status_code != 200:
                    error_detail = data.get("msg", response.text[:200] if response.text else "Unknown error")
                    raise HTTPException(
                        status_code=500,
                        detail=f"{provider_id} API error: {error_detail}"
                    )
                # Safely get taskId from nested data
                inner_data = data.get("data") or {}
                provider_task_id = inner_data.get("taskId") or data.get("taskId") or ""
                print(f"[UnifiedVideoService] Extracted taskId: {provider_task_id}")
                
                # If Kie.ai returned error code, throw exception
                if data.get("code") not in (200, None) or not provider_task_id:
                    error_msg = data.get("msg", "Video generation failed")
                    raise HTTPException(status_code=400, detail=f"Kie.ai error: {error_msg}")
            else:
                if response.status_code not in (200, 201):
                    error_detail = response.text[:200] if response.text else "Unknown error"
                    raise HTTPException(
                        status_code=500,
                        detail=f"{provider_id} API error ({response.status_code}): {error_detail}"
                    )
                provider_task_id = data.get("taskId") or data.get("task_id") or data.get("id") or ""
            
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail=f"{provider_id} API timeout")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"{provider_id} connection error: {str(e)}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")
        
        # 8. Deduct credits
        await CreditManager.deduct_credits(
            db,
            current_user.id,
            "video_generation",
            credits_required,
            details={"model": model.get("name"), "provider": provider_id}
        )
        
        # 9. Save to media_outputs table so it appears in "My Videos"
        media_output_record = {
            "id": task_id,
            "user_id": str(current_user.id),
            "service_type": "video",
            "file_url": "",  # Will be updated when video completes
            "thumbnail_url": None,
            "prompt": request.prompt,
            "model_name": model.get("name", request.model_id),
            "generation_details": {
                "model_id": request.model_id,  # Added for status polling API detection
                "duration": request.duration,
                "aspect_ratio": request.aspect_ratio,
                "provider_task_id": provider_task_id,
                "endpoint": full_url
            },
            "credits_charged": credits_required,
            "status": "pending",
            "is_showcase": False,
            "created_at": datetime.utcnow().isoformat(),
            "provider": provider_id,
            "provider_task_id": provider_task_id
        }
        
        try:
            db.table("media_outputs").insert(media_output_record).execute()
            print(f"[UnifiedVideoService] Media output record created: {task_id}")
        except Exception as e:
            print(f"[VideoService] Media output record failed: {e}")
        
        print(f"[UnifiedVideoService] Video generation started - taskId: {provider_task_id}")
        
        return VideoGenerateResponse(
            success=True,
            task_id=task_id,
            status="pending",
            credits_used=credits_required,
            model_used=model.get("name", request.model_id),
            estimated_time=60
        )
    
    async def get_task_status(self, task_id: str, user_id: str, db) -> Dict:
        """Get status of a generation task"""
        try:
            result = db.table("generations").select("*").eq("id", task_id).eq("user_id", user_id).execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="Task not found")
            
            task = result.data[0]
            
            # If still processing, check provider
            if task.get("status") in ("pending", "processing"):
                provider_task_id = task.get("provider_task_id")
                provider_id = task.get("provider")
                
                if provider_task_id and provider_id:
                    # Get provider info
                    provider = await self.get_provider(db, provider_id)
                    api_key = await self.get_provider_key(db, provider_id)
                    
                    if provider and api_key:
                        status_url = f"{provider.get('base_url')}/task/{provider_task_id}"
                        
                        try:
                            async with httpx.AsyncClient(timeout=30.0) as client:
                                response = await client.get(
                                    status_url,
                                    headers={"Authorization": f"Bearer {api_key}"}
                                )
                            
                            if response.status_code == 200:
                                status_data = response.json()
                                new_status = status_data.get("status", "").lower()
                                video_url = status_data.get("videoUrl") or status_data.get("video_url")
                                
                                # Map status
                                if new_status in ("completed", "success"):
                                    new_status = "completed"
                                elif new_status in ("failed", "error"):
                                    new_status = "failed"
                                elif new_status in ("processing", "running"):
                                    new_status = "processing"
                                
                                # Update task
                                update_data = {"status": new_status}
                                if video_url:
                                    update_data["result_url"] = video_url
                                
                                db.table("generations").update(update_data).eq("id", task_id).execute()
                                task.update(update_data)
                                
                        except Exception as e:
                            print(f"[VideoService] Status check failed: {e}")
            
            return task
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Status check error: {str(e)}")


# Singleton instance
unified_video_service = UnifiedVideoService()
