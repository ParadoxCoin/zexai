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
    # ── FLUX-2 (Market API) ──────────────────────
    "kie_flux2_pro": {
        "provider": "kie.ai",
        "api_type": "flux_kontext",
        "name": "FLUX V1.1 PRO [STABLE]",
        "type": "text_to_image",
        "model_id": "flux-kontext-max",
        "kie_credits": 10,
        "cost_usd": 0.10,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "fast",
        "badge": "💎 NEURAL ELITE",
        "description": "Ultra-fidelity neural synthesis engine for professional-grade imaging.",
        "capabilities": {
            "text_rendering": True
        }
    },
    
    # ── Flux Kontext (Dedicated API) ─────────────
    "kie_flux_kontext_pro": {
        "provider": "kie.ai",
        "api_type": "flux_kontext",
        "name": "FLUX KONTEXT PRO [EDIT]",
        "type": "text_to_image",
        "model_id": "flux-kontext-pro",
        "kie_credits": 5,
        "cost_usd": 0.05,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "fast",
        "badge": "✏️ NEURAL EDIT",
        "description": "Advanced context-aware neural image transformation engine.",
        "capabilities": {
            "character_consistency": True
        }
    },
    "kie_flux_kontext_max": {
        "provider": "kie.ai",
        "api_type": "flux_kontext",
        "name": "FLUX KONTEXT MAX [ULTRA]",
        "type": "text_to_image",
        "model_id": "flux-kontext-max",
        "kie_credits": 10,
        "cost_usd": 0.10,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "medium",
        "badge": "🖼️ MAX FIDELITY",
        "description": "Maximum resolution neural synthesis for elite production.",
        "capabilities": {
            "character_consistency": True
        }
    },

    # ── Ideogram V3 (Market API) ─────────────────
    "kie_ideogram_v3": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "IDEOGRAM V3 TYPOGRAPHY",
        "type": "text_to_image",
        "model_id": "ideogram/v3-text-to-image",
        "kie_credits": 8,
        "cost_usd": 0.08,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "medium",
        "badge": "📝 TEXT MASTER",
        "description": "Next-gen typography and logo synthesis engine.",
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
        "name": "GEMINI NANO BANANA [FLASH]",
        "type": "text_to_image",
        "model_id": "google/nano-banana",
        "kie_credits": 6,
        "cost_usd": 0.06,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "fast",
        "badge": "🍌 FLASH CORE",
        "description": "Ultra-fast Google Gemini 2.5 Flash synthesis engine for instant imaging.",
        "capabilities": {
            "text_rendering": True
        }
    },
    "kie_nano_banana_edit": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "Nano Banana Edit",
        "type": "image_to_image",
        "model_id": "google/nano-banana-edit",
        "kie_credits": 8,
        "cost_usd": 0.08,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "medium",
        "badge": "✏️ GOOGLE EDIT",
        "description": "Google AI neural image-to-image transformation engine.",
        "capabilities": {
            "image_editing": True,
            "text_rendering": True
        }
    },

    # ── GPT-4o Image (Dedicated API) ─────────────
    "kie_gpt4o_image": {
        "provider": "kie.ai",
        "api_type": "gpt4o_image",
        "name": "GPT-4O OMNI ENGINE [COMMAND CENTER]",
        "type": "text_to_image",
        "model_id": "gpt-4o-image",
        "kie_credits": 12,
        "cost_usd": 0.12,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "medium",
        "badge": "🤖 OPENAI CORE",
        "description": "Official OpenAI DALL-E 3 neural architecture for stable imaging.",
        "capabilities": {
            "text_rendering": True,
            "multi_modal": True
        }
    },

    # ── Google Imagen 4 (Market API) ─────────────
    "kie_imagen4": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "GOOGLE IMAGEN 4 [COMMAND CENTER]",
        "type": "text_to_image",
        "model_id": "google/imagen4",
        "kie_credits": 8,
        "cost_usd": 0.08,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "medium",
        "badge": "🎨 GOOGLE CORE",
        "description": "High-fidelity Google Imagen 4 synthesis for photorealistic outputs.",
        "capabilities": {
            "negative_prompt": True
        }
    },

    # ── Recraft (Market API) ─────────────────────
    "kie_recraft_remove_bg": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "RECRAFT NEURAL PURGE [COMMAND CENTER]",
        "type": "background_remover",
        "model_id": "recraft/remove-background",
        "kie_credits": 2,
        "cost_usd": 0.02,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "fast",
        "badge": "✂️ NEURAL PURGE",
        "description": "High-precision AI background elimination using Recraft neural logic.",
        "capabilities": {
            "image_editing": True
        }
    },

    "kie_recraft": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "RECRAFT UPSCALE [COMMAND CENTER]",
        "type": "upscaler",
        "model_id": "recraft/crisp-upscale",
        "kie_credits": 4,
        "cost_usd": 0.04,
        "cost_multiplier": 1.0,
        "quality": 4,
        "speed": "fast",
        "badge": "🎨 RECRAFT CORE",
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
        "name": "Z-IMAGE [COMMAND CENTER]",
        "type": "text_to_image",
        "model_id": "z-image",
        "kie_credits": 1,
        "cost_usd": 0.01,
        "cost_multiplier": 1.0,
        "quality": 4,
        "speed": "fast",
        "badge": "💰 ECONOMY CORE",
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
        "name": "SEEDREAM 3.0 [COMMAND CENTER]",
        "type": "text_to_image",
        "model_id": "bytedance/seedream",
        "kie_credits": 3,
        "cost_usd": 0.03,
        "cost_multiplier": 1.0,
        "quality": 4,
        "speed": "fast",
        "badge": "✨ SEEDREAM CORE",
        "description": "ByteDance Seedream yaratıcı görseller",
        "capabilities": {}
    },

    # ── Grok Imagine (Market API) ────────────────
    "kie_grok_imagine": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "GROK IMAGINE [COMMAND CENTER]",
        "type": "text_to_image",
        "model_id": "grok-imagine/text-to-image",
        "kie_credits": 6,
        "cost_usd": 0.06,
        "cost_multiplier": 1.0,
        "quality": 4,
        "speed": "medium",
        "badge": "𝕏 XAI CORE",
        "description": "xAI Grok görsel üretimi",
        "capabilities": {}
    },

    # ── Qwen (Market API) ────────────────────────
    "kie_qwen": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "QWEN NEURAL CLUSTER [COMMAND CENTER]",
        "type": "text_to_image",
        "model_id": "qwen/text-to-image",
        "kie_credits": 3,
        "cost_usd": 0.03,
        "cost_multiplier": 1.0,
        "quality": 4,
        "speed": "fast",
        "badge": "⚡ QUANTUM CORE",
        "description": "High-speed Alibaba Qwen synthesis cluster for rapid visual iteration.",
        "capabilities": {
            "negative_prompt": True,
            "image_editing": True
        }
    },


    # ── Topaz Upscale (Market API) ───────────────
    "kie_topaz_upscale": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "TOPAZ UPSCALE [COMMAND CENTER]",
        "type": "upscaler",
        "model_id": "topaz/image-upscale",
        "kie_credits": 3,
        "cost_usd": 0.03,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "medium",
        "badge": "🔍 OPTIC CORE",
        "description": "Profesyonel görsel büyütme",
        "capabilities": {
            "upscale_4x": True,
            "enhancement": True
        }
    },

    # ── Seedream 5.0 Lite (Market API) ───────────
    "kie_seedream_5_lite": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "SEEDREAM 5.0 LITE [NEURAL ELITE]",
        "type": "text_to_image",
        "model_id": "bytedance/seedream-5-lite",
        "kie_credits": 4,
        "cost_usd": 0.04,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "fast",
        "badge": "🌱 SEEDREAM 5.0",
        "description": "ByteDance flagship with deep thinking and web search for knowledge-intensive prompts.",
        "capabilities": {
            "deep_thinking": True,
            "text_rendering": True
        }
    },
    "kie_seedream_5_lite_i2i": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "SEEDREAM 5.0 LITE EDIT [NEURAL ELITE]",
        "type": "image_to_image",
        "model_id": "bytedance/seedream-5-lite-i2i",
        "kie_credits": 5,
        "cost_usd": 0.05,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "medium",
        "badge": "🌱 SEEDREAM EDIT",
        "description": "Seedream 5.0 image-to-image transformation with deep reasoning.",
        "capabilities": {
            "image_editing": True,
            "deep_thinking": True
        }
    },

    # ── Seedream 4.5 (Market API) ────────────────
    "kie_seedream_4_5": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "SEEDREAM 4.5 [COMMAND CENTER]",
        "type": "text_to_image",
        "model_id": "bytedance/seedream-4-5",
        "kie_credits": 3,
        "cost_usd": 0.03,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "fast",
        "badge": "✨ SEEDREAM 4.5",
        "description": "Advanced ByteDance creative synthesis with enhanced text rendering.",
        "capabilities": {
            "text_rendering": True
        }
    },

    # ── Nano Banana 2 (Market API) ───────────────
    "kie_nano_banana_2": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "GEMINI NANO BANANA 2 [NEURAL ELITE]",
        "type": "text_to_image",
        "model_id": "google/nanobanana2",
        "kie_credits": 3,
        "cost_usd": 0.02,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "fast",
        "badge": "🍌 BANANA V2",
        "description": "Gemini 3.1 Flash Image - next-gen speed, consistency and text rendering.",
        "capabilities": {
            "text_rendering": True,
            "character_consistency": True
        }
    },

    # ── Nano Banana Pro (Market API) ─────────────
    "kie_nano_banana_pro": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "NANO BANANA PRO 4K [NEURAL ELITE]",
        "type": "image_to_image",
        "model_id": "google/pro-image-to-image",
        "kie_credits": 15,
        "cost_usd": 0.15,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "medium",
        "badge": "👑 BANANA PRO",
        "description": "Gemini 3 Pro Image - 4K photorealism for production-grade workflows.",
        "capabilities": {
            "resolution_4k": True,
            "photorealistic": True,
            "character_consistency": True
        }
    },

    # ── Imagen 4 Ultra (Market API) ──────────────
    "kie_imagen4_ultra": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "GOOGLE IMAGEN 4 ULTRA [NEURAL ELITE]",
        "type": "text_to_image",
        "model_id": "google/imagen4-ultra",
        "kie_credits": 12,
        "cost_usd": 0.12,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "slow",
        "badge": "🎨 IMAGEN ULTRA",
        "description": "Google Imagen 4 Ultra - maximum fidelity photorealistic generation.",
        "capabilities": {
            "negative_prompt": True,
            "photorealistic": True
        }
    },
    "kie_imagen4_fast": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "GOOGLE IMAGEN 4 FAST [COMMAND CENTER]",
        "type": "text_to_image",
        "model_id": "google/imagen4-fast",
        "kie_credits": 5,
        "cost_usd": 0.05,
        "cost_multiplier": 1.0,
        "quality": 4,
        "speed": "fast",
        "badge": "⚡ IMAGEN FAST",
        "description": "Google Imagen 4 Fast - rapid generation with balanced quality.",
        "capabilities": {
            "negative_prompt": True
        }
    },

    # ── GPT Image 2 (Market API) ─────────────────
    "kie_gpt_image_2": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "GPT IMAGE 2 [NEURAL ELITE]",
        "type": "text_to_image",
        "model_id": "gpt/gpt-image-2-text-to-image",
        "kie_credits": 10,
        "cost_usd": 0.10,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "medium",
        "badge": "🤖 GPT IMAGE 2",
        "description": "OpenAI next-gen image model - photorealism, text rendering, advanced editing.",
        "capabilities": {
            "text_rendering": True,
            "photorealistic": True,
            "multi_modal": True
        }
    },

    # ── Wan 2.7 Image (Market API) ───────────────
    "kie_wan_image": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "WAN 2.7 IMAGE [COMMAND CENTER]",
        "type": "text_to_image",
        "model_id": "wan/2-7-image",
        "kie_credits": 3,
        "cost_usd": 0.03,
        "cost_multiplier": 1.0,
        "quality": 4,
        "speed": "fast",
        "badge": "🖼️ WAN IMAGE",
        "description": "Alibaba Wan 2.7 fast image generation with creative versatility.",
        "capabilities": {
            "text_rendering": True
        }
    },
    "kie_wan_image_pro": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "WAN 2.7 IMAGE PRO [NEURAL ELITE]",
        "type": "text_to_image",
        "model_id": "wan/2-7-image-pro",
        "kie_credits": 5,
        "cost_usd": 0.04,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "medium",
        "badge": "👑 WAN PRO",
        "description": "Wan 2.7 Pro - premium quality image generation with enhanced detail.",
        "capabilities": {
            "text_rendering": True,
            "photorealistic": True
        }
    },

    # ── Grok Imagine Image to Image (Market API) ─
    "kie_grok_imagine_i2i": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "GROK IMAGINE EDIT [COMMAND CENTER]",
        "type": "image_to_image",
        "model_id": "grok-imagine/image-to-image",
        "kie_credits": 6,
        "cost_usd": 0.05,
        "cost_multiplier": 1.0,
        "quality": 4,
        "speed": "medium",
        "badge": "𝕏 GROK EDIT",
        "description": "xAI Grok image-to-image transformation and editing.",
        "capabilities": {
            "image_editing": True
        }
    },

    # ── Qwen2 (Market API) ───────────────────────
    "kie_qwen2": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "QWEN2 NEURAL CLUSTER [COMMAND CENTER]",
        "type": "text_to_image",
        "model_id": "qwen2/text-to-image",
        "kie_credits": 4,
        "cost_usd": 0.04,
        "cost_multiplier": 1.0,
        "quality": 5,
        "speed": "fast",
        "badge": "⚡ QWEN2 CORE",
        "description": "Next-gen Alibaba Qwen2 synthesis with enhanced visual quality.",
        "capabilities": {
            "negative_prompt": True,
            "text_rendering": True
        }
    },
}

# ============================================
# VIDEO GENERATION MODELS
# ============================================

KIE_VIDEO_MODELS = {
    "kie_veo3_quality": {
        "provider": "kie.ai",
        "name": "VEO 3 SYNTHESIS CLUSTER [HQ]",
        "base_name": "Veo 3",
        "version_name": "Quality",
        "type": "text_to_video",
        "model_id": "veo-3-quality",
        "kie_credits": 440,
        "cost_usd": 2.20,
        "duration": 4,
        "durations": [4, 6, 8],
        "resolution": "1080p",
        "resolutions": ["720p", "1080p", "4K"],
        "quality": 5,
        "speed": "slow",
        "badge": "🎬 GOOGLE ELITE",
        "description": "Premium-grade Google Veo 3 cinematic synthesis engine.",
        "capabilities": {"synchronized_audio": True}
    },
    "kie_veo3_fast": {
        "provider": "kie.ai",
        "name": "VEO 3 TURBO [FAST]",
        "base_name": "Veo 3",
        "version_name": "Fast",
        "type": "text_to_video",
        "model_id": "veo-3-fast",
        "kie_credits": 276,
        "cost_usd": 1.38,
        "duration": 4,
        "durations": [4, 6, 8],
        "resolution": "1080p",
        "resolutions": ["720p", "1080p"],
        "quality": 4,
        "speed": "fast",
        "badge": "⚡ TURBO CORE",
        "description": "High-speed Google Veo 3 synthesis for rapid production.",
        "capabilities": {}
    },
    "kie_veo31_quality": {
        "provider": "kie.ai",
        "name": "VEO 3.1 CINEMATIC [ULTRA]",
        "base_name": "Veo 3.1",
        "version_name": "Quality",
        "type": "text_to_video",
        "model_id": "veo-3.1-quality",
        "kie_credits": 516,
        "cost_usd": 2.58,
        "duration": 4,
        "durations": [4, 6, 8],
        "resolution": "1080p",
        "resolutions": ["720p", "1080p", "4K"],
        "quality": 5,
        "speed": "slow",
        "badge": "🏆 NEURAL CINEMA",
        "description": "Ultra-fidelity Google Veo 3.1 with synchronized neural audio.",
        "capabilities": {
            "synchronized_audio": True,
            "cinematic_motion": True
        }
    },
    "kie_veo31_fast": {
        "provider": "kie.ai",
        "name": "VEO 3.1 FAST TRACK [PRO]",
        "base_name": "Veo 3.1",
        "version_name": "Fast",
        "type": "text_to_video",
        "model_id": "veo-3.1-fast",
        "kie_credits": 256,
        "cost_usd": 1.28,
        "duration": 4,
        "durations": [4, 6, 8],
        "resolution": "1080p",
        "resolutions": ["720p", "1080p"],
        "quality": 4,
        "speed": "fast",
        "badge": "⚡ PRO CORE",
        "description": "Balanced high-speed performance for professional creators.",
        "capabilities": {}
    },
    "kie_veo31_lite": {
        "provider": "kie.ai",
        "name": "VEO 3.1 LITE CORE [ECONOMY]",
        "base_name": "Veo 3.1",
        "version_name": "Lite",
        "type": "text_to_video",
        "model_id": "veo-3.1-lite",
        "kie_credits": 140,
        "cost_usd": 0.70,
        "duration": 4,
        "durations": [4, 6, 8],
        "resolution": "1080p",
        "resolutions": ["720p"],
        "quality": 3,
        "speed": "very_fast",
        "badge": "💰 ECONOMY",
        "description": "Cost-effective entry-level video synthesis core.",
        "capabilities": {}
    },
    "kie_sora2_stable_10s": {
        "provider": "kie.ai",
        "name": "OPEN AI SORA 2 (10S)",
        "base_name": "OpenAI Sora 2",
        "version_name": "10s",
        "type": "text_to_video",
        "model_id": "openai/sora-2-10s",
        "kie_credits": 480,
        "cost_usd": 0.96,
        "duration": 10,
        "durations": [10],
        "resolution": "1080p",
        "quality": 5,
        "speed": "medium",
        "badge": "🎬 HOLLYWOOD CORE",
        "description": "Institutional-grade OpenAI Sora 2 physics simulation and cinematic motion.",
        "capabilities": {
            "text_to_video": True,
            "image_to_video": True,
            "consistent_physics": True
        }
    },
    "kie_sora2_stable_15s": {
        "provider": "kie.ai",
        "name": "OPEN AI SORA 2 (15S)",
        "base_name": "OpenAI Sora 2",
        "version_name": "15s",
        "type": "text_to_video",
        "model_id": "openai/sora-2-15s",
        "kie_credits": 555,
        "cost_usd": 1.11,
        "duration": 15,
        "durations": [15],
        "resolution": "1080p",
        "quality": 5,
        "speed": "medium",
        "badge": "🎬 HOLLYWOOD CORE",
        "description": "Institutional-grade OpenAI Sora 2 physics simulation and cinematic motion.",
        "capabilities": {
            "text_to_video": True,
            "image_to_video": True,
            "consistent_physics": True
        }
    },
    "kie_kling26_audio_10s": {
        "provider": "kie.ai",
        "name": "KLING 2.6 SONIC SYNC [HQ]",
        "base_name": "Kling 2.6",
        "version_name": "Audio",
        "type": "text_to_video",
        "model_id": "kling-2.6-audio",
        "kie_credits": 370,
        "cost_usd": 0.74,
        "duration": 5,
        "durations": [5, 10, 15],
        "slider_duration": True,
        "resolution": "1080p",
        "resolutions": ["720p", "1080p", "4K"],
        "quality": 5,
        "speed": "medium",
        "badge": "🔊 SONIC SYNC",
        "description": "State-of-the-art Kling 2.6 synthesis with synchronized neural audio.",
        "capabilities": {
            "synchronized_audio": True
        }
    },
    "kie_kling26_no_audio_10s": {
        "provider": "kie.ai",
        "name": "KLING 2.6 STANDARD ENGINE",
        "base_name": "Kling AI",
        "version_name": "Standard",
        "type": "text_to_video",
        "model_id": "kling-2.6-10s",
        "kie_credits": 230,
        "cost_usd": 0.46,
        "duration": 5,
        "durations": [5, 10, 15],
        "slider_duration": True,
        "resolution": "1080p",
        "resolutions": ["720p", "1080p", "4K"],
        "quality": 5,
        "speed": "medium",
        "badge": "🎥 ULTRA HD",
        "description": "High-fidelity cinematic video synthesis without audio constraints.",
        "capabilities": {}
    },
    "kie_kling26_audio_5s": {
        "provider": "kie.ai",
        "name": "KLING 2.6 SONIC SYNC (5S)",
        "base_name": "Kling 2.6",
        "version_name": "Audio 5s",
        "type": "text_to_video",
        "model_id": "kling-2.6-audio-5s",
        "kie_credits": 260,
        "cost_usd": 0.52,
        "duration": 5,
        "durations": [5],
        "resolution": "1080p",
        "resolutions": ["1080p"],
        "quality": 4,
        "speed": "fast",
        "badge": "🔊 5S SYNC",
        "description": "5s Kling synthesis with audio.",
        "capabilities": {"synchronized_audio": True}
    },
    "kie_kling26_no_audio_5s": {
        "provider": "kie.ai",
        "name": "KLING 2.6 STANDARD (5S)",
        "base_name": "Kling AI",
        "version_name": "Standard 5s",
        "type": "text_to_video",
        "model_id": "kling-2.6-5s",
        "kie_credits": 175,
        "cost_usd": 0.35,
        "duration": 5,
        "durations": [5],
        "resolution": "1080p",
        "resolutions": ["1080p"],
        "quality": 4,
        "speed": "fast",
        "badge": "🎥 5S HD",
        "description": "5s high-fidelity video.",
        "capabilities": {}
    },
    "kie_wan26_1080p_15s": {
        "provider": "kie.ai",
        "name": "WAN 2.6 (1080P, 15S)",
        "base_name": "Wan AI",
        "version_name": "1080p 15s",
        "type": "text_to_video",
        "model_id": "wan-2.6-1080p-15s",
        "kie_credits": 1305,
        "cost_usd": 2.61,
        "duration": 15,
        "durations": [15],
        "resolution": "1080p",
        "resolutions": ["1080p"],
        "quality": 5,
        "speed": "slow",
        "badge": "🎥 ULTRA HD",
        "description": "15s 1080p yüksek kalite",
        "capabilities": {
            "multi_shot": True,
            "stable_characters": True
        }
    },
    "kie_wan26_1080p_10s": {
        "provider": "kie.ai",
        "name": "WAN 2.6 (1080P, 10S)",
        "base_name": "Wan AI",
        "version_name": "1080p 10s",
        "type": "text_to_video",
        "model_id": "wan-2.6-1080p-10s",
        "kie_credits": 690,
        "cost_usd": 1.38,
        "duration": 10,
        "durations": [10],
        "resolution": "1080p",
        "resolutions": ["1080p"],
        "quality": 5,
        "speed": "medium",
        "badge": "💎 DEĞER/KALİTE",
        "description": "10s 1080p video",
        "capabilities": {}
    },
    "kie_wan26_1080p_5s": {
        "provider": "kie.ai",
        "name": "WAN 2.6 (1080P, 5S)",
        "base_name": "Wan AI",
        "version_name": "1080p 5s",
        "type": "text_to_video",
        "model_id": "wan-2.6-1080p-5s",
        "kie_credits": 295,
        "cost_usd": 0.59,
        "duration": 5,
        "durations": [5],
        "resolution": "1080p",
        "resolutions": ["1080p"],
        "quality": 5,
        "speed": "fast",
        "badge": "⚡ PRO SPEED",
        "description": "5s 1080p video",
        "capabilities": {}
    },
    "kie_wan26_720p_10s": {
        "provider": "kie.ai",
        "name": "WAN 2.6 (720P, 10S)",
        "base_name": "Wan AI",
        "version_name": "720p 10s",
        "type": "text_to_video",
        "model_id": "wan-2.6-720p-10s",
        "kie_credits": 460,
        "cost_usd": 0.92,
        "duration": 10,
        "durations": [10],
        "resolution": "720p",
        "resolutions": ["720p"],
        "quality": 4,
        "speed": "medium",
        "badge": "⚡ WAN CORE",
        "description": "10s 720p video",
        "capabilities": {}
    },
    "kie_wan26_720p_5s": {
        "provider": "kie.ai",
        "name": "WAN 2.6 (720P, 5S)",
        "base_name": "Wan AI",
        "version_name": "720p 5s",
        "type": "text_to_video",
        "model_id": "wan-2.6-720p-5s",
        "kie_credits": 205,
        "cost_usd": 0.41,
        "duration": 5,
        "durations": [5],
        "resolution": "720p",
        "resolutions": ["720p"],
        "quality": 4,
        "speed": "fast",
        "badge": "⚡ WAN LITE",
        "description": "5s 720p video",
        "capabilities": {}
    },
    "kie_grok_video": {
        "provider": "kie.ai",
        "name": "GROK IMAGINE VIDEO [COMMAND CENTER]",
        "base_name": "Grok Video",
        "type": "text_to_video",
        "model_id": "grok-imagine/video",
        "kie_credits": 80,
        "cost_usd": 0.16,
        "duration": 6,
        "durations": [6],
        "resolution": "720p",
        "quality": 4,
        "speed": "medium",
        "badge": "𝕏 XAI CORE",
        "description": "xAI Grok high-speed neural video synthesis.",
        "capabilities": {}
    },
    "kie_hailuo23": {
        "provider": "kie.ai",
        "name": "HAILUO 2.3 CINEMATIC [HQ]",
        "base_name": "Hailuo 2.3",
        "type": "text_to_video",
        "model_id": "hailuo/2.3-video",
        "kie_credits": 60,
        "cost_usd": 0.12,
        "duration": 8,
        "durations": [8],
        "resolution": "1080p",
        "quality": 5,
        "speed": "medium",
        "badge": "🎬 NEURAL CINEMA",
        "description": "Hailuo MiniMax ultra-realistic cinematic video synthesis.",
        "capabilities": {}
    },
    "kie_runway_gen3": {
        "provider": "kie.ai",
        "name": "RUNWAY GEN-3 ALPHA [LEGACY]",
        "base_name": "Runway Gen-3",
        "type": "text_to_video",
        "model_id": "runway/gen3",
        "kie_credits": 45,
        "cost_usd": 0.225,
        "duration": 10,
        "durations": [10],
        "resolution": "1080p",
        "resolutions": ["720p", "1080p"],
        "quality": 4,
        "speed": "medium",
        "badge": "🎬 LEGACY",
        "description": "Runway Gen-3 Alpha synthesis engine.",
        "capabilities": {"text_to_video": True, "image_to_video": True}
    },

    # ── Kling 3.0 (Latest Generation) ────────────
    "kie_kling30_audio": {
        "provider": "kie.ai",
        "name": "KLING 3.0 SONIC [ULTRA]",
        "base_name": "Kling 3.0",
        "version_name": "Audio",
        "type": "text_to_video",
        "model_id": "kling-3.0-audio",
        "kie_credits": 520,
        "cost_usd": 2.60,
        "duration": 5,
        "durations": [5, 10, 15],
        "slider_duration": True,
        "resolution": "1080p",
        "resolutions": ["720p", "1080p", "4K"],
        "quality": 5,
        "speed": "medium",
        "badge": "🔊 SONIC 3.0",
        "description": "Latest Kling 3.0 with native synchronized audio, cinematic motion and 4K.",
        "capabilities": {"synchronized_audio": True, "cinematic_motion": True, "native_4k": True}
    },
    "kie_kling30_standard": {
        "provider": "kie.ai",
        "name": "KLING 3.0 CINEMA [PRO]",
        "base_name": "Kling 3.0",
        "version_name": "Standard",
        "type": "text_to_video",
        "model_id": "kling-3.0-standard",
        "kie_credits": 350,
        "cost_usd": 1.75,
        "duration": 5,
        "durations": [5, 10, 15],
        "slider_duration": True,
        "resolution": "1080p",
        "resolutions": ["720p", "1080p", "4K"],
        "quality": 5,
        "speed": "medium",
        "badge": "🎬 CINEMA 3.0",
        "description": "Kling 3.0 cinematic video with improved physics and consistency.",
        "capabilities": {"cinematic_motion": True, "native_4k": True}
    },
    "kie_kling30_o3_audio": {
        "provider": "kie.ai",
        "name": "KLING O3 OMNI [ELITE]",
        "base_name": "Kling O3",
        "version_name": "Audio",
        "type": "text_to_video",
        "model_id": "kling-o3-audio",
        "kie_credits": 680,
        "cost_usd": 3.40,
        "duration": 5,
        "durations": [5, 10, 15],
        "slider_duration": True,
        "resolution": "1080p",
        "resolutions": ["720p", "1080p", "4K"],
        "quality": 5,
        "speed": "slow",
        "badge": "👑 OMNI ELITE",
        "description": "Kling O3 Omni — multi-shot storyboarding, voice control, native audio & 4K.",
        "capabilities": {"synchronized_audio": True, "multi_shot": True, "voice_control": True, "native_4k": True}
    },

    # ── IMAGE TO VIDEO MODELS ────────────────────
    "kie_kling26_i2v": {
        "provider": "kie.ai",
        "name": "Kling 2.6 Image to Video",
        "base_name": "Kling AI",
        "version_name": "I2V",
        "type": "image_to_video",
        "model_id": "kling-2.6/image-to-video",
        "kie_credits": 35,
        "cost_usd": 0.175,
        "duration": 5,
        "durations": [5, 10],
        "resolution": "1080p",
        "resolutions": ["720p", "1080p"],
        "quality": 5,
        "speed": "medium",
        "badge": "⚔️ KLING I2V",
        "description": "Kling 2.6 Image to Video — bring still images to life with cinematic motion.",
        "capabilities": {"image_to_video": True, "sound": True},
        "supports_image_input": True,
        "params": ["prompt", "image_urls", "duration", "sound"]
    },
    "kie_runway_i2v": {
        "provider": "kie.ai",
        "name": "Runway Image to Video",
        "base_name": "Runway",
        "version_name": "I2V",
        "type": "image_to_video",
        "model_id": "runway/aleph-image-to-video",
        "kie_credits": 25,
        "cost_usd": 0.125,
        "duration": 5,
        "durations": [5, 10],
        "resolution": "1080p",
        "resolutions": ["720p", "1080p"],
        "quality": 4,
        "speed": "fast",
        "badge": "🎥 RUNWAY I2V",
        "description": "Runway Aleph Image to Video — fast and precise image animation.",
        "capabilities": {"image_to_video": True},
        "supports_image_input": True,
        "params": ["prompt", "image_url", "duration", "aspect_ratio"]
    },
    "kie_luma_ray_i2v": {
        "provider": "kie.ai",
        "name": "Luma Ray Image to Video",
        "base_name": "Luma AI",
        "version_name": "I2V",
        "type": "image_to_video",
        "model_id": "luma/ray-image-to-video",
        "kie_credits": 30,
        "cost_usd": 0.15,
        "duration": 5,
        "durations": [5],
        "resolution": "720p",
        "resolutions": ["720p"],
        "quality": 4,
        "speed": "medium",
        "badge": "💎 LUMA I2V",
        "description": "Luma Ray Image to Video — dreamlike fluid animation from images.",
        "capabilities": {"image_to_video": True},
        "supports_image_input": True,
        "params": ["prompt", "image_url", "duration", "aspect_ratio"]
    },
    "kie_hailuo_i2v": {
        "provider": "kie.ai",
        "name": "Hailuo Mini Image to Video",
        "base_name": "Hailuo AI",
        "version_name": "I2V",
        "type": "image_to_video",
        "model_id": "hailuo/02-image-to-video",
        "kie_credits": 40,
        "cost_usd": 0.20,
        "duration": 5,
        "durations": [5, 10],
        "resolution": "1080p",
        "resolutions": ["720p", "1080p"],
        "quality": 4,
        "speed": "medium",
        "badge": "🌊 HAILUO I2V",
        "description": "Hailuo MiniMax Image to Video — realistic subject motion and scene dynamics.",
        "capabilities": {"image_to_video": True},
        "supports_image_input": True,
        "params": ["prompt", "image_url", "duration", "aspect_ratio"]
    },

    # ── VIDEO TO VIDEO MODELS ────────────────────
    "kie_kling26_v2v": {
        "provider": "kie.ai",
        "name": "Kling 2.6 Video Transform",
        "base_name": "Kling AI",
        "version_name": "V2V",
        "type": "video_to_video",
        "model_id": "kling-2.6/video-to-video",
        "kie_credits": 35,
        "cost_usd": 0.175,
        "duration": 5,
        "durations": [5],
        "resolution": "1080p",
        "resolutions": ["720p", "1080p"],
        "quality": 5,
        "speed": "medium",
        "badge": "⚔️ KLING V2V",
        "description": "Kling 2.6 Video-to-Video transformation engine.",
        "capabilities": {"video_to_video": True},
        "supports_video_input": True,
        "params": ["prompt", "video_url", "duration"]
    },
    "kie_runway_v2v": {
        "provider": "kie.ai",
        "name": "Runway Video Transform",
        "base_name": "Runway",
        "version_name": "V2V",
        "type": "video_to_video",
        "model_id": "runway/aleph-video-to-video",
        "kie_credits": 25,
        "cost_usd": 0.125,
        "duration": 5,
        "durations": [5, 10],
        "resolution": "1080p",
        "resolutions": ["720p", "1080p"],
        "quality": 4,
        "speed": "fast",
        "badge": "🎥 RUNWAY V2V",
        "description": "Runway Aleph Video-to-Video transformation.",
        "capabilities": {"video_to_video": True},
        "supports_video_input": True,
        "params": ["prompt", "video_url", "duration", "aspect_ratio"]
    },
}

# ============================================
# MUSIC GENERATION MODELS (Suno API)
# ============================================

KIE_MUSIC_MODELS = {
    "kie_suno_v3_5": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "SONIC ENGINE V3.5 [STUDIO]",
        "type": "music_generation",
        "model_id": "suno/v3.5",
        "kie_credits": 6,
        "cost_usd": 0.05,
        "quality": 5,
        "speed": "medium",
        "badge": "🎵 STUDIO CORE",
        "description": "High-fidelity Suno V3.5 neural music synthesis for professional compositions.",
        "capabilities": {"full_song": True, "instrumental": True}
    },
    "kie_suno_v4": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "SONIC ENGINE V4.0 [ELITE]",
        "type": "music_generation",
        "model_id": "suno/v4",
        "kie_credits": 12,
        "cost_usd": 0.10,
        "quality": 5,
        "speed": "medium",
        "badge": "🔥 NEURAL ELITE",
        "description": "Next-generation Suno V4 music synthesis for industry-standard production.",
        "capabilities": {"full_song": True, "instrumental": True}
    },
    "kie_suno_v45": {
        "provider": "kie.ai",
        "name": "SONIC ENGINE V4.5 [COMMAND CENTER]",
        "type": "text_to_music",
        "model_id": "suno-v4.5",
        "kie_credits": 20,
        "cost_usd": 0.10,
        "duration": 240,
        "quality": 5,
        "speed": "medium",
        "badge": "🎵 PRO STUDIO",
        "description": "4 dakikaya kadar profesyonel müzik",
        "capabilities": {
            "enhanced_vocals": True,
            "rich_sound": True,
            "song_structure": True
        }
    },
    "kie_suno_v45_plus": {
        "provider": "kie.ai",
        "name": "SONIC ENGINE V4.5 PLUS [COMMAND CENTER]",
        "type": "text_to_music",
        "model_id": "suno-v4.5-plus",
        "kie_credits": 40,
        "cost_usd": 0.20,
        "duration": 480,
        "quality": 5,
        "speed": "slow",
        "badge": "🎼 8 MINUTE CORE",
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
        "name": "ELEVENLABS TURBO 2.5 [COMMAND CENTER]",
        "type": "text_to_speech",
        "model_id": "elevenlabs/text-to-speech-turbo-2-5",
        "kie_credits": 6,
        "cost_usd": 0.03,
        "quality": 5,
        "speed": "fast",
        "badge": "⚡ TURBO CORE",
        "description": "Hızlı, gerçekçi İngilizce seslendirme",
        "capabilities": {"multilingual": False}
    },
    "kie_elevenlabs_multilingual_v2": {
        "provider": "kie.ai",
        "name": "ELEVENLABS OMNI V2 [COMMAND CENTER]",
        "type": "text_to_speech",
        "model_id": "elevenlabs/text-to-speech-multilingual-v2",
        "kie_credits": 12,
        "cost_usd": 0.06,
        "quality": 5,
        "speed": "medium",
        "badge": "🌍 MULTI-CORE",
        "description": "29 dilde yüksek kaliteli seslendirme",
        "capabilities": {"multilingual": True}
    },
    "kie_elevenlabs_v3": {
        "provider": "kie.ai",
        "api_type": "market",
        "name": "NEURAL VOICE CLONE [V3]",
        "type": "text_to_speech",
        "model_id": "elevenlabs/text-to-dialogue-v3",
        "kie_credits": 8,
        "cost_usd": 0.07,
        "quality": 5,
        "speed": "medium",
        "badge": "🗣️ OMNI VOICE",
        "description": "Advanced ElevenLabs V3 neural speech synthesis with emotional depth.",
        "capabilities": {"multilingual": True, "dialogue": True}
    },
    "kie_elevenlabs_sfx": {
        "provider": "kie.ai",
        "name": "SONIC SFX ENGINE [V2]",
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
