import asyncio
import httpx
import os

kie_key = ""
with open(r"c:\Users\my\Desktop\ZexAi\Zex\backend\.env", "rb") as f:
    content = f.read().decode('utf-16' if b'\xff\xfe' in f.read(2) else 'utf-8', errors='ignore')

for line in content.splitlines():
    if line.startswith("KIE_API_KEY="):
        kie_key = line.split("=", 1)[1].strip().strip('"').strip("'")
        break

async def test_endpoints():
    if not kie_key: return
    headers = {"Authorization": f"Bearer {kie_key}"}
    async with httpx.AsyncClient() as client:
        # Test 1: tts/generate
        r1 = await client.post("https://api.kie.ai/v1/tts/generate", headers=headers, json={"text": "hello", "voice": "alloy"})
        print("tts/generate:", r1.status_code, r1.text)
        
        # Test 2: audio/generate
        r2 = await client.post("https://api.kie.ai/v1/audio/generate", headers=headers, json={"text": "hello", "voice": "alloy"})
        print("audio/generate:", r2.status_code, r2.text)

asyncio.run(test_endpoints())
