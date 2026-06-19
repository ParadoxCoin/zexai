"""
Image Generation Models - 40+ models from 3 providers
FAL.AI (fastest, cheapest), Replicate (variety), Pollo.ai (premium)
"""

# FAL.AI Models (15 models) - Fastest and most cost-effective
FAL_IMAGE_MODELS = {
    # Flux Models
    # Flux v1.1 Models
    "fal_flux_v1_1_pro": {
        "provider": "FAL.AI",
        "name": "Flux v1.1 Pro",
        "type": "text_to_image",
        "cost_usd": 0.05,
        "quality": 5,
        "speed": "fast",
        "badge": "💎 Yeni v1.1",
        "description": "En yeni ve en kaliteli Flux v1.1 Pro"
    },
    "fal_flux_pro": {
        "provider": "FAL.AI",
        "name": "Flux Pro",
        "type": "text_to_image",
        "cost_usd": 0.04,
        "quality": 5,
        "speed": "fast",
        "badge": "⚡ Hızlı",
        "description": "Güvenilir ve kaliteli Flux Pro"
    },
    "fal_flux_dev": {
        "provider": "FAL.AI",
        "name": "Flux Dev",
        "type": "text_to_image",
        "cost_usd": 0.02,
        "quality": 4,
        "speed": "fast",
        "badge": "💰 Ekonomik",
        "description": "Hızlı ve uygun fiyatlı"
    },
    "fal_flux_schnell": {
        "provider": "FAL.AI",
        "name": "Flux Schnell",
        "type": "text_to_image",
        "cost_usd": 0.01,
        "quality": 3,
        "speed": "very_fast",
        "badge": "⚡ Ultra Hızlı",
        "description": "Saniyeler içinde görsel"
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

# Premium Models (Pollo.ai Wrapper / Custom)
POLLO_IMAGE_MODELS = {
    # Flux v1.1 Series - Next-Gen Synthesis
    "pollo_flux_1_1_pro": {
        "provider": "Premium",
        "name": "FLUX V1.1 PRO [STABLE]",
        "type": "text_to_image",
        "cost_usd": 0.0875,
        "quality": 5,
        "speed": "fast",
        "badge": "💎 NEURAL ELITE",
        "description": "Ultra-fidelity neural synthesis engine for professional-grade imaging."
    },
    "pollo_flux_1_1_dev": {
        "provider": "Premium",
        "name": "FLUX V1.1 DEV [ALPHA]",
        "type": "text_to_image",
        "cost_usd": 0.035,
        "quality": 4,
        "speed": "fast",
        "badge": "🔬 DEV CORE",
        "description": "Balanced high-fidelity synthesis for iterative design workflows."
    },
    "pollo_flux_1_1_schnell": {
        "provider": "Premium",
        "name": "FLUX V1.1 SCHNELL [TURBO]",
        "type": "text_to_image",
        "cost_usd": 0.0175,
        "quality": 3,
        "speed": "very_fast",
        "badge": "⚡ TURBO CORE",
        "description": "Real-time rapid synthesis for immediate visual prototyping."
    },
    
    # Premium Specialized - Industry Giants
    "pollo_midjourney_v6": {
        "provider": "Pollo.ai",
        "name": "MIDJOURNEY V6 CINEMA",
        "type": "text_to_image",
        "cost_usd": 0.15,
        "quality": 5,
        "speed": "medium",
        "badge": "🏆 ARTISTIC GOLD",
        "description": "The global benchmark for artistic and cinematic visual excellence."
    },
    "pollo_dalle3": {
        "provider": "OpenAI",
        "name": "DALL-E 3 NEURAL SYSTEM",
        "type": "text_to_image",
        "cost_usd": 0.10,
        "quality": 5,
        "speed": "medium",
        "badge": "🤖 LOGIC CORE",
        "description": "Sophisticated semantic understanding and complex prompt execution."
    },
    "pollo_ideogram_v2_1": {
        "provider": "Premium",
        "name": "IDEOGRAM V2.1 TYPOGRAPHY",
        "type": "text_to_image",
        "cost_usd": 0.0725,
        "quality": 5,
        "speed": "medium",
        "badge": "📝 TEXT MASTER",
        "description": "State-of-the-art typographic rendering and graphic design synthesis."
    },
    "pollo_recraft_v3": {
        "provider": "Premium",
        "name": "RECRAFT V3 VECTOR",
        "type": "text_to_image",
        "cost_usd": 0.075,
        "quality": 5,
        "speed": "fast",
        "badge": "🎨 DESIGN PRO",
        "description": "Industrial-grade vector synthesis and professional illustration logic."
    }
}

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

