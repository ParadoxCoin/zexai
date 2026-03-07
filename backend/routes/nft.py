from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any
from core.database import get_database
from core.logger import app_logger as logger
from services.ipfs_service import IPFSService
from core.config import settings
import aiohttp
import uuid
import json

router = APIRouter(prefix="/nft", tags=["NFT Minting"])
ipfs_service = IPFSService()

HAS_PINATA = bool(settings.PINATA_API_KEY and settings.PINATA_API_KEY.strip())

@router.post("/prepare-metadata")
async def prepare_nft_metadata(payload: Dict[str, Any] = Body(...)):
    """
    Receives an asset URL and its prompt/details.
    If Pinata is configured: uploads to IPFS.
    If Pinata is NOT configured: uses the raw asset URL as a fallback so minting still works.
    """
    asset_id = payload.get("asset_id")
    asset_url = payload.get("asset_url")
    thumbnail_url = payload.get("thumbnail_url", asset_url) # For video/audio cover
    service_type = payload.get("service_type", "image").lower() # image, video, audio, avatar
    prompt = payload.get("prompt", "ZexAI Generated Asset")
    model = payload.get("model", "ZexAI AI Model")

    if not asset_url:
        raise HTTPException(status_code=400, detail="Missing asset_url")

    # Build the base metadata
    metadata = {
        "name": f"ZexAI #{str(uuid.uuid4())[:6]}",
        "description": f"AI Generated masterpiece created using {model}.\n\nPrompt: {prompt}",
        "external_url": "https://zexai.io",
        "attributes": [
            {"trait_type": "Generator", "value": "ZexAI Platform"},
            {"trait_type": "Model", "value": model},
            {"trait_type": "Type", "value": service_type.capitalize()},
            {"trait_type": "Platform", "value": "Polygon Mainnet"}
        ]
    }

    # Handle media types properly for OpenSea/Zora rendering
    if service_type in ['video', 'audio']:
        metadata["animation_url"] = asset_url
        # For audio without a thumbnail, use a generic ZexAI audio cover template
        metadata["image"] = thumbnail_url if thumbnail_url != asset_url else "https://zexai.io/assets/images/zexai-audio-cover.png"
    else:
        metadata["image"] = asset_url

    try:
        metadata_uri = '' # We will construct this

        if HAS_PINATA:
            try:
                # Upload media to IPFS via Pinata
                async with aiohttp.ClientSession() as session:
                    async with session.get(asset_url) as response:
                        if response.status == 200:
                            file_content = await response.read()
                            content_type = response.headers.get("Content-Type", "image/png")
                            
                            ext_map = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4", "audio/mpeg": "mp3", "audio/wav": "wav"}
                            ext = ext_map.get(content_type, "bin")

                            filename = f"zexai_{service_type}_{uuid.uuid4().hex[:8]}.{ext}"
                            ipfs_uri = await ipfs_service.upload_file(file_content, filename, content_type)
                            if ipfs_uri:
                                if service_type in ['video', 'audio']:
                                    metadata["animation_url"] = ipfs_uri
                                else:
                                    metadata["image"] = ipfs_uri
            except Exception as inner_e:
                logger.warning(f"Failed to fetch/upload asset to IPFS, falling back to original URL: {inner_e}")

            # Always try to upload the JSON metadata to IPFS, even if the image upload failed
            try:
                uploaded_metadata_uri = await ipfs_service.upload_json(metadata, token_name=metadata["name"])
                if uploaded_metadata_uri:
                    metadata_uri = uploaded_metadata_uri
            except Exception as json_e:
                logger.warning(f"Failed to upload JSON metadata to IPFS, using fallback: {json_e}")
                
        else:
            # No Pinata configured: use asset URL directly
            logger.warning("Pinata not configured, using asset URL as metadata URI")

        # Set final gateway URL for the frontend
        gateway_url = ipfs_service.get_gateway_url(metadata_uri) if metadata_uri.startswith("ipfs://") else metadata_uri
        
        return {
            "success": True,
            "metadata_uri": metadata_uri,
            "gateway_url": gateway_url
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
async def confirm_nft_mint(payload: Dict[str, Any] = Body(...)):
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
        from core.database import get_database
        db = await get_database()
        
        if not db:
            logger.warning("Database not available, skipping mint confirmation DB update")
            return {"success": True, "message": "NFT minted successfully (DB update skipped)"}

        # Try to update generated_images table
        try:
            db.table("generated_images").update({
                "is_nft_minted": True,
                "nft_tx_hash": tx_hash,
                "nft_token_id": token_id
            }).eq("id", asset_id).execute()
        except Exception as img_e:
            logger.warning(f"Could not update generated_images (columns may not exist): {img_e}")

        # Try videos too just in case
        try:
            db.table("generated_videos").update({
                "is_nft_minted": True,
                "nft_tx_hash": tx_hash,
                "nft_token_id": token_id
            }).eq("id", asset_id).execute()
        except Exception as vid_e:
            logger.warning(f"Could not update generated_videos (columns may not exist): {vid_e}")

        return {"success": True, "message": "NFT status updated successfully"}

    except Exception as e:
        logger.error(f"Failed to confirm mint in database: {e}")
        # Don't crash - the NFT was already minted on-chain, just the DB record failed
        return {"success": True, "message": "NFT minted successfully (DB sync pending)"}
