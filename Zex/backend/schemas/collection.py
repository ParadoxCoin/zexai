from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class AttributeMap(BaseModel):
    trait_type: str
    value: str
    frequency_percent: Optional[float] = None

class CollectionItemCreate(BaseModel):
    image_url: str
    attributes: List[AttributeMap] = []

class CollectionItemResponse(CollectionItemCreate):
    id: str
    collection_id: str
    item_index: int
    rarity_score: Optional[float] = None
    rarity_tier: Optional[str] = None
    created_at: str

class CollectionCreate(BaseModel):
    name: str
    symbol: str
    description: Optional[str] = ""
    max_supply: int
    mint_price: float = 0.0 # In POL
    royalty_bps: int = 500  # Default 5%
    cover_url: Optional[str] = None
    banner_url: Optional[str] = None

class CollectionPublishRequest(BaseModel):
    contract_address: str

class CollectionResponse(CollectionCreate):
    id: str
    user_id: str
    status: str # "draft", "publishing", "published"
    contract_address: Optional[str] = None
    base_uri: Optional[str] = None
    items_count: int = 0
    created_at: str
    updated_at: str
