-- V2V Models and Video Effects Migration (FIXED)
-- Created: 2026-01-06

-- ============================================
-- 1. ADD V2V MODELS
-- ============================================

INSERT INTO video_models (id, provider_id, name, display_name, model_type, endpoint, credits, duration_options, quality_rating, speed_rating, badge, is_active, sort_order)
VALUES
('kie_kling26_v2v', 'kie', 'Kling 2.6 V2V', 'Kling 2.6 Video Transform', 'video_to_video', '/kling/v2.6/v2v/generate', 80, '{5}', 4, 3, '🔄 V2V', true, 102),
('kie_runway_v2v', 'kie', 'Runway V2V', 'Runway Video Transform', 'video_to_video', '/runway/v2v/generate', 100, '{5,10}', 5, 3, '✨ Premium', true, 103)
ON CONFLICT (id) DO UPDATE SET
    provider_id = EXCLUDED.provider_id,
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    model_type = EXCLUDED.model_type,
    endpoint = EXCLUDED.endpoint,
    credits = EXCLUDED.credits;

-- ============================================
-- 2. CREATE VIDEO_EFFECTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS video_effects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'other',
    credits INTEGER DEFAULT 10,
    icon TEXT DEFAULT '✨',
    provider TEXT DEFAULT 'pollo',
    api_endpoint TEXT,
    requires_two_images BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. INSERT EFFECTS DATA
-- ============================================

INSERT INTO video_effects (id, name, description, category, credits, icon, requires_two_images, sort_order)
VALUES
('ai_kissing', 'AI Kissing', 'İki kişiyi öpüştüren viral efekt', 'romantic', 20, '💋', true, 1),
('ai_hug', 'AI Hug', 'İki kişiyi sarılan efekt', 'romantic', 20, '🤗', true, 2),
('earth_zoom', 'Earth Zoom In', 'Dünyadan fotoğrafınıza zoom efekti', 'transform', 30, '🌍', false, 10),
('360_rotation', '360° Rotation', 'Fotoğrafı 360 derece döndürme', 'transform', 24, '🔄', false, 11),
('zoom_out', 'AI Zoom Out', 'Fotoğraftan uzaklaşma efekti', 'transform', 20, '🔍', false, 12),
('celebrity_selfie', 'AI Selfie with Celebrities', 'Ünlülerle selfie çek', 'fun', 40, '🌟', false, 20),
('polaroid_duo', 'Polaroid Duo', 'Polaroid fotoğraf efekti', 'fun', 16, '📸', false, 21),
('ai_caricature', 'AI Caricature Maker', 'Karikatür efekti', 'fun', 20, '🎨', false, 22),
('baby_filter', 'AI Baby Filter', 'Bebek yüzü filtresi', 'fun', 20, '👶', false, 23),
('anime_style', 'AI Anime Style', 'Anime karakterine dönüştür', 'animation', 24, '🎌', false, 30),
('cartoon_style', 'AI Cartoon Style', 'Çizgi film karakterine dönüştür', 'animation', 24, '🎬', false, 31),
('talking_avatar', 'Photo to Video Avatar', 'Konuşan avatar oluştur', 'avatar', 50, '🗣️', false, 40),
('singing_avatar', 'AI Singing Avatar', 'Şarkı söyleyen avatar', 'avatar', 60, '🎤', false, 41),
('age_progression', 'AI Age Progression', 'Yaşlandırma efekti', 'time', 30, '👴', false, 50),
('age_regression', 'AI Age Regression', 'Gençleştirme efekti', 'time', 30, '👦', false, 51)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    credits = EXCLUDED.credits,
    icon = EXCLUDED.icon,
    requires_two_images = EXCLUDED.requires_two_images;

-- Enable RLS on video_effects
ALTER TABLE video_effects ENABLE ROW LEVEL SECURITY;

-- Drop and create policy for video_effects
DROP POLICY IF EXISTS "Allow public read on video_effects" ON video_effects;
CREATE POLICY "Allow public read on video_effects" ON video_effects FOR SELECT USING (true);

-- NOTE: effect_packages table has a different schema
-- Skipping effect_packages migration as it already exists with different columns
