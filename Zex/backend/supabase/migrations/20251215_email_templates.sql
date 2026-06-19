-- Migration: Create email templates table
-- Run this on Supabase SQL Editor

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Service role full access on email_templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can manage email_templates" ON email_templates;

CREATE POLICY "Service role full access on email_templates" ON email_templates
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage email_templates" ON email_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_templates_updated_at ON email_templates;
CREATE TRIGGER email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();

-- Insert default templates
INSERT INTO email_templates (type, subject, body_html, body_text, variables) VALUES
('welcome', '🎉 {{app_name}}''e Hoş Geldiniz!', '<html><body><h1>Hoş Geldiniz!</h1></body></html>', 'Hoş Geldiniz!', ARRAY['app_name', 'user_name', 'dashboard_url', 'credits', 'year']),
('password_reset', '🔐 Şifre Sıfırlama - {{app_name}}', '<html><body><h1>Şifre Sıfırlama</h1></body></html>', 'Şifre Sıfırlama', ARRAY['app_name', 'user_name', 'reset_url', 'expiry_hours', 'year']),
('payment_success', '✅ Ödeme Başarılı - {{app_name}}', '<html><body><h1>Ödeme Başarılı</h1></body></html>', 'Ödeme Başarılı', ARRAY['app_name', 'user_name', 'amount', 'description', 'date', 'new_balance', 'year']),
('credits_low', '⚠️ Krediniz Azaldı - {{app_name}}', '<html><body><h1>Krediniz Azaldı</h1></body></html>', 'Krediniz Azaldı', ARRAY['app_name', 'user_name', 'current_credits', 'credits_url', 'year'])
ON CONFLICT (type) DO NOTHING;
