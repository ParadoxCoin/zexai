"""
Database access utilities for Supabase
"""
from core.supabase_client import get_supabase_client
import logging

logger = logging.getLogger(__name__)

async def get_db():
    """
    Get Supabase client for database operations
    This is a drop-in replacement for get_database but returns Supabase client
    """
    client = get_supabase_client()
    if not client:
        logger.error("Supabase client not initialized")
        raise RuntimeError("Supabase client not initialized")
    return client

# Alias for compatibility
get_database = get_db

async def connect_to_db():
    """
    Initialize database connection (Supabase client)
    """
    client = get_supabase_client()
    if client:
        logger.info("✅ Connected to Supabase")
    else:
        logger.warning("⚠️ Failed to connect to Supabase")

async def close_db_connection():
    """
    Close database connection (No-op for Supabase HTTP client)
    """
    pass
