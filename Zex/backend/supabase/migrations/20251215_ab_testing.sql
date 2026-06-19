-- Migration: Create A/B testing tables
-- Run this on Supabase SQL Editor

-- A/B Tests table
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    test_type TEXT NOT NULL CHECK (test_type IN ('image', 'video', 'chat', 'audio')),
    prompt TEXT NOT NULL,
    model_ids TEXT[] NOT NULL,
    config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test results table
CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    success BOOLEAN DEFAULT false,
    response_time_ms INTEGER,
    first_token_ms INTEGER,
    cost_credits NUMERIC(10, 2),
    output_url TEXT,
    error_message TEXT,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_type ON ab_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_ab_tests_created ON ab_tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_results_test ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_results_model ON ab_test_results(model_id);
CREATE INDEX IF NOT EXISTS idx_ab_results_success ON ab_test_results(success);

-- Enable RLS
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if exists)
DROP POLICY IF EXISTS "Service role full access on ab_tests" ON ab_tests;
DROP POLICY IF EXISTS "Service role full access on ab_test_results" ON ab_test_results;
DROP POLICY IF EXISTS "Admins can view ab_tests" ON ab_tests;
DROP POLICY IF EXISTS "Admins can view ab_test_results" ON ab_test_results;

CREATE POLICY "Service role full access on ab_tests" ON ab_tests
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on ab_test_results" ON ab_test_results
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Admins can view all tests
CREATE POLICY "Admins can view ab_tests" ON ab_tests
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'moderator')
        )
    );

CREATE POLICY "Admins can view ab_test_results" ON ab_test_results
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'moderator')
        )
    );

-- Update trigger
CREATE OR REPLACE FUNCTION update_ab_tests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ab_tests_updated_at ON ab_tests;
CREATE TRIGGER trigger_update_ab_tests_updated_at
    BEFORE UPDATE ON ab_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_ab_tests_updated_at();

-- Comments
COMMENT ON TABLE ab_tests IS 'A/B test configurations for comparing AI models';
COMMENT ON TABLE ab_test_results IS 'Results from A/B test executions';
COMMENT ON COLUMN ab_tests.model_ids IS 'Array of model IDs to test';
COMMENT ON COLUMN ab_test_results.response_time_ms IS 'Total response time in milliseconds';
