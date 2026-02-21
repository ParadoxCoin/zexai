# AI SaaS Platform - Modular Backend

Modern, ölçeklenebilir ve kredi tabanlı AI SaaS platformu. Chat, Görsel, Video ve **Synapse (Otonom Agent)** servisleri içerir.

## 🎯 Özellikler

### Servisler
- **Chat**: AI sohbet tamamlama (Fireworks AI)
- **Image**: AI görsel üretimi (Fal.ai)
- **Video**: AI video üretimi (Pika)
- **Synapse**: Otonom agent görevleri (Manus API)
- **Admin Panel**: Servis maliyetleri ve paket yönetimi

### Kredi Sistemi
- Merkezi kredi bazlı faturalandırma
- Gerçek zamanlı bakiye düşümü
- Admin panelinden dinamik maliyet yönetimi
- Detaylı kullanım logları

### Mimari
- ✅ Modüler router yapısı (`routes/`)
- ✅ API anahtarları `.env` dosyasında
- ✅ Asenkron MongoDB işlemleri
- ✅ JWT tabanlı kimlik doğrulama
- ✅ Pydantic şemaları ile tip güvenliği

## 📦 Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
pip install -r requirements.txt
```

### 2. Ortam Değişkenlerini Ayarlayın

`.env.example` dosyasını `.env` olarak kopyalayın ve değerleri doldurun:

```bash
cp .env.example .env
```

Önemli değişkenler:
- `MONGO_URL`: MongoDB bağlantı URL'si
- `JWT_SECRET_KEY`: JWT için güçlü bir secret key
- `FIREWORKS_API_KEY`, `FAL_API_KEY`, `PIKA_API_KEY`: AI provider API anahtarları
- `MANUS_API_KEY`: Synapse servisi için Manus API anahtarı
- `MANUS_CALLBACK_BASE_URL`: Webhook'lar için backend URL'niz

### 3. MongoDB Koleksiyonlarını Hazırlayın

Gerekli koleksiyonlar:
- `users`: Kullanıcı hesapları
- `user_credits`: Kullanıcı kredi bakiyeleri
- `usage_logs`: Kullanım kayıtları
- `service_costs`: Servis maliyetleri
- `pricing_packages`: Fiyatlandırma paketleri
- `synapse_tasks`: Synapse görevleri
- `synapse_logs`: Synapse görev logları
- `conversations`: Chat geçmişi
- `image_generations`: Görsel üretim kayıtları
- `video_generations`: Video üretim kayıtları

### 4. Varsayılan Servis Maliyetlerini Ekleyin

MongoDB'ye bağlanıp şu kayıtları ekleyin:

```javascript
db.service_costs.insertMany([
  { service_type: "chat", unit: "1000 tokens", cost_per_unit: 1 },
  { service_type: "image", unit: "1 image", cost_per_unit: 5 },
  { service_type: "video", unit: "1 second", cost_per_unit: 10 },
  { service_type: "synapse", unit: "1 Manus credit", cost_per_unit: 2 }
]);
```

### 5. Fiyatlandırma Paketlerini Ekleyin

```javascript
db.pricing_packages.insertMany([
  { name: "Starter", usd_price: 10, credit_amount: 1100, discount_percent: 10, active: true },
  { name: "Pro", usd_price: 25, credit_amount: 2800, discount_percent: 12, active: true },
  { name: "Enterprise", usd_price: 100, credit_amount: 12000, discount_percent: 20, active: true }
]);
```

## 🚀 Çalıştırma

```bash
python main.py
```

veya

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API Dokümantasyonu: `http://localhost:8000/docs`

## 📡 API Endpoint'leri

### Authentication (`/api/v1/auth`)
- `POST /auth/register`: Yeni kullanıcı kaydı
- `POST /auth/login`: Kullanıcı girişi

### Chat (`/api/v1/chat`)
- `POST /chat`: AI sohbet tamamlama

### Image (`/api/v1/image`)
- `POST /image/generate`: Görsel üretimi

### Video (`/api/v1/video`)
- `POST /video/generate`: Video üretimi

### Synapse (`/api/v1/synapse`)
- `POST /synapse/tasks`: Yeni agent görevi başlat
- `GET /synapse/tasks/{task_id}`: Görev durumunu sorgula
- `GET /synapse/tasks/{task_id}/logs`: Görev loglarını getir (Agent Etkileşim Ekranı için)
- `POST /synapse/webhook`: Manus API webhook'u (internal)

### Admin (`/api/v1/admin`)
- `GET /admin/service-costs`: Servis maliyetlerini listele
- `POST /admin/service-costs`: Servis maliyetini güncelle
- `GET /admin/pricing-packages`: Paketleri listele
- `POST /admin/pricing-packages`: Yeni paket oluştur
- `GET /admin/stats`: Platform istatistikleri
- `GET /admin/users/{user_id}/stats`: Kullanıcı istatistikleri

## 💳 Kredi Sistemi Nasıl Çalışır?

### 1. Temel Oran
- `1 USD = 100 Kredi` (varsayılan)

### 2. Servis Maliyetleri
| Servis | Birim | Maliyet (kredi) |
|--------|-------|-----------------|
| Chat | 1.000 token | 1 |
| Görsel | 1 resim | 5 |
| Video | 1 saniye | 10 |
| Synapse | 1 Manus kredisi | 2 |

### 3. İş Akışı
1. Kullanıcı API çağrısı yapar
2. Sistem, servis maliyetini `service_costs` tablosundan çeker
3. Kullanıcının bakiyesi kontrol edilir
4. Yeterliyse, harici API çağrısı yapılır
5. Başarılı olursa, kredi düşülür ve `usage_logs`'a kaydedilir

### 4. Synapse (Agent) Özel Durumu
- Görev başlatılırken minimum bakiye kontrolü yapılır
- Görev **asenkron** olarak arka planda çalışır
- Manus API, görev tamamlandığında webhook ile bildirir
- Webhook'ta gelen `credits_consumed` değeri, `* 2` ile app kredisine çevrilir
- Kullanıcının bakiyesinden düşülür

## 🔧 Mevcut Projeye Entegrasyon

Bu modüler yapıyı mevcut `Ai-sass-emerge` projenize entegre etmek için:

1. **Yedek Alın**: Mevcut `server.py` dosyanızı yedekleyin
2. **Klasörleri Kopyalayın**: `routes/`, `core/`, `schemas/` klasörlerini projenize ekleyin
3. **main.py'ı Kullanın**: Mevcut `server.py` yerine `main.py`'ı kullanın
4. **Bağımlılıkları Güncelleyin**: `requirements.txt`'i birleştirin
5. **Ortam Değişkenlerini Taşıyın**: Mevcut `.env` dosyanıza yeni değişkenleri ekleyin
6. **Veritabanını Hazırlayın**: Yeni koleksiyonları ve kayıtları ekleyin

## 🎨 Frontend Entegrasyonu

### Synapse (Agent) UI Örneği

**Görev Başlatma:**
```javascript
const response = await fetch('/api/v1/synapse/tasks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    objective: "3 sayfalık bir portfolyo sitesi oluştur",
    context: { /* kullanıcı bilgileri */ },
    max_credits: 150
  })
});

const { task_id } = await response.json();
```

**Durum Takibi (Polling):**
```javascript
const checkStatus = async () => {
  const response = await fetch(`/api/v1/synapse/tasks/${task_id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const status = await response.json();
  
  if (status.status === 'completed') {
    // Görev tamamlandı, sonucu göster
    window.location.href = status.result_url;
  } else if (status.status === 'running') {
    // Mevcut adımı göster
    console.log(status.current_step);
    setTimeout(checkStatus, 3000); // 3 saniyede bir kontrol et
  }
};
```

**Log Ekranı:**
```javascript
const logs = await fetch(`/api/v1/synapse/tasks/${task_id}/logs`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { logs: logEntries } = await logs.json();

logEntries.forEach(log => {
  console.log(`[${log.log_type}] ${log.log_message}`);
});
```

## 📊 Manus Kredi Hesaplama

**Manus API'den gelen yanıt:**
```json
{
  "task_id": "abc123",
  "status": "completed",
  "usage": {
    "credits_consumed": 125
  }
}
```

**Sizin sisteminizde hesaplama:**
```
Manus Kredisi: 125
Dönüşüm Oranı: 2 (service_costs tablosundan)
Kullanıcıdan Düşülecek: 125 * 2 = 250 App Kredisi
```

## 🛡️ Güvenlik

- ✅ Tüm endpoint'ler JWT ile korunmuştur
- ✅ Admin endpoint'leri role kontrolü yapar
- ✅ API anahtarları asla kodda değil, `.env` dosyasında
- ✅ Kredi düşümü atomic işlemlerle yapılır (race condition koruması)

## 📝 Lisans

Bu proje, `Ai-sass-emerge` projesinin bir parçasıdır.

---

**Geliştirici:** AI SaaS Platform Team  
**Versiyon:** 2.0.0  
**Son Güncelleme:** 2025

