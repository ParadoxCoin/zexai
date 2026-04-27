"""
Kie.ai Model Catalog - Premium AI Models at Affordable Prices
Provider: kie.ai - Unified API for top AI models
Credit System: 1 Kie credit = $0.005

API Types:
- market: POST /api/v1/jobs/createTask → GET /api/v1/jobs/recordInfo
- flux_kontext: POST /api/v1/flux/kontext/generate → GET /api/v1/flux/kontext/record-info
- gpt4o_image: POST /api/v1/gpt4o-image/generate → GET /api/v1/gpt4o-image/record-info

Includes:
- Image: FLUX 2 Pro/Flex, Flux Kontext, Ideogram V3, Nano Banana, GPT-4o, Imagen 4, Recraft, Z-Image, Seedream, Grok Imagine, Qwen, Topaz
- Video: Veo 3.1, Sora 2, Kling 2.6, Runway Aleph, Wan 2.6, Hailuo 2.3
- Music: Suno API (V3.5-V4.5+)
"""

# ============================================
# IMAGE GENERATION MODELS
# ============================================

KIE_IMAGE_MODELS = {
    # ── FLUX-2 (Market API) ──────────────────────
    # CURRENTLY DISABLED: API rejects all resolutions. Use Flux Kontext instead.
    # "kie_flux2_pro": {
    #     "provider": "kie.ai",
    #     "api_type": "market",
    #     "name": "FLUX 2 Pro",
    #     "type": "text_to_image",
    #     "model_id": "flux-2/pro-text-to-image",
    #     "kie_credits": 5,
    #     "cost_usd": 0.025,
    #     "quality": 5,
    #     "speed": "fast",
    #     "resolution": "1024x1024",
    #     "badge": "🏆 En Kaliteli!",
    #     "description": "Fotorealistik, yüksek detay, metin render",
    #     "capabilities": {
    #         "multi_reference": True,
    #         "text_rendering": True,
    #         "max_references": 8
    #     }
    # },
    
    # ── FLUX.1 Schnell (Market API) ──────────────
    # DISABLED: User request - remove Flux 1
    # "kie_flux1_schnell": {
    #     "provider": "kie.ai",
    #     "api_type": "market",
    #     "name": "Flux.1 Schnell",
    #     "type": "text_to_image",
    #     "model_id": "black-forest-labs/flux-1-schnell",
    #     "kie_credits": 4,
    #     "cost_usd": 0.02,
    #     "quality": 5,
    #     "speed": "very_fast",
    #     "badge": "⚡ Çok Hızlı",
    #     "description": "Flux 1 Schnell - Ultra hızlı görsel üretim",
    #     "capabilities": {
    #         "image_editing": True,
    #         "text_rendering": True
    #     }
    # },

    # ── GPT-Image-1.5 (Market API) ───────────────
    # DISABLED: User request - remove GPT 1.5
    # "kie_gpt_image_1_5": {
    #     "provider": "kie.ai",
    #     "api_type": "market",
    #     "name": "GPT-Image-1.5",
    #     "type": "text_to_image",
    #     "model_id": "openai/gpt-image-1.5",
    #     "kie_credits": 8,
    #     "cost_usd": 0.04,
    #     "quality": 5,
    #     "speed": "fast",
    #     "badge": "🤖 OpenAI",
    #     "description": "OpenAI GPT-Image-1.5",
    #     "capabilities": {
    #         "image_editing": True,
    #         "text_rendering": True
    #     }
    # },
    # "kie_flux2_flex": {
    #     "provider": "kie.ai",
    #     "api_type": "market",
    #     "name": "FLUX 2 Flex",
    #     "type": "text_to_image",
    #     "model_id": "flux-2/flex-text-to-image",
    #     "kie_credits": 14,
    #     "cost_usd": 0.07,
    #     "quality": 5,
    #     "speed": "medium",
    #     "resolution": "1024x1024",
    #     "badge": None,
    #     "description": "Esnek stil kontrolü ile görsel üretim",
    #     "capabilities": {}
    # },

    # ── Flux Kontext (Dedicated API) ─────────────
    "kie_flux_kontext_pro": {
        "provider": "kie.ai",
        "api_type": "flux_kontext",
        "name": "Flux Kontext Pro",
        "type": "text_to_image",
        "model_id": "flux-kontext-pro",
        "kie_credits": 8,
        "cost_usd": 0.04,
        "quality": 5,
        "speed": "fast",
        "badge": "✏️ AI Düzenleme",
        "description": "Metin ve görsel düzenleme, hızlı",
        "capabilities": {
            "character_consistency": True
        }
    },
    "kie_flux_kontext_max": {
        "provider": "kie.ai",
        "api_type": "flux_kontext",
        "name": "Flux Kontext Max",
        "type": "text_to_image",
        "model_id": "flux-kontext-max",
        "kie_credits": 16,
        "cost_usd": 0.08,
        "quality": 5,
        "speed": "medium",
        "badge": "🖼️ Maksimum Kalite",
        "description": "Maksimum kalite görsel düzenleme",
        "capabilities": {
            "character_consistency": True
        }
    },

    # ── Ideogram V3 (Market API) ─────────────────
    "kie_ideogram_v3": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Ideogram V3",
        "type": "text_to_image",
        "model_id": "ideogram/v3-text-to-image",
        "kie_credits": 7,
        "cost_usd": 0.035,
        "quality": 5,
        "speed": "medium",
        "badge": "📝 Metin Uzmanı",
        "description": "Metin render, logo tasarımı, yüksek kalite",
        "capabilities": {
            "text_rendering": True,
            "logo_design": True,
            "rendering_speed_options": ["TURBO", "BALANCED", "QUALITY"]
        }
    },

    # ── Google Nano Banana (Market API) ──────────
    "kie_nano_banana": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Nano Banana",
        "type": "text_to_image",
        "model_id": "google/nano-banana",
        "kie_credits": 10,
        "cost_usd": 0.05,
        "quality": 5,
        "speed": "fast",
        "badge": "🍌 Gemini Flash",
        "description": "Google Gemini 2.5 Flash ile hızlı görsel üretim",
        "capabilities": {
            "text_rendering": True
        }
    },
    # "kie_nano_banana_pro": {
    #     "provider": "kie.ai",
    #     "api_type": "market",
    #     "name": "Nano Banana Pro",
    #     "type": "text_to_image",
    #     "model_id": "google/nano-banana-pro", # Updated guess
    #     "kie_credits": 18,
    #     "cost_usd": 0.09,
    #     "quality": 5,
    #     "speed": "medium",
    #     "capabilities": {
    #         "text_rendering": True,
    #         "character_consistency": True,
    #         "upscale_4k": True,
    #         "image_editing": True
    #     }
    # },
    "kie_nano_banana_edit": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Nano Banana Edit",
        "type": "image_to_image",
        "model_id": "google/nano-banana-edit",
        "kie_credits": 12,
        "cost_usd": 0.06,
        "quality": 5,
        "speed": "medium",
        "badge": "✏️ Google Edit",
        "description": "Google AI ile görsel düzenleme",
        "capabilities": {
            "image_editing": True,
            "text_rendering": True
        }
    },

    # ── GPT-4o Image (Dedicated API) ─────────────
    "kie_gpt4o_image": {
        "provider": "kie.ai",
        "api_type": "gpt4o_image",
        "name": "GPT-4o Image",
        "type": "text_to_image",
        "model_id": "gpt-4o-image",
        "kie_credits": 20,
        "cost_usd": 0.10,
        "quality": 5,
        "speed": "medium",
        "badge": "🤖 OpenAI",
        "description": "OpenAI'ın en yeni görsel modeli",
        "capabilities": {
            "text_rendering": True,
            "multi_modal": True
        }
    },

    # ── Google Imagen 4 (Market API) ─────────────
    "kie_imagen4": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Google Imagen 4",
        "type": "text_to_image",
        "model_id": "google/imagen4",
        "kie_credits": 12,
        "cost_usd": 0.06,
        "quality": 5,
        "speed": "medium",
        "badge": "🎨 Google Imagen",
        "description": "Google Imagen 4 görsel üretim",
        "capabilities": {
            "negative_prompt": True
        }
    },

    # ── Recraft (Market API) ─────────────────────
    "kie_recraft_remove_bg": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Recraft Remove BG",
        "type": "background_remover",
        "model_id": "recraft/remove-background",
        "kie_credits": 6,
        "cost_usd": 0.03,
        "quality": 5,
        "speed": "fast",
        "badge": "✂️ Arka Plan Sil",
        "description": "Profesyonel arka plan temizleme",
        "capabilities": {
            "remove_background": True
        }
    },
    "kie_recraft": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Recraft Upscale",
        "type": "upscaler",
        "model_id": "recraft/crisp-upscale",
        "kie_credits": 6,
        "cost_usd": 0.03,
        "quality": 4,
        "speed": "fast",
        "badge": "🎨 Recraft",
        "description": "AI görsel büyütme ve iyileştirme",
        "capabilities": {
            "upscale": True,
            "enhancement": True
        }
    },

    # ── Z-Image (Market API) ─────────────────────
    "kie_zimage": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Z-Image",
        "type": "text_to_image",
        "model_id": "z-image",
        "kie_credits": 0.8,
        "cost_usd": 0.004,
        "quality": 4,
        "speed": "fast",
        "badge": "💰 Süper Ucuz!",
        "description": "Ekonomik fotorealistik, çift dil metin",
        "capabilities": {
            "bilingual_text": True,
            "photorealistic": True
        }
    },

    # ── Seedream 3.0 (Market API) ────────────────
    "kie_seedream": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Seedream 3.0",
        "type": "text_to_image",
        "model_id": "bytedance/seedream",
        "kie_credits": 5,
        "cost_usd": 0.025,
        "quality": 4,
        "speed": "fast",
        "badge": None,
        "description": "ByteDance Seedream yaratıcı görseller",
        "capabilities": {}
    },

    # ── Grok Imagine (Market API) ────────────────
    "kie_grok_imagine": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Grok Imagine",
        "type": "text_to_image",
        "model_id": "grok-imagine/text-to-image",
        "kie_credits": 10,
        "cost_usd": 0.05,
        "quality": 4,
        "speed": "medium",
        "badge": "𝕏 xAI",
        "description": "xAI Grok görsel üretimi",
        "capabilities": {}
    },

    # ── Qwen (Market API) ────────────────────────
    # "kie_qwen": {
    #     "provider": "kie.ai",
    #     "api_type": "market",
    #     "name": "Qwen",
    #     "type": "text_to_image",
    #     "model_id": "qwen/text-to-image",
    #     "kie_credits": 5,
    #     "cost_usd": 0.025,
    #     "quality": 4,
    #     "speed": "fast",
    #     "badge": None,
    #     "description": "Alibaba Qwen görsel üretim",
    #     "capabilities": {
    #         "negative_prompt": True,
    #         "image_editing": True
    #     }
    # },
    
    # "kie_qwen_image_edit": { ... DISABLED: Invalid ID ... },
    # "kie_ideogram_character": { ... DISABLED: Invalid ID ... },
    # "kie_midjourney_v6": { ... DISABLED: Invalid ID ... },

    # ── Topaz Upscale (Market API) ───────────────
    "kie_topaz_upscale": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Topaz Upscale",
        "type": "upscaler",
        "model_id": "topaz/image-upscale",
        "kie_credits": 4,
        "cost_usd": 0.02,
        "quality": 5,
        "speed": "medium",
        "badge": "🔍 Büyütme",
        "description": "Profesyonel görsel büyütme",
        "capabilities": {
            "upscale_4x": True,
            "enhancement": True
        }
    },
}

# ============================================
# VIDEO GENERATION MODELS
# ============================================

KIE_VIDEO_MODELS = {
    # ============================================
    # Google Veo 3.1 - Official Pricing Sync
    # ============================================
    "kie_veo31_quality": {
        "provider": "kie.ai",
        "name": "Veo 3.1 (Quality)",
        "type": "text_to_video",
        "model_id": "veo-3.1-quality",
        "kie_credits": 255,
        "cost_usd": 1.275,
        "duration": 8,
        "resolution": "1080p",
        "quality": 5,
        "speed": "slow",
        "badge": "🏆 Sinematik Şaheser",
        "description": "Sinematik hareket, senkronize ses, 1080p",
        "capabilities": {
            "synchronized_audio": True,
            "cinematic_motion": True,
            "1080p": True
        }
    },
    "kie_veo31_fast": {
        "provider": "kie.ai",
        "name": "Veo 3.1 (Fast)",
        "type": "text_to_video",
        "model_id": "veo-3.1-fast",
        "kie_credits": 65,
        "cost_usd": 0.325,
        "duration": 8,
        "resolution": "1080p",
        "quality": 4,
        "speed": "fast",
        "badge": "⚡ Hızlı Veo",
        "description": "Hızlı render, düşük maliyet",
        "capabilities": {
            "1080p": True
        }
    },
    "kie_veo31_lite": {
        "provider": "kie.ai",
        "name": "Veo 3.1 (Lite)",
        "type": "text_to_video",
        "model_id": "veo-3.1-lite",
        "kie_credits": 35,
        "cost_usd": 0.175,
        "duration": 8,
        "resolution": "1080p",
        "quality": 3,
        "speed": "very_fast",
        "badge": "💰 Ekonomik",
        "description": "En uygun fiyatlı Veo modu",
        "capabilities": {
            "1080p": True
        }
    },
    
    # ============================================
    # OpenAI Sora 2 - Official Pricing Sync
    # ============================================
    "kie_sora2_stable_10s": {
        "provider": "kie.ai",
        "name": "Open AI Sora 2 (10s)",
        "type": "text_to_video",
        "model_id": "sora-2-text-to-video-stable",
        "kie_credits": 35,
        "cost_usd": 0.175,
        "duration": 10,
        "resolution": "1080p",
        "quality": 5,
        "speed": "medium",
        "badge": "🎬 OpenAI Sora",
        "description": "Gerçekçi hareket, tutarlı fizik",
        "capabilities": {
            "text_to_video": True,
            "image_to_video": True,
            "consistent_physics": True
        }
    },
    "kie_sora2_stable_15s": {
        "provider": "kie.ai",
        "name": "Open AI Sora 2 (15s)",
        "type": "text_to_video",
        "model_id": "sora-2-text-to-video-stable-15s",
        "kie_credits": 40,
        "cost_usd": 0.20,
        "duration": 15,
        "resolution": "1080p",
        "quality": 5,
        "speed": "medium",
        "badge": "✨ Uzun Süre",
        "description": "15 saniyelik uzun video",
        "capabilities": {
            "text_to_video": True,
            "image_to_video": True
        }
    },
    
    # ============================================
    # Kling 2.6 - Official Pricing Sync
    # ============================================
    "kie_kling26_audio_10s": {
        "provider": "kie.ai",
        "name": "Kling 2.6 + Audio (10s)",
        "type": "text_to_video",
        "model_id": "kling-2.6-audio-10s",
        "kie_credits": 220,
        "cost_usd": 1.10,
        "duration": 10,
        "resolution": "1080p",
        "quality": 5,
        "speed": "medium",
        "badge": "🔊 Sesli Video",
        "description": "10s sesli video",
        "capabilities": {
            "synchronized_audio": True
        }
    },
    "kie_kling26_no_audio_10s": {
        "provider": "kie.ai",
        "name": "Kling 2.6 (10s)",
        "type": "text_to_video",
        "model_id": "kling-2.6-10s",
        "kie_credits": 110,
        "cost_usd": 0.55,
        "duration": 10,
        "resolution": "1080p",
        "quality": 5,
        "speed": "medium",
        "badge": None,
        "description": "10s sessiz HD video",
        "capabilities": {}
    },
    "kie_kling26_audio_5s": {
        "provider": "kie.ai",
        "name": "Kling 2.6 + Audio (5s)",
        "type": "text_to_video",
        "model_id": "kling-2.6-audio-5s",
        "kie_credits": 110,
        "cost_usd": 0.55,
        "duration": 5,
        "resolution": "1080p",
        "quality": 5,
        "speed": "fast",
        "badge": "🔊 Sesli",
        "description": "5s sesli video",
        "capabilities": {
            "synchronized_audio": True
        }
    },
    "kie_kling26_no_audio_5s": {
        "provider": "kie.ai",
        "name": "Kling 2.6 (5s)",
        "type": "text_to_video",
        "model_id": "kling-2.6-5s",
        "kie_credits": 55,
        "cost_usd": 0.275,
        "duration": 5,
        "resolution": "1080p",
        "quality": 5,
        "speed": "fast",
        "badge": "💰 Ekonomik",
        "description": "5s sessiz HD video",
        "capabilities": {}
    },
    
    # ============================================
    # Wan 2.6 (Alibaba) - Official Pricing Sync
    # ============================================
    "kie_wan26_1080p_15s": {
        "provider": "kie.ai",
        "name": "Wan 2.6 (1080p, 15s)",
        "type": "text_to_video",
        "model_id": "wan-2.6-1080p-15s",
        "kie_credits": 315,
        "cost_usd": 1.575,
        "duration": 15,
        "resolution": "1080p",
        "quality": 5,
        "speed": "slow",
        "badge": "🎥 Ultra HD",
        "description": "15s 1080p yüksek kalite",
        "capabilities": {
            "multi_shot": True,
            "stable_characters": True
        }
    },
    "kie_wan26_1080p_10s": {
        "provider": "kie.ai",
        "name": "Wan 2.6 (1080p, 10s)",
        "type": "text_to_video",
        "model_id": "wan-2.6-1080p-10s",
        "kie_credits": 209.5,
        "cost_usd": 1.0475,
        "duration": 10,
        "resolution": "1080p",
        "quality": 5,
        "speed": "medium",
        "badge": "💎 Değer/Kalite",
        "description": "10s 1080p video",
        "capabilities": {}
    },
    "kie_wan26_1080p_5s": {
        "provider": "kie.ai",
        "name": "Wan 2.6 (1080p, 5s)",
        "type": "text_to_video",
        "model_id": "wan-2.6-1080p-5s",
        "kie_credits": 104.5,
        "cost_usd": 0.5225,
        "duration": 5,
        "resolution": "1080p",
        "quality": 5,
        "speed": "fast",
        "badge": None,
        "description": "5s 1080p video",
        "capabilities": {}
    },
    "kie_wan26_720p_10s": {
        "provider": "kie.ai",
        "name": "Wan 2.6 (720p, 10s)",
        "type": "text_to_video",
        "model_id": "wan-2.6-720p-10s",
        "kie_credits": 140,
        "cost_usd": 0.70,
        "duration": 10,
        "resolution": "720p",
        "quality": 4,
        "speed": "medium",
        "badge": None,
        "description": "10s 720p video",
        "capabilities": {}
    },
    "kie_wan26_720p_5s": {
        "provider": "kie.ai",
        "name": "Wan 2.6 (720p, 5s)",
        "type": "text_to_video",
        "model_id": "wan-2.6-720p-5s",
        "kie_credits": 70,
        "cost_usd": 0.35,
        "duration": 5,
        "resolution": "720p",
        "quality": 4,
        "speed": "fast",
        "badge": "💰 Ekonomik",
        "description": "5s 720p video",
        "capabilities": {}
    },
    
    # ============================================
    # Grok Imagine Video (xAI)
    # ============================================
    "kie_grok_video": {
        "provider": "kie.ai",
        "name": "Grok Imagine Video",
        "type": "text_to_video",
        "model_id": "grok-imagine-video",
        "kie_credits": 20,
        "cost_usd": 0.10,
        "duration": 6,
        "resolution": "720p",
        "quality": 4,
        "speed": "fast",
        "badge": "𝕏 xAI Video",
        "description": "Text/image to video, senkronize ses",
        "capabilities": {
            "text_to_video": True,
            "image_to_video": True,
            "synchronized_audio": True
        }
    },
    
    # ============================================
    # Hailuo 2.3 (MiniMax) - Official Pricing Sync
    # ============================================
    "kie_hailuo23": {
        "provider": "kie.ai",
        "name": "Hailuo 2.3",
        "type": "text_to_video",
        "model_id": "hailuo-2.3",
        "kie_credits": 100,
        "cost_usd": 0.50,
        "duration": 8,
        "resolution": "1080p",
        "quality": 5,
        "speed": "medium",
        "badge": "🎬 MiniMax",
        "description": "MiniMax video üretimi",
        "capabilities": {}
    },
}

# ============================================
# MUSIC GENERATION MODELS (Suno API)
# ============================================

KIE_MUSIC_MODELS = {
    "kie_suno_v35": {
        "provider": "kie.ai",
        "name": "Suno V3.5",
        "type": "text_to_music",
        "model_id": "suno-v3.5",
        "kie_credits": 10,
        "cost_usd": 0.05,
        "duration": 60,  # seconds
        "quality": 4,
        "speed": "medium",
        "badge": None,
        "description": "Temel müzik üretimi",
        "capabilities": {}
    },
    "kie_suno_v4": {
        "provider": "kie.ai",
        "name": "Suno V4",
        "type": "text_to_music",
        "model_id": "suno-v4",
        "kie_credits": 15,
        "cost_usd": 0.075,
        "duration": 120,
        "quality": 4,
        "speed": "medium",
        "badge": None,
        "description": "Gelişmiş vokal ve ses",
        "capabilities": {
            "enhanced_vocals": True
        }
    },
    "kie_suno_v45": {
        "provider": "kie.ai",
        "name": "Suno V4.5",
        "type": "text_to_music",
        "model_id": "suno-v4.5",
        "kie_credits": 20,
        "cost_usd": 0.10,
        "duration": 240,
        "quality": 5,
        "speed": "medium",
        "badge": "🎵 Profesyonel",
        "description": "4 dakikaya kadar profesyonel müzik",
        "capabilities": {
            "enhanced_vocals": True,
            "rich_sound": True,
            "song_structure": True
        }
    },
    "kie_suno_v45_plus": {
        "provider": "kie.ai",
        "name": "Suno V4.5 Plus",
        "type": "text_to_music",
        "model_id": "suno-v4.5-plus",
        "kie_credits": 40,
        "cost_usd": 0.20,
        "duration": 480,
        "quality": 5,
        "speed": "slow",
        "badge": "🎼 8 Dakika!",
        "description": "8 dakikaya kadar, akıllı promptlar",
        "capabilities": {
            "smart_prompts": True,
            "8_minutes": True
        }
    },
}

# ============================================
# TTS / AUDIO MODELS
# ============================================

KIE_TTS_MODELS = {
    "kie_elevenlabs_turbo_25": {
        "provider": "kie.ai",
        "name": "Elevenlabs Turbo 2.5",
        "type": "text_to_speech",
        "model_id": "elevenlabs-text-to-speech-turbo-2.5",
        "kie_credits": 6,  # 6.0 per 1000 characters
        "cost_usd": 0.03,  # per 1000 characters
        "quality": 5,
        "speed": "fast",
        "badge": "⚡ Turbo",
        "description": "Hızlı, gerçekçi İngilizce seslendirme",
        "capabilities": {"multilingual": False}
    },
    "kie_elevenlabs_multilingual_v2": {
        "provider": "kie.ai",
        "name": "Elevenlabs Multilingual V2",
        "type": "text_to_speech",
        "model_id": "elevenlabs-text-to-speech-multilingual-v2",
        "kie_credits": 12, # 12.0 per 1000 characters
        "cost_usd": 0.06,  # per 1000 characters
        "quality": 5,
        "speed": "medium",
        "badge": "🌍 Çok Dilli",
        "description": "29 dilde yüksek kaliteli seslendirme",
        "capabilities": {"multilingual": True}
    },
    "kie_elevenlabs_v3": {
        "provider": "kie.ai",
        "name": "Elevenlabs V3 (Text to Dialogue)",
        "type": "text_to_speech",
        "model_id": "elevenlabs-v3-text-to-dialogue",
        "kie_credits": 14, # 14 per 1000 characters
        "cost_usd": 0.07,  # per 1000 characters
        "quality": 5,
        "speed": "medium",
        "badge": "🗣️ Diyalog",
        "description": "Diyaloglar için özel tasarlanmış v3 modeli",
        "capabilities": {"multilingual": True, "dialogue": True}
    },
    "kie_elevenlabs_sfx": {
        "provider": "kie.ai",
        "name": "Elevenlabs Sound Effect V2",
        "type": "sound_effects",
        "model_id": "elevenlabs-sound-effect-v2",
        "kie_credits": 0.24, # per second
        "cost_usd": 0.0012,  # per second
        "quality": 5,
        "speed": "fast",
        "badge": "🔊 SFX",
        "description": "Profesyonel ses efektleri",
        "capabilities": {"sound_effects": True}
    }
}

# ============================================
# ALL MODELS COMBINED
# ============================================

KIE_ALL_MODELS = {
    **KIE_IMAGE_MODELS,
    **KIE_VIDEO_MODELS,
    **KIE_MUSIC_MODELS,
    **KIE_TTS_MODELS
}

# Model counts
KIE_MODEL_STATS = {
    "image_models": len(KIE_IMAGE_MODELS),
    "video_models": len(KIE_VIDEO_MODELS),
    "music_models": len(KIE_MUSIC_MODELS),
    "tts_models": len(KIE_TTS_MODELS),
    "total_models": len(KIE_ALL_MODELS)
}

def get_kie_model_by_id(model_id: str):
    """Get a specific kie.ai model by ID"""
    return KIE_ALL_MODELS.get(model_id)

def get_kie_models_by_type(model_type: str):
    """Get all kie.ai models of a specific type"""
    return {k: v for k, v in KIE_ALL_MODELS.items() if v.get("type") == model_type}

def get_kie_image_models():
    """Get all kie.ai image models"""
    return KIE_IMAGE_MODELS

def get_kie_video_models():
    """Get all kie.ai video models"""
    return KIE_VIDEO_MODELS

def get_kie_music_models():
    """Get all kie.ai music models"""
    return KIE_MUSIC_MODELS

def get_kie_tts_models():
    """Get all kie.ai tts models"""
    return KIE_TTS_MODELS
