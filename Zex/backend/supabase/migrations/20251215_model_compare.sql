-- Migration: Create model comparisons table
-- Run this on Supabase SQL Editor

-- Model comparisons table
CREATE TABLE IF NOT EXISTS model_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    compare_type TEXT NOT NULL CHECK (compare_type IN ('image', 'video', 'chat', 'audio')),
    prompt TEXT NOT NULL,
    model_ids TEXT[] NOT NULL,
    results JSONB DEFAULT '[]',
    total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comparisons_user ON model_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_type ON model_comparisons(compare_type);
CREATE INDEX IF NOT EXISTS idx_comparisons_status ON model_comparisons(status);
CREATE INDEX IF NOT EXISTS idx_comparisons_created ON model_comparisons(created_at DESC);

-- Enable RLS
ALTER TABLE model_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if exists)
DROP POLICY IF EXISTS "Service role full access on model_comparisons" ON model_comparisons;
DROP POLICY IF EXISTS "Users can view own comparisons" ON model_comparisons;
DROP POLICY IF EXISTS "Users can create own comparisons" ON model_comparisons;

CREATE POLICY "Service role full access on model_comparisons" ON model_comparisons
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Users can view their own comparisons
CREATE POLICY "Users can view own comparisons" ON model_comparisons
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Users can create their own comparisons
CREATE POLICY "Users can create own comparisons" ON model_comparisons
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_model_comparisons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comparisons_updated_at ON model_comparisons;
CREATE TRIGGER trigger_update_comparisons_updated_at
    BEFORE UPDATE ON model_comparisons
    FOR EACH ROW
    EXECUTE FUNCTION update_model_comparisons_updated_at();

-- Comments
COMMENT ON TABLE model_comparisons IS 'Customer model comparison results';
COMMENT ON COLUMN model_comparisons.results IS 'JSONB array of comparison results per model';
COMMENT ON COLUMN model_comparisons.total_cost IS 'Total credits charged (with discount)';
