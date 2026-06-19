from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from core.supabase_client import get_supabase_client
from core.security import get_current_admin_user
from types import SimpleNamespace

router = APIRouter(prefix="/admin/airdrops", tags=["Admin Airdrops"])

# Airdrop verisini gruplamak için yardımcı fonksiyon
def group_airdrops(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    airdrop_map = {}
    for row in records:
        wallet = row.get("referrer_wallet")
        amount = float(row.get("zex_amount", 0))
        
        if wallet in airdrop_map:
            airdrop_map[wallet] += amount
        else:
            airdrop_map[wallet] = amount
            
    return [{"address": wallet, "amount": amount} for wallet, amount in airdrop_map.items()]

@router.get("/pending")
async def get_pending_airdrops(current_user: SimpleNamespace = Depends(get_current_admin_user)):
    """Dağıtılmamış airdrop kayıtlarını getirir."""
    # get_current_admin_user zaten admin kontrolü yapıyor, ekstra role kontrolüne gerek yok
    
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("presale_referrals").select("*").eq("distributed", False).execute()
        records = response.data or []
        
        grouped_data = group_airdrops(records)
        record_ids = [row.get("id") for row in records]
        
        return {
            "success": True,
            "total_wallets": len(grouped_data),
            "total_zex": sum(item["amount"] for item in grouped_data),
            "data": grouped_data,
            "record_ids": record_ids
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Airdrop verisi alınamadı: {str(e)}")


@router.post("/mark-distributed")
async def mark_airdrops_distributed(request_data: dict, current_user: SimpleNamespace = Depends(get_current_admin_user)):
    """Verilen ID listesindeki kayıtları dağıtıldı olarak işaretler."""
    
    record_ids = request_data.get("record_ids", [])
    if not record_ids:
        return {"success": True, "updated_count": 0}
        
    supabase = get_supabase_client()
    
    try:
        # Supabase'de .in_() filtresi ile toplu güncelleme
        response = supabase.table("presale_referrals").update({"distributed": True}).in_("id", record_ids).execute()
        
        return {
            "success": True,
            "updated_count": len(response.data) if response.data else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kayıtlar güncellenemedi: {str(e)}")
