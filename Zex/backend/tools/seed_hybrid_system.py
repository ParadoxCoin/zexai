"""
Seed script for hybrid billing system
Run this to initialize subscription plans and pricing packages
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'ai_saas')


async def seed_database():
    """Seed database with initial data for hybrid billing system"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🌱 Seeding hybrid billing system...")
    
    # 1. Service Costs
    print("\n📊 Adding service costs...")
    service_costs = [
        {
            "service_type": "chat",
            "unit": "1000 tokens",
            "cost_per_unit": 1,
            "updated_at": datetime.utcnow()
        },
        {
            "service_type": "image",
            "unit": "1 image",
            "cost_per_unit": 5,
            "updated_at": datetime.utcnow()
        },
        {
            "service_type": "video",
            "unit": "1 second",
            "cost_per_unit": 10,
            "updated_at": datetime.utcnow()
        },
        {
            "service_type": "synapse",
            "unit": "1 Manus credit",
            "cost_per_unit": 2,
            "updated_at": datetime.utcnow()
        }
    ]
    
    for cost in service_costs:
        await db.service_costs.update_one(
            {"service_type": cost["service_type"]},
            {"$set": cost},
            upsert=True
        )
        print(f"  ✅ {cost['service_type']}: {cost['cost_per_unit']} credits per {cost['unit']}")
    
    # 2. Pricing Packages (for top-up purchases)
    print("\n💰 Adding pricing packages (top-up)...")
    pricing_packages = [
        {
            "id": "starter",
            "name": "Starter",
            "usd_price": 10.0,
            "credit_amount": 1100,
            "discount_percent": 10,
            "active": True,
            "created_at": datetime.utcnow()
        },
        {
            "id": "pro_topup",
            "name": "Pro Top-Up",
            "usd_price": 25.0,
            "credit_amount": 2800,
            "discount_percent": 12,
            "active": True,
            "created_at": datetime.utcnow()
        },
        {
            "id": "enterprise_topup",
            "name": "Enterprise Top-Up",
            "usd_price": 100.0,
            "credit_amount": 12000,
            "discount_percent": 20,
            "active": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    for package in pricing_packages:
        await db.pricing_packages.update_one(
            {"id": package["id"]},
            {"$set": package},
            upsert=True
        )
        print(f"  ✅ {package['name']}: ${package['usd_price']} → {package['credit_amount']} credits")
    
    # 3. Subscription Plans (stored in code, but let's document them)
    print("\n📋 Subscription plans (defined in code):")
    subscription_plans = [
        {"id": "basic", "name": "Basic", "monthly_price": 25, "monthly_credits": 2500},
        {"id": "pro", "name": "Pro", "monthly_price": 75, "monthly_credits": 8000},
        {"id": "enterprise", "name": "Enterprise", "monthly_price": 250, "monthly_credits": 30000}
    ]
    
    for plan in subscription_plans:
        print(f"  📦 {plan['name']}: ${plan['monthly_price']}/month → {plan['monthly_credits']} credits/month")
    
    # 4. Create indexes for performance
    print("\n🔍 Creating database indexes...")
    
    await db.user_credits.create_index("user_id", unique=True)
    await db.usage_logs.create_index([("user_id", 1), ("created_at", -1)])
    await db.user_subscriptions.create_index([("user_id", 1), ("status", 1)])
    await db.synapse_tasks.create_index([("user_id", 1), ("created_at", -1)])
    
    print("  ✅ Indexes created")
    
    print("\n✨ Hybrid billing system seeded successfully!")
    print("\n📚 Next steps:")
    print("  1. Configure Paddle API keys in .env file")
    print("  2. Set up Paddle products and price IDs")
    print("  3. Configure webhook URL in Paddle dashboard")
    print("  4. Test subscription and top-up flows")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_database())

