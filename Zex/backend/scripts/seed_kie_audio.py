import os
import sys
import asyncio

# Read env manually
with open(r"c:\Users\my\Desktop\ZexAi\Zex\backend\.env", "rb") as f:
    raw_bytes = f.read()
    content = raw_bytes.decode('utf-16' if b'\xff\xfe' in raw_bytes[:2] else 'utf-8', errors='ignore').replace('\x00', '')

for line in content.splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        v_clean = v.split("#")[0].strip().strip('"').strip("'")
        os.environ[k.strip()] = v_clean

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.supabase_client import get_supabase_client
from core.kie_models import KIE_TTS_MODELS, KIE_MUSIC_MODELS

async def seed_audio_models():
    """Seed Kie.ai audio models into the Supabase database."""
    db = get_supabase_client()
    
    # Combine models
    all_audio_models = {**KIE_TTS_MODELS, **KIE_MUSIC_MODELS}
    
    success_count = 0
    error_count = 0
    
    for model_id, model_data in all_audio_models.items():
        try:
            # Map cost appropriately
            # If cost_usd is provided, that's typically per 1000 chars or per request depending on type
            # We map this to cost_per_unit
            cost_usd = float(model_data.get("cost_usd", 0.0))
            if model_data.get("type") == "text_to_speech":
                # Typically DB expects cost per unit, 
                # audio.py multiplies cost_per_unit * (char_count / 1000)
                # KIE cost is per 1000 characters
                cost_per_unit = cost_usd
            elif model_data.get("type") == "music_generation":
                # DB expects cost per request
                cost_per_unit = cost_usd
            else:
                cost_per_unit = cost_usd
                
            db_record = {
                "id": model_id,
                "name": model_data.get("name"),
                "description": model_data.get("description", ""),
                "category": "audio",
                "type": model_data.get("type"),
                "provider": "kie.ai",
                "provider_id": "kie",
                "model_id": model_data.get("model_id"),
                "is_active": True,
                "cost_usd": cost_per_unit,
                "cost_multiplier": 2.0,  # Mark up
            }
            
            # Upsert into ai_models
            db.table("ai_models").upsert(db_record).execute()
            success_count += 1
            print(f"✅ Upserted model: {model_id}")
            
        except Exception as e:
            error_count += 1
            print(f"❌ Error upserting model {model_id}: {e}")
            
    print(f"\nDone. Successfully upserted {success_count} models. {error_count} errors.")

if __name__ == "__main__":
    asyncio.run(seed_audio_models())
