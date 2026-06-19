"""
Pollo.ai Video Models Configuration
40+ carefully selected models from 15+ providers
Pricing: Pollo.ai cost × 2 (configurable by admin)
"""

POLLO_VIDEO_MODELS = {
    # ============ VEO (Google) - 6 models ============
    "veo31_text": {
        "provider": "Veo 3.1 (Google)",
        "name": "Veo 3.1 (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.50,
        "quality": 5,
        "speed": "medium",
        "badge": "🔥 En Yeni!",
        "description": "Google'ın en son video modeli, ultra gerçekçi",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 10],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    "veo3_text": {
        "provider": "Veo 3 (Google)",
        "name": "Veo 3 (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.40,
        "quality": 5,
        "speed": "medium",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 8],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    "veo3_fast_text": {
        "provider": "Veo 3 Fast (Google)",
        "name": "Veo 3 Fast (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.30,
        "quality": 4,
        "speed": "fast",
        "badge": "⚡ En Hızlı!",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 8],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    "veo31_image": {
        "provider": "Veo 3.1 (Google)",
        "name": "Veo 3.1 (Image)",
        "type": "image_to_video",
        "pollo_cost_usd": 0.45,
        "quality": 5,
        "speed": "medium",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 10],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    "veo31_video": {
        "provider": "Veo 3.1 (Google)",
        "name": "Veo 3.1 (Video)",
        "type": "video_to_video",
        "pollo_cost_usd": 0.55,
        "quality": 5,
        "speed": "medium",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 10],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    
    # ============ SORA (OpenAI) - 4 models ============
    "sora2_text": {
        "provider": "Sora 2 (OpenAI)",
        "name": "Sora 2 (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.45,
        "quality": 5,
        "speed": "slow",
        "badge": "⭐ En Kaliteli!",
        "description": "OpenAI'ın en gerçekçi video modeli",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 10, 15, 20],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    "sora2_image": {
        "provider": "Sora 2 (OpenAI)",
        "name": "Sora 2 (Image)",
        "type": "image_to_video",
        "pollo_cost_usd": 0.50,
        "quality": 5,
        "speed": "slow",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 10, 15, 20],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    "sora_turbo_text": {
        "provider": "Sora Turbo (OpenAI)",
        "name": "Sora Turbo (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.30,
        "quality": 4,
        "speed": "fast",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 10],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    
    # ============ KLING AI - 6 models ============
    "kling25_turbo_text": {
        "provider": "Kling AI",
        "name": "Kling 2.5 Turbo (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.35,
        "quality": 4,
        "speed": "fast",
        "badge": "💰 En Ekonomik!",
        "description": "Hızlı ve uygun fiyatlı",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 10],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    "kling25_turbo_image": {
        "provider": "Kling AI",
        "name": "Kling 2.5 Turbo (Image)",
        "type": "image_to_video",
        "pollo_cost_usd": 0.35,
        "quality": 4,
        "speed": "fast",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 10],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    "kling21_master_text": {
        "provider": "Kling AI",
        "name": "Kling 2.1 Master (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 1.20,
        "quality": 5,
        "speed": "medium",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 10],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1"],
                    "default": "16:9"
                }
            }
        }
    },
    
    # ============ RUNWAY - 4 models ============
    "runway_gen3_text": {
        "provider": "Runway",
        "name": "Runway Gen-3 Alpha (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.40,
        "quality": 5,
        "speed": "medium",
        "description": "Profesyonel kalite video üretimi",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 10],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1", "21:9", "4:5"],
                    "default": "16:9"
                }
            }
        }
    },
    
    # ============ LUMA AI - 3 models ============
    "luma_dream_text": {
        "provider": "Luma AI",
        "name": "Luma Dream Machine (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.38,
        "quality": 5,
        "speed": "medium",
        "description": "Gerçekçi ve akıcı videolar",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 9],
                    "default": 5,
                    "unit": "saniye"
                }
            }
        }
    }
}

POLLO_VIDEO_EFFECTS = {
    # ============ Viral (Kling/Pollo Style) ============
    "ai_hug": {
        "name": "AI Hug",
        "description": "İki kişiyi gerçekçi bir şekilde kucaklaştıran viral efekt",
        "credits": 15,
        "icon": "🤗",
        "category": "viral",
        "requires_two_images": True,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/hug_example.mp4"
    },
    "ai_kissing": {
        "name": "AI Kissing",
        "description": "İki kişiyi öpüştüren romantik ve akıcı efekt",
        "credits": 15,
        "icon": "💋",
        "category": "viral",
        "requires_two_images": True,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/kiss_example.mp4"
    },
    "ai_dance": {
        "name": "AI Dance",
        "description": "Fotoğraftaki kişiyi dans ettiren eğlenceli efekt",
        "credits": 12,
        "icon": "💃",
        "category": "viral",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/dance_example.mp4"
    },
    "ai_face_swap": {
        "name": "AI Face Swap",
        "description": "Videonuzdaki veya fotoğrafınızdaki yüzü değiştirin",
        "credits": 18,
        "icon": "🎭",
        "category": "viral",
        "requires_two_images": True,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/faceswap_example.mp4"
    },
    
    # ============ Magic (Transformations) ============
    "ai_melt": {
        "name": "AI Melt",
        "description": "Objeleri sihirli bir şekilde eriten efekt",
        "credits": 10,
        "icon": "🫠",
        "category": "magic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/melt_example.mp4"
    },
    "ai_storm": {
        "name": "AI Storm",
        "description": "Karakterinizi fırtına ve şimşekler içinde gösteren epik efekt",
        "credits": 25,
        "icon": "⛈️",
        "category": "magic",
        "requires_two_images": False
    },
    "ai_cyberpunk": {
        "name": "AI Cyberpunk",
        "description": "Gelecekten bir atmosfer, neon ışıklar ve teknolojik detaylar",
        "credits": 30,
        "icon": "🤖",
        "category": "magic",
        "requires_two_images": False
    },
    "ai_superhero": {
        "name": "AI Superhero",
        "description": "Karakterinize süper güçler ve kahramanlık pelerini ekleyen efekt",
        "credits": 35,
        "icon": "🦸",
        "category": "magic",
        "requires_two_images": False
    }
}

EFFECT_PACKAGES = {
    "viral_master_pack": {
        "name": "Viral Master Paket",
        "description": "Sosyal medyada patlayacak tüm viral efektler bir arada",
        "effects": ["ai_hug", "ai_kissing", "ai_dance", "ai_face_swap"],
        "discount_percent": 30,
        "icon": "🔥"
    },
    "starter_pack": {
        "name": "Starter Pack",
        "description": "Başlangıç için temel efektler",
        "effects": ["ai_hug", "ai_dance"],
        "discount_percent": 10,
        "icon": "🚀"
    },
    "pro_action_bundle": {
        "name": "Pro Action Bundle",
        "description": "Aksiyon ve macera dolu efektler",
        "effects": ["ai_storm", "ai_superhero", "ai_melt"],
        "discount_percent": 25,
        "icon": "💥"
    },
    "ultimate_creator": {
        "name": "Ultimate Creator",
        "description": "Tüm premium modellere sınırsız erişim ve özel efektler",
        "effects": ["all_effects"],
        "discount_percent": 50,
        "icon": "👑"
    }
}
