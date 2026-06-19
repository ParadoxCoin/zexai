-- ZexAI - Son Giriş Zamanı Senkronizasyon Migrasyonu
-- Bu SQL kodunu Supabase SQL Editör paneline yapıştırıp çalıştırın.

-- 1. public.users tablosuna last_sign_in_at kolonunu ekle (varsa hata vermez)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- 2. Mevcut kullanıcıların son giriş zamanlarını tek seferlik senkronize et
UPDATE public.users u
SET last_sign_in_at = a.last_sign_in_at
FROM auth.users a
WHERE u.id = a.id;

-- 3. auth.users tablosunda last_sign_in_at değiştikçe tetiklenecek fonksiyonu oluştur
CREATE OR REPLACE FUNCTION public.handle_user_login_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET last_sign_in_at = NEW.last_sign_in_at,
        updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Tetikleyiciyi (Trigger) tanımla
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_login_update();
