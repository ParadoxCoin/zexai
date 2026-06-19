import asyncio
from core.supabase_client import get_supabase_client
from services.unified_video_service import unified_video_service

async def check():
    db = get_supabase_client()
    
    print("--- Checking model via unified_video_service ---")
    model = await unified_video_service.get_model(db, "kie_kling26_i2v")
    if model:
        print("Model found in cache/registry:")
        for k, v in model.items():
            if k != "video_caps":
                print(f"  {k}: {v}")
            else:
                print(f"  {k}: {str(v)[:200]}...")
    else:
        print("Model NOT found in cache/registry!")
        
    print("\n--- Listing all active video models in cache ---")
    models = await unified_video_service.list_models(db)
    print(f"Found {len(models)} active video models")
    for m in models:
        if "i2v" in m.get("id", "") or "image" in m.get("type", ""):
            print(f"- ID: {m.get('id')}, Name: {m.get('name')}, Type: {m.get('type')}, Provider: {m.get('provider')}")

if __name__ == "__main__":
    asyncio.run(check())
