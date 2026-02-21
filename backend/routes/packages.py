"""
Package management routes
Handles effect package purchases and admin CRUD
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from core.security import get_current_user
from core.database import get_db
from core.credits import CreditManager
from core.pollo_models import EFFECT_PACKAGES

router = APIRouter(prefix="/packages", tags=["Packages"])


# ============================================
# SCHEMAS
# ============================================

class PackageBase(BaseModel):
    name: str
    description: str
    icon: str = "📦"
    effects: List[str]  # List of effect IDs
    discount_percent: int = 20
    total_credits: int
    is_active: bool = True


class PackageCreate(PackageBase):
    id: str  # Package ID like "romantic_pack"


class PackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    effects: Optional[List[str]] = None
    discount_percent: Optional[int] = None
    total_credits: Optional[int] = None
    is_active: Optional[bool] = None


class PackageResponse(PackageBase):
    id: str
    original_credits: int  # Calculated from effects


class PurchaseRequest(BaseModel):
    package_id: str


class PurchaseResponse(BaseModel):
    success: bool
    package_id: str
    package_name: str
    credits_used: int
    new_balance: int
    purchased_at: str


# ============================================
# HELPER FUNCTIONS
# ============================================

async def get_packages_from_db(db) -> dict:
    """Get packages from Supabase, fallback to hardcoded"""
    try:
        response = db.table("effect_packages").select("*").eq("is_active", True).execute()
        if response.data:
            return {pkg["id"]: pkg for pkg in response.data}
    except Exception as e:
        print(f"DB fetch failed, using hardcoded packages: {e}")
    
    # Fallback to hardcoded
    return EFFECT_PACKAGES


async def ensure_packages_table(db):
    """Create packages table if not exists (migration helper)"""
    # This would be handled by Supabase migration, but we'll seed data if empty
    try:
        response = db.table("effect_packages").select("id").limit(1).execute()
        if not response.data:
            # Seed with hardcoded packages
            for pkg_id, pkg_data in EFFECT_PACKAGES.items():
                pkg_data["id"] = pkg_id
                db.table("effect_packages").insert(pkg_data).execute()
    except Exception as e:
        print(f"Table check failed: {e}")


# ============================================
# USER ENDPOINTS
# ============================================

@router.get("", response_model=List[PackageResponse])
async def get_all_packages(db=Depends(get_db)):
    """Get all active effect packages"""
    packages = await get_packages_from_db(db)
    
    result = []
    for pkg_id, pkg in packages.items():
        # Calculate original credits (before discount)
        original = int(pkg.get("total_credits", 100) * 100 / (100 - pkg.get("discount_percent", 20)))
        
        result.append(PackageResponse(
            id=pkg_id,
            name=pkg.get("name", pkg_id),
            description=pkg.get("description", ""),
            icon=pkg.get("icon", "📦"),
            effects=pkg.get("effects", []),
            discount_percent=pkg.get("discount_percent", 20),
            total_credits=pkg.get("total_credits", 100),
            is_active=pkg.get("is_active", True),
            original_credits=original
        ))
    
    return result


@router.post("/purchase", response_model=PurchaseResponse)
async def purchase_package(
    request: PurchaseRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Purchase an effect package
    Deducts credits from user balance
    """
    # Get package info
    packages = await get_packages_from_db(db)
    package = packages.get(request.package_id)
    
    if not package:
        raise HTTPException(status_code=404, detail="Paket bulunamadı")
    
    credits_required = package.get("total_credits", 100)
    
    # Check sufficient credits
    await CreditManager.check_sufficient_credits(db, current_user.id, credits_required)
    
    # Deduct credits
    new_balance = await CreditManager.deduct_credits(db, current_user.id, credits_required)
    
    # Record purchase
    purchase_record = {
        "id": str(uuid.uuid4()),
        "user_id": str(current_user.id),
        "package_id": request.package_id,
        "credits_paid": credits_required,
        "purchased_at": datetime.utcnow().isoformat()
    }
    
    try:
        db.table("user_purchased_packages").insert(purchase_record).execute()
    except Exception as e:
        print(f"Purchase record failed: {e}")
        # Continue anyway - credits already deducted
    
    return PurchaseResponse(
        success=True,
        package_id=request.package_id,
        package_name=package.get("name", request.package_id),
        credits_used=credits_required,
        new_balance=new_balance,
        purchased_at=purchase_record["purchased_at"]
    )


@router.get("/my-purchases")
async def get_my_purchases(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Get user's package purchase history"""
    try:
        response = db.table("user_purchased_packages")\
            .select("*")\
            .eq("user_id", str(current_user.id))\
            .order("purchased_at", desc=True)\
            .execute()
        return {"purchases": response.data or []}
    except Exception as e:
        return {"purchases": [], "error": str(e)}


# ============================================
# ADMIN ENDPOINTS
# ============================================

@router.get("/admin/all")
async def admin_get_all_packages(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Admin: Get all packages including inactive"""
    # TODO: Add admin role check
    try:
        response = db.table("effect_packages").select("*").execute()
        return {"packages": response.data or list(EFFECT_PACKAGES.values())}
    except Exception:
        # Return hardcoded if DB fails
        packages = []
        for pkg_id, pkg in EFFECT_PACKAGES.items():
            pkg["id"] = pkg_id
            packages.append(pkg)
        return {"packages": packages}


@router.post("/admin/create")
async def admin_create_package(
    package: PackageCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Admin: Create new package"""
    # TODO: Add admin role check
    pkg_data = package.dict()
    
    try:
        response = db.table("effect_packages").insert(pkg_data).execute()
        return {"success": True, "package": response.data[0] if response.data else pkg_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Paket oluşturulamadı: {str(e)}")


@router.put("/admin/{package_id}")
async def admin_update_package(
    package_id: str,
    updates: PackageUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Admin: Update package"""
    # TODO: Add admin role check
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")
    
    try:
        response = db.table("effect_packages")\
            .update(update_data)\
            .eq("id", package_id)\
            .execute()
        return {"success": True, "package": response.data[0] if response.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Güncelleme başarısız: {str(e)}")


@router.delete("/admin/{package_id}")
async def admin_delete_package(
    package_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Admin: Delete (deactivate) package"""
    # TODO: Add admin role check
    try:
        # Soft delete - just set is_active to false
        response = db.table("effect_packages")\
            .update({"is_active": False})\
            .eq("id", package_id)\
            .execute()
        return {"success": True, "message": f"Paket {package_id} devre dışı bırakıldı"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Silme başarısız: {str(e)}")
