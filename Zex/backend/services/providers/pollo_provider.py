"""Pollo.ai Provider Implementation"""
import httpx
import asyncio
from typing import Dict, Any, List
from core.config import settings
from core.logger import app_logger as logger

class PolloProvider:
    def __init__(self):
        self.api_key = settings.POLLO_API_KEY
        self.base_url = "https://api.pollo.ai/v1"
        
    async def generate_image(self, model_id: str, prompt: str, params: Dict[str, Any]) -> List[str]:
        """Generate image using Pollo.ai"""
        headers = {
            "Authorization": f"Bearer {str(self.api_key)}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model_id.replace("pollo_", ""),
            "prompt": prompt,
            "num_images": params.get("num_images", 1)
        }
        
        if params.get("negative_prompt"):
            payload["negative_prompt"] = params["negative_prompt"]
        
        async with httpx.AsyncClient(timeout=120.0, verify=False) as client:
            response = await client.post(
                f"{self.base_url}/images/generations",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"Pollo.ai error: {response.status_code} - {response.text}")
            
            result = response.json()
            task_id = result.get("task_id")
            
            if not task_id:
                return result.get("data", [])
            
            for _ in range(60):
                await asyncio.sleep(3)
                
                check_response = await client.get(
                    f"{self.base_url}/tasks/{task_id}",
                    headers=headers
                )
                
                task_result = check_response.json()
                status = task_result.get("status")
                
                if status == "completed":
                    return task_result.get("output_urls", [])
                elif status == "failed":
                    raise Exception(f"Generation failed: {task_result.get('error')}")
            
            raise Exception("Timeout waiting for generation")

pollo_provider = PolloProvider()
