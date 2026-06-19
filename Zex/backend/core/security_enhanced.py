"""
Enhanced security utilities for production
Includes password strength validation, secure token generation, and admin management
"""

import secrets
import string
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import bcrypt
import jwt
from core.config import settings
from core.database import get_database
from core.logger import app_logger as logger

class PasswordValidator:
    """Password strength validation"""
    
    @staticmethod
    def validate_strength(password: str) -> Dict[str, Any]:
        """Validate password strength"""
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if len(password) > 128:
            errors.append("Password must be less than 128 characters")
        
        if not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r"\d", password):
            errors.append("Password must contain at least one number")
        
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            errors.append("Password must contain at least one special character")
        
        # Check for common weak passwords
        weak_patterns = [
            "password", "123456", "qwerty", "admin", "user", "test",
            "welcome", "login", "pass", "root", "toor"
        ]
        
        password_lower = password.lower()
        for pattern in weak_patterns:
            if pattern in password_lower:
                errors.append(f"Password contains weak pattern: {pattern}")
                break
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "strength": "strong" if len(errors) == 0 else "weak"
        }

class SecureTokenGenerator:
    """Secure token generation utilities"""
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate secure API key"""
        return f"sk-{secrets.token_urlsafe(32)}"
    
    @staticmethod
    def generate_session_token() -> str:
        """Generate secure session token"""
        return secrets.token_urlsafe(64)
    
    @staticmethod
    def generate_reset_token() -> str:
        """Generate password reset token"""
        return secrets.token_urlsafe(32)

class AdminManager:
    """Secure admin user management"""
    
    @staticmethod
    async def create_admin_user(email: str, created_by: str) -> bool:
        """Create admin user entry in database"""
        try:
            db = get_database()
            
            # Check if already exists
            existing = await db.admin_users.find_one({"email": email.lower()})
            if existing:
                return False
            
            admin_record = {
                "email": email.lower(),
                "is_active": True,
                "created_by": created_by,
                "created_at": datetime.utcnow(),
                "permissions": ["admin", "user_management", "billing_management"]
            }
            
            await db.admin_users.insert_one(admin_record)
            logger.info(f"Admin user created: {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create admin user: {e}")
            return False
    
    @staticmethod
    async def revoke_admin_access(email: str, revoked_by: str) -> bool:
        """Revoke admin access"""
        try:
            db = get_database()
            
            result = await db.admin_users.update_one(
                {"email": email.lower()},
                {
                    "$set": {
                        "is_active": False,
                        "revoked_by": revoked_by,
                        "revoked_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Admin access revoked: {email}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to revoke admin access: {e}")
            return False
    
    @staticmethod
    async def is_admin(email: str) -> bool:
        """Check if user is admin"""
        try:
            db = get_database()
            admin_user = await db.admin_users.find_one({
                "email": email.lower(),
                "is_active": True
            })
            return admin_user is not None
        except Exception as e:
            logger.error(f"Failed to check admin status: {e}")
            return False

class JWTManager:
    """Enhanced JWT token management"""
    
    @staticmethod
    def validate_secret_key() -> bool:
        """Validate JWT secret key strength"""
        if not settings.JWT_SECRET_KEY:
            return False
        
        if len(settings.JWT_SECRET_KEY) < 32:
            return False
        
        # Check for weak patterns
        weak_patterns = ["secret", "key", "password", "admin", "test"]
        secret_lower = settings.JWT_SECRET_KEY.lower()
        
        for pattern in weak_patterns:
            if pattern in secret_lower:
                return False
        
        return True
    
    @staticmethod
    def create_access_token(user_id: str, additional_claims: Optional[Dict] = None) -> str:
        """Create JWT access token with enhanced security"""
        if not JWTManager.validate_secret_key():
            raise ValueError("JWT secret key is not secure enough")
        
        now = datetime.utcnow()
        payload = {
            "user_id": user_id,
            "iat": now,
            "exp": now + timedelta(minutes=settings.JWT_EXPIRATION_DAYS * 24 * 60),
            "jti": secrets.token_urlsafe(16),  # JWT ID for revocation
            "iss": "ai-saas-platform",  # Issuer
            "aud": "ai-saas-users"  # Audience
        }
        
        if additional_claims:
            payload.update(additional_claims)
        
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token with enhanced validation"""
        try:
            if not JWTManager.validate_secret_key():
                logger.error("JWT secret key validation failed")
                return None
            
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_iss": True,
                    "verify_aud": True
                },
                issuer="ai-saas-platform",
                audience="ai-saas-users"
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"JWT verification failed: {e}")
            return None

class SecurityAudit:
    """Security audit and logging"""
    
    @staticmethod
    async def log_security_event(event_type: str, user_id: str, details: Dict[str, Any]):
        """Log security events"""
        try:
            db = get_database()
            
            security_log = {
                "event_type": event_type,
                "user_id": user_id,
                "details": details,
                "timestamp": datetime.utcnow(),
                "ip_address": details.get("ip_address"),
                "user_agent": details.get("user_agent")
            }
            
            await db.security_logs.insert_one(security_log)
            
        except Exception as e:
            logger.error(f"Failed to log security event: {e}")
    
    @staticmethod
    async def check_suspicious_activity(user_id: str) -> bool:
        """Check for suspicious activity patterns"""
        try:
            db = get_database()
            
            # Check for multiple failed logins in last hour
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            failed_logins = await db.security_logs.count_documents({
                "user_id": user_id,
                "event_type": "failed_login",
                "timestamp": {"$gte": one_hour_ago}
            })
            
            if failed_logins >= 10:
                return True
            
            # Check for logins from multiple IPs in short time
            recent_logins = await db.security_logs.find({
                "user_id": user_id,
                "event_type": "successful_login",
                "timestamp": {"$gte": one_hour_ago}
            }).to_list(length=100)
            
            unique_ips = set(log.get("details", {}).get("ip_address") for log in recent_logins)
            if len(unique_ips) > 5:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to check suspicious activity: {e}")
            return False