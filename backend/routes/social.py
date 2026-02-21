"""
Social Features API Routes
Handles likes, shares, showcase and comments
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from core.security import get_current_user
from services.social_service import social_service
from core.logger import logger


router = APIRouter(prefix="/social", tags=["social"])


# ==================== MODELS ====================

class LikeRequest(BaseModel):
    content_type: str  # image, video, audio, avatar
    content_id: str


class ShareRequest(BaseModel):
    content_type: str
    content_id: str
    platform: str  # twitter, whatsapp, telegram, etc.


class ShowcaseRequest(BaseModel):
    content_type: str
    content_id: str
    is_public: bool = True
    file_url: Optional[str] = None


class CommentRequest(BaseModel):
    content_type: str
    content_id: str
    comment: str


class ContentQuery(BaseModel):
    content_type: str
    content_id: str


# ==================== LIKE ENDPOINTS ====================

@router.post("/like")
async def toggle_like(request: LikeRequest, current_user = Depends(get_current_user)):
    """Toggle like on content"""
    # UUID workaround for batched generations (e.g. genID_0)
    clean_id = request.content_id.split('_')[0]
    result = await social_service.toggle_like(
        user_id=current_user.id,
        content_type=request.content_type,
        content_id=clean_id
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.get("/like/count")
async def get_like_count(content_type: str, content_id: str):
    """Get like count for content"""
    clean_id = content_id.split('_')[0]
    count = await social_service.get_like_count(content_type, clean_id)
    return {"count": count}


@router.get("/like/check")
async def check_liked(content_type: str, content_id: str, current_user = Depends(get_current_user)):
    """Check if current user liked content"""
    clean_id = content_id.split('_')[0]
    is_liked = await social_service.is_liked_by_user(
        current_user.id, content_type, clean_id
    )
    return {"is_liked": is_liked}


# ==================== SHARE ENDPOINTS ====================

@router.post("/share")
async def add_share(request: ShareRequest, current_user = Depends(get_current_user)):
    """Record a share action"""
    clean_id = request.content_id.split('_')[0]
    result = await social_service.add_share(
        user_id=current_user.id,
        content_type=request.content_type,
        content_id=clean_id,
        platform=request.platform
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.get("/share/urls")
async def get_share_urls(content_type: str, content_id: str, title: str = "", url: str = ""):
    """Get share URLs for all platforms"""
    encoded_title = title.replace(" ", "%20")
    encoded_url = url.replace(":", "%3A").replace("/", "%2F")
    
    return {
        "twitter": f"https://twitter.com/intent/tweet?text={encoded_title}&url={url}",
        "whatsapp": f"https://wa.me/?text={encoded_title}%20{url}",
        "telegram": f"https://t.me/share/url?url={url}&text={encoded_title}",
        "linkedin": f"https://linkedin.com/sharing/share-offsite/?url={url}",
        "pinterest": f"https://pinterest.com/pin/create/button/?url={url}&description={encoded_title}",
        "facebook": f"https://www.facebook.com/sharer/sharer.php?u={url}"
    }


# ==================== SHOWCASE ENDPOINTS ====================

@router.post("/showcase")
async def toggle_showcase(request: ShowcaseRequest, current_user = Depends(get_current_user)):
    """Add or remove content from showcase"""
    clean_id = request.content_id.split('_')[0]
    result = await social_service.toggle_showcase(
        user_id=current_user.id,
        content_type=request.content_type,
        content_id=clean_id,
        is_public=request.is_public,
        file_url=request.file_url
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.get("/showcase")
async def get_showcase(content_type: Optional[str] = None, limit: int = 50):
    """Get public showcase items"""
    items = await social_service.get_public_showcase(content_type, limit)
    return {"items": items, "count": len(items)}


# ==================== COMMENT ENDPOINTS ====================

@router.post("/comment")
async def add_comment(request: CommentRequest, current_user = Depends(get_current_user)):
    """Add a comment"""
    clean_id = request.content_id.split('_')[0]
    result = await social_service.add_comment(
        user_id=current_user.id,
        content_type=request.content_type,
        content_id=clean_id,
        comment=request.comment
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.get("/comments/{content_type}/{content_id}")
async def get_comments(content_type: str, content_id: str, limit: int = 50):
    """Get comments for content"""
    clean_id = content_id.split('_')[0]
    comments = await social_service.get_comments(content_type, clean_id, limit)
    return {"comments": comments, "count": len(comments)}


@router.delete("/comment/{comment_id}")
async def delete_comment(comment_id: str, current_user = Depends(get_current_user)):
    """Delete a comment"""
    result = await social_service.delete_comment(
        user_id=current_user.id,
        comment_id=comment_id
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


# ==================== STATS ENDPOINT ====================

@router.get("/stats")
async def get_content_stats(
    content_type: str, 
    content_id: str, 
    current_user = Depends(get_current_user)
):
    """Get all stats for content"""
    clean_id = content_id.split('_')[0]
    stats = await social_service.get_content_stats(
        content_type, clean_id, current_user.id
    )
    return stats
