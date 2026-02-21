import asyncio
import os
import sys
from datetime import datetime
import json

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client
from core.config import settings
from core.pollo_models import POLLO_VIDEO_MODELS, POLLO_VIDEO_EFFECTS
from core.audio_models import ALL_AUDIO_MODELS, AUDIO_TOOLS
from core.image_models import ALL_IMAGE_MODELS, IMAGE_TOOLS

# Initialize Supabase Client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

async def seed_supabase():
    print("Starting Supabase seeding...")

    # 1. Seed API Providers
    print("Seeding API Providers...")
    providers = [
        {"id": "pollo", "name": "Pollo.ai", "base_url": "https://api.pollo.ai/v1", "api_key_env_var": "POLLO_API_KEY", "is_active": True},
        {"id": "fal", "name": "FAL.AI", "base_url": "https://api.fal.ai", "api_key_env_var": "FAL_API_KEY", "is_active": True},
        {"id": "replicate", "name": "Replicate", "base_url": "https://api.replicate.com/v1", "api_key_env_var": "REPLICATE_API_KEY", "is_active": True},
        {"id": "elevenlabs", "name": "ElevenLabs", "base_url": "https://api.elevenlabs.io/v1", "api_key_env_var": "ELEVENLABS_API_KEY", "is_active": True},
        {"id": "openai", "name": "OpenAI", "base_url": "https://api.openai.com/v1", "api_key_env_var": "OPENAI_API_KEY", "is_active": True},
        {"id": "google", "name": "Google", "base_url": "https://generativelanguage.googleapis.com/v1beta", "api_key_env_var": "GOOGLE_API_KEY", "is_active": True},
        {"id": "manus", "name": "Manus", "base_url": "https://api.manus.ai/v1", "api_key_env_var": "MANUS_API_KEY", "is_active": True},
    ]

    for p in providers:
        try:
            supabase.table("api_providers").upsert(p).execute()
        except Exception as e:
            print(f"Error seeding provider {p['id']}: {e}")
    print(f"Seeded {len(providers)} providers")

    # 2. Seed AI Models
    print("Seeding AI Models...")
    models_to_seed = []

    # Video Models
    for mid, m in POLLO_VIDEO_MODELS.items():
        models_to_seed.append({
            "id": mid,
            "name": m["name"],
            "provider_id": "pollo", # Assuming all video models go through Pollo for now as per config
            "type": m["type"],
            "cost_multiplier": 2.0, # Default
            "cost_per_unit": m.get("pollo_cost_usd", 0.1),
            "is_active": True,
            "parameters": {
                "duration": m.get("duration"),
                "quality": m.get("quality"),
                "speed": m.get("speed"),
                "badge": m.get("badge"),
                "description": m.get("description")
            },
            "created_at": datetime.utcnow().isoformat()
        })
        
    # Video Effects (as models)
    for mid, m in POLLO_VIDEO_EFFECTS.items():
        models_to_seed.append({
            "id": mid,
            "name": m["name"],
            "provider_id": "pollo",
            "type": "video_effect",
            "cost_multiplier": 2.0,
            "cost_per_unit": m.get("pollo_cost_usd", 0.1),
            "is_active": True,
            "parameters": {
                "icon": m.get("icon"),
                "category": m.get("category"),
                "requires_two_images": m.get("requires_two_images"),
                "description": m.get("description")
            },
            "created_at": datetime.utcnow().isoformat()
        })

    # Audio Models
    for mid, m in ALL_AUDIO_MODELS.items():
        provider_map = {"ElevenLabs": "elevenlabs", "Replicate": "replicate", "OpenAI Whisper": "openai"}
        pid = provider_map.get(m["provider"], "replicate").lower()
        
        models_to_seed.append({
            "id": mid,
            "name": m["name"],
            "provider_id": pid,
            "type": m["type"],
            "cost_multiplier": 2.0,
            "cost_per_unit": m.get("cost_usd", 0.01) if "cost_usd" in m else 0.0, # Special handling for per_char
            "is_active": True,
            "parameters": {
                "quality": m.get("quality"),
                "speed": m.get("speed"),
                "badge": m.get("badge"),
                "description": m.get("description"),
                "cost_per_char": m.get("cost_per_char")
            },
            "created_at": datetime.utcnow().isoformat()
        })

    # Image Models
    for mid, m in ALL_IMAGE_MODELS.items():
        provider_map = {"FAL.AI": "fal", "Replicate": "replicate", "Pollo.ai": "pollo"}
        pid = provider_map.get(m["provider"], "fal").lower()
        
        models_to_seed.append({
            "id": mid,
            "name": m["name"],
            "provider_id": pid,
            "type": m["type"],
            "cost_multiplier": 2.0,
            "cost_per_unit": m.get("cost_usd", 0.01),
            "is_active": True,
            "parameters": {
                "quality": m.get("quality"),
                "speed": m.get("speed"),
                "badge": m.get("badge"),
                "description": m.get("description")
            },
            "created_at": datetime.utcnow().isoformat()
        })
        
    # Chat Models (Hardcoded for now)
    chat_models = [
        {"id": "gpt-4o", "name": "GPT-4o", "provider_id": "openai", "type": "chat", "cost_per_unit": 0.01, "description": "Most capable model"},
        {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "provider_id": "openai", "type": "chat", "cost_per_unit": 0.01, "description": "High intelligence"},
        {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "provider_id": "openai", "type": "chat", "cost_per_unit": 0.001, "description": "Fast and cheap"},
        {"id": "claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "provider_id": "anthropic", "type": "chat", "cost_per_unit": 0.003, "description": "Balanced intelligence"},
    ]
    
    for m in chat_models:
        models_to_seed.append({
            "id": m["id"],
            "name": m["name"],
            "provider_id": m["provider_id"],
            "type": m["type"],
            "cost_multiplier": 2.0,
            "cost_per_unit": m["cost_per_unit"],
            "is_active": True,
            "parameters": {
                "description": m["description"]
            },
            "created_at": datetime.utcnow().isoformat()
        })

    # Batch insert models
    # Supabase might have limits on batch size, so let's do it in chunks or one by one for safety
    print(f"Inserting {len(models_to_seed)} models...")
    for model in models_to_seed:
        try:
            # Check if exists to avoid overwriting custom changes if we want, but upsert is safer for seeding
            supabase.table("ai_models").upsert(model).execute()
        except Exception as e:
            print(f"Error seeding model {model['id']}: {e}")

    print("Seeded AI Models")
    print("Supabase seeding completed!")

if __name__ == "__main__":
    asyncio.run(seed_supabase())
