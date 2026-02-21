# 🚀 Supabase Hybrid Entegrasyon Rehberi

## 📋 Adım Adım Implementasyon

### 1. **Supabase Projesi Oluşturma**

1. https://supabase.com adresine gidin
2. Yeni proje oluşturun
3. Project Settings'den API keys alın:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. **Python Dependencies**

```bash
pip install supabase
```

### 3. **Config Güncellemesi**

```python
# core/config.py
SUPABASE_URL: str = ""
SUPABASE_ANON_KEY: str = ""
SUPABASE_SERVICE_ROLE_KEY: str = ""
```

### 4. **Supabase Client**

```python
# core/supabase_client.py
from supabase import create_client
from core.config import settings

supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)

# Public client (frontend için)
supabase_public = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_ANON_KEY
)
```

---

## 🔐 Authentication Entegrasyonu

### **Mevcut Auth Sistemi + Supabase**

```python
# routes/auth_supabase.py
from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client
from core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Supabase client
supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)

@router.post("/register")
async def register_user(user_data: UserCreate):
    """Supabase ile kullanıcı kaydı"""
    try:
        # Supabase Auth'da kullanıcı oluştur
        response = supabase.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True
        })
        
        user = response.user
        
        # MongoDB'ye kullanıcı bilgilerini kaydet
        await db.users.insert_one({
            "id": user.id,
            "email": user.email,
            "full_name": user_data.full_name,
            "role": "user",
            "package": "free",
            "created_at": datetime.utcnow(),
            "is_active": True
        })
        
        # Kredi bakiyesi oluştur
        await db.user_credits.insert_one({
            "user_id": user.id,
            "credits_balance": 0.0,
            "created_at": datetime.utcnow()
        })
        
        return {"message": "User registered successfully", "user_id": user.id}
        
    except Exception as e:
        raise HTTPException(400, str(e))

@router.post("/login")
async def login_user(credentials: UserLogin):
    """Supabase ile giriş"""
    try:
        # Supabase Auth ile giriş
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        # Session token'ı döndür
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
            "user": response.user
        }
        
    except Exception as e:
        raise HTTPException(401, "Invalid credentials")

@router.post("/logout")
async def logout_user(token: str = Depends(get_current_user)):
    """Supabase ile çıkış"""
    supabase.auth.sign_out()
    return {"message": "Logged out successfully"}
```

### **OAuth Entegrasyonu**

```python
@router.get("/google")
async def google_login():
    """Google OAuth ile giriş"""
    # Supabase OAuth URL'ini döndür
    url = supabase.auth.get_authorization_url({
        "provider": "google",
        "redirect_to": f"{settings.FRONTEND_URL}/auth/callback"
    })
    return {"url": url}

@router.get("/google/callback")
async def google_callback(code: str):
    """Google OAuth callback"""
    # Supabase OAuth callback
    response = supabase.auth.exchange_code_for_session(code)
    
    user = response.user
    
    # MongoDB'ye kullanıcı kaydet (yoksa)
    existing_user = await db.users.find_one({"id": user.id})
    if not existing_user:
        await db.users.insert_one({
            "id": user.id,
            "email": user.email,
            "full_name": user.user_metadata.get("full_name", ""),
            "role": "user",
            "package": "free",
            "created_at": datetime.utcnow(),
            "is_active": True
        })
        
        await db.user_credits.insert_one({
            "user_id": user.id,
            "credits_balance": 0.0,
            "created_at": datetime.utcnow()
        })
    
    return {
        "access_token": response.session.access_token,
        "token_type": "bearer",
        "user": user
    }
```

---

## 💾 Storage Entegrasyonu

### **Media Files için Supabase Storage**

```python
# services/storage_service_supabase.py
from supabase import create_client
from core.config import settings

class SupabaseStorageService:
    def __init__(self):
        self.supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        self.bucket = "media"
    
    async def upload_file(self, file_data: bytes, object_name: str, content_type: str) -> str:
        """Supabase Storage'a dosya yükle"""
        try:
            # Dosyayı yükle
            response = self.supabase.storage.from_(self.bucket).upload(
                object_name,
                file_data,
                file_options={"content-type": content_type}
            )
            
            # Public URL al
            public_url = self.supabase.storage.from_(self.bucket).get_public_url(object_name)
            
            return public_url
            
        except Exception as e:
            raise Exception(f"Upload failed: {str(e)}")
    
    async def delete_file(self, object_name: str) -> bool:
        """Supabase Storage'dan dosya sil"""
        try:
            self.supabase.storage.from_(self.bucket).remove([object_name])
            return True
        except Exception as e:
            raise Exception(f"Delete failed: {str(e)}")
    
    async def get_file_url(self, object_name: str) -> str:
        """Dosya URL'sini al"""
        return self.supabase.storage.from_(self.bucket).get_public_url(object_name)

# Global instance
supabase_storage = SupabaseStorageService()
```

### **Image Service Güncellemesi**

```python
# services/image_service.py
from services.storage_service_supabase import supabase_storage

class ImageService:
    async def _handle_api_call_and_r2_upload(self, task_id: str, user_id: str, prompt: str, model: Dict, total_credits: float, db):
        """Supabase Storage kullan"""
        # ... API call ...
        
        for i, image_data in enumerate(generated_images_data):
            # Supabase Storage'a yükle
            object_name = f"images/{user_id}/{task_id}_{i}.png"
            image_url = await supabase_storage.upload_file(
                image_data, 
                object_name, 
                "image/png"
            )
            
            # ... rest of the code ...
```

---

## 🔔 Real-time Entegrasyonu

### **Credit Updates için Real-time**

```python
# core/realtime_service.py
from supabase import create_client
from core.config import settings

class RealtimeService:
    def __init__(self):
        self.supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )
    
    async def subscribe_credit_updates(self, user_id: str, callback):
        """Kredi güncellemelerini dinle"""
        channel = self.supabase.channel(f"credits:{user_id}")
        
        channel.on(
            "postgres_changes",
            event="UPDATE",
            schema="public",
            table="user_credits",
            filter=f"user_id=eq.{user_id}",
            callback=callback
        ).subscribe()
        
        return channel

# Frontend'de kullanım
# const channel = supabase
#   .channel('credits:user123')
#   .on('postgres_changes', {
#     event: 'UPDATE',
#     schema: 'public',
#     table: 'user_credits',
#     filter: 'user_id=eq.user123'
#   }, (payload) => {
#     console.log('Credit updated:', payload.new)
#   })
#   .subscribe()
```

### **WebSocket Yerine Supabase Realtime**

```python
# Mevcut WebSocket yerine
# core/websocket.py → core/realtime_service.py

# Backend'de credit update
async def update_user_credits(db, user_id: str, amount: float):
    """Kredi güncelle ve real-time bildir"""
    # MongoDB'de güncelle
    await db.user_credits.update_one(
        {"user_id": user_id},
        {"$inc": {"credits_balance": amount}}
    )
    
    # Supabase'de de güncelle (real-time için)
    supabase.table("user_credits").update({
        "credits_balance": new_balance
    }).eq("user_id", user_id).execute()
    
    # Real-time otomatik bildirir
```

---

## 🗄️ Database Yapısı

### **Supabase Tables (PostgreSQL)**

```sql
-- Users table (Supabase Auth ile sync)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    package TEXT DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- User Credits (Real-time için)
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    credits_balance DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
    ON user_credits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
    ON user_credits FOR UPDATE
    USING (auth.uid() = user_id);
```

### **MongoDB Collections (Korunacak)**

```javascript
// AI tasks için MongoDB
image_tasks
video_tasks
audio_tasks
synapse_tasks
usage_logs
media_outputs
service_costs
pricing_packages
```

---

## 🔄 Migration Stratejisi

### **1. Adım: Supabase Auth Entegrasyonu**
- Mevcut auth sistemini Supabase'e taşı
- OAuth için Supabase kullan
- JWT yerine Supabase session kullan

### **2. Adım: Storage Entegrasyonu**
- R2 yerine Supabase Storage kullan
- Mevcut dosyaları migrate et
- Yeni dosyalar için Supabase kullan

### **3. Adım: Real-time Entegrasyonu**
- WebSocket yerine Supabase Realtime
- Credit updates için real-time
- Task updates için real-time

### **4. Adım: MongoDB Koruma**
- AI tasks için MongoDB koru
- Logs için MongoDB koru
- Service costs için MongoDB koru

---

## 📊 Hybrid Mimari

```
Frontend
    ↓
Supabase Auth (Login, Register, OAuth)
    ↓
FastAPI Backend (Business Logic)
    ↓
    ├── Supabase (Auth, Storage, Real-time)
    ├── MongoDB (AI tasks, logs)
    ├── Redis (Cache, Rate limiting)
    └── Celery (Background jobs)
```

---

## 💰 Maliyet Karşılaştırması

### **Mevcut Sistem (Self-hosted)**
- MongoDB: $0 (self-hosted)
- Redis: $0 (self-hosted)
- R2: $0.015/GB
- **Toplam**: ~$10-20/ay

### **Supabase Hybrid**
- Supabase Pro: $25/ay (8GB DB, 100GB storage)
- MongoDB: $0 (self-hosted)
- Redis: $0 (self-hosted)
- **Toplam**: ~$25-30/ay

### **Tam Supabase**
- Supabase Pro: $25/ay
- Supabase Growth: $125/ay (daha fazla kullanım)
- **Toplam**: $25-125/ay

---

## 🎯 Sonuç ve Öneriler

### ✅ **Hybrid Yaklaşım Önerilir:**
1. **Supabase Auth** - Hazır, güvenli
2. **Supabase Storage** - Kolay, CDN hazır
3. **Supabase Real-time** - Otomatik, kolay
4. **MongoDB** - AI tasks, logs için
5. **Redis** - Cache, rate limiting için
6. **Celery** - Background jobs için

### ❌ **Tam Supabase Geçişi Önerilmez:**
1. Vendor lock-in riski
2. Migration zorluğu
3. Celery workers hala gerekli
4. Redis hala gerekli
5. MongoDB avantajları kaybolur

### 🚀 **Implementasyon Önceliği:**
1. **Phase 1**: Supabase Auth (1-2 gün)
2. **Phase 2**: Supabase Storage (2-3 gün)
3. **Phase 3**: Supabase Real-time (1-2 gün)
4. **Phase 4**: Test & Optimize (2-3 gün)

**Toplam**: ~1-2 hafta
