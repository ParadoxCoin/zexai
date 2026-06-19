-- Migration: RBAC Schema for Role-Based Access Control
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Add missing columns to users table
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- Update existing users to have role if null
UPDATE users SET role = 'customer' WHERE role IS NULL;
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- ============================================
-- 2. Create roles table
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  role_type TEXT DEFAULT 'staff', -- 'staff' or 'customer'
  is_system BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Create user_roles junction table
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id TEXT REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID,
  PRIMARY KEY (user_id, role_id)
);

-- ============================================
-- 4. Create permissions lookup table
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'ai', 'admin', 'profile', etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. Seed default permissions
-- ============================================
INSERT INTO permissions (id, name, category, description) VALUES
  -- AI Features (Customer)
  ('ai:video', 'Video Oluşturma', 'ai', 'Video oluşturma özelliğini kullanabilir'),
  ('ai:image', 'Görsel Oluşturma', 'ai', 'Görsel oluşturma özelliğini kullanabilir'),
  ('ai:audio', 'Ses/TTS', 'ai', 'Text-to-speech ve ses özelliklerini kullanabilir'),
  ('ai:chat', 'AI Chat', 'ai', 'AI chat özelliğini kullanabilir'),
  ('ai:synapse', 'Synapse', 'ai', 'Synapse ajan sistemini kullanabilir'),
  ('ai:priority', 'Öncelikli İşlem', 'ai', 'AI işlemlerinde öncelik alır'),
  -- Profile (Customer)
  ('profile:read', 'Profil Görüntüleme', 'profile', 'Kendi profilini görüntüleyebilir'),
  ('profile:update', 'Profil Güncelleme', 'profile', 'Kendi profilini güncelleyebilir'),
  ('credits:view', 'Kredi Görüntüleme', 'profile', 'Kredi bakiyesini görebilir'),
  ('credits:purchase', 'Kredi Satın Alma', 'profile', 'Kredi satın alabilir'),
  -- Admin: User Management
  ('users:read', 'Kullanıcı Listeleme', 'admin', 'Tüm kullanıcıları listeleyebilir'),
  ('users:update', 'Kullanıcı Düzenleme', 'admin', 'Kullanıcı bilgilerini düzenleyebilir'),
  ('users:delete', 'Kullanıcı Silme', 'admin', 'Kullanıcıları silebilir'),
  ('users:credits', 'Kredi Yönetimi', 'admin', 'Kullanıcılara kredi ekleyebilir/çıkarabilir'),
  ('users:roles', 'Rol Atama', 'admin', 'Kullanıcılara rol atayabilir'),
  -- Admin: Provider Management
  ('providers:read', 'Sağlayıcı Görüntüleme', 'admin', 'Sağlayıcıları listeleyebilir'),
  ('providers:manage', 'Sağlayıcı Yönetimi', 'admin', 'Sağlayıcıları ekleyebilir/düzenleyebilir'),
  ('failover:manage', 'Failover Yönetimi', 'admin', 'Failover sıralamasını değiştirebilir'),
  -- Admin: Model Management
  ('models:read', 'Model Görüntüleme', 'admin', 'AI modellerini listeleyebilir'),
  ('models:manage', 'Model Yönetimi', 'admin', 'Model ekleyebilir/düzenleyebilir'),
  -- Admin: System
  ('audit:read', 'Audit Log Görüntüleme', 'admin', 'Denetim kayıtlarını görebilir'),
  ('settings:manage', 'Sistem Ayarları', 'admin', 'Sistem ayarlarını değiştirebilir'),
  ('roles:manage', 'Rol Yönetimi', 'admin', 'Rolleri oluşturabilir/düzenleyebilir'),
  -- Super Admin
  ('*', 'Tam Yetki', 'super', 'Tüm işlemlere erişim')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. Add missing column to roles table (if table already exists)
-- ============================================
ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_type TEXT DEFAULT 'customer';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 7. Seed default roles
-- ============================================
INSERT INTO roles (id, name, display_name, description, role_type, is_system, permissions) VALUES
  -- Staff Roles
  ('super_admin', 'super_admin', 'Süper Admin', 'Sisteme tam erişim, tüm yetkiler', 'staff', true, 
   '["*"]'),
  ('admin', 'admin', 'Yönetici', 'Genel yönetim yetkisi, rol yönetimi hariç', 'staff', true, 
   '["users:read","users:update","users:credits","providers:read","providers:manage","failover:manage","models:read","models:manage","audit:read","settings:manage","ai:video","ai:image","ai:audio","ai:chat","ai:synapse","profile:read","profile:update"]'),
  ('moderator', 'moderator', 'Moderatör', 'Kullanıcı yönetimi ve içerik denetimi', 'staff', true, 
   '["users:read","users:update","audit:read","ai:video","ai:image","ai:audio","ai:chat","ai:synapse","profile:read","profile:update"]'),
  -- Customer Roles
  ('customer', 'customer', 'Müşteri', 'Standart müşteri erişimi', 'customer', true, 
   '["ai:video","ai:image","ai:audio","ai:chat","ai:synapse","profile:read","profile:update","credits:view","credits:purchase"]'),
  ('premium_customer', 'premium_customer', 'Premium Müşteri', 'Öncelikli erişim ile premium müşteri', 'customer', true, 
   '["ai:video","ai:image","ai:audio","ai:chat","ai:synapse","ai:priority","profile:read","profile:update","credits:view","credits:purchase"]'),
  ('trial_customer', 'trial_customer', 'Deneme Müşterisi', 'Sınırlı deneme erişimi', 'customer', true, 
   '["ai:video","ai:image","ai:chat","profile:read","profile:update","credits:view"]')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- ============================================
-- 7. Create index for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ============================================
-- 8. Grant appropriate permissions
-- ============================================
-- Ensure RLS is enabled (if needed)
-- ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
