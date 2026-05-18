"""
Debug script to check and fix user_credits in Supabase
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"Supabase URL: {SUPABASE_URL}")
print(f"Service Key: {SUPABASE_KEY[:20]}..." if SUPABASE_KEY else "NO KEY!")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

MOCK_USER_ID = "5c8cd695-942b-407d-b59f-71d29b06cdfd"

# 1. Check user_credits table for this user
print(f"\n{'='*60}")
print(f"Checking user_credits for user: {MOCK_USER_ID}")
print(f"{'='*60}")

try:
    result = supabase.table("user_credits").select("*").eq("user_id", MOCK_USER_ID).execute()
    print(f"Result: {result.data}")
    print(f"Row count: {len(result.data) if result.data else 0}")
except Exception as e:
    print(f"Error querying user_credits: {e}")

# 2. Check ALL rows in user_credits
print(f"\n{'='*60}")
print(f"All rows in user_credits table:")
print(f"{'='*60}")

try:
    all_credits = supabase.table("user_credits").select("user_id, credits_balance, total_purchased, total_spent").limit(20).execute()
    if all_credits.data:
        for row in all_credits.data:
            print(f"  User: {row.get('user_id')} | Balance: {row.get('credits_balance')} | Purchased: {row.get('total_purchased')} | Spent: {row.get('total_spent')}")
    else:
        print("  NO ROWS FOUND - Table is empty!")
except Exception as e:
    print(f"Error: {e}")

# 3. Check users table
print(f"\n{'='*60}")
print(f"Checking public.users for this user:")
print(f"{'='*60}")

try:
    user_result = supabase.table("users").select("id, email, full_name, role").eq("id", MOCK_USER_ID).execute()
    print(f"Result: {user_result.data}")
except Exception as e:
    print(f"Error: {e}")

# 4. Check the actual logged-in user (Bulut Alparslan from screenshot)
print(f"\n{'='*60}")
print(f"Searching for 'Bulut Alparslan' or 'luxor' in users:")
print(f"{'='*60}")

try:
    all_users = supabase.table("users").select("id, email, full_name, role").limit(20).execute()
    if all_users.data:
        for u in all_users.data:
            print(f"  ID: {u.get('id')} | Email: {u.get('email')} | Name: {u.get('full_name')} | Role: {u.get('role')}")
    else:
        print("  No users found!")
except Exception as e:
    print(f"Error: {e}")

# 5. Check usage_logs
print(f"\n{'='*60}")
print(f"Checking usage_logs for mock user:")
print(f"{'='*60}")

try:
    logs = supabase.table("usage_logs").select("id, service_type, cost, created_at").eq("user_id", MOCK_USER_ID).limit(5).execute()
    print(f"Rows found: {len(logs.data) if logs.data else 0}")
    if logs.data:
        for log in logs.data:
            print(f"  {log}")
except Exception as e:
    print(f"Error: {e}")
