"""
Merkezi Fiyatlandırma Servisi
Tüm provider'lar için tek noktadan fiyat yönetimi (Supabase Version)
"""
from typing import Dict, Any, Optional
from datetime import datetime
from core.database import get_database
from core.pricing_config import ServiceCost, calculate_credits, DEFAULT_SERVICE_COSTS
from core.config import settings

class PricingService:
    """Merkezi fiyatlandırma yönetimi using Supabase"""
    
    @staticmethod
    async def get_service_cost(
        service_type: str, 
        provider: str, 
        model_id: str, 
        db
    ) -> Optional[ServiceCost]:
        """Veritabanından servis maliyetini getir (Supabase)"""
        try:
            # Query Supabase table
            response = db.table("service_costs").select("*").eq("service_type", service_type).eq("provider", provider).eq("model_id", model_id).eq("is_active", True).execute()
            cost_record = response.data[0] if response.data else None
            
            if cost_record:
                return ServiceCost(**cost_record)
        except Exception as e:
            print(f"Warning: Failed to fetch service cost from DB: {e}")
        
        # Veritabanında yoksa veya hata oluşursa varsayılan değerleri kullan
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
        """Tüm servis maliyetlerini getir (Supabase)"""
        try:
            response = db.table("service_costs").select("*").eq("is_active", True).execute()
            costs = response.data or []
        except Exception as e:
            print(f"Warning: Failed to fetch all service costs: {e}")
            costs = []
        
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
        """Servis maliyetini güncelle (Supabase upsert)"""
        try:
            # Check if record exists
            response = db.table("service_costs").select("id").eq("service_type", service_type).eq("provider", provider).eq("model_id", model_id).execute()
            existing = response.data[0] if response.data else None
            
            data = {
                "service_type": service_type,
                "provider": provider,
                "model_id": model_id,
                "cost_per_unit": cost_per_unit,
                "multiplier": multiplier,
                "is_active": True,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if existing:
                db.table("service_costs").update(data).eq("id", existing["id"]).execute()
            else:
                db.table("service_costs").insert(data).execute()
                
            return True
        except Exception as e:
            print(f"Error updating service cost: {e}")
            return False

# Global instance
pricing_service = PricingService()
