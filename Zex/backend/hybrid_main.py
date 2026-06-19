"""
Hybrid FastAPI backend - Mock + Real data
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import os
from datetime import datetime

app = FastAPI(title="AI SaaS Platform API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data (same as simple_main.py but organized)
class MockData:
    @staticmethod
    def get_image_models():
        return [
            {"id": "model1", "name": "DALL-E 3", "credits": 10, "quality": 9, "provider": "OpenAI", "description": "High-quality image generation"},
            {"id": "model2", "name": "Midjourney", "credits": 8, "quality": 8, "provider": "Midjourney", "description": "Artistic image generation"},
            {"id": "model3", "name": "Stable Diffusion", "credits": 5, "quality": 7, "provider": "Stability AI", "description": "Open-source image generation"},
        ]
    
    @staticmethod
    def get_image_tools():
        return [
            {"id": "tool1", "name": "Upscale", "icon": "🔍", "description": "Increase image resolution", "credits": 3},
            {"id": "tool2", "name": "Remove Background", "icon": "✂️", "description": "Remove image background", "credits": 2},
            {"id": "tool3", "name": "Style Transfer", "icon": "🎨", "description": "Apply artistic styles", "credits": 4},
            {"id": "tool4", "name": "Face Enhance", "icon": "👤", "description": "Enhance facial features", "credits": 5},
            {"id": "tool5", "name": "Color Correction", "icon": "🌈", "description": "Adjust colors and lighting", "credits": 3},
            {"id": "tool6", "name": "Noise Reduction", "icon": "✨", "description": "Remove image noise", "credits": 2},
        ]

# Routes
@app.get("/")
async def root():
    return {"message": "AI SaaS Platform API", "version": "2.0.0", "status": "running"}

@app.get("/api/v1/image/models")
async def get_image_models(type: str = "text_to_image"):
    return {"data": MockData.get_image_models()}

@app.get("/api/v1/image/tools")
async def get_image_tools():
    return {"data": MockData.get_image_tools()}

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)