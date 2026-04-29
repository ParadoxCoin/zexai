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
                },
                "mode": {
                    "label": "Kalite Modu",
                    "type": "enum",
                    "values": ["std", "pro"],
                    "default": "std",
                    "labels": {"std": "Standart", "pro": "Profesyonel"}
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
                },
                "mode": {
                    "label": "Kalite Modu",
                    "type": "enum",
                    "values": ["std", "pro"],
                    "default": "std",
                    "labels": {"std": "Standart", "pro": "Profesyonel"}
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
                },
                "mode": {
                    "label": "Kalite Modu",
                    "type": "enum",
                    "values": ["std", "pro"],
                    "default": "pro",
                    "labels": {"std": "Standart", "pro": "Profesyonel"}
                }
            }
        }
    },
    "kling21_master_image_5s": {
        "provider": "Kling AI",
        "name": "Kling 2.1 Master, 5s, image to video",
        "type": "image_to_video",
        "duration": 5,
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
                },
                "mode": {
                    "label": "Kalite Modu",
                    "type": "enum",
                    "values": ["std", "pro"],
                    "default": "pro",
                    "labels": {"std": "Standart", "pro": "Profesyonel"}
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
    "runway_gen3_image": {
        "provider": "Runway",
        "name": "Runway Gen-3 Alpha (Image)",
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
                    "values": ["16:9", "9:16", "1:1", "21:9", "4:5"],
                    "default": "16:9"
                }
            }
        }
    },
    "runway_turbo_text": {
        "provider": "Runway",
        "name": "Runway Turbo (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.25,
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
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "9:21"],
                    "default": "16:9"
                }
            }
        }
    },
    "luma_dream_image": {
        "provider": "Luma AI",
        "name": "Luma Dream Machine (Image)",
        "type": "image_to_video",
        "pollo_cost_usd": 0.40,
        "quality": 5,
        "speed": "medium",
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
    },
    "luma_ray2_text": {
        "provider": "Luma AI",
        "name": "Luma Ray 2 (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.50,
        "quality": 5,
        "speed": "slow",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 9],
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
    
    # ============ PIKA AI - 3 models ============
    "pika20_text": {
        "provider": "Pika AI",
        "name": "Pika 2.0 (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.30,
        "quality": 4,
        "speed": "fast",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [3, 5],
                    "default": 5,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16", "1:1", "4:5", "5:4"],
                    "default": "16:9"
                }
            }
        }
    },
    "pika15_text": {
        "provider": "Pika AI",
        "name": "Pika 1.5 (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.25,
        "quality": 3,
        "speed": "fast",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [3, 5],
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
    "pika20_image": {
        "provider": "Pika AI",
        "name": "Pika 2.0 (Image)",
        "type": "image_to_video",
        "pollo_cost_usd": 0.32,
        "quality": 4,
        "speed": "fast",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [3, 5],
                    "default": 5,
                    "unit": "saniye"
                }
            }
        }
    },
    
    # ============ HAILUO AI - 2 models ============
    "hailuo_minimax_text": {
        "provider": "Hailuo AI",
        "name": "MiniMax Video-01 (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.28,
        "quality": 4,
        "speed": "fast",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 6],
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
    "hailuo_minimax_image": {
        "provider": "Hailuo AI",
        "name": "MiniMax Video-01 (Image)",
        "type": "image_to_video",
        "pollo_cost_usd": 0.30,
        "quality": 4,
        "speed": "fast",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 6],
                    "default": 5,
                    "unit": "saniye"
                }
            }
        }
    },
    
    # ============ VIDU AI - 2 models ============
    "vidu15_text": {
        "provider": "Vidu AI",
        "name": "Vidu 1.5 (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.32,
        "quality": 4,
        "speed": "medium",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [4, 8],
                    "default": 4,
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
    "vidu15_image": {
        "provider": "Vidu AI",
        "name": "Vidu 1.5 (Image)",
        "type": "image_to_video",
        "pollo_cost_usd": 0.35,
        "quality": 4,
        "speed": "medium",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [4, 8],
                    "default": 4,
                    "unit": "saniye"
                }
            }
        }
    },
    
    # ============ PIXVERSE AI - 2 models ============
    "pixverse_v3_text": {
        "provider": "PixVerse AI",
        "name": "PixVerse V3 (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.26,
        "quality": 3,
        "speed": "fast",
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
                    "values": ["16:9", "9:16", "1:1", "4:3"],
                    "default": "16:9"
                }
            }
        }
    },
    "pixverse_v3_image": {
        "provider": "PixVerse AI",
        "name": "PixVerse V3 (Image)",
        "type": "image_to_video",
        "pollo_cost_usd": 0.28,
        "quality": 3,
        "speed": "fast",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5, 8],
                    "default": 5,
                    "unit": "saniye"
                }
            }
        }
    },
    
    # ============ SEEDANCE - 1 model ============
    "seedance_mochi1_text": {
        "provider": "Seedance",
        "name": "Mochi 1 (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.22,
        "quality": 3,
        "speed": "fast",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5],
                    "default": 5,
                    "unit": "saniye"
                }
            }
        }
    },
    
    # ============ WAN AI - 1 model ============
    "wan_cogvideo_text": {
        "provider": "Wan AI",
        "name": "CogVideoX-5B (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.24,
        "quality": 3,
        "speed": "fast",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [6],
                    "default": 6,
                    "unit": "saniye"
                },
                "aspect_ratio": {
                    "label": "En-Boy Oranı",
                    "type": "enum",
                    "values": ["16:9", "9:16"],
                    "default": "16:9"
                }
            }
        }
    },
    
    # ============ HUNYUAN - 2 models ============
    "hunyuan_video_text": {
        "provider": "Hunyuan",
        "name": "Hunyuan Video (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.30,
        "quality": 4,
        "speed": "medium",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5],
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
    "hunyuan_video_image": {
        "provider": "Hunyuan",
        "name": "Hunyuan Video (Image)",
        "type": "image_to_video",
        "pollo_cost_usd": 0.33,
        "quality": 4,
        "speed": "medium",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5],
                    "default": 5,
                    "unit": "saniye"
                }
            }
        }
    },
    
    # ============ MIDJOURNEY - 1 model ============
    "midjourney_video_text": {
        "provider": "Midjourney",
        "name": "Midjourney Video Alpha (Text)",
        "type": "text_to_video",
        "pollo_cost_usd": 0.60,
        "quality": 5,
        "speed": "slow",
        "description": "Sanatsal ve stilize videolar",
        "capabilities": {
            "parameters": {
                "duration": {
                    "label": "Süre",
                    "type": "enum",
                    "values": [5],
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
    }
}

# Total: 30 models from 13 providers

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
    "ai_squish": {
        "name": "AI Squish",
        "description": "Objeleri parmağınızla eziyormuş gibi gösteren efekt",
        "credits": 10,
        "icon": "🤏",
        "category": "magic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/squish_example.mp4"
    },
    "ai_melt": {
        "name": "AI Melt",
        "description": "Objeleri sihirli bir şekilde eriten efekt",
        "credits": 10,
        "icon": "🫠",
        "category": "magic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/melt_example.mp4"
    },
    "ai_inflate": {
        "name": "AI Inflate",
        "description": "Objeleri balon gibi şişiren efekt",
        "credits": 10,
        "icon": "🎈",
        "category": "magic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/inflate_example.mp4"
    },
    "earth_zoom": {
        "name": "Earth Zoom",
        "description": "Uzaydan tam fotoğrafınıza odaklanan zoom efekt",
        "credits": 20,
        "icon": "🌍",
        "category": "magic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/earth_zoom.mp4"
    },
    
    # ============ Cinematic (Motion) ============
    "360_rotation": {
        "name": "360° Orbit",
        "description": "Objenin etrafında tam tur dönen sinematik kamera",
        "credits": 15,
        "icon": "🔄",
        "category": "cinematic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/orbit_example.mp4"
    },
    "parallax_3d": {
        "name": "3D Parallax",
        "description": "Derinlik hissi veren üç boyutlu hareket efekti",
        "credits": 12,
        "icon": "📐",
        "category": "cinematic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/parallax_example.mp4"
    },
    "zoom_out": {
        "name": "Cinematic Zoom Out",
        "description": "Sürekli uzaklaşan profesyonel kamera hareketi",
        "credits": 10,
        "icon": "🔍",
        "category": "cinematic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/zoomout_example.mp4"
    },
    
    # ============ Artistic (Style) ============
    "anime_style": {
        "name": "Anime Style",
        "description": "Fotoğrafınızı akıcı bir anime sahnesine dönüştürür",
        "credits": 12,
        "icon": "🎌",
        "category": "artistic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/anime_example.mp4"
    },
    "cartoon_style": {
        "name": "3D Cartoon",
        "description": "Pixar tarzı bir animasyon karakterine dönüşün",
        "credits": 12,
        "icon": "🎬",
        "category": "artistic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/cartoon_example.mp4"
    },
    "oil_painting": {
        "name": "Oil Painting",
        "description": "Yağlı boya tablosunun canlanması efekti",
        "credits": 10,
        "icon": "🖼️",
        "category": "artistic",
        "requires_two_images": False,
        "example_url": "https://pub-2f767856338b479e951475c754024361.r2.dev/oil_example.mp4"
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
    "magic_motion_pack": {
        "name": "Sihirli Hareket Paketi",
        "description": "Fizik kurallarını zorlayan dönüşüm efektleri",
        "effects": ["ai_squish", "ai_melt", "ai_inflate", "earth_zoom"],
        "discount_percent": 25,
        "icon": "✨"
    },
    "cinematic_pro_pack": {
        "name": "Sinematik Pro Paket",
        "description": "Hollywood kalitesinde kamera hareketleri ve derinlik",
        "effects": ["cinematic_orbit", "parallax_3d", "zoom_out", "wide_lens"],
        "discount_percent": 20,
        "icon": "🎬"
    },
    "anime_art_pack": {
        "name": "Anime & Sanat Paketi",
        "description": "Fotoğrafları sanatsal şaheserlere dönüştüren stiller",
        "effects": ["anime_style", "cartoon_style", "oil_painting", "sketch_art"],
        "discount_percent": 35,
        "icon": "🎌"
    },
    "ultimate_creator_pack": {
        "name": "Ultimate Creator",
        "description": "Tüm premium modellere sınırsız erişim ve özel efektler",
        "effects": ["all_effects"],
        "discount_percent": 50,
        "icon": "👑"
    }
}
