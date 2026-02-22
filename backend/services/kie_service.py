"""
Kie.ai API Service - Unified API for premium AI models
Documentation: https://kie.ai/docs

Credit System: 1 Kie credit = $0.005
Pay-as-you-go pricing, no subscription required.
"""

import httpx
import asyncio
import base64
from typing import Dict, Any, Optional, List
from core.config import settings
from core.logger import app_logger as logger

# Base URL for kie.ai API
KIE_API_BASE = "https://api.kie.ai/v1"


class KieAIService:
    """
    Service class for kie.ai API interactions.
    Supports: Image generation, Video generation, Music generation.
    """
    
    def __init__(self):
        self.api_key = settings.KIE_API_KEY
        self.base_url = KIE_API_BASE
        self.timeout = 120  # 2 minutes timeout for generation
        
    def _get_headers(self) -> Dict[str, str]:
        """Get auth headers for API requests"""
        return {
            "Authorization": f"Bearer {str(self.api_key)}",
            "Content-Type": "application/json"
        }
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """Make async HTTP request to kie.ai API"""
        url = f"{self.base_url}/{endpoint}"
        
        async with httpx.AsyncClient(timeout=timeout or self.timeout) as client:
            try:
                if method.upper() == "POST":
                    response = await client.post(url, json=data, headers=self._get_headers())
                elif method.upper() == "GET":
                    response = await client.get(url, params=data, headers=self._get_headers())
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                response.raise_for_status()
                return response.json()
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Kie.ai API HTTP error: {e.response.status_code} - {e.response.text}")
                raise Exception(f"Kie.ai API error: {e.response.status_code}")
            except httpx.TimeoutException:
                logger.error("Kie.ai API timeout")
                raise Exception("Kie.ai API timeout - generation taking too long")
            except Exception as e:
                logger.error(f"Kie.ai API error: {str(e)}")
                raise

    # ============================================
    # IMAGE GENERATION
    # ============================================
    
    async def generate_image(
        self,
        model_id: str,
        prompt: str,
        negative_prompt: Optional[str] = None,
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        reference_images: Optional[List[str]] = None,  # Base64 or URLs
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate image using kie.ai models.
        
        Supported models:
        - flux-2-pro, flux-2-pro-2k, flux-2-flex
        - flux-1-kontext (image editing)
        - ideogram-v3-turbo, ideogram-v3-balanced, ideogram-v3-quality
        - gemini-pro-image, gemini-pro-image-4k
        - gpt-4o-image
        - imagen-4-fast, imagen-4-ultra
        - recraft, z-image, seedream, grok-imagine
        """
        payload = {
            "model": model_id,
            "prompt": prompt,
            "width": width,
            "height": height,
            "num_images": num_images,
        }
        
        if negative_prompt:
            payload["negative_prompt"] = negative_prompt
            
        if reference_images:
            payload["reference_images"] = reference_images
            
        # Add any additional model-specific parameters
        payload.update(kwargs)
        
        result = await self._make_request("POST", "image/generate", payload)
        
        return {
            "success": True,
            "images": result.get("images", []),
            "model": model_id,
            "credits_used": result.get("credits_used", 0)
        }
    
    async def edit_image(
        self,
        model_id: str,
        image: str,  # Base64 or URL
        prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Edit image using FLUX.1 Kontext or similar models.
        Uses natural language to describe edits.
        """
        payload = {
            "model": model_id,
            "image": image,
            "prompt": prompt,
        }
        payload.update(kwargs)
        
        result = await self._make_request("POST", "image/edit", payload)
        
        return {
            "success": True,
            "image": result.get("image"),
            "model": model_id,
            "credits_used": result.get("credits_used", 0)
        }
    
    async def upscale_image(
        self,
        image: str,  # Base64 or URL
        scale: int = 2,  # 2x or 4x
        **kwargs
    ) -> Dict[str, Any]:
        """Upscale image using Topaz or similar"""
        payload = {
            "model": "topaz-upscale",
            "image": image,
            "scale": scale,
        }
        payload.update(kwargs)
        
        result = await self._make_request("POST", "image/upscale", payload)
        
        return {
            "success": True,
            "image": result.get("image"),
            "credits_used": result.get("credits_used", 0)
        }

    # ============================================
    # VIDEO GENERATION
    # ============================================
    
    async def generate_video(
        self,
        model_id: str,
        prompt: str,
        image: Optional[str] = None,  # For image-to-video
        duration: int = 5,
        resolution: str = "1080p",
        with_audio: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate video using kie.ai models.
        
        Supported models:
        - veo-3.1-quality, veo-3.1-fast
        - sora-2-pro-standard, sora-2-pro-high
        - kling-2.6-audio, kling-2.6-hd, kling-2.5-turbo, kling-2.1
        - runway-aleph
        - wan-2.6
        - grok-imagine-video
        - hailuo-2.3
        """
        payload = {
            "model": model_id,
            "prompt": prompt,
            "duration": duration,
            "resolution": resolution,
        }
        
        if image:
            payload["image"] = image
            
        if with_audio:
            payload["with_audio"] = True
            
        payload.update(kwargs)
        
        # Video generation is async - returns task_id
        result = await self._make_request("POST", "video/generate", payload, timeout=30)
        
        return {
            "success": True,
            "task_id": result.get("task_id"),
            "status": "processing",
            "model": model_id,
            "estimated_time": result.get("estimated_time", 60)
        }
    
    async def get_video_status(self, task_id: str) -> Dict[str, Any]:
        """Check video generation status"""
        result = await self._make_request("GET", f"video/status/{task_id}")
        
        return {
            "task_id": task_id,
            "status": result.get("status"),  # processing, completed, failed
            "video_url": result.get("video_url"),
            "thumbnail_url": result.get("thumbnail_url"),
            "credits_used": result.get("credits_used", 0),
            "error": result.get("error")
        }
    
    async def wait_for_video(
        self, 
        task_id: str, 
        max_wait: int = 300,  # 5 minutes
        poll_interval: int = 5
    ) -> Dict[str, Any]:
        """Wait for video generation to complete with polling"""
        elapsed = 0
        
        while elapsed < max_wait:
            status = await self.get_video_status(task_id)
            
            if status["status"] == "completed":
                return status
            elif status["status"] == "failed":
                raise Exception(f"Video generation failed: {status.get('error', 'Unknown error')}")
            
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
        
        raise Exception("Video generation timeout - max wait time exceeded")

    # ============================================
    # MUSIC GENERATION (Suno API)
    # ============================================
    
    async def generate_music(
        self,
        model_id: str,
        prompt: str,
        duration: int = 60,  # seconds
        style: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate music using Suno API via kie.ai.
        
        Supported models:
        - suno-v3.5, suno-v4, suno-v4.5, suno-v4.5-plus
        """
        payload = {
            "model": model_id,
            "prompt": prompt,
            "duration": duration,
        }
        
        if style:
            payload["style"] = style
            
        payload.update(kwargs)
        
        # Music generation is async
        result = await self._make_request("POST", "music/generate", payload, timeout=30)
        
        return {
            "success": True,
            "task_id": result.get("task_id"),
            "status": "processing",
            "model": model_id,
            "estimated_time": result.get("estimated_time", 90)
        }
    
    async def get_music_status(self, task_id: str) -> Dict[str, Any]:
        """Check music generation status"""
        result = await self._make_request("GET", f"music/status/{task_id}")
        
        return {
            "task_id": task_id,
            "status": result.get("status"),
            "audio_url": result.get("audio_url"),
            "credits_used": result.get("credits_used", 0),
            "error": result.get("error")
        }

    # ============================================
    # ACCOUNT & CREDITS
    # ============================================
    
    async def get_account_info(self) -> Dict[str, Any]:
        """Get account information including credit balance"""
        result = await self._make_request("GET", "account/info")
        
        return {
            "credits_balance": result.get("credits_balance", 0),
            "credits_used_today": result.get("credits_used_today", 0),
            "email": result.get("email")
        }
    
    async def get_credit_balance(self) -> float:
        """Get current credit balance"""
        info = await self.get_account_info()
        return info.get("credits_balance", 0)


# Global service instance
kie_service = KieAIService()


# Helper functions for quick access
async def kie_generate_image(
    model_id: str,
    prompt: str,
    **kwargs
) -> Dict[str, Any]:
    """Quick helper for image generation"""
    return await kie_service.generate_image(model_id, prompt, **kwargs)


async def kie_generate_video(
    model_id: str,
    prompt: str,
    **kwargs
) -> Dict[str, Any]:
    """Quick helper for video generation"""
    return await kie_service.generate_video(model_id, prompt, **kwargs)


async def kie_generate_music(
    model_id: str,
    prompt: str,
    **kwargs
) -> Dict[str, Any]:
    """Quick helper for music generation"""
    return await kie_service.generate_music(model_id, prompt, **kwargs)
