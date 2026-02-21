"""
File management routes
Upload, download, and manage user files
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Query
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import os
import tempfile
import aiofiles
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
import hashlib
from pathlib import Path, PurePath
from urllib.parse import quote

from pydantic import BaseModel
from core.security import get_current_user
from core.database import get_database
from core.logger import app_logger as logger
from core.rate_limiter import limiter, RateLimits
from core.config import settings


router = APIRouter(prefix="/files", tags=["File Management"])


# Secure file storage configuration
# Use dedicated secure directory outside web root
BASE_STORAGE_DIR = Path(os.getenv("SECURE_STORAGE_PATH", "/var/lib/ai-saas/uploads"))
UPLOAD_DIR = BASE_STORAGE_DIR / "user_files"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True, mode=0o750)  # Restricted permissions

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {
    "image": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    "video": [".mp4", ".mov", ".avi", ".webm"],
    "audio": [".mp3", ".wav", ".ogg", ".m4a"],
    "document": [".pdf", ".doc", ".docx", ".txt"]
}

# MIME type validation mapping
ALLOWED_MIME_TYPES = {
    "image": ["image/jpeg", "image/png", "image/gif", "image/webp"],
    "video": ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"],
    "audio": ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"],
    "document": ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
}


# ============================================
# Schemas
# ============================================

class FileMetadata(BaseModel):
    """File metadata"""
    id: str
    user_id: str
    filename: str
    original_filename: str
    file_type: str  # image, video, audio, document
    file_size: int  # bytes
    mime_type: str
    storage_path: str
    public_url: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None


class FileListResponse(BaseModel):
    """Paginated file list"""
    files: List[FileMetadata]
    total: int
    page: int
    page_size: int
    has_more: bool


class FileUploadResponse(BaseModel):
    """File upload response"""
    file_id: str
    filename: str
    file_size: int
    file_type: str
    public_url: str
    message: str


# ============================================
# Helper Functions
# ============================================

def get_file_type(filename: str) -> str:
    """Determine file type from extension"""
    ext = Path(filename).suffix.lower()
    
    for file_type, extensions in ALLOWED_EXTENSIONS.items():
        if ext in extensions:
            return file_type
    
    return "other"


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and XSS"""
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove dangerous characters
    dangerous_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*', '\0']
    for char in dangerous_chars:
        filename = filename.replace(char, '_')
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255-len(ext)] + ext
    
    # Ensure not empty
    if not filename or filename.startswith('.'):
        filename = f"file_{uuid.uuid4().hex[:8]}{Path(filename).suffix}"
    
    return filename

def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    # Sanitize first
    filename = sanitize_filename(filename)
    ext = Path(filename).suffix.lower()
    all_extensions = [ext for exts in ALLOWED_EXTENSIONS.values() for ext in exts]
    return ext in all_extensions

def validate_file_content(content: bytes, expected_type: str) -> bool:
    """Validate file content matches expected type using magic numbers"""
    if not MAGIC_AVAILABLE:
        return True  # Skip validation if magic not available
    try:
        # Use python-magic to detect actual file type
        mime_type = magic.from_buffer(content, mime=True)
        
        # Check if detected MIME type matches expected type
        allowed_mimes = ALLOWED_MIME_TYPES.get(expected_type, [])
        return mime_type in allowed_mimes
    except Exception:
        return False

def get_secure_file_path(user_id: str, file_id: str, extension: str) -> Path:
    """Generate secure file path with user isolation"""
    # Create user-specific directory
    user_dir = UPLOAD_DIR / f"user_{hashlib.sha256(user_id.encode()).hexdigest()[:16]}"
    user_dir.mkdir(exist_ok=True, mode=0o750)
    
    # Generate secure filename
    secure_filename = f"{file_id}{extension}"
    return user_dir / secure_filename


# ============================================
# File Upload Endpoints
# ============================================

@router.post("/upload", response_model=FileUploadResponse)
@limiter.limit(RateLimits.FILE_UPLOAD)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Upload a file
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Sanitize filename
        original_filename = sanitize_filename(file.filename)
        
        if not is_allowed_file(original_filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join([ext for exts in ALLOWED_EXTENSIONS.values() for ext in exts])}"
            )
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file not allowed"
            )
        
        # Determine and validate file type
        file_type = get_file_type(original_filename)
        
        # Validate file content matches extension
        if not validate_file_content(content, file_type):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content does not match file extension"
            )
        
        # Generate secure file path
        file_id = str(uuid.uuid4())
        file_ext = Path(original_filename).suffix.lower()
        file_path = get_secure_file_path(current_user.id, file_id, file_ext)
        
        # Save file securely - use Supabase storage
        try:
            # Try Supabase storage first - use 'media' bucket
            storage_path = f"{current_user.id}/{file_id}{file_ext}"
            
            try:
                # Upload to Supabase storage (media bucket)
                storage_result = db.storage.from_('media').upload(
                    storage_path,
                    content,
                    file_options={"content-type": file.content_type or "application/octet-stream"}
                )
                
                # Get public URL from media bucket
                public_url = db.storage.from_('media').get_public_url(storage_path)
                
                logger.info(f"File uploaded to Supabase storage (media): {storage_path}")
                
            except Exception as storage_error:
                logger.warning(f"Supabase storage failed, using local: {storage_error}")
                
                # Fallback: Save locally
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(content)
                os.chmod(file_path, 0o640)
                public_url = f"/api/v1/files/download/{file_id}"
            
        except Exception as e:
            logger.error(f"Failed to save file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save file"
            )
        
        # Calculate file hash for integrity
        file_hash = hashlib.sha256(content).hexdigest()
        
        # Save metadata to database using Supabase
        file_metadata = {
            "id": file_id,
            "user_id": current_user.id,
            "filename": f"{file_id}{file_ext}",
            "original_filename": original_filename,
            "file_type": file_type,
            "file_size": file_size,
            "mime_type": file.content_type or "application/octet-stream",
            "storage_path": storage_path,
            "file_hash": file_hash,
            "public_url": public_url,
            "created_at": datetime.utcnow().isoformat()
        }
        
        try:
            db.table("user_files").insert(file_metadata).execute()
        except Exception as db_error:
            logger.warning(f"Failed to save file metadata to DB: {db_error}")
            # Continue - file is uploaded, just metadata failed
        
        logger.info(f"User {current_user.id} uploaded file: {original_filename} ({file_size} bytes)")
        
        return FileUploadResponse(
            file_id=file_id,
            filename=original_filename,
            file_size=file_size,
            file_type=file_type,
            public_url=public_url,
            message="File uploaded successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file"
        )


# ============================================
# File Management Endpoints
# ============================================

@router.get("/list", response_model=FileListResponse)
@limiter.limit(RateLimits.PUBLIC_READ)
async def list_files(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    file_type: Optional[str] = Query(None, pattern="^(image|video|audio|document|other)$"),
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    List user's uploaded files
    """
    try:
        query = {"user_id": current_user.id}
        
        if file_type:
            query["file_type"] = file_type
        
        # Get total count
        total = await db.user_files.count_documents(query)
        
        # Get paginated files
        skip = (page - 1) * page_size
        cursor = db.user_files.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        files = await cursor.to_list(length=page_size)
        
        # Convert to response model
        file_list = [FileMetadata(**file) for file in files]
        
        return FileListResponse(
            files=file_list,
            total=total,
            page=page,
            page_size=page_size,
            has_more=skip + len(files) < total
        )
    
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list files"
        )


@router.get("/download/{file_id}")
@limiter.limit(RateLimits.PUBLIC_READ)
async def download_file(
    request: Request,
    file_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Download a file
    """
    try:
        # Get file metadata
        file_metadata = await db.user_files.find_one({
            "id": file_id,
            "user_id": current_user.id
        })
        
        if not file_metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Validate file path is within allowed directory (prevent path traversal)
        file_path = Path(file_metadata["storage_path"])
        try:
            file_path.resolve().relative_to(UPLOAD_DIR.resolve())
        except ValueError:
            logger.error(f"Path traversal attempt detected: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found on storage"
            )
        
        # Return file info (actual file serving would use FileResponse)
        return {
            "file_id": file_id,
            "filename": file_metadata["original_filename"],
            "file_size": file_metadata["file_size"],
            "mime_type": file_metadata["mime_type"],
            "download_url": file_metadata["public_url"],
            "file_hash": file_metadata.get("file_hash", "")[:16] + "...",  # Partial hash for integrity check
            "message": "File ready for download"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download file"
        )


@router.delete("/{file_id}")
@limiter.limit(RateLimits.PROFILE_UPDATE)
async def delete_file(
    request: Request,
    file_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Delete a file
    """
    try:
        # Get file metadata
        file_metadata = await db.user_files.find_one({
            "id": file_id,
            "user_id": current_user.id
        })
        
        if not file_metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Secure file deletion
        file_path = Path(file_metadata["storage_path"])
        
        # Validate path is within allowed directory
        try:
            file_path.resolve().relative_to(UPLOAD_DIR.resolve())
        except ValueError:
            logger.error(f"Path traversal attempt in delete: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        if file_path.exists():
            try:
                # Secure deletion - overwrite before unlinking
                file_size = file_path.stat().st_size
                with open(file_path, 'r+b') as f:
                    f.write(os.urandom(file_size))
                    f.flush()
                    os.fsync(f.fileno())
                
                file_path.unlink()
                logger.info(f"File securely deleted: {file_id}")
            except Exception as e:
                logger.error(f"Failed to delete file {file_id}: {e}")
                # Continue with database cleanup even if file deletion fails
        
        # Delete metadata from database
        await db.user_files.delete_one({"id": file_id})
        
        logger.info(f"User {current_user.id} deleted file: {file_id} ({file_metadata.get('original_filename', 'unknown')})")
        return {"message": "File deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file"
        )


@router.get("/storage-stats")
@limiter.limit(RateLimits.PUBLIC_READ)
async def get_storage_stats(
    request: Request,
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get user's storage statistics
    """
    try:
        # Get total file count
        total_files = await db.user_files.count_documents({"user_id": current_user.id})
        
        # Get total storage used
        pipeline = [
            {"$match": {"user_id": current_user.id}},
            {"$group": {"_id": None, "total_size": {"$sum": "$file_size"}}}
        ]
        result = await db.user_files.aggregate(pipeline).to_list(length=1)
        total_size = result[0]["total_size"] if result else 0
        
        # Get file count by type
        type_pipeline = [
            {"$match": {"user_id": current_user.id}},
            {"$group": {"_id": "$file_type", "count": {"$sum": 1}, "size": {"$sum": "$file_size"}}}
        ]
        type_result = await db.user_files.aggregate(type_pipeline).to_list(length=100)
        
        files_by_type = {
            item["_id"]: {
                "count": item["count"],
                "size_bytes": item["size"],
                "size_mb": round(item["size"] / 1024 / 1024, 2)
            }
            for item in type_result
        }
        
        return {
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / 1024 / 1024, 2),
            "files_by_type": files_by_type,
            "storage_limit_mb": 1000,  # 1GB limit (configurable)
            "usage_percentage": round((total_size / (1000 * 1024 * 1024)) * 100, 2)
        }
    
    except Exception as e:
        logger.error(f"Error fetching storage stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch storage stats"
        )

