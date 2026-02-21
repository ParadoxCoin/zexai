-- Effect Packages and Purchase System
-- Migration for managing effect packages and tracking user purchases

-- ============================================
-- EFFECT PACKAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS effect_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📦',
    effects TEXT[] NOT NULL, -- Array of effect IDs
    discount_percent INTEGER DEFAULT 20,
    total_credits INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER PURCHASED PACKAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_purchased_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES effect_packages(id),
    credits_paid INTEGER NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_purchased_packages_user_id 
    ON user_purchased_packages(user_id);

CREATE INDEX IF NOT EXISTS idx_user_purchased_packages_package_id 
    ON user_purchased_packages(package_id);

CREATE INDEX IF NOT EXISTS idx_effect_packages_is_active 
    ON effect_packages(is_active);

-- ============================================
-- SEED DEFAULT PACKAGES
-- ============================================
INSERT INTO effect_packages (id, name, description, icon, effects, discount_percent, total_credits, is_active)
VALUES 
    ('romantic_pack', 'Romantik Paket', 'Sevgilinizle viral videolar için', '💕', 
     ARRAY['ai_kissing', 'ai_hug', '360_rotation'], 20, 80, true),
    
    ('viral_pack', 'Viral Paket', 'TikTok ve Instagram için', '🔥', 
     ARRAY['celebrity_selfie', 'earth_zoom', 'ai_caricature', 'baby_filter'], 22, 90, true),
    
    ('animation_pack', 'Animasyon Paketi', 'Çizgi film ve anime efektleri', '🎨', 
     ARRAY['anime_style', 'cartoon_style', 'oil_painting', 'watercolor'], 18, 70, true),
    
    ('avatar_pack', 'Avatar Paketi', 'Konuşan ve şarkı söyleyen avatarlar', '🗣️', 
     ARRAY['talking_avatar', 'singing_avatar', 'parallax_3d'], 25, 110, true),
    
    ('transform_pack', 'Dönüşüm Paketi', 'Yaş, stil ve hareket efektleri', '✨', 
     ARRAY['age_progression', 'age_regression', 'slow_motion', 'zoom_out'], 20, 85, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    effects = EXCLUDED.effects,
    discount_percent = EXCLUDED.discount_percent,
    total_credits = EXCLUDED.total_credits,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE effect_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchased_packages ENABLE ROW LEVEL SECURITY;

-- Everyone can view active packages
CREATE POLICY "Public can view active packages" ON effect_packages
    FOR SELECT USING (is_active = true);

-- Admins can manage packages (insert, update, delete)
CREATE POLICY "Admins can manage packages" ON effect_packages
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM user_roles WHERE role_id IN ('super_admin', 'admin')
        )
    );

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases" ON user_purchased_packages
    FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can insert purchases (via backend)
CREATE POLICY "Users can insert purchases" ON user_purchased_packages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_effect_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_effect_packages_updated_at ON effect_packages;
CREATE TRIGGER trigger_effect_packages_updated_at
    BEFORE UPDATE ON effect_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_effect_packages_updated_at();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE effect_packages IS 'Effect package bundles with discounts';
COMMENT ON TABLE user_purchased_packages IS 'User package purchase history';
COMMENT ON COLUMN effect_packages.effects IS 'Array of effect IDs included in this package';
COMMENT ON COLUMN effect_packages.discount_percent IS 'Discount percentage (e.g., 20 means 20% off)';
COMMENT ON COLUMN effect_packages.total_credits IS 'Total credits required to purchase (after discount)';
