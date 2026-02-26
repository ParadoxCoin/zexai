import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
from core.supabase_client import get_supabase_client
db = get_supabase_client()

from services.model_comparison_service import model_comparison_service

async def migrate_models():
    all_free = {**model_comparison_service.GROQ_MODELS, **model_comparison_service.OPENROUTER_FREE_MODELS}
    
    for key, model in all_free.items():
        # Check if exists
        exists = db.table("ai_models").select("id").eq("id", key).execute()
        
        data = {
            "id": key,
            "name": model["name"],
            "category": "language",
            "type": "chat",
            "provider_id": model["provider"],
            "model_id": model["model_id"],
            "cost_usd": 0.0,
            "cost_multiplier": 0.0,
            "quality": 8,
            "speed": 10,
            "badge": "FREE",
            "description": f"Free tier model provided via {model['provider']}",
            "is_active": True,
            "is_featured": True if model['tier'] == 'free' else False,
            "display_order": 1
        }
        
        if not exists.data:
            print(f"Adding model: {model['name']}")
            db.table("ai_models").insert(data).execute()
        else:
            print(f"Updating model: {model['name']}")
            db.table("ai_models").update(data).eq("id", key).execute()

asyncio.run(migrate_models())
