-- ============================================================
-- ZexAI Subscription Plans Update — Supabase SQL Migration
-- Çalıştırma: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Basic Planını Güncelle ($9 / 1,000 Kredi)
UPDATE public.subscription_plans
SET 
    monthly_price = 9.00,
    monthly_credits = 1000,
    features = '[
        "1.000 Kredi/Ay (Kişisel Yaratıcı Yakıt)",
        "Yaratıcı Stüdyo Erişimi (Chat, Görsel & Video)",
        "Ultra Hızlı FLUX Pro & Veo Modelleri",
        "Standart Email Desteği"
    ]'::jsonb
WHERE id = 'basic';

-- 2. Pro Planını Güncelle ($29 / 3,300 Kredi)
UPDATE public.subscription_plans
SET 
    monthly_price = 29.00,
    monthly_credits = 3300,
    features = '[
        "3.300 Kredi/Ay (Yoğun Yaratım Gücü)",
        "Öncelikli Render Sırası (Sıfır Bekleme)",
        "Synapse Otonom Yapay Zeka Ajanları",
        "Gelişmiş Model Analitiği & Raporlama",
        "7/24 VIP Destek Hattı"
    ]'::jsonb
WHERE id = 'pro';

-- 3. Enterprise Planını Güncelle ($99 / 11,750 Kredi)
UPDATE public.subscription_plans
SET 
    monthly_price = 99.00,
    monthly_credits = 11750,
    features = '[
        "11.750 Kredi/Ay (Sınırsız Yaratım Gücü)",
        "Özel API Rotasyon Altyapısı (Maksimum Hız)",
        "Ultra Yüksek Çözünürlük (8K Çıktı Desteği)",
        "Kurumsal SLA Garantisi & Özel Temsilci",
        "Birebir Çözüm Ortağı & Entegrasyon Desteği"
    ]'::jsonb
WHERE id = 'enterprise';

-- Değişiklikleri doğrulama
SELECT id, name, monthly_price, monthly_credits, features 
FROM public.subscription_plans;
