-- Migration: Phase 7 Billing System Enhancement
-- Subscription Plans, Credit Config, Promo Codes, Special Packages
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Subscription Plans Table (Admin Editable)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL,
  monthly_credits INTEGER NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans
INSERT INTO subscription_plans (id, name, display_name, monthly_price, monthly_credits, description, features, sort_order) VALUES
  ('basic', 'basic', 'Basic', 25.00, 2500, 'Bireyler ve küçük projeler için ideal',
   '["2,500 kredi/ay", "Tüm AI servisleri", "Email destek"]', 1),
  ('pro', 'pro', 'Pro', 75.00, 8000, 'Profesyoneller ve büyüyen işletmeler için',
   '["8,000 kredi/ay", "Tüm AI servisleri", "Öncelikli destek", "Gelişmiş analitik"]', 2),
  ('enterprise', 'enterprise', 'Enterprise', 250.00, 30000, 'Büyük ekipler ve yoğun kullanım için',
   '["30,000 kredi/ay", "Tüm AI servisleri", "Özel destek", "SLA garantisi"]', 3)
ON CONFLICT (id) DO UPDATE SET
  monthly_price = EXCLUDED.monthly_price,
  monthly_credits = EXCLUDED.monthly_credits,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  updated_at = NOW();

-- ============================================
-- 2. Credit Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS credit_config (
  id SERIAL PRIMARY KEY,
  min_purchase_usd DECIMAL(10,2) DEFAULT 5,
  max_purchase_usd DECIMAL(10,2) DEFAULT 500,
  credits_per_usd INTEGER DEFAULT 100,
  bulk_discounts JSONB DEFAULT '{"50": 5, "100": 10, "250": 15, "500": 20}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- Seed default config
INSERT INTO credit_config (min_purchase_usd, max_purchase_usd, credits_per_usd, bulk_discounts)
SELECT 5, 500, 100, '{"50": 5, "100": 10, "250": 15, "500": 20}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM credit_config);

-- ============================================
-- 3. Subscription Duration Discounts
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_durations (
  id TEXT PRIMARY KEY,
  months INTEGER NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO subscription_durations (id, months, discount_percent, label) VALUES
  ('1_month', 1, 0, 'Aylık'),
  ('6_months', 6, 10, '6 Ay (%10 İndirim)'),
  ('12_months', 12, 20, 'Yıllık (%20 İndirim)')
ON CONFLICT (id) DO UPDATE SET
  discount_percent = EXCLUDED.discount_percent,
  label = EXCLUDED.label;

-- ============================================
-- 4. Promo Codes Table
-- ============================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'credits', 'trial')),
  discount_value DECIMAL(10,2) NOT NULL,
  applicable_to TEXT[] DEFAULT '{all}',
  min_purchase DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  specific_plans TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Create index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_until);

-- ============================================
-- 5. Promo Code Uses Table
-- ============================================
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id TEXT,
  discount_applied DECIMAL(10,2),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_uses_user ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_uses_code ON promo_code_uses(promo_code_id);

-- ============================================
-- 6. Special Packages Table
-- ============================================
CREATE TABLE IF NOT EXISTS special_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  original_price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2) NOT NULL,
  credits INTEGER NOT NULL,
  bonus_credits INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_purchases INTEGER,
  current_purchases INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  badge TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_packages_active ON special_packages(is_active, valid_until);

-- ============================================
-- 7. Seed Sample Promo Codes (Optional)
-- ============================================
INSERT INTO promo_codes (code, discount_type, discount_value, applicable_to, valid_until, is_active) VALUES
  ('WELCOME10', 'percent', 10, '{all}', NOW() + INTERVAL '1 year', true),
  ('BONUS500', 'credits', 500, '{all}', NOW() + INTERVAL '6 months', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 8. User Subscriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id TEXT REFERENCES subscription_plans(id),
  payment_method TEXT,
  status TEXT DEFAULT 'active', -- active, canceled, past_due, trialing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  duration_id TEXT DEFAULT '1_month',
  duration_months INTEGER DEFAULT 1,
  discount_applied DECIMAL(10,2) DEFAULT 0,
  promo_code_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- ============================================
-- Done!
-- ============================================
