-- Migration: Add email branding settings
-- Run this on Supabase SQL Editor

-- Email branding settings table
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'text', -- 'text', 'image', 'color', 'boolean'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_email_settings_key ON email_settings(setting_key);

-- Enable RLS
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on email_settings" ON email_settings;
DROP POLICY IF EXISTS "Admins can manage email_settings" ON email_settings;

CREATE POLICY "Service role full access on email_settings" ON email_settings
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage email_settings" ON email_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_settings_updated_at ON email_settings;
CREATE TRIGGER email_settings_updated_at
    BEFORE UPDATE ON email_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_email_settings_updated_at();

-- Insert default branding settings
INSERT INTO email_settings (setting_key, setting_value, setting_type, description) VALUES
('logo_url', '', 'image', 'Email header logo URL'),
('banner_url', '', 'image', 'Email banner/hero image URL'),
('primary_color', '#6366f1', 'color', 'Primary brand color'),
('secondary_color', '#8b5cf6', 'color', 'Secondary brand color'),
('background_color', '#f5f5f5', 'color', 'Email background color'),
('footer_text', '© {{year}} {{app_name}}. Tüm hakları saklıdır.', 'text', 'Email footer text'),
('social_facebook', '', 'text', 'Facebook URL'),
('social_twitter', '', 'text', 'Twitter/X URL'),
('social_instagram', '', 'text', 'Instagram URL'),
('social_linkedin', '', 'text', 'LinkedIn URL'),
('company_address', '', 'text', 'Company address for email footer'),
('unsubscribe_url', '', 'text', 'Unsubscribe link URL')
ON CONFLICT (setting_key) DO NOTHING;
