import os
import sys
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# We need to run this async
import os
import sys
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def migrate_keys():
    print("Migrating keys from .env to Key Vault (Supabase)...")
    
    # We need to ensure settings are loaded and DB is connected
    from core.supabase_client import get_supabase_client
    db = get_supabase_client()
    if not db:
        print("Failed to initialize Supabase client!")
        return
        
    from core.key_vault import get_key_vault
    vault = get_key_vault()
    
    providers_to_add = [
        {"id": "groq", "key": os.getenv("GROQ_API_KEY", "")},
        {"id": "openrouter", "key": os.getenv("OPENROUTER_API_KEY", "")}
    ]

    for p in providers_to_add:
        if not p["key"]:
            print(f"Skipping {p['id']}, no API key found in .env")
            continue
            
        try:
            print(f"Encrypting and storing {p['id']} key...")
            await vault.store_key(
                provider_id=p["id"],
                key_name="primary",
                plain_key=p["key"],
                created_by=None
            )
            print(f"✅ Successfully stored {p['id']} key in vault!")
            
            # Ensure api_providers entry exists
            print(f"Ensuring {p['id']} exists in api_providers...")
            provider_data = {
                "id": p["id"],
                "name": "Groq" if p["id"] == "groq" else "OpenRouter",
                "is_active": True
            }
            # Add base_urls
            if p["id"] == "groq":
                provider_data["base_url"] = "https://api.groq.com/openai/v1/chat/completions"
            else:
                provider_data["base_url"] = "https://openrouter.ai/api/v1/chat/completions"
                
            db.table("api_providers").upsert(provider_data).execute()
            print(f"✅ Successfully updated {p['id']} in api_providers!")
            
        except Exception as e:
            print(f"❌ Error storing {p['id']} key: {e}")

if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    asyncio.run(migrate_keys())
