"""
Model Compare Service
Allows customers to compare multiple AI models with the same prompt
"""
import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import logging
import time

from core.supabase_client import get_supabase_client
from core.config import settings
from core.credits import CreditManager

logger = logging.getLogger(__name__)


@dataclass
class CompareResult:
    """Result from a single model in comparison"""
    model_id: str
    model_name: str
    provider: str
    success: bool
    output_url: Optional[str] = None
    response_time_ms: int = 0
    cost_credits: float = 0
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "model_name": self.model_name,
            "provider": self.provider,
            "success": self.success,
            "output_url": self.output_url,
            "response_time_ms": self.response_time_ms,
            "cost_credits": self.cost_credits,
            "error_message": self.error_message,
            "metadata": self.metadata
        }


@dataclass
class Comparison:
    """Complete comparison result"""
    id: str
    user_id: str
    compare_type: str  # image, video, chat
    prompt: str
    model_ids: List[str]
    results: List[CompareResult]
    total_cost: float
    status: str  # pending, running, completed, failed
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "compare_type": self.compare_type,
            "prompt": self.prompt,
            "model_ids": self.model_ids,
            "results": [r.to_dict() for r in self.results],
            "total_cost": self.total_cost,
            "status": self.status,
            "created_at": self.created_at.isoformat()
        }


# Available models for comparison
COMPARE_MODELS = {
    "image": [
        {"id": "fal-flux-schnell", "name": "FLUX Schnell", "provider": "fal", "cost": 2, "speed": "fast"},
        {"id": "fal-flux-pro", "name": "FLUX Pro", "provider": "fal", "cost": 7, "speed": "medium"},
        {"id": "fal-sdxl", "name": "SDXL", "provider": "fal", "cost": 3, "speed": "fast"},
        {"id": "openai-dall-e-3", "name": "DALL-E 3", "provider": "openai", "cost": 10, "speed": "medium"},
    ],
    "video": [
        {"id": "pollo-minimax", "name": "MiniMax", "provider": "pollo", "cost": 30, "speed": "slow"},
        {"id": "fal-kling", "name": "Kling", "provider": "fal", "cost": 25, "speed": "slow"},
    ],
    "chat": [
        {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai", "cost": 2, "speed": "fast"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai", "cost": 1, "speed": "fast"},
    ]
}

# Compare discount
COMPARE_DISCOUNT = 0.10  # 10% discount for multi-model comparison


class ModelCompareService:
    """Service for comparing multiple AI models"""
    
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
        logger.info("ModelCompareService initialized")
    
    def get_available_models(self, compare_type: str) -> List[Dict[str, Any]]:
        """Get available models for comparison by type"""
        return COMPARE_MODELS.get(compare_type, [])
    
    def calculate_cost(self, model_ids: List[str], compare_type: str) -> Dict[str, Any]:
        """Calculate total cost for comparison with discount"""
        models = COMPARE_MODELS.get(compare_type, [])
        model_map = {m["id"]: m for m in models}
        
        total_base_cost = 0
        model_costs = []
        
        for model_id in model_ids:
            if model_id in model_map:
                cost = model_map[model_id]["cost"]
                total_base_cost += cost
                model_costs.append({
                    "model_id": model_id,
                    "model_name": model_map[model_id]["name"],
                    "cost": cost
                })
        
        discount_amount = total_base_cost * COMPARE_DISCOUNT
        final_cost = total_base_cost - discount_amount
        
        return {
            "model_costs": model_costs,
            "subtotal": total_base_cost,
            "discount_percent": COMPARE_DISCOUNT * 100,
            "discount_amount": round(discount_amount, 2),
            "total": round(final_cost, 2)
        }
    
    async def compare_images(
        self,
        user_id: str,
        prompt: str,
        model_ids: List[str],
        aspect_ratio: str = "1:1",
        db = None
    ) -> Comparison:
        """Run image comparison across multiple models"""
        
        compare_id = str(uuid.uuid4())
        
        # Calculate cost
        cost_info = self.calculate_cost(model_ids, "image")
        total_cost = cost_info["total"]
        
        # Check credits
        if db:
            balance = await CreditManager.get_user_balance(db, user_id)
            if balance < total_cost:
                raise ValueError(f"Yetersiz kredi. Gerekli: {total_cost}, Mevcut: {balance}")
        
        # Create comparison record
        comparison = Comparison(
            id=compare_id,
            user_id=user_id,
            compare_type="image",
            prompt=prompt,
            model_ids=model_ids,
            results=[],
            total_cost=total_cost,
            status="running"
        )
        
        # Save initial record
        await self._save_comparison(comparison)
        
        try:
            # Run all models in parallel
            tasks = [
                self._generate_image(model_id, prompt, aspect_ratio)
                for model_id in model_ids
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            parsed_results = []
            for i, result in enumerate(results):
                model_id = model_ids[i]
                model_info = next((m for m in COMPARE_MODELS["image"] if m["id"] == model_id), {})
                
                if isinstance(result, Exception):
                    parsed_results.append(CompareResult(
                        model_id=model_id,
                        model_name=model_info.get("name", model_id),
                        provider=model_info.get("provider", "unknown"),
                        success=False,
                        cost_credits=model_info.get("cost", 0),
                        error_message=str(result)
                    ))
                else:
                    parsed_results.append(CompareResult(
                        model_id=model_id,
                        model_name=model_info.get("name", model_id),
                        provider=model_info.get("provider", "unknown"),
                        success=True,
                        output_url=result.get("url"),
                        response_time_ms=result.get("time_ms", 0),
                        cost_credits=model_info.get("cost", 0),
                        metadata=result.get("metadata")
                    ))
            
            comparison.results = parsed_results
            comparison.status = "completed"
            
            # Deduct credits
            if db:
                await CreditManager.deduct_credits(
                    db=db,
                    user_id=user_id,
                    service_type="compare",
                    cost=total_cost,
                    details={
                        "compare_id": compare_id,
                        "models": model_ids,
                        "prompt": prompt[:200]
                    }
                )
            
            # Update record
            await self._update_comparison(comparison)
            
            logger.info(f"Comparison {compare_id} completed with {len(parsed_results)} results")
            
        except Exception as e:
            comparison.status = "failed"
            await self._update_comparison(comparison)
            logger.error(f"Comparison {compare_id} failed: {e}")
            raise
        
        return comparison
    
    async def _generate_image(self, model_id: str, prompt: str, aspect_ratio: str) -> Dict[str, Any]:
        """Generate image with specific model"""
        import httpx
        
        start_time = time.time()
        
        # Get API key from vault or settings
        async def get_api_key(provider: str) -> str:
            try:
                from core.key_vault import get_provider_key
                vault_key = await get_provider_key(provider)
                if vault_key:
                    return vault_key
            except Exception:
                pass
            return getattr(settings, f"{provider.upper()}_API_KEY", "")
        
        # Size mapping
        size_mapping = {
            "1:1": "square_hd",
            "16:9": "landscape_16_9",
            "9:16": "portrait_16_9",
            "4:3": "landscape_4_3",
            "3:4": "portrait_4_3"
        }
        fal_size = size_mapping.get(aspect_ratio, "square_hd")
        
        try:
            if model_id.startswith("fal-"):
                api_key = await get_api_key("fal")
                if not api_key:
                    raise ValueError("FAL API key not configured")
                
                # Map model IDs to FAL endpoints
                fal_endpoints = {
                    "fal-flux-schnell": "https://fal.run/fal-ai/flux/schnell",
                    "fal-flux-pro": "https://fal.run/fal-ai/flux-pro/v1.1",
                    "fal-sdxl": "https://fal.run/fal-ai/fast-sdxl",
                }
                
                endpoint = fal_endpoints.get(model_id, fal_endpoints["fal-flux-schnell"])
                
                async with httpx.AsyncClient(timeout=120) as client:
                    response = await client.post(
                        endpoint,
                        headers={"Authorization": f"Key {api_key}"},
                        json={
                            "prompt": prompt,
                            "image_size": fal_size,
                            "num_inference_steps": 25 if "pro" in model_id else 4,
                        }
                    )
                    
                    if response.status_code != 200:
                        raise ValueError(f"FAL API error: {response.status_code}")
                    
                    data = response.json()
                    image_url = data.get("images", [{}])[0].get("url")
                    
                    return {
                        "url": image_url,
                        "time_ms": int((time.time() - start_time) * 1000),
                        "metadata": {"timings": data.get("timings", {})}
                    }
            
            elif model_id.startswith("openai-"):
                api_key = await get_api_key("openai")
                if not api_key:
                    raise ValueError("OpenAI API key not configured")
                
                async with httpx.AsyncClient(timeout=120) as client:
                    response = await client.post(
                        "https://api.openai.com/v1/images/generations",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "dall-e-3",
                            "prompt": prompt,
                            "n": 1,
                            "size": "1024x1024",
                            "quality": "standard"
                        }
                    )
                    
                    if response.status_code != 200:
                        raise ValueError(f"OpenAI API error: {response.status_code}")
                    
                    data = response.json()
                    image_url = data.get("data", [{}])[0].get("url")
                    
                    return {
                        "url": image_url,
                        "time_ms": int((time.time() - start_time) * 1000),
                        "metadata": {}
                    }
            
            else:
                raise ValueError(f"Unknown model: {model_id}")
                
        except Exception as e:
            logger.error(f"Image generation failed for {model_id}: {e}")
            raise
    
    async def _save_comparison(self, comparison: Comparison):
        """Save comparison to database"""
        supabase = get_supabase_client()
        if not supabase:
            return
        
        try:
            data = {
                "id": comparison.id,
                "user_id": comparison.user_id,
                "compare_type": comparison.compare_type,
                "prompt": comparison.prompt,
                "model_ids": comparison.model_ids,
                "results": [r.to_dict() for r in comparison.results],
                "total_cost": comparison.total_cost,
                "status": comparison.status,
                "created_at": comparison.created_at.isoformat()
            }
            
            supabase.table("model_comparisons").insert(data).execute()
            
        except Exception as e:
            logger.error(f"Failed to save comparison: {e}")
    
    async def _update_comparison(self, comparison: Comparison):
        """Update comparison in database"""
        supabase = get_supabase_client()
        if not supabase:
            return
        
        try:
            supabase.table("model_comparisons").update({
                "results": [r.to_dict() for r in comparison.results],
                "status": comparison.status
            }).eq("id", comparison.id).execute()
            
        except Exception as e:
            logger.error(f"Failed to update comparison: {e}")
    
    async def get_user_comparisons(
        self, 
        user_id: str, 
        limit: int = 20,
        compare_type: Optional[str] = None
    ) -> List[Comparison]:
        """Get user's comparison history"""
        supabase = get_supabase_client()
        if not supabase:
            return []
        
        try:
            query = supabase.table("model_comparisons").select("*").eq("user_id", user_id)
            
            if compare_type:
                query = query.eq("compare_type", compare_type)
            
            result = query.order("created_at", desc=True).limit(limit).execute()
            
            comparisons = []
            for row in result.data or []:
                results = [
                    CompareResult(**r) for r in row.get("results", [])
                ]
                comparisons.append(Comparison(
                    id=row["id"],
                    user_id=row["user_id"],
                    compare_type=row["compare_type"],
                    prompt=row["prompt"],
                    model_ids=row["model_ids"],
                    results=results,
                    total_cost=row["total_cost"],
                    status=row["status"],
                    created_at=datetime.fromisoformat(row["created_at"])
                ))
            
            return comparisons
            
        except Exception as e:
            logger.error(f"Failed to get comparisons: {e}")
            return []
    
    async def get_comparison(self, compare_id: str, user_id: str) -> Optional[Comparison]:
        """Get specific comparison"""
        supabase = get_supabase_client()
        if not supabase:
            return None
        
        try:
            result = supabase.table("model_comparisons")\
                .select("*")\
                .eq("id", compare_id)\
                .eq("user_id", user_id)\
                .single()\
                .execute()
            
            if result.data:
                row = result.data
                results = [CompareResult(**r) for r in row.get("results", [])]
                return Comparison(
                    id=row["id"],
                    user_id=row["user_id"],
                    compare_type=row["compare_type"],
                    prompt=row["prompt"],
                    model_ids=row["model_ids"],
                    results=results,
                    total_cost=row["total_cost"],
                    status=row["status"],
                    created_at=datetime.fromisoformat(row["created_at"])
                )
            return None
            
        except Exception as e:
            logger.error(f"Failed to get comparison: {e}")
            return None


# Singleton instance
_compare_service = None

def get_compare_service() -> ModelCompareService:
    """Get model compare service singleton"""
    global _compare_service
    if _compare_service is None:
        _compare_service = ModelCompareService()
    return _compare_service
