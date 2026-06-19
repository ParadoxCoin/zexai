import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from core.supabase_client import get_supabase_client

def test_column(client, col_name):
    try:
        # Try to select just this column
        client.table("user_connectors").select(col_name).limit(1).execute()
        return True
    except Exception as e:
        err_str = str(e)
        if "Could not find" in err_str or "column" in err_str:
            return False
        # If it's another error (like empty table or auth), it probably exists
        return True

def main():
    client = get_supabase_client()
    if not client:
        print("Failed to initialize Supabase client")
        return

    columns_to_test = [
        # Columns from the Python code (connectors.py):
        "user_id",
        "provider_name",
        "is_active",
        "access_token",
        "refresh_token",
        "token_expires_at",
        "scopes",
        "profile_data",
        "updated_at",
        "created_at",
        # Columns from the SQL schema file (supabase_rls.sql):
        "auth_data",
        "metadata"
    ]

    print("Checking columns in the live Supabase user_connectors table:")
    for col in columns_to_test:
        exists = test_column(client, col)
        status = "✅ EXISTS" if exists else "❌ MISSING"
        print(f" - {col}: {status}")

if __name__ == "__main__":
    main()
