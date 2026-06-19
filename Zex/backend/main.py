"""
AI SaaS Platform - Main Application
Modular FastAPI application with credit-based billing system
"""
# Add the current directory to sys.path to ensure modules are found correctly
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load .env before anything else
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

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

# Import router registry
from routes.registry import register_routers

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
# --- SECURITY HARDENING: Disable /docs and /redoc in production ---
_is_production = settings.ENVIRONMENT == "production" or not settings.DEBUG
app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-modal AI SaaS platform with credit-based billing. Includes Chat, Image, Video, and Synapse (Agent) services.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)


# Rate Limiter State
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware setup
# --- SECURITY HARDENING: Restrict origins and methods ---
_allowed_origins = settings.cors_origins_list if hasattr(settings, 'cors_origins_list') else [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://zexai.vercel.app",
    "https://app.zexai.io",
    "https://zexai-production.up.railway.app"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    # SECURITY HARDENING: Explicit method list instead of wildcard "*"
    # Removes CONNECT, TRACE and other methods not needed by the API.
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Production security middleware
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "app.zexai.io",
            "api.zexai.io",
            "zexai.io",
            "zexai-production.up.railway.app",
            "*.railway.app",          # Railway health checks
        ],
    )

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

# Request logging + Security Headers middleware
@app.middleware("http")
async def log_requests_and_add_security_headers(request: Request, call_next):
    """Log all incoming requests and inject security headers on every response"""
    logger.info(f"📥 {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"📤 {request.method} {request.url.path} - Status: {response.status_code}")
    # --- SECURITY HARDENING: Inject security headers on all API responses ---
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # SECURITY: Real Content-Security-Policy (W3C standard, replaces legacy X-Content-Security-Policy)
    # 'unsafe-inline'/'unsafe-eval' required for Vite/React runtime and wagmi/ethers wallet libs.
    # connect-src covers Supabase REST+realtime, Alchemy RPC, and WalletConnect relay servers.
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "img-src 'self' data: blob: https:; "
        "media-src 'self' blob: https:; "
        "connect-src 'self' "
            "https://*.supabase.co wss://*.supabase.co "
            "https://api.alchemy.com https://polygon-rpc.com "
            "https://relay.walletconnect.com wss://relay.walletconnect.com "
            "https://rpc.walletconnect.com https://*.reown.com; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "object-src 'none'"
    )
    # Remove server fingerprint header if present. Starlette's MutableHeaders
    # does not implement dict.pop(), so use deletion guarded by membership.
    if "Server" in response.headers:
        del response.headers["Server"]
    return response


# Include all routers with /api/v1 prefix
API_V1_PREFIX = "/api/v1"

register_routers(app, API_V1_PREFIX)


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
async def health_check_simple():
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

# Trigger reload
