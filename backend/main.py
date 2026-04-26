"""
AI SaaS Platform - Main Application
Modular FastAPI application with credit-based billing system
"""
# Load .env before anything else
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import os

from core.config import settings
from core.database import connect_to_db, close_db_connection
from core.logger import app_logger as logger
from core.rate_limiter import limiter
from core.exceptions import (
    AIException, ValidationError, AuthenticationError, AuthorizationError,
    DatabaseError, ExternalServiceError, CreditInsufficientError,
    RateLimitExceededError, FileProcessingError, PaymentProcessingError,
    convert_to_http_exception
)
# Import the provider manager instance
from core.ai_provider_manager import ai_provider_manager

# Import all routers
from routes.auth import router as auth_router
from routes.user import router as user_router
from routes.media import router as media_router
from routes.dashboard import router as dashboard_router
from routes.files import router as files_router
from routes.chat import router as chat_router
from routes.image import router as image_tools_router  # Image tools (img2img, face-swap, inpaint, etc.)
# from routes.video import router as video_router  # Old - doesn't exist
from routes.video_new import router as video_new_router
from routes.image_new import router as image_new_router
from routes.audio import router as audio_tts_router  # TTS, Music generation
from routes.audio_extended import router as audio_extended_router  # Extended audio features
from routes.synapse import router as synapse_router
from routes.admin import router as admin_router
from routes.admin_video import router as admin_video_router
from routes.admin_image import router as admin_image_router
from routes.billing import router as billing_router
from routes.health import router as health_router
from routes.metrics import router as metrics_router
from routes.admin_pricing_enhanced import router as admin_pricing_enhanced_router
from routes.admin_models import router as admin_models_router
from routes.dashboard_enhanced import router as dashboard_enhanced_router
from routes.admin_enhanced import router as admin_enhanced_router
from routes.webhooks import router as webhooks_router
from routes.referral import router as referral_router
from routes.admin_providers import router as admin_providers_router
from routes.admin_settings import router as admin_settings_router
from routes.admin_audit import router as admin_audit_router
from routes.admin_roles import router as admin_roles_router
from routes.admin_billing import router as admin_billing_router
from routes.admin_rate_limits import router as admin_rate_limits_router
from routes.admin_scheduler import router as admin_scheduler_router
from routes.admin_key_vault import router as admin_key_vault_router
from routes.admin_ab_testing import router as admin_ab_testing_router
from routes.admin_analytics import router as admin_analytics_router
from routes.admin_email import router as admin_email_router
from routes.marketplace import router as marketplace_router
from routes.admin_reports import router as admin_reports_router
from routes.notifications import router as notifications_router
from routes.admin_airdrop import router as admin_airdrop_router
from routes.gamification import router as gamification_router
from routes.avatar import router as avatar_router
from routes.prompt import router as prompt_router
from routes.social import router as social_router
from routes.voice_clone import router as voice_clone_router
from routes.comparison import router as comparison_router
from routes.staking import router as staking_router
from routes.nft import router as nft_router
from routes.collections import router as collections_router
from core.websocket import websocket_endpoint
from core.websocket_enhanced import websocket_endpoint_enhanced
from core.scheduler import get_scheduler
from fastapi import WebSocket
from services.status_poller import status_poller


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    Handles startup and shutdown operations
    """
    # Startup
    logger.info("🚀 Starting AI SaaS Platform...")
    
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Initialize Sentry if DSN is valid and not a placeholder
    if settings.SENTRY_DSN and "your-sentry-dsn" not in settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.1,
            environment=settings.SENTRY_ENVIRONMENT
        )
        logger.info(f"✅ Sentry initialized for {settings.SENTRY_ENVIRONMENT} environment")
    else:
        logger.warning("⚠️ Sentry DSN not configured or is a placeholder - error tracking disabled")
    
    # Initialize database connection
    await connect_to_db()

    # Start the AI provider health monitoring
    ai_provider_manager.start_monitoring()

    # Start scheduler and register default jobs
    try:
        from core.scheduled_tasks import register_default_jobs
        scheduler = get_scheduler()
        scheduler.start()
        register_default_jobs()
        logger.info("✅ Scheduler started with default jobs")
    except Exception as e:
        logger.warning(f"⚠️ Scheduler initialization failed: {e}")

    # Start background status poller for Kie.ai video updates
    try:
        await status_poller.start()
        logger.info("✅ Background status poller started")
    except Exception as e:
        logger.warning(f"⚠️ Status poller start failed: {e}")

    logger.info("✅ Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AI SaaS Platform...")
    
    # Stop scheduler
    try:
        scheduler = get_scheduler()
        scheduler.stop()
        logger.info("✅ Scheduler stopped")
    except Exception as e:
        logger.warning(f"⚠️ Scheduler stop failed: {e}")
    
    # Stop status poller
    try:
        await status_poller.stop()
        logger.info("✅ Status poller stopped")
    except Exception as e:
        logger.warning(f"⚠️ Status poller stop failed: {e}")
    
    await ai_provider_manager.stop_monitoring()
    await close_db_connection()
    logger.info("✅ Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-modal AI SaaS platform with credit-based billing. Includes Chat, Image, Video, and Synapse (Agent) services.",
    version=settings.APP_VERSION,
    lifespan=lifespan
)


# Rate Limiter State
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Production security middleware
if settings.ENVIRONMENT == "production":
    # HTTPS redirect
    app.add_middleware(HTTPSRedirectMiddleware)

# Global exception handlers
@app.exception_handler(AIException)
async def ai_exception_handler(request: Request, exc: AIException):
    """Handle custom AI exceptions"""
    logger.error(f"AI Exception: {exc.message}", extra={
        "error_code": exc.error_code,
        "details": exc.details,
        "path": request.url.path,
        "method": request.method
    })
    return convert_to_http_exception(exc)

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle validation errors"""
    logger.warning(f"Validation Error: {exc.message}", extra={
        "field": exc.details.get("field"),
        "value": exc.details.get("value"),
        "path": request.url.path
    })
    return convert_to_http_exception(exc)

@app.exception_handler(DatabaseError)
async def database_exception_handler(request: Request, exc: DatabaseError):
    """Handle database errors"""
    logger.error(f"Database Error: {exc.message}", extra={
        "operation": exc.details.get("operation"),
        "path": request.url.path
    })
    return convert_to_http_exception(exc)

@app.exception_handler(ExternalServiceError)
async def external_service_exception_handler(request: Request, exc: ExternalServiceError):
    """Handle external service errors"""
    logger.error(f"External Service Error: {exc.message}", extra={
        "service": exc.details.get("service"),
        "status_code": exc.details.get("status_code"),
        "path": request.url.path
    })
    return convert_to_http_exception(exc)

# CORS Middleware - Security: Specific methods and headers only
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["X-Total-Count", "X-Page-Count"]
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    logger.info(f"📥 {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"📤 {request.method} {request.url.path} - Status: {response.status_code}")
    return response


# Include all routers with /api/v1 prefix
API_V1_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_V1_PREFIX)
app.include_router(user_router, prefix=API_V1_PREFIX)
app.include_router(media_router, prefix=API_V1_PREFIX)
app.include_router(dashboard_router, prefix=API_V1_PREFIX)
app.include_router(files_router, prefix=API_V1_PREFIX)
app.include_router(chat_router, prefix=API_V1_PREFIX)
app.include_router(image_tools_router, prefix=API_V1_PREFIX)  # Image tools router
app.include_router(image_new_router, prefix=API_V1_PREFIX)  # New multi-provider image router
# app.include_router(video_router, prefix=API_V1_PREFIX)  # Old video router - doesn't exist
app.include_router(video_new_router, prefix=API_V1_PREFIX)  # New Pollo.ai video router
app.include_router(audio_tts_router, prefix=API_V1_PREFIX)  # Audio TTS, Music (/audio prefix)
app.include_router(audio_extended_router, prefix=API_V1_PREFIX)  # Audio Extended features
app.include_router(synapse_router, prefix=API_V1_PREFIX)
# IMPORTANT: Enhanced admin routers MUST come before base admin router
# because they have more specific routes (e.g., /users/advanced vs /users/{user_id})
app.include_router(admin_enhanced_router, prefix=API_V1_PREFIX)  # Enhanced admin panel - MUST BE FIRST
app.include_router(admin_router, prefix=API_V1_PREFIX)
app.include_router(admin_video_router, prefix=API_V1_PREFIX)  # Video admin
app.include_router(admin_image_router, prefix=API_V1_PREFIX)  # Image admin
app.include_router(admin_models_router, prefix=API_V1_PREFIX)  # Model management admin
app.include_router(admin_providers_router, prefix=API_V1_PREFIX)  # Provider management admin
app.include_router(admin_settings_router, prefix=API_V1_PREFIX)  # Settings management admin
app.include_router(admin_audit_router, prefix=API_V1_PREFIX)  # Audit log admin
app.include_router(admin_roles_router, prefix=API_V1_PREFIX)  # Role management admin
app.include_router(admin_billing_router, prefix=API_V1_PREFIX)  # Billing management admin
app.include_router(admin_rate_limits_router, prefix=API_V1_PREFIX)  # Rate limiting admin
app.include_router(admin_scheduler_router, prefix=API_V1_PREFIX)  # Scheduler management admin
app.include_router(admin_key_vault_router, prefix=API_V1_PREFIX)  # API Key Vault admin
app.include_router(admin_ab_testing_router, prefix=API_V1_PREFIX)  # A/B Testing admin
app.include_router(billing_router, prefix=API_V1_PREFIX)
app.include_router(health_router, prefix=API_V1_PREFIX)  # Health checks
app.include_router(metrics_router, prefix=API_V1_PREFIX)  # Metrics for monitoring
app.include_router(admin_pricing_enhanced_router, prefix=API_V1_PREFIX)  # Enhanced admin pricing
app.include_router(dashboard_enhanced_router, prefix=API_V1_PREFIX)  # Enhanced dashboard
app.include_router(webhooks_router, prefix=API_V1_PREFIX)  # Webhook handlers
app.include_router(referral_router, prefix=API_V1_PREFIX)  # Referral System
app.include_router(admin_analytics_router, prefix=API_V1_PREFIX)  # Analytics Dashboard
app.include_router(admin_email_router, prefix=API_V1_PREFIX)  # Email Templates
app.include_router(marketplace_router, prefix=API_V1_PREFIX)  # Model Marketplace
app.include_router(admin_reports_router, prefix=API_V1_PREFIX)  # Advanced Reports
app.include_router(notifications_router, prefix=API_V1_PREFIX)  # Notifications
app.include_router(admin_airdrop_router, prefix=API_V1_PREFIX)  # Admin Airdrop
app.include_router(gamification_router, prefix=API_V1_PREFIX)  # Gamification System
app.include_router(avatar_router, prefix=API_V1_PREFIX)  # AI Avatar / Lip Sync
app.include_router(prompt_router, prefix=API_V1_PREFIX)  # AI Prompt Enhancer
app.include_router(social_router, prefix=API_V1_PREFIX)  # Social Features
app.include_router(voice_clone_router, prefix=API_V1_PREFIX)  # Voice Clone
from routes.packages import router as packages_router
from routes.staking import router as staking_router
app.include_router(packages_router, prefix=API_V1_PREFIX)  # Effect Packages
app.include_router(comparison_router, prefix=API_V1_PREFIX)  # Model Comparison
app.include_router(staking_router, prefix=API_V1_PREFIX)  # Web3 Staking Claims
app.include_router(nft_router, prefix=API_V1_PREFIX)  # NFT Minting
app.include_router(collections_router, prefix=API_V1_PREFIX) # AI NFT Collections
# WebSocket endpoints
@app.websocket("/ws")
async def websocket_route(websocket: WebSocket, token: str = None):
    """Legacy WebSocket endpoint for compatibility"""
    await websocket_endpoint(websocket, token)

@app.websocket("/ws/enhanced")
async def websocket_enhanced_route(websocket: WebSocket, token: str = None):
    """Enhanced WebSocket endpoint with Supabase real-time integration"""
    await websocket_endpoint_enhanced(websocket, token)


@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "message": "Welcome to AI SaaS Platform API",
        "version": settings.APP_VERSION,
        "services": [
            "Authentication",
            "Chat (AI Conversations)",
            "Image Generation",
            "Video Generation",
            "Synapse (Autonomous Agent)",
            "Admin Panel",
            "Billing & Subscriptions (Hybrid Model)"
        ],
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
