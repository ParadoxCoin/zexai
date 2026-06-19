# 🚀 AI SaaS Platform - Kurulum Rehberi

## 📋 Gereksinimler

- **Docker Desktop** (Önerilen)
- **Python 3.9+**
- **Node.js 18+**
- **Git**

## 🔧 Hızlı Kurulum (Docker ile)

### 1. **Docker Desktop Kurulumu**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) indirin ve kurun
- Docker Desktop'ı başlatın

### 2. **Veritabanları Başlatma**
```bash
# Proje dizininde
cd ai-saas-production
docker-compose up -d
```

Bu komut şunları başlatır:
- **MongoDB** (Port: 27017)
- **Redis** (Port: 6379)
- **Mongo Express** (Web UI - Port: 8082)
- **Redis Commander** (Web UI - Port: 8081)

### 3. **Environment Dosyası**
```bash
# Backend dizininde
cd backend
copy env_template.txt .env
# .env dosyasını düzenleyin
```

### 4. **Python Dependencies**
```bash
# Backend
cd backend
pip install -r requirements.txt
```

### 5. **Database Seeding**
```bash
# Varsayılan verileri yükle
python scripts/seed_database.py
```

### 6. **Backend Başlatma**
```bash
# Backend
cd backend
python main.py
```

### 7. **Frontend Başlatma**
```bash
# Frontend (yeni terminal)
cd backend/frontend
npm install
npm run dev
```

## 🌐 Erişim Adresleri

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Mongo Express**: http://localhost:8082
- **Redis Commander**: http://localhost:8081

## 👤 Varsayılan Kullanıcılar

### Admin Kullanıcı
- **Email**: admin@ai-saas.com
- **Password**: admin123
- **Rol**: Admin
- **Kredi**: 10,000

### Test Kullanıcı
- **Email**: test@ai-saas.com
- **Password**: test123
- **Rol**: User
- **Kredi**: 1,000

## 🔧 Alternatif Kurulum (Manuel)

### MongoDB Kurulumu
```bash
# Windows için MongoDB Community Server
# https://www.mongodb.com/try/download/community
# Kurulum sonrası MongoDB'yi başlatın
```

### Redis Kurulumu
```bash
# Windows için Redis
# https://github.com/microsoftarchive/redis/releases
# veya Chocolatey ile:
choco install redis-64
```

## 🐛 Sorun Giderme

### Docker Sorunları
```bash
# Container'ları yeniden başlat
docker-compose down
docker-compose up -d

# Logları kontrol et
docker-compose logs mongodb
docker-compose logs redis
```

### Database Bağlantı Sorunları
```bash
# MongoDB bağlantısını test et
mongosh mongodb://localhost:27017/ai_saas

# Redis bağlantısını test et
redis-cli ping
```

### Port Çakışması
Eğer portlar kullanımdaysa, `docker-compose.yml` dosyasındaki port numaralarını değiştirin.

## 📊 Veritabanı Yönetimi

### MongoDB
- **Web UI**: http://localhost:8082
- **Username**: admin
- **Password**: password123

### Redis
- **Web UI**: http://localhost:8081
- **Host**: localhost:6379

## 🚀 Production Kurulumu

Production için:
1. `.env` dosyasındaki değerleri production'a uygun değiştirin
2. MongoDB ve Redis'i production sunucularına taşıyın
3. HTTPS sertifikası ekleyin
4. Domain adreslerini güncelleyin

## 📞 Destek

Sorun yaşarsanız:
1. Logları kontrol edin
2. Port çakışması olup olmadığını kontrol edin
3. Docker Desktop'ın çalıştığından emin olun
4. Firewall ayarlarını kontrol edin

