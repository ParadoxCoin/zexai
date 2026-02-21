-- Migration: Create media_outputs table for video/image/audio history
-- Run this in Supabase SQL Editor

-- Create media_outputs table if it doesn't exist
CREATE TABLE IF NOT EXISTS media_outputs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    service_type TEXT NOT NULL,
    file_url TEXT,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_media_outputs_user_id ON media_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_media_outputs_service_type ON media_outputs(service_type);
CREATE INDEX IF NOT EXISTS idx_media_outputs_created_at ON media_outputs(created_at DESC);

-- DISABLE RLS - backend uses service_role key which bypasses RLS anyway
ALTER TABLE media_outputs DISABLE ROW LEVEL SECURITY;

-- Grant all permissions
GRANT ALL ON media_outputs TO authenticated;
GRANT ALL ON media_outputs TO anon;
GRANT ALL ON media_outputs TO service_role;
