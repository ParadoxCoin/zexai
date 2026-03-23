from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from core.database import get_db
from core.security import get_current_user
from schemas.collection import CollectionCreate, CollectionResponse, CollectionItemCreate, CollectionItemResponse, CollectionPublishRequest
from services.collection_service import collection_service

router = APIRouter(prefix="/collections", tags=["collections"])

@router.post("", response_model=CollectionResponse)
async def create_collection(
    req: CollectionCreate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a new draft NFT Collection"""
    return await collection_service.create_collection(current_user.id, req, db)


@router.get("/my", response_model=List[CollectionResponse])
async def get_my_collections(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get all collections belonging to the current user"""
    return await collection_service.get_user_collections(current_user.id, db)


@router.post("/{collection_id}/items", response_model=CollectionItemResponse)
async def add_item_to_collection(
    collection_id: str,
    req: CollectionItemCreate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Add a generated image + traits to a draft collection"""
    return await collection_service.add_item_to_collection(current_user.id, collection_id, req, db)


@router.post("/{collection_id}/rarity")
async def calculate_collection_rarity(
    collection_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Calculate and save rarity scores for all items currently in the collection"""
    return await collection_service.calculate_collection_rarity(current_user.id, collection_id, db)


@router.post("/{collection_id}/publish")
async def publish_collection(
    collection_id: str,
    req: CollectionPublishRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Publish the collection: 
    1. Batch upload all items as a single Pinata directory.
    2. Save IPFS Base URI.
    3. Update DB state to Published and attach contract address.
    """
    return await collection_service.publish_collection(current_user.id, collection_id, req.contract_address, db)

@router.get("/{collection_id}/items")
async def get_collection_items(
    collection_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Fetch all items within a specific collection"""
    res = db.table("nft_collection_items").select("*").eq("collection_id", collection_id).order("item_index").execute()
    return res.data
