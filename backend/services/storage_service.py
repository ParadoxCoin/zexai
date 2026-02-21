"""
Storage service - Supabase primary, R2 fallback
"""
from typing import Optional
from core.config import settings

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

try:
    import boto3
    from botocore.client import Config
    from botocore.exceptions import ClientError
    from io import BytesIO
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

class StorageService:
    """Manages file operations with Supabase (primary) or R2 (fallback)."""

    def __init__(self):
        self.use_supabase = settings.SUPABASE_ENABLED and SUPABASE_AVAILABLE and settings.SUPABASE_URL
        
        if self.use_supabase:
            self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            self.bucket_name = settings.SUPABASE_STORAGE_BUCKET
        elif BOTO3_AVAILABLE and settings.R2_ENDPOINT_URL:
            self.client = boto3.client(
                's3',
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                endpoint_url=settings.R2_ENDPOINT_URL,
                config=Config(signature_version='s3v4')
            )
            self.bucket_name = settings.R2_BUCKET_NAME or settings.R2_BUCKET
            self.base_url = settings.R2_ENDPOINT_URL

    def upload_file(self, file_data: bytes, object_name: str, content_type: str) -> Optional[str]:
        """Upload file to Supabase or R2"""
        if self.use_supabase:
            try:
                res = self.supabase.storage.from_(self.bucket_name).upload(
                    path=object_name,
                    file=file_data,
                    file_options={"content-type": content_type}
                )
                public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(object_name)
                return public_url
            except Exception as e:
                print(f"Supabase upload error: {e}")
                return None
        elif BOTO3_AVAILABLE:
            try:
                self.client.upload_fileobj(
                    Fileobj=BytesIO(file_data),
                    Bucket=self.bucket_name,
                    Key=object_name,
                    ExtraArgs={'ContentType': content_type}
                )
                return f"{settings.R2_ENDPOINT_URL}/{self.bucket_name}/{object_name}"
            except Exception as e:
                print(f"R2 upload error: {e}")
                return None
        return None

    def delete_file(self, object_name: str) -> bool:
        """Delete file from Supabase or R2"""
        if self.use_supabase:
            try:
                self.supabase.storage.from_(self.bucket_name).remove([object_name])
                return True
            except Exception as e:
                print(f"Supabase delete error: {e}")
                return False
        elif BOTO3_AVAILABLE:
            try:
                self.client.delete_object(Bucket=self.bucket_name, Key=object_name)
                return True
            except Exception as e:
                print(f"R2 delete error: {e}")
                return False
        return False
            
    def get_presigned_url(self, object_name: str, expiration: int = 3600) -> Optional[str]:
        """Get signed URL"""
        if self.use_supabase:
            try:
                return self.supabase.storage.from_(self.bucket_name).create_signed_url(object_name, expiration)
            except Exception as e:
                print(f"Supabase signed URL error: {e}")
                return None
        elif BOTO3_AVAILABLE:
            try:
                return self.client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket_name, 'Key': object_name},
                    ExpiresIn=expiration
                )
            except Exception as e:
                print(f"R2 presigned URL error: {e}")
                return None
        return None

# Global instance for dependency injection
storage_service = StorageService()
