#!/usr/bin/env python3
"""
Database setup script for AI SaaS Platform
Creates indexes and initial data for production deployment
"""

import asyncio
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING, DESCENDING

# Database configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ai_saas")

async def create_indexes():
    """Create all necessary database indexes"""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    print("Creating database indexes...")
    
    # Users collection indexes
    await db.users.create_indexes([
        IndexModel([("email", ASCENDING)], unique=True),
        IndexModel([("id", ASCENDING)], unique=True),
        IndexModel([("created_at", DESCENDING)]),
        IndexModel([("is_active", ASCENDING)]),
        IndexModel([("role", ASCENDING)])
    ])
    print("✓ Users indexes created")
    
    # User credits collection indexes
    await db.user_credits.create_indexes([
        IndexModel([("user_id", ASCENDING)], unique=True),
        IndexModel([("updated_at", DESCENDING)])
    ])
    print("✓ User credits indexes created")
    
    # Usage logs collection indexes
    await db.usage_logs.create_indexes([
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("service_type", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)]),
        IndexModel([("cost", DESCENDING)])
    ])
    print("✓ Usage logs indexes created")
    
    # Media outputs collection indexes
    await db.media_outputs.create_indexes([
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("is_showcase", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("service_type", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)]),
        IndexModel([("expires_at", ASCENDING)])
    ])
    print("✓ Media outputs indexes created")
    
    # Conversations collection indexes
    await db.conversations.create_indexes([
        IndexModel([("user_id", ASCENDING), ("updated_at", DESCENDING)]),
        IndexModel([("updated_at", DESCENDING)])
    ])
    print("✓ Conversations indexes created")
    
    # User API keys collection indexes
    await db.user_api_keys.create_indexes([
        IndexModel([("user_id", ASCENDING)]),
        IndexModel([("key_hash", ASCENDING)], unique=True),
        IndexModel([("is_active", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)])
    ])
    print("✓ User API keys indexes created")
    
    # Billing transactions collection indexes
    await db.billing_transactions.create_indexes([
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("transaction_type", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)])
    ])
    print("✓ Billing transactions indexes created")
    
    # Invoices collection indexes
    await db.invoices.create_indexes([
        IndexModel([("user_id", ASCENDING), ("issued_at", DESCENDING)]),
        IndexModel([("invoice_number", ASCENDING)], unique=True),
        IndexModel([("status", ASCENDING)])
    ])
    print("✓ Invoices indexes created")
    
    # User files collection indexes
    await db.user_files.create_indexes([
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("expires_at", ASCENDING)]),
        IndexModel([("file_type", ASCENDING)])
    ])
    print("✓ User files indexes created")
    
    # Admin logs collection indexes
    await db.admin_logs.create_indexes([
        IndexModel([("admin_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("target_user_id", ASCENDING)]),
        IndexModel([("action", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)])
    ])
    print("✓ Admin logs indexes created")
    
    # Synapse tasks collection indexes
    await db.synapse_tasks.create_indexes([
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("task_type", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)])
    ])
    print("✓ Synapse tasks indexes created")
    
    # Synapse logs collection indexes
    await db.synapse_logs.create_indexes([
        IndexModel([("task_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("log_level", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)])
    ])
    print("✓ Synapse logs indexes created")
    
    client.close()
    print("All indexes created successfully!")

async def insert_initial_data():
    """Insert initial configuration data"""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    print("Inserting initial data...")
    
    # Default service costs
    service_costs = [
        {
            "service_type": "chat",
            "unit": "1000 tokens",
            "cost_per_unit": 1.0,
            "updated_at": datetime.utcnow()
        },
        {
            "service_type": "image",
            "unit": "1 image",
            "cost_per_unit": 5.0,
            "updated_at": datetime.utcnow()
        },
        {
            "service_type": "video",
            "unit": "1 video",
            "cost_per_unit": 20.0,
            "updated_at": datetime.utcnow()
        },
        {
            "service_type": "audio",
            "unit": "1 audio",
            "cost_per_unit": 3.0,
            "updated_at": datetime.utcnow()
        },
        {
            "service_type": "synapse",
            "unit": "1 task",
            "cost_per_unit": 10.0,
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Clear existing and insert new
    await db.service_costs.delete_many({})
    await db.service_costs.insert_many(service_costs)
    print("✓ Service costs inserted")
    
    # Default pricing packages
    pricing_packages = [
        {
            "name": "Starter Pack",
            "usd_price": 10.0,
            "credit_amount": 1000,
            "discount_percent": 0,
            "active": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Pro Pack",
            "usd_price": 50.0,
            "credit_amount": 5500,
            "discount_percent": 10,
            "active": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Enterprise Pack",
            "usd_price": 200.0,
            "credit_amount": 25000,
            "discount_percent": 25,
            "active": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    # Clear existing and insert new
    await db.pricing_packages.delete_many({})
    await db.pricing_packages.insert_many(pricing_packages)
    print("✓ Pricing packages inserted")
    
    client.close()
    print("Initial data inserted successfully!")

async def main():
    """Main setup function"""
    print("🚀 Starting database setup for AI SaaS Platform...")
    print(f"Database: {DATABASE_NAME}")
    print(f"MongoDB URL: {MONGODB_URL}")
    print("-" * 50)
    
    try:
        await create_indexes()
        await insert_initial_data()
        print("-" * 50)
        print("✅ Database setup completed successfully!")
    except Exception as e:
        print(f"❌ Database setup failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())