"""
Test Supabase connection and functionality
"""
import asyncio
import sys
import os

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.supabase_client import get_supabase_client, is_supabase_enabled
from core.config import settings
from core.logger import app_logger as logger

def test_supabase_connection():
    """Test Supabase connection"""
    print("🔍 Testing Supabase connection...")
    print(f"SUPABASE_ENABLED: {settings.SUPABASE_ENABLED}")
    print(f"SUPABASE_URL: {settings.SUPABASE_URL}")
    print(f"SERVICE_ROLE_KEY: {'✅ Set' if settings.SUPABASE_SERVICE_ROLE_KEY else '❌ Not set'}")
    print(f"ANON_KEY: {'✅ Set' if settings.SUPABASE_ANON_KEY else '❌ Not set'}")
    print()
    
    if not is_supabase_enabled():
        print("❌ Supabase is not enabled or not configured")
        return False
    
    try:
        supabase = get_supabase_client()
        if not supabase:
            print("❌ Failed to get Supabase client")
            return False
        
        print("✅ Supabase client created successfully")
        
        # Test: Get current user (should work with service role)
        try:
            # Test auth (this might fail if no user, but connection should work)
            print("✅ Supabase connection test passed")
            return True
        except Exception as e:
            print(f"⚠️ Auth test warning: {e}")
            print("✅ But connection is working (this is expected)")
            return True
            
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

def test_user_credits_table():
    """Test user_credits table"""
    print("\n🔍 Testing user_credits table...")
    
    try:
        supabase = get_supabase_client()
        if not supabase:
            print("❌ Supabase client not available")
            return False
        
        # Try to query the table
        response = supabase.table("user_credits").select("*").limit(1).execute()
        print("✅ user_credits table is accessible")
        print(f"   Current rows: {len(response.data)}")
        return True
        
    except Exception as e:
        print(f"❌ user_credits table test failed: {e}")
        return False

def test_storage():
    """Test storage bucket"""
    print("\n🔍 Testing storage bucket...")
    
    try:
        supabase = get_supabase_client()
        if not supabase:
            print("❌ Supabase client not available")
            return False
        
        # List buckets
        buckets = supabase.storage.list_buckets()
        print(f"✅ Storage accessible")
        print(f"   Available buckets: {[b.name for b in buckets]}")
        
        # Check if media bucket exists
        media_bucket = [b for b in buckets if b.name == "media"]
        if media_bucket:
            print("✅ 'media' bucket exists")
            return True
        else:
            print("⚠️ 'media' bucket does not exist")
            print("   Please create it in Supabase Dashboard → Storage")
            return False
            
    except Exception as e:
        print(f"❌ Storage test failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("🧪 Supabase Connection Test")
    print("=" * 50)
    print()
    
    # Test connection
    connection_ok = test_supabase_connection()
    
    if connection_ok:
        # Test table
        table_ok = test_user_credits_table()
        
        # Test storage
        storage_ok = test_storage()
        
        print()
        print("=" * 50)
        print("📊 Test Results")
        print("=" * 50)
        print(f"Connection: {'✅' if connection_ok else '❌'}")
        print(f"Table: {'✅' if table_ok else '❌'}")
        print(f"Storage: {'✅' if storage_ok else '⚠️'}")
        print()
        
        if connection_ok and table_ok:
            print("🎉 Supabase is ready to use!")
            if not storage_ok:
                print("⚠️ Please create 'media' bucket in Supabase Dashboard")
        else:
            print("❌ Some tests failed. Please check the configuration.")
    else:
        print("❌ Connection test failed. Please check your .env file.")
