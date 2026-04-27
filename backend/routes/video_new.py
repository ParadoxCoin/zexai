"""
Video generation routes with Dynamic Model Integration
Supports multiple providers via Supabase configuration
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional
import httpx
import uuid
import json

from schemas.video import (
    VideoModelInfo,
    VideoGenerateRequest,
    VideoGenerateResponse,
    VideoEffectInfo,
    VideoEffectRequest,
    EffectPackage,
    VideoTaskStatus,
    SocialMediaExportRequest,
    ShareRewardRequest,
    VideoType,
    VideoQuality,
    VideoSpeed
)
from schemas.output import MediaOutput, MediaOutputList, ShowcaseUpdate
from core.security import get_current_user
from core.database import get_db
from core.credits import CreditManager
from services.video_service import video_service
from services.model_service import model_service
from services.unified_video_service import unified_video_service  # Database-driven service
from core.config import settings
from core.pollo_models import EFFECT_PACKAGES, POLLO_VIDEO_MODELS, POLLO_VIDEO_EFFECTS
from core.kie_models import KIE_VIDEO_MODELS  # Premium kie.ai video models
from core.notification_service import notify_generation_complete


router = APIRouter(prefix="/video", tags=["Video Generation"])


@router.get("/models", response_model=List[VideoModelInfo])
async def get_video_models(
    type: Optional[VideoType] = None,
    db = Depends(get_db)
):
    """
    Get all available video models with pricing
    Now reads from database (providers, video_models tables)
    Falls back to hardcoded models if database is empty
    """
    models = []
    
    # Direct database query with robust type mapping
    try:
        from core.database import get_db
        # Fetch from ai_models (the source of truth)
        res = db.table("ai_models").select("*").execute()
        db_models = res.data if res.data else []
        
        type_filter = type.value if type else None
        for m in db_models:
            m_id = m.get("id")
            if not m_id: continue
            
            m_type = str(m.get("type") or m.get("model_type") or "text_to_video").lower()
            m_category = str(m.get("category") or "").lower()
            caps = m.get("capabilities") or {}
            video_caps = caps.get("video") or caps.get("video_params") or {}
            
            # BROAD FILTER: Include if type/category contains 'video' OR has video_caps
            is_video = "video" in m_type or "video" in m_category or len(video_caps) > 0
            if not is_video:
                continue
                
            if type_filter and type_filter not in m_type:
                continue
                
            # Unified naming and PRIORITY: Use JSON caps over static columns
            v_caps = m.get("video_caps") or m.get("video_params") or {}
            if not v_caps and isinstance(caps, dict):
                v_caps = caps.get("video") or caps.get("video_params") or {}
            
            # Determine primary duration from caps if available
            d_list = v_caps.get("durations") or v_caps.get("duration_options") or m.get("durations") or [m.get("duration", 5)]
            primary_duration = int(d_list[0]) if d_list and len(d_list) > 0 else int(m.get("duration", 5))
            
            # Map to schema
            models.append(VideoModelInfo(
                id=m_id,
                provider=m.get("provider", "Premium"),
                name=m.get("display_name") or m.get("name") or m_id,
                type=m_type,
                duration=primary_duration, # Now dynamic
                credits=int(m.get("credits", 100)),
                quality=VideoQuality(int(m.get("quality", 4)) if str(m.get("quality", "")).isdigit() else 4),
                speed=VideoSpeed(m.get("speed", "medium") if isinstance(m.get("speed"), str) else "medium"),
                badge=m.get("badge"),
                description=m.get("description", ""),
                capabilities=caps,
                video_caps=v_caps,
                base_name=m.get("base_name") or (m_id.split('/')[1] if '/' in m_id else m_id),
                version_name=m.get("version_name") or "Standard",
                durations=d_list, # Dynamic list
                resolutions=v_caps.get("resolutions") or m.get("resolutions") or ["720p", "1080p", "4K"],
                slider_duration=bool(v_caps.get("slider_duration") or m.get("slider_duration", False))
            ))
            
        if models:
            models.sort(key=lambda x: (-x.quality.value if hasattr(x.quality, 'value') else -4, x.credits))
            return models
    except Exception as e:
        print(f"[/video/models] Database query failed: {e}")
    
    # Fallback: Combine Pollo.ai and kie.ai hardcoded models
    combined_models = {**POLLO_VIDEO_MODELS, **KIE_VIDEO_MODELS}
    for model_id, model_data in combined_models.items():
        model_type = model_data.get("type", "text_to_video")
        if type and model_type != type.value:
            continue
        
        # Calculate credits (Dynamic Pricing)
        cost_usd = float(model_data.get("cost_usd", model_data.get("pollo_cost_usd", 0.30)))
        multiplier = float(model_data.get("cost_multiplier", 2.0))
        credits = max(1, int(cost_usd * multiplier * 100))
        
        # Branding Cleanup
        provider_display = model_data.get("provider", "unknown")
        if provider_display.lower() in ["kie", "kie.ai"]:
            provider_display = "Premium"
        
        models.append(VideoModelInfo(
            id=model_id,
            provider=provider_display,
            name=model_data.get("name", model_id),
            type=model_type,
            duration=model_data.get("duration", 5),
            credits=credits,
            quality=VideoQuality(model_data.get("quality", 4)),
            speed=VideoSpeed(model_data.get("speed", "medium")),
            badge=model_data.get("badge"),
            example_video_url=f"https://cdn.example.com/videos/{model_id}.mp4",
            description=model_data.get("description"),
            capabilities=model_data.get("capabilities")
        ))

    
    # Sort by quality (descending) then credits (ascending)
    models.sort(key=lambda x: (-x.quality.value, x.credits))
    
    return models


@router.get("/effects", response_model=List[VideoEffectInfo])
async def get_video_effects(
    category: Optional[str] = None,
    db = Depends(get_db)
):
    """
    Get all available video effects
    Reads from database video_effects table, falls back to hardcoded if table doesn't exist
    """
    effects = []
    
    # Try database first
    try:
        query = db.table("video_effects").select("*").eq("is_active", True)
        if category:
            query = query.eq("category", category)
        result = query.order("sort_order").execute()
        
        if result.data:
            for e in result.data:
                effects.append(VideoEffectInfo(
                    id=e["id"],
                    name=e.get("name", e["id"]),
                    description=e.get("description", ""),
                    credits=e.get("credits", 10),
                    icon=e.get("icon", "✨"),
                    example_url=f"https://cdn.pollo.ai/effects/{e['id']}.mp4",
                    requires_two_images=e.get("requires_two_images", False),
                    category=e.get("category", "other")
                ))
            return effects
    except Exception as e:
        print(f"[Effects] Database query failed, using fallback: {e}")
    
    # Fallback to hardcoded
    for effect_id, effect_data in POLLO_VIDEO_EFFECTS.items():
        if category and effect_data.get("category") != category:
            continue
        
        multiplier = float(effect_data.get("cost_multiplier", 2.0))
        cost_usd = float(effect_data.get("pollo_cost_usd", 0))
        credits = int(cost_usd * multiplier * 100)
        
        effects.append(VideoEffectInfo(
            id=effect_id,
            name=effect_data.get("name", effect_id),
            description=effect_data.get("description", ""),
            credits=credits if credits > 0 else 10,
            icon=effect_data.get("icon", "✨"),
            example_url=f"https://cdn.pollo.ai/effects/{effect_id}.mp4",
            requires_two_images=effect_data.get("requires_two_images", False),
            category=effect_data.get("category", "other")
        ))
    
    return effects


@router.get("/effect-packages", response_model=List[EffectPackage])
async def get_effect_packages(db = Depends(get_db)):
    """
    Get effect packages (bundles with discounts)
    Uses hardcoded pricing from POLLO_VIDEO_EFFECTS
    """
    packages = []
    for package_id, package_data in EFFECT_PACKAGES.items():
        # Calculate total credits from hardcoded effects
        total_credits = 0
        for effect_id in package_data["effects"]:
            effect = POLLO_VIDEO_EFFECTS.get(effect_id, {})
            if effect:
                multiplier = float(effect.get("cost_multiplier", 2.0))
                cost_usd = float(effect.get("pollo_cost_usd", 0))
                total_credits += int(cost_usd * multiplier * 100)
        
        # Minimum credits if no effects found
        if total_credits == 0:
            total_credits = len(package_data["effects"]) * 10
        
        # Apply discount
        discounted_credits = int(total_credits * (1 - package_data["discount_percent"] / 100))
        
        packages.append(EffectPackage(
            id=package_id,
            name=package_data["name"],
            description=package_data["description"],
            effects=package_data["effects"],
            total_credits=discounted_credits if discounted_credits > 0 else 50,
            discount_percent=package_data["discount_percent"],
            icon=package_data["icon"]
        ))
    
    return packages


@router.post("/generate", response_model=VideoGenerateResponse)
async def generate_video(
    request: VideoGenerateRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Generate video using selected model
    Uses database-driven unified service, falls back to legacy service
    """
    # Try unified service first (database-driven)
    try:
        model = await unified_video_service.get_model(db, request.model_id)
        if model:
            return await unified_video_service.start_video_generation(request, current_user, db)
    except Exception as e:
        print(f"[/generate] Unified service failed, using legacy: {e}")
    
    # Fallback to legacy service
    return await video_service.start_video_generation(request, current_user, db)


@router.get("/tasks/{task_id}", response_model=VideoTaskStatus)
async def get_task_status(
    task_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get video generation task status
    """
    return await video_service.get_task_status_and_update(task_id, current_user.id, db)


@router.post("/effects/apply", response_model=VideoGenerateResponse)
async def apply_effect(
    request: VideoEffectRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Apply video effect to image(s)
    Uses Pollo.ai for effect application
    """
    # Get effect info - try database first, then hardcoded
    effect = None
    try:
        db_result = db.table("video_effects").select("*").eq("id", request.effect_id).single().execute()
        if db_result.data:
            effect = db_result.data
    except Exception:
        pass
    
    if not effect:
        effect = POLLO_VIDEO_EFFECTS.get(request.effect_id)
    
    if not effect:
        raise HTTPException(status_code=404, detail=f"Effect '{request.effect_id}' not found")
    
    # Validate inputs - some effects require two images
    if effect.get("requires_two_images") and not request.image_url_2:
        raise HTTPException(
            status_code=400,
            detail=f"{effect.get('name', request.effect_id)} requires 2 images"
        )
    
    # Calculate credits
    credits_required = effect.get("credits") or int(float(effect.get("pollo_cost_usd", 0.10)) * 2 * 100)
    
    # Check sufficient credits
    await CreditManager.check_sufficient_credits(
        db, current_user.id, credits_required
    )
    
    # Create task ID
    task_id = str(uuid.uuid4())
    
    # Pollo.ai API Configuration
    pollo_api_key = settings.POLLO_API_KEY if hasattr(settings, 'POLLO_API_KEY') else None
    pollo_base_url = "https://pollo.ai/api/platform"
    
    # If no API key in settings, try to get from key vault
    if not pollo_api_key:
        try:
            vault_response = db.table("api_key_vault").select("api_key").eq("provider_name", "pollo").eq("is_active", True).limit(1).execute()
            if vault_response.data:
                pollo_api_key = vault_response.data[0].get("api_key")
        except Exception as e:
            print(f"Key vault lookup failed: {e}")
    
    if not pollo_api_key:
        raise HTTPException(status_code=500, detail="Pollo.ai API key not configured")
    
    provider_task_id = None
    
    try:
        # Build Pollo.ai request - uses I2V generation with effect prompt
        effect_name = effect.get("name", request.effect_id)
        
        # Effect-specific prompts for better I2V results
        effect_prompts = {
            "earth_zoom": "Cinematic zoom from outer space, starting from Earth view, gradually zooming into the exact location of this image, smooth camera movement with clouds parting",
            "360_rotation": "Smooth 360 degree rotation around the subject, cinematic camera orbit, maintaining focus on the center, professional studio quality",
            "zoom_out": "Dramatic zoom out from this image, revealing more surroundings, smooth camera pullback with cinematic motion",
            "anime_style": "Transform into beautiful anime style animation, vibrant colors, smooth cel-shading, Studio Ghibli inspired, gentle character movement",
            "cartoon_style": "Transform into colorful cartoon animation, exaggerated features, Disney/Pixar style, smooth playful animation",
            "polaroid_duo": "Create a polaroid photo reveal animation, vintage film aesthetic, photo dropping onto surface with shadow",
            "ai_caricature": "Create an animated caricature with exaggerated features, funny expressions, wobbling head movement, comic style",
        }
        effect_prompt = effect_prompts.get(request.effect_id, f"Apply {effect_name} effect, cinematic quality, smooth animation")
        
        pollo_request = {
            "input": {
                "image": request.image_url,
                "prompt": effect_prompt,
                "length": 4,
                "resolution": "720p",
                "movementAmplitude": "auto"
            }
        }
        
        if request.image_url_2:
            pollo_request["input"]["imageTail"] = request.image_url_2
        
        # Use Vidu model for effects (I2V with effect prompt)
        api_endpoint = f"{pollo_base_url}/generation/vidu/vidu-v2-0"
        
        print(f"[Effects] Pollo.ai request URL: {api_endpoint}")
        print(f"[Effects] Request: {pollo_request}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                api_endpoint,
                headers={
                    "x-api-key": pollo_api_key,
                    "Content-Type": "application/json"
                },
                json=pollo_request
            )
        
        print(f"[Effects] Response status: {response.status_code}")
        print(f"[Effects] Response body: {response.text[:500]}")
        
        if response.status_code not in (200, 201):
            error_detail = response.text[:200] if response.text else "Unknown error"
            raise HTTPException(
                status_code=500,
                detail=f"Pollo.ai API error ({response.status_code}): {error_detail}"
            )
        
        provider_response = response.json()
        provider_task_id = provider_response.get("taskId") or provider_response.get("task_id") or provider_response.get("id")
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Pollo.ai API timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Pollo.ai connection error: {str(e)}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Effect API error: {str(e)}")
    
    # Save task (generations table)
    generation_record = {
        "id": task_id,
        "user_id": str(current_user.id),
        "type": "video_effect",
        "prompt": effect.get("name", request.effect_id),
        "model_id": request.effect_id,
        "status": "processing",
        "credits_cost": credits_required,
        "created_at": datetime.utcnow().isoformat(),
        "metadata": {
            "provider_task_id": provider_task_id,
            "provider_id": "pollo",
            "effect_name": effect.get("name", request.effect_id),
            "effect_category": effect.get("category", "other"),
            "type": "effect",
            "progress": 0
        }
    }
    
    try:
        db.table("generations").insert(generation_record).execute()
    except Exception as e:
        print(f"Generation record failed: {e}")
        # Continue anyway - task was submitted
    
    # Deduct credits
    await CreditManager.deduct_credits(
        db, current_user.id, "video_effect", credits_required,
        details={
            "task_id": task_id,
            "effect": effect.get("name", request.effect_id)
        }
    )
    
    return VideoGenerateResponse(
        success=True,
        task_id=task_id,
        status="processing",
        credits_used=credits_required,
        model_used=effect.get("name", request.effect_id),
        estimated_time=30
    )


@router.post("/export/social-media")
async def export_for_social_media(
    request: SocialMediaExportRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Export video in social media formats
    """
    format_configs = {
        "instagram_reels": {
            "aspect_ratio": "9:16",
            "resolution": "1080x1920",
            "fps": 30,
            "format": "mp4"
        },
        "tiktok": {
            "aspect_ratio": "9:16",
            "resolution": "1080x1920",
            "fps": 60,
            "format": "mp4"
        },
        "youtube_shorts": {
            "aspect_ratio": "9:16",
            "resolution": "1080x1920",
            "fps": 30,
            "format": "mp4"
        },
        "mp4_1080p": {
            "aspect_ratio": "16:9",
            "resolution": "1920x1080",
            "fps": 30,
            "format": "mp4"
        }
    }
    
    config = format_configs.get(request.format.value)
    
    if not config:
        raise HTTPException(status_code=400, detail="Invalid format")
    
    # Fetch Pollo config (assuming export is always Pollo for now)
    # In future we can make this dynamic too
    provider_config = await model_service.get_provider_config(db, "pollo")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{provider_config['base_url']}/video/export",
                headers={
                    "Authorization": f"Bearer {str(provider_config['api_key'])}",
                    "Content-Type": "application/json"
                },
                json={
                    "video_url": request.video_url,
                    "format": config,
                    "add_watermark": request.add_watermark
                }
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Export failed")
        
        export_data = response.json()
        
        return {
            "success": True,
            "download_url": export_data.get("download_url"),
            "format": request.format.value,
            "expires_at": export_data.get("expires_at")
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")


@router.post("/export/share-reward")
async def claim_share_reward(
    request: ShareRewardRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Reward user with credits for sharing their generated video on social media
    """
    REWARD_CREDITS = 15  # Fixed reward for sharing
    
    try:
        # Check if media exists and belongs to user
        result = db.table("media_outputs").select("id, metadata, service_type").eq(
            "id", request.media_id
        ).eq("user_id", str(current_user.id)).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Media item not found or unauthorized")
            
        media = result.data
        metadata = media.get("metadata") or {}
        
        # Check if already rewarded for this specific video
        if metadata.get("reward_claimed") is True:
            raise HTTPException(status_code=400, detail="Reward already claimed for this video")
            
        # Update metadata to mark as claimed
        metadata["reward_claimed"] = True
        metadata["shared_platform"] = request.platform
        metadata["shared_at"] = datetime.utcnow().isoformat()
        
        # Update the database record
        db.table("media_outputs").update({"metadata": metadata}).eq("id", request.media_id).execute()
        
        # Add credits to user wallet
        await CreditManager.add_credits(
            db, 
            current_user.id, 
            REWARD_CREDITS, 
            "social_share_reward",
            details={"media_id": request.media_id, "platform": request.platform}
        )
        
        return {
            "success": True,
            "message": f"Başarıyla paylaşıldı! {REWARD_CREDITS} kredi kazandınız.",
            "reward_amount": REWARD_CREDITS
        }
        
    except httpx.HTTPError:
        raise HTTPException(status_code=500, detail="Network error while processing reward")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to claim reward: {str(e)}")


@router.get("/my-videos", response_model=MediaOutputList)
async def get_my_videos(
    limit: int = 20,
    offset: int = 0,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get user's video generation history from the media_outputs collection.
    Also check and update pending video statuses from Kie.ai
    """
    import httpx
    
    # First check pending videos and update their status
    try:
        pending_result = db.table("media_outputs").select("*").eq(
            "user_id", str(current_user.id)
        ).eq("status", "pending").eq("service_type", "video").limit(5).execute()
        
        if pending_result.data:
            print(f"[StatusPoll] Found {len(pending_result.data)} pending videos")
            # Get API key for kie
            key_result = db.table("provider_keys").select("api_key").eq("provider_id", "kie").eq("is_active", True).limit(1).execute()
            api_key = key_result.data[0]["api_key"] if key_result.data else None
            print(f"[StatusPoll] API key found: {bool(api_key)}")
            
            if api_key:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    for video in pending_result.data:
                        provider_task_id = video.get("provider_task_id")
                        if not provider_task_id:
                            # Try from generation_details
                            gen_details = video.get("generation_details") or {}
                            provider_task_id = gen_details.get("provider_task_id")
                        
                        print(f"[StatusPoll] Video {video['id']}: provider_task_id = {provider_task_id}")
                        
                        if provider_task_id:
                            try:
                                # Correct Kie.ai status endpoint: /jobs/recordInfo
                                status_url = f"https://api.kie.ai/api/v1/jobs/recordInfo?taskId={provider_task_id}"
                                print(f"[StatusPoll] Calling: {status_url}")
                                response = await client.get(
                                    status_url,
                                    headers={"Authorization": f"Bearer {str(api_key)}"}
                                )
                                
                                print(f"[StatusPoll] Response: {response.status_code} - {response.text[:500]}")
                                
                                if response.status_code == 200:
                                    data = response.json()
                                    
                                    # Handle "recordInfo is null" - video expired or deleted at Kie.ai
                                    if data.get("code") == 422:
                                        # Check if video is older than 6 hours - mark as failed
                                        from datetime import datetime, timedelta
                                        created_at_str = video.get("created_at", "")
                                        if created_at_str:
                                            try:
                                                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                                                if datetime.now(created_at.tzinfo or None) - created_at > timedelta(hours=6):
                                                    db.table("media_outputs").update({
                                                        "status": "failed"
                                                    }).eq("id", video["id"]).execute()
                                                    print(f"[StatusPoll] ⚠ Video expired (task not found): {video['id']}")
                                            except:
                                                pass
                                    elif data.get("code") == 200:
                                        task_data = data.get("data") or {}
                                        state = task_data.get("state", "").lower()
                                        
                                        # Parse resultJson for video URL
                                        video_url = None
                                        result_json_str = task_data.get("resultJson", "")
                                        if result_json_str:
                                            try:
                                                import json
                                                result_json = json.loads(result_json_str)
                                                result_urls = result_json.get("resultUrls", [])
                                                if result_urls:
                                                    video_url = result_urls[0]
                                            except:
                                                pass
                                        
                                        print(f"[StatusPoll] State: {state}, Video URL: {video_url}")
                                        
                                        if state == "success" and video_url:
                                            # Update to completed
                                            db.table("media_outputs").update({
                                                "status": "completed",
                                                "file_url": video_url
                                            }).eq("id", video["id"]).execute()
                                            
                                            # Trigger Push Notification
                                            try:
                                                import asyncio
                                                asyncio.create_task(notify_generation_complete(
                                                    user_id=video["user_id"],
                                                    generation_type="video",
                                                    generation_id=video["id"]
                                                ))
                                            except Exception as notify_err:
                                                print(f"[StatusPoll] Failed to notify: {notify_err}")
                                                
                                            print(f"[StatusPoll] ✓ Video completed: {video['id']}")
                                        elif state == "fail":
                                            fail_msg = task_data.get("failMsg", "")
                                            db.table("media_outputs").update({
                                                "status": "failed"
                                            }).eq("id", video["id"]).execute()
                                            print(f"[StatusPoll] ✗ Video failed: {video['id']} - {fail_msg}")
                                        elif state in ("waiting", "queuing", "generating"):
                                            db.table("media_outputs").update({
                                                "status": "processing"
                                            }).eq("id", video["id"]).execute()
                            except Exception as poll_err:
                                print(f"[StatusPoll] Error: {poll_err}")
        else:
            print(f"[StatusPoll] No pending videos found")
    except Exception as e:
        print(f"[StatusPoll] Main error: {e}")
    
    return await video_service.get_user_media_outputs(current_user.id, db, limit, offset)

@router.post("/my-videos/{media_id}/showcase", response_model=MediaOutput)
async def update_showcase_status(media_id: str, req: ShowcaseUpdate, current_user = Depends(get_current_user), db = Depends(get_db)):
    """Update the showcase status of a generated media item."""
    
    try:
        # Check if media exists and belongs to user
        response = db.table("media_outputs").select("*").eq("id", media_id).eq("user_id", current_user.id).execute()
        if not response.data:
            raise HTTPException(404, "Media item not found or does not belong to user")
            
        # Update
        response = db.table("media_outputs").update({"is_showcase": req.is_showcase}).eq("id", media_id).execute()
        if not response.data:
             raise HTTPException(500, "Failed to update showcase status")
             
        return MediaOutput(**response.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/showcase", response_model=MediaOutputList)
async def get_public_showcase(limit: int = 20, offset: int = 0, db = Depends(get_db)):
    """Get publicly visible video showcase items."""
    
    try:
        # Get total count
        count_response = db.table("media_outputs").select("*", count="exact").eq("is_showcase", True).eq("service_type", "video").execute()
        total = count_response.count
        
        # Get paginated items
        response = db.table("media_outputs").select("*")\
            .eq("is_showcase", True)\
            .eq("service_type", "video")\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
            
        outputs = response.data
        
        return {
            "outputs": [MediaOutput(**o) for o in outputs], 
            "total": total, 
            "limit": limit, 
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================
# VIDEO EDITING ENDPOINTS
# ============================================

class VideoEditRequest(BaseModel):
    """Request for video-to-video transformation"""
    video_url: str
    prompt: str
    model_id: Optional[str] = "kie_kling26_hd_5s"  # Default to Kling 2.6
    strength: Optional[float] = 0.7  # How much to transform (0-1)
    
class CameraControlRequest(BaseModel):
    """Request for camera-controlled video generation"""
    prompt: str
    model_id: str
    image_url: Optional[str] = None  # Starting frame
    camera_pan: Optional[str] = "none"  # left, right, none
    camera_tilt: Optional[str] = "none"  # up, down, none
    camera_zoom: Optional[str] = "none"  # in, out, none
    duration: Optional[int] = 5


@router.post("/edit")
async def edit_video(
    request: VideoEditRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Video-to-Video transformation
    Transform an existing video using AI
    """
    # Get model info
    model = POLLO_VIDEO_MODELS.get(request.model_id) or KIE_VIDEO_MODELS.get(request.model_id)
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Calculate credits
    multiplier = float(model.get("cost_multiplier", 2.0)) if "cost_multiplier" in model else 2.0
    cost_usd = float(model.get("cost_usd", model.get("pollo_cost_usd", 0.5)))
    credits_required = max(int(cost_usd * multiplier * 100), 50)  # Minimum 50 credits for V2V
    
    # Check credits
    await CreditManager.check_sufficient_credits(db, current_user.id, credits_required)
    
    # Create task
    task_id = str(uuid.uuid4())
    
    # Log task
    await log_task(
        db, 
        current_user.id, 
        task_id, 
        "video_edit", 
        {
            "prompt": request.prompt,
            "video_url": request.video_url,
            "model_id": request.model_id,
            "strength": request.strength
        },
        credits_required
    )
    
    # Deduct credits
    await CreditManager.deduct_credits(db, current_user.id, credits_required)
    
    # TODO: Call kie.ai or provider API for actual V2V transformation
    # For now, return task ID for async processing
    
    return {
        "task_id": task_id,
        "status": "processing",
        "credits_used": credits_required,
        "message": "Video dönüşümü başlatıldı. İşlem birkaç dakika sürebilir."
    }


@router.post("/generate-with-camera")
async def generate_video_with_camera(
    request: CameraControlRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Generate video with camera controls
    Supported by: Kling 2.6, Runway Aleph, Sora 2
    """
    # Get model info
    model = POLLO_VIDEO_MODELS.get(request.model_id) or KIE_VIDEO_MODELS.get(request.model_id)
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check if model supports camera control
    capabilities = model.get("capabilities", {})
    if not capabilities.get("camera_control") and request.model_id not in [
        "kie_kling26_audio_5s", "kie_kling26_audio_10s", "kie_kling26_hd_5s", 
        "kie_kling26_hd_10s", "kie_runway_aleph", "kie_sora2_pro_10s", "kie_sora2_pro_15s"
    ]:
        raise HTTPException(
            status_code=400, 
            detail="Bu model kamera kontrolünü desteklemiyor. Kling 2.6, Runway Aleph veya Sora 2 kullanın."
        )
    
    # Build enhanced prompt with camera directions
    camera_prompt = request.prompt
    camera_instructions = []
    
    if request.camera_pan == "left":
        camera_instructions.append("camera panning left")
    elif request.camera_pan == "right":
        camera_instructions.append("camera panning right")
        
    if request.camera_tilt == "up":
        camera_instructions.append("camera tilting up")
    elif request.camera_tilt == "down":
        camera_instructions.append("camera tilting down")
        
    if request.camera_zoom == "in":
        camera_instructions.append("camera zooming in")
    elif request.camera_zoom == "out":
        camera_instructions.append("camera zooming out")
    
    if camera_instructions:
        camera_prompt = f"{request.prompt}, {', '.join(camera_instructions)}"
    
    # Calculate credits
    multiplier = float(model.get("cost_multiplier", 2.0)) if "cost_multiplier" in model else 2.0
    cost_usd = float(model.get("cost_usd", model.get("kie_credits", 100) * 0.005))
    credits_required = max(int(cost_usd * multiplier * 100), 100)
    
    # Check credits
    await CreditManager.check_sufficient_credits(db, current_user.id, credits_required)
    
    # Create video generation request
    video_request = VideoGenerateRequest(
        model_id=request.model_id,
        prompt=camera_prompt,
        duration=request.duration
    )
    
    # Use existing video generation
    return await video_service.start_video_generation(video_request, current_user, db)


# ============================================
# MOTION BRUSH ENDPOINT
# ============================================

class MotionPath(BaseModel):
    """Single motion path definition"""
    x: int  # Start X position
    y: int  # Start Y position
    direction: str  # "up", "down", "left", "right", "custom"
    intensity: float = 0.5  # 0.1 to 1.0
    end_x: Optional[int] = None  # For custom direction
    end_y: Optional[int] = None  # For custom direction


class MotionBrushRequest(BaseModel):
    """Request for motion brush video generation"""
    image_url: str
    motion_paths: List[MotionPath]
    duration: int = 5  # seconds
    aspect_ratio: str = "16:9"
    prompt: Optional[str] = None  # Optional description


@router.post("/motion-brush", response_model=VideoGenerateResponse)
async def generate_motion_brush_video(
    request: MotionBrushRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Generate video from image with motion brush paths
    Uses kie.ai Kling Motion API
    """
    if not request.motion_paths:
        raise HTTPException(status_code=400, detail="At least one motion path required")
    
    # Credits for motion brush (Kling-based)
    credits_required = 50  # ~$0.25 worth
    
    # Check sufficient credits
    await CreditManager.check_sufficient_credits(db, current_user.id, credits_required)
    
    # Get kie.ai API key from Key Vault
    kie_api_key = None
    try:
        vault_response = db.table("api_key_vault").select("api_key").eq("provider_name", "kie_ai").eq("is_active", True).limit(1).execute()
        if vault_response.data:
            kie_api_key = vault_response.data[0].get("api_key")
    except Exception as e:
        print(f"Key vault lookup failed: {e}")
    
    if not kie_api_key:
        raise HTTPException(status_code=500, detail="kie.ai API key not configured")
    
    # Create task ID
    task_id = str(uuid.uuid4())
    
    # Build motion brush request for kie.ai
    # kie.ai uses Kling's motion brush API
    motion_data = []
    for path in request.motion_paths:
        motion_item = {
            "start": {"x": path.x, "y": path.y},
            "direction": path.direction,
            "strength": path.intensity
        }
        if path.direction == "custom" and path.end_x and path.end_y:
            motion_item["end"] = {"x": path.end_x, "y": path.end_y}
        motion_data.append(motion_item)
    
    kie_request = {
        "model": "kling-motion-brush",
        "image_url": request.image_url,
        "motion_paths": motion_data,
        "duration": request.duration,
        "aspect_ratio": request.aspect_ratio
    }
    
    if request.prompt:
        kie_request["prompt"] = request.prompt
    
    provider_task_id = None
    
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                "https://api.kie.ai/v1/video/motion-brush",
                headers={
                    "Authorization": f"Bearer {kie_api_key}",
                    "Content-Type": "application/json"
                },
                json=kie_request
            )
        
        if response.status_code not in (200, 201):
            error_detail = response.text[:200] if response.text else "Unknown error"
            raise HTTPException(
                status_code=500,
                detail=f"kie.ai API error ({response.status_code}): {error_detail}"
            )
        
        provider_response = response.json()
        provider_task_id = provider_response.get("task_id") or provider_response.get("id")
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="kie.ai API timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"kie.ai connection error: {str(e)}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Motion Brush API error: {str(e)}")
    
    # Save generation record
    generation_record = {
        "id": task_id,
        "user_id": str(current_user.id),
        "type": "motion_brush",
        "prompt": request.prompt or "Motion Brush Animation",
        "model_id": "kling-motion-brush",
        "status": "processing",
        "credits_cost": credits_required,
        "created_at": datetime.utcnow().isoformat(),
        "metadata": {
            "provider_task_id": provider_task_id,
            "provider_id": "kie_ai",
            "motion_paths_count": len(request.motion_paths),
            "duration": request.duration,
            "type": "motion_brush",
            "progress": 0
        }
    }
    
    try:
        db.table("generations").insert(generation_record).execute()
    except Exception as e:
        print(f"Generation record failed: {e}")
    
    # Deduct credits
    await CreditManager.deduct_credits(
        db, current_user.id, "motion_brush", credits_required,
        details={
            "task_id": task_id,
            "motion_paths": len(request.motion_paths)
        }
    )
    
    return VideoGenerateResponse(
        success=True,
        task_id=task_id,
        status="processing",
        credits_used=credits_required,
        model_used="Kling Motion Brush",
        estimated_time=45
    )
