# 📦 Supabase Storage Setup

## Storage Bucket Oluşturma

### 1. Supabase Dashboard'a Gidin
https://dyxvsnfrcmjkbzerrsmu.supabase.co

### 2. Storage → Create Bucket

**Bucket Name:** `media`
**Public Bucket:** ✅ Yes (media files public olmalı)
**File Size Limit:** 50MB (veya ihtiyacınıza göre)

### 3. Bucket Policies

Storage → Policies → media bucket → New Policy

**Policy Name:** "Allow public read access"
**Allowed Operations:** SELECT
**Policy Definition:**
```sql
bucket_id = 'media' AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
```

**Policy Name:** "Allow authenticated upload"
**Allowed Operations:** INSERT
**Policy Definition:**
```sql
bucket_id = 'media' AND auth.role() = 'authenticated'
```

**Policy Name:** "Allow users to delete own files"
**Allowed Operations:** DELETE
**Policy Definition:**
```sql
bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]
```

---

## 📁 Folder Structure

```
media/
├── images/
│   ├── {user_id}/
│   │   ├── {task_id}_0.png
│   │   └── {task_id}_1.png
├── videos/
│   ├── {user_id}/
│   │   └── {task_id}.mp4
└── audio/
    ├── {user_id}/
    │   └── {task_id}.mp3
```

---

## ✅ Test

Bucket oluşturulduktan sonra test edin:

```python
from supabase import create_client

supabase = create_client(
    "https://dyxvsnfrcmjkbzerrsmu.supabase.co",
    "your-service-role-key"
)

# Test upload
result = supabase.storage.from_("media").upload(
    "test/test.txt",
    b"Hello World",
    file_options={"content-type": "text/plain"}
)

print(result)
```

---

## 🔒 Security Notes

1. **Public Bucket:** Media files public olmalı (CDN için)
2. **Authenticated Upload:** Sadece authenticated users upload edebilir
3. **User Isolation:** Her user kendi folder'ında dosya saklar
4. **File Size Limits:** Bucket seviyesinde limit ayarlayın
