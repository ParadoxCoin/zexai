"""
Kie.ai Provider - Unified API for premium AI models
Supports: Image, Video, Music generation

API Patterns:
- Market API: POST /api/v1/jobs/createTask → GET /api/v1/jobs/recordInfo
- Flux Kontext: POST /api/v1/flux/kontext/generate → GET /api/v1/flux/kontext/record-info
- GPT-4o Image: POST /api/v1/gpt4o-image/generate → GET /api/v1/gpt4o-image/record-info
"""

import json
import httpx
import asyncio
from typing import Dict, Any, List, Optional
from core.config import settings
from core.logger import app_logger as logger
from core.kie_models import KIE_IMAGE_MODELS


class KieProvider:
    """
    Kie.ai provider for image, video, and music generation.
    Uses unified kie.ai API gateway with async task-based endpoints.
    """
    
    def __init__(self):
        raw_key = settings.KIE_API_KEY
        # Ensure api_key is always a proper string, never bytes or None
        if isinstance(raw_key, bytes):
            raw_key = raw_key.decode('utf-8')
        self.api_key = str(raw_key).strip() if raw_key else ""
        self.base_url = "https://api.kie.ai"
        self.poll_interval = 3  # seconds
        self.max_poll_time = 300  # seconds (increased for slower models)
        
    def _get_headers(self) -> Dict[str, str]:
        if not self.api_key:
            raise Exception("KIE_API_KEY is not configured. Please set it in Railway environment variables.")
        # Ensure the key is a plain string (not bytes)
        key = self.api_key
        if isinstance(key, bytes):
            key = key.decode('utf-8')
        key = str(key).strip()
        return {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
    
    # ============================================
    # IMAGE GENERATION
    # ============================================
    
    async def generate_image(
        self, 
        model_id: str, 
        prompt: str, 
        params: Dict[str, Any]
    ) -> List[str]:
        """
        Generate image using kie.ai models.
        Routes to correct endpoint based on model's api_type.
        Returns list of image URLs.
        """
        
        # Get model config from KIE_IMAGE_MODELS
        model_config = KIE_IMAGE_MODELS.get(model_id, {})
        api_type = model_config.get("api_type", "market")
        kie_model = model_config.get("model_id", model_id)
        
        logger.info(f"Kie.ai image generation: model={model_id}, api_type={api_type}, kie_model={kie_model}")
        
        if api_type == "flux_kontext":
            return await self._generate_flux_kontext(kie_model, prompt, params)
        elif api_type == "gpt4o_image":
            return await self._generate_gpt4o_image(prompt, params)
        else:
            return await self._generate_market(kie_model, prompt, params, model_config=model_config)
    
    # ── Market API ───────────────────────────────
    
    async def _generate_market(
        self, kie_model: str, prompt: str, params: Dict[str, Any],
        model_config: Dict[str, Any] = None
    ) -> List[str]:
        """Market API: POST /api/v1/jobs/createTask → poll recordInfo"""
        
        # Build input based on model
        input_data = {"prompt": prompt}
        
        # Derive resolution from aspect ratio (they must be consistent!)
        ASPECT_RESOLUTION_MAP = {
            "1:1":  "1024x1024",
            "16:9": "1280x720",
            "9:16": "720x1280",
            "4:3":  "1024x768",
            "3:4":  "768x1024",
            "3:2":  "1536x1024",
            "2:3":  "1024x1536",
        }
        
        aspect = params.get("aspect_ratio") or "1:1"
        resolution = params.get("resolution") or ASPECT_RESOLUTION_MAP.get(aspect, "1024x1024")
        
        input_data["resolution"] = resolution
        input_data["aspect_ratio"] = aspect
        
        # Model-specific params
        if params.get("negative_prompt"):
            input_data["negative_prompt"] = params["negative_prompt"]
        if params.get("guidance_scale"):
            input_data["guidance_scale"] = params["guidance_scale"]
        if params.get("strength"):
            input_data["strength"] = float(params["strength"])
        if params.get("rendering_speed"):
            input_data["rendering_speed"] = params["rendering_speed"]
        if params.get("image_urls"):
            input_data["image_urls"] = params["image_urls"]
        elif params.get("image_url"):
            input_data["image_urls"] = [params["image_url"]]
        if params.get("image_url"):
            input_data["image_url"] = params["image_url"]
        
        payload = {
            "model": kie_model,
            "input": input_data
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # 1. Create task
                response = await client.post(
                    f"{self.base_url}/api/v1/jobs/createTask",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("code") != 200:
                    raise Exception(f"Kie.ai createTask error: {data.get('msg', 'Unknown error')}")
                
                task_id = data["data"]["taskId"]
                logger.info(f"Kie.ai market task created: {task_id}")
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Kie.ai createTask failed: {e.response.status_code} - {e.response.text}")
                raise Exception(f"Kie.ai API error: {e.response.status_code}")
        
        # 2. Poll for result
        return await self._poll_market_task(task_id)
    
    async def _poll_market_task(self, task_id: str) -> List[str]:
        """Poll GET /api/v1/jobs/recordInfo until success/fail"""
        elapsed = 0
        
        while elapsed < self.max_poll_time:
            await asyncio.sleep(self.poll_interval)
            elapsed += self.poll_interval
            
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        f"{self.base_url}/api/v1/jobs/recordInfo",
                        params={"taskId": task_id},
                        headers=self._get_headers()
                    )
                    response.raise_for_status()
                    data = response.json()
            except (httpx.ReadError, httpx.ConnectError, httpx.TimeoutException) as e:
                logger.warning(f"Kie.ai market poll transient error (will retry): {e}")
                continue
            
            if data.get("code") != 200:
                continue
            
            task_data = data.get("data", {})
            state = task_data.get("state", "")
            
            logger.info(f"Kie.ai market poll: task={task_id}, state={state}")
            
            if state == "success":
                # Parse resultJson → {"resultUrls": [...]}
                result_json_str = task_data.get("resultJson", "{}")
                try:
                    result_json = json.loads(result_json_str) if isinstance(result_json_str, str) else result_json_str
                except json.JSONDecodeError:
                    result_json = {}
                
                urls = result_json.get("resultUrls", [])
                if urls:
                    return urls
                raise Exception("Kie.ai: Task succeeded but no result URLs")
                
            elif state == "fail":
                fail_msg = task_data.get("failMsg", "Unknown error")
                raise Exception(f"Kie.ai generation failed: {fail_msg}")
            
            # states: waiting, queuing, generating → continue polling
        
        raise Exception(f"Kie.ai generation timeout after {self.max_poll_time}s")
    
    # ── Flux Kontext API ─────────────────────────
    
    async def _generate_flux_kontext(
        self, kie_model: str, prompt: str, params: Dict[str, Any]
    ) -> List[str]:
        """Flux Kontext: POST /api/v1/flux/kontext/generate → poll record-info"""
        
        payload = {
            "prompt": prompt,
            "model": kie_model,
            "aspectRatio": params.get("aspect_ratio", "1:1"),
        }
        
        img_url = params.get("input_image") or params.get("image_url")
        if img_url:
            payload["inputImage"] = img_url
            payload["image"] = img_url      # Common alias
            payload["imageUrl"] = img_url   # Common alias
            payload["init_image"] = img_url # SD standard
            
            # Add strength (denoising_strength) if provided
            if params.get("strength"):
                payload["strength"] = float(params["strength"])
            # Some APIs use 'denoising_strength' key
            if params.get("strength"):
                payload["denoising_strength"] = float(params["strength"])
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/flux/kontext/generate",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("code") != 200:
                    raise Exception(f"Flux Kontext error: {data.get('msg')}")
                
                task_id = data["data"]["taskId"]
                logger.info(f"Kie.ai Flux Kontext task created: {task_id}")
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Flux Kontext failed: {e.response.status_code} - {e.response.text}")
                raise Exception(f"Flux Kontext API error: {e.response.status_code}")
        
        return await self._poll_dedicated_task(
            task_id, 
            record_info_url=f"{self.base_url}/api/v1/flux/kontext/record-info"
        )
    
    # ── GPT-4o Image API ─────────────────────────
    
    async def _generate_gpt4o_image(
        self, prompt: str, params: Dict[str, Any]
    ) -> List[str]:
        """GPT-4o: POST /api/v1/gpt4o-image/generate → poll record-info"""
        
        payload = {
            "prompt": prompt,
            "size": params.get("aspect_ratio", "1:1"),
            "nVariants": params.get("num_images", 1),
        }
        
        if params.get("input_image") or params.get("image_url"):
            payload["inputImage"] = params.get("input_image") or params.get("image_url")
            # Strength (denoising/edit strength)
            if params.get("strength"):
                payload["strength"] = float(params["strength"])
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/gpt4o-image/generate",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("code") != 200:
                    raise Exception(f"GPT-4o Image error: {data.get('msg')}")
                
                task_id = data["data"]["taskId"]
                logger.info(f"Kie.ai GPT-4o task created: {task_id}")
                
            except httpx.HTTPStatusError as e:
                logger.error(f"GPT-4o Image failed: {e.response.status_code} - {e.response.text}")
                raise Exception(f"GPT-4o Image API error: {e.response.status_code}")
        
        return await self._poll_dedicated_task(
            task_id,
            record_info_url=f"{self.base_url}/api/v1/gpt4o-image/record-info"
        )
    
    # ── Shared polling for Flux Kontext & GPT-4o ─
    
    async def _poll_dedicated_task(
        self, task_id: str, record_info_url: str
    ) -> List[str]:
        """Poll dedicated API record-info endpoint. 
        successFlag: 0=generating, 1=success, 2+=failed
        Result in data.response.result_urls
        """
        elapsed = 0
        
        while elapsed < self.max_poll_time:
            await asyncio.sleep(self.poll_interval)
            elapsed += self.poll_interval
            
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        record_info_url,
                        params={"taskId": task_id},
                        headers=self._get_headers()
                    )
                    response.raise_for_status()
                    data = response.json()
            except (httpx.ReadError, httpx.ConnectError, httpx.TimeoutException) as e:
                logger.warning(f"Kie.ai dedicated poll transient error (will retry): {e}")
                continue
            
            if data.get("code") != 200:
                continue
            
            task_data = data.get("data", {})
            success_flag = task_data.get("successFlag", 0)
            
            logger.info(f"Kie.ai dedicated poll: task={task_id}, successFlag={success_flag}")
            
            if success_flag == 1:
                # Success → extract result_urls
                resp = task_data.get("response", {})
                if isinstance(resp, str):
                    try:
                        resp = json.loads(resp)
                    except json.JSONDecodeError:
                        resp = {}
                
                # Robust parsing: check various keys including CamelCase/snake_case
                urls = resp.get("result_urls", []) or resp.get("resultUrls", [])
                
                if not urls:
                    if resp.get("resultImageUrl"): urls = [resp["resultImageUrl"]]
                    elif resp.get("url"): urls = [resp["url"]]
                    elif resp.get("image"): urls = [resp["image"]]
                    elif resp.get("images"): urls = resp["images"]
                    elif resp.get("data"):
                        d = resp["data"]
                        if isinstance(d, list) and d and isinstance(d[0], dict) and d[0].get("url"):
                            urls = [x["url"] for x in d]
                
                if urls:
                    return urls
                
                # Enhanced debug logging
                import json
                try:
                    debug_resp = json.dumps(resp, indent=2)
                except:
                    debug_resp = str(resp)
                raise Exception(f"Kie.ai: Task succeeded but no result URLs found. Keys: {list(resp.keys())} Debug: {debug_resp}")
                
            elif success_flag >= 2:
                error_msg = task_data.get("errorMessage", "Unknown error")
                raise Exception(f"Kie.ai generation failed: {error_msg}")
            
            # successFlag == 0 → still generating
        
        raise Exception(f"Kie.ai generation timeout after {self.max_poll_time}s")
    
    # ── Image Editing (convenience wrappers) ─────
    
    async def edit_image(
        self,
        model_id: str,
        image_url: str,
        prompt: str,
        params: Dict[str, Any] = {}
    ) -> List[str]:
        """Edit image using Flux Kontext, Nano Banana Edit, or GPT-4o"""
        params["image_url"] = image_url
        return await self.generate_image(model_id, prompt, params)



    # ============================================
    # VIDEO GENERATION
    # ============================================
    
    async def generate_video(
        self,
        model_id: str,
        prompt: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Start video generation (async - returns task_id)"""
        
        # Map internal model_id to kie.ai model name
        model_mapping = {
            # Veo 3.1
            "kie_veo31_quality": "veo-3.1-quality",
            "kie_veo31_fast": "veo-3.1-fast",
            
            # Sora 2
            "kie_sora2_pro_10s": "sora-2-pro-standard-10s",
            "kie_sora2_pro_15s": "sora-2-pro-standard-15s",
            "kie_sora2_high_10s": "sora-2-pro-high-10s",
            "kie_sora2_high_15s": "sora-2-pro-high-15s",
            
            # Kling 2.6
            "kie_kling26_audio_5s": "kling-2.6-audio-5s",
            "kie_kling26_audio_10s": "kling-2.6-audio-10s",
            "kie_kling26_hd_5s": "kling-2.6-hd-5s",
            "kie_kling26_hd_10s": "kling-2.6-hd-10s",
            "kie_kling25_turbo_5s": "kling-2.5-turbo-5s",
            "kie_kling25_turbo_10s": "kling-2.5-turbo-10s",
            "kie_kling21_5s": "kling-2.1-5s",
            "kie_kling21_10s": "kling-2.1-10s",
            "kie_kling21_std_5s": "kling-2.1-standard-5s",
            
            # Others
            "kie_runway_aleph": "runway-aleph",
            "kie_wan26_720p_5s": "wan-2.6-720p-5s",
            "kie_wan26_720p_10s": "wan-2.6-720p-10s",
            "kie_wan26_1080p_5s": "wan-2.6-1080p-5s",
            "kie_wan26_1080p_10s": "wan-2.6-1080p-10s",
            "kie_grok_video": "grok-imagine-video",
            "kie_hailuo23": "hailuo-2.3",
        }
        
        kie_model = model_mapping.get(model_id, model_id.replace("kie_", ""))
        
        payload = {
            "model": kie_model,
            "prompt": prompt,
        }
        
        if params.get("duration"):
            payload["duration"] = params["duration"]
        if params.get("resolution"):
            payload["resolution"] = params["resolution"]
        if params.get("image"):
            payload["image"] = params["image"]  # For image-to-video
        if params.get("with_audio"):
            payload["with_audio"] = params["with_audio"]
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/video/generate",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "task_id": data.get("task_id", data.get("id")),
                    "status": "processing",
                    "estimated_time": data.get("estimated_time", 60)
                }
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Kie.ai video generation failed: {e.response.status_code}")
                raise Exception(f"Kie.ai API error: {e.response.status_code}")
            except Exception as e:
                logger.error(f"Kie.ai video generation error: {str(e)}")
                raise

    async def get_video_status(self, task_id: str) -> Dict[str, Any]:
        """Check video generation status"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/video/status/{task_id}",
                headers=self._get_headers()
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "task_id": task_id,
                "status": data.get("status", "processing"),
                "video_url": data.get("video_url"),
                "thumbnail_url": data.get("thumbnail_url"),
                "credits_used": data.get("credits_used", 0),
                "error": data.get("error")
            }

    async def wait_for_video(
        self,
        task_id: str,
        max_wait: int = 300,
        poll_interval: int = 5
    ) -> Dict[str, Any]:
        """Poll until video is ready"""
        elapsed = 0
        
        while elapsed < max_wait:
            status = await self.get_video_status(task_id)
            
            if status["status"] == "completed":
                return status
            elif status["status"] == "failed":
                raise Exception(f"Video generation failed: {status.get('error')}")
                
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
            
        raise Exception("Video generation timeout")

    # ============================================
    # MUSIC GENERATION
    # ============================================
    
    async def generate_music(
        self,
        model_id: str,
        prompt: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Start music generation (async)"""
        
        model_mapping = {
            "kie_suno_v35": "suno-v3.5",
            "kie_suno_v4": "suno-v4",
            "kie_suno_v45": "suno-v4.5",
            "kie_suno_v45_plus": "suno-v4.5-plus",
        }
        
        kie_model = model_mapping.get(model_id, model_id.replace("kie_", ""))
        
        payload = {
            "model": kie_model,
            "prompt": prompt,
            "duration": params.get("duration", 60),
        }
        
        if params.get("style"):
            payload["style"] = params["style"]
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/music/generate",
                headers=self._get_headers(),
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "task_id": data.get("task_id", data.get("id")),
                "status": "processing",
                "estimated_time": data.get("estimated_time", 90)
            }

    async def get_music_status(self, task_id: str) -> Dict[str, Any]:
        """Check music generation status"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/music/status/{task_id}",
                headers=self._get_headers()
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "task_id": task_id,
                "status": data.get("status", "processing"),
                "audio_url": data.get("audio_url"),
                "credits_used": data.get("credits_used", 0),
                "error": data.get("error")
            }


# Global provider instance
kie_provider = KieProvider()
