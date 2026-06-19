
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add parent directory to path to import core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.kie_models import KIE_VIDEO_MODELS

load_dotenv()

async def sync_metadata():
    print("Starting Kie.ai Metadata Sync...")
    
    mongo_url = os.getenv("MONGODB_URL")
    if not mongo_url:
        print("MONGODB_URL not found in .env")
        return

    client = AsyncIOMotorClient(mongo_url)
    db_name = os.getenv("MONGODB_DB_NAME", "ai_saas_prod")
    db = client[db_name]
    
    collection = db["video_models"]
    
    count = 0
    for key, model in KIE_VIDEO_MODELS.items():
        model_id = model["model_id"]
        print(f"🔄 Syncing {model_id}...")
        
        update_data = {
            "base_name": model.get("base_name"),
            "version_name": model.get("version_name"),
            "durations": model.get("durations"),
            "resolutions": model.get("resolutions"),
            "slider_duration": model.get("slider_duration", False)
        }
        
        # Also update credits if they changed
        if "kie_credits" in model:
            update_data["credits"] = model["kie_credits"]

        result = await collection.update_one(
            {"id": model_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            print(f"Updated {model_id}")
            count += 1
        else:
            print(f"No changes for {model_id} (or not found in DB)")

    print(f"Sync complete! {count} models updated.")
    client.close()

if __name__ == "__main__":
    asyncio.run(sync_metadata())
