"""Send a real generate request and capture the full traceback"""
import os, asyncio, httpx
from dotenv import load_dotenv
load_dotenv('.env')

async def test():
    # First login to get token
    async with httpx.AsyncClient(timeout=30, base_url='http://localhost:8000/api/v1') as client:
        # Try to get a mock token or use the dev bypass
        # Dev mode uses mock user - check what token format works
        login_r = await client.post('/auth/login', json={
            'email': 'luxor00@gmail.com',
            'password': 'test123'
        })
        print(f"Login status: {login_r.status_code}")
        print(f"Login response: {login_r.text[:300]}")
        
        token = None
        if login_r.status_code == 200:
            data = login_r.json()
            token = data.get('access_token') or data.get('data', {}).get('access_token')
        
        if not token:
            print("No token from login, trying with Authorization header directly...")
            # Try with a mock header that the backend might accept in dev mode
            
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        
        # Try Z-Image model (we know it works)
        gen_r = await client.post('/image/generate', headers=headers, json={
            'model_id': 'z_image',
            'prompt': 'a red apple',
            'aspect_ratio': '1:1',
            'num_images': 1
        })
        print(f"\nGenerate status: {gen_r.status_code}")
        print(f"Generate response: {gen_r.text[:600]}")

asyncio.run(test())
