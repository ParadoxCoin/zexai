-- ============================================================
-- ZexAI Payment Tables — Supabase SQL Migration
-- Çalıştırma: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── pending_payments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pending_payments (
    id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id              TEXT UNIQUE NOT NULL,
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type               TEXT NOT NULL DEFAULT 'flexible_credits',
    payment_method          TEXT NOT NULL,             -- lemonsqueezy | nowpayments | metamask
    amount_usd              DECIMAL(10, 2) NOT NULL,
    credits                 INTEGER NOT NULL DEFAULT 0,
    status                  TEXT NOT NULL DEFAULT 'pending', -- pending | completed | failed
    -- LemonSqueezy specific
    lemonsqueezy_order_id   TEXT,
    -- NowPayments specific
    nowpayments_payment_id  TEXT,
    paid_currency           TEXT,
    paid_amount             DECIMAL(18, 8),
    -- Timestamps
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── billing_transactions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_transactions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL DEFAULT 'purchase',  -- purchase | refund
    amount_usd      DECIMAL(10, 2) NOT NULL,
    credits_added   INTEGER NOT NULL DEFAULT 0,
    payment_method  TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'completed',
    session_id      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pending_payments_user_id     ON public.pending_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status      ON public.pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id ON public.billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created ON public.billing_transactions(created_at DESC);

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────
ALTER TABLE public.pending_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payments
DROP POLICY IF EXISTS "Users view own pending_payments"    ON public.pending_payments;
DROP POLICY IF EXISTS "Users view own billing_transactions" ON public.billing_transactions;

CREATE POLICY "Users view own pending_payments"
    ON public.pending_payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users view own billing_transactions"
    ON public.billing_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can do everything (for backend webhook processing)
CREATE POLICY "Service role full access pending_payments"
    ON public.pending_payments FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access billing_transactions"
    ON public.billing_transactions FOR ALL
    USING (auth.role() = 'service_role');

-- ── pending_payments'e ek sütun (eğer tablo zaten varsa) ─────────────────────
-- Aşağıdaki satırları sadece tablo ZATEN VARSA ve sütunlar eksikse çalıştır:
-- ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS lemonsqueezy_order_id TEXT;
-- ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS nowpayments_payment_id TEXT;
-- ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS paid_currency TEXT;
-- ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(18,8);
-- ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ── Doğrulama ─────────────────────────────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('pending_payments', 'billing_transactions')
ORDER BY table_name, ordinal_position;
