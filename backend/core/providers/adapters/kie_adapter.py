"""
Kie.ai Video Provider Adapter
Based on: https://docs.kie.ai/market/kling/text-to-video
          https://docs.kie.ai/veo3-api/quickstart

Two different endpoint patterns:
- Kling/Sora/etc: POST /api/v1/jobs/createTask with {model, input: {...}}
- Veo3: POST /api/v1/veo/generate with flat {prompt, model, aspectRatio}
"""
import httpx
from typing import Dict, Any, Optional, List
from .base_adapter import (
    BaseVideoAdapter,
    VideoGenerationParams,
    VideoGenerationResult,
    VideoGenerationType
)


class KieAIAdapter(BaseVideoAdapter):
    """Kie.ai video generation adapter - using official API docs"""
    
    PROVIDER_NAME = "kie"
    BASE_URL = "https://api.kie.ai/api/v1"
    
    # Model ID to Kie.ai {model_name, endpoint_type} mapping
    # endpoint_type: "jobs" for /jobs/createTask, "veo" for /veo/generate
    MODEL_CONFIG = {
        # Veo 3.1 models (use /veo/generate)
        "veo31_text": {"model": "veo3", "endpoint": "veo"},
        "veo31_image": {"model": "veo3", "endpoint": "veo"},
        "veo3_text": {"model": "veo3", "endpoint": "veo"},
        "veo3_fast_text": {"model": "veo3-fast", "endpoint": "veo"},
        "kie_veo31_quality": {"model": "veo3", "endpoint": "veo"},
        "kie_veo31_fast": {"model": "veo3-fast", "endpoint": "veo"},
        
        # Kling 2.6 models (use /jobs/createTask)
        "kie_kling26_hd_5s": {"model": "kling-2.6/text-to-video", "endpoint": "jobs"},
        "kie_kling26_hd_10s": {"model": "kling-2.6/text-to-video", "endpoint": "jobs"},
        "kie_kling26_pro_5s": {"model": "kling-2.6-pro/text-to-video", "endpoint": "jobs"},
        "kie_kling26_pro_10s": {"model": "kling-2.6-pro/text-to-video", "endpoint": "jobs"},
        "kie_kling26_audio_5s": {"model": "kling-2.6/text-to-video", "endpoint": "jobs"},
        "kie_kling26_audio_10s": {"model": "kling-2.6/text-to-video", "endpoint": "jobs"},
        
        # Kling 2.1 models
        "kling25_turbo_text": {"model": "kling-2.5-turbo/text-to-video", "endpoint": "jobs"},
        "kling21_master_text": {"model": "kling-2.1/text-to-video", "endpoint": "jobs"},
        
        # Sora 2 models
        "kie_sora2_pro_10s": {"model": "sora-2/text-to-video", "endpoint": "jobs"},
        "kie_sora2_pro_15s": {"model": "sora-2/text-to-video", "endpoint": "jobs"},
        
        # Runway models (use /jobs/createTask)
        "kie_runway_aleph_5s": {"model": "runway-aleph/text-to-video", "endpoint": "jobs"},
        "kie_runway_aleph_10s": {"model": "runway-aleph/text-to-video", "endpoint": "jobs"},
        "runway_gen3_text": {"model": "runway-gen3/text-to-video", "endpoint": "jobs"},
        "runway_aleph_text": {"model": "runway-aleph/text-to-video", "endpoint": "jobs"},
        
        # Wan 2.6 models
        "kie_wan26_fast": {"model": "wan-2.6/text-to-video", "endpoint": "jobs"},
        "kie_wan26_hd": {"model": "wan-2.6/text-to-video", "endpoint": "jobs"},
        "wan25_text": {"model": "wan-2.5/text-to-video", "endpoint": "jobs"},
        
        # Hailuo/Minimax models
        "kie_hailuo23_fast": {"model": "hailuo-2.3/text-to-video", "endpoint": "jobs"},
        "kie_hailuo23_hd": {"model": "hailuo-2.3/text-to-video", "endpoint": "jobs"},
        
        # Image to video
        "kie_kling26_i2v": {"model": "kling-2.6/image-to-video", "endpoint": "jobs"},
        "kie_runway_i2v": {"model": "runway/aleph-image-to-video", "endpoint": "jobs"},
        "kie_luma_ray_i2v": {"model": "luma/ray-image-to-video", "endpoint": "jobs"},
        "kie_hailuo_i2v": {"model": "hailuo/02-image-to-video", "endpoint": "jobs"},
        
        # Video to video
        "kie_kling26_v2v": {"model": "kling-2.6/video-to-video", "endpoint": "jobs"},
        "kie_runway_v2v": {"model": "runway/aleph-video-to-video", "endpoint": "jobs"},
    }
    
    # Aspect ratio mappings
    ASPECT_RATIOS = {
        "16:9": "16:9",
        "9:16": "9:16",
        "1:1": "1:1",
        "4:3": "4:3",
        "3:4": "3:4",
    }
    
    def __init__(self, api_key: str):
        # Ensure api_key is a proper string, not bytes
        if isinstance(api_key, bytes):
            api_key = api_key.decode('utf-8')
        api_key = str(api_key).strip() if api_key else ""
        super().__init__(api_key, self.BASE_URL)
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def _get_model_config(self, model_id: str) -> Dict[str, str]:
        """Get model config from our model ID"""
        config = self.MODEL_CONFIG.get(model_id)
        if not config:
            # Try to get it from core/kie_models.py dynamically!
            try:
                from core.kie_models import get_kie_model_by_id
                model_info = get_kie_model_by_id(model_id)
                if model_info and model_info.get("model_id"):
                    model_name = model_info.get("model_id")
                    # Veo models use endpoint 'veo', others use 'jobs'
                    endpoint = "veo" if "veo" in model_id.lower() else "jobs"
                    return {"model": model_name, "endpoint": endpoint}
            except Exception as e:
                print(f"[KieAdapter] Failed to load model dynamically: {e}")

            # Default fallback - try as kling
            if "kling" in model_id.lower():
                return {"model": "kling-2.6/text-to-video", "endpoint": "jobs"}
            elif "veo" in model_id.lower():
                return {"model": "veo3", "endpoint": "veo"}
            elif "wan" in model_id.lower():
                return {"model": "wan-2.6/text-to-video", "endpoint": "jobs"}
            raise ValueError(f"Model {model_id} not supported by Kie.ai adapter")
        return config
    
    def transform_params(self, params: VideoGenerationParams) -> Dict[str, Any]:
        """
        Transform standardized params to provider-specific format.
        (Implemented to satisfy abstract base class requirement)
        """
        config = self._get_model_config(params.model_id)
        model_name = config["model"]
        endpoint_type = config["endpoint"]
        
        if endpoint_type == "veo":
            request_data = {
                "prompt": params.prompt,
                "model": model_name,
                "aspectRatio": self.ASPECT_RATIOS.get(params.aspect_ratio, "16:9"),
            }
        else:
            request_data = {
                "model": model_name,
                "input": {
                    "prompt": params.prompt,
                    "aspect_ratio": self.ASPECT_RATIOS.get(params.aspect_ratio, "16:9"),
                    "duration": str(params.duration) if params.duration else "5",
                }
            }
            
            if "audio" in params.model_id:
                request_data["input"]["sound"] = True
            else:
                request_data["input"]["sound"] = False
            
            if params.image_url:
                if "kling" in params.model_id.lower() and "i2v" in params.model_id.lower():
                    request_data["input"]["image_urls"] = [params.image_url]
                elif "hailuo" in params.model_id.lower() and "i2v" in params.model_id.lower():
                    request_data["input"]["image_url"] = params.image_url
                elif "runway" in params.model_id.lower() and "i2v" in params.model_id.lower():
                    request_data["input"]["image_url"] = params.image_url
                elif "luma" in params.model_id.lower() and "i2v" in params.model_id.lower():
                    request_data["input"]["image_url"] = params.image_url
                else:
                    request_data["input"]["imageUrl"] = params.image_url
                    
            if getattr(params, 'video_url', None):
                if "kling" in params.model_id.lower() and "v2v" in params.model_id.lower():
                    request_data["input"]["video_url"] = params.video_url
                else:
                    request_data["input"]["video_url"] = params.video_url
                    
        return request_data
        
    async def generate_video(self, params: VideoGenerationParams) -> VideoGenerationResult:
        """Start video generation via Kie.ai"""
        config = self._get_model_config(params.model_id)
        endpoint_type = config["endpoint"]
        
        # Build request based on endpoint type
        if endpoint_type == "veo":
            url = f"{self.base_url}/veo/generate"
        else:
            url = f"{self.base_url}/jobs/createTask"
            
        request_data = self.transform_params(params)
        
        # Debug logging
        print(f"[KieAdapter] Full URL: {url}")
        print(f"[KieAdapter] Request data: {request_data}")
        print(f"[KieAdapter] Headers: Authorization: Bearer {self.api_key[:10]}...")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    json=request_data,
                    headers=self.headers,
                    timeout=60.0
                )
                print(f"[KieAdapter] Response status: {response.status_code}")
                print(f"[KieAdapter] Response body: {response.text[:500] if response.text else 'empty'}")
                
                data = response.json()
                
                # Check for API errors in response
                if data.get("code") != 200:
                    error_msg = data.get("msg", "Unknown API error")
                    return VideoGenerationResult(
                        success=False,
                        task_id="",
                        status="failed",
                        error_message=f"Kie.ai: {error_msg}"
                    )
                
                # Extract task ID from response
                task_id = (
                    data.get("data", {}).get("taskId") or 
                    data.get("taskId") or 
                    data.get("task_id") or 
                    data.get("id", "")
                )
                
                return VideoGenerationResult(
                    success=True,
                    task_id=task_id,
                    status="pending",
                    provider_response=data
                )
            except httpx.HTTPError as e:
                error_msg = str(e)
                try:
                    if hasattr(e, 'response') and e.response:
                        error_data = e.response.json()
                        error_msg = error_data.get("msg") or error_data.get("message") or str(e)
                        print(f"[KieAdapter] Error response: {error_data}")
                except:
                    pass
                return VideoGenerationResult(
                    success=False,
                    task_id="",
                    status="failed",
                    error_message=error_msg
                )
    
    async def get_task_status(self, task_id: str) -> VideoGenerationResult:
        """Get task status from Kie.ai"""
        # Use /jobs/getTaskResult for status check
        url = f"{self.base_url}/jobs/getTaskResult"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url, 
                    json={"taskId": task_id},
                    headers=self.headers, 
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                result_data = data.get("data", {})
                
                # Map Kie.ai status
                status = result_data.get("status", "pending")
                status_map = {
                    "pending": "pending",
                    "processing": "processing",
                    "running": "processing",
                    "completed": "completed",
                    "success": "completed",
                    "finished": "completed",
                    "failed": "failed",
                    "error": "failed"
                }
                mapped_status = status_map.get(status.lower(), status.lower())
                
                # Get video URL if completed
                video_url = None
                if mapped_status == "completed":
                    video_url = (
                        result_data.get("videoUrl") or 
                        result_data.get("video_url") or 
                        result_data.get("output", {}).get("videoUrl")
                    )
                
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
        """Cancel task in Kie.ai"""
        url = f"{self.base_url}/jobs/cancelTask"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url, 
                    json={"taskId": task_id},
                    headers=self.headers, 
                    timeout=10.0
                )
                return response.status_code == 200
            except httpx.HTTPError:
                return False
