import asyncio
import os
import sys
from dotenv import load_dotenv

# Ensure backend dir is in Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()
from core.supabase_client import get_supabase_client
db = get_supabase_client()

KIE_CHAT_MODELS = {
    "kie-gpt-4o": {
        "name": "GPT-4o (Kie High-Quality)",
        "model_id": "openai/gpt-4o",
        "provider_id": "kie",
        "cost_usd": 0.005,
        "cost_multiplier": 10.0,
        "quality": 10,
        "speed": 9,
        "badge": "QUALITY",
        "description": "Flagship high-quality reasoning and coding model by OpenAI via Kie.ai"
    },
    "kie-claude-3-5-sonnet": {
        "name": "Claude 3.5 Sonnet (Kie High-Quality)",
        "model_id": "anthropic/claude-3-5-sonnet",
        "provider_id": "kie",
        "cost_usd": 0.008,
        "cost_multiplier": 10.0,
        "quality": 10,
        "speed": 8,
        "badge": "QUALITY",
        "description": "State-of-the-art coding and language model by Anthropic via Kie.ai"
    },
    "kie-deepseek-r1": {
        "name": "DeepSeek R1 (Kie Reasoning)",
        "model_id": "deepseek/deepseek-r1",
        "provider_id": "kie",
        "cost_usd": 0.003,
        "cost_multiplier": 10.0,
        "quality": 10,
        "speed": 5,
        "badge": "REASONING",
        "description": "Advanced reasoning and deep-thinking model by DeepSeek via Kie.ai"
    },
    "kie-llama-3.1-405b": {
        "name": "Llama 3.1 405B (Kie Premium)",
        "model_id": "meta-llama/llama-3.1-405b-instruct",
        "provider_id": "kie",
        "cost_usd": 0.004,
        "cost_multiplier": 10.0,
        "quality": 9,
        "speed": 7,
        "badge": "PREMIUM",
        "description": "Massive 405B open flagship model by Meta via Kie.ai"
    }
}

async def insert_kie_chat_models():
    print("Connecting to DB and inserting Kie Premium chat models...")
    for key, model in KIE_CHAT_MODELS.items():
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
            "display_order": 5
        }
        
        if not exists.data:
            print(f"Adding model: {model['name']}")
            db.table("ai_models").insert(data).execute()
        else:
            print(f"Updating model: {model['name']}")
            db.table("ai_models").update(data).eq("id", key).execute()
            
    print("Done inserting all Kie premium chat models!")

if __name__ == "__main__":
    asyncio.run(insert_kie_chat_models())
