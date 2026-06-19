# 🚀 AI SaaS Platform

Production-ready AI SaaS platformu - Chat, Image, Video ve Audio üretimi için kredi tabanlı sistem.

## ✨ Özellikler

### 🎯 Core Features
- ✅ **Multi-modal AI Services**: Chat, Image, Video, Audio generation
- ✅ **Credit-based Billing**: Esnek kredi sistemi
- ✅ **User Management**: Profil, API keys, transaction history
- ✅ **Media Library**: 2 aylık medya saklama, showcase
- ✅ **Admin Panel**: Kullanıcı yönetimi, istatistikler, kredi yönetimi
- ✅ **Multi-payment Support**: Card, Crypto, Binance Pay, MetaMask
- ✅ **OAuth Integration**: Google, GitHub, Discord

### 🔒 Security
- ✅ **Rate Limiting**: DoS koruması (slowapi)
- ✅ **Logging**: Structured logging (loguru)
- ✅ **Error Tracking**: Sentry entegrasyonu
- ✅ **JWT Authentication**: Güvenli token-based auth
- ✅ **Role-based Access**: User/Admin rolleri

### 📊 Analytics
- ✅ **Dashboard**: Gerçek zamanlı istatistikler
- ✅ **Usage Tracking**: Detaylı kullanım raporları
- ✅ **Admin Analytics**: Platform-wide metrics

---

## 🏗️ Tech Stack

**Backend:**
- FastAPI (Python 3.11)
- MongoDB (AsyncIOMotorClient)
- JWT + OAuth 2.0
- Sentry, Loguru

**Frontend:**
- React + TypeScript
- Vite + TailwindCSS
- Zustand (State)
- Axios

**AI Providers:**
- Fireworks AI, OpenAI, Replicate, Pollo.ai, ElevenLabs

---

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend

# Virtual environment oluştur
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Dependencies yükle
pip install -r requirements.txt

# Environment variables
cp .env.example .env
# .env dosyasını düzenle

# Çalıştır
uvicorn main:app --reload
```

Backend: http://localhost:8000
API Docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Dependencies yükle
npm install

# Environment variables
cp .env.example .env
# .env dosyasını düzenle

# Çalıştır
npm run dev
```

Frontend: http://localhost:5173

---

## 📚 Documentation

- **[System Documentation](SYSTEM_DOCUMENTATION.md)** - Kapsamlı sistem dokümantasyonu
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment rehberi
- **[Frontend Integration](FRONTEND_INTEGRATION_GUIDE.md)** - API entegrasyon rehberi
- **[API Docs](http://localhost:8000/docs)** - Swagger UI (backend çalışırken)

---

## 🔑 Environment Variables

### Backend (.env)

```bash
# Application
APP_NAME=AI SaaS Platform
ENVIRONMENT=development

# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=ai_saas

# Security
JWT_SECRET_KEY=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Sentry (optional)
SENTRY_DSN=
SENTRY_ENVIRONMENT=development

# AI Service API Keys
FIREWORKS_API_KEY=your-key
OPENAI_API_KEY=your-key
REPLICATE_API_KEY=your-key
POLLO_API_KEY=your-key
ELEVENLABS_API_KEY=your-key

# Payment Providers
LEMONSQUEEZY_API_KEY=your-key
NOWPAYMENTS_API_KEY=your-key
BINANCE_API_KEY=your-key
METAMASK_DISCOUNT_PERCENT=15

# OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=AI SaaS Platform
```

---

## 🗄️ Database Setup

### MongoDB Indexes

```javascript
// users collection
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "id": 1 }, { unique: true });

// user_credits collection
db.user_credits.createIndex({ "user_id": 1 }, { unique: true });

// usage_logs collection
db.usage_logs.createIndex({ "user_id": 1, "created_at": -1 });

// media_outputs collection
db.media_outputs.createIndex({ "user_id": 1, "created_at": -1 });
db.media_outputs.createIndex({ "is_showcase": 1, "created_at": -1 });

// conversations collection
db.conversations.createIndex({ "user_id": 1, "updated_at": -1 });
```

### Initial Data

```javascript
// Service costs
db.service_costs.insertMany([
  { service_type: "chat", unit: "1000 tokens", cost_per_unit: 1.0 },
  { service_type: "image", unit: "1 image", cost_per_unit: 5.0 },
  { service_type: "video", unit: "1 video", cost_per_unit: 20.0 },
  { service_type: "audio", unit: "1 audio", cost_per_unit: 3.0 }
]);

// Pricing packages
db.pricing_packages.insertMany([
  { name: "Starter Pack", usd_price: 10.0, credit_amount: 1000, discount_percent: 0, active: true },
  { name: "Pro Pack", usd_price: 50.0, credit_amount: 5500, discount_percent: 10, active: true },
  { name: "Enterprise Pack", usd_price: 200.0, credit_amount: 25000, discount_percent: 25, active: true }
]);
```

---

## 🔌 API Endpoints

### Toplam: 54 Endpoint

**Authentication (3)**
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- GET `/api/v1/auth/{provider}/callback`

**User Profile (8)**
- GET `/api/v1/user/me`
- PUT `/api/v1/user/profile`
- PUT `/api/v1/user/password`
- POST `/api/v1/user/api-key`
- GET `/api/v1/user/api-keys`
- DELETE `/api/v1/user/api-key/{id}`
- GET `/api/v1/user/transactions`
- GET `/api/v1/user/stats`

**Media Library (11)**
- GET `/api/v1/media/images`
- GET `/api/v1/media/videos`
- GET `/api/v1/media/audio`
- GET `/api/v1/media/all`
- POST `/api/v1/media/{id}/showcase`
- DELETE `/api/v1/media/{id}`
- GET `/api/v1/media/showcase`
- GET `/api/v1/media/showcase/images`
- GET `/api/v1/media/showcase/videos`
- GET `/api/v1/media/showcase/audio`

**Dashboard (4)**
- GET `/api/v1/dashboard/stats`
- GET `/api/v1/dashboard/recent-activity`
- GET `/api/v1/dashboard/usage-summary`
- GET `/api/v1/dashboard/quick-actions`

**Chat (7)**
- POST `/api/v1/chat`
- GET `/api/v1/chat/conversations`
- GET `/api/v1/chat/conversations/{id}`
- DELETE `/api/v1/chat/conversations/{id}`
- POST `/api/v1/chat/conversations/{id}/rename`
- POST `/api/v1/chat/conversations/{id}/export`
- GET `/api/v1/chat/models`

**Billing (10)**
- GET `/api/v1/billing/payment-methods`
- GET `/api/v1/billing/plans`
- GET `/api/v1/billing/packages`
- GET `/api/v1/billing/subscription/status`
- GET `/api/v1/billing/transactions`
- GET `/api/v1/billing/invoices`
- GET `/api/v1/billing/invoices/{id}`
- GET `/api/v1/billing/invoices/{id}/download`
- POST `/api/v1/billing/refund`
- GET `/api/v1/billing/usage-stats`

**File Management (5)**
- POST `/api/v1/files/upload`
- GET `/api/v1/files/list`
- GET `/api/v1/files/download/{id}`
- DELETE `/api/v1/files/{id}`
- GET `/api/v1/files/storage-stats`

**Admin (13)**
- GET `/api/v1/admin/users`
- GET `/api/v1/admin/users/{id}`
- PUT `/api/v1/admin/users/{id}`
- DELETE `/api/v1/admin/users/{id}`
- POST `/api/v1/admin/users/{id}/suspend`
- GET `/api/v1/admin/users/{id}/credits`
- POST `/api/v1/admin/users/{id}/credits`
- GET `/api/v1/admin/stats/platform`
- GET `/api/v1/admin/recent-users`
- GET `/api/v1/admin/top-models`
- GET `/api/v1/admin/service-costs`
- POST `/api/v1/admin/service-costs`
- GET `/api/v1/admin/pricing-packages`

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/ -v

# API health check
curl http://localhost:8000/health

# Frontend tests
cd frontend
npm run test
```

---

## 🐳 Docker Deployment

```bash
# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 📊 Project Statistics

- **Total Endpoints**: 54
- **Database Collections**: 11
- **AI Providers**: 5
- **Payment Methods**: 5
- **Lines of Code**: ~15,000+
- **Development Time**: Production-ready

---

## 🔒 Security Features

- ✅ Rate limiting (DoS protection)
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Input validation (Pydantic)
- ✅ CORS configuration
- ✅ Error tracking (Sentry)
- ✅ Admin action logging
- ✅ API key authentication

---

## 📈 Performance

- Async/await for all I/O
- Database connection pooling
- Query optimization with indexes
- Rate limiting per user/IP
- Structured logging
- Error tracking

---

## 🎯 Roadmap

### Phase 1 ✅ (Completed)
- [x] Core API endpoints (54)
- [x] Authentication & authorization
- [x] User management
- [x] Media library
- [x] Admin panel
- [x] Billing system
- [x] File management
- [x] Security features
- [x] Logging & monitoring

### Phase 2 (Next)
- [ ] Frontend API integration
- [ ] UI/UX improvements
- [ ] Mobile responsive design
- [ ] Performance optimization
- [ ] Load testing

### Phase 3 (Future)
- [ ] WebSocket support (real-time)
- [ ] Advanced analytics
- [ ] A/B testing
- [ ] Multi-language support
- [ ] Mobile apps

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 📞 Support

- **Documentation**: [System Docs](SYSTEM_DOCUMENTATION.md)
- **API Docs**: http://localhost:8000/docs
- **Issues**: GitHub Issues
- **Email**: support@example.com

---

## 🙏 Acknowledgments

- FastAPI - Modern web framework
- MongoDB - NoSQL database
- React - UI library
- TailwindCSS - CSS framework
- All AI service providers

---

**🎉 Sistem production-ready! Hemen başlayın!**

```bash
# Backend
cd backend && uvicorn main:app --reload

# Frontend
cd frontend && npm run dev
```

**Happy coding! 🚀**

