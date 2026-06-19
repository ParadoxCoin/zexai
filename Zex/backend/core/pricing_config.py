"""
Merkezi Fiyatlandırma Sistemi
Admin panelinden yönetilebilir, dinamik fiyatlandırma
"""
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class ServiceCost(BaseModel):
    """Servis maliyeti tanımı"""
    service_type: str  # image, video, audio, chat, synapse
    provider: str      # fal, replicate, pollo, openai, etc.
    model_id: str      # specific model
    cost_per_unit: float  # USD cinsinden
    unit_type: str     # per_image, per_second, per_1k_tokens
    multiplier: float = 2.0  # Kar marjı çarpanı
    is_active: bool = True
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

class PricingPackage(BaseModel):
    """Abonelik paketi tanımı"""
    name: str  # "Free", "Pro", "Enterprise"
    monthly_credits: int  # Aylık kredi
    price_usd: float  # USD fiyatı
    features: list[str]  # Özellik listesi
    is_active: bool = True
    created_at: datetime = datetime.utcnow()

class CreditRate(BaseModel):
    """Kredi dönüşüm oranı"""
    usd_to_credit_rate: int = 100  # 1 USD = 100 kredi
    bonus_percentage: float = 0.0  # Bonus yüzdesi
    updated_at: datetime = datetime.utcnow()

# Varsayılan fiyatlandırma (admin panelinden değiştirilebilir)
DEFAULT_SERVICE_COSTS = {
    # Image Generation - FAL.AI
    "image_fal_flux_pro": ServiceCost(
        service_type="image",
        provider="fal",
        model_id="flux_pro",
        cost_per_unit=0.05,
        unit_type="per_image",
        multiplier=2.0
    ),
    "image_fal_flux_dev": ServiceCost(
        service_type="image", 
        provider="fal",
        model_id="flux_dev",
        cost_per_unit=0.025,
        unit_type="per_image",
        multiplier=2.0
    ),
    "image_fal_flux_schnell": ServiceCost(
        service_type="image",
        provider="fal", 
        model_id="flux_schnell",
        cost_per_unit=0.01,
        unit_type="per_image",
        multiplier=2.0
    ),
    
    # Image Generation - Replicate
    "image_replicate_sdxl": ServiceCost(
        service_type="image",
        provider="replicate",
        model_id="sdxl",
        cost_per_unit=0.003,
        unit_type="per_image",
        multiplier=2.0
    ),
    
    # Image Generation - Pollo.ai
    "image_pollo_flux": ServiceCost(
        service_type="image",
        provider="pollo",
        model_id="flux",
        cost_per_unit=0.04,
        unit_type="per_image",
        multiplier=2.0
    ),
    
    # Video Generation - Pollo.ai
    "video_pollo_t2v": ServiceCost(
        service_type="video",
        provider="pollo",
        model_id="t2v",
        cost_per_unit=0.35,
        unit_type="per_second",
        multiplier=2.0
    ),
    "video_pollo_i2v": ServiceCost(
        service_type="video",
        provider="pollo",
        model_id="i2v",
        cost_per_unit=0.40,
        unit_type="per_second",
        multiplier=2.0
    ),
    
    # Audio Generation - ElevenLabs
    "audio_eleven_turbo": ServiceCost(
        service_type="audio",
        provider="elevenlabs",
        model_id="turbo_v2",
        cost_per_unit=0.0001,
        unit_type="per_character",
        multiplier=2.0
    ),
    "audio_eleven_multilingual": ServiceCost(
        service_type="audio",
        provider="elevenlabs",
        model_id="multilingual_v2",
        cost_per_unit=0.00015,
        unit_type="per_character",
        multiplier=2.0
    ),
    
    # Audio Generation - OpenAI
    "audio_openai_tts1": ServiceCost(
        service_type="audio",
        provider="openai",
        model_id="tts-1",
        cost_per_unit=0.000015,
        unit_type="per_character",
        multiplier=2.0
    ),
    "audio_openai_tts1_hd": ServiceCost(
        service_type="audio",
        provider="openai",
        model_id="tts-1-hd",
        cost_per_unit=0.00003,
        unit_type="per_character",
        multiplier=2.0
    ),
    
    # Chat - Fireworks
    "chat_fireworks_llama": ServiceCost(
        service_type="chat",
        provider="fireworks",
        model_id="llama-3.1-8b",
        cost_per_unit=0.0002,
        unit_type="per_1k_tokens",
        multiplier=2.0
    ),
    
    # Chat - OpenAI
    "chat_openai_gpt4": ServiceCost(
        service_type="chat",
        provider="openai",
        model_id="gpt-4",
        cost_per_unit=0.03,
        unit_type="per_1k_tokens",
        multiplier=2.0
    ),
    
    # Synapse (Agent) - Manus
    "synapse_manus": ServiceCost(
        service_type="synapse",
        provider="manus",
        model_id="agent",
        cost_per_unit=0.02,
        unit_type="per_manus_credit",
        multiplier=2.0
    )
}

DEFAULT_PRICING_PACKAGES = [
    PricingPackage(
        name="Free",
        monthly_credits=100,
        price_usd=0.0,
        features=["100 kredi/ay", "Temel modeller", "Community desteği"]
    ),
    PricingPackage(
        name="Pro", 
        monthly_credits=1000,
        price_usd=9.99,
        features=["1000 kredi/ay", "Tüm modeller", "Öncelikli destek", "HD kalite"]
    ),
    PricingPackage(
        name="Enterprise",
        monthly_credits=5000,
        price_usd=39.99,
        features=["5000 kredi/ay", "Tüm modeller", "7/24 destek", "API erişimi", "Özel entegrasyonlar"]
    )
]

def calculate_credits(service_cost: ServiceCost, units: float = 1.0) -> int:
    """Kredi hesaplama"""
    total_usd = service_cost.cost_per_unit * units * service_cost.multiplier
    return int(total_usd * 100)  # 1 USD = 100 kredi

def get_service_cost(service_type: str, provider: str, model_id: str) -> Optional[ServiceCost]:
    """Servis maliyeti getir"""
    key = f"{service_type}_{provider}_{model_id}"
    return DEFAULT_SERVICE_COSTS.get(key)
