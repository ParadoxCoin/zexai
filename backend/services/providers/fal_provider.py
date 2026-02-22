"""FAL.AI Provider Implementation"""
import httpx
from typing import Dict, Any, List
from core.config import settings
from core.logger import app_logger as logger

class FALProvider:
    def __init__(self):
        self.api_key = settings.FAL_API_KEY
        self.base_url = "https://fal.run/fal-ai"
        
    async def generate_image(self, model_id: str, prompt: str, params: Dict[str, Any]) -> List[str]:
        """Generate image using FAL.AI"""
        headers = {
            "Authorization": f"Key {str(self.api_key)}",
            "Content-Type": "application/json"
        }
        
        model_map = {
            "fal_flux_pro": "flux-pro",
            "fal_flux_dev": "flux/dev",
            "fal_flux_schnell": "flux/schnell",
            "fal_sdxl": "fast-sdxl",
            "fal_sdxl_lightning": "fast-lightning-sdxl"
        }
        
        endpoint = model_map.get(model_id, "flux-pro")
        
        payload = {
            "prompt": prompt,
            "image_size": self._map_aspect_ratio(params.get("aspect_ratio", "1:1")),
            "num_inference_steps": params.get("num_inference_steps", 28),
            "num_images": params.get("num_images", 1),
            "enable_safety_checker": False
        }
        
        if params.get("negative_prompt"):
            payload["negative_prompt"] = params["negative_prompt"]
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/{endpoint}",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"FAL.AI error: {response.status_code} - {response.text}")
            
            result = response.json()
            images = result.get("images", [])
            return [img.get("url") for img in images if img.get("url")]
    
    def _map_aspect_ratio(self, ratio: str) -> str:
        mapping = {
            "1:1": "square_hd",
            "16:9": "landscape_16_9",
            "9:16": "portrait_16_9",
            "4:3": "landscape_4_3",
            "3:4": "portrait_4_3"
        }
        return mapping.get(ratio, "square_hd")

fal_provider = FALProvider()
