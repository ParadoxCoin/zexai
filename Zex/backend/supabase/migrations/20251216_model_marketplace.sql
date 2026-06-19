-- Migration: Model Marketplace - Favorites & Ratings
-- Run this on Supabase SQL Editor

-- Model Favorites Table
CREATE TABLE IF NOT EXISTS model_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, model_id)
);

-- Model Ratings Table (just stars, no comments)
CREATE TABLE IF NOT EXISTS model_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, model_id)
);

-- Model Usage Stats Table (for popularity)
CREATE TABLE IF NOT EXISTS model_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT NOT NULL UNIQUE,
    total_uses INT DEFAULT 0,
    total_credits_spent DECIMAL(12,2) DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model Featured Flag (add to ai_models if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_models' AND column_name = 'is_featured') THEN
        ALTER TABLE ai_models ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_models' AND column_name = 'display_order') THEN
        ALTER TABLE ai_models ADD COLUMN display_order INT DEFAULT 100;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_model_favorites_user ON model_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_model_favorites_model ON model_favorites(model_id);
CREATE INDEX IF NOT EXISTS idx_model_ratings_model ON model_ratings(model_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_stats_model ON model_usage_stats(model_id);

-- Enable RLS
ALTER TABLE model_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for model_favorites
DROP POLICY IF EXISTS "Users can manage their own favorites" ON model_favorites;
CREATE POLICY "Users can manage their own favorites" ON model_favorites
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access on model_favorites" ON model_favorites;
CREATE POLICY "Service role full access on model_favorites" ON model_favorites
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- RLS Policies for model_ratings
DROP POLICY IF EXISTS "Users can manage their own ratings" ON model_ratings;
CREATE POLICY "Users can manage their own ratings" ON model_ratings
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can read ratings" ON model_ratings;
CREATE POLICY "Anyone can read ratings" ON model_ratings
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Service role full access on model_ratings" ON model_ratings;
CREATE POLICY "Service role full access on model_ratings" ON model_ratings
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- RLS Policies for model_usage_stats
DROP POLICY IF EXISTS "Anyone can read usage stats" ON model_usage_stats;
CREATE POLICY "Anyone can read usage stats" ON model_usage_stats
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Service role full access on model_usage_stats" ON model_usage_stats;
CREATE POLICY "Service role full access on model_usage_stats" ON model_usage_stats
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Trigger to update rating timestamp
CREATE OR REPLACE FUNCTION update_model_rating_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS model_ratings_updated_at ON model_ratings;
CREATE TRIGGER model_ratings_updated_at
    BEFORE UPDATE ON model_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_model_rating_timestamp();

-- Function to update model average rating
CREATE OR REPLACE FUNCTION update_model_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert usage stats with new average
    INSERT INTO model_usage_stats (model_id, avg_rating, rating_count, updated_at)
    SELECT 
        COALESCE(NEW.model_id, OLD.model_id),
        COALESCE(AVG(rating), 0),
        COUNT(*),
        NOW()
    FROM model_ratings 
    WHERE model_id = COALESCE(NEW.model_id, OLD.model_id)
    ON CONFLICT (model_id) 
    DO UPDATE SET 
        avg_rating = EXCLUDED.avg_rating,
        rating_count = EXCLUDED.rating_count,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_avg_rating_on_insert ON model_ratings;
CREATE TRIGGER update_avg_rating_on_insert
    AFTER INSERT OR UPDATE OR DELETE ON model_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_model_avg_rating();
