"""
Supabase client for hybrid approach
Handles Auth, Storage, and Real-time features
"""
from supabase import create_client, Client
from core.config import settings
from core.logger import app_logger as logger
from typing import Optional

# Global Supabase clients
_supabase_client: Optional[Client] = None
_supabase_public_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """Get Supabase service role client (for backend operations)"""
    global _supabase_client
    
    if not settings.SUPABASE_ENABLED:
        return None
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase credentials not configured")
        return None
    
    if _supabase_client is None:
        try:
            _supabase_client = create_client(
                str(settings.SUPABASE_URL),
                str(settings.SUPABASE_SERVICE_ROLE_KEY)
            )
            logger.info("Supabase client initialized (service role)")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            return None
    
    return _supabase_client


def get_supabase_public_client() -> Optional[Client]:
    """Get Supabase public client (for frontend operations)"""
    global _supabase_public_client
    
    if not settings.SUPABASE_ENABLED:
        return None
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        logger.warning("Supabase public credentials not configured")
        return None
    
    if _supabase_public_client is None:
        try:
            _supabase_public_client = create_client(
                str(settings.SUPABASE_URL),
                str(settings.SUPABASE_ANON_KEY)
            )
            logger.info("Supabase public client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase public client: {e}")
            return None
    
    return _supabase_public_client


def is_supabase_enabled() -> bool:
    """Check if Supabase is enabled and configured"""
    return (
        settings.SUPABASE_ENABLED and
        bool(settings.SUPABASE_URL) and
        bool(settings.SUPABASE_SERVICE_ROLE_KEY)
    )


# Note: Clients are initialized lazily (on first use)
# Do not initialize here to avoid import-time errors
