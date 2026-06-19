# Frontend API Entegrasyon Rehberi

## 🎯 Genel Bakış

Backend'de **54 yeni endpoint** eklendi ve tüm mock data'lar için gerçek API'ler hazır. Bu rehber, frontend'i gerçek API'lere bağlamak için gerekli adımları içerir.

## 📦 Yeni API Service Layer

`src/services/api.ts` dosyası oluşturuldu. Tüm API çağrıları bu dosya üzerinden yapılmalı.

### Kullanım Örneği

```typescript
import { userAPI, dashboardAPI, mediaAPI } from '@/services/api';

// Kullanıcı profili getir
const profile = await userAPI.getProfile();

// Dashboard istatistikleri
const stats = await dashboardAPI.getStats();

// Medya kütüphanesi
const images = await mediaAPI.getImages(1, 20);
```

## 🔧 Entegrasyon Adımları

### 1. Dashboard Sayfası (`src/pages/Dashboard.tsx`)

**Değiştirilmesi Gerekenler:**
- Mock istatistikler → `dashboardAPI.getStats()`
- Mock son aktiviteler → `dashboardAPI.getRecentActivity()`
- Mock kullanım özeti → `dashboardAPI.getUsageSummary()`

**Örnek Kod:**

```typescript
import { dashboardAPI } from '@/services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const statsData = await dashboardAPI.getStats();
      setStats(statsData.data);
      
      const activitiesData = await dashboardAPI.getRecentActivity(10);
      setActivities(activitiesData.data);
    };
    fetchData();
  }, []);

  return (
    <div>
      <h1>Kredi Bakiyesi: {stats?.credits_balance}</h1>
      <p>Bugün Harcanan: {stats?.credits_spent_today}</p>
      {/* ... */}
    </div>
  );
};
```

---

### 2. Profil Sayfası (`src/pages/profile/Profile.tsx`)

**Değiştirilmesi Gerekenler:**
- Mock kullanıcı bilgileri → `userAPI.getProfile()`
- Profil güncelleme → `userAPI.updateProfile()`
- Şifre değiştirme → `userAPI.changePassword()`
- API key yönetimi → `apiKeyAPI.create()`, `apiKeyAPI.list()`, `apiKeyAPI.delete()`

**Örnek Kod:**

```typescript
import { userAPI, apiKeyAPI } from '@/services/api';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await userAPI.getProfile();
      setProfile(data.data);
      
      const keys = await apiKeyAPI.list();
      setApiKeys(keys.data);
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (formData) => {
    await userAPI.updateProfile(formData);
    // Refresh profile
  };

  const handleCreateAPIKey = async (name, description) => {
    const response = await apiKeyAPI.create({ name, description });
    alert(`API Key: ${response.data.api_key}`);
    // Refresh keys list
  };

  return (
    <div>
      <h2>{profile?.full_name}</h2>
      <p>{profile?.email}</p>
      {/* API Keys section */}
      <button onClick={() => handleCreateAPIKey('My Key', 'Test key')}>
        Yeni API Key Oluştur
      </button>
    </div>
  );
};
```

---

### 3. Medya Kütüphanesi (`src/pages/library/MediaLibrary.tsx`)

**Değiştirilmesi Gerekenler:**
- Mock medya listesi → `mediaAPI.getAll()`, `mediaAPI.getImages()`, `mediaAPI.getVideos()`
- Vitrine ekleme → `mediaAPI.toggleShowcase()`
- Medya silme → `mediaAPI.delete()`

**Örnek Kod:**

```typescript
import { mediaAPI } from '@/services/api';

const MediaLibrary = () => {
  const [media, setMedia] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchMedia = async () => {
      const response = await mediaAPI.getAll(page, 20);
      setMedia(response.data.items);
    };
    fetchMedia();
  }, [page]);

  const handleToggleShowcase = async (mediaId, isShowcase) => {
    await mediaAPI.toggleShowcase(mediaId, !isShowcase);
    // Refresh media list
  };

  const handleDelete = async (mediaId) => {
    await mediaAPI.delete(mediaId);
    // Refresh media list
  };

  return (
    <div>
      {media.map(item => (
        <div key={item.id}>
          <img src={item.file_url} alt={item.prompt} />
          <button onClick={() => handleToggleShowcase(item.id, item.is_showcase)}>
            {item.is_showcase ? 'Vitrinden Çıkar' : 'Vitrine Ekle'}
          </button>
          <button onClick={() => handleDelete(item.id)}>Sil</button>
        </div>
      ))}
    </div>
  );
};
```

---

### 4. Showcase Sayfası (`src/pages/library/Showcase.tsx`)

**Değiştirilmesi Gerekenler:**
- Mock showcase → `mediaAPI.getShowcase()`

**Örnek Kod:**

```typescript
import { mediaAPI } from '@/services/api';

const Showcase = () => {
  const [showcase, setShowcase] = useState([]);

  useEffect(() => {
    const fetchShowcase = async () => {
      const response = await mediaAPI.getShowcase(1, 20);
      setShowcase(response.data.items);
    };
    fetchShowcase();
  }, []);

  return (
    <div>
      <h1>Herkese Açık Vitrin</h1>
      {showcase.map(item => (
        <div key={item.id}>
          <img src={item.file_url} alt={item.prompt} />
          <p>{item.prompt}</p>
        </div>
      ))}
    </div>
  );
};
```

---

### 5. Chat Sayfası (`src/pages/chat/Chat.tsx`)

**Değiştirilmesi Gerekenler:**
- Mock sohbet geçmişi → `chatAPI.getConversations()`
- Sohbet detayı → `chatAPI.getConversation()`
- Sohbet silme → `chatAPI.deleteConversation()`
- Sohbet yeniden adlandırma → `chatAPI.renameConversation()`
- Sohbet dışa aktarma → `chatAPI.exportConversation()`

**Örnek Kod:**

```typescript
import { chatAPI } from '@/services/api';

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);

  useEffect(() => {
    const fetchConversations = async () => {
      const response = await chatAPI.getConversations();
      setConversations(response.data.conversations);
    };
    fetchConversations();
  }, []);

  const handleSelectConversation = async (conversationId) => {
    const response = await chatAPI.getConversation(conversationId);
    setCurrentConversation(response.data);
  };

  const handleDeleteConversation = async (conversationId) => {
    await chatAPI.deleteConversation(conversationId);
    // Refresh conversations
  };

  const handleExport = async (conversationId, format) => {
    const response = await chatAPI.exportConversation(conversationId, format);
    console.log(response.data.content);
  };

  return (
    <div>
      {/* Conversation list */}
      {conversations.map(conv => (
        <div key={conv.id} onClick={() => handleSelectConversation(conv.id)}>
          <h3>{conv.title}</h3>
          <p>{conv.last_message}</p>
          <button onClick={() => handleDeleteConversation(conv.id)}>Sil</button>
          <button onClick={() => handleExport(conv.id, 'md')}>Dışa Aktar</button>
        </div>
      ))}
    </div>
  );
};
```

---

### 6. Admin Paneli (`src/pages/admin/AdminUsers.tsx`)

**Değiştirilmesi Gerekenler:**
- Mock kullanıcı listesi → `adminAPI.getUsers()`
- Kullanıcı detayı → `adminAPI.getUser()`
- Kullanıcı düzenleme → `adminAPI.updateUser()`
- Kredi ayarlama → `adminAPI.adjustCredits()`
- Kullanıcı askıya alma → `adminAPI.suspendUser()`

**Örnek Kod:**

```typescript
import { adminAPI } from '@/services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ page: 1, page_size: 50 });

  useEffect(() => {
    const fetchUsers = async () => {
      const response = await adminAPI.getUsers(filters);
      setUsers(response.data.users);
    };
    fetchUsers();
  }, [filters]);

  const handleAdjustCredits = async (userId, amount, reason) => {
    await adminAPI.adjustCredits(userId, { amount, reason });
    // Refresh users
  };

  const handleSuspend = async (userId) => {
    await adminAPI.suspendUser(userId);
    // Refresh users
  };

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          <h3>{user.full_name} ({user.email})</h3>
          <p>Kredi: {user.credits_balance}</p>
          <button onClick={() => handleAdjustCredits(user.id, 100, 'Bonus')}>
            +100 Kredi Ekle
          </button>
          <button onClick={() => handleSuspend(user.id)}>Askıya Al</button>
        </div>
      ))}
    </div>
  );
};
```

---

### 7. Billing Sayfası (`src/pages/billing/Subscription.tsx`)

**Değiştirilmesi Gerekenler:**
- Mock faturalar → `billingAPI.getInvoices()`
- Mock işlem geçmişi → `billingAPI.getTransactions()`
- Mock kullanım istatistikleri → `billingAPI.getUsageStats()`

**Örnek Kod:**

```typescript
import { billingAPI } from '@/services/api';

const Subscription = () => {
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [usageStats, setUsageStats] = useState(null);

  useEffect(() => {
    const fetchBillingData = async () => {
      const invoicesData = await billingAPI.getInvoices();
      setInvoices(invoicesData.data.invoices);
      
      const transactionsData = await billingAPI.getTransactions();
      setTransactions(transactionsData.data.transactions);
      
      const statsData = await billingAPI.getUsageStats();
      setUsageStats(statsData.data);
    };
    fetchBillingData();
  }, []);

  return (
    <div>
      <h2>Faturalar</h2>
      {invoices.map(invoice => (
        <div key={invoice.id}>
          <p>{invoice.invoice_number} - ${invoice.amount_usd}</p>
          <button onClick={() => billingAPI.downloadInvoice(invoice.id)}>
            İndir
          </button>
        </div>
      ))}
      
      <h2>Kullanım İstatistikleri</h2>
      <p>Satın Alınan: {usageStats?.credits_purchased}</p>
      <p>Harcanan: {usageStats?.credits_spent}</p>
      <p>Kalan: {usageStats?.credits_remaining}</p>
    </div>
  );
};
```

---

## 🔐 Authentication

API service layer otomatik olarak JWT token'ı ekler. Token localStorage'da saklanır:

```typescript
// Login sonrası
localStorage.setItem('token', response.data.access_token);

// Logout
localStorage.removeItem('token');
```

## 🚨 Error Handling

API service layer otomatik olarak 401 hatalarını yakalar ve login sayfasına yönlendirir.

Diğer hatalar için:

```typescript
try {
  const response = await userAPI.getProfile();
  setProfile(response.data);
} catch (error) {
  if (error.response) {
    // API error
    console.error(error.response.data.detail);
  } else {
    // Network error
    console.error('Network error');
  }
}
```

## 📋 Checklist

### Yapılması Gerekenler:

- [ ] Dashboard sayfası - API entegrasyonu
- [ ] Profil sayfası - API entegrasyonu
- [ ] Medya kütüphanesi - API entegrasyonu
- [ ] Showcase sayfası - API entegrasyonu
- [ ] Chat sayfası - API entegrasyonu
- [ ] Admin kullanıcı yönetimi - API entegrasyonu
- [ ] Admin istatistikler - API entegrasyonu
- [ ] Billing sayfası - API entegrasyonu
- [ ] File upload component - API entegrasyonu
- [ ] Tüm mock data'ları kaldır
- [ ] Error handling ekle
- [ ] Loading states ekle
- [ ] Toast notifications ekle

## 🎨 UI İyileştirmeleri

API entegrasyonu sırasında eklenebilecek özellikler:

1. **Loading States**: API çağrıları sırasında skeleton loader
2. **Error Messages**: Kullanıcı dostu hata mesajları
3. **Success Notifications**: İşlem başarılı olduğunda toast notification
4. **Pagination**: Tüm listelerde pagination
5. **Search & Filters**: Kullanıcı ve medya listelerinde arama
6. **Infinite Scroll**: Medya kütüphanesi için

## 📚 API Dokümantasyonu

Backend çalıştırıldığında Swagger UI'a erişebilirsiniz:

```
http://localhost:8000/docs
```

Tüm endpoint'lerin detaylı dokümantasyonu burada mevcut.

## ✅ Test

API entegrasyonunu test etmek için:

1. Backend'i başlat: `cd backend && uvicorn main:app --reload`
2. Frontend'i başlat: `cd frontend && npm run dev`
3. Login ol ve her sayfayı test et
4. Browser console'da API çağrılarını kontrol et

---

**Not:** Tüm endpoint'ler hazır ve çalışır durumda. Frontend'de sadece mock data'ları kaldırıp API service layer'ı kullanmanız yeterli!

