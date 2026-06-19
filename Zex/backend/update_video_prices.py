# -*- coding: utf-8 -*-
"""
Video model fiyatlarini API endpoint uzerinden gunceller.
PUT /api/v1/admin/video-models/{id}
"""
import os, sys, json, requests
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

API_BASE = "http://localhost:8000/api/v1"
# Backend mock mode - dev modunda dummy token kabul ediyor
HEADERS = {"Authorization": "Bearer dummy", "Content-Type": "application/json"}

updates = [
    {
        "id": "kie_veo3_quality",
        "credits": 440,
        "video_caps": {
            "durations": [4, 6, 8],
            "resolutions": ["720p", "1080p", "4K"],
            "pricing": {
                "4": {"720p": 440, "1080p": 440, "4K": 440},
                "6": {"720p": 660, "1080p": 660, "4K": 660},
                "8": {"720p": 880, "1080p": 880, "4K": 880}
            }
        }
    },
    {
        "id": "kie_veo3_fast",
        "credits": 276,
        "video_caps": {
            "durations": [4, 6, 8],
            "resolutions": ["720p", "1080p"],
            "pricing": {
                "4": {"720p": 276, "1080p": 276},
                "6": {"720p": 414, "1080p": 414},
                "8": {"720p": 552, "1080p": 552}
            }
        }
    },
    {
        "id": "kie_veo31_quality",
        "credits": 516,
        "video_caps": {
            "durations": [4, 6, 8],
            "resolutions": ["720p", "1080p", "4K"],
            "pricing": {
                "4": {"720p": 516, "1080p": 516, "4K": 516},
                "6": {"720p": 774, "1080p": 774, "4K": 774},
                "8": {"720p": 1032, "1080p": 1032, "4K": 1032}
            }
        }
    },
    {
        "id": "kie_veo31_fast",
        "credits": 256,
        "video_caps": {
            "durations": [4, 6, 8],
            "resolutions": ["720p", "1080p"],
            "pricing": {
                "4": {"720p": 256, "1080p": 256},
                "6": {"720p": 384, "1080p": 384},
                "8": {"720p": 512, "1080p": 512}
            }
        }
    },
    {
        "id": "kie_veo31_lite",
        "credits": 140,
        "video_caps": {
            "durations": [4, 6, 8],
            "resolutions": ["720p"],
            "pricing": {
                "4": {"720p": 140},
                "6": {"720p": 210},
                "8": {"720p": 280}
            }
        }
    },
    {
        "id": "kie_sora2_stable_10s",
        "credits": 480,
        "video_caps": {
            "durations": [10],
            "resolutions": ["1080p"],
            "pricing": {"10": {"1080p": 480}}
        }
    },
    {
        "id": "kie_sora2_stable_15s",
        "credits": 555,
        "video_caps": {
            "durations": [15],
            "resolutions": ["1080p"],
            "pricing": {"15": {"1080p": 555}}
        }
    },
    {
        "id": "kie_kling26_audio_10s",
        "credits": 370,
        "video_caps": {
            "durations": [5, 10, 15],
            "resolutions": ["720p", "1080p", "4K"],
            "pricing": {
                "5":  {"720p": 370,  "1080p": 370,  "4K": 370},
                "10": {"720p": 740,  "1080p": 740,  "4K": 740},
                "15": {"720p": 1110, "1080p": 1110, "4K": 1110}
            }
        }
    },
    {
        "id": "kie_kling26_no_audio_10s",
        "credits": 230,
        "video_caps": {
            "durations": [5, 10, 15],
            "resolutions": ["720p", "1080p", "4K"],
            "pricing": {
                "5":  {"720p": 230, "1080p": 230, "4K": 230},
                "10": {"720p": 460, "1080p": 460, "4K": 460},
                "15": {"720p": 690, "1080p": 690, "4K": 690}
            }
        }
    },
    {
        "id": "kie_kling26_audio_5s",
        "credits": 260,
        "video_caps": {
            "durations": [5],
            "resolutions": ["1080p"],
            "pricing": {"5": {"1080p": 260}}
        }
    },
    {
        "id": "kie_kling26_no_audio_5s",
        "credits": 175,
        "video_caps": {
            "durations": [5],
            "resolutions": ["1080p"],
            "pricing": {"5": {"1080p": 175}}
        }
    },
    {
        "id": "kie_wan26_1080p_15s",
        "credits": 1305,
        "video_caps": {
            "durations": [15],
            "resolutions": ["1080p"],
            "pricing": {"15": {"1080p": 1305}}
        }
    },
    {
        "id": "kie_wan26_1080p_10s",
        "credits": 690,
        "video_caps": {
            "durations": [10],
            "resolutions": ["1080p"],
            "pricing": {"10": {"1080p": 690}}
        }
    },
    {
        "id": "kie_wan26_1080p_5s",
        "credits": 295,
        "video_caps": {
            "durations": [5],
            "resolutions": ["1080p"],
            "pricing": {"5": {"1080p": 295}}
        }
    },
    {
        "id": "kie_wan26_720p_10s",
        "credits": 460,
        "video_caps": {
            "durations": [10],
            "resolutions": ["720p"],
            "pricing": {"10": {"720p": 460}}
        }
    },
    {
        "id": "kie_wan26_720p_5s",
        "credits": 205,
        "video_caps": {
            "durations": [5],
            "resolutions": ["720p"],
            "pricing": {"5": {"720p": 205}}
        }
    },
    {
        "id": "kie_grok_video",
        "credits": 80,
        "video_caps": {
            "durations": [6],
            "resolutions": ["720p"],
            "pricing": {"6": {"720p": 80}}
        }
    },
    {
        "id": "kie_hailuo23",
        "credits": 60,
        "video_caps": {
            "durations": [8],
            "resolutions": ["1080p"],
            "pricing": {"8": {"1080p": 60}}
        }
    },
]

print("Video model fiyatlari API uzerinden guncelleniyor...\n")
success = 0
errors = 0

for upd in updates:
    model_id = upd["id"]
    payload = {
        "credits": upd["credits"],
        "video_caps": upd["video_caps"],
        "duration_options": upd["video_caps"]["durations"],
        "resolutions": upd["video_caps"]["resolutions"],
    }
    try:
        r = requests.put(
            f"{API_BASE}/admin/video-models/{model_id}",
            json=payload,
            headers=HEADERS,
            timeout=10
        )
        if r.status_code == 200:
            print(f"  OK {model_id} -> {upd['credits']} kredi")
            success += 1
        else:
            print(f"  FAIL {model_id} -> HTTP {r.status_code}: {r.text[:200]}")
            errors += 1
    except Exception as e:
        print(f"  HATA {model_id} -> {e}")
        errors += 1

print(f"\n{'='*50}")
print(f"Tamamlandi: {success} basarili, {errors} hatali")
