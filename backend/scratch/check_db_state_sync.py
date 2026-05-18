from dotenv import load_dotenv
import os
print("Loading .env...")
load_dotenv()
print("Connecting to Supabase...")
from core.supabase_client import get_supabase_client

def check_users():
    supabase = get_supabase_client()
    print("Checking users table...")
    try:
        res = supabase.table("users").select("*").eq("email", "luxor00@gmail.com").execute()
        print("Users with email luxor00@gmail.com:")
        if res.data:
            for user in res.data:
                print(f"ID: {user['id']}, Email: {user['email']}, Name: {user.get('full_name')}")
        else:
            print("No users found with that email.")
    except Exception as e:
        print(f"Error checking users: {e}")
    
    print("\nChecking image_generations table...")
    try:
        res = supabase.table("image_generations").select("id").limit(1).execute()
        print("image_generations table exists.")
    except Exception as e:
        print(f"image_generations table error: {e}")

if __name__ == "__main__":
    check_users()
