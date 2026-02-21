"""
Image Generation Models - 40+ models from 3 providers
FAL.AI (fastest, cheapest), Replicate (variety), Pollo.ai (premium)
"""

# FAL.AI Models (15 models) - Fastest and most cost-effective
FAL_IMAGE_MODELS = {
    # Flux Models
    "fal_flux_pro": {
        "provider": "FAL.AI",
        "name": "Flux Pro",
        "type": "text_to_image",
        "cost_usd": 0.05,
        "quality": 5,
        "speed": "fast",
        "badge": "⚡ En Hızlı!",
        "description": "En hızlı ve kaliteli model"
    },
    "fal_flux_dev": {
        "provider": "FAL.AI",
        "name": "Flux Dev",
        "type": "text_to_image",
        "cost_usd": 0.025,
        "quality": 4,
        "speed": "fast",
        "badge": "💰 En Ekonomik!",
        "description": "Hızlı ve uygun fiyatlı"
    },
    "fal_flux_schnell": {
        "provider": "FAL.AI",
        "name": "Flux Schnell",
        "type": "text_to_image",
        "cost_usd": 0.01,
        "quality": 3,
        "speed": "very_fast",
        "badge": "⚡ Süper Hızlı!",
        "description": "2 saniyede görsel"
    },
    
    # SDXL Models
    "fal_sdxl": {
        "provider": "FAL.AI",
        "name": "SDXL",
        "type": "text_to_image",
        "cost_usd": 0.003,
        "quality": 4,
        "speed": "fast",
        "badge": "💰 Süper Ucuz!",
        "description": "En uygun fiyatlı kaliteli model"
    },
    "fal_sdxl_lightning": {
        "provider": "FAL.AI",
        "name": "SDXL Lightning",
        "type": "text_to_image",
        "cost_usd": 0.002,
        "quality": 3,
        "speed": "very_fast",
        "badge": None,
        "description": "Hızlı SDXL versiyonu"
    },
    
    # Image to Image
    "fal_flux_pro_img2img": {
        "provider": "FAL.AI",
        "name": "Flux Pro (Image to Image)",
        "type": "image_to_image",
        "cost_usd": 0.055,
        "quality": 5,
        "speed": "fast",
        "badge": None,
        "description": "Görsel düzenleme"
    },
    "fal_sdxl_img2img": {
        "provider": "FAL.AI",
        "name": "SDXL (Image to Image)",
        "type": "image_to_image",
        "cost_usd": 0.004,
        "quality": 4,
        "speed": "fast",
        "badge": "💰 Ekonomik!",
        "description": "Uygun fiyatlı düzenleme"
    },
    
    # ControlNet
    "fal_flux_controlnet": {
        "provider": "FAL.AI",
        "name": "Flux ControlNet",
        "type": "controlnet",
        "cost_usd": 0.06,
        "quality": 5,
        "speed": "medium",
        "badge": None,
        "description": "Hassas kontrol"
    },
    "fal_sdxl_controlnet_canny": {
        "provider": "FAL.AI",
        "name": "SDXL ControlNet (Canny)",
        "type": "controlnet",
        "cost_usd": 0.005,
        "quality": 4,
        "speed": "fast",
        "badge": None,
        "description": "Kenar tespiti ile kontrol"
    },
    
    # Specialized
    "fal_face_to_sticker": {
        "provider": "FAL.AI",
        "name": "Face to Sticker",
        "type": "specialized",
        "cost_usd": 0.02,
        "quality": 4,
        "speed": "fast",
        "badge": None,
        "description": "Yüzden sticker oluştur"
    },
    "fal_recraft_v3": {
        "provider": "FAL.AI",
        "name": "Recraft V3",
        "type": "text_to_image",
        "cost_usd": 0.04,
        "quality": 4,
        "speed": "fast",
        "badge": None,
        "description": "Tasarım odaklı"
    }
}

# Replicate Models (15 models) - Variety and flexibility
REPLICATE_IMAGE_MODELS = {
    # Flux Models
    "rep_flux_pro": {
        "provider": "Replicate",
        "name": "Flux Pro",
        "type": "text_to_image",
        "cost_usd": 0.055,
        "quality": 5,
        "speed": "medium",
        "badge": None,
        "description": "Yüksek kalite"
    },
    "rep_flux_dev": {
        "provider": "Replicate",
        "name": "Flux Dev",
        "type": "text_to_image",
        "cost_usd": 0.03,
        "quality": 4,
        "speed": "medium",
        "badge": None,
        "description": "Dengeli performans"
    },
    
    # SDXL Variants
    "rep_sdxl": {
        "provider": "Replicate",
        "name": "SDXL",
        "type": "text_to_image",
        "cost_usd": 0.02,
        "quality": 4,
        "speed": "medium",
        "badge": None,
        "description": "Stabil ve güvenilir"
    },
    "rep_playground_v25": {
        "provider": "Replicate",
        "name": "Playground v2.5",
        "type": "text_to_image",
        "cost_usd": 0.025,
        "quality": 4,
        "speed": "medium",
        "badge": None,
        "description": "Yaratıcı ve renkli"
    },
    "rep_proteus": {
        "provider": "Replicate",
        "name": "Proteus",
        "type": "text_to_image",
        "cost_usd": 0.022,
        "quality": 4,
        "speed": "medium",
        "badge": None,
        "description": "Çok yönlü"
    },
    
    # Anime/Illustration
    "rep_anime_diffusion": {
        "provider": "Replicate",
        "name": "Anime Diffusion",
        "type": "text_to_image",
        "cost_usd": 0.015,
        "quality": 4,
        "speed": "fast",
        "badge": "🎌 Anime!",
        "description": "Anime tarzı görseller"
    },
    "rep_dreamshaper": {
        "provider": "Replicate",
        "name": "DreamShaper",
        "type": "text_to_image",
        "cost_usd": 0.018,
        "quality": 4,
        "speed": "fast",
        "badge": None,
        "description": "İllüstrasyon ve sanat"
    },
    
    # Realistic
    "rep_realistic_vision": {
        "provider": "Replicate",
        "name": "Realistic Vision",
        "type": "text_to_image",
        "cost_usd": 0.02,
        "quality": 4,
        "speed": "medium",
        "badge": "📸 Gerçekçi!",
        "description": "Fotogerçekçi görseller"
    },
    
    # Image to Image
    "rep_sdxl_img2img": {
        "provider": "Replicate",
        "name": "SDXL (Image to Image)",
        "type": "image_to_image",
        "cost_usd": 0.022,
        "quality": 4,
        "speed": "medium",
        "badge": None,
        "description": "Görsel düzenleme"
    },
    "rep_controlnet": {
        "provider": "Replicate",
        "name": "ControlNet",
        "type": "controlnet",
        "cost_usd": 0.025,
        "quality": 4,
        "speed": "medium",
        "badge": None,
        "description": "Hassas kontrol"
    }
}

# NOTE: Pollo.ai does NOT have image generation API
# Pollo.ai is VIDEO-ONLY provider
# These models are placeholders and should be removed or replaced
POLLO_IMAGE_MODELS = {}

# Image Tools (10 tools)
IMAGE_TOOLS = {
    # Enhancement
    "upscaler": {
        "name": "Image Upscaler",
        "provider": "FAL.AI",
        "cost_usd": 0.01,
        "description": "4x büyütme",
        "icon": "🔍"
    },
    "enhancer": {
        "name": "Image Enhancer",
        "provider": "FAL.AI",
        "cost_usd": 0.008,
        "description": "Kalite iyileştirme",
        "icon": "✨"
    },
    "restoration": {
        "name": "Photo Restoration",
        "provider": "Replicate",
        "cost_usd": 0.015,
        "description": "Eski fotoğraf onarma",
        "icon": "🖼️"
    },
    
    # Background
    "bg_remover": {
        "name": "Background Remover",
        "provider": "FAL.AI",
        "cost_usd": 0.005,
        "description": "Arka plan silme",
        "icon": "✂️"
    },
    "object_remover": {
        "name": "Object Remover",
        "provider": "Replicate",
        "cost_usd": 0.012,
        "description": "Nesne silme",
        "icon": "🗑️"
    },
    "uncrop": {
        "name": "Uncrop (Outpainting)",
        "provider": "FAL.AI",
        "cost_usd": 0.02,
        "description": "Görsel genişletme",
        "icon": "🖼️"
    },
    
    # Creative
    "face_swap": {
        "name": "Face Swap",
        "provider": "Replicate",
        "cost_usd": 0.018,
        "description": "Yüz değiştirme",
        "icon": "🔄"
    },
    "clothes_changer": {
        "name": "AI Clothes Changer",
        "provider": "Replicate",
        "cost_usd": 0.02,
        "description": "Kıyafet değiştirme",
        "icon": "👔"
    },
    "cartoon_maker": {
        "name": "Cartoon Maker",
        "provider": "FAL.AI",
        "cost_usd": 0.01,
        "description": "Çizgi film efekti",
        "icon": "🎨"
    },
    "tattoo_generator": {
        "name": "AI Tattoo Generator",
        "provider": "Replicate",
        "cost_usd": 0.015,
        "description": "Dövme ekleme",
        "icon": "🎭"
    }
}

# Specialized Generators (6 generators)
SPECIALIZED_GENERATORS = {
    "logo_generator": {
        "name": "AI Logo Generator",
        "provider": "FAL.AI",
        "cost_usd": 0.03,
        "description": "Profesyonel logo tasarımı",
        "icon": "🎯",
        "template": "professional logo design, {prompt}, minimalist, vector art, clean, modern"
    },
    "banner_generator": {
        "name": "AI Banner Generator",
        "provider": "FAL.AI",
        "cost_usd": 0.025,
        "description": "Web banner tasarımı",
        "icon": "🖼️",
        "template": "web banner design, {prompt}, modern, professional, high quality"
    },
    "poster_generator": {
        "name": "Movie Poster Generator",
        "provider": "Replicate",
        "cost_usd": 0.04,
        "description": "Film afişi tasarımı",
        "icon": "🎬",
        "template": "movie poster, {prompt}, cinematic, dramatic lighting, professional"
    },
    "emoji_generator": {
        "name": "AI Emoji Generator",
        "provider": "FAL.AI",
        "cost_usd": 0.01,
        "description": "Özel emoji tasarımı",
        "icon": "😊",
        "template": "emoji style, {prompt}, simple, cute, colorful, flat design"
    },
    "sticker_generator": {
        "name": "Sticker Design Generator",
        "provider": "FAL.AI",
        "cost_usd": 0.012,
        "description": "Sticker tasarımı",
        "icon": "🎨",
        "template": "sticker design, {prompt}, cute, colorful, white border, die-cut style"
    },
    "wordart_generator": {
        "name": "Word Art Generator",
        "provider": "FAL.AI",
        "cost_usd": 0.015,
        "description": "Tipografik sanat",
        "icon": "📝",
        "template": "typography art, {prompt}, creative lettering, artistic, colorful"
    }
}

# All models combined
ALL_IMAGE_MODELS = {
    **FAL_IMAGE_MODELS,
    **REPLICATE_IMAGE_MODELS,
    **POLLO_IMAGE_MODELS
}

