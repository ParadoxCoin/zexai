
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Add parent directory to path to import core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.kie_models import KIE_VIDEO_MODELS

load_dotenv()

def sync_metadata():
    print("Starting Kie.ai Metadata Sync (Supabase)...")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
        return

    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Mapping for per-second pricing models
    PER_SECOND_MAP = {
        "veo-3-quality": 110,
        "veo-3-fast": 69,
        "veo-3.1-quality": 129,
        "veo-3.1-fast": 64,
        "veo-3.1-lite": 35,
        "kling-2.6-audio": 74,
        "kling-2.6-10s": 46
    }

    count = 0
    for key, model in KIE_VIDEO_MODELS.items():
        model_id = model["model_id"]
        print(f"Syncing {model_id}...")
        
        # Calculate pricing map if applicable
        durations = model.get("durations", [model.get("duration", 5)])
        resolutions = model.get("resolutions", ["1080p"])
        per_second = PER_SECOND_MAP.get(model_id)
        
        pricing = {}
        if per_second:
            for d in durations:
                pricing[str(d)] = {res: int(d * per_second) for res in resolutions}
        else:
            # Fixed pricing
            base_credits = model.get("kie_credits", 100)
            for d in durations:
                pricing[str(d)] = {res: base_credits for res in resolutions}

        video_caps = {
            "durations": durations,
            "resolutions": resolutions,
            "pricing": pricing,
            "base_duration": durations[0] if durations else 5,
            "per_second_pricing": bool(per_second)
        }
        
        update_data = {
            "base_name": model.get("base_name"),
            "version_name": model.get("version_name"),
            "credits": model.get("kie_credits", 0),
            "quality_rating": model.get("quality", 4),
            "duration_options": durations,
            "resolutions": resolutions,
            "video_caps": video_caps,
            "display_name": model.get("name"),
            "is_active": True,
            "provider_id": "kie",
            "model_type": "text_to_video"
        }
        
        try:
            # Upsert into video_models
            response = supabase.table("video_models").upsert({**update_data, "id": model_id}).execute()
            if response.data:
                print(f"Synced {model_id} (credits: {update_data['credits']})")
                count += 1
                
                # Also sync to ai_models (basic info)
                ai_model_data = {
                    "id": model_id,
                    "name": model.get("name"),
                    "category": "video",
                    "type": "text_to_video",
                    "provider": "kie.ai",
                    "cost_usd": float(model.get("cost_usd", 0)),
                    "cost_multiplier": 1.0,
                    "is_active": True,
                    "capabilities": {"video_params": video_caps}
                }
                supabase.table("ai_models").upsert(ai_model_data).execute()
        except Exception as e:
            print(f"Error syncing {model_id}: {e}")

    print(f"Sync complete! {count} models updated.")

if __name__ == "__main__":
    sync_metadata()
