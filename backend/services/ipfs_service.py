import os
import aiohttp
import json
from typing import Dict, Any, Optional
from fastapi import UploadFile

from core.logger import app_logger as logger
from core.config import settings

class IPFSService:
    """Service to handle uploading files and JSON metadata to IPFS via Pinata"""
    
    def __init__(self):
        self.api_key = settings.PINATA_API_KEY
        self.secret_key = settings.PINATA_SECRET_API_KEY
        self.jwt = os.environ.get("PINATA_JWT", "")
        self.base_url = "https://api.pinata.cloud"
        self.gateway_url = "https://gateway.pinata.cloud/ipfs"
        
    def _get_headers(self) -> Dict[str, str]:
        """Get authentication headers for Pinata API"""
        if self.jwt:
            return {"Authorization": f"Bearer {self.jwt}"}
        return {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.secret_key
        }

    async def upload_file(self, file_content: bytes, filename: str, content_type: str = "image/png") -> Optional[str]:
        """Upload a raw file (image/video) to IPFS"""
        if not self.api_key and not self.jwt:
            logger.error("Pinata credentials missing")
            return None
            
        url = f"{self.base_url}/pinning/pinFileToIPFS"
        
        try:
            async with aiohttp.ClientSession() as session:
                data = aiohttp.FormData()
                data.add_field('file', file_content, filename=filename, content_type=content_type)
                
                # Optional Pinata metadata for dashboard management
                pinata_metadata = {
                    "name": f"ZexAI_Asset_{filename}",
                    "keyvalues": {"project": "ZexAI"}
                }
                data.add_field('pinataMetadata', json.dumps(pinata_metadata))
                
                async with session.post(url, headers=self._get_headers(), data=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        ipfs_hash = result.get('IpfsHash')
                        return f"ipfs://{ipfs_hash}"
                    else:
                        error_text = await response.text()
                        logger.error(f"Pinata IPFS file upload failed: {error_text}")
                        return None
        except Exception as e:
            logger.error(f"Error connecting to Pinata IPFS: {e}")
            return None

    async def upload_json(self, metadata: Dict[str, Any], token_name: str = "Zex NFT") -> Optional[str]:
        """Upload ERC1155/ERC721 standard JSON metadata to IPFS"""
        if not self.api_key and not self.jwt:
            logger.error("Pinata credentials missing")
            return None
            
        url = f"{self.base_url}/pinning/pinJSONToIPFS"
        
        # Structure the payload as Pinata expects for JSON pinning
        payload = {
            "pinataOptions": {
                "cidVersion": 1
            },
            "pinataMetadata": {
                "name": f"{token_name}_Metadata.json"
            },
            "pinataContent": metadata
        }
        
        headers = self._get_headers()
        headers["Content-Type"] = "application/json"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        ipfs_hash = result.get('IpfsHash')
                        return f"ipfs://{ipfs_hash}"
                    else:
                        error_text = await response.text()
                        logger.error(f"Pinata IPFS JSON upload failed: {error_text}")
                        return None
        except Exception as e:
            logger.error(f"Error connecting to Pinata IPFS for JSON: {e}")
            return None
            
    def get_gateway_url(self, ipfs_uri: str) -> str:
        """Convert an ipfs:// URI into an HTTP gateway URL for frontend display"""
        if not ipfs_uri or not ipfs_uri.startswith("ipfs://"):
            return ipfs_uri
            
        cid = ipfs_uri.replace("ipfs://", "")
        return f"{self.gateway_url}/{cid}"
