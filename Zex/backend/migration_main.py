"""
Migration Backend - Phase 1: Database + Auth
simple_main.py'den başlayarak aşamalı geçiş
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import os
from datetime import datetime

# Temel imports (mevcut dosyalardan)
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False
    print("MongoDB not available, using mock data only")

app = FastAPI(title="AI SaaS Platform API - Migration", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection (optional)
mongodb_client = None
database = None

async def init_database():
    global mongodb_client, database
    if MONGODB_AVAILABLE:
        try:
            mongodb_client = AsyncIOMotorClient("mongodb://localhost:27017")
            database = mongodb_client.ai_saas
            print("MongoDB connected successfully")
        except Exception as e:
            print(f"MongoDB connection failed: {e}")

# Import real model data
try:
    import sys
    sys.path.append('.')
    from core.image_models import ALL_IMAGE_MODELS, IMAGE_TOOLS, SPECIALIZED_GENERATORS
    from core.pollo_models import POLLO_VIDEO_MODELS, POLLO_VIDEO_EFFECTS, EFFECT_PACKAGES
    from core.audio_models import ALL_AUDIO_MODELS, AUDIO_TOOLS
    REAL_DATA_AVAILABLE = True
except ImportError:
    REAL_DATA_AVAILABLE = False
    print("Real model data not available, using mock data")

# Data provider class
class DataProvider:
    @staticmethod
    def get_image_models():
        if REAL_DATA_AVAILABLE:
            models = []
            for model_id, model_data in ALL_IMAGE_MODELS.items():
                models.append({
                    "id": model_id,
                    "name": model_data["name"],
                    "credits": int(model_data["cost_usd"] * 100),  # Convert to credits
                    "quality": model_data["quality"],
                    "provider": model_data["provider"],
                    "description": model_data["description"],
                    "badge": model_data.get("badge"),
                    "type": model_data["type"]
                })
            return models
        else:
            # Fallback mock data
            return [
                {"id": "fal-flux-pro", "name": "FLUX Pro", "credits": 12, "quality": 10, "provider": "Fal.ai", "description": "Highest quality image generation"},
                {"id": "fal-flux-dev", "name": "FLUX Dev", "credits": 8, "quality": 9, "provider": "Fal.ai", "description": "Development version of FLUX"},
            ]
    
    @staticmethod
    def get_image_tools():
        if REAL_DATA_AVAILABLE:
            tools = []
            for tool_id, tool_data in IMAGE_TOOLS.items():
                tools.append({
                    "id": tool_id,
                    "name": tool_data["name"],
                    "icon": tool_data["icon"],
                    "description": tool_data["description"],
                    "credits": int(tool_data["cost_usd"] * 100),
                    "provider": tool_data["provider"]
                })
            return tools
        else:
            return [
                {"id": "bg-remover", "name": "Remove Background", "icon": "✂️", "description": "AI-powered background removal", "credits": 2},
                {"id": "upscaler", "name": "AI Upscale", "icon": "🔍", "description": "Increase image resolution 4x", "credits": 3},
            ]
    
    @staticmethod
    def get_image_generators():
        return [
            {"id": "portrait-gen", "name": "Portrait Generator", "icon": "👤", "description": "Generate realistic portraits", "credits": 12},
            {"id": "landscape-gen", "name": "Landscape Generator", "icon": "🏞️", "description": "Create beautiful landscapes", "credits": 10},
            {"id": "architecture-gen", "name": "Architecture Generator", "icon": "🏢", "description": "Design buildings and structures", "credits": 15},
            {"id": "fantasy-gen", "name": "Fantasy Generator", "icon": "🧙", "description": "Create fantasy scenes", "credits": 18},
            {"id": "product-gen", "name": "Product Generator", "icon": "📦", "description": "Generate product images", "credits": 8},
            {"id": "logo-gen", "name": "Logo Generator", "icon": "🎨", "description": "Create professional logos", "credits": 6},
        ]
    
    @staticmethod
    def get_video_models():
        return [
            {"id": "pollo-t2v-v2", "name": "Pollo T2V v2", "credits": 25, "provider": "Pollo.ai", "description": "Text to video generation v2"},
            {"id": "pollo-i2v-v2", "name": "Pollo I2V v2", "credits": 18, "provider": "Pollo.ai", "description": "Image to video generation v2"},
            {"id": "runway-gen2", "name": "RunwayML Gen-2", "credits": 30, "provider": "RunwayML", "description": "Advanced video generation"},
            {"id": "pika-labs", "name": "Pika Labs", "credits": 20, "provider": "Pika", "description": "AI video creation"},
        ]
    
    @staticmethod
    def get_video_effects():
        return [
            {"id": "slow-motion", "name": "Slow Motion", "icon": "🐌", "description": "Create slow motion effects", "credits": 8},
            {"id": "time-lapse", "name": "Time Lapse", "icon": "⏱️", "description": "Speed up video sequences", "credits": 6},
            {"id": "color-grade", "name": "Color Grading", "icon": "🌈", "description": "Professional color correction", "credits": 10},
            {"id": "stabilize", "name": "Stabilization", "icon": "🎥", "description": "Remove camera shake", "credits": 7},
            {"id": "face-swap-video", "name": "Face Swap", "icon": "🔄", "description": "Replace faces in video", "credits": 15},
        ]
    
    @staticmethod
    def get_video_packages():
        return [
            {"id": "cinematic-pack", "name": "Cinematic Pack", "icon": "🎬", "description": "Professional cinematic effects", "total_credits": 50, "discount_percent": 20, "effects": ["slow-motion", "color-grade", "stabilize"]},
            {"id": "social-pack", "name": "Social Media Pack", "icon": "📱", "description": "Perfect for social content", "total_credits": 30, "discount_percent": 15, "effects": ["time-lapse", "face-swap-video"]},
            {"id": "creator-pack", "name": "Creator Pack", "icon": "✨", "description": "All-in-one creator toolkit", "total_credits": 80, "discount_percent": 25, "effects": ["slow-motion", "time-lapse", "color-grade", "stabilize", "face-swap-video"]},
        ]
    
    @staticmethod
    def get_audio_models():
        return [
            {"id": "eleven-turbo", "name": "ElevenLabs Turbo", "credits": 3, "provider": "ElevenLabs", "description": "Fast, high-quality TTS"},
            {"id": "eleven-multilingual", "name": "ElevenLabs Multilingual", "credits": 5, "provider": "ElevenLabs", "description": "Multi-language support"},
            {"id": "google-neural", "name": "Google Neural2", "credits": 6, "provider": "Google", "description": "Natural neural voices"},
            {"id": "google-wavenet", "name": "Google WaveNet", "credits": 4, "provider": "Google", "description": "High-quality speech synthesis"},
        ]

# Routes
@app.get("/")
async def root():
    return {
        "message": "AI SaaS Platform API - Migration Phase 1", 
        "version": "2.0.0", 
        "status": "running",
        "database": "connected" if database else "mock_only"
    }

# Image routes
@app.get("/api/v1/image/models")
async def get_image_models(type: str = "text_to_image"):
    return {"data": MockData.get_image_models()}

@app.get("/api/v1/image/tools")
async def get_image_tools():
    return {"data": MockData.get_image_tools()}

@app.get("/api/v1/image/generators")
async def get_image_generators():
    return {"data": MockData.get_image_generators()}

@app.get("/api/v1/image/my-images")
async def get_my_images():
    return {"data": {"outputs": []}}

# Video routes
@app.get("/api/v1/video/models")
async def get_video_models(type: str = "text_to_video"):
    return {"data": MockData.get_video_models()}

@app.get("/api/v1/video/effects")
async def get_video_effects():
    return {"data": MockData.get_video_effects()}

@app.get("/api/v1/video/effect-packages")
async def get_video_packages():
    return {"data": MockData.get_video_packages()}

@app.get("/api/v1/video/my-videos")
async def get_my_videos():
    return {"data": {"outputs": []}}

# Audio routes
@app.get("/api/v1/audio/models/tts")
async def get_audio_models():
    return {"data": MockData.get_audio_models()}

@app.get("/api/v1/audio/my-audio")
async def get_my_audio():
    return {"data": {"outputs": []}}

# Other routes
@app.get("/api/v1/synapse/tasks")
async def get_synapse_tasks():
    return {"data": []}

@app.get("/api/v1/media")
async def get_media(page: int = 1, size: int = 12):
    return {"data": {"items": [], "total_pages": 1}}

# Generation endpoints (mock responses)
@app.post("/api/v1/image/generate")
async def generate_image(data: Dict[str, Any]):
    return {"message": "Image generation started", "task_id": f"img_{datetime.now().strftime('%Y%m%d_%H%M%S')}"}

@app.post("/api/v1/video/generate")
async def generate_video(data: Dict[str, Any]):
    return {"message": "Video generation started", "task_id": f"vid_{datetime.now().strftime('%Y%m%d_%H%M%S')}"}

@app.post("/api/v1/audio/tts")
async def generate_tts(data: Dict[str, Any]):
    return {"message": "TTS generation started", "task_id": f"tts_{datetime.now().strftime('%Y%m%d_%H%M%S')}"}

@app.post("/api/v1/synapse/tasks")
async def create_synapse_task(data: Dict[str, Any]):
    return {"message": "Synapse task created", "task_id": f"syn_{datetime.now().strftime('%Y%m%d_%H%M%S')}"}

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "database": "connected" if database else "mock_only",
        "phase": "1 - Database + Mock Data"
    }

@app.on_event("startup")
async def startup_event():
    await init_database()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)