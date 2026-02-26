"""
Pollo.ai Video Provider Adapter
Supports: Text-to-Video and Image-to-Video generation using Pollo.ai APIs
"""
import httpx
from typing import Dict, Any, Optional

from .base_adapter import (
    BaseVideoAdapter,
    VideoGenerationParams,
    VideoGenerationResult,
    VideoGenerationType
)

class PolloVideoAdapter(BaseVideoAdapter):
    """Pollo.ai video generation adapter"""
    
    PROVIDER_NAME = "pollo"
    POLLO_BASE_URL = "https://api.pollo.ai/v1"
    
    def __init__(self, api_key: str):
        super().__init__(api_key, self.POLLO_BASE_URL)
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
    def transform_params(self, params: VideoGenerationParams) -> Dict[str, Any]:
        """Transform standardized params to Pollo.ai format"""
        payload = {
            "model": params.model_id,
            "prompt": params.prompt
        }
        
        # Determine if it's Text-to-Video or Image-to-Video
        if params.image_url:
            payload["image_url"] = params.image_url
            payload["type"] = "image_to_video"
        else:
            payload["type"] = "text_to_video"
            
        if params.duration:
            payload["duration"] = params.duration
            
        return payload

    async def generate_video(self, params: VideoGenerationParams) -> VideoGenerationResult:
        """Start video generation via Pollo.ai"""
        request_data = self.transform_params(params)
        url = f"{self.base_url}/video/generate"
        
        async with httpx.AsyncClient(verify=False) as client:
            try:
                response = await client.post(
                    url,
                    json=request_data,
                    headers=self.headers,
                    timeout=30.0
                )
                
                # Pollo sometimes returns 201 Created
                if response.status_code not in [200, 201]:
                    return VideoGenerationResult(
                        success=False,
                        task_id="",
                        status="failed",
                        error_message=f"Pollo.ai error {response.status_code}: {response.text}"
                    )
                    
                data = response.json()
                task_id = data.get("task_id")
                
                if not task_id:
                    return VideoGenerationResult(
                        success=False,
                        task_id="",
                        status="failed",
                        error_message="No task_id returned from Pollo.ai"
                    )
                    
                return VideoGenerationResult(
                    success=True,
                    task_id=task_id,
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
        """Get task status from Pollo.ai"""
        url = f"{self.base_url}/tasks/{task_id}"
        
        async with httpx.AsyncClient(verify=False) as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=30.0)
                
                if response.status_code not in [200, 201]:
                    return VideoGenerationResult(
                        success=False,
                        task_id=task_id,
                        status="failed",
                        error_message=f"Pollo.ai error {response.status_code}: {response.text}"
                    )
                    
                data = response.json()
                status_raw = data.get("status", "pending")
                
                # Map Pollo.ai status to standard status
                status = "pending"
                if status_raw == "completed":
                    status = "completed"
                elif status_raw in ["failed", "canceled"]:
                    status = "failed"
                elif status_raw == "processing":
                    status = "processing"
                    
                # Extract video URL if completed
                video_url = None
                if status == "completed":
                    video_url = data.get("video_url")
                    
                error_message = data.get("error") if status == "failed" else None
                
                return VideoGenerationResult(
                    success=True,
                    task_id=task_id,
                    status=status,
                    video_url=video_url,
                    provider_response=data,
                    error_message=error_message
                )
                
            except httpx.HTTPError as e:
                return VideoGenerationResult(
                    success=False,
                    task_id=task_id,
                    status="failed",
                    error_message=str(e)
                )

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel task (Not currently supported by Pollo API, return False)"""
        return False
