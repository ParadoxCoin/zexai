"""
Database seeding script
Populates the database with initial data for pricing, packages, and admin user
"""
import asyncio
import sys
import os
from datetime import datetime

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import connect_to_mongo, get_database
from core.pricing_config import DEFAULT_SERVICE_COSTS, DEFAULT_PRICING_PACKAGES, CreditRate
from core.security import hash_password
import uuid

async def seed_database():
    """Seed the database with initial data"""
    print("🌱 Starting database seeding...")
    
    # Connect to database
    await connect_to_mongo()
    db = get_database()
    
    try:
        # 1. Seed Service Costs
        print("📊 Seeding service costs...")
        for key, service_cost in DEFAULT_SERVICE_COSTS.items():
            await db.service_costs.update_one(
                {
                    "service_type": service_cost.service_type,
                    "provider": service_cost.provider,
                    "model_id": service_cost.model_id
                },
                {"$set": service_cost.model_dump()},
                upsert=True
            )
        print(f"✅ Seeded {len(DEFAULT_SERVICE_COSTS)} service costs")
        
        # 2. Seed Pricing Packages
        print("💰 Seeding pricing packages...")
        for package in DEFAULT_PRICING_PACKAGES:
            await db.pricing_packages.update_one(
                {"name": package.name},
                {"$set": package.model_dump()},
                upsert=True
            )
        print(f"✅ Seeded {len(DEFAULT_PRICING_PACKAGES)} pricing packages")
        
        # 3. Seed Credit Rate
        print("💳 Seeding credit rate...")
        credit_rate = CreditRate()
        await db.credit_rates.update_one(
            {"is_active": True},
            {"$set": {"$unset": {"is_active": 1}}}
        )
        await db.credit_rates.insert_one(credit_rate.model_dump())
        print("✅ Seeded credit rate")
        
        # 4. Create Admin User
        print("👤 Creating admin user...")
        admin_email = "admin@ai-saas.com"
        admin_password = "admin123"  # Change this in production!
        
        # Check if admin exists
        existing_admin = await db.users.find_one({"email": admin_email})
        if not existing_admin:
            admin_user = {
                "id": str(uuid.uuid4()),
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "full_name": "System Administrator",
                "role": "admin",
                "package": "enterprise",
                "created_at": datetime.utcnow(),
                "last_login": None,
                "is_active": True
            }
            
            await db.users.insert_one(admin_user)
            
            # Initialize admin credits
            await db.user_credits.insert_one({
                "user_id": admin_user["id"],
                "credits_balance": 10000.0,  # 10,000 credits for admin
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            print(f"✅ Created admin user: {admin_email}")
            print(f"   Password: {admin_password}")
        else:
            print(f"ℹ️  Admin user already exists: {admin_email}")
        
        # 5. Create Test User
        print("🧪 Creating test user...")
        test_email = "test@ai-saas.com"
        test_password = "test123"
        
        existing_test = await db.users.find_one({"email": test_email})
        if not existing_test:
            test_user = {
                "id": str(uuid.uuid4()),
                "email": test_email,
                "password_hash": hash_password(test_password),
                "full_name": "Test User",
                "role": "user",
                "package": "pro",
                "created_at": datetime.utcnow(),
                "last_login": None,
                "is_active": True
            }
            
            await db.users.insert_one(test_user)
            
            # Initialize test user credits
            await db.user_credits.insert_one({
                "user_id": test_user["id"],
                "credits_balance": 1000.0,  # 1,000 credits for test user
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            print(f"✅ Created test user: {test_email}")
            print(f"   Password: {test_password}")
        else:
            print(f"ℹ️  Test user already exists: {test_email}")
        
        print("\n🎉 Database seeding completed successfully!")
        print("\n📋 Summary:")
        print(f"   • Service costs: {len(DEFAULT_SERVICE_COSTS)}")
        print(f"   • Pricing packages: {len(DEFAULT_PRICING_PACKAGES)}")
        print(f"   • Admin user: {admin_email}")
        print(f"   • Test user: {test_email}")
        print("\n🚀 You can now start the application!")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        raise
    finally:
        # Close database connection
        from core.database import close_mongo_connection
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed_database())

