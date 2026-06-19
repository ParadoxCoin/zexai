"""
Rate Limiter Configuration
Uses slowapi for rate limiting with predefined limits
"""
from slowapi import Limiter
from slowapi.util import get_remote_address


class RateLimits:
    """Predefined rate limit constants"""
    # Public endpoints - more lenient
    PUBLIC_READ = "100/minute"
    
    # User profile operations
    PROFILE_UPDATE = "30/minute"
    
    # File operations
    FILE_UPLOAD = "20/minute"
    FILE_DOWNLOAD = "60/minute"
    
    # AI Generation (expensive operations)
    AI_GENERATION = "10/minute"
    AI_CHAT = "30/minute"
    
    # Admin operations
    ADMIN_READ = "100/minute"
    ADMIN_WRITE = "50/minute"
    
    # Authentication
    AUTH_LOGIN = "10/minute"
    AUTH_REGISTER = "5/minute"
    
    # Webhooks
    WEBHOOK = "100/minute"


limiter = Limiter(key_func=get_remote_address)
