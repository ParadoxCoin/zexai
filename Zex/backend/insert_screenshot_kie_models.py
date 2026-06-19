import asyncio
import os
import sys
from dotenv import load_dotenv

# Ensure backend dir is in Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()
from core.supabase_client import get_supabase_client
db = get_supabase_client()

SCREENSHOT_KIE_CHAT_MODELS = {
    "kie-gpt-5-5": {
        "name": "GPT-5.5 (Kie Ultra Quality)",
        "model_id": "openai/gpt-5.5",
        "provider_id": "kie",
        "cost_usd": 0.014,
        "cost_multiplier": 10.0,
        "quality": 10,
        "speed": 9,
        "badge": "ULTRA",
        "description": "Next-generation flagship model by OpenAI with absolute unmatched logical intelligence."
    },
    "kie-claude-opus-4-7": {
        "name": "Claude 4.7 Opus (Kie Ultra Quality)",
        "model_id": "anthropic/claude-opus-4-7",
        "provider_id": "kie",
        "cost_usd": 0.015,
        "cost_multiplier": 10.0,
        "quality": 10,
        "speed": 8,
        "badge": "ULTRA",
        "description": "Flagship creative, analytical, and highly advanced coding model by Anthropic."
    },
    "kie-claude-sonnet-4-6": {
        "name": "Claude 4.6 Sonnet (Kie High-Quality)",
        "model_id": "anthropic/claude-sonnet-4-6",
        "provider_id": "kie",
        "cost_usd": 0.008,
        "cost_multiplier": 10.0,
        "quality": 10,
        "speed": 9,
        "badge": "QUALITY",
        "description": "State-of-the-art speed and coding intelligence model by Anthropic."
    },
    "kie-gpt-5-4": {
        "name": "GPT-5.4 (Kie High-Quality)",
        "model_id": "openai/gpt-5.4",
        "provider_id": "kie",
        "cost_usd": 0.008,
        "cost_multiplier": 10.0,
        "quality": 10,
        "speed": 9,
        "badge": "QUALITY",
        "description": "Highly advanced and optimized reasoning flagship model by OpenAI."
    },
    "kie-gemini-3-1-pro": {
        "name": "Gemini 3.1 Pro (Kie Premium)",
        "model_id": "google/gemini-3.1-pro",
        "provider_id": "kie",
        "cost_usd": 0.0035,
        "cost_multiplier": 10.0,
        "quality": 9,
        "speed": 9,
        "badge": "PREMIUM",
        "description": "Google's flagship multi-modal model with massive context capabilities."
    },
    "kie-claude-haiku-4-5": {
        "name": "Claude 4.5 Haiku (Kie Speed)",
        "model_id": "anthropic/claude-haiku-4-5",
        "provider_id": "kie",
        "cost_usd": 0.0015,
        "cost_multiplier": 10.0,
        "quality": 8,
        "speed": 10,
        "badge": "SPEED",
        "description": "Ultra-fast, highly responsive and extremely efficient model by Anthropic."
    },
    "kie-gemini-3-flash": {
        "name": "Gemini 3 Flash (Kie Speed)",
        "model_id": "google/gemini-3-flash",
        "provider_id": "kie",
        "cost_usd": 0.0005,
        "cost_multiplier": 10.0,
        "quality": 8,
        "speed": 10,
        "badge": "SPEED",
        "description": "Extremely rapid response model by Google for lightweight language tasks."
    }
}

async def insert_screenshot_models():
    print("Connecting to DB and inserting Kie Screenshot chat models...")
    for key, model in SCREENSHOT_KIE_CHAT_MODELS.items():
        exists = db.table("ai_models").select("id").eq("id", key).execute()
        
        data = {
            "id": key,
            "name": model["name"],
            "category": "language",
            "type": "chat",
            "provider_id": model["provider_id"],
            "model_id": model["model_id"],
            "cost_usd": model["cost_usd"],
            "cost_multiplier": model["cost_multiplier"],
            "quality": model["quality"],
            "speed": model["speed"],
            "badge": model["badge"],
            "description": model["description"],
            "is_active": True,
            "is_featured": True,
            "display_order": 2
        }
        
        if not exists.data:
            print(f"Adding model: {model['name']}")
            db.table("ai_models").insert(data).execute()
        else:
            print(f"Updating model: {model['name']}")
            db.table("ai_models").update(data).eq("id", key).execute()
            
    print("Done inserting all screenshot Kie premium chat models!")

if __name__ == "__main__":
    asyncio.run(insert_screenshot_models())
