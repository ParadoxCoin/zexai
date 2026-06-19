"""
AI SaaS Platform - Progressive Startup
A minimal FastAPI application to test core services (DB, Cache)
and essential endpoints.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os
from dotenv import load_dotenv

# Load the progressive environment file
load_dotenv(dotenv_path=".env.progressive")

from core.config import settings
from core.database import connect_to_mongo, close_mongo_connection
from core.logger import app_logger as logger
from core.rate_limiter import limiter
from core.exceptions import AIException, convert_to_http_exception

# Import only essential routers
from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.user import router as user_router
from routes.dashboard import router as dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events for the progressive app
    """
    logger.info("🚀 Starting AI SaaS Platform in Progressive Mode...")
    os.makedirs("logs", exist_ok=True)
    
    # Initialize database connection
    await connect_to_mongo()
    logger.info("✅ Application startup complete (Progressive Mode)")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AI SaaS Platform (Progressive Mode)...")
    await close_mongo_connection()
    logger.info("✅ Application shutdown complete (Progressive Mode)")

# Create FastAPI application
app = FastAPI(
    title=f"{settings.APP_NAME} (Progressive)",
    description="A minimal version of the AI SaaS platform for testing core services.",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global exception handler
@app.exception_handler(AIException)
async def ai_exception_handler(request: Request, exc: AIException):
    logger.error(f"AI Exception: {exc.message}", extra={"details": exc.details})
    return convert_to_http_exception(exc)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"📥 {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"📤 {request.method} {request.url.path} - Status: {response.status_code}")
    return response

# Include essential routers
API_V1_PREFIX = "/api/v1"
app.include_router(health_router, prefix=API_V1_PREFIX, tags=["Health"])
app.include_router(auth_router, prefix=API_V1_PREFIX, tags=["Authentication"])
app.include_router(user_router, prefix=API_V1_PREFIX, tags=["User"])
app.include_router(dashboard_router, prefix=API_V1_PREFIX, tags=["Dashboard"])

@app.get("/")
async def root():
    """Root endpoint for the progressive app"""
    return {
        "message": "Welcome to the AI SaaS Platform (Progressive Mode)",
        "status": "Core services are running.",
        "active_endpoints": ["/api/v1/health", "/api/v1/auth", "/api/v1/user"],
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    # This will run the progressive app using the .env.progressive file
    uvicorn.run(
        "progressive_main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
