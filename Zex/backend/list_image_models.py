from dotenv import load_dotenv
load_dotenv()
from core.supabase_client import get_supabase_client

db = get_supabase_client()
r = db.table('ai_models').select('id,name,type,category,is_active').eq('category', 'image').execute()
for m in r.data:
    print(f"{m['id']:30s} | {m['name']:35s} | {m['type']:15s} | active={m['is_active']}")
