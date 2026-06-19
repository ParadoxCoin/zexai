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

async def get_models():
    if not kie_key:
        print("No API key found")
        return
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.kie.ai/v1/models",
            headers={"Authorization": f"Bearer {kie_key}"}
        )
        if response.status_code == 200:
            models = response.json()
            # print all model IDs to a file just to be sure
            with open("models.txt", "w") as f:
                for m in models.get("data", []):
                    f.write(m.get("id", "") + "\n")
            
            audio_models = [m for m in models.get("data", []) if "audio" in m.get("id", "").lower() or "tts" in m.get("id", "").lower() or "speech" in m.get("id", "").lower() or "voice" in m.get("id", "").lower() or ("suno" in m.get("id", "").lower()) or ("kling" in m.get("id", "").lower())]
            print("Audio/TTS Models found:")
            for m in audio_models:
                print(f"- {m.get('id')}")
        else:
            print(f"Error: {response.status_code} {response.text}")

asyncio.run(get_models())
