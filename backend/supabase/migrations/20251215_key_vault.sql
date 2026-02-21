-- Migration: Create provider_api_keys table for encrypted key storage
-- Run this on Supabase SQL Editor

-- Create the table for encrypted API keys
CREATE TABLE IF NOT EXISTS provider_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id TEXT NOT NULL,
    key_name TEXT NOT NULL DEFAULT 'primary',
    encrypted_key TEXT NOT NULL,
    key_prefix TEXT,  -- First/last 4 chars for identification (e.g., "sk-a1...xyz9")
    is_active BOOLEAN DEFAULT true,
    rotation_count INTEGER DEFAULT 0,
    last_rotated_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider_id, key_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_keys_provider ON provider_api_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_keys_active ON provider_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_provider_keys_created ON provider_api_keys(created_at DESC);

-- Enable RLS
ALTER TABLE provider_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only service role can access (not exposed to client)
CREATE POLICY "Service role full access on provider_api_keys" ON provider_api_keys
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- No public access - keys should only be managed via backend
CREATE POLICY "No public access on provider_api_keys" ON provider_api_keys
    FOR ALL
    TO anon, authenticated
    USING (false)
    WITH CHECK (false);

-- Trigger to update updated_at on modification
CREATE OR REPLACE FUNCTION update_provider_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_provider_api_keys_updated_at ON provider_api_keys;
CREATE TRIGGER trigger_update_provider_api_keys_updated_at
    BEFORE UPDATE ON provider_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_api_keys_updated_at();

-- Create audit log for key operations
CREATE TABLE IF NOT EXISTS key_vault_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID REFERENCES provider_api_keys(id) ON DELETE SET NULL,
    provider_id TEXT NOT NULL,
    key_name TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'create', 'rotate', 'delete', 'activate', 'deactivate'
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB
);

CREATE INDEX IF NOT EXISTS idx_key_vault_audit_key ON key_vault_audit(key_id);
CREATE INDEX IF NOT EXISTS idx_key_vault_audit_action ON key_vault_audit(action);
CREATE INDEX IF NOT EXISTS idx_key_vault_audit_date ON key_vault_audit(performed_at DESC);

-- RLS for audit table
ALTER TABLE key_vault_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on key_vault_audit" ON key_vault_audit
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE provider_api_keys IS 'Encrypted API key storage for providers';
COMMENT ON COLUMN provider_api_keys.encrypted_key IS 'Fernet encrypted API key - never expose!';
COMMENT ON COLUMN provider_api_keys.key_prefix IS 'Visible prefix for identification (e.g., sk-a1...xyz9)';
