"""
Replicate Video Provider Adapter
Supports: Various open-source video models on Replicate
"""
import httpx
from typing import Dict, Any, Optional, List
from .base_adapter import (
    BaseVideoAdapter,
    VideoGenerationParams,
    VideoGenerationResult,
    VideoGenerationType
)


class ReplicateAdapter(BaseVideoAdapter):
    """Replicate video generation adapter"""
    
    PROVIDER_NAME = "replicate"
    BASE_URL = "https://api.replicate.com/v1"
    
    # Model to Replicate version mapping
    MODEL_VERSIONS = {
        # CogVideoX
        "wan_cogvideo_text": "THUDM/CogVideoX-5b:latest",
        # Veo 3 (Google)
        "veo3_text": "google/veo-3:latest",
        "veo3_fast_text": "google/veo-3-fast:latest",
        # Veo 3.1 (Google - latest)
        "veo31_text": "google/veo-3.1:latest",
        "veo31_image": "google/veo-3.1:latest",
        "veo31_video": "google/veo-3.1:latest",
        # Minimax
        "hailuo_minimax_text": "minimax/video-01:latest",
        # AnimateDiff
        "pixverse_v3_text": "lucataco/animate-diff:latest",
    }
    
    # Replicate uses pixel dimensions
    ASPECT_RATIO_TO_RESOLUTION = {
        "16:9": {"width": 1280, "height": 720},
        "9:16": {"width": 720, "height": 1280},
        "1:1": {"width": 720, "height": 720},
        "4:3": {"width": 960, "height": 720},
        "3:4": {"width": 720, "height": 960},
        "21:9": {"width": 1680, "height": 720},
    }
    
    def __init__(self, api_key: str):
        super().__init__(api_key, self.BASE_URL)
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def _get_model_version(self, model_id: str) -> str:
        """Get Replicate model version"""
        version = self.MODEL_VERSIONS.get(model_id)
        if not version:
            raise ValueError(f"Model {model_id} not supported by Replicate adapter")
        return version
    
    def transform_params(self, params: VideoGenerationParams) -> Dict[str, Any]:
        """Transform standardized params to Replicate format"""
        input_data = {
            "prompt": params.prompt
        }
        
        # Add image URL for image-to-video
        if params.image_url:
            input_data["image"] = params.image_url
        
        # Convert aspect ratio to resolution
        if params.aspect_ratio and params.aspect_ratio in self.ASPECT_RATIO_TO_RESOLUTION:
            res = self.ASPECT_RATIO_TO_RESOLUTION[params.aspect_ratio]
            input_data["width"] = res["width"]
            input_data["height"] = res["height"]
        
        # Add negative prompt
        if params.negative_prompt:
            input_data["negative_prompt"] = params.negative_prompt
        
        # Add seed
        if params.seed:
            input_data["seed"] = params.seed
        
        # Add num_frames for duration (approximate: 24fps)
        if params.duration:
            input_data["num_frames"] = params.duration * 24
        
        return input_data
    
    async def generate_video(self, params: VideoGenerationParams) -> VideoGenerationResult:
        """Start video generation via Replicate"""
        model_version = self._get_model_version(params.model_id)
        input_data = self.transform_params(params)
        
        url = f"{self.base_url}/predictions"
        request_data = {
            "version": model_version,
            "input": input_data
        }
        
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
                    task_id=data.get("id", ""),
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
        """Get task status from Replicate"""
        url = f"{self.base_url}/predictions/{task_id}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                status = data.get("status", "pending")
                
                # Map Replicate status
                status_map = {
                    "starting": "pending",
                    "processing": "processing",
                    "succeeded": "completed",
                    "failed": "failed",
                    "canceled": "failed"
                }
                mapped_status = status_map.get(status, status)
                
                # Get video URL
                video_url = None
                if mapped_status == "completed":
                    output = data.get("output")
                    if isinstance(output, str):
                        video_url = output
                    elif isinstance(output, list) and len(output) > 0:
                        video_url = output[0]
                
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
        """Cancel task in Replicate"""
        url = f"{self.base_url}/predictions/{task_id}/cancel"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=self.headers, timeout=10.0)
                return response.status_code == 200
            except httpx.HTTPError:
                return False
