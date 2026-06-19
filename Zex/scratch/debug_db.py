import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import get_db
from datetime import datetime

async def debug_user_data(email_or_id):
    db = next(get_db())
    
    print(f"--- Debugging Data for: {email_or_id} ---")
    
    # 1. Find User ID if email provided
    user_id = email_or_id
    if "@" in email_or_id:
        user_res = db.table("users").select("id").eq("email", email_or_id).execute()
        if user_res.data:
            user_id = user_res.data[0]["id"]
            print(f"Found User ID: {user_id}")
        else:
            print("User not found by email.")
            return

    # 2. Check Credits
    credit_res = db.table("user_credits").select("*").eq("user_id", user_id).execute()
    print(f"Credits Table: {credit_res.data}")

    # 3. Check usage_logs
    usage_res = db.table("usage_logs").select("*", count="exact").eq("user_id", user_id).limit(5).execute()
    print(f"Usage Logs Count: {usage_res.count}")
    print(f"Recent Logs Sample: {usage_res.data}")

    # 4. Check image_generations
    img_res = db.table("image_generations").select("*", count="exact").eq("user_id", user_id).limit(5).execute()
    print(f"Image Gen Count: {img_res.count}")
    
    # 5. Check generations (legacy)
    gen_res = db.table("generations").select("*", count="exact").eq("user_id", user_id).limit(5).execute()
    print(f"Legacy Generations Count: {gen_res.count}")

if __name__ == "__main__":
    # We need to know which user to look for. 
    # Based on earlier screenshots, let's try to find users or specific user.
    # I'll first list all users to identify the correct one.
    db = next(get_db())
    users = db.table("users").select("email, id").limit(10).execute()
    print("Recent Users:")
    for u in users.data:
        print(f" - {u['email']} ({u['id']})")
    
    # If a specific email is known, we can debug it.
    # For now, just printing the list.
