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

async def test_createtask():
    if not kie_key: return
    headers = {"Authorization": f"Bearer {kie_key}", "Content-Type": "application/json"}
    
    # from search: elevenlabs/text-to-speech-turbo-2-5
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.kie.ai/v1/jobs/createTask",
            headers=headers, 
            json={
                "model": "elevenlabs/text-to-speech-turbo-2-5",
                "prompt": "Hello this is a voice test.",
                "text": "Hello this is a voice test."
            }
        )
        print(f"Status: {r.status_code}")
        print(f"Body: {r.text[:300]}")

asyncio.run(test_createtask())
