
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
    
    count = 0
    for key, model in KIE_VIDEO_MODELS.items():
        model_id = model["model_id"]
        print(f"Syncing {model_id}...")
        
        update_data = {
            "base_name": model.get("base_name"),
            "version_name": model.get("version_name"),
            "durations": model.get("durations"),
            "resolutions": model.get("resolutions"),
            "slider_duration": model.get("slider_duration", False),
            "credits": model.get("kie_credits", 0),
            "quality": model.get("quality"),
            "speed": model.get("speed"),
            "capabilities": model.get("capabilities", {}),
            "display_name": model.get("name"),
            "is_active": True
        }
        
        # Update in 'video_models' table
        try:
            # First try update
            response = supabase.table("video_models").update(update_data).eq("id", model_id).execute()
            if response.data:
                print(f"Updated {model_id}")
                count += 1
            else:
                # If update failed (no match), try upsert or log
                print(f"Model {model_id} not found in database. Attempting to insert...")
                insert_data = {**update_data, "id": model_id, "provider_id": "kie", "model_type": "text_to_video"}
                ins_resp = supabase.table("video_models").insert(insert_data).execute()
                if ins_resp.data:
                    print(f"Inserted NEW model {model_id}")
                    count += 1
        except Exception as e:
            print(f"Error syncing {model_id}: {e}")

    print(f"Sync complete! {count} models updated.")

if __name__ == "__main__":
    sync_metadata()
