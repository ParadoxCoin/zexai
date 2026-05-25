-- =============================================================
-- ZexAi - Atomic Credit Operations (Race Condition Prevention)
-- =============================================================
-- Bu dosyadaki fonksiyonları Supabase SQL Editor veya migration
-- aracılığıyla çalıştırın. Her fonksiyon tek bir PostgreSQL
-- transaction içinde çalışır ve race condition'ı engeller.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. atomic_deduct_credits
--    Bakiyeyi koşullu olarak tek bir UPDATE ile düşürür.
--    Bakiye yetersizse exception fırlatır (Python'a CreditInsufficientError map edilir).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atomic_deduct_credits(
    p_user_id    UUID,
    p_cost       NUMERIC,
    p_service_type TEXT DEFAULT 'unknown',
    p_details    JSONB  DEFAULT '{}'::JSONB
)
RETURNS NUMERIC  -- Yeni bakiyeyi döndürür
LANGUAGE plpgsql
SECURITY DEFINER  -- Service role yetkisiyle çalışır
AS $$
DECLARE
    v_new_balance NUMERIC;
BEGIN
    -- Tek UPDATE ile koşullu düşüş (credits_balance >= p_cost şartı)
    UPDATE public.user_credits
    SET
        credits_balance = credits_balance - p_cost,
        updated_at      = NOW()
    WHERE
        user_id = p_user_id
        AND credits_balance >= p_cost
    RETURNING credits_balance INTO v_new_balance;

    -- Satır güncellenemediyse: ya kullanıcı yok, ya da bakiye yetersiz
    IF NOT FOUND THEN
        RAISE EXCEPTION 'INSUFFICIENT_CREDITS'
            USING DETAIL = format('user_id=%s cost=%s', p_user_id, p_cost);
    END IF;

    -- Aynı transaction içinde usage_logs kaydı
    INSERT INTO public.usage_logs (
        id,
        user_id,
        service_type,
        cost,
        details,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        p_service_type,
        p_cost,
        p_details,
        NOW()
    );

    RETURN v_new_balance;
END;
$$;

-- ---------------------------------------------------------------
-- 2. atomic_add_credits
--    Krediye atomik olarak ekler (satın alma, refund, ödül).
--    Bakiye yoksa yeni kayıt oluşturur (upsert).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atomic_add_credits(
    p_user_id    UUID,
    p_amount     NUMERIC,
    p_service_type TEXT DEFAULT 'credit_purchase',
    p_details    JSONB  DEFAULT '{}'::JSONB
)
RETURNS NUMERIC  -- Yeni bakiyeyi döndürür
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance NUMERIC;
BEGIN
    -- Upsert: kayıt varsa ekle, yoksa oluştur
    INSERT INTO public.user_credits (user_id, credits_balance, updated_at)
    VALUES (p_user_id, p_amount, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        credits_balance = public.user_credits.credits_balance + EXCLUDED.credits_balance,
        updated_at      = NOW()
    RETURNING credits_balance INTO v_new_balance;

    -- usage_logs kaydı (negatif cost = kredi ekleme)
    INSERT INTO public.usage_logs (
        id,
        user_id,
        service_type,
        cost,
        details,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        p_service_type,
        -p_amount,   -- negatif = kullanıcıya ekleme
        p_details,
        NOW()
    );

    RETURN v_new_balance;
END;
$$;

-- ---------------------------------------------------------------
-- 3. İzinleri service_role'e ver (anon erişimi engelle)
-- ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.atomic_deduct_credits FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atomic_add_credits FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.atomic_deduct_credits TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_add_credits TO service_role;

-- ---------------------------------------------------------------
-- 4. user_credits tablosunda user_id sütununun UNIQUE olduğundan
--    emin ol (ON CONFLICT için gerekli)
-- ---------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_credits'::regclass
          AND contype = 'u'
          AND conname = 'user_credits_user_id_key'
    ) THEN
        ALTER TABLE public.user_credits ADD CONSTRAINT user_credits_user_id_key UNIQUE (user_id);
    END IF;
END
$$;
