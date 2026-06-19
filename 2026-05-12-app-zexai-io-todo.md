# app.zexai.io Yapilacaklar Listesi - 2026-05-12

Bu liste, `app.zexai.io` uygulamasi icin kod tabani uzerinden yapilan teknik analizden cikarilmistir. Canli domain HTTP istegi zaman asimina dustugu icin canli UI davranisi dogrulanamadi; bulgular repository incelemesine ve `Zex/frontend` production build sonucuna dayanir.

## P0 - Kritik Guvenlik

- [ ] `Zex/backend/core/security.py` icindeki local/mock auth modunu kaldir.
  - `get_current_user()` su anda Supabase token dogrulamadan sabit `super_admin` kullanici donduruyor.
  - Gercek Supabase JWT dogrulamasi yapilmali.
  - Token gecersizse `401`, rol yetersizse `403` donmeli.

- [ ] `get_current_admin_user()` ve `get_current_super_admin()` icin gercek rol kontrolu ekle.
  - `admin` ve `super_admin` rolleri backend tarafinda DB/Supabase profilinden dogrulanmali.
  - Frontend route guard sadece UX kabul edilmeli, guvenlik kaynagi olmamali.

- [ ] Admin endpoint'lerini tek tek auth/role kontrolunden gecir.
  - Ozellikle key vault, provider ayarlari, pricing, user management, billing ve report endpoint'leri incelenmeli.
  - `Depends(get_current_admin_user)` kullanan tum router'lar dogrulanmali.

- [ ] Backend Supabase service role kullandigi icin RLS bypass riskini azalt.
  - Service role sadece backend icinde kalmali.
  - Her sorgu oncesi backend auth/ownership kontrolu yapilmali.
  - Kullaniciya ait kaynaklarda `user_id == current_user.id` kontrolu standart hale getirilmeli.

## P0 - Odeme ve Kredi Sistemi

- [ ] Kredi dusme islemini atomik hale getir.
  - `CreditManager.deduct_credits()` once bakiye okuyup sonra update yapiyor.
  - Supabase RPC veya DB transaction kullan.
  - `credits_balance >= cost` kosullu atomic update uygulanmali.

- [ ] Kredi ekleme ve refund islemlerini de atomik hale getir.
  - `add_credits()` ve `refund_credits()` race condition'a acik.
  - Usage log ile bakiye guncelleme ayni transaction/RPC icinde olmali.

- [ ] Webhook endpoint'lerini gercek dogrulama ile tamamla.
  - `Zex/backend/routes/webhooks.py` su anda sadece `ok` donuyor.
  - Stripe/odeme provider imza dogrulamasi eklenmeli.
  - Pollo/Kie provider callback dogrulamasi eklenmeli.
  - Idempotency key veya event id ile tekrar isleme engellenmeli.

- [ ] Odeme basarili olmadan kredi yuklenmedigini test et.
  - Basarili webhook, tekrar webhook, gecersiz imza, iptal/failed payment senaryolari test edilmeli.

## P1 - Hassas Veri ve Log Guvenligi

- [ ] Debug endpoint'lerini production'da kapat.
  - `Zex/backend/routes/video_new.py` icindeki `/video/debug-models` admin-only veya disabled olmali.

- [ ] Provider request/response loglarini temizle.
  - Prompt, media URL, task ID, API response ve hata govdeleri production loglarinda maskelenmeli.
  - `print()` yerine structured logger kullanilmali.

- [ ] API key vault kullanimini gozden gecir.
  - Provider key'leri sadece encrypted vault uzerinden okunmali.
  - Duz `api_key` select eden eski kodlar temizlenmeli.

- [ ] `.env`, log, debug ve api check dosyalarinin git disinda kaldigini dogrula.
  - Nested `Zex` repo icindeki untracked debug/test dosyalari temizlenmeli veya ignore edilmeli.

## P1 - Dosya Yukleme ve Medya Guvenligi

- [ ] Kullanici dosyalarini public URL yerine signed URL ile sun.
  - `files.py` Supabase `media` bucket public URL donduruyor.
  - Kullanici medyasi private olmaliysa kisa omurlu signed URL kullan.

- [ ] Supabase bucket policy'lerini kontrol et.
  - Kullanici sadece kendi path'ine upload/read/delete yapabilmeli.
  - Service role ile yapilan backend islemlerinde ownership kontrolu zorunlu olmali.

- [ ] MIME validation fallback davranisini sertlestir.
  - `python-magic` yoksa content validation skip ediliyor.
  - Production image'da `python-magic` ve sistem lib'leri garanti edilmeli.

- [ ] Upload limitlerini servis bazinda tekrar degerlendir.
  - Backend 50 MB, Nginx 100 MB limit kullaniyor.
  - Video/audio workflow ihtiyacina gore tutarli hale getir.

## P1 - Production Hardening

- [ ] `TrustedHostMiddleware` aktif et.
  - Sadece `app.zexai.io`, API domain'i ve gerekli localhost originleri kabul edilmeli.

- [ ] CORS ayarlarini env tabanli ve dar kapsamli yap.
  - `main.py` icindeki hardcoded origin listesi yerine `settings.cors_origins_list` kullan.

- [ ] CSP header'ini daralt.
  - `nginx.conf` icindeki `default-src 'self' http: https: data: blob: 'unsafe-inline'` fazla genis.
  - Script, connect, img, media, style kaynaklari ayri tanimlanmali.

- [ ] HTTPS redirect ve proxy header davranisini production ortamda test et.
  - Railway/Vercel/Nginx arkasinda redirect loop riski kontrol edilmeli.

- [ ] Rate limit davranisini gercek ortamda test et.
  - Auth, generation, upload ve admin endpoint'leri icin limitler ayri dogrulanmali.

## P1 - Frontend Auth ve Durum Yonetimi

- [ ] Frontend auth state'i Supabase session ile tek kaynaga indir.
  - `auth_token` ve `user_data` localStorage fallback'leri legacy olarak kalmis.
  - Role bilgisi backend/Supabase profilinden taze okunmali.

- [ ] 401 response interceptor sonsuz retry/redirect riskine karsi guclendir.
  - Refresh fail olursa state temizlenmeli.
  - Ayni anda cok sayida 401 geldiginde tek refresh yapilmali.

- [ ] Admin UI gorunurlugunu backend permission endpoint'i ile bagla.
  - Local `user.role` yeterli kabul edilmemeli.

## P2 - Performans ve Build

- [ ] Route-level lazy loading ekle.
  - `Zex/frontend` build basarili, ancak en buyuk JS chunk yaklasik 4.58 MB.
  - Admin, Web3, media generation ve marketplace sayfalari lazy import edilmeli.

- [ ] Web3/Reown/AppKit bundle'ini izole et.
  - Wallet ozellikleri sadece ilgili sayfalarda yuklenmeli.

- [ ] PWA precache listesini kucult.
  - Build sonucunda precache yaklasik 12.3 MB.
  - Buyuk veya sik degisen asset'ler runtime cache'e alinmali.

- [ ] `/noise.png` eksik asset uyarisini gider.
  - Build uyarisi: `/noise.png` build zamaninda cozulmedi.
  - Asset varsa public'e ekle, yoksa referansi kaldir.

## P2 - Kod Kalitesi ve Bakim

- [ ] Root `.gitignore` merge conflict marker'larini temizle.
  - Dosyada `<<<<<<<`, `=======`, `>>>>>>>` marker'lari var.

- [ ] Nested repo durumunu temizle.
  - `Zex` icinde cok sayida modified/untracked dosya var.
  - Debug/test script'leri, backup dosyalari ve generated output'lar ayiklanmali.

- [ ] Backend route sayisini modulerlestir.
  - `main.py` cok fazla router'i tek yerde topluyor.
  - Admin, generation, billing, social gibi alanlara gore app factory veya router registry dusunulebilir.

- [ ] `print()` kullanimlarini logger'a tasi.
  - Production log seviyesi, masking ve correlation id destegi eklenmeli.

- [ ] Duplicate/legacy kodlari temizle.
  - Eski `image`, `image_new`, `video_new`, fallback servisleri ve hardcoded provider listeleri ayrica gozden gecirilmeli.

## Ek Kontrol - 2026-05-19

- [ ] Frontend production WebSocket URL'ini env'e ekle.
  - `Zex/frontend/.env.production` icinde `VITE_WS_URL` yok.
  - `Zex/frontend/src/services/websocket.ts` env eksikse `ws://localhost:8000/ws` kullaniyor.
  - Production icin `wss://api.zexai.io/ws` veya gercek backend WebSocket endpoint'i tanimlanmali.

- [ ] Frontend'deki daginik `http://localhost:8000/api/v1` fallback'lerini merkezi API service'e tasiyip temizle.
  - Birden fazla admin paneli ve sayfa kendi `axios.create()` instance'ini kuruyor.
  - Env eksik deploy olursa production kullanicisi localhost'a istek atabilir.
  - `Zex/frontend/src/services/api.ts` tek kaynak olmali; admin panelleri de ayni interceptor ve baseURL'i kullanmali.

- [ ] `Zex/frontend/src/components/admin/AuditLogPanel.tsx` icindeki fallback demo audit loglarini kaldir.
  - API hata verince `demo-user` ve `admin@example.com` gibi sahte veri gosteriyor.
  - Admin panelinde hata durumu acikca gosterilmeli; demo veri production'da gercek log gibi gorunmemeli.

- [ ] `Zex/frontend/src/components/admin/AdminGamificationPanel.tsx` backend persist eksigini tamamla.
  - Kodda `TODO: Save to backend when API is ready` var.
  - Admin tarafinda yapilan gamification ayarlari kalici degilse UI yaniltici olur.

- [ ] Audio route'larindaki placeholder output URL'lerini gercek storage upload ile degistir.
  - `Zex/backend/routes/audio.py` `https://placeholder.url/audio.mp3` ve `https://placeholder.url/openai_audio.mp3` donduruyor.
  - Binary output Supabase/R2 storage'a yazilmali, ardindan gercek signed/public URL donmeli.

- [ ] Image model/effect example URL'lerindeki `cdn.example.com` fallback'lerini kaldir.
  - `Zex/backend/routes/image_new.py` model ve grup example URL'lerini `https://cdn.example.com/...` olarak uretiyor.
  - `Zex/frontend/src/pages/VideoPage.tsx` effect preview yoksa `https://cdn.example.com/default-effect.mp4` kullaniyor.
  - Gercek preview asset'i yoksa URL yerine bos/disabled preview state'i kullanilmali.

- [ ] Async AI task mock output URL'lerini production yolundan ayir.
  - `Zex/backend/core/tasks/ai_generation.py` video/audio/music icin `https://example.com/...` output donduruyor.
  - Bu task'lar sadece test/dev modunda calismali veya gercek provider/storage sonucu dondurmeli.

- [ ] Billing placeholder endpoint'lerini gercek durumla isaretle.
  - `Zex/backend/routes/billing.py` icinde 2Checkout session ve subscription plans icin placeholder notlari var.
  - UI bu endpoint'lere bagliyse kullaniciya "aktif degil" durumu donmeli veya entegrasyon tamamlanmali.

- [ ] `Zex/backend/core/config.py` production default'larini temizle.
  - Default CORS icinde `https://yourdomain.com` var.
  - Default email alanlari `noreply@example.com` / `noreply@yourdomain.com`.
  - OAuth redirect default'lari localhost; production env validation bu alanlari zorunlu kontrol etmeli.

- [ ] Production build uyarilarini yeniden takip et.
  - 2026-05-19 kontrolunde `npm.cmd run build` basarili.
  - Hala `/noise.png` build zamaninda cozulmuyor.
  - En buyuk JS chunk yaklasik `4.76 MB`; route-level lazy loading ve Web3 bundle izolasyonu oncelikli.

## Dogrulama Checklist

- [ ] `npm.cmd run build` tekrar calistir ve basarili oldugunu dogrula.
- [ ] Backend icin auth unit/integration testleri ekle.
- [ ] Admin endpoint'lerine yetkisiz istek testleri ekle.
- [ ] Kredi dusme islemi icin paralel istek testi ekle.
- [ ] Webhook imza ve idempotency testleri ekle.
- [ ] File upload icin MIME spoofing, buyuk dosya, path traversal ve ownership testleri ekle.
- [ ] Production staging ortaminda `app.zexai.io` ve API health check'i dis agdan dogrula.
