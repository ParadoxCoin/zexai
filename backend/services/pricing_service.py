"""
Merkezi Fiyatlandırma Servisi
Tüm provider'lar için tek noktadan fiyat yönetimi
"""
from typing import Dict, Any, Optional
from core.database import get_database
from core.pricing_config import ServiceCost, calculate_credits, DEFAULT_SERVICE_COSTS
from core.config import settings

class PricingService:
    """Merkezi fiyatlandırma yönetimi"""
    
    @staticmethod
    async def get_service_cost(
        service_type: str, 
        provider: str, 
        model_id: str, 
        db
    ) -> Optional[ServiceCost]:
        """Veritabanından servis maliyetini getir"""
        # Önce veritabanından ara
        cost_record = await db.service_costs.find_one({
            "service_type": service_type,
            "provider": provider,
            "model_id": model_id,
            "is_active": True
        })
        
        if cost_record:
            return ServiceCost(**cost_record)
        
        # Veritabanında yoksa varsayılan değerleri kullan
        key = f"{service_type}_{provider}_{model_id}"
        return DEFAULT_SERVICE_COSTS.get(key)
    
    @staticmethod
    async def calculate_credits_for_service(
        service_type: str,
        provider: str, 
        model_id: str,
        units: float = 1.0,
        db = None
    ) -> int:
        """Servis için kredi hesapla"""
        service_cost = await PricingService.get_service_cost(
            service_type, provider, model_id, db
        )
        
        if not service_cost:
            # Varsayılan maliyet
            return int(units * settings.DEFAULT_USD_TO_CREDIT_RATE * 2.0)
        
        return calculate_credits(service_cost, units)
    
    @staticmethod
    async def get_all_service_costs(db) -> Dict[str, Any]:
        """Tüm servis maliyetlerini getir"""
        costs = await db.service_costs.find({"is_active": True}).to_list(length=None)
        
        # Varsayılan maliyetleri de ekle
        all_costs = {}
        for cost in costs:
            key = f"{cost['service_type']}_{cost['provider']}_{cost['model_id']}"
            all_costs[key] = cost
        
        # Varsayılan maliyetleri ekle (veritabanında olmayanlar)
        for key, default_cost in DEFAULT_SERVICE_COSTS.items():
            if key not in all_costs:
                all_costs[key] = default_cost.model_dump()
        
        return all_costs
    
    @staticmethod
    async def update_service_cost(
        service_type: str,
        provider: str,
        model_id: str,
        cost_per_unit: float,
        multiplier: float = 2.0,
        db = None
    ) -> bool:
        """Servis maliyetini güncelle"""
        try:
            await db.service_costs.update_one(
                {
                    "service_type": service_type,
                    "provider": provider,
                    "model_id": model_id
                },
                {
                    "$set": {
                        "cost_per_unit": cost_per_unit,
                        "multiplier": multiplier,
                        "is_active": True,
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            return True
        except Exception as e:
            print(f"Error updating service cost: {e}")
            return False

# Global instance
pricing_service = PricingService()

