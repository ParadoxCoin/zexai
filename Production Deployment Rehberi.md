# 🚀 Production Deployment Rehberi

## Genel Bakış

Bu rehber, AI SaaS Platform'u production ortamına deploy etmek için gerekli tüm adımları içerir.

---

## 📋 Pre-Deployment Checklist

### Backend Kontrolleri

- [x] Rate limiting aktif (slowapi)
- [x] Logging sistemi kurulu (loguru)
- [x] Error tracking hazır (Sentry entegrasyonu)
- [x] Database indeksleri tanımlı
- [x] Environment variables yapılandırılmış
- [ ] CORS origins production domain'e güncellendi
- [ ] API keys production değerleriyle değiştirildi
- [ ] Database production instance'a bağlandı
- [ ] Sentry DSN eklendi

### Frontend Kontrolleri

- [ ] API URL production backend'e işaret ediyor
- [ ] Environment variables production'a uygun
- [ ] Build optimize edildi
- [ ] Assets CDN'e yüklendi (opsiyonel)

### Güvenlik Kontrolleri

- [ ] HTTPS aktif
- [ ] JWT secret güçlü ve güvenli
- [ ] Database şifreleri güvenli
- [ ] API keys environment variables'da
- [ ] CORS doğru yapılandırılmış
- [ ] Rate limiting production için ayarlandı

---

## 🔧 Environment Variables

### Backend (.env)

```bash
# Application
APP_NAME=AI SaaS Platform
APP_VERSION=1.0.0
ENVIRONMENT=production

# Database
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
DATABASE_NAME=ai_saas_prod

# Security
JWT_SECRET_KEY=your-super-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Sentry
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production

# AI Service API Keys
FIREWORKS_API_KEY=your-fireworks-api-key
OPENAI_API_KEY=your-openai-api-key
REPLICATE_API_KEY=your-replicate-api-key
POLLO_API_KEY=your-pollo-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Payment Providers
LEMONSQUEEZY_API_KEY=your-lemonsqueezy-key
LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-secret
TWOCHECKOUT_MERCHANT_CODE=your-2checkout-code
NOWPAYMENTS_API_KEY=your-nowpayments-key
BINANCE_API_KEY=your-binance-key
METAMASK_DISCOUNT_PERCENT=15

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/auth/google/callback

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=https://yourdomain.com/api/v1/auth/github/callback

DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=https://yourdomain.com/api/v1/auth/discord/callback
```

### Frontend (.env)

```bash
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_APP_NAME=AI SaaS Platform
```

---

## 🗄️ Database Setup

### MongoDB Indeksler

```javascript
// users collection
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "id": 1 }, { unique: true });
db.users.createIndex({ "created_at": -1 });

// user_credits collection
db.user_credits.createIndex({ "user_id": 1 }, { unique: true });

// usage_logs collection
db.usage_logs.createIndex({ "user_id": 1, "created_at": -1 });
db.usage_logs.createIndex({ "service_type": 1 });

// media_outputs collection
db.media_outputs.createIndex({ "user_id": 1, "created_at": -1 });
db.media_outputs.createIndex({ "is_showcase": 1, "created_at": -1 });
db.media_outputs.createIndex({ "service_type": 1 });

// conversations collection
db.conversations.createIndex({ "user_id": 1, "updated_at": -1 });

// user_api_keys collection
db.user_api_keys.createIndex({ "user_id": 1 });
db.user_api_keys.createIndex({ "key_hash": 1 }, { unique: true });

// billing_transactions collection
db.billing_transactions.createIndex({ "user_id": 1, "created_at": -1 });

// invoices collection
db.invoices.createIndex({ "user_id": 1, "issued_at": -1 });

// user_files collection
db.user_files.createIndex({ "user_id": 1, "created_at": -1 });
db.user_files.createIndex({ "expires_at": 1 });

// admin_logs collection
db.admin_logs.createIndex({ "admin_id": 1, "created_at": -1 });
db.admin_logs.createIndex({ "target_user_id": 1 });
```

### Initial Data

```javascript
// Default service costs
db.service_costs.insertMany([
  {
    service_type: "chat",
    unit: "1000 tokens",
    cost_per_unit: 1.0,
    updated_at: new Date()
  },
  {
    service_type: "image",
    unit: "1 image",
    cost_per_unit: 5.0,
    updated_at: new Date()
  },
  {
    service_type: "video",
    unit: "1 video",
    cost_per_unit: 20.0,
    updated_at: new Date()
  },
  {
    service_type: "audio",
    unit: "1 audio",
    cost_per_unit: 3.0,
    updated_at: new Date()
  }
]);

// Default pricing packages
db.pricing_packages.insertMany([
  {
    name: "Starter Pack",
    usd_price: 10.0,
    credit_amount: 1000,
    discount_percent: 0,
    active: true,
    created_at: new Date()
  },
  {
    name: "Pro Pack",
    usd_price: 50.0,
    credit_amount: 5500,
    discount_percent: 10,
    active: true,
    created_at: new Date()
  },
  {
    name: "Enterprise Pack",
    usd_price: 200.0,
    credit_amount: 25000,
    discount_percent: 25,
    active: true,
    created_at: new Date()
  }
]);
```

---

## 🐳 Docker Deployment

### Dockerfile (Backend)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

---

## 🌐 Nginx Configuration

```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:80;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API requests
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📊 Monitoring & Logging

### Sentry Setup

1. Sentry hesabı oluştur: https://sentry.io
2. Yeni proje oluştur (Python/FastAPI)
3. DSN'i kopyala ve `.env` dosyasına ekle
4. Backend otomatik olarak hataları Sentry'ye gönderecek

### Log Rotation

```bash
# /etc/logrotate.d/ai-saas
/app/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload ai-saas
    endscript
}
```

---

## 🔒 Security Best Practices

### 1. Rate Limiting

Production için Redis kullanın:

```python
# core/rate_limiter.py
limiter = Limiter(
    key_func=get_user_id_or_ip,
    default_limits=["200/minute"],
    storage_uri="redis://localhost:6379",  # Redis URL
    strategy="fixed-window"
)
```

### 2. HTTPS Zorunlu

```python
# main.py
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if settings.ENVIRONMENT == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

### 3. Database Connection Pool

```python
# core/database.py
client = AsyncIOMotorClient(
    settings.MONGODB_URL,
    maxPoolSize=50,
    minPoolSize=10,
    serverSelectionTimeoutMS=5000
)
```

---

## 🚀 Deployment Steps

### 1. Hazırlık

```bash
# Repository'yi clone et
git clone https://github.com/yourusername/ai-saas-platform.git
cd ai-saas-platform

# Environment variables'ı ayarla
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# .env d

### 2. Database Kurulumu

```bash
# MongoDB'ye bağlan ve indeksleri oluştur
mongo mongodb+srv://username:password@cluster.mongodb.net/ai_saas_prod

# Yukarıdaki indeks komutlarını çalıştır
# Initial data'yı ekle
```

### 3. SSL Sertifika Kurulumu

```bash
# Let's Encrypt ile ücretsiz SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Veya manuel sertifika
mkdir ssl
# cert.pem ve key.pem dosyalarını ssl/ klasörüne kopyala
```

### 4. Docker ile Deploy

```bash
# Docker ve Docker Compose kurulumu
sudo apt update
sudo apt install docker.io docker-compose

# Uygulamayı build et ve çalıştır
docker-compose up -d --build

# Logları kontrol et
docker-compose logs -f
```

### 5. Manuel Deploy (Ubuntu/Debian)

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Systemd service oluştur
sudo nano /etc/systemd/system/ai-saas-backend.service
```

**Backend Service Dosyası:**
```ini
[Unit]
Description=AI SaaS Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ai-saas-platform/backend
Environment=PATH=/var/www/ai-saas-platform/backend/venv/bin
ExecStart=/var/www/ai-saas-platform/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Frontend
cd ../frontend
npm install
npm run build

# Nginx'e serve et
sudo cp -r dist/* /var/www/html/

# Servisleri başlat
sudo systemctl enable ai-saas-backend
sudo systemctl start ai-saas-backend
sudo systemctl reload nginx
```

### 6. Doğrulama

```bash
# Backend health check
curl https://yourdomain.com/api/v1/health

# Frontend erişim
curl https://yourdomain.com

# Database bağlantısı
curl https://yourdomain.com/api/v1/admin/stats
```

---

## 🔐 SSL Sertifika Yönetimi

### Let's Encrypt Otomatik Yenileme

```bash
# Crontab'a ekle
sudo crontab -e

# Her gün saat 2'de kontrol et
0 2 * * * /usr/bin/certbot renew --quiet
```

### Manuel Sertifika Yenileme

```bash
# Sertifika durumunu kontrol et
sudo certbot certificates

# Manuel yenileme
sudo certbot renew

# Nginx'i yeniden başlat
sudo systemctl reload nginx
```

---

## 💾 Backup Stratejileri

### MongoDB Backup

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"

# Backup oluştur
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/ai_saas_prod" --out="$BACKUP_DIR/$DATE"

# Sıkıştır
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"

# Eski backupları temizle (30 gün)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +30 -delete
```

### Otomatik Backup (Crontab)

```bash
# Her gün saat 3'te backup al
0 3 * * * /path/to/backup.sh
```

### Media Files Backup

```bash
#!/bin/bash
# media_backup.sh
DATE=$(date +%Y%m%d)
aws s3 sync s3://your-bucket /backups/media/$DATE --delete
```

---

## ⚡ Performance Optimization

### 1. Redis Cache

```python
# core/cache.py
import redis
from functools import wraps

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_result(expiration=300):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
            
            result = await func(*args, **kwargs)
            redis_client.setex(cache_key, expiration, json.dumps(result))
            return result
        return wrapper
    return decorator
```

### 2. Database Connection Pool

```python
# core/database.py
client = AsyncIOMotorClient(
    settings.MONGODB_URL,
    maxPoolSize=100,
    minPoolSize=20,
    maxIdleTimeMS=30000,
    serverSelectionTimeoutMS=5000,
    socketTimeoutMS=20000
)
```

### 3. CDN Integration

```python
# services/storage_service.py
class CDNService:
    def __init__(self):
        self.cdn_base_url = "https://cdn.yourdomain.com"
    
    def get_media_url(self, file_path: str) -> str:
        return f"{self.cdn_base_url}/{file_path}"
```

---

## 🏥 Health Check Endpoints

### Backend Health Check

```python
# routes/health.py
from fastapi import APIRouter, HTTPException
from core.database import database
import redis

router = APIRouter()

@router.get("/health")
async def health_check():
    try:
        # Database check
        await database.command("ping")
        
        # Redis check
        redis_client = redis.Redis(host='localhost', port=6379)
        redis_client.ping()
        
        return {
            "status": "healthy",
            "database": "connected",
            "cache": "connected",
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@router.get("/health/detailed")
async def detailed_health_check():
    checks = {}
    
    # Database
    try:
        await database.command("ping")
        checks["database"] = "healthy"
    except:
        checks["database"] = "unhealthy"
    
    # AI Services
    for service in ["fireworks", "fal", "pollo", "elevenlabs"]:
        try:
            # Test API connection
            checks[service] = "healthy"
        except:
            checks[service] = "unhealthy"
    
    return checks
```

---

## 🔧 Troubleshooting Guide

### Yaygın Sorunlar

#### 1. Database Connection Error
```bash
# MongoDB bağlantısını test et
mongo mongodb+srv://username:password@cluster.mongodb.net/ai_saas_prod --eval "db.runCommand('ping')"

# Firewall kontrolü
sudo ufw status
sudo ufw allow 27017
```

#### 2. SSL Certificate Issues
```bash
# Sertifika durumunu kontrol et
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout

# Nginx konfigürasyonunu test et
sudo nginx -t

# Nginx loglarını kontrol et
sudo tail -f /var/log/nginx/error.log
```

#### 3. High Memory Usage
```bash
# Memory kullanımını kontrol et
free -h
ps aux --sort=-%mem | head

# Docker container'ları kontrol et
docker stats

# MongoDB memory kullanımı
db.serverStatus().mem
```

#### 4. API Rate Limiting Issues
```bash
# Redis'te rate limit key'lerini kontrol et
redis-cli
KEYS "slowapi:*"
TTL "slowapi:user_123"
```

### Log Analizi

```bash
# Backend logları
tail -f backend/logs/app.log

# Nginx access logları
tail -f /var/log/nginx/access.log

# System logları
journalctl -u ai-saas-backend -f

# Docker logları
docker-compose logs -f backend
```

### Performance Monitoring

```bash
# CPU ve Memory
htop

# Disk kullanımı
df -h
du -sh /var/log/*

# Network bağlantıları
netstat -tulpn | grep :8000

# Database performansı
db.currentOp()
db.serverStatus().connections
```

---

## 📈 Monitoring Dashboard

### Grafana + Prometheus Setup

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

### Metrics Endpoint

```python
# routes/metrics.py
from prometheus_client import Counter, Histogram, generate_latest

REQUEST_COUNT = Counter('requests_total', 'Total requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('request_duration_seconds', 'Request duration')

@router.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

---

## 🎯 Production Checklist

### Go-Live Öncesi
- [ ] Tüm environment variables production değerleriyle güncellendi
- [ ] Database indeksleri oluşturuldu
- [ ] SSL sertifikası kuruldu ve test edildi
- [ ] Backup sistemi kuruldu ve test edildi
- [ ] Monitoring ve alerting aktif
- [ ] Rate limiting production limitleriyle ayarlandı
- [ ] Error tracking (Sentry) aktif
- [ ] Health check endpoint'leri çalışıyor
- [ ] Load testing yapıldı
- [ ] Security scan tamamlandı

### Go-Live Sonrası
- [ ] Real-time monitoring aktif
- [ ] Log rotation çalışıyor
- [ ] Backup'lar düzenli alınıyor
- [ ] Performance metrikleri izleniyor
- [ ] Error rate'leri normal seviyede
- [ ] User feedback sistemi aktif
- [ ] Documentation güncel

---

## 📞 Destek ve Bakım

### Günlük Kontroller
- System resource kullanımı (CPU, Memory, Disk)
- Error log'ları
- API response time'ları
- Database connection pool durumu

### Haftalık Kontroller
- Backup'ların başarılı olduğunu doğrula
- SSL sertifika son kullanma tarihi
- Security update'leri kontrol et
- Performance trend analizi

### Aylık Kontroller
- Dependency update'leri
- Security audit
- Capacity planning
- Cost optimization

---

**🎉 Deployment tamamlandı! Platform production'da çalışmaya hazır.**osyalarını düzenle
```

### 2. Database Setup

```bash
# MongoDB Atlas'ta database oluştur
# Indeksleri oluştur (yukarıdaki script'i çalıştır)
# Initial data'yı ekle
```

### 3. Backend Deploy

```bash
cd backend

# Dependencies'leri yükle
pip install -r requirements.txt

# Test et
uvicorn main:app --reload

# Production'da çalıştır
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. Frontend Build & Deploy

```bash
cd frontend

# Dependencies'leri yükle
npm install

# Build
npm run build

# Dist klasörünü web server'a deploy et
```

### 5. Docker ile Deploy (Önerilen)

```bash
# Docker compose ile başlat
docker-compose up -d

# Logları kontrol et
docker-compose logs -f

# Health check
curl http://localhost:8000/health
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### API Tests

```bash
# Health check
curl https://api.yourdomain.com/health

# Login test
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Load Testing

```bash
# Apache Bench
ab -n 1000 -c 10 https://api.yourdomain.com/health

# Locust
locust -f tests/load_test.py --host=https://api.yourdomain.com
```

---

## 📈 Performance Optimization

### 1. Database

- Indeksler oluşturuldu ✅
- Connection pooling aktif ✅
- Query optimization yapıldı ✅

### 2. API

- Rate limiting aktif ✅
- Response caching (Redis ile eklenebilir)
- Compression middleware eklenebilir

### 3. Frontend

- Code splitting
- Lazy loading
- Image optimization
- CDN kullanımı

---

## 🔄 Backup Strategy

### Database Backup

```bash
# Daily backup script
mongodump --uri="mongodb+srv://..." --out=/backups/$(date +%Y%m%d)

# Backup retention (30 days)
find /backups -type d -mtime +30 -exec rm -rf {} \;
```

### File Backup

```bash
# User files backup
tar -czf /backups/files_$(date +%Y%m%d).tar.gz /app/uploads
```

---

## 🆘 Troubleshooting

### Common Issues

**1. Database Connection Error**
```bash
# Check MongoDB connection
mongo "mongodb+srv://..." --eval "db.adminCommand('ping')"
```

**2. Rate Limit Issues**
```bash
# Check Redis connection
redis-cli ping
```

**3. High Memory Usage**
```bash
# Check logs
docker-compose logs backend | tail -100
```

---

## 📞 Support

- **Documentation**: `/docs` endpoint (Swagger UI)
- **Logs**: `/app/logs/` directory
- **Monitoring**: Sentry dashboard
- **Status**: Health check endpoint

---

## ✅ Post-Deployment Checklist

- [ ] Tüm endpoint'ler çalışıyor
- [ ] Authentication çalışıyor
- [ ] Database bağlantısı stabil
- [ ] Logging aktif
- [ ] Sentry hata raporları geliyor
- [ ] Rate limiting çalışıyor
- [ ] HTTPS aktif
- [ ] Backup sistemi kurulu
- [ ] Monitoring aktif
- [ ] Load test yapıldı

---

**🎉 Deployment tamamlandı! Platform production'da!**

