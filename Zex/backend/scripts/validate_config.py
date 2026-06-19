#!/usr/bin/env python3
"""
Configuration validation script for production deployment
Validates all critical environment variables and settings
"""

import os
import sys
from pathlib import Path
import secrets
import re
from urllib.parse import urlparse

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from core.config import settings

class ConfigValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        
    def error(self, message: str):
        self.errors.append(f"❌ ERROR: {message}")
        
    def warning(self, message: str):
        self.warnings.append(f"⚠️  WARNING: {message}")
        
    def info(self, message: str):
        print(f"ℹ️  INFO: {message}")
        
    def validate_jwt_secret(self):
        """Validate JWT secret key strength"""
        if not settings.JWT_SECRET_KEY:
            self.error("JWT_SECRET_KEY is not set")
            return
            
        if len(settings.JWT_SECRET_KEY) < 32:
            self.error("JWT_SECRET_KEY must be at least 32 characters long")
            
        if settings.JWT_SECRET_KEY == "your-super-secret-key-min-32-chars-change-this":
            self.error("JWT_SECRET_KEY is using default value - CHANGE IT!")
            
        # Check for common weak patterns
        weak_patterns = [
            "password", "secret", "key", "admin", "test", "demo",
            "123456", "qwerty", "abc123"
        ]
        
        secret_lower = settings.JWT_SECRET_KEY.lower()
        for pattern in weak_patterns:
            if pattern in secret_lower:
                self.warning(f"JWT_SECRET_KEY contains weak pattern: {pattern}")
                
    def validate_database(self):
        """Validate database configuration"""
        if not settings.MONGO_URL:
            self.error("MONGO_URL is not set")
            return
            
        # Check if using default localhost in production
        if settings.ENVIRONMENT == "production" and "localhost" in settings.MONGO_URL:
            self.warning("Using localhost MongoDB in production environment")
            
        # Validate MongoDB URL format
        if not settings.MONGO_URL.startswith(("mongodb://", "mongodb+srv://")):
            self.error("MONGO_URL must start with mongodb:// or mongodb+srv://")
            
    def validate_redis(self):
        """Validate Redis configuration"""
        if not settings.REDIS_URL:
            self.warning("REDIS_URL is not set - rate limiting will use memory storage")
            return
            
        if settings.ENVIRONMENT == "production" and "localhost" in settings.REDIS_URL:
            self.warning("Using localhost Redis in production environment")
            
    def validate_cors(self):
        """Validate CORS configuration"""
        origins = settings.cors_origins_list
        
        if not origins:
            self.error("No CORS origins configured")
            return
            
        # Check for wildcard in production
        if settings.ENVIRONMENT == "production" and "*" in settings.CORS_ORIGINS:
            self.error("Wildcard CORS origin (*) not allowed in production")
            
        # Validate origin URLs
        for origin in origins:
            if not origin.startswith(("http://", "https://")):
                self.error(f"Invalid CORS origin format: {origin}")
            elif settings.ENVIRONMENT == "production" and origin.startswith("http://"):
                self.warning(f"HTTP origin in production: {origin} (should use HTTPS)")
                
    def validate_ai_providers(self):
        """Validate AI provider API keys"""
        providers = {
            "FIREWORKS_API_KEY": "Fireworks AI",
            "FAL_API_KEY": "Fal.ai",
            "ELEVENLABS_API_KEY": "ElevenLabs",
            "REPLICATE_API_KEY": "Replicate",
            "POLLO_API_KEY": "Pollo.ai"
        }
        
        missing_providers = []
        for key, name in providers.items():
            if not getattr(settings, key, ""):
                missing_providers.append(name)
                
        if missing_providers:
            self.warning(f"Missing AI provider keys: {', '.join(missing_providers)}")
            
    def validate_payment_providers(self):
        """Validate payment provider configuration"""
        providers = {
            "LEMONSQUEEZY_API_KEY": "LemonSqueezy",
            "NOWPAYMENTS_API_KEY": "NOWPayments",
            "BINANCE_API_KEY": "Binance Pay"
        }
        
        configured_providers = []
        for key, name in providers.items():
            if getattr(settings, key, ""):
                configured_providers.append(name)
                
        if not configured_providers:
            self.warning("No payment providers configured")
        else:
            self.info(f"Configured payment providers: {', '.join(configured_providers)}")
            
    def validate_oauth(self):
        """Validate OAuth configuration"""
        oauth_providers = [
            ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "Google"),
            ("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GitHub"),
            ("DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "Discord")
        ]
        
        configured_oauth = []
        for client_id_key, client_secret_key, name in oauth_providers:
            client_id = getattr(settings, client_id_key, "")
            client_secret = getattr(settings, client_secret_key, "")
            
            if client_id and client_secret:
                configured_oauth.append(name)
            elif client_id or client_secret:
                self.warning(f"{name} OAuth partially configured (missing client_id or client_secret)")
                
        if configured_oauth:
            self.info(f"Configured OAuth providers: {', '.join(configured_oauth)}")
        else:
            self.warning("No OAuth providers configured")
            
    def validate_storage(self):
        """Validate storage configuration"""
        # Check Supabase
        supabase_configured = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)
        
        # Check AWS S3
        s3_configured = bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.AWS_S3_BUCKET)
        
        # Check Cloudflare R2
        r2_configured = bool(settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY and settings.R2_BUCKET_NAME)
        
        storage_providers = []
        if supabase_configured:
            storage_providers.append("Supabase")
        if s3_configured:
            storage_providers.append("AWS S3")
        if r2_configured:
            storage_providers.append("Cloudflare R2")
            
        if not storage_providers:
            self.warning("No storage providers configured")
        else:
            self.info(f"Configured storage providers: {', '.join(storage_providers)}")
            
    def validate_monitoring(self):
        """Validate monitoring configuration"""
        if not settings.SENTRY_DSN:
            self.warning("SENTRY_DSN not configured - error tracking disabled")
        else:
            self.info("Sentry error tracking configured")
            
        if settings.ENVIRONMENT == "production" and settings.SENTRY_ENVIRONMENT != "production":
            self.warning(f"Environment is production but Sentry environment is {settings.SENTRY_ENVIRONMENT}")
            
    def validate_security(self):
        """Validate security settings"""
        if settings.ENVIRONMENT == "production":
            if settings.DEBUG:
                self.error("DEBUG mode is enabled in production")
                
            # Check for localhost URLs in production
            localhost_fields = [
                "FRONTEND_URL", "GOOGLE_REDIRECT_URI", 
                "GITHUB_REDIRECT_URI", "DISCORD_REDIRECT_URI"
            ]
            
            for field in localhost_fields:
                value = getattr(settings, field, "")
                if value and "localhost" in value:
                    self.warning(f"{field} contains localhost in production: {value}")
                    
    def generate_secure_jwt_secret(self):
        """Generate a secure JWT secret"""
        return secrets.token_urlsafe(64)
        
    def run_validation(self):
        """Run all validations"""
        print("🔍 Validating AI SaaS Platform Configuration...")
        print(f"Environment: {settings.ENVIRONMENT}")
        print("-" * 60)
        
        self.validate_jwt_secret()
        self.validate_database()
        self.validate_redis()
        self.validate_cors()
        self.validate_ai_providers()
        self.validate_payment_providers()
        self.validate_oauth()
        self.validate_storage()
        self.validate_monitoring()
        self.validate_security()
        
        print("-" * 60)
        
        # Print results
        if self.errors:
            print("🚨 CRITICAL ERRORS FOUND:")
            for error in self.errors:
                print(error)
            print()
            
        if self.warnings:
            print("⚠️  WARNINGS:")
            for warning in self.warnings:
                print(warning)
            print()
            
        if not self.errors and not self.warnings:
            print("✅ All validations passed!")
        elif not self.errors:
            print("✅ No critical errors found (warnings can be addressed)")
        else:
            print("❌ Critical errors must be fixed before deployment")
            
        # Suggest JWT secret if needed
        if any("JWT_SECRET_KEY" in error for error in self.errors):
            print(f"💡 Suggested secure JWT secret:")
            print(f"JWT_SECRET_KEY={self.generate_secure_jwt_secret()}")
            
        return len(self.errors) == 0

def main():
    validator = ConfigValidator()
    success = validator.run_validation()
    
    if not success:
        sys.exit(1)
    else:
        print("\n🚀 Configuration is ready for deployment!")

if __name__ == "__main__":
    main()