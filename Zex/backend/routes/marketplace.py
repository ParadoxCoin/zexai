"""
Model Marketplace API
Public endpoints for browsing, rating, and favoriting AI models
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from core.database import get_db
from core.security import get_current_user
from core.unified_model_registry import model_registry
from types import SimpleNamespace

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/marketplace", tags=["Model Marketplace"])


# ============================================
# Schemas
# ============================================

class MarketplaceModel(BaseModel):
    """Model for marketplace display"""
    id: str
    name: str
    category: str  # image, video, chat, audio
    type: str  # text_to_image, text_to_video, etc.
    provider: Optional[str] = None
    provider_name: Optional[str] = None
    credits: int
    cost_usd: float
    quality: Optional[int] = None  # 1-5 stars
    speed: Optional[str] = None  # fast, medium, slow
    badge: Optional[str] = None  # New, Popular, etc.
    description: Optional[str] = None
    is_featured: bool = False
    is_active: bool = True
    # Stats
    avg_rating: Optional[float] = None
    rating_count: int = 0
    total_uses: int = 0
    # User-specific
    is_favorite: bool = False
    user_rating: Optional[int] = None


class ModelListResponse(BaseModel):
    """Paginated model list"""
    models: List[MarketplaceModel]
    total: int
    page: int
    page_size: int
    categories: List[Dict[str, Any]]
    providers: List[str]


class FavoriteResponse(BaseModel):
    """Favorite toggle response"""
    success: bool
    is_favorite: bool
    message: str


class RatingRequest(BaseModel):
    """Rating request"""
    rating: int = Field(..., ge=1, le=5)


class RatingResponse(BaseModel):
    """Rating response"""
    success: bool
    rating: int
    avg_rating: float
    rating_count: int


# ============================================
# Helper Functions
# ============================================

def calculate_credits(cost_usd: float, multiplier: float = 2.0) -> int:
    """Calculate credits from USD cost"""
    return max(1, int(cost_usd * 100 * multiplier))


async def get_model_stats(db, model_id: str) -> Dict[str, Any]:
    """Get model usage stats"""
    try:
        result = db.table("model_usage_stats").select("*").eq("model_id", model_id).execute()
        if result.data:
            return result.data[0]
    except:
        pass
    return {"total_uses": 0, "avg_rating": 0, "rating_count": 0}


async def get_user_favorites(db, user_id: str) -> List[str]:
    """Get user's favorite model IDs"""
    try:
        result = db.table("model_favorites").select("model_id").eq("user_id", user_id).execute()
        return [f["model_id"] for f in (result.data or [])]
    except:
        return []


async def get_user_ratings(db, user_id: str) -> Dict[str, int]:
    """Get user's ratings as model_id -> rating dict"""
    try:
        result = db.table("model_ratings").select("model_id, rating").eq("user_id", user_id).execute()
        return {r["model_id"]: r["rating"] for r in (result.data or [])}
    except:
        return {}


# ============================================
# Endpoints
# ============================================

@router.get("/models", response_model=ModelListResponse)
async def list_marketplace_models(
    category: Optional[str] = Query(None, description="Filter by category: image, video, chat, audio"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    search: Optional[str] = Query(None, description="Search in name/description"),
    featured_only: bool = Query(False, description="Only featured models"),
    sort_by: str = Query("popular", description="Sort: popular, rating, newest, price_low, price_high"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: SimpleNamespace = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    List all active models for the marketplace
    Uses unified_model_registry (hardcoded + database models)
    """
    try:
        # Get models from unified registry (same as admin panel)
        models_data = await model_registry.get_models(
            db, 
            category=category,
            active_only=True
        )
        
        # Apply provider filter
        if provider:
            models_data = [m for m in models_data if m.get("provider", "").lower() == provider.lower()]
        
        # Apply search filter
        if search:
            search_lower = search.lower()
            models_data = [
                m for m in models_data 
                if search_lower in m.get("name", "").lower() 
                or search_lower in m.get("description", "").lower()
            ]
        
        # Get user favorites and ratings (graceful failure)
        user_favorites = await get_user_favorites(db, current_user.id)
        user_ratings = await get_user_ratings(db, current_user.id)
        
        # Get all stats (graceful failure)
        stats_map = {}
        try:
            stats_result = db.table("model_usage_stats").select("*").execute()
            stats_map = {s["model_id"]: s for s in (stats_result.data or [])}
        except Exception as e:
            logger.debug(f"Could not fetch usage stats (table may not exist): {e}")
        
        # Transform models
        models = []
        category_counts = {}
        provider_set = set()
        
        for m in models_data:
            model_id = m.get("id")
            model_name = m.get("name")
            if not model_id or not model_name:
                continue
            
            # Count categories
            cat = m.get("category") or "other"
            category_counts[cat] = category_counts.get(cat, 0) + 1
            
            # Collect providers
            prov = m.get("provider")
            if prov:
                provider_set.add(prov)
                
            stats = stats_map.get(model_id, {})
            multiplier = float(m.get("cost_multiplier", 2.0) or 2.0)
            cost_usd = float(m.get("cost_usd", 0.01) or 0.01)
            
            models.append(MarketplaceModel(
                id=model_id,
                name=model_name,
                category=cat,
                type=m.get("type") or "unknown",
                provider=prov,
                provider_name=prov.upper() if prov else None,
                credits=calculate_credits(cost_usd, multiplier),
                cost_usd=cost_usd,
                quality=m.get("quality"),
                speed=m.get("speed"),
                badge=m.get("badge"),
                description=m.get("description"),
                is_featured=m.get("is_featured", False) or False,
                is_active=m.get("is_active", True),
                avg_rating=float(stats.get("avg_rating", 0) or 0),
                rating_count=stats.get("rating_count", 0) or 0,
                total_uses=stats.get("total_uses", 0) or 0,
                is_favorite=model_id in user_favorites,
                user_rating=user_ratings.get(model_id)
            ))
        
        # Filter featured only
        if featured_only:
            models = [m for m in models if m.is_featured]
        
        # Sort
        if sort_by == "popular":
            models.sort(key=lambda x: x.total_uses, reverse=True)
        elif sort_by == "rating":
            models.sort(key=lambda x: (x.avg_rating or 0, x.rating_count), reverse=True)
        elif sort_by == "newest":
            pass  # Default order
        elif sort_by == "price_low":
            models.sort(key=lambda x: x.credits)
        elif sort_by == "price_high":
            models.sort(key=lambda x: x.credits, reverse=True)
        
        # Pagination
        total = len(models)
        start = (page - 1) * page_size
        end = start + page_size
        paginated = models[start:end]
        
        # Build categories list
        categories = [
            {"id": cat, "name": cat.title(), "count": count}
            for cat, count in category_counts.items()
        ]
        
        return ModelListResponse(
            models=paginated,
            total=total,
            page=page,
            page_size=page_size,
            categories=categories,
            providers=list(provider_set)
        )
        
    except Exception as e:
        logger.error(f"Error listing marketplace models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{model_id}", response_model=MarketplaceModel)
async def get_model_detail(
    model_id: str,
    current_user: SimpleNamespace = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get detailed model information"""
    try:
        result = db.table("ai_models").select("*").eq("id", model_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Model not found")
        
        m = result.data[0]
        stats = await get_model_stats(db, model_id)
        user_favorites = await get_user_favorites(db, current_user.id)
        user_ratings = await get_user_ratings(db, current_user.id)
        
        multiplier = m.get("cost_multiplier", 2.0)
        
        return MarketplaceModel(
            id=m["id"],
            name=m["name"],
            category=m.get("category", "other"),
            type=m.get("type", ""),
            provider=m.get("provider_id"),
            provider_name=m.get("provider_id", "").upper() if m.get("provider_id") else None,
            credits=calculate_credits(m.get("cost_per_unit", 0.01), multiplier),
            cost_usd=m.get("cost_per_unit", 0.01),
            quality=m.get("parameters", {}).get("quality") if m.get("parameters") else None,
            speed=m.get("parameters", {}).get("speed") if m.get("parameters") else None,
            badge=m.get("parameters", {}).get("badge") if m.get("parameters") else None,
            description=m.get("description"),
            is_featured=m.get("is_featured", False),
            is_active=m.get("is_active", True),
            avg_rating=float(stats.get("avg_rating", 0)),
            rating_count=stats.get("rating_count", 0),
            total_uses=stats.get("total_uses", 0),
            is_favorite=model_id in user_favorites,
            user_rating=user_ratings.get(model_id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting model detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/{model_id}/favorite", response_model=FavoriteResponse)
async def toggle_favorite(
    model_id: str,
    current_user: SimpleNamespace = Depends(get_current_user),
    db = Depends(get_db)
):
    """Toggle model favorite status"""
    try:
        # Check if already favorited
        existing = db.table("model_favorites").select("id")\
            .eq("user_id", current_user.id).eq("model_id", model_id).execute()
        
        if existing.data:
            # Remove favorite
            db.table("model_favorites").delete()\
                .eq("user_id", current_user.id).eq("model_id", model_id).execute()
            
            return FavoriteResponse(
                success=True,
                is_favorite=False,
                message="Favorilerden kaldırıldı"
            )
        else:
            # Add favorite
            db.table("model_favorites").insert({
                "user_id": current_user.id,
                "model_id": model_id
            }).execute()
            
            return FavoriteResponse(
                success=True,
                is_favorite=True,
                message="Favorilere eklendi"
            )
            
    except Exception as e:
        logger.error(f"Error toggling favorite: {e}")
        # Return graceful error response
        return FavoriteResponse(
            success=False,
            is_favorite=False,
            message="Favori özelliği henüz aktif değil. Migration çalıştırın."
        )


@router.get("/favorites", response_model=List[MarketplaceModel])
async def get_favorites(
    current_user: SimpleNamespace = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get user's favorite models"""
    try:
        # Get favorite model IDs (graceful failure)
        try:
            favorites = db.table("model_favorites").select("model_id")\
                .eq("user_id", current_user.id).execute()
            
            if not favorites.data:
                return []
            
            model_ids = [f["model_id"] for f in favorites.data]
        except Exception as e:
            logger.debug(f"Could not fetch favorites (table may not exist): {e}")
            return []
        
        # Get model details
        models_result = db.table("ai_models").select("*")\
            .in_("id", model_ids).eq("is_active", True).execute()
        
        user_ratings = await get_user_ratings(db, current_user.id)
        
        # Stats (graceful)
        stats_map = {}
        try:
            stats_result = db.table("model_usage_stats").select("*")\
                .in_("model_id", model_ids).execute()
            stats_map = {s["model_id"]: s for s in (stats_result.data or [])}
        except:
            pass
        
        models = []
        for m in (models_result.data or []):
            stats = stats_map.get(m["id"], {})
            multiplier = m.get("cost_multiplier", 2.0) or 2.0
            
            models.append(MarketplaceModel(
                id=m["id"],
                name=m["name"],
                category=m.get("category", "other"),
                type=m.get("type", ""),
                provider=m.get("provider_id"),
                provider_name=m.get("provider_id", "").upper() if m.get("provider_id") else None,
                credits=calculate_credits(m.get("cost_per_unit", 0.01) or 0.01, multiplier),
                cost_usd=m.get("cost_per_unit", 0.01) or 0.01,
                quality=m.get("parameters", {}).get("quality") if m.get("parameters") else None,
                speed=m.get("parameters", {}).get("speed") if m.get("parameters") else None,
                badge=m.get("parameters", {}).get("badge") if m.get("parameters") else None,
                description=m.get("description"),
                is_featured=False,
                is_active=m.get("is_active", True),
                avg_rating=float(stats.get("avg_rating", 0) or 0),
                rating_count=stats.get("rating_count", 0) or 0,
                total_uses=stats.get("total_uses", 0) or 0,
                is_favorite=True,
                user_rating=user_ratings.get(m["id"])
            ))
        
        return models
        
    except Exception as e:
        logger.error(f"Error getting favorites: {e}")
        # Return empty list instead of error
        return []


@router.post("/models/{model_id}/rate", response_model=RatingResponse)
async def rate_model(
    model_id: str,
    rating_req: RatingRequest,
    current_user: SimpleNamespace = Depends(get_current_user),
    db = Depends(get_db)
):
    """Rate a model (1-5 stars)"""
    try:
        # Upsert rating
        db.table("model_ratings").upsert({
            "user_id": current_user.id,
            "model_id": model_id,
            "rating": rating_req.rating,
            "updated_at": datetime.utcnow().isoformat()
        }, on_conflict="user_id,model_id").execute()
        
        # Get updated stats
        stats = await get_model_stats(db, model_id)
        
        return RatingResponse(
            success=True,
            rating=rating_req.rating,
            avg_rating=float(stats.get("avg_rating", rating_req.rating)),
            rating_count=stats.get("rating_count", 1)
        )
        
    except Exception as e:
        logger.error(f"Error rating model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/popular", response_model=List[MarketplaceModel])
async def get_popular_models(
    category: Optional[str] = None,
    limit: int = Query(10, ge=1, le=20),
    current_user: SimpleNamespace = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get most popular models"""
    try:
        # Get stats sorted by usage
        stats_query = db.table("model_usage_stats").select("model_id, total_uses, avg_rating")\
            .order("total_uses", desc=True).limit(limit * 2)
        
        stats_result = stats_query.execute()
        top_model_ids = [s["model_id"] for s in (stats_result.data or [])]
        
        if not top_model_ids:
            # Fallback to featured models
            query = db.table("ai_models").select("*").eq("is_active", True)
            if category:
                query = query.eq("category", category)
            result = query.limit(limit).execute()
            models_data = result.data or []
        else:
            # Get model details
            query = db.table("ai_models").select("*").in_("id", top_model_ids).eq("is_active", True)
            if category:
                query = query.eq("category", category)
            result = query.execute()
            models_data = result.data or []
        
        user_favorites = await get_user_favorites(db, current_user.id)
        user_ratings = await get_user_ratings(db, current_user.id)
        stats_map = {s["model_id"]: s for s in (stats_result.data or [])}
        
        models = []
        for m in models_data[:limit]:
            stats = stats_map.get(m["id"], {})
            multiplier = m.get("cost_multiplier", 2.0)
            
            models.append(MarketplaceModel(
                id=m["id"],
                name=m["name"],
                category=m.get("category", "other"),
                type=m.get("type", ""),
                provider=m.get("provider_id"),
                provider_name=m.get("provider_id", "").upper() if m.get("provider_id") else None,
                credits=calculate_credits(m.get("cost_per_unit", 0.01), multiplier),
                cost_usd=m.get("cost_per_unit", 0.01),
                quality=m.get("parameters", {}).get("quality") if m.get("parameters") else None,
                speed=m.get("parameters", {}).get("speed") if m.get("parameters") else None,
                badge=m.get("parameters", {}).get("badge") if m.get("parameters") else None,
                description=m.get("description"),
                is_featured=m.get("is_featured", False),
                is_active=m.get("is_active", True),
                avg_rating=float(stats.get("avg_rating", 0)),
                rating_count=stats.get("rating_count", 0),
                total_uses=stats.get("total_uses", 0),
                is_favorite=m["id"] in user_favorites,
                user_rating=user_ratings.get(m["id"])
            ))
        
        return models
        
    except Exception as e:
        logger.error(f"Error getting popular models: {e}")
        raise HTTPException(status_code=500, detail=str(e))
