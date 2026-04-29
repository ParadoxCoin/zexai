import httpx
import os
import json

def check_supabase():
    # Attempt to find Supabase config from env or files
    # Actually, I can just use the backend config if I could read it
    # But I'll try to find the .env file first
    env_path = r"c:\Users\my\Desktop\ZexAi\Zex\backend\.env"
    supabase_url = None
    supabase_key = None
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_URL='):
                    supabase_url = line.split('=')[1].strip()
                if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                    supabase_key = line.split('=')[1].strip()
                if not supabase_key and line.startswith('SUPABASE_KEY='):
                    supabase_key = line.split('=')[1].strip()

    if not supabase_url or not supabase_key:
        print("Supabase config not found in .env")
        return

    print(f"Connecting to: {supabase_url}")
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}"
    }
    
    try:
        # Check video_effects table
        response = httpx.get(f"{supabase_url}/rest/v1/video_effects?select=*", headers=headers)
        if response.status_code == 200:
            effects = response.json()
            print(f"\nFound {len(effects)} effects in database:")
            for e in effects:
                print(f"- {e.get('id')}: {e.get('name')} (Active: {e.get('is_active')}, Category: {e.get('category')})")
        else:
            print(f"Failed to fetch effects: {response.status_code} {response.text}")
            
        # Check effect_packages if exists
        response = httpx.get(f"{supabase_url}/rest/v1/video_effect_packages?select=*", headers=headers)
        if response.status_code == 200:
            packages = response.json()
            print(f"\nFound {len(packages)} packages in database:")
            for p in packages:
                print(f"- {p.get('id')}: {p.get('name')}")
        else:
            print(f"Note: video_effect_packages table might not exist (Status: {response.status_code})")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_supabase()
