from enum import Enum
from typing import Dict, List, Optional
from core.database import get_db
from core.logger import app_logger as logger
from core.image_models import FAL_IMAGE_MODELS, REPLICATE_IMAGE_MODELS, POLLO_IMAGE_MODELS
# POLLO_VIDEO_MODELS removed from here as it's not in video_models.py
from core.video_models import FAL_VIDEO_MODELS, REPLICATE_VIDEO_MODELS, PIAPI_VIDEO_MODELS, GOAPI_VIDEO_MODELS
from core.pollo_models import POLLO_VIDEO_MODELS 
from core.kie_models import KIE_IMAGE_MODELS, KIE_VIDEO_MODELS, KIE_MUSIC_MODELS

# Define Model Categories
class ModelCategory(str, Enum):
    VIDEO = "video"
    IMAGE = "image"
    AUDIO = "audio"
    CHAT = "chat"
    TEXT = "text"

class UnifiedModelRegistry:
    """
    Centralized registry for all AI models.
    Provides hybrid approach: hardcoded base + DB overrides.
    """
    
    def __init__(self):
        self._base_models: Dict[str, Dict] = {}
        self._load_base_catalogs()

    def _std_model(self, m: Dict, category: ModelCategory, default_provider: str) -> Dict:
        """Standardize model dict"""
        return {
            "id": m.get("id", "unknown"), # Will be overwritten by caller
            "category": category.value,
            "type": m.get("type", "unknown"),
            "name": m.get("name", "Unknown Model"),
            "provider": m.get("provider", default_provider),
            "provider_model_id": m.get("model_id") or m.get("provider_model_id"),
            "cost_usd": float(m.get("cost_usd", 0) or m.get("pollo_cost_usd", 0)),
            "cost_multiplier": float(m.get("cost_multiplier", 2.0)),
            "quality": m.get("quality", 4),
            "speed": m.get("speed", "medium"),
            "duration": m.get("duration"),
            "durations": m.get("durations"),
            "resolutions": m.get("resolutions"),
            "slider_duration": m.get("slider_duration", False),
            "badge": m.get("badge"),
            "description": m.get("description", ""),
            "capabilities": m.get("capabilities", {}),
            "is_active": m.get("is_active", True),
            "source": "hardcoded"
        }

    def _load_base_catalogs(self):
        self._base_models = {}
        
        # Helper to add models
        def add_models(catalog, category, default_provider):
            for mid, m in catalog.items():
                std = self._std_model(m, category, default_provider)
                std["id"] = mid # Explicitly set ID from key
                self._base_models[mid] = std

        add_models(POLLO_VIDEO_MODELS, ModelCategory.VIDEO, "Pollo.ai")
        add_models(FAL_VIDEO_MODELS, ModelCategory.VIDEO, "Fal.ai")
        add_models(PIAPI_VIDEO_MODELS, ModelCategory.VIDEO, "PiAPI")
        add_models(GOAPI_VIDEO_MODELS, ModelCategory.VIDEO, "GoAPI")
        add_models(REPLICATE_VIDEO_MODELS, ModelCategory.VIDEO, "Replicate")
        add_models(KIE_VIDEO_MODELS, ModelCategory.VIDEO, "kie.ai")  # Premium video models
        
        add_models(FAL_IMAGE_MODELS, ModelCategory.IMAGE, "Fal.ai")
        add_models(REPLICATE_IMAGE_MODELS, ModelCategory.IMAGE, "Replicate")
        add_models(POLLO_IMAGE_MODELS, ModelCategory.IMAGE, "Pollo.ai")
        add_models(KIE_IMAGE_MODELS, ModelCategory.IMAGE, "kie.ai")  # Premium image models
        
        add_models(KIE_MUSIC_MODELS, ModelCategory.AUDIO, "kie.ai")  # Music generation

    async def get_models(
        self, 
        db, 
        category: Optional[str] = None,
        type: Optional[str] = None,
        active_only: bool = True
    ) -> List[Dict]:
        """
        Get models with hybrid approach: base + DB overrides
        """
        result = {}
        
        # 1. Base models
        for model_id, model in self._base_models.items():
            if category and model.get("category") != category: continue
            if type and model.get("type") != type: continue
            result[model_id] = model.copy()

        # 2. Apply DB Overrides from ai_models
        try:
            db_res = db.table("ai_models").select("*").execute()
            if db_res and db_res.data:
                for db_m in db_res.data:
                    mid = db_m["id"]
                    if category and db_m.get("category") != category: continue
                    
                    if mid in result:
                        result[mid].update({k: v for k, v in db_m.items() if v is not None})
                    else:
                        # New model from DB - ensure required fields are present
                        standardized = {
                            "id": mid,
                            "name": db_m.get("name") or mid.split('/')[-1].replace('-', ' ').title(),
                            "category": db_m.get("category") or "other",
                            "type": db_m.get("type") or "text_to_image",
                            "provider": db_m.get("provider") or "unknown",
                            "cost_usd": float(db_m.get("cost_usd", 0)),
                            "cost_multiplier": float(db_m.get("cost_multiplier", 1.0)),
                            "is_active": db_m.get("is_active", True),
                            "source": "database"
                        }
                        # Merge the rest
                        standardized.update({k: v for k, v in db_m.items() if v is not None})
                        result[mid] = standardized
        except Exception as e:
            logger.warning(f"Failed to load ai_models: {e}")
            
        # 3. Apply Video-Specific Advanced Parameters
        try:
            video_res = db.table("video_models").select("*").execute()
            if video_res and video_res.data:
                for vm in video_res.data:
                    mid = vm["id"]
                    if mid in result:
                        # Update existing model with advanced video fields
                        updates = {}
                        
                        # Standardize durations/resolutions
                        if vm.get("duration_options"):
                            updates["durations"] = vm["duration_options"]
                            updates["duration_options"] = vm["duration_options"]
                        
                        if vm.get("resolutions"):
                            updates["resolutions"] = vm["resolutions"]
                            
                        # Other advanced fields
                        for field in ["per_second_pricing", "base_duration", "quality_multipliers", "base_name", "version_name", "slider_duration"]:
                            if vm.get(field) is not None:
                                updates[field] = vm[field]
                        
                        result[mid].update(updates)
                    else:
                        # New video model from DB
                        result[mid] = {
                            "id": mid,
                            "name": vm.get("display_name") or vm.get("name") or mid.split('/')[-1].replace('-', ' ').title(),
                            "category": "video",
                            "type": vm.get("model_type") or "text_to_video",
                            "provider": vm.get("provider_id", "unknown"),
                            "cost_usd": float(vm.get("cost_usd", 0)),
                            "cost_multiplier": float(vm.get("cost_multiplier", 2.0)),
                            "credits": vm.get("credits"),
                            "quality": vm.get("quality_rating", 4),
                            "speed": ["slow", "slow", "medium", "fast", "very_fast"][min(vm.get("speed_rating") or 3, 4)],
                            "durations": vm.get("duration_options", [5]),
                            "resolutions": vm.get("resolutions", ["720p", "1080p"]),
                            "per_second_pricing": vm.get("per_second_pricing", False),
                            "base_duration": vm.get("base_duration", 5),
                            "quality_multipliers": vm.get("quality_multipliers", {}),
                            "is_active": vm.get("is_active", True),
                            "source": "video_db"
                        }
        except Exception as e:
            logger.warning(f"Error loading video_models: {e}")

        # 4. Filter active status and convert to list
        final_list = []
        for m in result.values():
            if active_only and not m.get("is_active", True):
                continue
            final_list.append(m)
            
        return final_list

    async def update_model(self, db, model_id: str, updates: Dict) -> Dict:
        """Update model (create/update DB override)"""
        # Prepare DB record for ai_models (core fields)
        core_fields = ["id", "name", "category", "type", "provider", "cost_usd", "cost_multiplier", "quality", "speed", "badge", "description", "is_active", "capabilities"]
        data = {k: v for k, v in updates.items() if k in core_fields}
        data["id"] = model_id
        
        # 1. Upsert to ai_models (Supabase uses sync client)
        db.table("ai_models").upsert(data).execute()
        
        # 2. If it's a video model, also upsert to video_models (advanced fields)
        category = updates.get("category")
        if not category:
            # Try to find category from existing
            models = await self.get_models(db, active_only=False)
            m = next((m for m in models if m["id"] == model_id), None)
            if m:
                category = m.get("category")
        
        if category == "video":
            # Find provider from updates or existing model
            provider = updates.get("provider")
            if not provider:
                models = await self.get_models(db, active_only=False)
                m = next((m for m in models if m["id"] == model_id), None)
                if m:
                    provider = m.get("provider")

            # Explicit type conversion for numeric fields to prevent DB errors
            def to_float(v, default=0.0):
                try: return float(v) if v is not None else default
                except: return default

            def to_int(v, default=0):
                try: return int(v) if v is not None else default
                except: return default

            # Get existing model for fallbacks
            models = await self.get_models(db, active_only=False)
            m = next((m for m in models if m["id"] == model_id), None)
            
            video_data = {
                "id": model_id,
                "provider_id": provider,
                "name": updates.get("name") or (m.get("name") if m else model_id),
                "display_name": updates.get("name") or (m.get("name") if m else model_id),
                "model_type": updates.get("type") or (m.get("type") if m else "text_to_video"),
                "is_active": updates.get("is_active") if updates.get("is_active") is not None else (m.get("is_active") if m else True),
                "duration_options": updates.get("duration_options"),
                "resolutions": updates.get("resolutions"),
                "quality_multipliers": updates.get("quality_multipliers"),
                "per_second_pricing": updates.get("per_second_pricing"),
                "base_duration": to_int(updates.get("base_duration"), 5)
            }
            # Remove None values
            video_data = {k: v for k, v in video_data.items() if v is not None}
            
            try:
                db.table("video_models").upsert(video_data).execute()
            except Exception as e:
                error_msg = f"FAILED to update video_models table for {model_id}: {str(e)}"
                logger.error(error_msg)
                logger.error(f"Payload was: {video_data}")
                raise Exception(error_msg)
        
        # Refresh return
        updated_models = await self.get_models(db, active_only=False) 
        return next((m for m in updated_models if m["id"] == model_id), None)

    async def update_price(self, db, model_id: str, cost_usd: float, cost_multiplier: float = None):
        updates = {"cost_usd": cost_usd}
        if cost_multiplier:
            updates["cost_multiplier"] = cost_multiplier
        return await self.update_model(db, model_id, updates)

    async def toggle_model_active(self, db, model_id: str, is_active: bool):
        return await self.update_model(db, model_id, {"is_active": is_active})

    def get_categories(self):
        return [{"id": c.value, "name": c.name.replace("_", " ").title()} for c in ModelCategory]

    def get_stats(self):
        return {
            "total_models": len(self._base_models),
            "by_category": {}, # TODO: Implement
            "by_source": {"hardcoded": len(self._base_models)}
        }

# Global Instance
model_registry = UnifiedModelRegistry()
