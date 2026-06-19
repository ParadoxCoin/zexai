-- ============================================================
-- ZexAI Add item_id Column Migration
-- Run this in Supabase SQL Editor to support Subscriptions!
-- ============================================================

ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS item_id TEXT;

-- Verify columns of pending_payments
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pending_payments';
