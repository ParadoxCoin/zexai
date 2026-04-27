
import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from core.database import get_db

async def check_db():
    db = await get_db()
    
    print("--- AI MODELS (ai_models table) ---")
    try:
        res = db.table("ai_models").select("id, name, cost_usd, cost_multiplier, is_active").ilike("id", "%veo%").execute()
        for row in res.data:
            print(row)
    except Exception as e:
        print(f"ai_models error: {e}")
        
    print("\n--- VIDEO MODELS (video_models table) ---")
    try:
        res = db.table("video_models").select("*").ilike("id", "%veo%").execute()
        for row in res.data:
            print(row)
    except Exception as e:
        print(f"video_models table error: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
