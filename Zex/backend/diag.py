"""Quick diagnostic for 500 error on /image/generate"""
import os, sys, asyncio, httpx
from dotenv import load_dotenv
load_dotenv('.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
KIE_KEY = os.getenv('KIE_API_KEY', '')
KIE_KEY_2 = os.getenv('KIE_API_KEY_2', '')

print("=== KIE API KEYS ===")
print(f"KIE_API_KEY    : {len(KIE_KEY)} chars | {KIE_KEY[:8]}..." if KIE_KEY else "KIE_API_KEY    : EMPTY!")
print(f"KIE_API_KEY_2  : {len(KIE_KEY_2)} chars | {KIE_KEY_2[:8]}..." if KIE_KEY_2 else "KIE_API_KEY_2  : EMPTY (ok if single key)")

print("\n=== SUPABASE TABLES ===")
from supabase import create_client
db = create_client(SUPABASE_URL, SUPABASE_KEY)

tables = ['generations', 'media_outputs', 'video_generations', 'user_credits', 'users']
for t in tables:
    try:
        r = db.table(t).select('*').limit(1).execute()
        print(f"  {t}: OK ({len(r.data)} rows returned)")
    except Exception as e:
        print(f"  {t}: ERROR - {e}")

print("\n=== KIE API TEST ===")
async def test_kie():
    if not KIE_KEY:
        print("  Cannot test - KIE_API_KEY is empty!")
        return
    headers = {'Authorization': f'Bearer {KIE_KEY}', 'Content-Type': 'application/json'}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get('https://api.kie.ai/api/v1/account/info', headers=headers)
            print(f"  Account info status: {r.status_code}")
            print(f"  Response: {r.text[:400]}")
        except Exception as e:
            print(f"  KIE API error: {e}")

asyncio.run(test_kie())
print("\nDone.")
