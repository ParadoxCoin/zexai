-- Migration: 20260429_fix_video_models_columns.sql
-- Fix missing columns in video_models table that cause sync/insert errors

ALTER TABLE video_models 
ADD COLUMN IF NOT EXISTS quality INTEGER,
ADD COLUMN IF NOT EXISTS speed TEXT,
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_caps JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS durations INTEGER[] DEFAULT '{}';

-- Optional: Sync quality/speed with existing rating columns if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='video_models' AND column_name='quality_rating') THEN
        UPDATE video_models SET quality = quality_rating WHERE quality IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='video_models' AND column_name='speed_rating') THEN
        -- speed_rating is int, speed is text. We can map them.
        UPDATE video_models SET speed = CASE 
            WHEN speed_rating >= 4 THEN 'very_fast'
            WHEN speed_rating = 3 THEN 'fast'
            WHEN speed_rating = 2 THEN 'medium'
            ELSE 'slow'
        END WHERE speed IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='video_models' AND column_name='duration_options') THEN
        UPDATE video_models SET durations = duration_options WHERE durations IS NULL OR durations = '{}';
    END IF;
END $$;
