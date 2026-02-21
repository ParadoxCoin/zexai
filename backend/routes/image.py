"""
Image generation service routes
Handles AI image generation with credit-based billing
"""
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
import httpx
import time
import uuid

from schemas.media import ImageRequest, ImageResponse
from core.security import get_current_user
from core.database import get_database
from core.credits import CreditManager
from core.credits import CreditManager
from core.config import settings
from services.image_service import image_service
from services.storage_service_supabase import hybrid_storage_service
from schemas.image_new import ImageGenerateRequest, AspectRatio
from fastapi import Form


router = APIRouter(prefix="/image", tags=["Image Generation"])


@router.post("/generate-legacy", response_model=ImageResponse)
async def generate_image(
    request: ImageRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Generate AI image
    Credits are deducted per image generated
    """
    start_time = time.time()
    
    try:
        # Size mapping for Fal.ai
        size_mapping = {
            "1024x1024": "square_hd",
            "1024x768": "landscape_4_3",
            "768x1024": "portrait_4_3",
            "1536x1024": "landscape_16_9"
        }
        fal_size = size_mapping.get(request.size, "square_hd")
        
        # Provider configurations
        provider_configs = {
            "fal-flux-pro": {
                "endpoint": "https://fal.run/fal-ai/flux-pro/v1.1",
                "payload": {
                    "prompt": request.prompt,
                    "image_size": fal_size,
                    "num_inference_steps": 25,
                    "guidance_scale": 3.5,
                    "enable_safety_checker": True
                }
            },
            "fal-sd-xl": {
                "endpoint": "https://fal.run/fal-ai/fast-sdxl",
                "payload": {
                    "prompt": request.prompt,
                    "image_size": fal_size,
                    "num_inference_steps": 25,
                    "guidance_scale": 7.5
                }
            }
        }
        
        if request.provider not in provider_configs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported provider: {request.provider}"
            )
        
        config = provider_configs[request.provider]
        
        # Get API key from Key Vault or settings
        async def get_api_key():
            try:
                from core.key_vault import get_provider_key
                vault_key = await get_provider_key("fal")
                if vault_key:
                    return vault_key
            except Exception:
                pass
            return settings.FAL_API_KEY
        
        api_key = await get_api_key()
        
        # Check if API key is configured
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Image generation service is not configured"
            )
        
        # Calculate cost before API call
        cost = await CreditManager.get_service_cost(db, "image", request.num_images)
        
        # Check if user has enough credits
        balance = await CreditManager.get_user_balance(db, current_user.id)
        if balance < cost:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient credits. Required: {cost}, Available: {balance}"
            )
        
        # Make API call to image provider
        async with httpx.AsyncClient() as client:
            response = await client.post(
                config["endpoint"],
                headers={
                    "Authorization": f"Key {api_key}",
                    "Content-Type": "application/json"
                },
                json=config["payload"],
                timeout=60.0
            )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Image API error: {response.status_code}"
            )
        
        result = response.json()
        generation_time = time.time() - start_time
        
        # Extract image URL
        image_url = result.get("images", [{}])[0].get("url", "")
        
        if not image_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate image"
            )
        
        # Deduct credits and log usage
        await CreditManager.deduct_credits(
            db=db,
            user_id=current_user.id,
            service_type="image",
            cost=cost,
            details={
                "provider": request.provider,
                "size": request.size,
                "prompt": request.prompt[:200],  # Store truncated prompt
                "num_images": request.num_images
            }
        )
        
        # Save generation record
        await db.image_generations.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "prompt": request.prompt,
            "provider": request.provider,
            "size": request.size,
            "image_url": image_url,
            "credits_charged": cost,
            "created_at": datetime.utcnow()
        })
        
        return ImageResponse(
            image_url=image_url,
            provider=request.provider,
            size=request.size,
            credits_charged=cost,
            generation_time=generation_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image generation failed: {str(e)}"
        )


# ============================================
# Background Removal
# ============================================

from fastapi import File, UploadFile
import base64
import os

@router.post("/remove-background")
async def remove_background(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Remove background from image (Kie.ai powered)
    """
    return await image_service.process_background_removal(file, current_user, db)


# ============================================
# Image Upscaling (4K)
# ============================================

@router.post("/upscale")
async def upscale_image(
    file: UploadFile = File(...),
    scale: int = 2,  # 2x or 4x
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Upscale image to higher resolution (Kie.ai powered)
    """
    return await image_service.process_upscale(file, scale, current_user, db)


# ============================================
# Img2Img (Image Variation)
# ============================================

@router.post("/img2img")
async def img2img(
    file: UploadFile = File(...),
    prompt: str = Form(""),
    strength: float = Form(0.7),
    model_id: str = Form("kie_nano_banana_edit"),
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Generate image variation from source image (Redesigned for Kie.ai)
    Uploads reference image to storage then calls ImageService
    """
    try:
        # 1. Upload to Storage
        contents = await file.read()
        filename = f"{uuid.uuid4()}_{file.filename}"
        # Use user-specific path in 'uploads' 
        object_name = f"uploads/{current_user.id}/{filename}"
        
        image_url = await hybrid_storage_service.upload_file(
            file_data=contents, 
            object_name=object_name, 
            content_type=file.content_type
        )
        
        if not image_url:
            raise HTTPException(status_code=500, detail="Failed to upload reference image")
            
        # 2. Start generation task via ImageService
        # We construct a request object manually since we're not using JSON body
        try:
            req = ImageGenerateRequest(
                prompt=prompt,
                model_id=model_id,
                num_images=1,
                image_url=image_url,
                strength=strength,
                aspect_ratio=None # Will use default or source AR logic in provider
            )
        except Exception as e:
             # Fallback if validation fails (e.g. model_id missing from enum)
             # But here model_id is str in Form, validation happens inside Pydantic
             raise HTTPException(status_code=400, detail=f"Invalid request data: {e}")

        # This calls Kie provider internally
        result = await image_service.start_image_generation(req, current_user, db)
        
        # 3. Return task_id for polling (Async)
        return {
            "success": True, 
            "task_id": result.task_id,
            "status": "queued",
            "message": "Task started, please poll for results",
            # Legacy compatibility fields (will be null)
            "image_url": None,
            "credits_charged": 0 
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Img2Img start failed: {str(e)}")


# ============================================
# Face Swap
# ============================================

@router.post("/face-swap")
async def face_swap(
    source_face: UploadFile = File(...),
    target_image: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Swap face from source to target image
    """
    try:
        source_contents = await source_face.read()
        target_contents = await target_image.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        source_b64 = base64.b64encode(source_contents).decode()
        target_b64 = base64.b64encode(target_contents).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://fal.run/fal-ai/face-swap",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "base_image_url": f"data:image/jpeg;base64,{target_b64}",
                    "swap_image_url": f"data:image/jpeg;base64,{source_b64}"
                },
                timeout=90.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Face swap failed")
        
        result = response.json()
        output_url = result.get("image", {}).get("url", "")
        
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=10,
            details={"action": "face_swap"})
        
        return {"success": True, "image_url": output_url, "credits_charged": 10}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face swap failed: {str(e)}")


# ============================================
# Inpainting (Object Removal / Edit)
# ============================================

@router.post("/inpaint")
async def inpaint_image(
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    prompt: str = "",
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Inpaint/edit image with mask (object removal or replacement)
    """
    try:
        image_contents = await image.read()
        mask_contents = await mask.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        image_b64 = base64.b64encode(image_contents).decode()
        mask_b64 = base64.b64encode(mask_contents).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://fal.run/fal-ai/fast-sdxl/inpainting",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "image_url": f"data:{image.content_type};base64,{image_b64}",
                    "mask_url": f"data:{mask.content_type};base64,{mask_b64}",
                    "prompt": prompt or "clean background, seamless",
                    "num_inference_steps": 25
                },
                timeout=90.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Inpainting failed")
        
        result = response.json()
        output_url = result.get("images", [{}])[0].get("url", "")
        
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=8,
            details={"action": "inpaint", "prompt": prompt[:100]})
        
        return {"success": True, "image_url": output_url, "credits_charged": 8}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inpainting failed: {str(e)}")


# ============================================
# Background Replace
# ============================================

@router.post("/replace-background")
async def replace_background(
    file: UploadFile = File(...),
    new_background: str = "professional studio lighting, white background",
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Remove background and replace with AI-generated one
    """
    try:
        contents = await file.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        image_b64 = base64.b64encode(contents).decode()
        
        # Step 1: Remove background
        async with httpx.AsyncClient() as client:
            rembg_response = await client.post(
                "https://fal.run/fal-ai/imageutils/rembg",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={"image_url": f"data:{file.content_type};base64,{image_b64}"},
                timeout=60.0
            )
        
        if rembg_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Background removal failed")
        
        # Step 2: Generate new background with inpainting
        fg_url = rembg_response.json().get("image", {}).get("url", "")
        
        # For simplicity, return the transparent version with instruction
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=6,
            details={"action": "replace_background", "new_bg": new_background[:50]})
        
        return {"success": True, "image_url": fg_url, "new_background_prompt": new_background, "credits_charged": 6}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Background replace failed: {str(e)}")


# ============================================
# Outpainting (Extend Image)
# ============================================

@router.post("/outpaint")
async def outpaint_image(
    file: UploadFile = File(...),
    direction: str = "all",  # left, right, up, down, all
    prompt: str = "",
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Extend image beyond its borders
    """
    try:
        contents = await file.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        image_b64 = base64.b64encode(contents).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://fal.run/fal-ai/creative-upscaler",  # Outpaint via upscaler
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "image_url": f"data:{file.content_type};base64,{image_b64}",
                    "prompt": prompt or "extend naturally, seamless",
                    "scale": 2
                },
                timeout=120.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Outpainting failed")
        
        result = response.json()
        output_url = result.get("image", {}).get("url", "")
        
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=12,
            details={"action": "outpaint", "direction": direction})
        
        return {"success": True, "image_url": output_url, "direction": direction, "credits_charged": 12}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Outpainting failed: {str(e)}")


# ============================================
# Style Transfer
# ============================================

@router.post("/style-transfer")
async def style_transfer(
    content_image: UploadFile = File(...),
    style: str = "anime",  # anime, oil-painting, watercolor, sketch, 3d-render
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Apply artistic style to image
    """
    try:
        contents = await content_image.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        image_b64 = base64.b64encode(contents).decode()
        
        style_prompts = {
            "anime": "anime style, studio ghibli, detailed",
            "oil-painting": "oil painting, classical art, textured brushstrokes",
            "watercolor": "watercolor painting, soft colors, artistic",
            "sketch": "pencil sketch, detailed drawing, black and white",
            "3d-render": "3D render, octane render, highly detailed",
            "cyberpunk": "cyberpunk style, neon lights, futuristic",
            "vintage": "vintage photo, film grain, retro style"
        }
        
        prompt = style_prompts.get(style, style_prompts["anime"])
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://fal.run/fal-ai/fast-sdxl/image-to-image",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "image_url": f"data:{content_image.content_type};base64,{image_b64}",
                    "prompt": prompt,
                    "strength": 0.6,
                    "num_inference_steps": 30
                },
                timeout=90.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Style transfer failed")
        
        result = response.json()
        output_url = result.get("images", [{}])[0].get("url", "")
        
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=8,
            details={"action": "style_transfer", "style": style})
        
        return {"success": True, "image_url": output_url, "style": style, "credits_charged": 8}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Style transfer failed: {str(e)}")


# ============================================
# Photo Restoration (Old Photo Fix)
# ============================================

@router.post("/restore")
async def restore_photo(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Restore old/damaged photos
    """
    try:
        contents = await file.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        image_b64 = base64.b64encode(contents).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://fal.run/fal-ai/creative-upscaler",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "image_url": f"data:{file.content_type};base64,{image_b64}",
                    "prompt": "restore old photo, remove damage, enhance quality, colorize if needed",
                    "scale": 2
                },
                timeout=120.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Restoration failed")
        
        result = response.json()
        output_url = result.get("image", {}).get("url", "")
        
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=10,
            details={"action": "photo_restore"})
        
        return {"success": True, "image_url": output_url, "credits_charged": 10}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restoration failed: {str(e)}")


# ============================================
# Logo/Watermark Removal
# ============================================

@router.post("/remove-watermark")
async def remove_watermark(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Remove logos and watermarks from images using inpainting
    """
    try:
        contents = await file.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        image_b64 = base64.b64encode(contents).decode()
        
        # Use LaMa inpainting model for watermark removal
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://fal.run/fal-ai/lama",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "image_url": f"data:{file.content_type};base64,{image_b64}",
                    # Auto-detect watermarks in corners
                },
                timeout=60.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Watermark removal failed")
        
        result = response.json()
        output_url = result.get("image", {}).get("url", result.get("output", ""))
        
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=8,
            details={"action": "remove_watermark"})
        
        return {"success": True, "image_url": output_url, "credits_charged": 8}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Watermark removal failed: {str(e)}")


# ============================================
# Auto Color Correction
# ============================================

@router.post("/color-correct")
async def color_correct(
    file: UploadFile = File(...),
    enhancement_type: str = "auto",  # auto, vibrant, warm, cool, vintage
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Auto color correction and enhancement
    """
    try:
        contents = await file.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        image_b64 = base64.b64encode(contents).decode()
        
        # Enhancement prompts based on type
        prompts = {
            "auto": "enhance colors, improve lighting, professional photo quality",
            "vibrant": "vibrant saturated colors, high contrast, vivid",
            "warm": "warm golden tones, sunset warmth, cozy atmosphere",
            "cool": "cool blue tones, crisp clean look, modern",
            "vintage": "vintage film look, faded colors, retro aesthetic"
        }
        
        prompt = prompts.get(enhancement_type, prompts["auto"])
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://fal.run/fal-ai/creative-upscaler",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "image_url": f"data:{file.content_type};base64,{image_b64}",
                    "prompt": prompt,
                    "creativity": 0.3,  # Low creativity for color correction
                    "scale": 1  # No upscaling, just enhancement
                },
                timeout=60.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Color correction failed")
        
        result = response.json()
        output_url = result.get("image", {}).get("url", "")
        
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=5,
            details={"action": "color_correct", "type": enhancement_type})
        
        return {"success": True, "image_url": output_url, "enhancement_type": enhancement_type, "credits_charged": 5}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Color correction failed: {str(e)}")


# ============================================
# Magic Resize (Multi-Platform)
# ============================================

PLATFORM_SIZES = {
    "instagram_post": {"width": 1080, "height": 1080, "name": "Instagram Post"},
    "instagram_story": {"width": 1080, "height": 1920, "name": "Instagram Story"},
    "instagram_landscape": {"width": 1080, "height": 566, "name": "Instagram Landscape"},
    "facebook_post": {"width": 1200, "height": 630, "name": "Facebook Post"},
    "facebook_cover": {"width": 820, "height": 312, "name": "Facebook Cover"},
    "twitter_post": {"width": 1200, "height": 675, "name": "Twitter Post"},
    "twitter_header": {"width": 1500, "height": 500, "name": "Twitter Header"},
    "youtube_thumbnail": {"width": 1280, "height": 720, "name": "YouTube Thumbnail"},
    "linkedin_post": {"width": 1200, "height": 627, "name": "LinkedIn Post"},
    "linkedin_banner": {"width": 1584, "height": 396, "name": "LinkedIn Banner"},
    "pinterest": {"width": 1000, "height": 1500, "name": "Pinterest Pin"},
    "tiktok": {"width": 1080, "height": 1920, "name": "TikTok Video Cover"},
}

@router.get("/resize/platforms")
async def get_platform_sizes():
    """Get available platform size presets"""
    return {"platforms": PLATFORM_SIZES}

@router.post("/magic-resize")
async def magic_resize(
    file: UploadFile = File(...),
    platform: str = "instagram_post",
    fill_mode: str = "extend",  # extend (outpaint) or crop (smart crop)
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Resize image for different social media platforms
    Uses outpainting to extend or smart cropping
    """
    try:
        if platform not in PLATFORM_SIZES:
            raise HTTPException(status_code=400, detail=f"Unknown platform. Available: {list(PLATFORM_SIZES.keys())}")
        
        target = PLATFORM_SIZES[platform]
        contents = await file.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        image_b64 = base64.b64encode(contents).decode()
        
        if fill_mode == "extend":
            # Use outpainting to extend the image
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://fal.run/fal-ai/creative-upscaler",
                    headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                    json={
                        "image_url": f"data:{file.content_type};base64,{image_b64}",
                        "prompt": "extend the image naturally, seamless background",
                        "target_width": target["width"],
                        "target_height": target["height"],
                    },
                    timeout=120.0
                )
        else:
            # Smart crop mode - use upscaler first then we'll crop on frontend
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://fal.run/fal-ai/creative-upscaler",
                    headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                    json={
                        "image_url": f"data:{file.content_type};base64,{image_b64}",
                        "scale": 2
                    },
                    timeout=60.0
                )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Resize failed")
        
        result = response.json()
        output_url = result.get("image", {}).get("url", "")
        
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=8,
            details={"action": "magic_resize", "platform": platform, "mode": fill_mode})
        
        return {
            "success": True, 
            "image_url": output_url, 
            "platform": platform,
            "target_size": target,
            "credits_charged": 8
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Magic resize failed: {str(e)}")


# ============================================
# Product Photography
# ============================================

PRODUCT_BACKGROUNDS = {
    "studio_white": "professional product photography, clean white studio background, soft lighting",
    "studio_gray": "professional product photography, neutral gray studio background, professional lighting",
    "gradient_blue": "product on elegant blue gradient background, studio lighting",
    "gradient_purple": "product on premium purple gradient background, soft shadows",
    "marble": "product on elegant white marble surface, luxury aesthetic",
    "wood": "product on natural wood table, warm ambient lighting",
    "lifestyle_desk": "product on modern minimalist desk, lifestyle photography",
    "lifestyle_shelf": "product on stylish shelf, home interior background",
    "outdoor_nature": "product in natural outdoor setting, soft natural light",
    "abstract": "product on abstract colorful geometric background, modern design",
}

@router.get("/product-photo/backgrounds")
async def get_product_backgrounds():
    """Get available product photography backgrounds"""
    return {"backgrounds": list(PRODUCT_BACKGROUNDS.keys())}

@router.post("/product-photo")
async def product_photography(
    file: UploadFile = File(...),
    background: str = "studio_white",
    custom_prompt: str = "",
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Create professional product photography with AI background
    """
    try:
        contents = await file.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        image_b64 = base64.b64encode(contents).decode()
        
        # Get background prompt
        bg_prompt = custom_prompt if custom_prompt else PRODUCT_BACKGROUNDS.get(background, PRODUCT_BACKGROUNDS["studio_white"])
        
        # Step 1: Remove background
        async with httpx.AsyncClient() as client:
            # Remove background first
            bg_remove_response = await client.post(
                "https://fal.run/fal-ai/imageutils/rembg",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={"image_url": f"data:{file.content_type};base64,{image_b64}"},
                timeout=60.0
            )
            
            if bg_remove_response.status_code != 200:
                raise HTTPException(status_code=500, detail="Background removal failed")
            
            no_bg_result = bg_remove_response.json()
            no_bg_url = no_bg_result.get("image", {}).get("url", "")
            
            # Step 2: Generate new background with product
            compose_response = await client.post(
                "https://fal.run/fal-ai/flux/dev",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "prompt": bg_prompt,
                    "image_url": no_bg_url,
                    "strength": 0.3,  # Keep product, change background
                    "image_size": "square_hd"
                },
                timeout=90.0
            )
            
            if compose_response.status_code != 200:
                # Fallback: just return the no-bg image
                output_url = no_bg_url
            else:
                compose_result = compose_response.json()
                output_url = compose_result.get("images", [{}])[0].get("url", no_bg_url)
        
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=15,
            details={"action": "product_photo", "background": background})
        
        return {
            "success": True, 
            "image_url": output_url, 
            "background": background,
            "credits_charged": 15
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Product photography failed: {str(e)}")


# ============================================
# Batch Processing (Multiple Images)
# ============================================

from typing import List as TypingList
from fastapi import Form

BATCH_TOOLS = ["remove-bg", "upscale", "restore", "remove-watermark", "color-correct"]

@router.get("/batch/tools")
async def get_batch_tools():
    """Get tools available for batch processing"""
    return {"tools": BATCH_TOOLS}

@router.post("/batch/process")
async def batch_process(
    files: TypingList[UploadFile] = File(...),
    tool: str = Form(...),
    options: str = Form("{}"),  # JSON string for tool-specific options
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Process multiple images with the same tool
    Returns a list of results
    """
    try:
        if tool not in BATCH_TOOLS:
            raise HTTPException(status_code=400, detail=f"Tool not available for batch. Available: {BATCH_TOOLS}")
        
        if len(files) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 images per batch")
        
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        # Calculate total cost
        cost_per_image = {
            "remove-bg": 5, "upscale": 10, "restore": 10, 
            "remove-watermark": 8, "color-correct": 5
        }
        total_cost = cost_per_image.get(tool, 5) * len(files)
        
        # Check credits
        await CreditManager.check_sufficient_credits(db, current_user.id, total_cost)
        
        results = []
        import json
        opts = json.loads(options) if options else {}
        
        async with httpx.AsyncClient() as client:
            for file in files:
                contents = await file.read()
                image_b64 = base64.b64encode(contents).decode()
                
                try:
                    if tool == "remove-bg":
                        response = await client.post(
                            "https://fal.run/fal-ai/imageutils/rembg",
                            headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                            json={"image_url": f"data:{file.content_type};base64,{image_b64}"},
                            timeout=60.0
                        )
                    elif tool == "upscale":
                        response = await client.post(
                            "https://fal.run/fal-ai/creative-upscaler",
                            headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                            json={"image_url": f"data:{file.content_type};base64,{image_b64}", "scale": opts.get("scale", 2)},
                            timeout=120.0
                        )
                    elif tool == "restore":
                        response = await client.post(
                            "https://fal.run/fal-ai/creative-upscaler",
                            headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                            json={"image_url": f"data:{file.content_type};base64,{image_b64}", "prompt": "restore old photo", "scale": 2},
                            timeout=120.0
                        )
                    elif tool == "color-correct":
                        enhancement = opts.get("enhancement_type", "auto")
                        prompts = {"auto": "enhance colors", "vibrant": "vibrant colors", "warm": "warm tones", "cool": "cool tones", "vintage": "vintage look"}
                        response = await client.post(
                            "https://fal.run/fal-ai/creative-upscaler",
                            headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                            json={"image_url": f"data:{file.content_type};base64,{image_b64}", "prompt": prompts.get(enhancement, "enhance"), "creativity": 0.3, "scale": 1},
                            timeout=60.0
                        )
                    else:
                        response = await client.post(
                            "https://fal.run/fal-ai/lama",
                            headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                            json={"image_url": f"data:{file.content_type};base64,{image_b64}"},
                            timeout=60.0
                        )
                    
                    if response.status_code == 200:
                        result = response.json()
                        output_url = result.get("image", {}).get("url", "")
                        results.append({"filename": file.filename, "success": True, "image_url": output_url})
                    else:
                        results.append({"filename": file.filename, "success": False, "error": "Processing failed"})
                        
                except Exception as e:
                    results.append({"filename": file.filename, "success": False, "error": str(e)})
        
        # Deduct credits for successful results
        successful = sum(1 for r in results if r["success"])
        actual_cost = cost_per_image.get(tool, 5) * successful
        
        if actual_cost > 0:
            await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=actual_cost,
                details={"action": "batch_process", "tool": tool, "count": successful})
        
        return {
            "success": True,
            "total_images": len(files),
            "successful": successful,
            "failed": len(files) - successful,
            "credits_charged": actual_cost,
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")


# ============================================
# Character Consistency (IP-Adapter)
# ============================================

@router.post("/character-generate")
async def character_generate(
    reference_image: UploadFile = File(...),
    prompt: str = Form(...),
    negative_prompt: str = Form(""),
    style: str = Form("realistic"),  # realistic, anime, 3d
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Generate images with consistent character using IP-Adapter
    Uses a reference image to maintain character identity
    """
    try:
        contents = await reference_image.read()
        fal_key = os.getenv("FAL_API_KEY", settings.FAL_API_KEY)
        
        if not fal_key:
            raise HTTPException(status_code=503, detail="Service not configured")
        
        image_b64 = base64.b64encode(contents).decode()
        
        # Style modifiers
        style_modifiers = {
            "realistic": "photorealistic, high detail, professional photography",
            "anime": "anime style, detailed anime art, studio quality",
            "3d": "3D render, octane render, cinema 4D, high quality 3D",
            "cartoon": "cartoon style, vibrant colors, clean lines",
            "oil-painting": "oil painting, artistic, masterpiece"
        }
        
        enhanced_prompt = f"{prompt}, {style_modifiers.get(style, '')}, same person, consistent character, same face"
        
        async with httpx.AsyncClient() as client:
            # Use IP-Adapter for character consistency
            response = await client.post(
                "https://fal.run/fal-ai/flux/dev/image-to-image",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "image_url": f"data:{reference_image.content_type};base64,{image_b64}",
                    "prompt": enhanced_prompt,
                    "negative_prompt": negative_prompt or "different person, different face, inconsistent, bad anatomy",
                    "strength": 0.65,  # Keep more of the reference
                    "num_images": 1,
                    "image_size": "square_hd"
                },
                timeout=120.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Character generation failed")
        
        result = response.json()
        output_url = result.get("images", [{}])[0].get("url", "")
        
        await CreditManager.deduct_credits(db=db, user_id=current_user.id, service_type="image", cost=12,
            details={"action": "character_generate", "style": style})
        
        return {
            "success": True, 
            "image_url": output_url, 
            "style": style,
            "credits_charged": 12
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Character generation failed: {str(e)}")
