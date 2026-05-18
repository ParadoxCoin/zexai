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

# HTTP status codes that trigger key rotation
_ROTATE_ON_STATUS = {401, 403, 429}


class KieAIService:
    """
    Service class for kie.ai API interactions.
    Supports multiple API keys with round-robin rotation + automatic failover.

    Key rotation strategy:
    - Requests cycle through available keys in order (round-robin).
    - On 401/403 (invalid/expired) or 429 (rate-limited), the current key is
      temporarily marked as failed and the next key is tried immediately.
    - If ALL keys fail, the original error is raised.
    """

    def __init__(self):
        # Build the key pool from KIE_API_KEY + KIE_API_KEY_2 (+ more if added)
        raw_keys = [
            settings.KIE_API_KEY,
            getattr(settings, "KIE_API_KEY_2", ""),
        ]
        self._keys: list[str] = []
        for k in raw_keys:
            if isinstance(k, bytes):
                k = k.decode("utf-8")
            k = str(k).strip() if k else ""
            if k:
                self._keys.append(k)

        # Round-robin cursor — advances on each request
        self._cursor: int = 0
        self.base_url = KIE_API_BASE
        self.timeout = 120

    # ── Key management ─────────────────────────────────────────────────────

    def _next_key(self) -> str:
        """Return the next API key in round-robin order."""
        if not self._keys:
            raise Exception(
                "No KIE_API_KEY configured. "
                "Set KIE_API_KEY (and optionally KIE_API_KEY_2) in .env"
            )
        key = self._keys[self._cursor % len(self._keys)]
        self._cursor = (self._cursor + 1) % len(self._keys)
        return key

    def _headers_for(self, key: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def get_active_key_info(self) -> Dict[str, Any]:
        """Admin helper – returns how many keys are configured (never exposes raw keys)."""
        return {
            "key_count": len(self._keys),
            "keys": [f"...{k[-6:]}" for k in self._keys],  # last 6 chars only
            "current_cursor": self._cursor,
        }

    # ── HTTP request with automatic key failover ────────────────────────────

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        timeout: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Make async HTTP request to kie.ai API.
        On 401/403/429 errors the next available key is tried automatically.
        """
        url = f"{self.base_url}/{endpoint}"
        total_keys = len(self._keys) if self._keys else 0
        last_exc: Exception = Exception("No API keys configured")

        # Try every key at most once
        for attempt in range(max(total_keys, 1)):
            key = self._next_key()
            headers = self._headers_for(key)

            async with httpx.AsyncClient(timeout=timeout or self.timeout) as client:
                try:
                    if method.upper() == "POST":
                        response = await client.post(url, json=data, headers=headers)
                    elif method.upper() == "GET":
                        response = await client.get(url, params=data, headers=headers)
                    else:
                        raise ValueError(f"Unsupported HTTP method: {method}")

                    if response.status_code in _ROTATE_ON_STATUS:
                        logger.warning(
                            f"[KieAI] Key ...{key[-6:]} returned {response.status_code} "
                            f"– rotating to next key (attempt {attempt + 1}/{total_keys})"
                        )
                        last_exc = Exception(
                            f"Kie.ai API error: {response.status_code} (key rotated)"
                        )
                        continue  # Try next key

                    response.raise_for_status()
                    if attempt > 0:
                        logger.info(f"[KieAI] Recovered on attempt {attempt + 1} using key ...{key[-6:]}")
                    return response.json()

                except httpx.HTTPStatusError as e:
                    code = e.response.status_code
                    if code in _ROTATE_ON_STATUS and attempt < total_keys - 1:
                        logger.warning(
                            f"[KieAI] HTTPStatusError {code} on key ...{key[-6:]} – rotating"
                        )
                        last_exc = Exception(f"Kie.ai API error: {code}")
                        continue
                    logger.error(f"Kie.ai API HTTP error: {code} - {e.response.text}")
                    raise Exception(f"Kie.ai API error: {code}")

                except httpx.TimeoutException:
                    logger.error("Kie.ai API timeout")
                    raise Exception("Kie.ai API timeout – generation taking too long")

                except Exception as e:
                    logger.error(f"Kie.ai API error: {e}")
                    raise

        raise last_exc

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
    # TEXT TO SPEECH (ElevenLabs models via Kie.ai)
    # ============================================
    
    async def generate_tts(
        self,
        model_id: str,
        text: str,
        voice_id: str = "alloy",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate Text-to-Speech using Kie.ai API.
        This uses the OpenAI-compatible audio/speech endpoint if supported,
        or a custom endpoint.
        """
        payload = {
            "model": model_id,
            "input": text,
            "voice": voice_id
        }
        
        payload.update(kwargs)
        
        # Audio generation is usually sync, but if it is large it might stream
        # Try standard OpenAI compatible path first
        result = await self._make_request("POST", "audio/speech", payload, timeout=60)
        
        # Depending on if Kie.ai returns binary or JSON with URL
        if isinstance(result, dict) and "url" in result:
            return {
                "success": True,
                "audio_url": result.get("url"),
                "model": model_id
            }
        elif isinstance(result, dict) and "task_id" in result:
             return {
                "success": True,
                "task_id": result.get("task_id"),
                "status": "processing",
                "model": model_id
            }
        else:
             # Assume it's a direct URL or base64 structure
             return {
                 "success": True,
                 "data": result,
                 "model": model_id
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


async def kie_generate_tts(
    model_id: str,
    text: str,
    voice_id: str = "alloy",
    **kwargs
) -> Dict[str, Any]:
    """Quick helper for Text-to-Speech generation"""
    return await kie_service.generate_tts(model_id, text, voice_id, **kwargs)
