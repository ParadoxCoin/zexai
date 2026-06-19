import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import HTTPException

from core.logger import app_logger as logger
from schemas.collection import CollectionCreate, CollectionResponse, CollectionItemCreate, CollectionItemResponse
from services.rarity_engine import RarityEngine
from services.ipfs_service import ipfs_service

class CollectionService:
    """Handles business logic for NFT Collections"""

    async def create_collection(self, user_id: str, req: CollectionCreate, db) -> CollectionResponse:
        collection_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        data = {
            "id": collection_id,
            "user_id": user_id,
            "name": req.name,
            "symbol": req.symbol,
            "description": req.description,
            "max_supply": req.max_supply,
            "mint_price": req.mint_price,
            "royalty_bps": req.royalty_bps,
            "cover_url": req.cover_url,
            "banner_url": req.banner_url,
            "status": "draft",
            "created_at": now,
            "updated_at": now
        }
        
        try:
            db.table("nft_collections").insert(data).execute()
        except Exception as e:
            logger.error(f"Failed to create collection: {e}")
            raise HTTPException(500, "Collection creation failed")
            
        data["items_count"] = 0
        return CollectionResponse(**data)

    async def get_user_collections(self, user_id: str, db) -> List[CollectionResponse]:
        try:
            # Query collections and get item counts if possible. For now just fetch collections.
            res = db.table("nft_collections").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            collections = []
            for c in res.data:
                # Get item count efficiently
                count_res = db.table("nft_collection_items").select("id", count="exact").eq("collection_id", c["id"]).execute()
                items_count = count_res.count if count_res.count else 0
                
                c["items_count"] = items_count
                collections.append(CollectionResponse(**c))
                
            return collections
        except Exception as e:
            logger.error(f"Failed to fetch collections for {user_id}: {e}")
            raise HTTPException(500, str(e))

    async def add_item_to_collection(self, user_id: str, collection_id: str, req: CollectionItemCreate, db) -> CollectionItemResponse:
        # Verify ownership
        col = db.table("nft_collections").select("status").eq("id", collection_id).eq("user_id", user_id).execute()
        if not col.data:
            raise HTTPException(404, "Collection not found or access denied")
        if col.data[0]["status"] != "draft":
            raise HTTPException(400, "Collection is already published")
            
        # Get next index
        count_res = db.table("nft_collection_items").select("id", count="exact").eq("collection_id", collection_id).execute()
        next_index = count_res.count if count_res.count else 0
        
        item_id = str(uuid.uuid4())
        data = {
            "id": item_id,
            "collection_id": collection_id,
            "item_index": next_index,
            "image_url": req.image_url,
            "attributes": [attr.dict() for attr in req.attributes],
            "created_at": datetime.utcnow().isoformat()
        }
        
        db.table("nft_collection_items").insert(data).execute()
        return CollectionItemResponse(**data)

    async def calculate_collection_rarity(self, user_id: str, collection_id: str, db) -> Dict[str, Any]:
        # Verify ownership
        col = db.table("nft_collections").select("status").eq("id", collection_id).eq("user_id", user_id).execute()
        if not col.data:
            raise HTTPException(404, "Collection not found")
        
        items_res = db.table("nft_collection_items").select("*").eq("collection_id", collection_id).order("item_index").execute()
        items = items_res.data
        
        if not items:
            return {"status": "success", "message": "No items to calculate"}
            
        # Add Rarity via Engine
        updated_items = RarityEngine.calculate_collection_rarity(items)
        
        # Save back to DB (Batch update)
        for ui in updated_items:
            db.table("nft_collection_items").update({
                "attributes": ui["attributes"],
                "rarity_score": ui["rarity_score"],
                "rarity_tier": ui["rarity_tier"]
            }).eq("id", ui["id"]).execute()
            
        return {"status": "success", "processed_items": len(items)}

    async def publish_collection(self, user_id: str, collection_id: str, contract_address: str, db) -> Dict[str, Any]:
        """Uploads all metadata to IPFS, updates base_uri and status to published."""
        
        col_res = db.table("nft_collections").select("*").eq("id", collection_id).eq("user_id", user_id).execute()
        if not col_res.data:
            raise HTTPException(404, "Collection not found")
            
        collection = col_res.data[0]
        if collection["status"] == "published":
            # Idempotent return to allow UI to retry blockchain minting if user rejected TX
            return {
                "status": "success",
                "base_uri": collection.get("base_uri"),
                "contract_address": collection.get("contract_address")
            }
            
        # 1. Fetch all items
        items_res = db.table("nft_collection_items").select("*").eq("collection_id", collection_id).order("item_index").execute()
        items = items_res.data
        
        if not items:
            raise HTTPException(400, "Collection is empty")
            
        # 2. Build standard metadata array
        metadata_list = []
        for i, item in enumerate(items):
            metadata = {
                "name": f"{collection['name']} #{i}",
                "description": collection.get("description", ""),
                "image": item["image_url"],
                "attributes": item.get("attributes", [])
            }
            metadata_list.append(metadata)
            
        # 3. Upload batch to IPFS via Pinata Directory
        folder_cid = await ipfs_service.upload_metadata_directory(metadata_list, collection["name"].replace(" ", "_"))
        if not folder_cid:
            raise HTTPException(500, "IPFS batch upload failed")
            
        # 4. Update Database
        # Note: base_uri needs trailing slash so token_uri works as base_uri + token_id + .json
        base_uri_with_slash = folder_cid if folder_cid.endswith("/") else f"{folder_cid}/"
        
        db.table("nft_collections").update({
            "status": "published",
            "contract_address": contract_address,
            "base_uri": base_uri_with_slash,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", collection_id).execute()
        
        return {
            "status": "success",
            "base_uri": base_uri_with_slash,
            "contract_address": contract_address
        }

collection_service = CollectionService()
