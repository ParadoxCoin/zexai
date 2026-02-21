-- Migration: Phase 8 Rate Limiting Enhancement
-- Tier-based limits and violation tracking
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Rate Limit Tiers Table
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limit_tiers (
  id TEXT PRIMARY KEY,
  tier_name TEXT NOT NULL,  -- free, basic, pro, enterprise
  service_type TEXT NOT NULL,  -- image, video, chat, synapse, api
  per_minute INTEGER NOT NULL DEFAULT 10,
  per_hour INTEGER,
  per_day INTEGER,
  burst_limit INTEGER DEFAULT 5,  -- max per 10 seconds
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier_name, service_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_tiers_tier ON rate_limit_tiers(tier_name);
CREATE INDEX IF NOT EXISTS idx_rate_tiers_service ON rate_limit_tiers(service_type);

-- ============================================
-- 2. Seed Default Tier Limits
-- ============================================
INSERT INTO rate_limit_tiers (id, tier_name, service_type, per_minute, per_hour, per_day, burst_limit) VALUES
  -- FREE tier
  ('free_image', 'free', 'image', 5, 30, 100, 2),
  ('free_video', 'free', 'video', 2, 10, 30, 1),
  ('free_chat', 'free', 'chat', 10, 100, 500, 3),
  ('free_synapse', 'free', 'synapse', 3, 20, 50, 1),
  ('free_api', 'free', 'api', 30, 500, 2000, 10),
  
  -- BASIC tier
  ('basic_image', 'basic', 'image', 20, 200, 1000, 5),
  ('basic_video', 'basic', 'video', 5, 50, 200, 2),
  ('basic_chat', 'basic', 'chat', 50, 500, 3000, 10),
  ('basic_synapse', 'basic', 'synapse', 10, 100, 500, 3),
  ('basic_api', 'basic', 'api', 100, 2000, 10000, 20),
  
  -- PRO tier
  ('pro_image', 'pro', 'image', 100, 1000, 5000, 20),
  ('pro_video', 'pro', 'video', 20, 200, 1000, 5),
  ('pro_chat', 'pro', 'chat', 200, 2000, 15000, 30),
  ('pro_synapse', 'pro', 'synapse', 50, 500, 3000, 10),
  ('pro_api', 'pro', 'api', 500, 10000, 50000, 50),
  
  -- ENTERPRISE tier
  ('ent_image', 'enterprise', 'image', 500, 5000, 50000, 50),
  ('ent_video', 'enterprise', 'video', 100, 1000, 10000, 20),
  ('ent_chat', 'enterprise', 'chat', 1000, 10000, 100000, 100),
  ('ent_synapse', 'enterprise', 'synapse', 200, 2000, 20000, 30),
  ('ent_api', 'enterprise', 'api', 2000, 50000, 500000, 200)
ON CONFLICT (id) DO UPDATE SET
  per_minute = EXCLUDED.per_minute,
  per_hour = EXCLUDED.per_hour,
  per_day = EXCLUDED.per_day,
  burst_limit = EXCLUDED.burst_limit,
  updated_at = NOW();

-- ============================================
-- 3. Rate Limit Violations Log
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address TEXT NOT NULL,
  service_type TEXT NOT NULL,
  limit_type TEXT NOT NULL,  -- per_minute, per_hour, per_day, burst
  limit_value INTEGER NOT NULL,
  current_usage INTEGER NOT NULL,
  user_tier TEXT,
  endpoint TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_user ON rate_limit_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_ip ON rate_limit_violations(ip_address);
CREATE INDEX IF NOT EXISTS idx_violations_time ON rate_limit_violations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_violations_service ON rate_limit_violations(service_type);

-- ============================================
-- 4. IP Blacklist for repeated offenders
-- ============================================
CREATE TABLE IF NOT EXISTS ip_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT UNIQUE NOT NULL,
  reason TEXT,
  blocked_until TIMESTAMPTZ,  -- NULL = permanent
  violation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_blacklist_ip ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_blacklist_until ON ip_blacklist(blocked_until);

-- ============================================
-- 5. User Rate Limit Status (for caching)
-- ============================================
CREATE TABLE IF NOT EXISTS user_rate_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_type TEXT NOT NULL,
  current_minute_usage INTEGER DEFAULT 0,
  current_hour_usage INTEGER DEFAULT 0,
  current_day_usage INTEGER DEFAULT 0,
  minute_reset_at TIMESTAMPTZ,
  hour_reset_at TIMESTAMPTZ,
  day_reset_at TIMESTAMPTZ,
  last_request_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_rate_status_user ON user_rate_status(user_id);

-- ============================================
-- Done!
-- ============================================
