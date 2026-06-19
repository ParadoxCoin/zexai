import asyncio
import os
import sys

# Ensure backend dir is in Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

from core.database import get_db
from core.kie_models import KIE_VIDEO_MODELS
from core.unified_model_registry import model_registry

async def main():
    db = await get_db()
    print("Connecting to DB...")
    
    for model_id, m in KIE_VIDEO_MODELS.items():
        print(f"Adding model: {model_id} ({m.get('name')})")
        
        # Calculate credits for logging
        cost_usd = float(m.get("cost_usd", 0.0))
        cost_multiplier = 2.0
        credits = max(1, int(cost_usd * cost_multiplier * 100))
        
        # Prepare updates payload mimicking the admin panel
        updates = {
            "name": m.get("name"),
            "category": "video",
            "type": m.get("type", "text_to_video"),
            "provider": m.get("provider", "kie.ai"),
            "cost_usd": cost_usd,
            "cost_multiplier": cost_multiplier,
            "credits": credits,
            "quality": int(m.get("quality", 4)),
            "speed": m.get("speed", "medium"),
            "badge": m.get("badge"),
            "description": m.get("description"),
            "is_active": True,
            "duration_options": m.get("durations", [m.get("duration", 5)]),
            "resolutions": m.get("resolutions", ["720p", "1080p"]),
            "per_second_pricing": True,
            "base_duration": m.get("duration", 5)
        }
        
        try:
            await model_registry.update_model(db, model_id, updates)
            print(f"✅ Successfully inserted/updated {model_id}")
        except Exception as e:
            print(f"❌ Failed to update {model_id}: {str(e)}")
            
    print("Done inserting all KIE Video models!")

if __name__ == "__main__":
    asyncio.run(main())
