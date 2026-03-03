"""
Prompt Enhancement Routes
API endpoints for AI-powered prompt enhancement
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from core.security import get_current_user
from services.prompt_enhancer import prompt_enhancer
from core.logger import logger


router = APIRouter(prefix="/prompt", tags=["prompt"])


class EnhanceRequest(BaseModel):
    input: str
    content_type: str = "image"  # image, video, audio, avatar
    style: Optional[str] = None
    language: str = "en"


class StyleResponse(BaseModel):
    id: str
    name: str
    suffix: str


@router.post("/enhance")
async def enhance_prompt(
    request: EnhanceRequest,
    current_user = Depends(get_current_user)
):
    """
    Enhance a simple prompt into detailed AI-ready prompts
    
    Returns multiple style variations of the enhanced prompt
    """
    try:
        if not request.input or len(request.input.strip()) < 3:
            raise HTTPException(status_code=400, detail="Prompt çok kısa")
        
        result = await prompt_enhancer.enhance_prompt(
            user_input=request.input.strip(),
            content_type=request.content_type,
            style=request.style,
            language=request.language
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prompt enhancement error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/styles/{content_type}")
async def get_styles(
    content_type: str,
    current_user = Depends(get_current_user)
):
    """
    Get available styles for a content type
    """
    styles = prompt_enhancer.get_styles(content_type)
    return {"success": True, "styles": styles}
