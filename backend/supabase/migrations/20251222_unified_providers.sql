-- =============================================
-- Provider-Model Unified Architecture
-- Migration: 20251222_unified_providers.sql
-- =============================================

-- 1. PROVIDERS TABLE
-- Stores all video/AI service providers
CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,  -- 'kie', 'pollo', 'fal', 'replicate'
    name TEXT NOT NULL,
    display_name TEXT,
    base_url TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🔌',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,  -- Lower = higher priority
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for provider queries
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(is_active);


-- 2. VIDEO_MODELS TABLE
-- Stores all video generation models
CREATE TABLE IF NOT EXISTS video_models (
    id TEXT PRIMARY KEY,  -- 'kling26_hd_5s', 'veo31_text'
    provider_id TEXT REFERENCES providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    model_type TEXT NOT NULL DEFAULT 'text_to_video',  -- text_to_video, image_to_video, video_to_video
    endpoint TEXT NOT NULL,  -- '/kling/v2.6/standard/generate'
    
    -- Pricing
    credits INTEGER NOT NULL DEFAULT 100,
    cost_usd DECIMAL(10,4) DEFAULT 0.30,
    
    -- Capabilities
    duration_options INTEGER[] DEFAULT '{5}',
    aspect_ratios TEXT[] DEFAULT '{"16:9", "9:16", "1:1"}',
    max_resolution TEXT DEFAULT '1080p',
    supports_audio BOOLEAN DEFAULT false,
    supports_camera_control BOOLEAN DEFAULT false,
    
    -- Display
    icon TEXT DEFAULT '🎬',
    badge TEXT,  -- '🔥 En Yeni!', '⚡ Hızlı'
    quality_rating INTEGER DEFAULT 3,  -- 1-5
    speed_rating INTEGER DEFAULT 3,    -- 1-5
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 100,
    
    -- Metadata
    parameters JSONB DEFAULT '{}',  -- Additional model-specific params
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for video_models
CREATE INDEX IF NOT EXISTS idx_video_models_provider ON video_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_video_models_active ON video_models(is_active);
CREATE INDEX IF NOT EXISTS idx_video_models_type ON video_models(model_type);
CREATE INDEX IF NOT EXISTS idx_video_models_featured ON video_models(is_featured) WHERE is_featured = true;


-- 3. PROVIDER_KEYS TABLE
-- Stores API keys for providers (plain text - admin access only)
CREATE TABLE IF NOT EXISTS provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id TEXT REFERENCES providers(id) ON DELETE CASCADE,
    key_name TEXT DEFAULT 'primary',  -- 'primary', 'backup'
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider_id, key_name)
);

-- Index for key lookups
CREATE INDEX IF NOT EXISTS idx_provider_keys_active ON provider_keys(provider_id, is_active);


-- 4. RLS POLICIES
-- Providers - public read, admin write
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active providers" ON providers
    FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage providers" ON providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Video Models - public read, admin write
ALTER TABLE video_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active models" ON video_models
    FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage models" ON video_models
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Provider Keys - admin only
ALTER TABLE provider_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can access keys" ON provider_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );


-- 5. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_providers_updated_at ON providers;
CREATE TRIGGER update_providers_updated_at
    BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_models_updated_at ON video_models;
CREATE TRIGGER update_video_models_updated_at
    BEFORE UPDATE ON video_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_provider_keys_updated_at ON provider_keys;
CREATE TRIGGER update_provider_keys_updated_at
    BEFORE UPDATE ON provider_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================
-- SEED DATA: PROVIDERS
-- =============================================

INSERT INTO providers (id, name, display_name, base_url, description, icon, priority) VALUES
('kie', 'kie.ai', 'Kie.ai', 'https://api.kie.ai/api/v1', 'Uygun fiyatlı premium modeller', '🔮', 10),
('fal', 'fal.ai', 'Fal.ai', 'https://fal.run', 'Hızlı ve güvenilir', '⚡', 20),
('replicate', 'Replicate', 'Replicate', 'https://api.replicate.com/v1', 'Açık kaynak modeller', '🔄', 30),
('pollo', 'Pollo.ai', 'Pollo.ai', 'https://api.pollo.ai/v1', 'Video efektleri', '🎬', 40)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    base_url = EXCLUDED.base_url,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    priority = EXCLUDED.priority;


-- =============================================
-- SEED DATA: VIDEO MODELS
-- =============================================

-- KIE.AI MODELS
INSERT INTO video_models (id, provider_id, name, display_name, model_type, endpoint, credits, duration_options, quality_rating, speed_rating, badge, is_featured, sort_order) VALUES
-- Veo 3.1
('kie_veo31_quality', 'kie', 'Veo 3.1 Quality', 'Google Veo 3.1 (Quality)', 'text_to_video', '/video/veo3.1-quality/generate', 120, '{5}', 5, 2, '🎬 Ultra HD', true, 1),
('kie_veo31_fast', 'kie', 'Veo 3.1 Fast', 'Google Veo 3.1 (Fast)', 'text_to_video', '/video/veo3.1-fast/generate', 80, '{5}', 4, 4, '⚡ Hızlı', false, 2),
-- Kling 2.6
('kie_kling26_hd_5s', 'kie', 'Kling 2.6 HD 5s', 'Kling 2.6 HD', 'text_to_video', '/kling/v2.6/standard/generate', 50, '{5}', 4, 3, NULL, false, 10),
('kie_kling26_hd_10s', 'kie', 'Kling 2.6 HD 10s', 'Kling 2.6 HD Extended', 'text_to_video', '/kling/v2.6/standard/generate', 100, '{10}', 4, 2, NULL, false, 11),
('kie_kling26_pro_5s', 'kie', 'Kling 2.6 Pro 5s', 'Kling 2.6 Pro', 'text_to_video', '/kling/v2.6/pro/generate', 80, '{5}', 5, 2, '👑 Pro', false, 12),
('kie_kling26_audio_5s', 'kie', 'Kling 2.6 Audio 5s', 'Kling 2.6 with Audio', 'text_to_video', '/kling/v2.6/audio/generate', 70, '{5}', 4, 3, '🎵 Sesli', true, 13),
('kie_kling26_audio_10s', 'kie', 'Kling 2.6 Audio 10s', 'Kling 2.6 Audio Extended', 'text_to_video', '/kling/v2.6/audio/generate', 140, '{10}', 4, 2, '🎵 Sesli', false, 14),
-- Runway Aleph
('kie_runway_aleph_5s', 'kie', 'Runway Aleph 5s', 'Runway Aleph', 'text_to_video', '/runway/aleph/generate', 100, '{5}', 5, 3, '✨ Premium', false, 20),
('kie_runway_aleph_10s', 'kie', 'Runway Aleph 10s', 'Runway Aleph Extended', 'text_to_video', '/runway/aleph/generate', 200, '{10}', 5, 2, NULL, false, 21),
-- Wan 2.6
('kie_wan26_fast', 'kie', 'Wan 2.6 Fast', 'Wan 2.6 Fast', 'text_to_video', '/wan2.5-t2v-preview/generate', 40, '{5}', 3, 5, '⚡ En Hızlı', false, 30),
('kie_wan26_hd', 'kie', 'Wan 2.6 HD', 'Wan 2.6 HD', 'text_to_video', '/wan2.5-t2v-preview/generate', 60, '{5}', 4, 3, NULL, false, 31),
-- Hailuo/Minimax
('kie_hailuo23_fast', 'kie', 'Hailuo 2.3 Fast', 'Hailuo 2.3 Fast', 'text_to_video', '/minimax/generate', 45, '{5}', 3, 4, NULL, false, 40),
('kie_hailuo23_hd', 'kie', 'Hailuo 2.3 HD', 'Hailuo 2.3 HD', 'text_to_video', '/minimax/generate', 70, '{5}', 4, 3, NULL, false, 41),
-- Sora 2
('kie_sora2_pro_10s', 'kie', 'Sora 2 Pro 10s', 'OpenAI Sora 2 Pro', 'text_to_video', '/sora/sora2-pro-10s/generate', 150, '{10}', 5, 2, '🌟 OpenAI', true, 50),
('kie_sora2_pro_15s', 'kie', 'Sora 2 Pro 15s', 'OpenAI Sora 2 Pro Extended', 'text_to_video', '/sora/sora2-pro-15s/generate', 220, '{15}', 5, 1, NULL, false, 51),
-- Image to Video
('kie_kling26_i2v', 'kie', 'Kling 2.6 Image', 'Kling 2.6 Image to Video', 'image_to_video', '/kling/v2.6/standard/i2v/generate', 60, '{5}', 4, 3, NULL, false, 100),
('kie_runway_i2v', 'kie', 'Runway I2V', 'Runway Image to Video', 'image_to_video', '/runway/i2v/generate', 80, '{5}', 5, 3, NULL, false, 101)
ON CONFLICT (id) DO UPDATE SET
    provider_id = EXCLUDED.provider_id,
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    model_type = EXCLUDED.model_type,
    endpoint = EXCLUDED.endpoint,
    credits = EXCLUDED.credits,
    duration_options = EXCLUDED.duration_options,
    quality_rating = EXCLUDED.quality_rating,
    speed_rating = EXCLUDED.speed_rating,
    badge = EXCLUDED.badge,
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order;


-- POLLO.AI EFFECTS (as models)
INSERT INTO video_models (id, provider_id, name, display_name, model_type, endpoint, credits, icon, quality_rating) VALUES
('pollo_ai_kissing', 'pollo', 'AI Kissing', 'AI Kissing Effect', 'effect', '/effects/apply', 20, '💋', 4),
('pollo_ai_hug', 'pollo', 'AI Hug', 'AI Hug Effect', 'effect', '/effects/apply', 20, '🤗', 4),
('pollo_earth_zoom', 'pollo', 'Earth Zoom', 'Earth Zoom Effect', 'effect', '/effects/apply', 30, '🌍', 4),
('pollo_360_rotation', 'pollo', 'A 360° Rotation', '360° Rotation Effect', 'effect', '/effects/apply', 25, '🔄', 3)
ON CONFLICT (id) DO UPDATE SET
    provider_id = EXCLUDED.provider_id,
    name = EXCLUDED.name,
    endpoint = EXCLUDED.endpoint,
    credits = EXCLUDED.credits,
    icon = EXCLUDED.icon;


-- =============================================
-- GRANT SERVICE ROLE ACCESS
-- =============================================

GRANT SELECT ON providers TO authenticated;
GRANT SELECT ON video_models TO authenticated;
GRANT ALL ON providers TO service_role;
GRANT ALL ON video_models TO service_role;
GRANT ALL ON provider_keys TO service_role;
