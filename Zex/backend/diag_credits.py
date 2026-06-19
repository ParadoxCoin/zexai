"""Check credits for mock user and simulate generate flow"""
import os, asyncio, httpx
from dotenv import load_dotenv
load_dotenv('.env')

from supabase import create_client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
db = create_client(SUPABASE_URL, SUPABASE_KEY)

mock_id = "5c8cd695-942b-407d-b59f-71d29b06cdfd"

print("=== user_credits for mock user ===")
try:
    r = db.table('user_credits').select('*').eq('user_id', mock_id).execute()
    print(f"  Records: {r.data}")
except Exception as e:
    print(f"  ERROR: {e}")

print("\n=== users table for mock user ===")
try:
    r = db.table('users').select('*').eq('id', mock_id).execute()
    print(f"  Records: {r.data}")
except Exception as e:
    print(f"  ERROR: {e}")

print("\n=== Simulate generate POST (with mock JWT) ===")
async def test_generate():
    # Use a fake JWT - backend dev mode ignores token content
    fake_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YzhjZDY5NS05NDJiLTQwN2QtYjU5Zi03MWQyOWIwNmNkZmQiLCJlbWFpbCI6Imx1eG9yMDBAZ21haWwuY29tIiwicm9sZSI6InN1cGVyX2FkbWluIn0.fake"
    
    async with httpx.AsyncClient(timeout=15, base_url='http://localhost:8000/api/v1') as client:
        r = await client.post(
            '/image/generate',
            headers={'Authorization': f'Bearer {fake_jwt}'},
            json={
                'model_id': 'z_image',
                'prompt': 'a red apple',
                'aspect_ratio': '1:1',
                'num_images': 1
            }
        )
        print(f"  Status: {r.status_code}")
        print(f"  Response: {r.text[:800]}")

asyncio.run(test_generate())
print("\nDone.")
