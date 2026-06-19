
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client

async def check_db():
    load_dotenv()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("Missing Supabase credentials")
        return
        
    supabase = create_client(url, key)
    
    print("--- AI MODELS (ai_models table) ---")
    res = supabase.table("ai_models").select("id, name, cost_usd, cost_multiplier, is_active").ilike("id", "%veo%").execute()
    for row in res.data:
        print(row)
        
    print("\n--- VIDEO MODELS (video_models table) ---")
    try:
        res = supabase.table("video_models").select("id, name, cost_usd, cost_multiplier, is_active, duration_options").ilike("id", "%veo%").execute()
        for row in res.data:
            print(row)
    except Exception as e:
        print(f"video_models table error: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
