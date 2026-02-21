"""
Model Service
Handles fetching AI models and provider configurations from Supabase.
Replaces hardcoded model lists.
"""
from typing import List, Optional, Dict, Any
import os
from fastapi import HTTPException
from supabase import Client
import logging

logger = logging.getLogger(__name__)

class ModelService:
    @staticmethod
    async def get_models(db: Client, type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch active models from Supabase ai_models table.
        Optionally filter by type (text_to_video, chat, etc.)
        """
        try:
            query = db.table("ai_models").select("*").eq("is_active", True)
            
            if type:
                query = query.eq("type", type)
                
            # Order by created_at desc to show newest first
            result = query.order("created_at", desc=True).execute()
            return result.data
        except Exception as e:
            print(f"Error fetching models: {e}")
            return []

    @staticmethod
    async def get_model_by_id(db: Client, model_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a specific model by ID.
        """
        try:
            result = db.table("ai_models").select("*").eq("id", model_id).single().execute()
            return result.data
        except Exception as e:
            print(f"Error fetching model {model_id}: {e}")
            return None

    @staticmethod
    async def get_provider_config(db: Client, provider_id: str) -> Dict[str, Any]:
        """
        Fetch provider configuration (API key, base URL) from Supabase.
        Priority: 1. Key Vault (encrypted) -> 2. Environment Variable
        """
        try:
            result = db.table("api_providers").select("*").eq("id", provider_id).single().execute()
            provider_data = result.data
            
            if not provider_data:
                raise HTTPException(status_code=500, detail=f"Provider {provider_id} not configured")
                
            # Determine API Key - Priority: Vault -> Env Variable
            api_key = None
            
            # 1. Try Key Vault first (encrypted storage)
            try:
                from core.key_vault import get_provider_key
                vault_key = await get_provider_key(provider_id)
                if vault_key:
                    api_key = vault_key
                    logger.debug(f"Using vault key for provider {provider_id}")
            except Exception as e:
                logger.debug(f"Vault lookup failed for {provider_id}: {e}")
            
            # 2. Try Environment Variable from DB config
            if not api_key:
                env_var_name = provider_data.get("api_key_env_var")
                if env_var_name:
                    api_key = os.getenv(env_var_name)
                    
            # 3. Fallback for known providers if DB config is missing
            if not api_key:
                provider_fallbacks = {
                    # Video providers
                    "pollo": ("POLLO_API_KEY", "https://api.pollo.ai/v1"),
                    "piapi": ("PIAPI_API_KEY", "https://api.piapi.ai/api/v1"),
                    "goapi": ("GOAPI_API_KEY", "https://api.goapi.ai/api/v1"),
                    "fal": ("FAL_API_KEY", "https://fal.run"),
                    "replicate": ("REPLICATE_API_KEY", "https://api.replicate.com/v1"),
                    "kie": ("KIE_API_KEY", "https://api.kie.ai/api/v1"),
                    # Chat/LLM providers
                    "openai": ("OPENAI_API_KEY", "https://api.openai.com/v1"),
                    "anthropic": ("ANTHROPIC_API_KEY", "https://api.anthropic.com/v1"),
                    "fireworks": ("FIREWORKS_API_KEY", "https://api.fireworks.ai/inference/v1"),
                    "openrouter": ("OPENROUTER_API_KEY", "https://openrouter.ai/api/v1"),
                    "gemini": ("GEMINI_API_KEY", "https://generativelanguage.googleapis.com/v1beta"),
                    # Audio providers
                    "elevenlabs": ("ELEVENLABS_API_KEY", "https://api.elevenlabs.io/v1"),
                    "manus": ("MANUS_API_KEY", "https://api.manus.ai/v1"),
                }
                
                if provider_id in provider_fallbacks:
                    env_var, default_url = provider_fallbacks[provider_id]
                    api_key = os.getenv(env_var)
                    if not provider_data.get("base_url"):
                        provider_data["base_url"] = default_url
            
            if not api_key:
                raise HTTPException(status_code=500, detail=f"API Key not found for provider {provider_id}")
                
            return {
                "api_key": api_key,
                "base_url": provider_data.get("base_url")
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching provider config: {str(e)}")

model_service = ModelService()
