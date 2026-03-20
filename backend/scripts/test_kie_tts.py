import asyncio
import sys
import os

with open(r"c:\Users\my\Desktop\ZexAi\Zex\backend\.env", "rb") as f:
    raw_bytes = f.read()
    content = raw_bytes.decode('utf-16' if b'\xff\xfe' in raw_bytes[:2] else 'utf-8', errors='ignore').replace('\x00', '')

for line in content.splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        v_clean = v.split("#")[0].strip().strip('"').strip("'")
        os.environ[k.strip()] = v_clean

sys.path.append(r"c:\Users\my\Desktop\ZexAi\Zex\backend")

from core.supabase_client import get_supabase_client
from services.kie_service import kie_service

async def test():
    db = get_supabase_client()
    try:
        print("Calling Kie Service TTS...")
        result = await kie_service.generate_tts(
            model_id="elevenlabs-text-to-speech-turbo-2.5",
            text="hello world testing",
            voice_id="alloy"
        )
        print("Success:", result)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
