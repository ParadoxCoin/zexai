import asyncio
from core.supabase_client import get_supabase_client

async def check():
    db = get_supabase_client()
    
    print("--- Checking providers table ---")
    try:
        res = db.table("providers").select("*").execute()
        print(f"Success: {len(res.data)} providers found")
        for p in res.data:
            print(f"- ID: {p.get('id')}, Name: {p.get('name')}, Base URL: {p.get('base_url')}, Active: {p.get('is_active')}")
    except Exception as e:
        print(f"Failed: {e}")
        
    print("\n--- Checking provider_keys table ---")
    try:
        res = db.table("provider_keys").select("*").execute()
        print(f"Success: {len(res.data)} keys found")
        for k in res.data:
            key_val = k.get('api_key', '')
            masked = key_val[:4] + "..." + key_val[-4:] if key_val else 'NONE'
            print(f"- Provider: {k.get('provider_id')}, Active: {k.get('is_active')}, Key: {masked}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(check())
