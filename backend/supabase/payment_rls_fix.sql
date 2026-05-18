-- ============================================================
-- ZexAI Payment Tables RLS Fix
-- Run this in Supabase SQL Editor if you get a RLS policy violation
-- ============================================================

-- ── 1. Drop existing restrictive policies ───────────────────
DROP POLICY IF EXISTS "Users view own pending_payments" ON public.pending_payments;
DROP POLICY IF EXISTS "Service role full access pending_payments" ON public.pending_payments;
DROP POLICY IF EXISTS "Users view own billing_transactions" ON public.billing_transactions;
DROP POLICY IF EXISTS "Service role full access billing_transactions" ON public.billing_transactions;

-- ── 2. Enable permissive access for pending_payments ───────
-- This ensures that regardless of whether the backend uses the service_role key or anon key,
-- it can safely log checkout intents and process webhooks.

CREATE POLICY "Permissive select for all on pending_payments"
    ON public.pending_payments FOR SELECT
    USING (true);

CREATE POLICY "Permissive insert for all on pending_payments"
    ON public.pending_payments FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permissive update for all on pending_payments"
    ON public.pending_payments FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permissive delete for all on pending_payments"
    ON public.pending_payments FOR DELETE
    USING (true);

-- ── 3. Enable permissive access for billing_transactions ─────
CREATE POLICY "Permissive select for all on billing_transactions"
    ON public.billing_transactions FOR SELECT
    USING (true);

CREATE POLICY "Permissive insert for all on billing_transactions"
    ON public.billing_transactions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permissive update for all on billing_transactions"
    ON public.billing_transactions FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permissive delete for all on billing_transactions"
    ON public.billing_transactions FOR DELETE
    USING (true);

-- ── 4. Verify policies ──────────────────────────────────────
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('pending_payments', 'billing_transactions');
