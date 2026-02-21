-- Gamification System Tables
-- Daily Streak, XP, Levels, Achievements

-- User Gamification Stats
CREATE TABLE IF NOT EXISTS user_gamification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Level & XP
    level INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    
    -- Streak
    streak_days INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_daily_claim TIMESTAMPTZ,
    last_login_date DATE,
    
    -- Stats
    total_images_generated INTEGER DEFAULT 0,
    total_videos_generated INTEGER DEFAULT 0,
    total_audio_generated INTEGER DEFAULT 0,
    total_chat_messages INTEGER DEFAULT 0,
    total_referrals INTEGER DEFAULT 0,
    
    -- Bonus multiplier (from level)
    credit_bonus_percent DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Level Definitions
CREATE TABLE IF NOT EXISTS gamification_levels (
    level INTEGER PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    required_xp INTEGER NOT NULL,
    credit_bonus_percent DECIMAL(5,2) DEFAULT 0,
    description TEXT
);

-- Insert Level Definitions
INSERT INTO gamification_levels (level, name, emoji, required_xp, credit_bonus_percent, description) 
VALUES 
    (1, 'Starter', '🌱', 0, 0, 'Yolculuğun başındayız'),
    (2, 'Creator', '🎨', 500, 5, 'İlk adımlar atıldı'),
    (3, 'Artist', '✨', 2000, 10, 'Yetenekler gelişiyor'),
    (4, 'Pro', '⭐', 5000, 15, 'Profesyonel seviye'),
    (5, 'Master', '💎', 15000, 20, 'Ustalaşma yolunda'),
    (6, 'Legend', '👑', 50000, 25, 'Efsane statüsü')
ON CONFLICT (level) DO NOTHING;

-- Achievement Definitions
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    emoji VARCHAR(10) NOT NULL,
    category VARCHAR(50), -- creation, streak, social, purchase
    xp_reward INTEGER DEFAULT 0,
    credit_reward INTEGER DEFAULT 0,
    requirement_type VARCHAR(50), -- count, streak, referral, purchase
    requirement_value INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Achievements
INSERT INTO achievements (id, name, description, emoji, category, xp_reward, credit_reward, requirement_type, requirement_value) 
VALUES
    -- Creation achievements
    ('first_image', 'İlk Adım', 'İlk görselini oluştur', '🎨', 'creation', 50, 10, 'images', 1),
    ('image_10', 'Görsel Ustası', '10 görsel oluştur', '🖼️', 'creation', 100, 25, 'images', 10),
    ('image_100', 'Galeri Sahibi', '100 görsel oluştur', '🏛️', 'creation', 500, 100, 'images', 100),
    ('first_video', 'Yönetmen', 'İlk videonu oluştur', '🎬', 'creation', 75, 15, 'videos', 1),
    ('video_10', 'Film Yapımcısı', '10 video oluştur', '📹', 'creation', 150, 50, 'videos', 10),
    ('first_audio', 'Ses Mühendisi', 'İlk sesini oluştur', '🎵', 'creation', 50, 10, 'audio', 1),
    ('audio_50', 'Ses Ustası', '50 ses oluştur', '🎧', 'creation', 200, 50, 'audio', 50),
    
    -- Streak achievements
    ('streak_7', 'Haftalık Bağımlı', '7 gün streak', '🔥', 'streak', 100, 50, 'streak', 7),
    ('streak_30', 'Aylık Kahraman', '30 gün streak', '💪', 'streak', 500, 200, 'streak', 30),
    ('streak_100', 'Streak Efsanesi', '100 gün streak', '🏆', 'streak', 2000, 500, 'streak', 100),
    
    -- Social achievements
    ('first_referral', 'Elçi', 'İlk arkadaşını davet et', '👋', 'social', 100, 100, 'referrals', 1),
    ('referral_5', 'Sosyal Kelebek', '5 arkadaş davet et', '🦋', 'social', 300, 250, 'referrals', 5),
    ('referral_20', 'Influencer', '20 arkadaş davet et', '⭐', 'social', 1000, 500, 'referrals', 20),
    
    -- Level achievements
    ('level_creator', 'Creator', 'Seviye 2ye ulaş', '🎨', 'level', 0, 25, 'level', 2),
    ('level_artist', 'Artist', 'Seviye 3e ulaş', '✨', 'level', 0, 50, 'level', 3),
    ('level_pro', 'Pro', 'Seviye 4e ulaş', '⭐', 'level', 0, 100, 'level', 4),
    ('level_master', 'Master', 'Seviye 5e ulaş', '💎', 'level', 0, 200, 'level', 5),
    ('level_legend', 'Legend', 'Seviye 6ya ulaş', '👑', 'level', 0, 500, 'level', 6)
ON CONFLICT (id) DO NOTHING;

-- User Achievements (earned)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL REFERENCES achievements(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    notified BOOLEAN DEFAULT FALSE,
    
    UNIQUE(user_id, achievement_id)
);

-- Leaderboard (weekly snapshots)
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL, -- 'weekly', 'monthly', 'all_time'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, period_type, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_level ON user_gamification(level);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(rank) WHERE period_type = 'weekly';

-- RLS Policies
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gamification" ON user_gamification
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view leaderboard" ON leaderboard
    FOR SELECT USING (true);

-- Function to initialize gamification for new users
CREATE OR REPLACE FUNCTION init_user_gamification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_gamification (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created_gamification ON auth.users;
CREATE TRIGGER on_auth_user_created_gamification
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION init_user_gamification();
