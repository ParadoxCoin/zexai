-- Migration for presale referral tracking
CREATE TYPE presale_event_type AS ENUM ('welcome_bounty', 'purchase_commission');

CREATE TABLE IF NOT EXISTS public.presale_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_wallet VARCHAR(42) NOT NULL,
    referred_wallet VARCHAR(42) NOT NULL,
    event_type presale_event_type NOT NULL,
    zex_amount DECIMAL NOT NULL,
    distributed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast queries
CREATE INDEX idx_presale_referrals_referrer ON public.presale_referrals(referrer_wallet);
CREATE INDEX idx_presale_referrals_distributed ON public.presale_referrals(distributed);

-- Enable RLS
ALTER TABLE public.presale_referrals ENABLE ROW LEVEL SECURITY;

-- Allow insert from anon/authenticated (Edge Function will use service role or anon key with proper checks)
CREATE POLICY "Enable insert for all" ON public.presale_referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for all" ON public.presale_referrals FOR SELECT USING (true);
