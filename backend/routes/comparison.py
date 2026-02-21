"""
Model Comparison API Routes
Side-by-Side AI Model Comparison
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from core.security import get_current_user
from services.model_comparison_service import model_comparison_service
from core.logger import logger


router = APIRouter(prefix="/comparison", tags=["model-comparison"])


class CompareRequest(BaseModel):
    prompt: str
    model_ids: List[str]


@router.get("/models")
async def get_available_models(current_user = Depends(get_current_user)):
    """Get list of all available models for comparison"""
    models = model_comparison_service.get_available_models()
    
    # Group by tier
    free_models = [m for m in models if m["tier"] == "free"]
    premium_models = [m for m in models if m["tier"] == "premium"]
    
    return {
        "free": free_models,
        "premium": premium_models,
        "total": len(models)
    }


@router.post("/compare")
async def compare_models(
    request: CompareRequest,
    current_user = Depends(get_current_user)
):
    """Compare multiple models side-by-side"""
    try:
        if not request.prompt or len(request.prompt.strip()) < 5:
            raise HTTPException(status_code=400, detail="Prompt en az 5 karakter olmalı")
        
        if len(request.model_ids) < 2:
            raise HTTPException(status_code=400, detail="En az 2 model seçmelisiniz")
        
        if len(request.model_ids) > 6:
            raise HTTPException(status_code=400, detail="En fazla 6 model seçebilirsiniz")
        
        # Run comparison
        result = await model_comparison_service.compare_models(
            prompt=request.prompt.strip(),
            model_ids=request.model_ids,
            user_id=current_user.id
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comparison error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
