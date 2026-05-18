import asyncio
from dotenv import load_dotenv
load_dotenv()
from core.supabase_client import get_supabase_client

async def check_users():
    supabase = get_supabase_client()
    res = supabase.table("users").select("*").eq("email", "luxor00@gmail.com").execute()
    print("Users with email luxor00@gmail.com:")
    for user in res.data:
        print(f"ID: {user['id']}, Email: {user['email']}, Name: {user.get('full_name')}")
    
    # Also check if image_generations table exists by trying a select
    try:
        res = supabase.table("image_generations").select("id").limit(1).execute()
        print("image_generations table exists.")
    except Exception as e:
        print(f"image_generations table error: {e}")

if __name__ == "__main__":
    asyncio.run(check_users())
