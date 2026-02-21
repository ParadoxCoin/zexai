"""
Media library routes
Handles retrieving, filtering, and managing generated media
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
import json

from core.security import get_current_user
from core.database import get_db

router = APIRouter(prefix="/media", tags=["Media Library"])

@router.get("/my-media")
async def get_my_media(
    type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get user's generated media library"""
    try:
        query = db.table("media_outputs").select("*", count="exact").eq("user_id", user.id)
        
        if type:
            query = query.eq("type", type)
            
        # Order by created_at desc
        query = query.order("created_at", desc=True)
        
        # Pagination
        query = query.range(offset, offset + limit - 1)
        
        response = query.execute()
        
        return {
            "items": response.data,
            "total": response.count,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/showcase")
async def get_public_showcase(
    limit: int = 20,
    type: Optional[str] = None,
    db = Depends(get_db)
):
    """Get public showcase items"""
    try:
        query = db.table("media_outputs").select("*").eq("is_showcase", True)
        
        if type:
            query = query.eq("type", type)
            
        query = query.order("created_at", desc=True).limit(limit)
        
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{media_id}")
async def delete_media(
    media_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Delete a media item"""
    try:
        # Check ownership and delete
        response = db.table("media_outputs").delete().eq("id", media_id).eq("user_id", user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Media not found or permission denied")
            
        return {"success": True, "message": "Media deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/{media_id}/visibility")
async def update_media_visibility(
    media_id: str,
    is_public: bool,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Toggle media visibility (showcase)"""
    try:
        # Check ownership and update
        response = db.table("media_outputs").update({"is_showcase": is_public}).eq("id", media_id).eq("user_id", user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Media not found or permission denied")
            
        return {"success": True, "is_showcase": is_public}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

