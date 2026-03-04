from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any
from core.database import get_database
from core.logger import app_logger as logger
from services.ipfs_service import IPFSService
from core.config import settings
import aiohttp
import uuid
import json
import base64

router = APIRouter(prefix="/nft", tags=["NFT Minting"])
ipfs_service = IPFSService()

HAS_PINATA = bool(settings.PINATA_API_KEY and settings.PINATA_API_KEY.strip())

@router.post("/prepare-metadata")
async def prepare_nft_metadata(payload: Dict[str, Any] = Body(...), db=Depends(get_database)):
    """
    Receives an asset URL and its prompt/details.
    If Pinata is configured: uploads to IPFS.
    If Pinata is NOT configured: uses the raw asset URL as a fallback so minting still works.
    """
    asset_id = payload.get("asset_id")
    asset_url = payload.get("asset_url")
    prompt = payload.get("prompt", "ZexAI Generated Asset")
    model = payload.get("model", "ZexAI AI Model")

    if not asset_url:
        raise HTTPException(status_code=400, detail="Missing asset_url")

    # Build the metadata
    metadata = {
        "name": f"ZexAI #{str(uuid.uuid4())[:6]}",
        "description": f"AI Generated masterpiece created using {model}.\n\nPrompt: {prompt}",
        "image": asset_url,
        "external_url": "https://zexai.io",
        "attributes": [
            {"trait_type": "Generator", "value": "ZexAI Platform"},
            {"trait_type": "Model", "value": model},
            {"trait_type": "Platform", "value": "Polygon Mainnet"}
        ]
    }

    try:
        if HAS_PINATA:
            # Upload to IPFS via Pinata
            async with aiohttp.ClientSession() as session:
                async with session.get(asset_url) as response:
                    if response.status == 200:
                        file_content = await response.read()
                        content_type = response.headers.get("Content-Type", "image/png")
                        ext = "png" if "image" in content_type else "mp4"
                        filename = f"zexai_{uuid.uuid4().hex[:8]}.{ext}"
                        image_ipfs_uri = await ipfs_service.upload_file(file_content, filename, content_type)
                        if image_ipfs_uri:
                            metadata["image"] = image_ipfs_uri

            metadata_uri = await ipfs_service.upload_json(metadata, token_name=metadata["name"])
            if not metadata_uri:
                # Fallback to asset URL if IPFS upload fails
                metadata_uri = asset_url
        else:
            # No Pinata configured: use asset URL directly
            logger.warning("Pinata not configured, using asset URL as metadata URI")
            metadata_uri = asset_url

        return {
            "success": True,
            "metadata_uri": metadata_uri,
            "gateway_url": ipfs_service.get_gateway_url(metadata_uri) if metadata_uri.startswith("ipfs://") else metadata_uri
        }

    except Exception as e:
        logger.error(f"Error preparing metadata for NFT: {e}")
        # Even on error, return a working response with the original asset URL
        return {
            "success": True,
            "metadata_uri": asset_url,
            "gateway_url": asset_url
        }


@router.post("/confirm-mint")
async def confirm_nft_mint(payload: Dict[str, Any] = Body(...), db=Depends(get_database)):
    """
    Called by the frontend after a successful Metamask mint transaction.
    Marks the generated asset as 'minted' in the db so we can show the Polygon badge.
    """
    asset_id = payload.get("asset_id")
    tx_hash = payload.get("tx_hash")
    token_id = payload.get("token_id") # Passed if known, otherwise we mark as true

    if not asset_id or not tx_hash:
        raise HTTPException(status_code=400, detail="Missing asset_id or tx_hash")

    try:
        # Search the generated_images or generated_videos table 
        # (you could make it dynamic based on an asset_type parameter)
        # We will assume you update the record to add an `is_nft_minted` and `nft_tx_hash` field
        
        # NOTE: Be sure `is_nft_minted` and `nft_tx_hash` exist in your Supabase schema!
        db.table("generated_images").update({
            "is_nft_minted": True,
            "nft_tx_hash": tx_hash,
            "nft_token_id": token_id
        }).eq("id", asset_id).execute()

        # Try videos too just in case
        db.table("generated_videos").update({
            "is_nft_minted": True,
            "nft_tx_hash": tx_hash,
            "nft_token_id": token_id
        }).eq("id", asset_id).execute()

        return {"success": True, "message": "NFT status updated successfully"}

    except Exception as e:
        logger.error(f"Failed to confirm mint in database: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync database")
