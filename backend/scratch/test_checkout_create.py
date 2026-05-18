"""
Validation Test for create_checkout FastAPI handler.
"""
import sys
import asyncio
from datetime import datetime
from fastapi import Request

sys.path.insert(0, ".")
from core.database import get_db
from routes.billing import create_checkout, CreateCheckoutRequest
from schemas.billing import PaymentMethod

class MockUser:
    def __init__(self, id, email="test@zexai.io"):
        self.id = id
        self.email = email

class MockRequest:
    def __init__(self):
        self.headers = {"origin": "http://localhost:5173"}

async def main():
    print("🚀 Starting checkout/create Direct Handler Test...")
    db = await get_db()
    test_user = MockUser("28fa59b6-de0b-4f98-8d19-ea91dbc10fe1")
    request = MockRequest()
    
    # Test subscription checkout
    print("\n--- Testing Subscription Checkout ---")
    req = CreateCheckoutRequest(
        item_type="subscription",
        item_id="pro",
        payment_method=PaymentMethod.LEMONSQUEEZY
    )
    try:
        res = await create_checkout(request=req, http_request=request, current_user=test_user, db=db)
        print(f"Result success: {res.success}, Checkout URL: {res.checkout_url}")
    except Exception as e:
        print(f"❌ Error during subscription checkout: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

    # Test top-up package checkout
    print("\n--- Testing Top-Up Checkout ---")
    req_pkg = CreateCheckoutRequest(
        item_type="top_up",
        item_id="popular",
        payment_method=PaymentMethod.LEMONSQUEEZY
    )
    try:
        res_pkg = await create_checkout(request=req_pkg, http_request=request, current_user=test_user, db=db)
        print(f"Result success: {res_pkg.success}, Checkout URL: {res_pkg.checkout_url}")
    except Exception as e:
        print(f"❌ Error during top-up checkout: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
