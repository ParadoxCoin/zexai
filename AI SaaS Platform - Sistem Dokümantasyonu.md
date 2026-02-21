# 📚 AI SaaS Platform - Sistem Dokümantasyonu

## 🎯 Proje Özeti

**AI SaaS Platform**, çoklu AI hizmetlerini (chat, görsel, video, ses üretimi) tek bir platformda sunan, kredi tabanlı faturalandırma sistemi ile çalışan, production-ready bir SaaS uygulamasıdır.

---

## 🏗️ Mimari Genel Bakış

### Tech Stack

**Backend:**
- FastAPI (Python 3.11)
- MongoDB (AsyncIOMotorClient)
- JWT Authentication
- Rate Limiting (slowapi)
- Logging (loguru)
- Error Tracking (Sentry)

**Frontend:**
- React + TypeScript
- Vite
- TailwindCSS
- Zustand (State Management)
- Axios (HTTP Client)

**AI Services:**
- Fireworks AI (Chat)
- OpenAI (Chat, Image)
- Replicate (Image, Video)
- Pollo.ai (Video)
- ElevenLabs (Audio/TTS)

**Payment Providers:**
- LemonSqueezy (Card)
- 2Checkout (Card)
- NowPayments (Crypto)
- Binance Pay (Crypto)
- MetaMask (Custom Token)

---

## 📊 Database Schema

### Collections

#### 1. users
```javascript
{
  id: String (UUID),
  email: String (unique),
  password_hash: String,
  full_name: String,
  role: String (user|admin),
  package: String (free|basic|pro|enterprise),
  is_active: Boolean,
  oauth_providers: [String],
  created_at: DateTime,
  last_login: DateTime
}
```

#### 2. user_credits
```javascript
{
  user_id: String (unique),
  credits_balance: Float,
  updated_at: DateTime
}
```

#### 3. usage_logs
```javascript
{
  id: String,
  user_id: String,
  service_type: String,
  credits_charged: Float,
  details: Object,
  created_at: DateTime
}
```

#### 4. media_outputs
```javascript
{
  id: String,
  user_id: String,
  service_type: String (image|video|audio),
  file_url: String,
  thumbnail_url: String,
  prompt: String,
  model_name: String,
  generation_details: Object,
  credits_charged: Float,
  status: String,
  is_showcase: Boolean,
  created_at: DateTime,
  expires_at: DateTime
}
```

#### 5. conversations
```javascript
{
  id: String,
  user_id: String,
  title: String,
  messages: [
    {
      role: String,
      content: String,
      timestamp: DateTime
    }
  ],
  model: String,
  tokens_used: Int,
  credits_charged: Float,
  created_at: DateTime,
  updated_at: DateTime
}
```

#### 6. user_profiles
```javascript
{
  user_id: String,
  email: String,
  full_name: String,
  avatar_url: String,
  bio: String,
  website: String,
  social_links: Object,
  preferences: Object,
  role: String,
  package: String,
  created_at: DateTime,
  last_login: DateTime
}
```

#### 7. user_api_keys
```javascript
{
  id: String,
  user_id: String,
  name: String,
  description: String,
  key_hash: String (SHA256),
  key_prefix: String,
  created_at: DateTime,
  last_used_at: DateTime,
  is_active: Boolean
}
```

#### 8. billing_transactions
```javascript
{
  id: String,
  user_id: String,
  type: String,
  amount_usd: Float,
  credits_added: Float,
  payment_method: String,
  status: String,
  transaction_id: String,
  created_at: DateTime
}
```

#### 9. invoices
```javascript
{
  id: String,
  user_id: String,
  invoice_number: String,
  amount_usd: Float,
  credits_purchased: Float,
  payment_method: String,
  status: String,
  issued_at: DateTime,
  paid_at: DateTime,
  download_url: String
}
```

#### 10. user_files
```javascript
{
  id: String,
  user_id: String,
  filename: String,
  original_filename: String,
  file_type: String,
  file_size: Int,
  mime_type: String,
  storage_path: String,
  public_url: String,
  created_at: DateTime,
  expires_at: DateTime
}
```

#### 11. admin_logs
```javascript
{
  id: String,
  admin_id: String,
  action: String,
  target_user_id: String,
  details: Object,
  created_at: DateTime
}
```

---

## 🔌 API Endpoints (54 Total)

### Authentication (3)
- `POST /api/v1/auth/register` - Kullanıcı kaydı
- `POST /api/v1/auth/login` - Giriş
- `GET /api/v1/auth/{provider}/callback` - OAuth callback

### User Profile (8)
- `GET /api/v1/user/me` - Profil bilgileri
- `PUT /api/v1/user/profile` - Profil güncelle
- `PUT /api/v1/user/password` - Şifre değiştir
- `POST /api/v1/user/api-key` - API key oluştur
- `GET /api/v1/user/api-keys` - API key listesi
- `DELETE /api/v1/user/api-key/{id}` - API key sil
- `GET /api/v1/user/transactions` - İşlem geçmişi
- `GET /api/v1/user/stats` - Kullanıcı istatistikleri

### Media Library (11)
- `GET /api/v1/media/images` - Görsel listesi
- `GET /api/v1/media/videos` - Video listesi
- `GET /api/v1/media/audio` - Ses listesi
- `GET /api/v1/media/all` - Tüm medya
- `POST /api/v1/media/{id}/showcase` - Vitrine ekle/çıkar
- `DELETE /api/v1/media/{id}` - Medya sil
- `GET /api/v1/media/showcase` - Herkese açık vitrin
- `GET /api/v1/media/showcase/images` - Vitrin görselleri
- `GET /api/v1/media/showcase/videos` - Vitrin videoları
- `GET /api/v1/media/showcase/audio` - Vitrin sesleri

### Dashboard (4)
- `GET /api/v1/dashboard/stats` - Dashboard istatistikleri
- `GET /api/v1/dashboard/recent-activity` - Son aktiviteler
- `GET /api/v1/dashboard/usage-summary` - Kullanım özeti
- `GET /api/v1/dashboard/quick-actions` - Hızlı erişim önerileri

### Chat (7)
- `POST /api/v1/chat` - Mesaj gönder
- `GET /api/v1/chat/conversations` - Sohbet listesi
- `GET /api/v1/chat/conversations/{id}` - Sohbet detayı
- `DELETE /api/v1/chat/conversations/{id}` - Sohbet sil
- `POST /api/v1/chat/conversations/{id}/rename` - Sohbet yeniden adlandır
- `POST /api/v1/chat/conversations/{id}/export` - Sohbet dışa aktar
- `GET /api/v1/chat/models` - Kullanılabilir modeller

### Billing (10)
- `GET /api/v1/billing/payment-methods` - Ödeme yöntemleri
- `GET /api/v1/billing/plans` - Abonelik planları
- `GET /api/v1/billing/packages` - Kredi paketleri
- `GET /api/v1/billing/subscription/status` - Abonelik durumu
- `GET /api/v1/billing/transactions` - Ödeme geçmişi
- `GET /api/v1/billing/invoices` - Fatura listesi
- `GET /api/v1/billing/invoices/{id}` - Fatura detayı
- `GET /api/v1/billing/invoices/{id}/download` - Fatura indir
- `POST /api/v1/billing/refund` - İade talebi
- `GET /api/v1/billing/usage-stats` - Kullanım istatistikleri

### File Management (5)
- `POST /api/v1/files/upload` - Dosya yükle
- `GET /api/v1/files/list` - Dosya listesi
- `GET /api/v1/files/download/{id}` - Dosya indir
- `DELETE /api/v1/files/{id}` - Dosya sil
- `GET /api/v1/files/storage-stats` - Depolama istatistikleri

### Admin (13)
- `GET /api/v1/admin/users` - Kullanıcı listesi
- `GET /api/v1/admin/users/{id}` - Kullanıcı detayı
- `PUT /api/v1/admin/users/{id}` - Kullanıcı düzenle
- `DELETE /api/v1/admin/users/{id}` - Kullanıcı sil
- `POST /api/v1/admin/users/{id}/suspend` - Kullanıcı askıya al
- `GET /api/v1/admin/users/{id}/credits` - Kullanıcı kredileri
- `POST /api/v1/admin/users/{id}/credits` - Kredi ekle/çıkar
- `GET /api/v1/admin/stats/platform` - Platform istatistikleri
- `GET /api/v1/admin/recent-users` - Son kayıtlar
- `GET /api/v1/admin/top-models` - En çok kullanılan modeller
- `GET /api/v1/admin/service-costs` - Hizmet maliyetleri
- `POST /api/v1/admin/service-costs` - Maliyet güncelle
- `GET /api/v1/admin/pricing-packages` - Fiyatlandırma paketleri

---

## 🔐 Güvenlik Özellikleri

### 1. Authentication & Authorization
- JWT token based authentication
- Secure password hashing (bcrypt)
- OAuth 2.0 support (Google, GitHub, Discord)
- Role-based access control (user, admin)
- API key authentication

### 2. Rate Limiting
```python
# Predefined limits
LOGIN = "5/minute"
REGISTER = "3/minute"
IMAGE_GENERATION = "10/minute"
VIDEO_GENERATION = "5/minute"
CHAT = "20/minute"
FILE_UPLOAD = "20/minute"
ADMIN_WRITE = "30/minute"
```

### 3. Input Validation
- Pydantic schemas for all requests
- SQL injection prevention (MongoDB)
- XSS protection
- CSRF protection

### 4. Logging & Monitoring
- Structured logging (loguru)
- Error tracking (Sentry)
- Admin action logging
- Request/response logging

### 5. Data Protection
- HTTPS only in production
- Secure cookie handling
- Environment variables for secrets
- Database connection encryption

---

## 💳 Credit System

### Credit Pricing

| Service | Unit | Credits |
|---------|------|---------|
| Chat | 1000 tokens | 1 |
| Image | 1 image | 5 |
| Video | 1 video | 20 |
| Audio | 1 audio | 3 |

### Subscription Plans

| Plan | Monthly Price | Credits | Features |
|------|--------------|---------|----------|
| Basic | $25 | 2,500 | All services, Email support |
| Pro | $75 | 8,000 | Priority support, Analytics |
| Enterprise | $250 | 30,000 | Dedicated support, SLA |

### Credit Packages

| Package | Price | Credits | Discount |
|---------|-------|---------|----------|
| Starter | $10 | 1,000 | 0% |
| Pro | $50 | 5,500 | 10% |
| Enterprise | $200 | 25,000 | 25% |

---

## 🎨 Frontend Structure

### Pages

```
src/pages/
├── Dashboard.tsx              # Ana dashboard
├── auth/
│   ├── Login.tsx             # Giriş
│   ├── Register.tsx          # Kayıt
│   └── OAuthCallback.tsx     # OAuth callback
├── profile/
│   └── Profile.tsx           # Kullanıcı profili
├── chat/
│   └── Chat.tsx              # AI sohbet
├── image/
│   └── ImageGenerate.tsx     # Görsel üretimi
├── video/
│   └── VideoGenerate.tsx     # Video üretimi
├── audio/
│   └── AudioTTS.tsx          # Ses üretimi
├── synapse/
│   └── SynapseGenerate.tsx   # Agent sistemi
├── library/
│   ├── MediaLibrary.tsx      # Medya kütüphanesi
│   └── Showcase.tsx          # Herkese açık vitrin
├── billing/
│   └── Subscription.tsx      # Faturalandırma
└── admin/
    ├── AdminDashboard.tsx    # Admin dashboard
    ├── AdminUsers.tsx        # Kullanıcı yönetimi
    └── AdminPricing.tsx      # Fiyatlandırma yönetimi
```

### State Management

```typescript
// Zustand stores
stores/
├── userStore.ts      # Kullanıcı durumu
├── taskStore.ts      # Görev durumu
└── synapseStore.ts   # Agent durumu
```

---

## 🚀 Performance Optimizations

### Backend
- Async/await for all I/O operations
- Database connection pooling
- Query optimization with indexes
- Response caching (Redis ready)
- Compression middleware ready

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- CDN ready
- Service worker ready

---

## 📈 Monitoring & Analytics

### Metrics to Track

**System Health:**
- API response times
- Error rates
- Database query performance
- Memory usage
- CPU usage

**Business Metrics:**
- Daily active users
- New registrations
- Credits purchased
- Credits spent
- Revenue
- Churn rate

**Usage Metrics:**
- Generations per service
- Popular models
- Average credits per user
- API call distribution

---

## 🔄 Maintenance

### Daily Tasks
- Check error logs
- Monitor Sentry alerts
- Review system health

### Weekly Tasks
- Database backup verification
- Performance metrics review
- User feedback review

### Monthly Tasks
- Security updates
- Dependency updates
- Cost optimization review
- Feature usage analysis

---

## 🆘 Common Issues & Solutions

### Issue 1: High Memory Usage
**Solution:** Increase worker count, optimize queries, add caching

### Issue 2: Slow API Responses
**Solution:** Add database indexes, optimize queries, add Redis caching

### Issue 3: Rate Limit Errors
**Solution:** Adjust rate limits, use Redis for distributed rate limiting

### Issue 4: Database Connection Errors
**Solution:** Check connection pool settings, verify MongoDB Atlas whitelist

---

## 📞 Support & Resources

- **API Documentation:** `/docs` (Swagger UI)
- **Logs:** `/app/logs/`
- **Monitoring:** Sentry dashboard
- **Database:** MongoDB Atlas dashboard

---

## 🎓 Best Practices

### Code Quality
- Type hints everywhere
- Pydantic models for validation
- Comprehensive error handling
- Structured logging
- Unit tests

### Security
- Never commit secrets
- Use environment variables
- Validate all inputs
- Rate limit all endpoints
- Log security events

### Performance
- Use async/await
- Index database queries
- Cache frequently accessed data
- Optimize images
- Minimize API calls

---

## 📝 Changelog

### Version 1.0.0 (Current)
- ✅ 54 API endpoints implemented
- ✅ Rate limiting active
- ✅ Logging system configured
- ✅ Error tracking (Sentry)
- ✅ User profile management
- ✅ API key management
- ✅ Media library
- ✅ Chat history
- ✅ Dashboard analytics
- ✅ Admin panel
- ✅ Billing system
- ✅ File management
- ✅ Production-ready deployment

---

**🎉 Sistem tamamen production-ready durumda!**

