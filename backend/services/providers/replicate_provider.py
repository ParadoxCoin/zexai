"""Replicate Provider Implementation"""
import httpx
import asyncio
from typing import Dict, Any, List
from core.config import settings
from core.logger import app_logger as logger

class ReplicateProvider:
    def __init__(self):
        self.api_key = settings.REPLICATE_API_KEY
        self.base_url = "https://api.replicate.com/v1"
        
    async def generate_image(self, model_id: str, prompt: str, params: Dict[str, Any]) -> List[str]:
        """Generate image using Replicate"""
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "application/json"
        }
        
        model_versions = {
            "rep_flux_pro": "black-forest-labs/flux-1.1-pro",
            "rep_flux_dev": "black-forest-labs/flux-dev",
            "rep_sdxl": "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
            "rep_playground_v25": "playgroundai/playground-v2.5-1024px-aesthetic",
            "rep_anime_diffusion": "cjwbw/anything-v3.0"
        }
        
        model = model_versions.get(model_id, model_versions["rep_sdxl"])
        
        input_params = {
            "prompt": prompt,
            "num_outputs": params.get("num_images", 1),
            "width": 1024,
            "height": 1024
        }
        
        if params.get("negative_prompt"):
            input_params["negative_prompt"] = params["negative_prompt"]
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/predictions",
                headers=headers,
                json={"version": model.split(":")[-1] if ":" in model else None, "input": input_params}
            )
            
            if response.status_code != 201:
                raise Exception(f"Replicate error: {response.status_code} - {response.text}")
            
            prediction = response.json()
            prediction_id = prediction["id"]
            
            for _ in range(60):
                await asyncio.sleep(2)
                
                check_response = await client.get(
                    f"{self.base_url}/predictions/{prediction_id}",
                    headers=headers
                )
                
                result = check_response.json()
                status = result.get("status")
                
                if status == "succeeded":
                    output = result.get("output", [])
                    return output if isinstance(output, list) else [output]
                elif status in ["failed", "canceled"]:
                    raise Exception(f"Generation {status}: {result.get('error')}")
            
            raise Exception("Timeout waiting for generation")

replicate_provider = ReplicateProvider()
