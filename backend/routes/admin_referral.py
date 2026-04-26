from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any, Optional
from core.supabase_client import get_supabase_client
from core.security import get_current_admin_user
from types import SimpleNamespace

router = APIRouter(prefix="/admin/referrals", tags=["Admin Referrals"])

@router.get("/stats")
async def get_referral_global_stats(current_user: SimpleNamespace = Depends(get_current_admin_user)):
    """Referans sistemi genel istatistiklerini getirir."""
    supabase = get_supabase_client()
    
    try:
        # Toplam referans kodu sayısı
        codes_resp = supabase.table("referral_codes").select("id", count="exact").execute()
        total_codes = codes_resp.count or 0
        
        # Toplam başarılı referans bağlantısı
        referrals_resp = supabase.table("referrals").select("id", count="exact").execute()
        total_referrals = referrals_resp.count or 0
        
        # Toplam ödenen komisyon (kredi)
        earnings_resp = supabase.table("referral_earnings").select("amount").execute()
        total_commissions = sum(float(row["amount"]) for row in earnings_resp.data) if earnings_resp.data else 0
        
        return {
            "success": True,
            "total_referral_codes": total_codes,
            "total_successful_referrals": total_referrals,
            "total_commissions_paid_credits": total_commissions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İstatistikler alınamadı: {str(e)}")

@router.get("/earnings")
async def get_referral_earnings(
    page: int = 1, 
    limit: int = 50,
    current_user: SimpleNamespace = Depends(get_current_admin_user)
):
    """Tüm referans kazanç geçmişini getirir."""
    supabase = get_supabase_client()
    
    try:
        start = (page - 1) * limit
        end = start + limit - 1
        
        # Kazançları getir (referrer ve source_user bilgileriyle birlikte)
        # Not: Supabase join'leri için view veya RPC gerekebilir ama şimdilik basit select yapalım
        response = supabase.table("referral_earnings").select("*").order("created_at", desc=True).range(start, end).execute()
        records = response.data or []
        
        # Kullanıcı bilgilerini zenginleştirmek için benzersiz ID'leri topla
        user_ids = set()
        for r in records:
            user_ids.add(r["referrer_id"])
            user_ids.add(r["source_user_id"])
        
        user_info_map = {}
        if user_ids:
            users_resp = supabase.table("users").select("id, email, full_name").in_("id", list(user_ids)).execute()
            for u in users_resp.data:
                user_info_map[u["id"]] = u
        
        # Kayıtları zenginleştir
        enriched_records = []
        for r in records:
            enriched_records.append({
                **r,
                "referrer": user_info_map.get(r["referrer_id"], {"email": "Unknown"}),
                "source_user": user_info_map.get(r["source_user_id"], {"email": "Unknown"})
            })
            
        return {
            "success": True,
            "data": enriched_records,
            "count": len(enriched_records)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kazanç geçmişi alınamadı: {str(e)}")

@router.get("/top-referrers")
async def get_top_referrers(limit: int = 10, current_user: SimpleNamespace = Depends(get_current_admin_user)):
    """En çok referans getirenleri listeler."""
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("referral_codes").select("*").order("total_referrals", desc=True).limit(limit).execute()
        records = response.data or []
        
        user_ids = [r["user_id"] for r in records]
        user_info_map = {}
        if user_ids:
            users_resp = supabase.table("users").select("id, email, full_name").in_("id", user_ids).execute()
            for u in users_resp.data:
                user_info_map[u["id"]] = u
        
        enriched_records = []
        for r in records:
            enriched_records.append({
                **r,
                "user": user_info_map.get(r["user_id"], {"email": "Unknown"})
            })
            
        return {
            "success": True,
            "data": enriched_records
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Liderlik tablosu alınamadı: {str(e)}")
