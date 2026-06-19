"""
Model Compare Routes
Customer-facing API for comparing AI models
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from types import SimpleNamespace
import logging

from core.security import get_current_user
from core.database import get_database
from core.model_compare import get_compare_service, COMPARE_MODELS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/compare", tags=["Model Compare"])


# ============================================
# Schemas
# ============================================

class CompareImageRequest(BaseModel):
    """Request for image comparison"""
    prompt: str = Field(..., min_length=3, max_length=2000)
    model_ids: List[str] = Field(..., min_items=2, max_items=4)
    aspect_ratio: str = Field(default="1:1", pattern="^(1:1|16:9|9:16|4:3|3:4)$")
    
    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "A beautiful sunset over mountains",
                "model_ids": ["fal-flux-pro", "fal-sdxl"],
                "aspect_ratio": "16:9"
            }
        }


class CostCalculationRequest(BaseModel):
    """Request for cost calculation"""
    model_ids: List[str] = Field(..., min_items=2, max_items=4)
    compare_type: str = Field(default="image", pattern="^(image|video|chat)$")


class ModelInfo(BaseModel):
    """Model information"""
    id: str
    name: str
    provider: str
    cost: int
    speed: str


class CompareResultItem(BaseModel):
    """Single model result"""
    model_id: str
    model_name: str
    provider: str
    success: bool
    output_url: Optional[str] = None
    response_time_ms: int = 0
    cost_credits: float = 0
    error_message: Optional[str] = None


class CompareResponse(BaseModel):
    """Comparison response"""
    id: str
    prompt: str
    model_ids: List[str]
    results: List[CompareResultItem]
    total_cost: float
    status: str
    created_at: str


class CostResponse(BaseModel):
    """Cost calculation response"""
    model_costs: List[Dict[str, Any]]
    subtotal: float
    discount_percent: float
    discount_amount: float
    total: float


# ============================================
# Endpoints
# ============================================

@router.get("/models")
async def get_available_models(
    compare_type: str = Query("image", pattern="^(image|video|chat)$"),
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """
    Get available models for comparison
    
    Returns list of models that can be compared for the given type.
    """
    service = get_compare_service()
    models = service.get_available_models(compare_type)
    
    return {
        "type": compare_type,
        "models": models,
        "max_models": 4,
        "min_models": 2
    }


@router.post("/calculate-cost", response_model=CostResponse)
async def calculate_cost(
    request: CostCalculationRequest,
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """
    Calculate cost for comparison
    
    Returns detailed cost breakdown with discount.
    """
    service = get_compare_service()
    
    # Validate model IDs
    available_models = service.get_available_models(request.compare_type)
    available_ids = [m["id"] for m in available_models]
    
    for model_id in request.model_ids:
        if model_id not in available_ids:
            raise HTTPException(
                status_code=400, 
                detail=f"Model {model_id} is not available for {request.compare_type} comparison"
            )
    
    cost_info = service.calculate_cost(request.model_ids, request.compare_type)
    
    return CostResponse(**cost_info)


@router.post("/image", response_model=CompareResponse)
async def compare_images(
    request: CompareImageRequest,
    current_user: SimpleNamespace = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Compare images across multiple models
    
    Runs the same prompt on 2-4 different image models simultaneously.
    Results are returned when all models complete.
    
    **Pricing**: 10% discount on total model costs for comparisons.
    """
    service = get_compare_service()
    
    # Validate model IDs
    available_models = service.get_available_models("image")
    available_ids = [m["id"] for m in available_models]
    
    for model_id in request.model_ids:
        if model_id not in available_ids:
            raise HTTPException(
                status_code=400, 
                detail=f"Model {model_id} is not available for image comparison"
            )
    
    try:
        comparison = await service.compare_images(
            user_id=current_user.id,
            prompt=request.prompt,
            model_ids=request.model_ids,
            aspect_ratio=request.aspect_ratio,
            db=db
        )
        
        logger.info(f"Image comparison {comparison.id} completed for user {current_user.id}")
        
        return CompareResponse(
            id=comparison.id,
            prompt=comparison.prompt,
            model_ids=comparison.model_ids,
            results=[
                CompareResultItem(
                    model_id=r.model_id,
                    model_name=r.model_name,
                    provider=r.provider,
                    success=r.success,
                    output_url=r.output_url,
                    response_time_ms=r.response_time_ms,
                    cost_credits=r.cost_credits,
                    error_message=r.error_message
                ) for r in comparison.results
            ],
            total_cost=comparison.total_cost,
            status=comparison.status,
            created_at=comparison.created_at.isoformat()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Comparison failed: {e}")
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@router.get("/history")
async def get_comparison_history(
    compare_type: Optional[str] = Query(None, pattern="^(image|video|chat)$"),
    limit: int = Query(20, ge=1, le=50),
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """
    Get user's comparison history
    """
    service = get_compare_service()
    
    comparisons = await service.get_user_comparisons(
        user_id=current_user.id,
        limit=limit,
        compare_type=compare_type
    )
    
    return {
        "comparisons": [c.to_dict() for c in comparisons],
        "total": len(comparisons)
    }


@router.get("/{compare_id}")
async def get_comparison(
    compare_id: str,
    current_user: SimpleNamespace = Depends(get_current_user)
):
    """
    Get specific comparison result
    """
    service = get_compare_service()
    
    comparison = await service.get_comparison(compare_id, current_user.id)
    
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")
    
    return comparison.to_dict()
