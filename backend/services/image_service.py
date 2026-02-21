"""
Image Generation Service
Handles API calls to image providers (FAL, Replicate, Pollo.ai), R2 storage, 
and database logging for image tasks using Supabase.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from types import SimpleNamespace
import uuid
import httpx
import base64
import os
import json
import json
from fastapi import HTTPException, UploadFile

from core.database import get_db
from core.credits import CreditManager
from core.config import settings
from core.image_models import ALL_IMAGE_MODELS, IMAGE_TOOLS, SPECIALIZED_GENERATORS
from core.kie_models import KIE_IMAGE_MODELS  # Premium kie.ai models
from schemas.image_new import ImageGenerateRequest, ImageGenerateResponse, ImageTaskStatus, ImageToolRequest, SpecializedGeneratorRequest
from schemas.output import MediaOutput
from services.storage_service_supabase import hybrid_storage_service # Hybrid Storage (Supabase + R2)
from services.providers.fal_provider import fal_provider
from services.providers.replicate_provider import replicate_provider
from services.providers.pollo_provider import pollo_provider
from services.providers.kie_provider import kie_provider  # Premium models
from core.logger import app_logger as logger

# --- Helper Functions ---



# --- Service Class ---

class ImageService:
    
    def __init__(self):
        # Initialize HTTP client for API calls
        self.http_client = httpx.AsyncClient(timeout=60.0)
        
    async def process_background_removal(self, file: UploadFile, current_user, db):
        """
        Removes background using Kie.ai (Recraft) model.
        """
        # 1. Upload file to storage
        contents = await file.read()
        filename = f"{uuid.uuid4()}_{file.filename}"
        object_name = f"uploads/{current_user.id}/{filename}"
        
        image_url = await hybrid_storage_service.upload_file(
            file_data=contents, 
            object_name=object_name, 
            content_type=file.content_type
        )
        
        if not image_url:
            raise HTTPException(status_code=500, detail="Failed to upload image")

        # 2. Prepare Kie request
        model_id = "kie_recraft_remove_bg"
        model_config = KIE_IMAGE_MODELS.get(model_id)
        if not model_config:
            raise HTTPException(status_code=400, detail="Background removal model not found")

        # 3. Calculate cost
        cost_usd = model_config.get("cost_usd", 0.03)
        cost_credits = self.calc_credits(cost_usd)
        
        # 4. Check credits
        balance = await CreditManager.get_user_balance(db, current_user.id)
        if balance < cost_credits:
            raise HTTPException(status_code=402, detail=f"Yetersiz kredi. Gerekli: {cost_credits}")

        # 5. Call Kie API
        try:
            # Recraft Remove BG expects 'image_url' (or 'image_urls' list)
            # Market API wrapper handles the list conversion if needed
            result_urls = await kie_provider.generate_image(
                model_id=model_id,
                prompt="remove background", # Dummy prompt often required
                params={"image_url": image_url}
            )
            
            if not result_urls:
                raise Exception("No image returned from provider")
                
            output_url = result_urls[0]
            
            # 6. Deduct credits
            await CreditManager.deduct_credits(
                db=db,
                user_id=current_user.id,
                service_type="image",
                cost=cost_credits,
                details={"action": "remove_background_kie", "model": model_id}
            )
            
            return {
                "success": True,
                "image_url": output_url,
                "credits_charged": cost_credits
            }
            
        except Exception as e:
            logger.error(f"Background removal failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def process_upscale(self, file: UploadFile, scale: int, current_user, db):
        """
        Upscales image using Kie.ai (Recraft or Topaz).
        """
        # 1. Upload file
        contents = await file.read()
        filename = f"{uuid.uuid4()}_{file.filename}"
        object_name = f"uploads/{current_user.id}/{filename}"
        
        image_url = await hybrid_storage_service.upload_file(
            file_data=contents, 
            object_name=object_name, 
            content_type=file.content_type
        )
        
        if not image_url:
            raise HTTPException(status_code=500, detail="Failed to upload image")

        # 2. Select model (Recraft by default)
        model_id = "kie_recraft"
        model_config = KIE_IMAGE_MODELS.get(model_id)
        
        # 3. Calculate cost (Higher for 4x if supported, but Recraft is fixed usually)
        cost_usd = model_config.get("cost_usd", 0.03)
        cost_credits = self.calc_credits(cost_usd)
        
        # 4. Check credits
        balance = await CreditManager.get_user_balance(db, current_user.id)
        if balance < cost_credits:
            raise HTTPException(status_code=402, detail=f"Yetersiz kredi. Gerekli: {cost_credits}")
        
        # 5. Call API
        try:
            result_urls = await kie_provider.generate_image(
                model_id=model_id,
                prompt="upscale", 
                params={
                    "image_url": image_url,
                    "scale": scale # Pass scale param if supported (Recraft might ignore/auto)
                }
            )
            
            if not result_urls:
                raise Exception("No image returned from provider")
                
            output_url = result_urls[0]
            
            # 6. Deduct credits
            await CreditManager.deduct_credits(
                db=db,
                user_id=current_user.id,
                service_type="image",
                cost=cost_credits,
                details={"action": "upscale_kie", "scale": scale}
            )
            
            return {
                "success": True,
                "image_url": output_url,
                "scale": scale,
                "credits_charged": cost_credits
            }
            
        except Exception as e:
            logger.error(f"Upscale failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    def calc_credits(self, cost_usd: float, multiplier: float = 2.0) -> int:
        """Calculates application credits from USD cost and multiplier."""
        return int(cost_usd * settings.DEFAULT_USD_TO_CREDIT_RATE * multiplier)
        
    async def get_pricing_multiplier(self, db) -> float:
        """Fetches the current image pricing multiplier from the database."""
        try:
            response = db.table("image_pricing").select("value").eq("type", "multiplier").execute()
            return float(response.data[0]["value"]) if response.data else 2.0
        except Exception:
            return 2.0

    async def start_image_generation(self, req: ImageGenerateRequest, user: SimpleNamespace, db) -> ImageGenerateResponse:
        """
        Starts the image generation process, handles credit deduction and task logging.
        """
        # Check both standard and kie.ai models
        model = ALL_IMAGE_MODELS.get(req.model_id) or KIE_IMAGE_MODELS.get(req.model_id)
        if not model:
            raise HTTPException(404, "Model not found")
        
        multiplier = await self.get_pricing_multiplier(db)
        credits_per_image = self.calc_credits(model["cost_usd"], multiplier)
        total_credits = credits_per_image * req.num_images
        
        # 1. Credit Check
        await CreditManager.check_sufficient_credits(db, user.id, total_credits)
        
        task_id = str(uuid.uuid4())
        
        # 2. Log Task as Processing
        try:
            db.table("generations").insert({
                "id": task_id,
                "user_id": user.id,
                "type": "image",
                "model": req.model_id,
                "prompt": req.prompt,
                "credits_cost": total_credits,
                "status": "processing",
                "created_at": datetime.utcnow().isoformat(),
                "metadata": json.dumps(req.model_dump())
            }).execute()
        except Exception as e:
            logger.error(f"Failed to create generation task: {e}")
            raise HTTPException(500, "Failed to initialize generation task")
        
        # 3. Deduct Credits
        await CreditManager.deduct_credits(db, user.id, "image", total_credits, {"task_id": task_id})
        
        # Start background task for API call and storage
        import asyncio
        asyncio.create_task(self._process_image_generation(task_id, user.id, req, model, total_credits, db))
        
        return ImageGenerateResponse(
            success=True, 
            task_id=task_id, 
            status="processing",
            credits_used=total_credits, 
            model_used=model["name"], 
            estimated_time=10
        )
        
    async def _process_image_generation(self, task_id: str, user_id: str, req: ImageGenerateRequest, model: Dict, total_credits: float, db):
        """Process image generation with real API calls and storage"""
        try:
            # 1. Call appropriate provider
            provider_name = model["provider"]
            image_urls = []
            
            if provider_name == "FAL.AI":
                image_urls = await fal_provider.generate_image(
                    req.model_id, req.prompt, 
                    {"aspect_ratio": req.aspect_ratio, "num_images": req.num_images, "negative_prompt": req.negative_prompt}
                )
            elif provider_name == "Replicate":
                image_urls = await replicate_provider.generate_image(
                    req.model_id, req.prompt,
                    {"num_images": req.num_images, "negative_prompt": req.negative_prompt}
                )
            elif provider_name == "Pollo.ai":
                image_urls = await pollo_provider.generate_image(
                    req.model_id, req.prompt,
                    {"num_images": req.num_images, "negative_prompt": req.negative_prompt}
                )
            elif provider_name == "kie.ai":
                # Premium models via kie.ai async task API
                # Convert aspect_ratio enum to string value
                ar_value = str(req.aspect_ratio.value) if hasattr(req.aspect_ratio, 'value') else str(req.aspect_ratio)
                logger.info(f"Calling kie_provider: model={req.model_id}, ar={ar_value}")
                image_urls = await kie_provider.generate_image(
                    req.model_id, req.prompt,
                    {
                        "num_images": req.num_images, 
                        "negative_prompt": req.negative_prompt,
                        "aspect_ratio": ar_value,
                        "image_url": req.image_url,  # New: Pass image_url for img2img
                        "strength": req.strength     # New: Pass strength for img2img
                    }
                )
            else:
                raise Exception(f"Unknown provider: {provider_name}")
            
            # 2. Download and upload to storage
            stored_urls = []
            
            async with httpx.AsyncClient() as client:
                for i, img_url in enumerate(image_urls):
                    # Download image
                    img_response = await client.get(img_url)
                    img_data = img_response.content
                    
                    # Upload to storage
                    object_name = hybrid_storage_service.generate_object_name(
                        "image", user_id, task_id, i, "png"
                    )
                    stored_url = await hybrid_storage_service.upload_file(
                        img_data, object_name, "image/png", user_id
                    )
                    
                    if stored_url:
                        stored_urls.append(stored_url)
            
            # 3. Update task status
            db.table("generations").update({
                "status": "completed",
                "output_url": stored_urls[0] if stored_urls else None, # Store primary URL
                "metadata": json.dumps({
                    "all_urls": stored_urls,
                    "original_request": req.model_dump()
                }),
                "completed_at": datetime.utcnow().isoformat()
            }).eq("id", task_id).execute()
            
        except Exception as e:
            import traceback
            logger.error(f"Image generation failed for task {task_id}: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            print(f"\n[ERROR] IMAGE GENERATION FAILED: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            db.table("generations").update({
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.utcnow().isoformat()
            }).eq("id", task_id).execute()
            
            # Refund credits
            await CreditManager.refund_credits(db, user_id, total_credits, {"task_id": task_id, "reason": "generation_failed"})

        
    async def get_task_status(self, task_id: str, user_id: str, db) -> ImageTaskStatus:
        """Fetches the status of an image generation task."""
        try:
            response = db.table("generations").select("*").eq("id", task_id).eq("user_id", user_id).execute()
            
            if not response.data:
                raise HTTPException(404, "Task not found")
            
            task = response.data[0]
            
            # Safe metadata parsing
            metadata_raw = task.get("metadata")
            metadata = {}
            if metadata_raw:
                try:
                    metadata = json.loads(metadata_raw)
                except Exception as e:
                    logger.error(f"Failed to parse metadata for task {task_id}: {e}")
            
            return ImageTaskStatus(
                task_id=task["id"], 
                status=task["status"], 
                progress=100 if task["status"] == "completed" else 0,
                image_urls=metadata.get("all_urls", [task.get("output_url")] if task.get("output_url") else []), 
                thumbnail_urls=metadata.get("all_urls", [task.get("output_url")] if task.get("output_url") else []),
                error_message=task.get("error_message"), 
                created_at=task["created_at"],
                completed_at=task.get("completed_at")
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in get_task_status for {task_id}: {e}")
            raise HTTPException(500, f"Failed to get status: {str(e)}")
        
    async def get_user_media_outputs(self, user_id: str, db, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """Fetches the user's media library."""
        response = db.table("generations").select("*", count="exact")\
            .eq("user_id", user_id)\
            .eq("status", "completed")\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
            
        outputs = []
        for item in response.data:
            metadata = json.loads(item.get("metadata", "{}"))
            outputs.append(MediaOutput(
                id=item["id"],
                user_id=item["user_id"],
                service_type=item["type"],
                file_url=item["output_url"],
                thumbnail_url=item["output_url"],
                prompt=item["prompt"],
                model_name=item["model"],
                credits_charged=item["credits_cost"],
                created_at=item["created_at"],
                is_showcase=False # Add column if needed
            ))
            
        return {
            "outputs": outputs, 
            "total": response.count, 
            "limit": limit, 
            "offset": offset
        }

# Global instance
image_service = ImageService()
