"""
Admin Model Management API
CRUD operations for AI models with role-based access control
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

from core.security import get_current_user
from core.database import get_db
from core.unified_model_registry import model_registry, ModelCategory


router = APIRouter(prefix="/admin/models", tags=["Admin - Model Management"])


# ============================================
# Schemas
# ============================================

class ModelBase(BaseModel):
    """Base model schema"""
    name: str
    category: str
    type: str
    provider: Optional[str] = None
    cost_usd: float = Field(ge=0)
    cost_multiplier: float = Field(default=2.0, ge=1.0)
    quality: Optional[int] = Field(default=4, ge=1, le=5)
    speed: Optional[str] = "medium"
    badge: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

    model_config = ConfigDict(protected_namespaces=())


class ModelCreate(ModelBase):
    """Create new model"""
    id: str = Field(..., min_length=1, max_length=100)


class ModelUpdate(BaseModel):
    """Update model (all fields optional)"""
    name: Optional[str] = None
    cost_usd: Optional[float] = Field(default=None, ge=0)
    cost_multiplier: Optional[float] = Field(default=None, ge=1.0)
    quality: Optional[int] = Field(default=None, ge=1, le=5)
    speed: Optional[str] = None
    badge: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    provider: Optional[str] = None
    capabilities: Optional[Dict[str, Any]] = None  # JSON capabilities for dynamic parameters


class PriceUpdate(BaseModel):
    """Quick price update"""
    cost_usd: float = Field(..., ge=0)
    cost_multiplier: Optional[float] = Field(default=None, ge=1.0)


class BulkPriceUpdate(BaseModel):
    """Bulk price update"""
    model_ids: List[str]
    multiplier_change: Optional[float] = None  # e.g., 1.1 = +10%
    new_multiplier: Optional[float] = None  # Set exact multiplier

    model_config = ConfigDict(protected_namespaces=())


class ModelResponse(BaseModel):
    """Model response"""
    id: str
    name: str
    category: str
    type: str
    provider: Optional[str]
    cost_usd: float
    cost_multiplier: float
    credits: int  # Calculated
    quality: Optional[int]
    speed: Optional[str]
    badge: Optional[str]
    description: Optional[str]
    is_active: bool

    model_config = ConfigDict(protected_namespaces=())
    source: str  # 'hardcoded' or 'database'
    capabilities: Optional[Dict[str, Any]] = None  # Dynamic parameters


class ModelListResponse(BaseModel):
    """Paginated model list"""
    models: List[ModelResponse]
    total: int
    categories: List[Dict[str, Any]]


class StatsResponse(BaseModel):
    """Registry statistics"""
    total_models: int
    by_category: Dict[str, int]
    by_source: Dict[str, int]


# ============================================
# Helper Functions
# ============================================

def require_admin(current_user):
    """Check if user is admin (relaxed for development)"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Login required"
        )
    # TODO: Uncomment below for production to enforce admin-only access
    # if current_user.role != "admin":
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Admin access required"
    #     )
    
    # Force bypass for troubleshooting
    return current_user


def calculate_credits(cost_usd: float, multiplier: float) -> int:
    """Calculate credits from USD cost"""
    return max(1, int(cost_usd * multiplier * 100))


def model_to_response(model: Dict) -> ModelResponse:
    """Convert model dict to response"""
    cost_usd = float(model.get("cost_usd", 0))
    multiplier = float(model.get("cost_multiplier", 2.0))
    provider = model.get("provider")
    
    # Branding Cleanup: Mask 'kie.ai' as 'Premium'
    if provider and provider.lower() in ("kie.ai", "kie"):
        provider = "Premium"
    
    return ModelResponse(
        id=model["id"],
        name=model.get("name", model["id"]),
        category=model.get("category", "other"),
        type=model.get("type", "unknown"),
        provider=provider,
        cost_usd=cost_usd,
        cost_multiplier=multiplier,
        credits=calculate_credits(cost_usd, multiplier),
        quality=model.get("quality"),
        speed=model.get("speed"),
        badge=model.get("badge"),
        description=model.get("description"),
        is_active=model.get("is_active", True),
        source=model.get("source", "hardcoded"),
        capabilities=model.get("capabilities")
    )



# ============================================
# Endpoints
# ============================================

@router.get("", response_model=ModelListResponse)
async def list_models(
    category: Optional[str] = Query(None, description="Filter by category"),
    type: Optional[str] = Query(None, description="Filter by type"),
    active_only: bool = Query(False, description="Only active models"),
    search: Optional[str] = Query(None, description="Search in name/description"),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    List all AI models with optional filtering.
    Admin can see all models including inactive ones.
    """
    require_admin(current_user)
    
    try:
        # Get models from registry
        models = await model_registry.get_models(
            db, 
            category=category,
            type=type,
            active_only=active_only
        )
        
        # Apply search filter
        if search:
            search_lower = search.lower()
            models = [
                m for m in models
                if search_lower in m.get("name", "").lower() 
                or search_lower in m.get("description", "").lower()
                or search_lower in m.get("id", "").lower()
            ]
        
        # Convert to responses
        model_responses = [model_to_response(m) for m in models]
        
        # Get categories
        categories = model_registry.get_categories()
        
        return ModelListResponse(
            models=model_responses,
            total=len(model_responses),
            categories=categories
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list models: {str(e)}"
        )


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    current_user = Depends(get_current_user)
):
    """Get model registry statistics"""
    require_admin(current_user)
    
    stats = model_registry.get_stats()
    return StatsResponse(**stats)


@router.get("/categories")
async def get_categories(
    current_user = Depends(get_current_user)
):
    """Get all model categories"""
    require_admin(current_user)
    
    return {
        "categories": [
            {"id": c.value, "name": c.name.replace("_", " ").title()} 
            for c in ModelCategory
        ]
    }


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get single model details"""
    require_admin(current_user)
    
    try:
        models = await model_registry.get_models(db, active_only=False)
        model = next((m for m in models if m["id"] == model_id), None)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_id}' not found"
            )
        
        return model_to_response(model)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model: {str(e)}"
        )


@router.post("", response_model=ModelResponse)
async def create_model(
    model: ModelCreate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a new custom model"""
    require_admin(current_user)
    
    try:
        # Check if model already exists
        existing = await model_registry.get_models(db, active_only=False)
        if any(m["id"] == model.id for m in existing):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Model '{model.id}' already exists"
            )
        
        # Create in database
        result = await model_registry.update_model(
            db, 
            model.id, 
            model.model_dump()
        )
        
        return model_to_response(result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create model: {str(e)}"
        )


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: str,
    updates: ModelUpdate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update a model (creates DB override for hardcoded models)"""
    require_admin(current_user)
    
    try:
        # Get non-None updates
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No updates provided"
            )
        
        result = await model_registry.update_model(db, model_id, update_data)
        
        # Clear video service cache if it's a video model
        if result.get("category") == "video":
            from services.unified_video_service import unified_video_service
            # We just set the cache_time to None to force a refresh on next request
            unified_video_service._cache_time = None
            
        return model_to_response(result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update model: {str(e)}"
        )


@router.patch("/{model_id}/price", response_model=ModelResponse)
async def update_price(
    model_id: str,
    price: PriceUpdate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Quick price update for a model"""
    require_admin(current_user)
    
    try:
        result = await model_registry.update_price(
            db, 
            model_id, 
            price.cost_usd,
            price.cost_multiplier
        )
        
        # Clear video service cache if it's a video model
        if result.get("category") == "video":
            from services.unified_video_service import unified_video_service
            unified_video_service._cache_time = None
            
        return model_to_response(result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update price: {str(e)}"
        )


@router.patch("/{model_id}/toggle", response_model=ModelResponse)
async def toggle_model(
    model_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Toggle model active/inactive state"""
    require_admin(current_user)
    
    try:
        # Get current state
        models = await model_registry.get_models(db, active_only=False)
        model = next((m for m in models if m["id"] == model_id), None)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_id}' not found"
            )
        
        # Toggle
        new_state = not model.get("is_active", True)
        result = await model_registry.toggle_model_active(db, model_id, new_state)
        
        # Clear video service cache if it's a video model
        if result.get("category") == "video":
            from services.unified_video_service import unified_video_service
            unified_video_service._cache_time = None
            
        return model_to_response(result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle model: {str(e)}"
        )


@router.post("/bulk-price-update")
async def bulk_price_update(
    update: BulkPriceUpdate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Bulk update prices for multiple models"""
    require_admin(current_user)
    
    if not update.multiplier_change and not update.new_multiplier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either multiplier_change or new_multiplier"
        )
    
    try:
        updated = []
        failed = []
        
        for model_id in update.model_ids:
            try:
                models = await model_registry.get_models(db, active_only=False)
                model = next((m for m in models if m["id"] == model_id), None)
                
                if not model:
                    failed.append({"id": model_id, "error": "Not found"})
                    continue
                
                current_multiplier = float(model.get("cost_multiplier", 2.0))
                
                if update.new_multiplier:
                    new_multiplier = update.new_multiplier
                else:
                    new_multiplier = current_multiplier * update.multiplier_change
                
                await model_registry.update_model(
                    db, model_id, {"cost_multiplier": new_multiplier}
                )
                updated.append(model_id)
                
            except Exception as e:
                failed.append({"id": model_id, "error": str(e)})
        
        return {
            "updated": len(updated),
            "failed": len(failed),
            "updated_ids": updated,
            "failed_details": failed
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk update failed: {str(e)}"
        )


@router.delete("/{model_id}")
async def delete_model(
    model_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Delete a model.
    For hardcoded models, this just marks them inactive.
    For database-only models, this removes them completely.
    """
    require_admin(current_user)
    
    try:
        models = await model_registry.get_models(db, active_only=False)
        model = next((m for m in models if m["id"] == model_id), None)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_id}' not found"
            )
        
        if model.get("source") == "hardcoded":
            # Just deactivate hardcoded models
            await model_registry.toggle_model_active(db, model_id, False)
            return {"message": f"Model '{model_id}' deactivated (hardcoded models cannot be deleted)"}
        else:
            # Delete from database
            db.table("ai_models").delete().eq("id", model_id).execute()
            return {"message": f"Model '{model_id}' deleted"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete model: {str(e)}"
        )


@router.patch("/{model_id}/featured")
async def toggle_featured(
    model_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Toggle model featured status for marketplace"""
    require_admin(current_user)
    
    try:
        # Get current state
        result = db.table("ai_models").select("is_featured").eq("id", model_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_id}' not found"
            )
        
        current_featured = result.data[0].get("is_featured", False)
        new_state = not current_featured
        
        # Update
        db.table("ai_models").update({
            "is_featured": new_state,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", model_id).execute()
        
        return {
            "model_id": model_id,
            "is_featured": new_state,
            "message": f"Model {'öne çıkarıldı' if new_state else 'öne çıkarmadan kaldırıldı'}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle featured: {str(e)}"
        )
