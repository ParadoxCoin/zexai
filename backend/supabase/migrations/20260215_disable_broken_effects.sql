-- Disable non-working effects (require special APIs not available)
UPDATE video_effects SET is_active = false WHERE id IN (
    'ai_kissing',       -- Requires 2-face merge (not supported by I2V)
    'ai_hug',           -- Requires 2-person merge (not supported by I2V)
    'talking_avatar',   -- Requires TTS + lip sync
    'singing_avatar',   -- Requires audio + lip sync
    'celebrity_selfie', -- Requires face swap
    'baby_filter',      -- Requires face transform
    'age_progression',  -- Unreliable with I2V
    'age_regression'    -- Unreliable with I2V
);

-- Keep working effects active
UPDATE video_effects SET is_active = true WHERE id IN (
    'earth_zoom',
    '360_rotation',
    'zoom_out',
    'anime_style',
    'cartoon_style',
    'polaroid_duo',
    'ai_caricature'
);
