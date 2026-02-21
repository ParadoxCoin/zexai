"""
AI Generation background tasks
Handles image, video, audio, and text generation asynchronously
"""
from celery import Task
from core.celery_app import celery_app
from core.database import get_database
from core.credits import CreditManager
from core.exceptions import ExternalServiceError, DatabaseError
from core.logger import app_logger as logger
from core.config import settings
import httpx
import asyncio
from typing import Dict, Any, List
import uuid
from datetime import datetime


async def _get_vault_key(provider_id: str, fallback_key: str) -> str:
    """Get API key from vault or fallback to settings"""
    try:
        from core.key_vault import get_provider_key
        vault_key = await get_provider_key(provider_id)
        if vault_key:
            return vault_key
    except Exception:
        pass
    return fallback_key


class AIGenerationTask(Task):
    """Base class for AI generation tasks with error handling"""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure"""
        logger.error(f"AI Generation task {task_id} failed: {exc}")
        
        # Update task status in database
        asyncio.create_task(self._update_task_status(task_id, "failed", str(exc)))
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success"""
        logger.info(f"AI Generation task {task_id} completed successfully")
        
        # Update task status in database
        asyncio.create_task(self._update_task_status(task_id, "completed", None))
    
    async def _update_task_status(self, task_id: str, status: str, error: str = None):
        """Update task status in database"""
        try:
            db = get_database()
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow()
            }
            
            if error:
                update_data["error_message"] = error
            
            await db.ai_tasks.update_one(
                {"task_id": task_id},
                {"$set": update_data}
            )
        except Exception as e:
            logger.error(f"Failed to update task status: {e}")


@celery_app.task(bind=True, base=AIGenerationTask, name="generate_image")
def generate_image_task(self, user_id: str, prompt: str, model_id: str, 
                       negative_prompt: str = "", aspect_ratio: str = "1:1", 
                       num_images: int = 1, **kwargs):
    """
    Generate images using AI models
    
    Args:
        user_id: User ID
        prompt: Image description
        model_id: AI model to use
        negative_prompt: What to avoid
        aspect_ratio: Image dimensions
        num_images: Number of images to generate
    """
    try:
        # Update task status
        asyncio.create_task(self._update_task_status(self.request.id, "processing"))
        
        # Determine AI provider based on model_id
        if "flux" in model_id.lower():
            result = asyncio.run(_generate_with_fal_ai(
                prompt, negative_prompt, aspect_ratio, num_images
            ))
        elif "dall-e" in model_id.lower():
            result = asyncio.run(_generate_with_openai(
                prompt, negative_prompt, aspect_ratio, num_images
            ))
        else:
            raise ExternalServiceError(f"Unknown model: {model_id}", "ai_provider")
        
        # Save results to database
        asyncio.run(_save_generation_result(
            user_id, "image", model_id, result, self.request.id
        ))
        
        # Deduct credits
        asyncio.run(_deduct_credits(user_id, "image", num_images))
        
        return {
            "task_id": self.request.id,
            "status": "completed",
            "images": result.get("images", []),
            "metadata": result.get("metadata", {})
        }
        
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise


@celery_app.task(bind=True, base=AIGenerationTask, name="generate_video")
def generate_video_task(self, user_id: str, prompt: str, model_id: str,
                      duration: int = 5, **kwargs):
    """
    Generate videos using AI models
    """
    try:
        asyncio.create_task(self._update_task_status(self.request.id, "processing"))
        
        # Video generation logic
        if "runway" in model_id.lower():
            result = asyncio.run(_generate_with_runway(
                prompt, duration
            ))
        elif "pika" in model_id.lower():
            result = asyncio.run(_generate_with_pika(
                prompt, duration
            ))
        else:
            raise ExternalServiceError(f"Unknown video model: {model_id}", "ai_provider")
        
        # Save results
        asyncio.run(_save_generation_result(
            user_id, "video", model_id, result, self.request.id
        ))
        
        # Deduct credits
        asyncio.run(_deduct_credits(user_id, "video", duration))
        
        return {
            "task_id": self.request.id,
            "status": "completed",
            "video_url": result.get("video_url"),
            "metadata": result.get("metadata", {})
        }
        
    except Exception as e:
        logger.error(f"Video generation failed: {e}")
        raise


@celery_app.task(bind=True, base=AIGenerationTask, name="generate_audio")
def generate_audio_task(self, user_id: str, text: str, voice_id: str,
                       audio_type: str = "tts", **kwargs):
    """
    Generate audio using AI models
    """
    try:
        asyncio.create_task(self._update_task_status(self.request.id, "processing"))
        
        if audio_type == "tts":
            result = asyncio.run(_generate_tts(text, voice_id))
        elif audio_type == "music":
            result = asyncio.run(_generate_music(text))
        else:
            raise ExternalServiceError(f"Unknown audio type: {audio_type}", "ai_provider")
        
        # Save results
        asyncio.run(_save_generation_result(
            user_id, "audio", voice_id, result, self.request.id
        ))
        
        # Deduct credits
        asyncio.run(_deduct_credits(user_id, "audio", 1))
        
        return {
            "task_id": self.request.id,
            "status": "completed",
            "audio_url": result.get("audio_url"),
            "metadata": result.get("metadata", {})
        }
        
    except Exception as e:
        logger.error(f"Audio generation failed: {e}")
        raise


# Helper functions for AI providers

async def _generate_with_fal_ai(prompt: str, negative_prompt: str, 
                               aspect_ratio: str, num_images: int) -> Dict[str, Any]:
    """Generate images using FAL.AI"""
    try:
        # Get API key from vault or settings
        api_key = await _get_vault_key("fal", settings.FAL_API_KEY)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://fal.run/fal-ai/flux/schnell",
                headers={"Authorization": f"Key {api_key}"},
                json={
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "image_size": aspect_ratio,
                    "num_inference_steps": 4,
                    "num_images": num_images
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise ExternalServiceError(
                    f"FAL.AI API error: {response.status_code}", 
                    "fal_ai", 
                    response.status_code
                )
            
            data = response.json()
            return {
                "images": data.get("images", []),
                "metadata": {
                    "provider": "fal_ai",
                    "model": "flux_schnell",
                    "generation_time": data.get("timings", {}).get("total", 0)
                }
            }
    except Exception as e:
        raise ExternalServiceError(f"FAL.AI generation failed: {str(e)}", "fal_ai")


async def _generate_with_openai(prompt: str, negative_prompt: str,
                               aspect_ratio: str, num_images: int) -> Dict[str, Any]:
    """Generate images using OpenAI DALL-E"""
    try:
        # Get API key from vault or settings
        api_key = await _get_vault_key("openai", settings.OPENAI_API_KEY)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "dall-e-3",
                    "prompt": prompt,
                    "n": num_images,
                    "size": "1024x1024",
                    "quality": "standard"
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise ExternalServiceError(
                    f"OpenAI API error: {response.status_code}",
                    "openai",
                    response.status_code
                )
            
            data = response.json()
            return {
                "images": [img["url"] for img in data.get("data", [])],
                "metadata": {
                    "provider": "openai",
                    "model": "dall-e-3"
                }
            }
    except Exception as e:
        raise ExternalServiceError(f"OpenAI generation failed: {str(e)}", "openai")


async def _generate_with_runway(prompt: str, duration: int) -> Dict[str, Any]:
    """Generate videos using Runway"""
    # Placeholder implementation
    return {
        "video_url": f"https://example.com/video/{uuid.uuid4()}.mp4",
        "metadata": {
            "provider": "runway",
            "duration": duration
        }
    }


async def _generate_with_pika(prompt: str, duration: int) -> Dict[str, Any]:
    """Generate videos using Pika"""
    # Placeholder implementation
    return {
        "video_url": f"https://example.com/video/{uuid.uuid4()}.mp4",
        "metadata": {
            "provider": "pika",
            "duration": duration
        }
    }


async def _generate_tts(text: str, voice_id: str) -> Dict[str, Any]:
    """Generate text-to-speech audio"""
    # Placeholder implementation
    return {
        "audio_url": f"https://example.com/audio/{uuid.uuid4()}.mp3",
        "metadata": {
            "provider": "elevenlabs",
            "voice_id": voice_id
        }
    }


async def _generate_music(prompt: str) -> Dict[str, Any]:
    """Generate music"""
    # Placeholder implementation
    return {
        "audio_url": f"https://example.com/music/{uuid.uuid4()}.mp3",
        "metadata": {
            "provider": "suno",
            "type": "music"
        }
    }


async def _save_generation_result(user_id: str, service_type: str, 
                                 model_id: str, result: Dict[str, Any], 
                                 task_id: str):
    """Save generation result to database"""
    try:
        db = get_database()
        
        generation_record = {
            "id": str(uuid.uuid4()),
            "task_id": task_id,
            "user_id": user_id,
            "service_type": service_type,
            "model_id": model_id,
            "result": result,
            "status": "completed",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.ai_generations.insert_one(generation_record)
        logger.info(f"Saved generation result for task {task_id}")
        
    except Exception as e:
        logger.error(f"Failed to save generation result: {e}")
        raise DatabaseError(f"Failed to save generation result: {str(e)}", "save_result")


async def _deduct_credits(user_id: str, service_type: str, units: float):
    """Deduct credits for AI generation"""
    try:
        db = get_database()
        cost = await CreditManager.get_service_cost(db, service_type, units)
        await CreditManager.deduct_credits(db, user_id, service_type, cost)
        logger.info(f"Deducted {cost} credits for user {user_id}")
        
    except Exception as e:
        logger.error(f"Failed to deduct credits: {e}")
        raise

