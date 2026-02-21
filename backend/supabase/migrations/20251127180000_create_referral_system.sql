-- Migration: Create Referral System Tables
-- Description: Adds tables for referral codes, tracking, earnings, and payouts.

-- 1. Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_referrals INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS idx_referral_code ON referral_codes(code);

-- 2. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES auth.users(id) NOT NULL,
    referred_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create referral_earnings table
CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES auth.users(id) NOT NULL,
    source_user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    purchase_amount DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(4, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    method VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'processing',
    tx_hash VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS (Row Level Security)
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- referral_codes: Users can read their own code. Public can read code to validate it.
CREATE POLICY "Users can read own referral code" ON referral_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read referral codes" ON referral_codes
    FOR SELECT USING (true); -- Needed for signup validation

-- referrals: Users can see who they referred.
CREATE POLICY "Users can see their referrals" ON referrals
    FOR SELECT USING (auth.uid() = referrer_id);

-- referral_earnings: Users can see their own earnings.
CREATE POLICY "Users can see their earnings" ON referral_earnings
    FOR SELECT USING (auth.uid() = referrer_id);

-- payouts: Users can see their own payouts.
CREATE POLICY "Users can see their payouts" ON payouts
    FOR SELECT USING (auth.uid() = user_id);
