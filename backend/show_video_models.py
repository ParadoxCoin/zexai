import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_ANON_KEY')
sb = create_client(url, key)

print("=== ALL video_models ===")
res2 = sb.table('video_models').select('id,display_name,credits,duration_options,resolutions,is_active').execute()
for m in (res2.data or []):
    print(f"  {m['id']} | {m.get('display_name')} | credits={m.get('credits')} | dur={m.get('duration_options')} | res={m.get('resolutions')} | active={m.get('is_active')}")
