"""
Simple test script for authentication
"""
import asyncio
import sys
import os

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.auth_service import AuthService
from core.database import connect_to_mongo, close_mongo_connection
from core.logger import app_logger as logger

async def test_register():
    """Test user registration"""
    print("🧪 Testing user registration...")
    
    try:
        result = await AuthService.register_user(
            email="test@example.com",
            password="test123456",
            full_name="Test User"
        )
        
        print("✅ Registration successful!")
        print(f"   User ID: {result['user_id']}")
        print(f"   Email: {result['email']}")
        print(f"   Token: {result['access_token'][:50]}...")
        return result
        
    except Exception as e:
        print(f"❌ Registration failed: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_login():
    """Test user login"""
    print("\n🧪 Testing user login...")
    
    try:
        result = await AuthService.login_user(
            email="test@example.com",
            password="test123456"
        )
        
        print("✅ Login successful!")
        print(f"   User ID: {result['user_id']}")
        print(f"   Email: {result['email']}")
        print(f"   Token: {result['access_token'][:50]}...")
        return result
        
    except Exception as e:
        print(f"❌ Login failed: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_token_verification(token: str):
    """Test token verification"""
    print("\n🧪 Testing token verification...")
    
    try:
        user = await AuthService.verify_token(token)
        
        if user:
            print("✅ Token verification successful!")
            print(f"   User ID: {user['id']}")
            print(f"   Email: {user['email']}")
            return True
        else:
            print("❌ Token verification failed: User not found")
            return False
            
    except Exception as e:
        print(f"❌ Token verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    print("=" * 60)
    print("🧪 Authentication Test Suite")
    print("=" * 60)
    print()
    
    # Connect to database
    try:
        await connect_to_mongo()
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return
    
    try:
        # Test 1: Register
        register_result = await test_register()
        
        if not register_result:
            print("\n❌ Registration test failed. Stopping tests.")
            return
        
        # Test 2: Login
        login_result = await test_login()
        
        if not login_result:
            print("\n❌ Login test failed. Stopping tests.")
            return
        
        # Test 3: Token verification
        token = login_result['access_token']
        await test_token_verification(token)
        
        print()
        print("=" * 60)
        print("✅ All tests completed!")
        print("=" * 60)
        
    finally:
        # Close database connection
        await close_mongo_connection()
        print("\n✅ Database connection closed")

if __name__ == "__main__":
    asyncio.run(main())
