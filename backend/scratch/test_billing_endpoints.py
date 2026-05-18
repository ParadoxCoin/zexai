"""
Billing Endpoints Validation Test — ZexAI Billing & Subscription Pipeline
Simulates authenticated requests to the FastAPI endpoints to ensure zero database crashes.
"""
import sys
import asyncio
from datetime import datetime
from fastapi import Request

sys.path.insert(0, ".")
from core.database import get_db
from routes.billing import (
    get_subscription_plans,
    get_top_up_packages,
    get_credit_config,
    get_subscription_status,
    get_billing_transactions,
    get_invoices,
    get_usage_stats
)

class MockUser:
    def __init__(self, id, email="test@zexai.io"):
        self.id = id
        self.email = email

class MockRequest:
    def __init__(self):
        self.headers = {}

async def main():
    print("🚀 Starting Billing Endpoints Validation Test...")
    db = await get_db()
    
    test_user = MockUser("28fa59b6-de0b-4f98-8d19-ea91dbc10fe1")
    request = MockRequest()
    
    print("\n--- 1. Testing GET /billing/plans ---")
    plans = await get_subscription_plans(db=db)
    print(f"Result: {plans.get('success')}, Plans Count: {len(plans.get('plans', []))}")
    
    print("\n--- 2. Testing GET /billing/packages ---")
    packages = await get_top_up_packages(db=db)
    print(f"Result: {packages.get('success')}, Packages Count: {len(packages.get('packages', []))}")

    print("\n--- 3. Testing GET /billing/credit-config ---")
    config = await get_credit_config(db=db)
    print(f"Result: {config.get('credits_per_usd') is not None}")

    print("\n--- 4. Testing GET /billing/subscription/status ---")
    sub_status = await get_subscription_status(current_user=test_user, db=db)
    print(f"Result: Has Subscription={sub_status.has_subscription}, Plan={sub_status.plan_name}")

    print("\n--- 5. Testing GET /billing/transactions ---")
    txs = await get_billing_transactions(request=request, current_user=test_user, db=db)
    print(f"Result: Total Transactions={txs.total}, Count in Page={len(txs.transactions)}")

    print("\n--- 6. Testing GET /billing/invoices ---")
    invs = await get_invoices(request=request, current_user=test_user, db=db)
    print(f"Result: Total Invoices={invs.total}, Count in Page={len(invs.invoices)}")

    print("\n--- 7. Testing GET /billing/usage-stats ---")
    stats = await get_usage_stats(request=request, current_user=test_user, db=db)
    print(f"Result: Remaining Credits={stats.credits_remaining}, Spent={stats.credits_spent}")

    print("\n🎉 ALL ENDPOINTS VALIDATED SUCCESSFULLY WITH ZERO CRASHES!")

if __name__ == "__main__":
    asyncio.run(main())
