"""Test KIE API endpoints and find the real 500 error source"""
import os, asyncio, httpx
from dotenv import load_dotenv
load_dotenv('.env')

KIE_KEY = os.getenv('KIE_API_KEY', '')
headers = {'Authorization': f'Bearer {KIE_KEY}', 'Content-Type': 'application/json'}
BASE = 'https://api.kie.ai'

async def test():
    async with httpx.AsyncClient(timeout=15) as client:
        # Test various endpoints to find valid ones
        endpoints_get = [
            '/api/v1/account/info',
            '/api/v1/user/info', 
            '/api/v1/user/balance',
            '/api/v1/balance',
        ]
        print("=== GET endpoints ===")
        for ep in endpoints_get:
            try:
                r = await client.get(f'{BASE}{ep}', headers=headers)
                print(f"  {ep}: {r.status_code} | {r.text[:150]}")
            except Exception as e:
                print(f"  {ep}: EXCEPTION {e}")

        # Try a small image generation
        print("\n=== Test image generation (Z-Image) ===")
        payload = {
            "model": "z-image",
            "input": {
                "prompt": "a red apple",
                "resolution": "512x512",
                "aspect_ratio": "1:1"
            }
        }
        try:
            r = await client.post(f'{BASE}/api/v1/jobs/createTask', headers=headers, json=payload, timeout=20)
            print(f"  createTask status: {r.status_code}")
            print(f"  createTask response: {r.text[:500]}")
        except Exception as e:
            print(f"  createTask EXCEPTION: {e}")

asyncio.run(test())
