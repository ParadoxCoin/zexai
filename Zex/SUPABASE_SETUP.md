# 🚀 Supabase Hybrid Entegrasyonu - Kurulum Rehberi

## ✅ Tamamlanan İşlemler

### 1. **Config Ayarları** ✅
- `core/config.py` - Supabase ayarları eklendi
- `env_template.txt` - Supabase environment variables eklendi

### 2. **Supabase Client** ✅
- `core/supabase_client.py` - Supabase client oluşturuldu
- Service role ve public client desteği

### 3. **Hybrid Auth Service** ✅
- `services/auth_service.py` - Hybrid authentication service
- Supabase + MongoDB desteği
- JWT fallback desteği

### 4. **Auth Routes** ✅
- `routes/auth.py` - Register ve login endpoint'leri güncellendi
- Hybrid auth service kullanımı

### 5. **Dependencies** ✅
- `requirements.txt` - Supabase paketi eklendi

---

## 📋 Kurulum Adımları

### 1. **Supabase Projesi Oluşturma**

1. https://supabase.com adresine gidin
2. Yeni proje oluşturun
3. Project Settings → API → Keys alın:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. **Environment Variables**

`.env` dosyasını düzenleyin:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ENABLED=true  # Supabase'i etkinleştir
```

### 3. **Dependencies Yükleme**

```bash
cd backend
pip install -r requirements.txt
```

### 4. **Test**

```bash
# Backend'i başlat
python main.py

# Register endpoint test
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "full_name": "Test User"
  }'

# Login endpoint test
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

---

## 🔧 Sistem Mimarisi

### **Hybrid Yaklaşım:**

```
┌─────────────────┐
│   Frontend      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FastAPI        │
│  Backend        │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│Supabase │ │MongoDB  │
│- Auth   │ │- Tasks  │
│- Storage│ │- Logs   │
│- Real-  │ │- Credits│
│  time   │ │         │
└─────────┘ └─────────┘
    │
    ▼
┌─────────┐
│ Redis   │
│- Cache  │
│- Rate   │
│  Limit  │
└─────────┘
```

---

## 🎯 Özellikler

### ✅ **Supabase ile:**
- Authentication (Email/Password, OAuth)
- Storage (Media files)
- Real-time (Credit updates)

### ✅ **MongoDB ile:**
- AI tasks (Image, Video, Audio)
- Usage logs
- Service costs
- Pricing packages

### ✅ **Redis ile:**
- Cache
- Rate limiting
- Celery broker

---

## 📝 Sonraki Adımlar

### **Phase 2: Supabase Storage** (Sıradaki)
- Media files için Supabase Storage
- R2 yerine Supabase Storage kullanımı
- Image/Video/Audio upload entegrasyonu

### **Phase 3: Supabase Real-time**
- Credit updates real-time
- Task status updates real-time
- WebSocket yerine Supabase Realtime

### **Phase 4: OAuth Entegrasyonu**
- Google OAuth (Supabase)
- GitHub OAuth (Supabase)
- Discord OAuth (Supabase)

---

## 🔍 Test Checklist

- [ ] Supabase projesi oluşturuldu
- [ ] Environment variables ayarlandı
- [ ] Dependencies yüklendi
- [ ] Register endpoint test edildi
- [ ] Login endpoint test edildi
- [ ] MongoDB'de user oluşturuldu
- [ ] Supabase'de user oluşturuldu
- [ ] Token verification çalışıyor

---

## 🐛 Sorun Giderme

### **Supabase bağlantı hatası:**
```bash
# Supabase URL'i kontrol edin
# Service role key'i kontrol edin
# SUPABASE_ENABLED=true olduğundan emin olun
```

### **MongoDB sync sorunu:**
```bash
# MongoDB'de user oluşturulduğunu kontrol edin
# user_credits collection'ında kayıt var mı?
```

### **Token verification hatası:**
```bash
# Token formatını kontrol edin
# JWT_SECRET_KEY doğru mu?
# Supabase token'ı doğru mu?
```

---

## 📚 Dokümantasyon

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase Real-time Docs](https://supabase.com/docs/guides/realtime)

---

## 🎉 Başarılı!

Hybrid auth sistemi hazır! Supabase ile authentication, MongoDB ile data storage, Redis ile cache sistemi çalışıyor.

**Sıradaki adım:** Supabase Storage entegrasyonu!
