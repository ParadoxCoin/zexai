"""
Video Models Configuration
Provider-specific video model catalogs
"""

# Fal.ai Video Models
FAL_VIDEO_MODELS = {
    "fal_luma_dream": {
        "name": "Luma Dream Machine",
        "type": "text_to_video",
        "model_id": "fal-ai/luma-dream-machine",
        "cost_usd": 0.50,
        "quality": 5,
        "speed": "medium",
        "description": "Luma AI's highly realistic video model",
        "badge": "Luma"
    },
    "fal_pika_2": {
        "name": "Pika 2.0",
        "type": "text_to_video",
        "model_id": "fal-ai/pika-2",
        "cost_usd": 0.35,
        "quality": 4,
        "speed": "fast",
        "description": "Pika 2.0 artistic video generation",
        "badge": "Pika"
    }
}

# Replicate Video Models
REPLICATE_VIDEO_MODELS = {
    "replicate_svd": {
        "name": "Stable Video Diffusion",
        "type": "image_to_video",
        "model_id": "stability-ai/svd",
        "cost_usd": 0.20,
        "quality": 4,
        "speed": "fast",
        "description": "Stability AI's SVD model",
        "badge": "SVD"
    }
}

# PiAPI Video Models
PIAPI_VIDEO_MODELS = {}

# GoAPI Video Models
GOAPI_VIDEO_MODELS = {}
