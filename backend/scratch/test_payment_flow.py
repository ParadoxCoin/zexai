"""
Integration Test — ZexAI Payment & Credit Pipeline
Validates that Supabase tables, row creation, and credit updates function 100% correctly.
"""
import sys
import asyncio
import uuid
from datetime import datetime

sys.path.insert(0, ".")
from core.database import get_db
from services.payment_service import process_payment_supabase, create_pending_payment, get_pending_payment

async def main():
    print("🚀 Starting Payment & Credit Pipeline Integration Test...")
    db = await get_db()
    
    # 1. Verify a test user exists
    test_user_id = "28fa59b6-de0b-4f98-8d19-ea91dbc10fe1"
    print(f"👉 Checking if test user {test_user_id} exists...")
    user_check = db.table("user_credits").select("credits_balance").eq("user_id", test_user_id).execute()
    
    if not user_check.data:
        print(f"⚠️ Test user not found in user_credits. Initializing mock user credits...")
        db.table("user_credits").insert({
            "user_id": test_user_id,
            "credits_balance": 10.0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        initial_credits = 10.0
    else:
        initial_credits = float(user_check.data[0]["credits_balance"])
    
    print(f"✅ Initial credits balance for user: {initial_credits} credits")

    # 2. Simulate Pending Payment Row Creation
    session_id = f"test-session-{uuid.uuid4()}"
    amount_usd = 25.0
    credits_to_add = 2500
    print(f"👉 Simulating pending payment row creation for session: {session_id}...")
    
    try:
        create_pending_payment(
            db=db,
            session_id=session_id,
            user_id=test_user_id,
            item_type="flexible_credits",
            payment_method="nowpayments",
            amount_usd=amount_usd,
            credits=credits_to_add
        )
        print("✅ Pending payment row inserted successfully!")
    except Exception as e:
        print(f"❌ Failed to insert pending payment: {e}")
        return

    # 3. Retrieve Pending Payment Row
    print("👉 Retrieving pending payment row from database...")
    payment = get_pending_payment(db, session_id)
    if not payment:
        print("❌ Failed to retrieve pending payment!")
        return
    print(f"✅ Retrieved successfully: Status={payment['status']}, Credits={payment['credits']}")

    # 4. Simulate Successful Webhook Callback (process_payment_supabase)
    print("👉 Simulating webhook completion and crediting user...")
    try:
        success = await process_payment_supabase(
            db=db,
            payment=payment,
            extra={
                "nowpayments_payment_id": "mock-tx-12345",
                "paid_currency": "usdt",
                "paid_amount": 25.0
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

    # 5. Verify Database State
    print("👉 Verifying final user credits balance...")
    user_check_after = db.table("user_credits").select("credits_balance").eq("user_id", test_user_id).execute()
    new_credits = float(user_check_after.data[0]["credits_balance"])
    print(f"📈 Final credits balance: {new_credits} credits")
    
    expected_credits = initial_credits + credits_to_add
    if new_credits == expected_credits:
        print("🎉 SUCCESS! Pipeline updated the user's credits perfectly!")
    else:
        print(f"❌ FAILED! Expected {expected_credits} credits but got {new_credits}")

    # 6. Verify Transaction Log
    print("👉 Verifying billing transaction log row...")
    tx_check = db.table("billing_transactions").select("*").eq("session_id", session_id).execute()
    if tx_check.data:
        print(f"✅ Transaction log row found! ID={tx_check.data[0]['id']}, Status={tx_check.data[0]['status']}")
    else:
        print("❌ Transaction log row NOT found!")

if __name__ == "__main__":
    asyncio.run(main())
