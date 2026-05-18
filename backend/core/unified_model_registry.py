from enum import Enum
from typing import Dict, List, Optional
from core.database import get_db
from core.logger import app_logger as logger
from core.image_models import FAL_IMAGE_MODELS, REPLICATE_IMAGE_MODELS, POLLO_IMAGE_MODELS
# POLLO_VIDEO_MODELS removed from here as it's not in video_models.py
from core.video_models import FAL_VIDEO_MODELS, REPLICATE_VIDEO_MODELS, PIAPI_VIDEO_MODELS, GOAPI_VIDEO_MODELS
from core.pollo_models import POLLO_VIDEO_MODELS 
from core.kie_models import KIE_IMAGE_MODELS, KIE_VIDEO_MODELS, KIE_MUSIC_MODELS, KIE_TTS_MODELS

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
            "kie_credits": m.get("kie_credits"),
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
        
        # Only Kie.ai image models are allowed
        add_models(KIE_IMAGE_MODELS, ModelCategory.IMAGE, "kie.ai")  # Premium image models
        
        add_models(KIE_MUSIC_MODELS, ModelCategory.AUDIO, "kie.ai")  # Music generation
        add_models(KIE_TTS_MODELS, ModelCategory.AUDIO, "kie.ai")    # TTS models

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
        print(f"DEBUG: get_models called for category={category}, type={type}, active_only={active_only}")
        print(f"DEBUG: _base_models count = {len(self._base_models)}")
        
        # 3. Filter by category and type
        if category:
            cat_lower = category.lower()
            result = {k: v for k, v in self._base_models.items() if (v.get("category") or "").lower() == cat_lower}
        else:
            result = self._base_models.copy()
            
        if type:
            type_lower = type.lower()
            result = {k: v for k, v in result.items() if (v.get("type") or "").lower() == type_lower}
            
        print(f"DEBUG: result count after base = {len(result)}")

        # 2. Apply DB Overrides from ai_models
        try:
            db_res = db.table("ai_models").select("*").execute()
            if db_res and db_res.data:
                for db_m in db_res.data:
                    mid = db_m["id"]
                    if category and db_m.get("category") != category: continue
                    
                    if mid in result:
                        # CRITICAL: If DB has data, it MUST override hardcoded base
                        result[mid].update({k: v for k, v in db_m.items() if v is not None})
                        
                        # Production-level Capability Engine Extraction
                        caps = db_m.get("capabilities") or {}
                        if not isinstance(caps, dict): caps = {}
                        
                        # Normalize 'video' capabilities
                        video_caps = caps.get("video") or caps.get("video_params") or {}
                        if not isinstance(video_caps, dict): video_caps = {}
                        
                        # FORCED PURGE: Kill legacy hardcoded keys if we have engine data
                        # This prevents the "5s fallback" from hardcoded parameters
                        if video_caps:
                            current_caps = result[mid].get("capabilities", {})
                            if isinstance(current_caps, dict):
                                if "parameters" in current_caps: del current_caps["parameters"]
                                if "video_params" in current_caps: del current_caps["video_params"]
                                current_caps["video"] = video_caps
                                result[mid]["capabilities"] = current_caps
                            
                            result[mid]["source"] = "database"
                        
                        # Ensure essential lists are present
                        durations = video_caps.get("durations") or video_caps.get("duration_options") or db_m.get("duration_options") or [5]
                        resolutions = video_caps.get("resolutions") or db_m.get("resolutions") or ["720p", "1080p", "4K"]
                        
                        # Map to top-level for backward compatibility
                        result[mid]["durations"] = durations
                        result[mid]["resolutions"] = resolutions
                        result[mid]["video_caps"] = video_caps
                    else:
                        # New model from DB
                        standardized = {
                            "id": mid,
                            "name": db_m.get("name") or mid.split('/')[-1].replace('-', ' ').title(),
                            "category": db_m.get("category") or "other",
                            "type": db_m.get("type") or "text_to_image",
                            "provider": db_m.get("provider") or "unknown",
                            "cost_usd": float(db_m.get("cost_usd") or 0),
                            "cost_multiplier": float(db_m.get("cost_multiplier") or 1.0),
                            "credits": int(db_m.get("credits") or 0) if db_m.get("credits") is not None else int(float(db_m.get("cost_usd") or 0) * float(db_m.get("cost_multiplier") or 1.2) * 100) or 100,
                            "is_active": db_m.get("is_active", True),
                            "source": "database"
                        }
                        standardized.update({k: v for k, v in db_m.items() if v is not None})
                        
                        caps = db_m.get("capabilities") or {}
                        video_caps = caps.get("video") or caps.get("video_params") or {}
                        standardized["video_caps"] = video_caps
                        result[mid] = standardized
        except Exception as e:
            logger.error(f"Error in get_video_models: {e}", exc_info=True)
            
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
                            "cost_usd": float(vm.get("cost_usd") or 0),
                            "cost_multiplier": float(vm.get("cost_multiplier") or 2.0),
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

        # 3.5 Force Consistency for Kie.ai models (Prevent "karışmış" issues)
        # Create a mapping of model_id -> kie_base for faster lookup
        kie_lookup = {}
        # Include ALL Kie catalogs in lookup
        for catalog in [KIE_VIDEO_MODELS, KIE_IMAGE_MODELS, KIE_MUSIC_MODELS, KIE_TTS_MODELS]:
            for k, v in catalog.items():
                kie_lookup[k] = v
                if v.get("model_id"):
                    kie_lookup[v.get("model_id")] = v

        for mid, m in result.items():
            # Check if model provider is kie.ai or if it matches a known KIE model ID
            is_kie = (m.get("provider") or "").lower() in ("kie.ai", "kie")
            kie_base = kie_lookup.get(mid) or (kie_lookup.get(m.get("provider_model_id")) if is_kie else None)
            
            if kie_base:
                # Force provider to kie.ai for consistency
                m["provider"] = "kie.ai"
                
                # Ensure credits and status match code base (Source of truth)
                m["credits"] = kie_base.get("kie_credits", m.get("credits"))
                m["kie_credits"] = kie_base.get("kie_credits", m.get("kie_credits"))
                m["cost_usd"] = kie_base.get("cost_usd", m.get("cost_usd"))
                m["is_active"] = True # ALWAYS ACTIVE FOR KIE
                
                # Force metadata from code
                if "type" in kie_base: m["type"] = kie_base["type"]
                if "version_name" in kie_base: m["version_name"] = kie_base["version_name"]
                if "durations" in kie_base: m["durations"] = kie_base["durations"]
                if "resolutions" in kie_base: m["resolutions"] = kie_base["resolutions"]
                if "badge" in kie_base: m["badge"] = kie_base["badge"]
                if "description" in kie_base: m["description"] = kie_base["description"]
                if "quality" in kie_base: m["quality"] = kie_base["quality"]
                if "speed" in kie_base: m["speed"] = kie_base["speed"]
                
                # Ensure video_caps.pricing is correctly populated only for models with durations
                if m.get("durations"):
                    # Resolution multipliers for professional pricing tiers
                    RES_MULTIPLIER = {"720p": 0.8, "1080p": 1.0, "2K": 1.4, "4K": 1.8}
                    
                    PER_SECOND_MAP = {
                        # Google Veo
                        "veo-3-quality": 110,
                        "veo-3-fast": 69,
                        "veo-3.1-quality": 129,
                        "veo-3.1-fast": 64,
                        "veo-3.1-lite": 35,
                        # Kling 3.0
                        "kling-3.0-audio": 104,
                        "kling-3.0-standard": 70,
                        "kling-o3-audio": 136,
                        # Kling 2.6
                        "kling-2.6-audio": 74,
                        "kling-2.6-10s": 46,
                        "kling-2.6-audio-5s": 52,
                        "kling-2.6-5s": 35,
                        # OpenAI Sora
                        "openai/sora-2-10s": 48,
                        "openai/sora-2-15s": 37,
                        # Wan 2.6
                        "wan-2.6-1080p-15s": 87,
                        "wan-2.6-1080p-10s": 69,
                        "wan-2.6-1080p-5s": 59,
                        "wan-2.6-720p-10s": 46,
                        "wan-2.6-720p-5s": 41,
                        # Others
                        "hailuo/2.3-video": 8,
                        "grok-imagine/video": 13,
                        "runway/gen3": 5,
                    }
                    
                    model_id_slug = kie_base.get("model_id")
                    per_second = PER_SECOND_MAP.get(model_id_slug)
                    
                    pricing = {}
                    for d in m["durations"]:
                        if per_second:
                            pricing[str(d)] = {}
                            for res in m.get("resolutions", []):
                                mult = RES_MULTIPLIER.get(res, 1.0)
                                pricing[str(d)][res] = int(d * per_second * mult)
                        else:
                            pricing[str(d)] = {res: int(m["credits"] * (d / 5)) for res in m.get("resolutions", [])}
                    
                    m["video_caps"] = {
                        "durations": m["durations"],
                        "resolutions": m.get("resolutions", []),
                        "pricing": pricing,
                        "base_duration": m["durations"][0] if m["durations"] else 5,
                        "per_second_pricing": bool(per_second)
                    }

        # 4. Deduplicate: Remove DB models that duplicate kie_ models
        # kie_ models have correct hardcoded pricing, DB models often have stale 100 ZEX
        import re
        
        def extract_base(name: str) -> str:
            """Extract base model name: 'Veo 3.1 (Quality)' -> 'veo 3.1'"""
            clean = re.split(r'\s*[\(\[\{]', name)[0].strip()
            # Remove trailing variant words
            for suffix in ['Fast', 'Lite', 'Quality', 'Standard', 'Audio', 'Pro', 'Turbo', 'Master', 'Alpha']:
                clean = re.sub(rf'\s+{suffix}$', '', clean, flags=re.IGNORECASE)
            return clean.lower().strip()
        
        kie_base_names = set()
        for mid, m in result.items():
            if mid.startswith("kie_"):
                bn = extract_base(m.get("name") or "")
                if bn:
                    kie_base_names.add(bn)
        
        def has_kie_equivalent(model_name: str) -> bool:
            """Check if a DB model's name matches any kie_ model base name"""
            db_bn = extract_base(model_name)
            if not db_bn:
                return False
            for kie_bn in kie_base_names:
                if db_bn == kie_bn or db_bn in kie_bn or kie_bn in db_bn:
                    return True
            return False
        
        # 5. Deprecated/outdated models to remove entirely
        DEPRECATED_MODELS = {
            "fal_pika_2", "replicate_svd", "fal_luma_dream",
            "kling21_master_text", "kling25_turbo_text", "kling25_turbo_image",
            "luma_dream_text", "sora_turbo_text",
        }
        
        # 6. Filter active status, remove duplicates & deprecated, convert to list
        final_list = []
        for mid, m in result.items():
            # Skip deprecated models
            if mid in DEPRECATED_MODELS:
                continue
            
            is_act = m.get("is_active", True)
            if active_only and not is_act:
                continue
            
            # Skip non-kie models if a kie_ version exists for a similar base_name
            if not mid.startswith("kie_"):
                model_name = m.get("name") or ""
                if model_name and has_kie_equivalent(model_name):
                    continue  # Skip DB duplicate
            
            final_list.append(m)
            
        # 7. Sort models to prioritize Audio-enabled models, then by quality
        def model_sort_key(m):
            name = (m.get("name") or "").lower()
            # Score 1: Has Audio? (True=1, False=0)
            has_audio = 1 if "audio" in name or "sonic" in name or m.get("capabilities", {}).get("synchronized_audio") else 0
            # Score 2: Quality score (default 4)
            quality = m.get("quality", 4)
            # We want highest audio first, then highest quality.
            # We negate so that descending sort works naturally in sorted()
            return (-has_audio, -quality, name)
            
        final_list.sort(key=model_sort_key)
            
        return final_list

    async def update_model(self, db, model_id: str, updates: Dict) -> Dict:
        """Update model (create/update DB override)"""
        # 1. Update core fields in ai_models table
        core_fields = ["id", "name", "category", "type", "provider", "cost_usd", "cost_multiplier", "quality", "speed", "badge", "description", "is_active", "capabilities"]
        data = {k: v for k, v in updates.items() if k in core_fields}
        data["id"] = model_id
        
        # Merge advanced video params into capabilities for extra persistence
        models = await self.get_models(db, active_only=False)
        m = next((m for m in models if m["id"] == model_id), None)
        
        if updates.get("category") == "video" or (m and m.get("category") == "video"):
            caps = updates.get("capabilities") or (m.get("capabilities") if m else {})
            if not isinstance(caps, dict): caps = {}
            
            video_params = caps.get("video_params") or {}
            if not isinstance(video_params, dict): video_params = {}
            
            for field in ["duration_options", "resolutions", "quality_multipliers", "per_second_pricing", "base_duration"]:
                if updates.get(field) is not None:
                    video_params[field] = updates[field]
            
            caps["video_params"] = video_params
            data["capabilities"] = caps

        # Upsert to ai_models (Supabase uses sync client)
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

            # Get existing model for fallbacks to avoid NULL constraint violations
            models = await self.get_models(db, active_only=False)
            m = next((m for m in models if m["id"] == model_id), None)
            
            # Calculate new credits if cost is provided
            new_cost_usd = updates.get("cost_usd") if updates.get("cost_usd") is not None else (m.get("cost_usd") if m else 0.0)
            new_cost_mult = updates.get("cost_multiplier") if updates.get("cost_multiplier") is not None else (m.get("cost_multiplier") if m else 2.0)
            new_credits = updates.get("credits") or max(1, int(float(new_cost_usd) * float(new_cost_mult) * 100))

            # Base fields that might have NOT NULL constraints in DB
            # NOTE: video_models table does NOT have cost_usd or cost_multiplier columns
            video_data = {
                "id": model_id,
                "provider_id": provider or (m.get("provider") if m else "unknown"),
                "name": updates.get("name") or (m.get("name") if m else model_id),
                "display_name": updates.get("name") or (m.get("name") if m else model_id),
                "model_type": updates.get("type") or (m.get("type") if m else "text_to_video"),
                "endpoint": (m.get("endpoint") if m else f"/video/{model_id}/generate"),
                "credits": new_credits,
                "is_active": updates.get("is_active") if updates.get("is_active") is not None else (m.get("is_active") if m else True),
                
                # Advanced video parameters
                "duration_options": updates.get("duration_options"),
                "resolutions": updates.get("resolutions"),
                "quality_multipliers": updates.get("quality_multipliers"),
                "per_second_pricing": updates.get("per_second_pricing"),
                "base_duration": to_int(updates.get("base_duration"), 5)
            }
            
            # Remove None values only for non-essential fields (not the ones above)
            optional_fields = ["duration_options", "resolutions", "quality_multipliers", "per_second_pricing"]
            for f in optional_fields:
                if video_data.get(f) is None:
                    del video_data[f]

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
