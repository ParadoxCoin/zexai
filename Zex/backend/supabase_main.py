"""
Supabase-First Backend Entry Point
Replaces simple_main.py and migration_main.py
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import uvicorn
from datetime import datetime

from core.config import settings
from core.database import connect_to_db
from core.security import get_current_user
from core.supabase_client import get_supabase_client

app = FastAPI(
    title="AI SaaS Platform - Supabase Max",
    version="3.0.0",
    description="Full Supabase Integration"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev, restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await connect_to_db()

@app.get("/")
async def root():
    return {
        "message": "AI SaaS Platform - Supabase Max Edition",
        "version": "3.0.0",
        "status": "active",
        "supabase": settings.SUPABASE_ENABLED
    }

@app.get("/health")
async def health_check():
    client = get_supabase_client()
    supabase_status = "connected" if client else "disconnected"
    return {
        "status": "healthy",
        "supabase": supabase_status,
        "timestamp": datetime.now().isoformat()
    }

# Auth Routes (Handled by Supabase on Frontend, but we can have helpers)
@app.get("/api/v1/auth/me")
async def get_me(current_user = Depends(get_current_user)):
    return {"data": current_user}

# Example Protected Route
@app.get("/api/v1/protected-data")
async def protected_data(current_user = Depends(get_current_user)):
    return {
        "message": f"Hello {current_user.email}",
        "role": current_user.role,
        "secret_data": "Only for authenticated users"
    }


# Include Routers
# Include Routers
from routes import image_new, dashboard, auth, admin, video_new

app.include_router(auth.router, prefix="/api/v1")
app.include_router(image_new.router, prefix="/api/v1")
app.include_router(video_new.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
from routes import referral
app.include_router(referral.router, prefix="/api/v1")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
