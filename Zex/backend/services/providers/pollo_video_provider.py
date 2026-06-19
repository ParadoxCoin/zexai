"""Pollo.ai Video Provider Implementation"""
import httpx
import asyncio
from typing import Dict, Any, Optional
from core.config import settings
from core.logger import app_logger as logger

class PolloVideoProvider:
    def __init__(self):
        self.api_key = settings.POLLO_API_KEY
        self.base_url = "https://api.pollo.ai/v1"
        
    async def generate_video(self, model_id: str, prompt: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate video using Pollo.ai"""
        headers = {
            "Authorization": f"Bearer {str(self.api_key)}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model_id,
            "prompt": prompt
        }
        
        if params.get("image_url"):
            payload["image_url"] = params["image_url"]
            payload["type"] = "image_to_video"
        else:
            payload["type"] = "text_to_video"
        
        if params.get("duration"):
            payload["duration"] = params["duration"]
        
        async with httpx.AsyncClient(timeout=120.0, verify=False) as client:
            response = await client.post(
                f"{self.base_url}/video/generate",
                headers=headers,
                json=payload
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Pollo.ai error: {response.status_code} - {response.text}")
            
            result = response.json()
            task_id = result.get("task_id")
            
            if not task_id:
                raise Exception("No task_id returned from Pollo.ai")
            
            # Poll for completion
            for _ in range(120):  # 10 minutes max
                await asyncio.sleep(5)
                
                check_response = await client.get(
                    f"{self.base_url}/tasks/{task_id}",
                    headers=headers
                )
                
                task_result = check_response.json()
                status = task_result.get("status")
                
                if status == "completed":
                    return {
                        "video_url": task_result.get("video_url"),
                        "thumbnail_url": task_result.get("thumbnail_url"),
                        "duration": task_result.get("duration"),
                        "task_id": task_id
                    }
                elif status == "failed":
                    raise Exception(f"Generation failed: {task_result.get('error')}")
            
            raise Exception("Timeout waiting for video generation")
    
    async def apply_effect(self, effect_id: str, image_url: str, image_url_2: Optional[str] = None) -> Dict[str, Any]:
        """Apply video effect"""
        headers = {
            "Authorization": f"Bearer {str(self.api_key)}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "effect": effect_id,
            "image_url": image_url
        }
        
        if image_url_2:
            payload["image_url_2"] = image_url_2
        
        async with httpx.AsyncClient(timeout=120.0, verify=False) as client:
            response = await client.post(
                f"{self.base_url}/effects/apply",
                headers=headers,
                json=payload
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Pollo.ai error: {response.status_code} - {response.text}")
            
            result = response.json()
            task_id = result.get("task_id")
            
            # Poll for completion
            for _ in range(60):  # 5 minutes max for effects
                await asyncio.sleep(5)
                
                check_response = await client.get(
                    f"{self.base_url}/tasks/{task_id}",
                    headers=headers
                )
                
                task_result = check_response.json()
                status = task_result.get("status")
                
                if status == "completed":
                    return {
                        "video_url": task_result.get("video_url"),
                        "thumbnail_url": task_result.get("thumbnail_url"),
                        "task_id": task_id
                    }
                elif status == "failed":
                    raise Exception(f"Effect failed: {task_result.get('error')}")
            
            raise Exception("Timeout waiting for effect")

pollo_video_provider = PolloVideoProvider()
