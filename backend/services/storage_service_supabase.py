"""
Hybrid Storage Service
Supports both Supabase Storage and Cloudflare R2
"""
from typing import Optional
from io import BytesIO
import asyncio

from core.config import settings
from core.supabase_client import get_supabase_client, is_supabase_enabled
from core.logger import app_logger as logger

# Import R2 storage service as fallback
try:
    from services.storage_service import StorageService as R2StorageService
except ImportError:
    R2StorageService = None


class HybridStorageService:
    """Hybrid storage service - Supabase Storage (primary) + R2 (fallback)"""
    
    def __init__(self):
        self.bucket_name = "media"  # Supabase bucket name
        self.use_supabase = is_supabase_enabled()
        self.r2_service = None
        
        # Initialize R2 as fallback if Supabase not enabled
        if not self.use_supabase and R2StorageService:
            try:
                self.r2_service = R2StorageService()
            except Exception as e:
                logger.warning(f"⚠️ R2 storage initialization failed: {e}")
    
    async def upload_file(
        self, 
        file_data: bytes, 
        object_name: str, 
        content_type: str,
        user_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Upload file to storage (Supabase or R2)
        
        Args:
            file_data: File content as bytes
            object_name: Path/name for the file (e.g., "images/user123/task456_0.png")
            content_type: MIME type (e.g., "image/png")
            user_id: Optional user ID for organization
            
        Returns:
            Public URL of uploaded file, or None on failure
        """
        if self.use_supabase:
            return await self._upload_to_supabase(file_data, object_name, content_type)
        else:
            return await self._upload_to_r2(file_data, object_name, content_type)
    
    async def _upload_to_supabase(
        self, 
        file_data: bytes, 
        object_name: str, 
        content_type: str
    ) -> Optional[str]:
        """Upload to Supabase Storage"""
        try:
            supabase = get_supabase_client()
            if not supabase:
                logger.error("❌ Supabase client not available")
                return None
            
            # Upload to Supabase Storage
            # Supabase Python client expects raw bytes
            # Handle both bytes and BytesIO inputs
            from io import BytesIO
            if isinstance(file_data, BytesIO):
                upload_data = file_data.getvalue()
            else:
                upload_data = file_data
            
            response = supabase.storage.from_(self.bucket_name).upload(
                path=object_name,
                file=upload_data,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            
            # Check if upload was successful
            if response:
                # Get public URL
                public_url = supabase.storage.from_(self.bucket_name).get_public_url(object_name)
                logger.info(f"✅ File uploaded to Supabase: {object_name}")
                return public_url
            else:
                logger.error(f"❌ Supabase upload returned no response")
                return None
            
        except Exception as e:
            logger.error(f"❌ Supabase upload failed: {e}")
            # Fallback to R2 if available
            if self.r2_service:
                logger.info("🔄 Falling back to R2 storage")
                return await self._upload_to_r2(file_data, object_name, content_type)
            return None
    
    async def _upload_to_r2(
        self, 
        file_data: bytes, 
        object_name: str, 
        content_type: str
    ) -> Optional[str]:
        """Upload to R2 Storage (fallback)"""
        if not self.r2_service:
            logger.error("❌ R2 storage not available")
            return None
        
        try:
            # R2 service is synchronous, run in thread pool
            loop = asyncio.get_event_loop()
            url = await loop.run_in_executor(
                None,
                self.r2_service.upload_file,
                file_data,
                object_name,
                content_type
            )
            return url
        except Exception as e:
            logger.error(f"❌ R2 upload failed: {e}")
            return None
    
    async def delete_file(self, object_name: str) -> bool:
        """Delete file from storage"""
        if self.use_supabase:
            return await self._delete_from_supabase(object_name)
        else:
            return await self._delete_from_r2(object_name)
    
    async def _delete_from_supabase(self, object_name: str) -> bool:
        """Delete from Supabase Storage"""
        try:
            supabase = get_supabase_client()
            if not supabase:
                return False
            
            supabase.storage.from_(self.bucket_name).remove([object_name])
            logger.info(f"✅ File deleted from Supabase: {object_name}")
            return True
        except Exception as e:
            logger.error(f"❌ Supabase delete failed: {e}")
            return False
    
    async def _delete_from_r2(self, object_name: str) -> bool:
        """Delete from R2 Storage"""
        if not self.r2_service:
            return False
        
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self.r2_service.delete_file,
                object_name
            )
            return result
        except Exception as e:
            logger.error(f"❌ R2 delete failed: {e}")
            return False
    
    async def get_file_url(self, object_name: str) -> Optional[str]:
        """Get public URL for a file"""
        if self.use_supabase:
            try:
                supabase = get_supabase_client()
                if supabase:
                    return supabase.storage.from_(self.bucket_name).get_public_url(object_name)
            except Exception as e:
                logger.error(f"❌ Failed to get Supabase URL: {e}")
        
        # R2 fallback
        if self.r2_service:
            try:
                loop = asyncio.get_event_loop()
                url = await loop.run_in_executor(
                    None,
                    self.r2_service.get_presigned_url,
                    object_name
                )
                return url
            except Exception as e:
                logger.error(f"❌ Failed to get R2 URL: {e}")
        
        return None
    
    def generate_object_name(
        self, 
        service_type: str, 
        user_id: str, 
        task_id: str, 
        file_index: int = 0,
        extension: str = "png"
    ) -> str:
        """
        Generate standardized object name for storage
        
        Args:
            service_type: "image", "video", "audio"
            user_id: User ID
            task_id: Task ID
            file_index: File index (for multiple files)
            extension: File extension
            
        Returns:
            Object name (e.g., "images/user123/task456_0.png")
        """
        if file_index > 0:
            return f"{service_type}s/{user_id}/{task_id}_{file_index}.{extension}"
        return f"{service_type}s/{user_id}/{task_id}.{extension}"


# Global instance
hybrid_storage_service = HybridStorageService()
