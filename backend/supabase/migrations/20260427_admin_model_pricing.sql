-- Migration: 20260427_admin_model_pricing.sql
-- Add pricing and parameter columns to video_models for admin management

ALTER TABLE video_models 
ADD COLUMN IF NOT EXISTS base_duration INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS per_second_pricing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quality_multipliers JSONB DEFAULT '{"720p": 1.0, "1080p": 1.5, "4K": 2.5}',
ADD COLUMN IF NOT EXISTS base_name TEXT,
ADD COLUMN IF NOT EXISTS version_name TEXT,
ADD COLUMN IF NOT EXISTS slider_duration BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS resolutions TEXT[] DEFAULT '{"720p", "1080p", "4K"}';

-- Update existing models with base_name if missing
UPDATE video_models SET base_name = split_part(name, ' ', 1) WHERE base_name IS NULL;

-- Seed Veo 3 and other missing models
INSERT INTO video_models (id, provider_id, name, display_name, model_type, endpoint, credits, duration_options, quality_rating, speed_rating, badge, is_featured, sort_order, resolutions, base_duration, per_second_pricing) VALUES
('kie_veo3_quality', 'kie', 'Veo 3 Quality', 'Google Veo 3 (Quality)', 'text_to_video', '/video/veo3-quality/generate', 150, '{4,6,8}', 5, 2, '🎬 4K Ultra', true, 0, '{"720p", "1080p", "4K"}', 4, true),
('kie_veo3_fast', 'kie', 'Veo 3 Fast', 'Google Veo 3 (Fast)', 'text_to_video', '/video/veo3-fast/generate', 100, '{4,6,8}', 4, 4, '⚡ Hızlı', false, 1, '{"720p", "1080p", "4K"}', 4, true),
('kie_kling26_hd_5s', 'kie', 'Kling 2.6 HD 5s', 'Kling 2.6 HD', 'text_to_video', '/kling/v2.6/standard/generate', 50, '{5,10}', 4, 3, NULL, false, 10, '{"720p", "1080p"}', 5, true)
ON CONFLICT (id) DO UPDATE SET
    duration_options = EXCLUDED.duration_options,
    resolutions = EXCLUDED.resolutions,
    base_duration = EXCLUDED.base_duration,
    per_second_pricing = EXCLUDED.per_second_pricing,
    credits = EXCLUDED.credits;
