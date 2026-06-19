from dotenv import load_dotenv
load_dotenv()
from core.supabase_client import get_supabase_client
from services.model_comparison_service import model_comparison_service

db = get_supabase_client()

# Insert premium models
for key, model in model_comparison_service.OPENROUTER_PAID_MODELS.items():
    exists = db.table("ai_models").select("id").eq("id", key).execute()
    
    data = {
        "id": key,
        "name": model["name"],
        "category": "language",
        "type": "chat",
        "provider_id": "openrouter",
        "model_id": model["model_id"],
        "cost_usd": model.get("cost_per_1k", 0.001),
        "cost_multiplier": 2.0,
        "quality": 10,
        "speed": 8,
        "badge": "PREMIUM",
        "description": f"Premium model via OpenRouter",
        "is_active": True,
        "is_featured": True,
        "display_order": 10
    }
    
    if not exists.data:
        print(f"Adding: {model['name']}")
        db.table("ai_models").insert(data).execute()
    else:
        print(f"Updating: {model['name']}")
        db.table("ai_models").update(data).eq("id", key).execute()

print("\n✅ All premium models inserted!")
