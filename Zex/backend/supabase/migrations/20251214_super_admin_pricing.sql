-- =======================================================================
-- Super Admin Role & Dynamic Pricing Schema
-- =======================================================================
-- Bu migration:
-- 1. users tablosundaki role constraint'ini günceller (super_admin ekler)
-- 2. subscription_plans tablosu oluşturur (admin'den yönetilir)
-- 3. credit_config tablosu oluşturur (kredi fiyatlandırması)
-- =======================================================================

-- 1. Users tablosundaki role constraint'ini güncelle
-- Önce mevcut constraint'i kaldır
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Yeni constraint ekle (super_admin dahil)
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('customer', 'user', 'admin', 'super_admin', 'moderator', 'premium', 'free', 'basic', 'pro', 'enterprise'));

-- =======================================================================
-- 2. Subscription Plans (Admin'den Yönetilen Abonelik Planları)
-- =======================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id VARCHAR(50) UNIQUE NOT NULL, -- 'free', 'basic', 'pro', 'enterprise'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10, 2) DEFAULT NULL,
    credits_monthly INTEGER NOT NULL DEFAULT 0,
    features JSONB DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_subscription_plans_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_plans_timestamp ON subscription_plans;
CREATE TRIGGER update_subscription_plans_timestamp
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_plans_timestamp();

-- Varsayılan planlar ekle
INSERT INTO subscription_plans (plan_id, name, description, price_monthly, price_yearly, credits_monthly, features, is_popular, sort_order)
VALUES 
    ('free', 'Free', 'Ücretsiz başlangıç paketi', 0, 0, 100, 
     '["100 kredi/ay", "Temel AI modelleri", "Email destek"]'::jsonb, false, 1),
    ('basic', 'Basic', 'Bireysel kullanıcılar için', 19, 190, 2000, 
     '["2,000 kredi/ay", "Tüm AI modelleri", "Öncelikli işlem", "Email destek"]'::jsonb, false, 2),
    ('pro', 'Pro', 'Profesyonel kullanıcılar için', 49, 490, 6000, 
     '["6,000 kredi/ay", "Tüm AI modelleri", "API erişimi", "Öncelikli destek", "Gelişmiş analitik"]'::jsonb, true, 3),
    ('enterprise', 'Enterprise', 'Kurumsal çözümler', 149, 1490, 20000, 
     '["20,000 kredi/ay", "Özel AI modelleri", "Sınırsız API", "7/24 destek", "SLA garantisi", "Özel entegrasyon"]'::jsonb, false, 4)
ON CONFLICT (plan_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    credits_monthly = EXCLUDED.credits_monthly,
    features = EXCLUDED.features,
    is_popular = EXCLUDED.is_popular,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- =======================================================================
-- 3. Credit Config (Kredi Fiyatlandırma Ayarları)
-- =======================================================================
CREATE TABLE IF NOT EXISTS credit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_credit_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_credit_config_timestamp ON credit_config;
CREATE TRIGGER update_credit_config_timestamp
    BEFORE UPDATE ON credit_config
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_config_timestamp();

-- Varsayılan kredi ayarları
INSERT INTO credit_config (config_key, config_value, description)
VALUES 
    ('pricing', '{
        "credits_per_usd": 100,
        "min_purchase_usd": 5,
        "max_purchase_usd": 500
    }'::jsonb, 'Temel kredi fiyatlandırması'),
    
    ('bulk_discounts', '{
        "50": 5,
        "100": 10,
        "200": 15,
        "500": 25
    }'::jsonb, 'Toplu alım indirimleri (USD: yüzde)'),
    
    ('payment_methods', '{
        "card": {"enabled": true, "bonus_percent": 0},
        "crypto": {"enabled": true, "bonus_percent": 5},
        "binance": {"enabled": true, "bonus_percent": 5},
        "metamask": {"enabled": true, "bonus_percent": 15}
    }'::jsonb, 'Ödeme yöntemleri ve bonus oranları')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- =======================================================================
-- 4. Special Packages (Özel Kredi Paketleri) - Admin'den yönetilir
-- =======================================================================
CREATE TABLE IF NOT EXISTS special_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL,
    bonus_credits INTEGER DEFAULT 0,
    original_price DECIMAL(10, 2) NOT NULL,
    discounted_price DECIMAL(10, 2) NOT NULL,
    badge VARCHAR(50),
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan paketler
INSERT INTO special_packages (name, description, credits, bonus_credits, original_price, discounted_price, badge, is_featured, sort_order)
VALUES 
    ('Starter', 'Başlangıç paketi', 500, 0, 4.99, 4.99, NULL, false, 1),
    ('Basic', 'Temel ihtiyaçlar için', 1500, 150, 14.99, 12.99, '%13 İNDİRİM', false, 2),
    ('Popular', 'En çok tercih edilen', 5000, 1000, 49.99, 39.99, 'EN POPÜLER', true, 3),
    ('Pro', 'Profesyoneller için', 12000, 3000, 119.99, 89.99, '%25 TASARRUF', false, 4),
    ('Enterprise', 'Kurumsal çözüm', 30000, 10000, 299.99, 199.99, 'EN İYİ FİYAT', false, 5)
ON CONFLICT DO NOTHING;

-- Index for active packages
CREATE INDEX IF NOT EXISTS idx_special_packages_active ON special_packages(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, sort_order);

-- =======================================================================
-- Özet:
-- - users tablosunda artık super_admin rolü kullanılabilir
-- - subscription_plans: Abonelik planları (admin panelden yönetilir)
-- - credit_config: Kredi fiyatlandırma ayarları
-- - special_packages: Özel kredi paketleri
-- =======================================================================
