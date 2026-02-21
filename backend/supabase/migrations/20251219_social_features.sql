-- Social Features Database Migration
-- Created: 2025-12-19

-- Content Interactions (likes, shares, showcase)
CREATE TABLE IF NOT EXISTS content_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'audio', 'avatar')),
    content_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('like', 'share', 'showcase')),
    platform TEXT, -- for shares: twitter, whatsapp, telegram, etc.
    is_public BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one like per user per content
    UNIQUE NULLS NOT DISTINCT (user_id, content_type, content_id, action)
);

-- Content Comments
CREATE TABLE IF NOT EXISTS content_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'audio', 'avatar')),
    content_id UUID NOT NULL,
    comment TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_content ON content_interactions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON content_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_showcase ON content_interactions(action, is_public) WHERE action = 'showcase' AND is_public = true;
CREATE INDEX IF NOT EXISTS idx_comments_content ON content_comments(content_type, content_id);

-- RLS Policies
ALTER TABLE content_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;

-- Interactions: users can manage their own
CREATE POLICY "Users can view all interactions" ON content_interactions FOR SELECT USING (true);
CREATE POLICY "Users can create own interactions" ON content_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own interactions" ON content_interactions FOR DELETE USING (auth.uid() = user_id);

-- Comments: users can manage their own, view public
CREATE POLICY "Users can view visible comments" ON content_comments FOR SELECT USING (is_visible = true);
CREATE POLICY "Users can create own comments" ON content_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON content_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON content_comments FOR DELETE USING (auth.uid() = user_id);
