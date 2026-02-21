"""Admin image management"""
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from core.security import get_current_admin_user
from core.database import get_database
from core.image_models import ALL_IMAGE_MODELS

router = APIRouter(prefix="/admin/image", tags=["Admin - Image"])

@router.get("/pricing/multiplier")
async def get_mult(admin = Depends(get_current_admin_user), db = Depends(get_database)):
    cfg = await db.image_pricing.find_one({"type": "multiplier"})
    return {"multiplier": cfg.get("value", 2.0) if cfg else 2.0, "updated_at": cfg.get("updated_at") if cfg else None}

@router.post("/pricing/multiplier")
async def set_mult(multiplier: float, admin = Depends(get_current_admin_user), db = Depends(get_database)):
    await db.image_pricing.update_one({"type": "multiplier"}, {"$set": {"value": multiplier, "updated_at": datetime.utcnow()}}, upsert=True)
    return {"success": True, "multiplier": multiplier}

@router.get("/stats")
async def stats(days: int = 30, admin = Depends(get_current_admin_user), db = Depends(get_database)):
    start = datetime.utcnow() - timedelta(days=days)
    total = await db.image_tasks.count_documents({"status": "completed", "created_at": {"$gte": start}})
    credits_res = await db.image_tasks.aggregate([
        {"$match": {"status": "completed", "created_at": {"$gte": start}}},
        {"$group": {"_id": None, "total": {"$sum": "$credits_used"}}}
    ]).to_list(1)
    credits = credits_res[0]["total"] if credits_res else 0
    return {"total_images": total, "total_credits": credits, "period_days": days}

