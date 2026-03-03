"""
Configuration settings for the AI SaaS Platform
All sensitive data is loaded from environment variables
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Any
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from .env file"""
    
    # Application
    APP_NAME: str = "AI SaaS Platform"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    
    @field_validator('DEBUG', mode='before')
    @classmethod
    def parse_debug(cls, v: Any) -> bool:
        """Parse DEBUG from string to boolean"""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on")
        return False
    
    # Database
    MONGO_URL: str = ""  # Optional for Supabase Max
    DB_NAME: str = "ai_saas"
    
    # Redis (Cache, Rate Limiting, Celery)
    REDIS_URL: str = "redis://localhost:6379"
    
    # Supabase Configuration (Primary)
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_ENABLED: bool = True
    SUPABASE_STORAGE_BUCKET: str = "ai-saas-media"
    
    # Security
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_DAYS: int = 30
    
    # CORS - Security: Specific origins only
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://app.zexai.io,https://zexai.io,https://yourdomain.com"
    
    @property
    def cors_origins_list(self) -> List[str]:
        origins = self.CORS_ORIGINS.split(',')
        # Filter out empty strings and validate URLs
        return [origin.strip() for origin in origins if origin.strip() and origin.strip() != "*"]
    
    @property
    def admin_emails_list(self) -> List[str]:
        """Get list of admin emails from environment variable"""
        if not self.ADMIN_EMAILS:
            return []
        emails = self.ADMIN_EMAILS.split(',')
        return [email.strip().lower() for email in emails if email.strip()]
    
    # AI Provider API Keys
    FIREWORKS_API_KEY: str = ""
    FAL_API_KEY: str = ""
    PIKA_API_KEY: str = ""
    OPENAI_API_KEY: str = ""  # TTS için
    ELEVENLABS_API_KEY: str = ""  # Audio için
    REPLICATE_API_KEY: str = ""  # Image/Video için
    
    # Payment Providers
    # Credit/Debit Card
    LEMONSQUEEZY_API_KEY: str = ""
    TWOCHECKOUT_API_KEY: str = ""
    
    # Crypto Payments
    NOWPAYMENTS_API_KEY: str = ""
    NOWPAYMENTS_IPN_SECRET: str = ""
    BINANCE_API_KEY: str = ""
    BINANCE_SECRET: str = ""
    
    # MetaMask (Your own token with 15% discount)
    METAMASK_CONTRACT_ADDRESS: str = ""
    COMPANY_WALLET_ADDRESS: str = ""
    METAMASK_DISCOUNT_PERCENT: float = 15.0  # 15% discount for MetaMask payments
    
    # Manus Agent API (for Synapse service)
    MANUS_API_KEY: str = ""
    MANUS_API_ENDPOINT: str = "https://api.manus.ai/v1"
    MANUS_CALLBACK_BASE_URL: str = ""  # Your backend URL for webhooks
    
    # Pollo.ai Video API
    POLLO_API_KEY: str = ""
    POLLO_API_ENDPOINT: str = "https://api.pollo.ai/v1"
    
    # PiAPI & GoAPI & Kie.ai (Video)
    PIAPI_API_KEY: str = ""
    GOAPI_API_KEY: str = ""
    KIE_API_KEY: str = ""  # kie.ai - ~30% cheaper than other providers
    
    # Chat/LLM Provider API Keys
    ANTHROPIC_API_KEY: str = ""  # Claude models
    OPENROUTER_API_KEY: str = ""  # OpenRouter.ai - multi-model gateway
    GEMINI_API_KEY: str = ""  # Google Gemini

    # Email (Resend)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@example.com"

    # Cloudflare R2 Storage (Fallback)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_BUCKET: str = ""
    R2_ENDPOINT_URL: str = ""
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:3001"
    
    # OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/github/callback"
    
    DISCORD_CLIENT_ID: str = ""
    DISCORD_CLIENT_SECRET: str = ""
    DISCORD_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/discord/callback"
    
    # Credit System
    DEFAULT_USD_TO_CREDIT_RATE: int = 100  # 1 USD = 100 credits
    
    # Admin Configuration - Security: Environment-based admin emails
    ADMIN_EMAILS: str = ""  # Comma-separated list of admin emails
    
    # Monitoring and Error Tracking
    SENTRY_DSN: str = ""  # Sentry DSN for error tracking
    SENTRY_ENVIRONMENT: str = "development"  # development, staging, production
    
    # Environment
    ENVIRONMENT: str = "development"  # development, staging, production
    
    # Webhook Configuration
    WEBHOOK_BASE_URL: str = ""  # Base URL for webhooks
    
    # AWS S3 Configuration (Alternative to R2)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "us-east-1"
    
    # R2 Alternative Bucket Name
    R2_BUCKET: str = ""  # Alternative bucket name field
    
    # Email Configuration
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@yourdomain.com"
    
    # Web Push Notification Config
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CLAIM_EMAIL: str = ""
    
    # SMS Configuration (Twilio)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    
    # Analytics
    GA_TRACKING_ID: str = ""  # Google Analytics
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = "https://app.posthog.com"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # Testing
    TEST_MODE: bool = False
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    class Config:
        # Find .env file in backend directory
        env_file = str(Path(__file__).parent.parent / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env that aren't in config
        protected_namespaces = ()


# Global settings instance
settings = Settings()

