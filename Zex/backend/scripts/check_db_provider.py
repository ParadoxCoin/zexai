import asyncio
import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
with open(r"c:\Users\my\Desktop\ZexAi\Zex\backend\.env", "rb") as f:
    raw_bytes = f.read()
    content = raw_bytes.decode('utf-16' if b'\xff\xfe' in raw_bytes[:2] else 'utf-8', errors='ignore').replace('\x00', '')

for line in content.splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        v_clean = v.split("#")[0].strip().strip('"').strip("'")
        os.environ[k.strip()] = v_clean

from core.supabase_client import get_supabase_client

async def check():
    db = get_supabase_client()
    res = db.table("ai_models").select("*").eq("id", "kie_elevenlabs_turbo_25").execute()
    print("DB Record:", res.data)

if __name__ == "__main__":
    asyncio.run(check())
