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
    # "veo31_text_5s": {
    #     "provider": "Veo 3.1 (Google)",
    #     "name": "Veo 3.1, 5s, text to video",
    #     "type": "text_to_video",
    #     "duration": 5,
    #     "pollo_cost_usd": 0.50,
    #     "quality": 5,
    #     "speed": "medium",
    #     "badge": "🔥 En Yeni!",
    #     "description": "Google'ın en son video modeli, ultra gerçekçi"
    # },
    # "veo31_text_10s": {
    #     "provider": "Veo 3.1 (Google)",
    #     "name": "Veo 3.1, 10s, text to video",
    #     "type": "text_to_video",
    #     "duration": 10,
    #     "pollo_cost_usd": 1.00,
    #     "quality": 5,
    #     "speed": "medium",
    #     "badge": "🔥 En Yeni!"
    # },
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
    # "sora2_text_5s": {
    #     "provider": "Sora 2 (OpenAI)",
    #     "name": "Sora 2, 5s, text to video",
    #     "type": "text_to_video",
    #     "duration": 5,
    #     "pollo_cost_usd": 0.45,
    #     "quality": 5,
    #     "speed": "slow",
    #     "badge": "⭐ En Kaliteli!",
    #     "description": "OpenAI'ın en gerçekçi video modeli"
    # },
    # "sora2_text_10s": {
    #     "provider": "Sora 2 (OpenAI)",
    #     "name": "Sora 2, 10s, text to video",
    #     "type": "text_to_video",
    #     "duration": 10,
    #     "pollo_cost_usd": 0.90,
    #     "quality": 5,
    #     "speed": "slow",
    #     "badge": "⭐ En Kaliteli!"
    # },
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
    # "kling25_turbo_text_5s": {
    #     "provider": "Kling AI",
    #     "name": "Kling 2.5 Turbo, 5s, text to video",
    #     "type": "text_to_video",
    #     "duration": 5,
    #     "pollo_cost_usd": 0.35,
    #     "quality": 4,
    #     "speed": "fast",
    #     "badge": "💰 En Ekonomik!",
    #     "description": "Hızlı ve uygun fiyatlı"
    # },
    # "kling25_turbo_text_10s": {
    #     "provider": "Kling AI",
    #     "name": "Kling 2.5 Turbo, 10s, text to video",
    #     "type": "text_to_video",
    #     "duration": 10,
    #     "pollo_cost_usd": 0.70,
    #     "quality": 4,
    #     "speed": "fast",
    #     "badge": "💰 En Ekonomik!"
    # },
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
    # "kling21_master_text_5s": {
    #     "provider": "Kling AI",
    #     "name": "Kling 2.1 Master, 5s, text to video",
    #     "type": "text_to_video",
    #     "duration": 5,
    #     "pollo_cost_usd": 1.20,
    #     "quality": 5,
    #     "speed": "medium"
    # },
    # "kling21_master_text_10s": {
    #     "provider": "Kling AI",
    #     "name": "Kling 2.1 Master, 10s, text to video",
    #     "type": "text_to_video",
    #     "duration": 10,
    #     "pollo_cost_usd": 2.40,
    #     "quality": 5,
    #     "speed": "medium"
    # },
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
    # \"runway_gen3_text_5s\": {...} - commented out
    # \"runway_gen3_text_10s\": {...} - commented out
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
    # ============ Romantic Effects ============
    "ai_kissing": {
        "name": "AI Kissing",
        "description": "İki kişiyi öpüştüren viral efekt",
        "pollo_cost_usd": 0.10,
        "icon": "💋",
        "category": "romantic",
        "requires_two_images": True
    },
    "ai_hug": {
        "name": "AI Hug",
        "description": "İki kişiyi sarılan efekt",
        "pollo_cost_usd": 0.10,
        "icon": "🤗",
        "category": "romantic",
        "requires_two_images": True
    },
    
    # ============ Transform Effects ============
    "earth_zoom": {
        "name": "Earth Zoom In",
        "description": "Dünya'dan fotoğrafınıza zoom efekti",
        "pollo_cost_usd": 0.15,
        "icon": "🌍",
        "category": "transform",
        "requires_two_images": False
    },
    "360_rotation": {
        "name": "360° Rotation",
        "description": "Fotoğrafı 360 derece döndürme",
        "pollo_cost_usd": 0.12,
        "icon": "🔄",
        "category": "transform",
        "requires_two_images": False
    },
    "zoom_out": {
        "name": "AI Zoom Out",
        "description": "Fotoğraftan uzaklaşma efekti",
        "pollo_cost_usd": 0.10,
        "icon": "🔍",
        "category": "transform",
        "requires_two_images": False
    },
    
    # ============ Celebrity & Fun ============
    "celebrity_selfie": {
        "name": "AI Selfie with Celebrities",
        "description": "Ünlülerle selfie çek",
        "pollo_cost_usd": 0.20,
        "icon": "🌟",
        "category": "fun",
        "requires_two_images": False
    },
    "polaroid_duo": {
        "name": "Polaroid Duo",
        "description": "Polaroid fotoğraf efekti",
        "pollo_cost_usd": 0.08,
        "icon": "📸",
        "category": "fun",
        "requires_two_images": False
    },
    "ai_caricature": {
        "name": "AI Caricature Maker",
        "description": "Karikatür efekti",
        "pollo_cost_usd": 0.10,
        "icon": "🎨",
        "category": "fun",
        "requires_two_images": False
    },
    "baby_filter": {
        "name": "AI Baby Filter",
        "description": "Bebek yüzü filtresi",
        "pollo_cost_usd": 0.10,
        "icon": "👶",
        "category": "fun",
        "requires_two_images": False
    },
    
    # ============ Animation ============
    "anime_style": {
        "name": "AI Anime Style",
        "description": "Anime karakterine dönüştür",
        "pollo_cost_usd": 0.12,
        "icon": "🎌",
        "category": "animation",
        "requires_two_images": False
    },
    "cartoon_style": {
        "name": "AI Cartoon Style",
        "description": "Çizgi film karakterine dönüştür",
        "pollo_cost_usd": 0.12,
        "icon": "🎬",
        "category": "animation",
        "requires_two_images": False
    },
    
    # ============ Avatar ============
    "talking_avatar": {
        "name": "Photo to Video Avatar",
        "description": "Konuşan avatar oluştur",
        "pollo_cost_usd": 0.25,
        "icon": "🗣️",
        "category": "avatar",
        "requires_two_images": False
    },
    "singing_avatar": {
        "name": "AI Singing Avatar",
        "description": "Şarkı söyleyen avatar",
        "pollo_cost_usd": 0.30,
        "icon": "🎤",
        "category": "avatar",
        "requires_two_images": False
    },
    
    # ============ Time Effects ============
    "age_progression": {
        "name": "AI Age Progression",
        "description": "Yaşlandırma efekti",
        "pollo_cost_usd": 0.15,
        "icon": "👴",
        "category": "time",
        "requires_two_images": False
    },
    "age_regression": {
        "name": "AI Age Regression",
        "description": "Gençleştirme efekti",
        "pollo_cost_usd": 0.15,
        "icon": "👦",
        "category": "time",
        "requires_two_images": False
    },
    
    # ============ Style Transfer ============
    "oil_painting": {
        "name": "AI Oil Painting",
        "description": "Yağlı boya resim efekti",
        "pollo_cost_usd": 0.10,
        "icon": "🖼️",
        "category": "style",
        "requires_two_images": False
    },
    "watercolor": {
        "name": "AI Watercolor",
        "description": "Sulu boya efekti",
        "pollo_cost_usd": 0.10,
        "icon": "🎨",
        "category": "style",
        "requires_two_images": False
    },
    
    # ============ Motion ============
    "parallax_3d": {
        "name": "3D Parallax Effect",
        "description": "3D derinlik efekti",
        "pollo_cost_usd": 0.18,
        "icon": "📐",
        "category": "motion",
        "requires_two_images": False
    },
    "slow_motion": {
        "name": "AI Slow Motion",
        "description": "Ağır çekim efekti",
        "pollo_cost_usd": 0.12,
        "icon": "⏱️",
        "category": "motion",
        "requires_two_images": False
    },
    
    # ============ Background ============
    "background_removal": {
        "name": "AI Background Removal",
        "description": "Arka plan kaldırma",
        "pollo_cost_usd": 0.08,
        "icon": "✂️",
        "category": "background",
        "requires_two_images": False
    },
    "background_change": {
        "name": "AI Background Change",
        "description": "Arka plan değiştirme",
        "pollo_cost_usd": 0.12,
        "icon": "🌄",
        "category": "background",
        "requires_two_images": False
    }
}

# Total: 21 effects across 8 categories

EFFECT_PACKAGES = {
    "romantic_pack": {
        "name": "Romantik Paket",
        "description": "Sevgilinizle viral videolar için",
        "effects": ["ai_kissing", "ai_hug", "360_rotation"],
        "discount_percent": 20,
        "icon": "💕"
    },
    "viral_pack": {
        "name": "Viral Paket",
        "description": "TikTok ve Instagram için",
        "effects": ["celebrity_selfie", "earth_zoom", "ai_caricature", "baby_filter"],
        "discount_percent": 22,
        "icon": "🔥"
    },
    "animation_pack": {
        "name": "Animasyon Paketi",
        "description": "Çizgi film ve anime efektleri",
        "effects": ["anime_style", "cartoon_style", "oil_painting", "watercolor"],
        "discount_percent": 18,
        "icon": "🎨"
    },
    "avatar_pack": {
        "name": "Avatar Paketi",
        "description": "Konuşan ve şarkı söyleyen avatarlar",
        "effects": ["talking_avatar", "singing_avatar", "parallax_3d"],
        "discount_percent": 25,
        "icon": "🗣️"
    },
    "transform_pack": {
        "name": "Dönüşüm Paketi",
        "description": "Yaş, stil ve hareket efektleri",
        "effects": ["age_progression", "age_regression", "slow_motion", "zoom_out"],
        "discount_percent": 20,
        "icon": "✨"
    }
}

# Total: 5 effect packages

