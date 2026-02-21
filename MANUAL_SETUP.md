# 🚀 AI SaaS Platform - Manuel Kurulum Rehberi

## 📋 Gereksinimler
- Python 3.9+
- Node.js 18+
- MongoDB (Community Server)
- Redis (Windows)

## 🔧 Kurulum Adımları

### 1. MongoDB Kurulumu
1. https://www.mongodb.com/try/download/community adresine gidin
2. Windows için MongoDB Community Server indirin
3. Kurulumu tamamlayın
4. MongoDB'yi başlatın (Windows Services'den)

### 2. Redis Kurulumu
1. https://github.com/microsoftarchive/redis/releases adresine gidin
2. Redis-x64-3.0.504.msi indirin
3. Kurulumu tamamlayın
4. Redis'i başlatın

### 3. Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Environment Setup
```bash
# .env dosyasını oluştur
copy env_template.txt .env
# .env dosyasını düzenle
```

### 5. Database Seeding
```bash
python scripts/seed_database.py
```

### 6. Backend Başlatma
```bash
python main.py
```

### 7. Frontend Başlatma (Yeni Terminal)
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Erişim Adresleri
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 👤 Varsayılan Kullanıcılar
- Admin: admin@ai-saas.com / admin123
- Test: test@ai-saas.com / test123





