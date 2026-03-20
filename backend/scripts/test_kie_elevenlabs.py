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

async def test_elevenlabs():
    if not kie_key: return
    headers = {"Authorization": f"Bearer {kie_key}", "Content-Type": "application/json"}
    
    # We will try the standard OpenAI audio/speech endpoint but with an ElevenLabs model name
    # since Kie.ai sometimes maps standard endpoints to these models.
    # From screenshot, model might be something like "elevenlabs", "elevenlabs-v3", etc.
    
    models_to_test = ["elevenlabs", "eleven-monolingual-v1", "eleven-multilingual-v2", "elevenlabs-v3"]
    
    async with httpx.AsyncClient() as client:
        # First, query the models endpoint to get the exact ID since the previous script failed with 404
        # Wait, the previous script failed because I used /v1/models instead of /v1/models (which might be under a different path or just standard OpenAI)
        
        for model in models_to_test:
            print(f"\nTesting model {model} with /v1/audio/speech...")
            r = await client.post(
                "https://api.kie.ai/v1/audio/speech",
                headers=headers, 
                json={
                    "model": model,
                    "input": "Testing elevenlabs voice generation.",
                    "voice": "alloy"
                }
            )
            print(r.status_code, r.text[:200])

asyncio.run(test_elevenlabs())
