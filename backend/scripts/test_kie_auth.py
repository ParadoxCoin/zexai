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

async def test_kie():
    if not kie_key:
        print("No API key")
        return
    async with httpx.AsyncClient() as client:
        # Check music generate endpoint just to see what models exist if there's a list
        response = await client.get(
            "https://api.kie.ai/v1/account/info",
            headers={"Authorization": f"Bearer {kie_key}"}
        )
        print("Account Info:", response.status_code, response.text)

asyncio.run(test_kie())
