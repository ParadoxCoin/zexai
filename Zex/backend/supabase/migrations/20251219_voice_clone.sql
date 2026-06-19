-- Voice Clone Database Migration
-- Created: 2025-12-19

-- User's cloned voices
CREATE TABLE IF NOT EXISTS voice_clones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    elevenlabs_voice_id TEXT,
    sample_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    error_message TEXT,
    credit_cost INTEGER DEFAULT 100,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_clones_user ON voice_clones(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_clones_status ON voice_clones(status);

-- RLS
ALTER TABLE voice_clones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voices" ON voice_clones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own voices" ON voice_clones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voices" ON voice_clones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voices" ON voice_clones FOR DELETE USING (auth.uid() = user_id);
