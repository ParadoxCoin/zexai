"""
Admin routes for video system management
- Pricing multiplier configuration
- Model enable/disable
- Usage statistics
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from typing import Optional

from core.security import get_current_admin_user
from core.database import get_database
from core.pollo_models import POLLO_VIDEO_MODELS, POLLO_VIDEO_EFFECTS


router = APIRouter(prefix="/admin/video", tags=["Admin - Video"])


@router.get("/pricing/multiplier")
async def get_pricing_multiplier(
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """Get current pricing multiplier"""
    config = await db.video_pricing.find_one({"type": "multiplier"})
    
    return {
        "multiplier": config.get("value", 2.0) if config else 2.0,
        "updated_at": config.get("updated_at") if config else None
    }


@router.post("/pricing/multiplier")
async def update_pricing_multiplier(
    multiplier: float,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """
    Update video pricing multiplier
    Default: 2.0 (Pollo.ai cost × 2)
    Example: multiplier=2.5 means $0.35 Pollo cost → $0.875 → 88 credits
    """
    if multiplier < 1.0 or multiplier > 10.0:
        raise HTTPException(
            status_code=400,
            detail="Multiplier must be between 1.0 and 10.0"
        )
    
    await db.video_pricing.update_one(
        {"type": "multiplier"},
        {
            "$set": {
                "value": multiplier,
                "updated_at": datetime.utcnow(),
                "updated_by": admin_user.id
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Pricing multiplier updated to {multiplier}x",
        "multiplier": multiplier
    }


@router.get("/stats")
async def get_video_stats(
    days: int = 30,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """
    Get video generation statistics
    - Total videos generated
    - Credits consumed
    - Popular models
    - Popular effects
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total videos
    total_videos = await db.video_tasks.count_documents({
        "status": "completed",
        "created_at": {"$gte": start_date}
    })
    
    # Total credits consumed
    credits_pipeline = [
        {"$match": {
            "status": "completed",
            "created_at": {"$gte": start_date}
        }},
        {"$group": {
            "_id": None,
            "total_credits": {"$sum": "$credits_used"}
        }}
    ]
    
    credits_result = await db.video_tasks.aggregate(credits_pipeline).to_list(1)
    total_credits = credits_result[0]["total_credits"] if credits_result else 0
    
    # Popular models
    models_pipeline = [
        {"$match": {
            "status": "completed",
            "type": {"$ne": "effect"},
            "created_at": {"$gte": start_date}
        }},
        {"$group": {
            "_id": "$model_id",
            "count": {"$sum": 1},
            "total_credits": {"$sum": "$credits_used"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    popular_models = await db.video_tasks.aggregate(models_pipeline).to_list(10)
    
    # Add model names
    for model in popular_models:
        model_data = POLLO_VIDEO_MODELS.get(model["_id"])
        if model_data:
            model["name"] = model_data["name"]
            model["provider"] = model_data["provider"]
    
    # Popular effects
    effects_pipeline = [
        {"$match": {
            "status": "completed",
            "type": "effect",
            "created_at": {"$gte": start_date}
        }},
        {"$group": {
            "_id": "$effect_id",
            "count": {"$sum": 1},
            "total_credits": {"$sum": "$credits_used"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    popular_effects = await db.video_tasks.aggregate(effects_pipeline).to_list(10)
    
    # Add effect names
    for effect in popular_effects:
        effect_data = POLLO_VIDEO_EFFECTS.get(effect["_id"])
        if effect_data:
            effect["name"] = effect_data["name"]
            effect["icon"] = effect_data["icon"]
    
    # Daily breakdown
    daily_pipeline = [
        {"$match": {
            "status": "completed",
            "created_at": {"$gte": start_date}
        }},
        {"$group": {
            "_id": {
                "$dateToString": {
                    "format": "%Y-%m-%d",
                    "date": "$created_at"
                }
            },
            "videos": {"$sum": 1},
            "credits": {"$sum": "$credits_used"}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_stats = await db.video_tasks.aggregate(daily_pipeline).to_list(days)
    
    return {
        "period_days": days,
        "total_videos": total_videos,
        "total_credits_consumed": total_credits,
        "average_credits_per_video": round(total_credits / total_videos, 2) if total_videos > 0 else 0,
        "popular_models": popular_models,
        "popular_effects": popular_effects,
        "daily_stats": daily_stats
    }


@router.get("/models/list")
async def list_all_models(
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """
    List all available models with Pollo.ai costs
    For admin reference
    """
    # Get current multiplier
    pricing_config = await db.video_pricing.find_one({"type": "multiplier"})
    multiplier = pricing_config.get("value", 2.0) if pricing_config else 2.0
    
    models = []
    for model_id, model_data in POLLO_VIDEO_MODELS.items():
        our_price = model_data["pollo_cost_usd"] * multiplier
        our_credits = int(our_price * 100)
        
        models.append({
            "id": model_id,
            "provider": model_data["provider"],
            "name": model_data["name"],
            "type": model_data["type"],
            "duration": model_data["duration"],
            "pollo_cost_usd": model_data["pollo_cost_usd"],
            "our_price_usd": round(our_price, 2),
            "our_credits": our_credits,
            "quality": model_data["quality"],
            "speed": model_data["speed"]
        })
    
    return {
        "total_models": len(models),
        "current_multiplier": multiplier,
        "models": models
    }


@router.get("/effects/list")
async def list_all_effects(
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """
    List all available effects with Pollo.ai costs
    For admin reference
    """
    # Get current multiplier
    pricing_config = await db.video_pricing.find_one({"type": "multiplier"})
    multiplier = pricing_config.get("value", 2.0) if pricing_config else 2.0
    
    effects = []
    for effect_id, effect_data in POLLO_VIDEO_EFFECTS.items():
        our_price = effect_data["pollo_cost_usd"] * multiplier
        our_credits = int(our_price * 100)
        
        effects.append({
            "id": effect_id,
            "name": effect_data["name"],
            "category": effect_data.get("category"),
            "pollo_cost_usd": effect_data["pollo_cost_usd"],
            "our_price_usd": round(our_price, 2),
            "our_credits": our_credits,
            "requires_two_images": effect_data.get("requires_two_images", False)
        })
    
    return {
        "total_effects": len(effects),
        "current_multiplier": multiplier,
        "effects": effects
    }


@router.get("/revenue")
async def get_video_revenue(
    days: int = 30,
    admin_user = Depends(get_current_admin_user),
    db = Depends(get_database)
):
    """
    Calculate video revenue (credits consumed → USD)
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total credits consumed
    pipeline = [
        {"$match": {
            "status": "completed",
            "created_at": {"$gte": start_date}
        }},
        {"$group": {
            "_id": None,
            "total_credits": {"$sum": "$credits_used"},
            "total_videos": {"$sum": 1}
        }}
    ]
    
    result = await db.video_tasks.aggregate(pipeline).to_list(1)
    
    if not result:
        return {
            "period_days": days,
            "total_credits_consumed": 0,
            "estimated_revenue_usd": 0,
            "total_videos": 0
        }
    
    total_credits = result[0]["total_credits"]
    total_videos = result[0]["total_videos"]
    
    # Convert credits to USD (1 USD = 100 credits)
    estimated_revenue = total_credits / 100
    
    return {
        "period_days": days,
        "total_credits_consumed": total_credits,
        "estimated_revenue_usd": round(estimated_revenue, 2),
        "total_videos": total_videos,
        "average_revenue_per_video": round(estimated_revenue / total_videos, 2) if total_videos > 0 else 0
    }

