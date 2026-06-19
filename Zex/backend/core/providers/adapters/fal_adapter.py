"""
fal.ai Video Provider Adapter
Supports: Minimax, Kling, Luma, Runway, and other fal.ai hosted models
"""
import httpx
import asyncio
from typing import Dict, Any, Optional, List
from .base_adapter import (
    BaseVideoAdapter,
    VideoGenerationParams,
    VideoGenerationResult,
    VideoGenerationType
)


class FalAIAdapter(BaseVideoAdapter):
    """fal.ai video generation adapter"""
    
    PROVIDER_NAME = "fal"
    BASE_URL = "https://fal.run"
    QUEUE_URL = "https://queue.fal.run"
    
    # fal.ai model endpoints
    MODEL_ENDPOINTS = {
        # Minimax
        "hailuo_minimax_text": "fal-ai/minimax-video",
        "hailuo_minimax_image": "fal-ai/minimax-video/image-to-video",
        # Kling
        "kling25_turbo_text": "fal-ai/kling-video/v1.5/standard/text-to-video",
        "kling25_turbo_image": "fal-ai/kling-video/v1.5/standard/image-to-video",
        "kling21_master_text": "fal-ai/kling-video/v1.5/pro/text-to-video",
        # Luma
        "luma_dream_text": "fal-ai/luma-dream-machine",
        "luma_dream_image": "fal-ai/luma-dream-machine/image-to-video",
        "luma_ray2_text": "fal-ai/luma-ray-v2",
        # Runway
        "runway_gen3_text": "fal-ai/runway-gen3/turbo/text-to-video",
        "runway_gen3_image": "fal-ai/runway-gen3/turbo/image-to-video",
        # CogVideoX
        "wan_cogvideo_text": "fal-ai/cogvideox-5b",
        # Hunyuan
        "hunyuan_video_text": "fal-ai/hunyuan-video",
    }
    
    # fal.ai aspect ratio format mappings
    ASPECT_RATIO_MAP = {
        "16:9": "16:9",
        "9:16": "9:16",
        "1:1": "1:1",
        "4:3": "4:3",
        "3:4": "3:4",
        "21:9": "21:9",
        "4:5": "4:5",
        "5:4": "5:4",
    }
    
    # fal.ai resolution mappings (some models use resolution instead of aspect_ratio)
    RESOLUTION_MAP = {
        "16:9": {"width": 1280, "height": 720},
        "9:16": {"width": 720, "height": 1280},
        "1:1": {"width": 720, "height": 720},
        "4:3": {"width": 960, "height": 720},
        "3:4": {"width": 720, "height": 960},
    }
    
    def __init__(self, api_key: str):
        super().__init__(api_key, self.BASE_URL)
        self.headers = {
            "Authorization": f"Key {api_key}",
            "Content-Type": "application/json"
        }
    
    def _get_endpoint(self, model_id: str) -> str:
        """Get fal.ai endpoint for model"""
        endpoint = self.MODEL_ENDPOINTS.get(model_id)
        if not endpoint:
            raise ValueError(f"Model {model_id} not supported by fal.ai adapter")
        return endpoint
    
    def transform_params(self, params: VideoGenerationParams) -> Dict[str, Any]:
        """Transform standardized params to fal.ai format"""
        endpoint = self._get_endpoint(params.model_id)
        
        # Base request
        request_data = {
            "prompt": params.prompt
        }
        
        # Add image URL for image-to-video
        if params.image_url:
            request_data["image_url"] = params.image_url
        
        # Add duration (fal.ai uses "duration" or "num_frames")
        if params.duration:
            # Some models use duration in seconds
            if "minimax" in endpoint or "luma" in endpoint:
                request_data["duration"] = params.duration
            # Some models use num_inference_steps
            elif "cogvideo" in endpoint:
                request_data["num_inference_steps"] = 50
        
        # Add aspect ratio (format varies by model)
        if params.aspect_ratio:
            if "kling" in endpoint:
                request_data["aspect_ratio"] = params.aspect_ratio
            elif "runway" in endpoint:
                request_data["aspect_ratio"] = params.aspect_ratio
            elif "luma" in endpoint:
                request_data["aspect_ratio"] = params.aspect_ratio
            elif "minimax" in endpoint:
                # Minimax uses resolution
                if params.aspect_ratio in self.RESOLUTION_MAP:
                    res = self.RESOLUTION_MAP[params.aspect_ratio]
                    request_data["width"] = res["width"]
                    request_data["height"] = res["height"]
        
        # Add quality/mode for Kling
        if params.mode and "kling" in endpoint:
            # kling uses mode in endpoint path (standard vs pro)
            # Already handled by model_id selection
            pass
        
        # Add negative prompt if supported
        if params.negative_prompt:
            request_data["negative_prompt"] = params.negative_prompt
        
        # Add seed for reproducibility
        if params.seed:
            request_data["seed"] = params.seed
        
        # Merge extra params
        if params.extra_params:
            request_data.update(params.extra_params)
        
        return request_data
    
    async def generate_video(self, params: VideoGenerationParams) -> VideoGenerationResult:
        """Start video generation via fal.ai queue"""
        endpoint = self._get_endpoint(params.model_id)
        request_data = self.transform_params(params)
        
        url = f"{self.QUEUE_URL}/{endpoint}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    json=request_data,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                return VideoGenerationResult(
                    success=True,
                    task_id=data.get("request_id", ""),
                    status="pending",
                    provider_response=data
                )
            except httpx.HTTPError as e:
                return VideoGenerationResult(
                    success=False,
                    task_id="",
                    status="failed",
                    error_message=str(e)
                )
    
    async def get_task_status(self, task_id: str) -> VideoGenerationResult:
        """Get task status from fal.ai queue"""
        url = f"{self.QUEUE_URL}/requests/{task_id}/status"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                status = data.get("status", "pending")
                
                # Map fal.ai status to our status
                status_map = {
                    "IN_QUEUE": "pending",
                    "IN_PROGRESS": "processing",
                    "COMPLETED": "completed",
                    "FAILED": "failed"
                }
                mapped_status = status_map.get(status, status.lower())
                
                # Get result if completed
                video_url = None
                if mapped_status == "completed":
                    result_url = f"{self.QUEUE_URL}/requests/{task_id}"
                    result_response = await client.get(result_url, headers=self.headers)
                    if result_response.status_code == 200:
                        result_data = result_response.json()
                        video_url = result_data.get("video", {}).get("url")
                
                return VideoGenerationResult(
                    success=True,
                    task_id=task_id,
                    status=mapped_status,
                    video_url=video_url,
                    provider_response=data
                )
            except httpx.HTTPError as e:
                return VideoGenerationResult(
                    success=False,
                    task_id=task_id,
                    status="failed",
                    error_message=str(e)
                )
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel task in fal.ai queue"""
        url = f"{self.QUEUE_URL}/requests/{task_id}/cancel"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=self.headers, timeout=10.0)
                return response.status_code == 200
            except httpx.HTTPError:
                return False
