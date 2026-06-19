from dotenv import load_dotenv
load_dotenv()
import asyncio
from core.supabase_client import get_supabase_client

db = get_supabase_client()
res = db.table("ai_models").select("*").limit(1).execute()
print("Table columns:", res.data[0].keys() if res.data else "No data")

