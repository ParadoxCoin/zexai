"""
GoAPI/PiAPI Video Provider Adapter
Supports: Kling, Luma, Hailuo via GoAPI and PiAPI
Both APIs use the same format, so this adapter handles both
"""
import httpx
from typing import Dict, Any, Optional, List
from .base_adapter import (
    BaseVideoAdapter,
    VideoGenerationParams,
    VideoGenerationResult,
    VideoGenerationType
)


class GoAPIAdapter(BaseVideoAdapter):
    """GoAPI/PiAPI video generation adapter"""
    
    PROVIDER_NAME = "goapi"
    GOAPI_BASE_URL = "https://api.goapi.ai/api/v1"
    PIAPI_BASE_URL = "https://api.piapi.ai/api/v1"
    
    # Model to GoAPI/PiAPI model mapping
    MODEL_MAP = {
        # Kling models
        "kling25_turbo_text": {"model": "kling", "mode": "std"},
        "kling25_turbo_image": {"model": "kling", "mode": "std", "task_type": "image_to_video"},
        "kling21_master_text": {"model": "kling", "mode": "pro"},
        # Luma models  
        "luma_dream_text": {"model": "luma"},
        "luma_dream_image": {"model": "luma", "task_type": "image_to_video"},
        "luma_ray2_text": {"model": "luma"},
        # Hailuo/MiniMax
        "hailuo_minimax_text": {"model": "hailuo"},
        "hailuo_minimax_image": {"model": "hailuo", "task_type": "image_to_video"},
        # Hunyuan
        "hunyuan_video_text": {"model": "hunyuan"},
    }
    
    def __init__(self, api_key: str, use_piapi: bool = False):
        base_url = self.PIAPI_BASE_URL if use_piapi else self.GOAPI_BASE_URL
        super().__init__(api_key, base_url)
        self.use_piapi = use_piapi
        self.headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }
    
    def _get_model_config(self, model_id: str) -> Dict[str, Any]:
        """Get GoAPI model config"""
        config = self.MODEL_MAP.get(model_id)
        if not config:
            raise ValueError(f"Model {model_id} not supported by GoAPI adapter")
        return config
    
    def transform_params(self, params: VideoGenerationParams) -> Dict[str, Any]:
        """Transform standardized params to GoAPI/PiAPI format"""
        model_config = self._get_model_config(params.model_id)
        
        # Determine task type
        task_type = model_config.get("task_type", "video_generation")
        
        # Build input based on model
        input_data = {
            "prompt": params.prompt
        }
        
        # Add image URL for image-to-video
        if params.image_url:
            input_data["image_url"] = params.image_url
        
        # Kling-specific params
        if model_config["model"] == "kling":
            if params.duration:
                input_data["duration"] = params.duration  # 5 or 10
            if params.aspect_ratio:
                input_data["aspect_ratio"] = params.aspect_ratio  # "16:9", "9:16", "1:1"
            if params.mode or model_config.get("mode"):
                input_data["mode"] = params.mode or model_config.get("mode", "std")
            if params.negative_prompt:
                input_data["negative_prompt"] = params.negative_prompt
            input_data["cfg_scale"] = 0.5
        
        # Luma-specific params
        elif model_config["model"] == "luma":
            input_data["expand_prompt"] = True
            # Luma doesn't use duration/aspect_ratio in basic call
            # It auto-generates 5s video
        
        # Hailuo-specific params
        elif model_config["model"] == "hailuo":
            # Hailuo generates ~5s video by default
            pass
        
        # Hunyuan-specific params
        elif model_config["model"] == "hunyuan":
            # Hunyuan generates 5s video
            pass
        
        # Build full request
        request_data = {
            "model": model_config["model"],
            "task_type": task_type,
            "input": input_data,
            "config": {
                "service_mode": "",
                "webhook_config": {
                    "endpoint": "",
                    "secret": ""
                }
            }
        }
        
        return request_data
    
    async def generate_video(self, params: VideoGenerationParams) -> VideoGenerationResult:
        """Start video generation via GoAPI/PiAPI"""
        request_data = self.transform_params(params)
        url = f"{self.base_url}/task"
        
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
                
                if data.get("code") != 200:
                    return VideoGenerationResult(
                        success=False,
                        task_id="",
                        status="failed",
                        error_message=data.get("message", "Unknown error")
                    )
                
                task_data = data.get("data", {})
                
                return VideoGenerationResult(
                    success=True,
                    task_id=task_data.get("task_id", ""),
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
        """Get task status from GoAPI/PiAPI"""
        url = f"{self.base_url}/task/{task_id}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                if data.get("code") != 200:
                    return VideoGenerationResult(
                        success=False,
                        task_id=task_id,
                        status="failed",
                        error_message=data.get("message")
                    )
                
                task_data = data.get("data", {})
                status = task_data.get("status", "pending")
                
                # Get video URL if completed
                video_url = None
                if status == "completed":
                    output = task_data.get("output", {})
                    video_url = output.get("video_url") or output.get("video")
                
                return VideoGenerationResult(
                    success=True,
                    task_id=task_id,
                    status=status,
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
        """Cancel task in GoAPI/PiAPI"""
        url = f"{self.base_url}/task/{task_id}/cancel"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=self.headers, timeout=10.0)
                return response.status_code == 200
            except httpx.HTTPError:
                return False


# PiAPI is same as GoAPI with different base URL
class PiAPIAdapter(GoAPIAdapter):
    """PiAPI video generation adapter (same as GoAPI with different URL)"""
    
    PROVIDER_NAME = "piapi"
    
    def __init__(self, api_key: str):
        super().__init__(api_key, use_piapi=True)
