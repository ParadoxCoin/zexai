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

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.supabase_client import get_supabase_client
from core.audio_models_extended import TTS_MODELS, VOICE_CLONE_MODELS, MUSIC_MODELS, SFX_MODELS

async def seed_all_audio():
    db = get_supabase_client()
    
    success = 0
    errors = 0
    
    def upsert_dict(d, m_type):
        nonlocal success, errors
        for mid, mdata in d.items():
            # Get correct provider mapping
            raw_prov = mdata.get("provider", "").lower()
            if "openai" in raw_prov:
                prov_id = "openai"
            elif "eleven" in raw_prov:
                prov_id = "elevenlabs"
            elif "apollo" in raw_prov or "suno" in raw_prov:
                prov_id = "pollo"
            elif "stable" in raw_prov:
                prov_id = "stability"
            else:
                prov_id = raw_prov
                
            cost = mdata.get("cost_per_char", mdata.get("cost_usd", mdata.get("cost_per_generation", 0.0001)))
            
            db_record = {
                "id": mid,
                "name": mdata.get("name", mid),
                "description": mdata.get("description", ""),
                "category": "audio",
                "type": m_type,
                "provider": mdata.get("provider", "Unknown"),
                "provider_id": prov_id,
                "model_id": mdata.get("provider_model_id", mid),
                "is_active": True,
                "cost_usd": float(cost),
                "cost_multiplier": 2.0
            }
            try:
                db.table("ai_models").upsert(db_record).execute()
                success += 1
                print(f"✅ Upserted {mid}")
            except Exception as e:
                print(f"❌ Error {mid}: {e}")
                errors += 1

    upsert_dict(TTS_MODELS, "text_to_speech")
    upsert_dict(VOICE_CLONE_MODELS, "voice_clone")
    upsert_dict(MUSIC_MODELS, "music_generation")
    upsert_dict(SFX_MODELS, "sound_effects")
    
    print(f"Done! Success: {success}, Errors: {errors}")

if __name__ == "__main__":
    asyncio.run(seed_all_audio())
