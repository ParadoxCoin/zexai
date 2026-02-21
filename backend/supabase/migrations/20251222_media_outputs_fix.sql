-- COMPLETE FIX: Drop and recreate media_outputs table
-- Run this in Supabase SQL Editor

DROP TABLE IF EXISTS media_outputs CASCADE;

CREATE TABLE media_outputs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    service_type TEXT NOT NULL,
    file_url TEXT DEFAULT '',
    thumbnail_url TEXT,
    prompt TEXT NOT NULL,
    model_name TEXT,
    generation_details JSONB DEFAULT '{}',
    credits_charged NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    is_showcase BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    provider TEXT,
    provider_task_id TEXT
);

CREATE INDEX idx_media_outputs_user_id ON media_outputs(user_id);
CREATE INDEX idx_media_outputs_service_type ON media_outputs(service_type);

ALTER TABLE media_outputs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON media_outputs TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
