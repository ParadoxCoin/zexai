"""
Subscription Integration Test — ZexAI Subscription & Credit Pipeline
Validates that Supabase tables, pending payments, user_subscriptions row activation, and credit updates function 100% correctly.
"""
import sys
import asyncio
import uuid
from datetime import datetime

sys.path.insert(0, ".")
from core.database import get_db
from services.payment_service import process_payment_supabase, create_pending_payment, get_pending_payment

async def main():
    print("🚀 Starting Subscription & Credit Pipeline Integration Test...")
    db = await get_db()
    
    # 1. Verify a test user exists
    test_user_id = "28fa59b6-de0b-4f98-8d19-ea91dbc10fe1"
    print(f"👉 Checking if test user {test_user_id} exists...")
    user_check = db.table("user_credits").select("credits_balance").eq("user_id", test_user_id).execute()
    
    if not user_check.data:
        print(f"⚠️ Test user not found in user_credits. Initializing...")
        db.table("user_credits").insert({
            "user_id": test_user_id,
            "credits_balance": 100.0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        initial_credits = 100.0
    else:
        initial_credits = float(user_check.data[0]["credits_balance"])
    
    print(f"✅ Initial credits balance for user: {initial_credits} credits")

    # 2. Simulate Pending Subscription Payment Row Creation
    session_id = f"test-subscription-session-{uuid.uuid4()}"
    amount_usd = 75.0  # Pro plan price
    credits_to_add = 8000  # Pro plan monthly credits
    print(f"👉 Simulating pending subscription payment row creation for session: {session_id}...")
    
    try:
        create_pending_payment(
            db=db,
            session_id=session_id,
            user_id=test_user_id,
            item_type="subscription",
            payment_method="lemonsqueezy",
            amount_usd=amount_usd,
            credits=credits_to_add
        )
        # Update item_id manually to match the 'pro' plan
        db.table("pending_payments").update({"item_id": "pro"}).eq("session_id", session_id).execute()
        print("✅ Pending subscription payment row inserted successfully!")
    except Exception as e:
        print(f"❌ Failed to insert pending payment: {e}")
        return

    # 3. Retrieve Pending Payment Row
    print("👉 Retrieving pending payment row from database...")
    payment = get_pending_payment(db, session_id)
    if not payment:
        print("❌ Failed to retrieve pending payment!")
        return
    print(f"✅ Retrieved successfully: Type={payment['item_type']}, ID={payment['item_id']}, Credits={payment['credits']}")

    # 4. Simulate Successful Webhook Callback (process_payment_supabase)
    print("👉 Simulating webhook completion and subscription activation...")
    try:
        success = await process_payment_supabase(
            db=db,
            payment=payment,
            extra={
                "lemonsqueezy_order_id": "mock-sub-order-123",
            }
        )
        if success:
            print("✅ process_payment_supabase returned success=True!")
        else:
            print("❌ process_payment_supabase returned success=False!")
            return
    except Exception as e:
        print(f"❌ Exception in process_payment_supabase: {e}")
        return

    # 5. Verify User Credits Balance
    print("👉 Verifying final user credits balance...")
    user_check_after = db.table("user_credits").select("credits_balance").eq("user_id", test_user_id).execute()
    new_credits = float(user_check_after.data[0]["credits_balance"])
    print(f"📈 Final credits balance: {new_credits} credits")
    
    expected_credits = initial_credits + credits_to_add
    if new_credits == expected_credits:
        print("🎉 SUCCESS! Pipeline updated the user's credits perfectly!")
    else:
        print(f"❌ FAILED! Expected {expected_credits} credits but got {new_credits}")

    # 6. Verify Subscription Row is Active
    print("👉 Verifying active row in user_subscriptions...")
    sub_check = db.table("user_subscriptions").select("*").eq("user_id", test_user_id).eq("plan_id", "pro").eq("status", "active").execute()
    if sub_check.data:
        sub_row = sub_check.data[0]
        print(f"🎉 SUCCESS! Active subscription row found! Plan: {sub_row['plan_id']}, Start: {sub_row['current_period_start']}, End: {sub_row['current_period_end']}")
    else:
        print("❌ FAILED! No active subscription row found in database!")

    # Clean up test rows
    print("🧹 Cleaning up test database rows...")
    db.table("user_subscriptions").delete().eq("user_id", test_user_id).execute()
    db.table("billing_transactions").delete().eq("session_id", session_id).execute()
    db.table("pending_payments").delete().eq("session_id", session_id).execute()
    print("✅ Cleanup complete!")

if __name__ == "__main__":
    asyncio.run(main())
