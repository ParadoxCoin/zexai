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

async def check_schema():
    db = get_supabase_client()
    try:
        # Get one record to check keys
        res = db.table("ai_models").select("*").limit(1).execute()
        if res.data:
            print(f"Columns: {list(res.data[0].keys())}")
        else:
            print("No data in table.")
    except Exception as e:
        print(f"Error checking schema: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
