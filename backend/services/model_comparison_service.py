"""
Model Comparison Service
Handles parallel AI model comparisons with Groq (free) and OpenRouter (paid)
"""
import asyncio
import httpx
import os
import time
from typing import Optional, Dict, Any, List
from core.logger import logger


class ModelComparisonService:
    """Service for comparing multiple AI models side-by-side"""
    
    # API URLs
    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
    OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
    
    # Static Groq models (always available and free)
    GROQ_MODELS = {
        "llama-3.3-70b": {
            "provider": "groq",
            "model_id": "llama-3.3-70b-versatile",
            "name": "Llama 3.3 70B",
            "tier": "free",
            "icon": "🦙",
            "color": "from-blue-500 to-purple-500"
        },
        "llama-3.1-8b": {
            "provider": "groq",
            "model_id": "llama-3.1-8b-instant",
            "name": "Llama 3.1 8B",
            "tier": "free",
            "icon": "🦙",
            "color": "from-indigo-500 to-blue-500"
    }
    
    # Popular paid models via OpenRouter
    OPENROUTER_PAID_MODELS = {
        "gpt-4o": {
            "provider": "openrouter",
            "model_id": "openai/gpt-4o",
            "name": "GPT-4o",
            "tier": "premium",
            "icon": "🧠",
            "color": "from-green-500 to-emerald-500",
            "cost_per_1k": 0.005
        },
        "gpt-4o-mini": {
            "provider": "openrouter",
            "model_id": "openai/gpt-4o-mini",
            "name": "GPT-4o Mini",
            "tier": "premium",
            "icon": "⚡",
            "color": "from-green-400 to-teal-500",
            "cost_per_1k": 0.00015
        },
        "claude-3.5-sonnet": {
            "provider": "openrouter",
            "model_id": "anthropic/claude-3.5-sonnet",
            "name": "Claude 3.5 Sonnet",
            "tier": "premium",
            "icon": "🎭",
            "color": "from-amber-500 to-orange-500",
            "cost_per_1k": 0.003
        },
        "claude-3-opus": {
            "provider": "openrouter",
            "model_id": "anthropic/claude-3-opus",
            "name": "Claude 3 Opus",
            "tier": "premium",
            "icon": "👑",
            "color": "from-purple-500 to-pink-500",
            "cost_per_1k": 0.015
        },
        "gemini-2.0-flash": {
            "provider": "openrouter",
            "model_id": "google/gemini-2.0-flash-001",
            "name": "Gemini 2.0 Flash",
            "tier": "premium",
            "icon": "✨",
            "color": "from-blue-500 to-violet-500",
            "cost_per_1k": 0.0001
        },
        "gemini-1.5-pro": {
            "provider": "openrouter",
            "model_id": "google/gemini-pro-1.5",
            "name": "Gemini 1.5 Pro",
            "tier": "premium",
            "icon": "🔮",
            "color": "from-indigo-500 to-purple-500",
            "cost_per_1k": 0.00125
        },
    }
    
    def __init__(self):
        self._cached_openrouter_models = None
        self._cache_time = 0

    async def _get_api_key(self, provider: str) -> str:
        """Fetch API key dynamically from Supabase, fallback to env"""
        try:
            from core.supabase_client import get_supabase_client
            from services.model_service import model_service
            import os
            
            db = get_supabase_client()
            if db:
                config = await model_service.get_provider_config(db, provider)
                if config and config.get("api_key"):
                    return config["api_key"]
        except Exception as e:
            logger.debug(f"DB lookup for {provider} key failed, trying fallback: {e}")
            
        # Fallback to env variables
        if provider == "groq":
            import os
            return os.getenv("GROQ_API_KEY", "")
        elif provider == "openrouter":
            import os
            return os.getenv("OPENROUTER_API_KEY", "")
            
        return ""
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models grouped by tier"""
        models = []
        
        # Add Groq free models
        for key, config in self.GROQ_MODELS.items():
            models.append({
                "id": key,
                "name": config["name"],
                "tier": config["tier"],
                "icon": config["icon"],
                "color": config["color"],
                "available": True,  # UI assumes available; backend validates key on execute
                "provider": config["provider"]
            })
        
        # Add OpenRouter paid models
        for key, config in self.OPENROUTER_PAID_MODELS.items():
            models.append({
                "id": key,
                "name": config["name"],
                "tier": config["tier"],
                "icon": config["icon"],
                "color": config["color"],
                "available": True,  # UI assumes available; backend validates key on execute
                "provider": config["provider"],
                "cost": config.get("cost_per_1k", 0)
            })
        
        return models
    
    async def fetch_openrouter_models(self) -> List[Dict[str, Any]]:
        """Fetch available models from OpenRouter API"""
        api_key = await self._get_api_key("openrouter")
        if not api_key: return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.OPENROUTER_MODELS_URL,
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", [])
                return []
        except Exception as e:
            logger.error(f"Fetch OpenRouter models error: {e}")
            return []
    
    async def compare_models(
        self, 
        prompt: str, 
        model_ids: List[str],
        user_id: str
    ) -> Dict[str, Any]:
        """Run prompt through multiple models in parallel and compare results"""
        if len(model_ids) < 2:
            return {"success": False, "error": "En az 2 model seçmelisiniz"}
        
        if len(model_ids) > 6:
            return {"success": False, "error": "En fazla 6 model seçebilirsiniz"}
        
        # Combine all models
        all_models = {**self.GROQ_MODELS, **self.OPENROUTER_PAID_MODELS}
        
        # Create tasks for parallel execution
        tasks = []
        for model_id in model_ids:
            if model_id in all_models:
                task = self._call_model(model_id, prompt, all_models)
                tasks.append(task)
        
        # Run all models in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Format results
        comparison_results = []
        for i, model_id in enumerate(model_ids):
            if model_id in all_models:
                config = all_models[model_id]
                result = results[i]
                
                if isinstance(result, Exception):
                    comparison_results.append({
                        "model_id": model_id,
                        "name": config["name"],
                        "icon": config["icon"],
                        "color": config["color"],
                        "tier": config["tier"],
                        "success": False,
                        "error": str(result),
                        "response": None,
                        "metrics": None
                    })
                else:
                    comparison_results.append({
                        "model_id": model_id,
                        "name": config["name"],
                        "icon": config["icon"],
                        "color": config["color"],
                        "tier": config["tier"],
                        "success": True,
                        "response": result["response"],
                        "metrics": result["metrics"]
                    })
        
        return {
            "success": True,
            "prompt": prompt,
            "results": comparison_results
        }
    
    async def _call_model(self, model_id: str, prompt: str, all_models: Dict) -> Dict[str, Any]:
        """Call a single model and measure metrics"""
        config = all_models[model_id]
        provider = config["provider"]
        
        start_time = time.time()
        
        try:
            if provider == "groq":
                response = await self._call_groq(config["model_id"], prompt)
            elif provider == "openrouter":
                response = await self._call_openrouter(config["model_id"], prompt)
            else:
                raise ValueError(f"Unknown provider: {provider}")
            
            end_time = time.time()
            duration_ms = int((end_time - start_time) * 1000)
            
            # Calculate metrics
            token_count = len(response.split()) * 1.3  # Rough estimate
            cost = config.get("cost_per_1k", 0) * (token_count / 1000)
            
            return {
                "response": response,
                "metrics": {
                    "duration_ms": duration_ms,
                    "token_count": int(token_count),
                    "cost": round(cost, 6),
                    "speed_score": self._calculate_speed_score(duration_ms),
                }
            }
            
        except Exception as e:
            logger.error(f"Model {model_id} error: {e}")
            raise
    
    async def _call_groq(self, model_id: str, prompt: str) -> str:
        """Call Groq API (free, fast)"""
        api_key = await self._get_api_key("groq")
        if not api_key:
            raise Exception("Groq API Key yapılandırılmamış (Admin panelinden ekleyin)")
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.GROQ_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_id,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 2000,
                    "temperature": 0.7
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                raise Exception(f"Groq error: {response.text}")
    
    async def _call_openrouter(self, model_id: str, prompt: str) -> str:
        """Call OpenRouter API (paid models)"""
        api_key = await self._get_api_key("openrouter")
        if not api_key:
            raise Exception("OpenRouter API Key yapılandırılmamış (Admin panelinden ekleyin)")
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://ai-platform.com",
                    "X-Title": "AI Platform"
                },
                json={
                    "model": model_id,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 2000
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                raise Exception(f"OpenRouter error: {response.text}")
    
    def _calculate_speed_score(self, duration_ms: int) -> float:
        """Calculate speed score (0-5)"""
        if duration_ms < 500:
            return 5.0
        elif duration_ms < 1000:
            return 4.5
        elif duration_ms < 2000:
            return 4.0
        elif duration_ms < 3000:
            return 3.5
        elif duration_ms < 5000:
            return 3.0
        else:
            return 2.0


# Singleton
model_comparison_service = ModelComparisonService()
