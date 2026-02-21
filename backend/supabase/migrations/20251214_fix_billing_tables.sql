-- =======================================================================
-- Fix Credit Config & Add Promo Codes Table
-- =======================================================================
-- Bu migration:
-- 1. credit_config tablosunu düz sütunlu formata dönüştürür
-- 2. promo_codes tablosunu oluşturur
-- 3. subscription_plans tablosuna eksik sütunları ekler
-- =======================================================================

-- 1. credit_config tablosunu yeniden oluştur (düz sütunlarla)
DROP TABLE IF EXISTS credit_config CASCADE;

CREATE TABLE credit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_purchase_usd DECIMAL(10, 2) DEFAULT 5,
    max_purchase_usd DECIMAL(10, 2) DEFAULT 500,
    credits_per_usd INTEGER DEFAULT 100,
    bulk_discounts JSONB DEFAULT '{"50": 5, "100": 10, "250": 15, "500": 20}'::jsonb,
    payment_methods JSONB DEFAULT '{"card": {"enabled": true, "bonus": 0}, "crypto": {"enabled": true, "bonus": 5}}'::jsonb,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan kredi ayarları ekle
INSERT INTO credit_config (min_purchase_usd, max_purchase_usd, credits_per_usd, bulk_discounts)
VALUES (5, 500, 100, '{"50": 5, "100": 10, "250": 15, "500": 20}'::jsonb);

-- =======================================================================
-- 2. Promo Codes Table
-- =======================================================================
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'credits', 'trial')),
    discount_value DECIMAL(10, 2) NOT NULL,
    applicable_to TEXT[] DEFAULT ARRAY['all'],
    min_purchase DECIMAL(10, 2) DEFAULT 0,
    max_uses INTEGER,
    max_uses_per_user INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    specific_plans TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo codes index
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid ON promo_codes(valid_from, valid_until);

-- Örnek promo kod
INSERT INTO promo_codes (code, discount_type, discount_value, applicable_to, max_uses, is_active)
VALUES 
    ('WELCOME2024', 'percent', 20, ARRAY['all'], 1000, true),
    ('BONUS50', 'credits', 500, ARRAY['all'], 500, true)
ON CONFLICT (code) DO NOTHING;

-- =======================================================================
-- 3. subscription_plans tablosuna eksik sütunları ekle
-- =======================================================================
-- monthly_price ve monthly_credits sütunları ekle (varsa atla)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscription_plans' AND column_name = 'monthly_price') THEN
        ALTER TABLE subscription_plans ADD COLUMN monthly_price DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscription_plans' AND column_name = 'monthly_credits') THEN
        ALTER TABLE subscription_plans ADD COLUMN monthly_credits INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscription_plans' AND column_name = 'display_name') THEN
        ALTER TABLE subscription_plans ADD COLUMN display_name VARCHAR(100);
    END IF;
END $$;

-- Mevcut verileri güncelle (name'den display_name'e kopyala, fiyatları ayarla)
UPDATE subscription_plans 
SET display_name = COALESCE(display_name, name),
    monthly_price = COALESCE(monthly_price, 0),
    monthly_credits = COALESCE(monthly_credits, 0)
WHERE display_name IS NULL OR monthly_price IS NULL;

-- Planları güncelle (varsayılan fiyatlar) - sadece name sütununu kullan
UPDATE subscription_plans SET monthly_price = 26, monthly_credits = 2500 WHERE LOWER(name) = 'basic';
UPDATE subscription_plans SET monthly_price = 79, monthly_credits = 8000 WHERE LOWER(name) = 'pro';
UPDATE subscription_plans SET monthly_price = 253, monthly_credits = 30000 WHERE LOWER(name) = 'enterprise';
UPDATE subscription_plans SET monthly_price = 0, monthly_credits = 100 WHERE LOWER(name) = 'free';

-- =======================================================================
-- Özet:
-- - credit_config artık düz sütunlarla (API uyumlu)
-- - promo_codes tablosu eklendi
-- - subscription_plans'a monthly_price, monthly_credits, display_name eklendi
-- =======================================================================
