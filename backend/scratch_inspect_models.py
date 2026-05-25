from dotenv import load_dotenv
load_dotenv()
from core.supabase_client import get_supabase_client

db = get_supabase_client()
res = db.table("ai_models").select("id, name, category, type, provider_id, model_id, cost_usd, is_active").execute()
print(f"Total models in DB: {len(res.data) if res.data else 0}")
if res.data:
    for m in res.data:
        print(f"- ID: {m['id']}, Name: {m['name']}, Cat: {m['category']}, Type: {m['type']}, Prov: {m['provider_id']}, Active: {m['is_active']}, Cost: {m['cost_usd']}")
else:
    print("No models found.")
