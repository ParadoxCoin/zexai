"""
API Key Vault Service
Encrypted API key management with Fernet encryption
"""
import logging
import os
import base64
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)


@dataclass
class KeyInfo:
    """API Key information (without exposing actual key)"""
    id: str
    provider_id: str
    key_name: str
    key_prefix: str  # First 4 chars + "..."
    is_active: bool
    rotation_count: int
    last_rotated_at: Optional[datetime]
    last_used_at: Optional[datetime]
    created_at: datetime
    created_by: Optional[str] = None


class KeyVaultService:
    """
    Encrypted API key management service
    Uses Fernet symmetric encryption (AES-128-CBC + HMAC)
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._fernet = None
        self._init_encryption()
        logger.info("KeyVaultService initialized")
    
    def _init_encryption(self):
        """Initialize Fernet encryption with key from environment"""
        vault_secret = os.getenv("KEY_VAULT_SECRET")
        
        if not vault_secret:
            # Generate a warning but allow operation with a derived key
            logger.warning("KEY_VAULT_SECRET not set! Using derived key from JWT_SECRET (less secure)")
            jwt_secret = os.getenv("JWT_SECRET_KEY", "fallback-secret-key")
            # Derive a 32-byte key from JWT secret
            derived = hashlib.sha256(jwt_secret.encode()).digest()
            vault_secret = base64.urlsafe_b64encode(derived).decode()
        
        try:
            # Validate the key format
            self._fernet = Fernet(vault_secret.encode())
            logger.info("Encryption initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize encryption: {e}")
            # Fallback: generate a new key (keys won't persist across restarts!)
            logger.warning("Using temporary encryption key - KEYS WILL NOT PERSIST!")
            self._fernet = Fernet(Fernet.generate_key())
    
    def encrypt_key(self, plain_key: str) -> str:
        """
        Encrypt an API key
        
        Args:
            plain_key: The plain text API key
            
        Returns:
            Base64 encoded encrypted key
        """
        if not plain_key:
            raise ValueError("Cannot encrypt empty key")
        
        encrypted = self._fernet.encrypt(plain_key.encode())
        return encrypted.decode()
    
    def decrypt_key(self, encrypted_key: str) -> str:
        """
        Decrypt an API key
        
        Args:
            encrypted_key: Base64 encoded encrypted key
            
        Returns:
            Plain text API key
        """
        if not encrypted_key:
            raise ValueError("Cannot decrypt empty key")
        
        try:
            decrypted = self._fernet.decrypt(encrypted_key.encode())
            return decrypted.decode()
        except InvalidToken:
            logger.error("Failed to decrypt key - invalid token or wrong encryption key")
            raise ValueError("Failed to decrypt key - encryption key may have changed")
    
    def get_key_prefix(self, plain_key: str) -> str:
        """Get first 4 characters of key for identification"""
        if not plain_key or len(plain_key) < 4:
            return "****"
        return f"{plain_key[:4]}...{plain_key[-4:]}"
    
    async def store_key(
        self,
        provider_id: str,
        key_name: str,
        plain_key: str,
        created_by: Optional[str] = None
    ) -> KeyInfo:
        """
        Store encrypted key in database
        
        Args:
            provider_id: Provider identifier (e.g., 'openai', 'anthropic')
            key_name: Key name (e.g., 'primary', 'backup')
            plain_key: Plain text API key
            created_by: User ID who created this key
            
        Returns:
            KeyInfo object
        """
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        
        encrypted_key = self.encrypt_key(plain_key)
        key_prefix = self.get_key_prefix(plain_key)
        
        data = {
            "provider_id": provider_id,
            "key_name": key_name,
            "encrypted_key": encrypted_key,
            "key_prefix": key_prefix,
            "is_active": True,
            "rotation_count": 0,
            "created_by": created_by,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Upsert - update if exists, insert if not
        result = db.table("provider_api_keys").upsert(
            data,
            on_conflict="provider_id,key_name"
        ).execute()
        
        if result.data:
            row = result.data[0]
            logger.info(f"Stored key for {provider_id}/{key_name}")
            return self._row_to_key_info(row)
        
        raise Exception("Failed to store key")
    
    async def get_key(self, provider_id: str, key_name: str = "primary") -> Optional[str]:
        """
        Get decrypted key for provider
        
        Args:
            provider_id: Provider identifier
            key_name: Key name (default: 'primary')
            
        Returns:
            Decrypted API key or None if not found
        """
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        
        result = db.table("provider_api_keys").select("*").eq(
            "provider_id", provider_id
        ).eq(
            "key_name", key_name
        ).eq(
            "is_active", True
        ).execute()
        
        if not result.data:
            return None
        
        row = result.data[0]
        encrypted_key = row.get("encrypted_key")
        
        if not encrypted_key:
            return None
        
        # Update last used timestamp
        try:
            db.table("provider_api_keys").update({
                "last_used_at": datetime.now().isoformat()
            }).eq("id", row["id"]).execute()
        except Exception as e:
            logger.warning(f"Failed to update last_used_at: {e}")
        
        return self.decrypt_key(encrypted_key)
    
    async def rotate_key(
        self,
        provider_id: str,
        key_name: str,
        new_key: str,
        rotated_by: Optional[str] = None
    ) -> KeyInfo:
        """
        Rotate (update) a key with audit logging
        
        Args:
            provider_id: Provider identifier
            key_name: Key name
            new_key: New plain text API key
            rotated_by: User ID who rotated this key
            
        Returns:
            Updated KeyInfo
        """
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        
        # Get existing key
        result = db.table("provider_api_keys").select("*").eq(
            "provider_id", provider_id
        ).eq(
            "key_name", key_name
        ).execute()
        
        if not result.data:
            raise ValueError(f"Key not found: {provider_id}/{key_name}")
        
        existing = result.data[0]
        
        encrypted_key = self.encrypt_key(new_key)
        key_prefix = self.get_key_prefix(new_key)
        
        update_data = {
            "encrypted_key": encrypted_key,
            "key_prefix": key_prefix,
            "rotation_count": existing.get("rotation_count", 0) + 1,
            "last_rotated_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        result = db.table("provider_api_keys").update(update_data).eq(
            "id", existing["id"]
        ).execute()
        
        if result.data:
            logger.info(f"Rotated key for {provider_id}/{key_name} (rotation #{update_data['rotation_count']})")
            return self._row_to_key_info(result.data[0])
        
        raise Exception("Failed to rotate key")
    
    async def list_keys(self, provider_id: Optional[str] = None) -> List[KeyInfo]:
        """
        List keys (without revealing values)
        
        Args:
            provider_id: Optional filter by provider
            
        Returns:
            List of KeyInfo objects
        """
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        
        query = db.table("provider_api_keys").select("*")
        
        if provider_id:
            query = query.eq("provider_id", provider_id)
        
        result = query.order("provider_id").order("key_name").execute()
        
        return [self._row_to_key_info(row) for row in (result.data or [])]
    
    async def get_key_info(self, key_id: str) -> Optional[KeyInfo]:
        """Get key info by ID"""
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        
        result = db.table("provider_api_keys").select("*").eq("id", key_id).execute()
        
        if result.data:
            return self._row_to_key_info(result.data[0])
        return None
    
    async def delete_key(self, key_id: str) -> bool:
        """
        Delete a key (soft delete - set inactive)
        
        Args:
            key_id: Key UUID
            
        Returns:
            True if deleted
        """
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        
        # Soft delete
        result = db.table("provider_api_keys").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", key_id).execute()
        
        if result.data:
            logger.info(f"Deleted (deactivated) key {key_id}")
            return True
        return False
    
    async def hard_delete_key(self, key_id: str) -> bool:
        """Permanently delete a key"""
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        
        result = db.table("provider_api_keys").delete().eq("id", key_id).execute()
        
        if result.data:
            logger.info(f"Hard deleted key {key_id}")
            return True
        return False
    
    async def toggle_key(self, key_id: str, is_active: bool) -> Optional[KeyInfo]:
        """Toggle key active status"""
        from core.supabase_client import get_supabase_client
        
        db = get_supabase_client()
        
        result = db.table("provider_api_keys").update({
            "is_active": is_active,
            "updated_at": datetime.now().isoformat()
        }).eq("id", key_id).execute()
        
        if result.data:
            return self._row_to_key_info(result.data[0])
        return None
    
    def _row_to_key_info(self, row: Dict[str, Any]) -> KeyInfo:
        """Convert database row to KeyInfo"""
        return KeyInfo(
            id=row.get("id"),
            provider_id=row.get("provider_id"),
            key_name=row.get("key_name"),
            key_prefix=row.get("key_prefix", "****"),
            is_active=row.get("is_active", True),
            rotation_count=row.get("rotation_count", 0),
            last_rotated_at=self._parse_datetime(row.get("last_rotated_at")),
            last_used_at=self._parse_datetime(row.get("last_used_at")),
            created_at=self._parse_datetime(row.get("created_at")) or datetime.now(),
            created_by=row.get("created_by")
        )
    
    def _parse_datetime(self, value: Any) -> Optional[datetime]:
        """Parse datetime from string or return None"""
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except:
            return None


# Singleton instance
_key_vault_instance = None


def get_key_vault() -> KeyVaultService:
    """Get KeyVault service instance"""
    global _key_vault_instance
    if _key_vault_instance is None:
        _key_vault_instance = KeyVaultService()
    return _key_vault_instance


# Helper function for providers to get keys
async def get_provider_key(provider_id: str, key_name: str = "primary") -> Optional[str]:
    """
    Convenience function for providers to get their API key
    Falls back to environment variable if not in vault
    """
    vault = get_key_vault()
    
    # Try vault first
    try:
        key = await vault.get_key(provider_id, key_name)
        if key:
            return key
    except Exception as e:
        logger.debug(f"Vault lookup failed for {provider_id}: {e}")
    
    # Fallback to environment variable
    env_var_map = {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "google": "GEMINI_API_KEY",
        "elevenlabs": "ELEVENLABS_API_KEY",
        "replicate": "REPLICATE_API_KEY",
        "fal": "FAL_API_KEY",
        "pollo": "POLLO_API_KEY",
        "piapi": "PIAPI_API_KEY",
        "goapi": "GOAPI_API_KEY",
        "kie": "KIE_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "fireworks": "FIREWORKS_API_KEY",
    }
    
    env_var = env_var_map.get(provider_id.lower())
    if env_var:
        return os.getenv(env_var)
    
    return None
