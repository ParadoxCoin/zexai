"""
Kie.ai Video Model Configuration
Standardized configuration for all Kie.ai Market API video models

Based on Kie.ai Market API documentation:
- All models use: POST https://api.kie.ai/api/v1/jobs/createTask
- Status check: GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
- Response contains resultJson with resultUrls array

Model name format: {model}/{task-type}
Example: kling-2.6/text-to-video, sora-2-text-to-video
"""

# Kie.ai API Configuration
KIE_API_BASE = "https://api.kie.ai/api/v1"
KIE_CREATE_TASK = f"{KIE_API_BASE}/jobs/createTask"
KIE_GET_STATUS = f"{KIE_API_BASE}/jobs/recordInfo"

# Video Models Configuration
# Each model has: kie_model_name, default_params, supported_params
KIE_VIDEO_MODELS = {
    # ============ KLING MODELS ============
    "kie_kling26_hd_5s": {
        "name": "Kling 2.6 HD (5s)",
        "kie_model": "kling-2.6/text-to-video",
        "default_duration": "5",
        "supports_sound": True,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration", "sound"]
    },
    "kie_kling26_hd_10s": {
        "name": "Kling 2.6 HD (10s)",
        "kie_model": "kling-2.6/text-to-video",
        "default_duration": "10",
        "supports_sound": True,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration", "sound"]
    },
    "kie_kling26_pro_5s": {
        "name": "Kling 2.6 Pro (5s)",
        "kie_model": "kling-2.6-pro/text-to-video",
        "default_duration": "5",
        "supports_sound": True,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration", "sound"]
    },
    "kie_kling26_pro_10s": {
        "name": "Kling 2.6 Pro (10s)",
        "kie_model": "kling-2.6-pro/text-to-video",
        "default_duration": "10",
        "supports_sound": True,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration", "sound"]
    },
    "kie_kling21_master": {
        "name": "Kling 2.1 Master",
        "kie_model": "kling-2.1-master/text-to-video",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration"]
    },
    
    # ============ SORA MODELS ============
    "kie_sora2_text": {
        "name": "Sora 2 Text to Video",
        "kie_model": "sora-2-text-to-video",
        "default_duration": "10",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "n_frames", "size", "remove_watermark"],
        "aspect_ratio_map": {"16:9": "landscape", "9:16": "portrait", "1:1": "square"},
        "default_size": "high"
    },
    "kie_sora2_pro": {
        "name": "Sora 2 Pro",
        "kie_model": "sora-2-pro-text-to-video",
        "default_duration": "10",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "n_frames", "size", "remove_watermark"],
        "aspect_ratio_map": {"16:9": "landscape", "9:16": "portrait", "1:1": "square"},
        "default_size": "high"
    },
    
    # ============ WAN MODELS ============
    "kie_wan26_fast": {
        "name": "Wan 2.6 Fast",
        "kie_model": "wan/2-6-text-to-video",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "duration", "resolution"]
    },
    "kie_wan26_hd": {
        "name": "Wan 2.6 HD",
        "kie_model": "wan/2-6-text-to-video",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "duration", "resolution"]
    },
    "kie_wan22_turbo": {
        "name": "Wan 2.2 Turbo",
        "kie_model": "wan/2-2-a14b-text-to-video-turbo",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "duration", "resolution"]
    },
    
    # ============ HAILUO MODELS ============
    "kie_hailuo_pro": {
        "name": "Hailuo Pro",
        "kie_model": "hailuo/02-text-to-video-pro",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "prompt_optimizer"]
    },
    "kie_hailuo_standard": {
        "name": "Hailuo Standard",
        "kie_model": "hailuo/02-text-to-video-standard",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "prompt_optimizer"]
    },
    "kie_hailuo23_fast": {
        "name": "Hailuo 2.3 Fast",
        "kie_model": "hailuo/02-text-to-video-standard",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "prompt_optimizer"]
    },
    "kie_hailuo23_hd": {
        "name": "Hailuo 2.3 HD",
        "kie_model": "hailuo/02-text-to-video-pro",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "prompt_optimizer"]
    },
    
    # ============ SORA MODELS (matching database IDs) ============
    "kie_sora2_pro_10s": {
        "name": "Sora 2 Pro 10s",
        "kie_model": "sora-2-pro-text-to-video",
        "default_duration": "10",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "n_frames", "size", "remove_watermark"],
        "aspect_ratio_map": {"16:9": "landscape", "9:16": "portrait", "1:1": "square"},
        "default_size": "high"  # Required: high or low
    },
    "kie_sora2_pro_15s": {
        "name": "Sora 2 Pro 15s",
        "kie_model": "sora-2-pro-text-to-video",
        "default_duration": "15",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "n_frames", "size", "remove_watermark"],
        "aspect_ratio_map": {"16:9": "landscape", "9:16": "portrait", "1:1": "square"},
        "default_size": "high"  # Required: high or low
    },
    
    # ============ KLING AUDIO MODELS ============
    "kie_kling26_audio_5s": {
        "name": "Kling 2.6 Audio 5s",
        "kie_model": "kling-2.6/text-to-video",
        "default_duration": "5",
        "supports_sound": True,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration", "sound"]
    },
    "kie_kling26_audio_10s": {
        "name": "Kling 2.6 Audio 10s",
        "kie_model": "kling-2.6/text-to-video",
        "default_duration": "10",
        "supports_sound": True,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration", "sound"]
    },
    
    # ============ RUNWAY MODELS ============
    "kie_runway_aleph_5s": {
        "name": "Runway Aleph 5s",
        "kie_model": "runway/aleph-text-to-video",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration"]
    },
    "kie_runway_aleph_10s": {
        "name": "Runway Aleph 10s",
        "kie_model": "runway/aleph-text-to-video",
        "default_duration": "10",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration"]
    },
    
    # ============ IMAGE TO VIDEO MODELS ============
    "kie_kling26_i2v": {
        "name": "Kling 2.6 Image to Video",
        "kie_model": "kling-2.6/image-to-video",
        "default_duration": "5",
        "supports_sound": True,  # Kling I2V supports sound
        "supports_image_input": True,
        "params": ["prompt", "image_urls", "duration", "sound"]  # image_urls is array
    },
    "kie_runway_i2v": {
        "name": "Runway Image to Video",
        "kie_model": "runway/aleph-image-to-video",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": True,
        "params": ["prompt", "image_url", "duration", "aspect_ratio"]  # Runway uses image_url
    },
    
    # ============ VIDEO TO VIDEO MODELS ============
    "kie_kling26_v2v": {
        "name": "Kling 2.6 Video Transform",
        "kie_model": "kling-2.6/video-to-video",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "supports_video_input": True,
        "params": ["prompt", "video_url", "duration"]
    },
    "kie_runway_v2v": {
        "name": "Runway Video Transform",
        "kie_model": "runway/aleph-video-to-video",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "supports_video_input": True,
        "params": ["prompt", "video_url", "duration", "aspect_ratio"]
    },
    
    # ============ BYTEDANCE MODELS ============
    "kie_bytedance_pro": {
        "name": "Bytedance Pro",
        "kie_model": "bytedance/v1-pro-text-to-video",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration"]
    },
    "kie_bytedance_lite": {
        "name": "Bytedance Lite",
        "kie_model": "bytedance/v1-lite-text-to-video",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration"]
    },
    
    # ============ GROK IMAGINE VIDEO ============
    "kie_grok_video": {
        "name": "Grok Imagine Video",
        "kie_model": "grok-imagine/text-to-video",
        "default_duration": "5",
        "supports_sound": False,
        "supports_image_input": False,
        "params": ["prompt", "aspect_ratio", "duration"]
    },
}

# Veo models use different endpoint - model name is "veo3" (not "veo-3")
KIE_VEO_MODELS = {
    "kie_veo3": {
        "name": "Veo 3",
        "kie_model": "veo3",  # FIXED: was "veo-3"
        "endpoint": f"{KIE_API_BASE}/veo/generate",
        "params": ["prompt", "aspectRatio"]
    },
    "kie_veo31": {
        "name": "Veo 3.1",
        "kie_model": "veo3",  # FIXED: was "veo-3.1"
        "endpoint": f"{KIE_API_BASE}/veo/generate",
        "params": ["prompt", "aspectRatio"]
    },
    # Database IDs
    "kie_veo31_quality": {
        "name": "Veo 3.1 Quality",
        "kie_model": "veo3",  # FIXED: was "veo-3"
        "endpoint": f"{KIE_API_BASE}/veo/generate",
        "params": ["prompt", "aspectRatio"]
    },
    "kie_veo31_fast": {
        "name": "Veo 3.1 Fast",
        "kie_model": "veo3",  # FIXED: was "veo-3"
        "endpoint": f"{KIE_API_BASE}/veo/generate",
        "params": ["prompt", "aspectRatio"]
    },
}

# Runway uses separate API endpoint (NOT Market API)
KIE_RUNWAY_MODELS = {
    "kie_runway_aleph_5s": {
        "name": "Runway Aleph 5s",
        "endpoint": f"{KIE_API_BASE}/runway/generate",
        "default_duration": 5,
        "quality": "1080p",
        "params": ["prompt", "duration", "quality", "aspectRatio", "waterMark"]
    },
    "kie_runway_aleph_10s": {
        "name": "Runway Aleph 10s",
        "endpoint": f"{KIE_API_BASE}/runway/generate",
        "default_duration": 10,
        "quality": "1080p",
        "params": ["prompt", "duration", "quality", "aspectRatio", "waterMark"]
    },
    "kie_runway_i2v": {
        "name": "Runway Image to Video",
        "endpoint": f"{KIE_API_BASE}/runway/generate",
        "default_duration": 5,
        "quality": "1080p",
        "params": ["prompt", "duration", "quality", "aspectRatio", "imageUrl"]
    },
}


def build_kie_request(model_id: str, prompt: str, aspect_ratio: str = "16:9", 
                      duration: int = 5, sound: bool = False, image_url: str = None,
                      video_url: str = None) -> dict:
    """
    Build standardized request for Kie.ai API
    Returns: (url, request_data) tuple
    """
    # Check if it's a Veo model
    if model_id in KIE_VEO_MODELS:
        config = KIE_VEO_MODELS[model_id]
        data = {
            "model": config["kie_model"],
            "prompt": prompt,
            "aspectRatio": aspect_ratio
        }
        if image_url:
            data["imageUrls"] = [image_url]
        return {
            "url": config["endpoint"],
            "data": data
        }
    
    # Check if it's a Runway model (uses separate API)
    if model_id in KIE_RUNWAY_MODELS:
        config = KIE_RUNWAY_MODELS[model_id]
        data = {
            "prompt": prompt,
            "duration": duration or config["default_duration"],
            "quality": config.get("quality", "1080p"),
            "aspectRatio": aspect_ratio,
            "waterMark": ""  # No watermark
        }
        if image_url and "imageUrl" in config["params"]:
            data["imageUrl"] = image_url
        return {
            "url": config["endpoint"],
            "data": data
        }
    
    # Standard Market API models
    if model_id not in KIE_VIDEO_MODELS:
        # Default to Kling 2.6
        model_id = "kie_kling26_hd_5s"
    
    config = KIE_VIDEO_MODELS[model_id]
    
    # Build input object based on model's supported params
    input_data = {"prompt": prompt}
    
    if "aspect_ratio" in config["params"]:
        # Some models use different aspect ratio format
        if "aspect_ratio_map" in config:
            input_data["aspect_ratio"] = config["aspect_ratio_map"].get(aspect_ratio, "landscape")
        else:
            input_data["aspect_ratio"] = aspect_ratio
    
    if "duration" in config["params"]:
        input_data["duration"] = str(duration or config["default_duration"])
    
    if "n_frames" in config["params"]:
        input_data["n_frames"] = str(duration or 10)
    
    if "sound" in config["params"]:
        input_data["sound"] = sound
    
    if "resolution" in config["params"]:
        input_data["resolution"] = "1080p"
    
    if "remove_watermark" in config["params"]:
        input_data["remove_watermark"] = True
    
    # Sora requires 'size' parameter (high or low)
    if "size" in config["params"]:
        input_data["size"] = config.get("default_size", "high")
    
    if "prompt_optimizer" in config["params"]:
        input_data["prompt_optimizer"] = True
    
    # Handle image input for I2V models
    if image_url and config.get("supports_image_input"):
        if "image_urls" in config["params"]:
            # Kling format: array of image URLs
            input_data["image_urls"] = [image_url]
        elif "image_url" in config["params"]:
            # Runway format: single image URL string
            input_data["image_url"] = image_url
        else:
            # Legacy fallback
            input_data["imageUrl"] = image_url
    
    # Handle video input for V2V models
    if video_url and config.get("supports_video_input"):
        if "video_url" in config["params"]:
            input_data["video_url"] = video_url
        else:
            input_data["videoUrl"] = video_url
    
    return {
        "url": KIE_CREATE_TASK,
        "data": {
            "model": config["kie_model"],
            "input": input_data
        }
    }


def get_kie_model_info(model_id: str) -> dict:
    """Get model info for display"""
    if model_id in KIE_VIDEO_MODELS:
        return KIE_VIDEO_MODELS[model_id]
    elif model_id in KIE_VEO_MODELS:
        return KIE_VEO_MODELS[model_id]
    elif model_id in KIE_RUNWAY_MODELS:
        return KIE_RUNWAY_MODELS[model_id]
    return None


def get_all_kie_video_models() -> list:
    """Get list of all available Kie.ai video models"""
    models = []
    for model_id, config in KIE_VIDEO_MODELS.items():
        # Skip Runway entries in VIDEO_MODELS (handled separately)
        if "runway" in model_id:
            continue
        models.append({
            "id": model_id,
            "name": config["name"],
            "kie_model": config.get("kie_model", ""),
            "supports_sound": config.get("supports_sound", False)
        })
    for model_id, config in KIE_VEO_MODELS.items():
        models.append({
            "id": model_id,
            "name": config["name"],
            "kie_model": config["kie_model"],
            "supports_sound": False
        })
    for model_id, config in KIE_RUNWAY_MODELS.items():
        models.append({
            "id": model_id,
            "name": config["name"],
            "endpoint": config["endpoint"],
            "supports_sound": False
        })
    return models
