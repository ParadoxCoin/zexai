"""
Admin Pricing Management Routes
Merkezi fiyatlandırma yönetimi
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime

from core.database import get_database
from core.security import get_current_user, require_admin
from core.pricing_config import ServiceCost, PricingPackage, CreditRate, calculate_credits
from schemas.admin import PricingPackageCreate, ServiceCostUpdate

router = APIRouter(prefix="/admin/pricing", tags=["Admin Pricing"])

@router.get("/service-costs")
async def get_service_costs(
    current_user = Depends(require_admin),
    db = Depends(get_database)
):
    """Tüm servis maliyetlerini getir"""
    costs = await db.service_costs.find({"is_active": True}).to_list(length=None)
    return {"service_costs": costs}

@router.post("/service-costs")
async def update_service_cost(
    cost_data: ServiceCostUpdate,
    current_user = Depends(require_admin),
    db = Depends(get_database)
):
    """Servis maliyetini güncelle"""
    # Mevcut maliyeti bul veya oluştur
    existing = await db.service_costs.find_one({
        "service_type": cost_data.service_type,
        "provider": cost_data.provider,
        "model_id": cost_data.model_id
    })
    
    if existing:
        # Güncelle
        await db.service_costs.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "cost_per_unit": cost_data.cost_per_unit,
                    "multiplier": cost_data.multiplier,
                    "is_active": cost_data.is_active,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    else:
        # Yeni oluştur
        new_cost = ServiceCost(
            service_type=cost_data.service_type,
            provider=cost_data.provider,
            model_id=cost_data.model_id,
            cost_per_unit=cost_data.cost_per_unit,
            unit_type=cost_data.unit_type,
            multiplier=cost_data.multiplier,
            is_active=cost_data.is_active
        )
        await db.service_costs.insert_one(new_cost.model_dump())
    
    return {"message": "Service cost updated successfully"}

@router.get("/packages")
async def get_pricing_packages(
    current_user = Depends(require_admin),
    db = Depends(get_database)
):
    """Fiyatlandırma paketlerini getir"""
    packages = await db.pricing_packages.find({"is_active": True}).to_list(length=None)
    return {"packages": packages}

@router.post("/packages")
async def create_pricing_package(
    package_data: PricingPackageCreate,
    current_user = Depends(require_admin),
    db = Depends(get_database)
):
    """Yeni fiyatlandırma paketi oluştur"""
    new_package = PricingPackage(
        name=package_data.name,
        monthly_credits=package_data.monthly_credits,
        price_usd=package_data.price_usd,
        features=package_data.features,
        is_active=package_data.is_active
    )
    
    await db.pricing_packages.insert_one(new_package.model_dump())
    return {"message": "Pricing package created successfully"}

@router.get("/credit-rate")
async def get_credit_rate(
    current_user = Depends(require_admin),
    db = Depends(get_database)
):
    """Kredi dönüşüm oranını getir"""
    rate = await db.credit_rates.find_one({"is_active": True})
    if not rate:
        # Varsayılan oranı oluştur
        default_rate = CreditRate()
        await db.credit_rates.insert_one(default_rate.model_dump())
        rate = default_rate.model_dump()
    
    return {"credit_rate": rate}

@router.post("/credit-rate")
async def update_credit_rate(
    usd_to_credit_rate: int,
    bonus_percentage: float = 0.0,
    current_user = Depends(require_admin),
    db = Depends(get_database)
):
    """Kredi dönüşüm oranını güncelle"""
    # Eski oranı deaktif et
    await db.credit_rates.update_many(
        {"is_active": True},
        {"$set": {"is_active": False}}
    )
    
    # Yeni oranı oluştur
    new_rate = CreditRate(
        usd_to_credit_rate=usd_to_credit_rate,
        bonus_percentage=bonus_percentage
    )
    await db.credit_rates.insert_one(new_rate.model_dump())
    
    return {"message": "Credit rate updated successfully"}

@router.get("/calculate-credits")
async def calculate_service_credits(
    service_type: str,
    provider: str,
    model_id: str,
    units: float = 1.0,
    current_user = Depends(require_admin),
    db = Depends(get_database)
):
    """Servis için kredi hesapla (test amaçlı)"""
    cost = await db.service_costs.find_one({
        "service_type": service_type,
        "provider": provider,
        "model_id": model_id,
        "is_active": True
    })
    
    if not cost:
        raise HTTPException(404, "Service cost not found")
    
    service_cost = ServiceCost(**cost)
    credits = calculate_credits(service_cost, units)
    
    return {
        "service_type": service_type,
        "provider": provider,
        "model_id": model_id,
        "units": units,
        "cost_per_unit_usd": service_cost.cost_per_unit,
        "multiplier": service_cost.multiplier,
        "total_usd": service_cost.cost_per_unit * units * service_cost.multiplier,
        "credits_required": credits
    }

