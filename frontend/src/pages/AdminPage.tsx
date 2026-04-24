import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, DollarSign, Activity, TrendingUp, Search, Ban, CheckCircle,
  Trophy, Loader2, X, Plus, Minus, CreditCard, BarChart3, MessageCircle,
  Image, Zap, RefreshCw, ChevronRight, Shield, AlertTriangle, Eye,
  UserPlus, ShieldCheck, Clock, Sparkles
} from 'lucide-react';
import { apiService } from '@/services/api';

// ─── Types ───
interface UserItem {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  role: string;
  credits?: number;
  credits_balance?: number;
  package?: string;
  is_active?: boolean;
  created_at: string;
  last_login?: string;
  generation_count_30d?: number;
}

interface PlatformStats {
  total_users: number;
  active_users_24h: number;
  total_generations: number;
  total_credits_in_circulation: number;
}

interface UserDetail {
  id: string;
  email: string;
  name?: string;
  role: string;
  credits_balance: number;
  total_spent: number;
  total_purchased: number;
  conversation_count: number;
  image_count: number;
  created_at: string;
}

const QUICK_CREDIT_AMOUNTS = [50, 100, 250, 500, 1000, 5000];

export const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditReason, setCreditReason] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        apiService.get('/admin/stats'),
        apiService.get('/admin/users')
      ]);
      // Stats endpoint returns data directly
      const s = (statsRes as any)?.data || statsRes;
      setStats({
        total_users: s.total_users || 0,
        active_users_24h: s.active_users_24h || 0,
        total_generations: s.total_generations || 0,
        total_credits_in_circulation: s.total_credits_in_circulation || 0,
      });
      // Users endpoint returns { data: [...] } or { conversations: [...] }
      const u = (usersRes as any)?.data || (usersRes as any)?.users || usersRes;
      setUsers(Array.isArray(u) ? u : []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      showToast('error', 'Admin verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);

  const fetchUserDetail = async (user: UserItem) => {
    setSelectedUser(user);
    setShowUserDetail(true);
    try {
      const creditsRes = await apiService.get(`/admin/users/${user.id}/credits`);
      const c = (creditsRes as any)?.data || creditsRes;
      setUserDetail({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        credits_balance: c.credits_balance || user.credits || 0,
        total_spent: c.total_spent || 0,
        total_purchased: c.total_purchased || 0,
        conversation_count: c.conversation_count || 0,
        image_count: c.image_count || 0,
        created_at: user.created_at,
      });
    } catch {
      setUserDetail({
        id: user.id, email: user.email, name: user.name, role: user.role,
        credits_balance: user.credits || 0, total_spent: 0, total_purchased: 0,
        conversation_count: 0, image_count: 0, created_at: user.created_at,
      });
    }
  };

  const handleCreditAdjustment = async () => {
    if (!selectedUser || creditAmount === 0) return;
    setCreditLoading(true);
    try {
      await apiService.post(`/admin/users/${selectedUser.id}/credits`, {
        amount: creditAmount,
        reason: creditReason || 'Admin tarafından ayarlandı'
      });
      showToast('success', `${creditAmount > 0 ? '+' : ''}${creditAmount} kredi ${selectedUser.email} hesabına uygulandı`);
      setShowCreditModal(false);
      setCreditAmount(0);
      setCreditReason('');
      fetchAdminData();
      if (showUserDetail) fetchUserDetail(selectedUser);
    } catch (error: any) {
      showToast('error', error.response?.data?.detail || 'Kredi işlemi başarısız');
    } finally {
      setCreditLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!confirm('Kullanıcıyı askıya almak istediğinizden emin misiniz?')) return;
    try {
      await apiService.post(`/admin/users/${userId}/suspend`);
      showToast('success', 'Kullanıcı askıya alındı');
      fetchAdminData();
    } catch (error: any) {
      showToast('error', error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await apiService.post(`/admin/users/${userId}/activate`);
      showToast('success', 'Kullanıcı aktif edildi');
      fetchAdminData();
    } catch (error: any) {
      showToast('error', error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Kullanıcı rolünü '${newRole}' olarak değiştirmek istediğinizden emin misiniz?`)) return;
    try {
      await apiService.post(`/admin/users/${userId}/role`, { role: newRole });
      showToast('success', `Rol '${newRole}' olarak değiştirildi`);
      fetchAdminData();
    } catch (error: any) {
      showToast('error', error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const formatLastLogin = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}dk önce`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}s önce`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}g önce`;
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const getUserName = (user: UserItem) => user.full_name || user.name || 'İsimsiz';

  const filteredUsers = users.filter(user => {
    const name = getUserName(user).toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();
    return email.includes(term) || name.includes(term);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500">Admin panel yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium transition-all animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Credit Modal */}
      {showCreditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" /> Kredi Ayarla
              </h3>
              <button onClick={() => { setShowCreditModal(false); setCreditAmount(0); setCreditReason(''); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{selectedUser.email}</p>

            {/* Quick amounts */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Hızlı Ekleme</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_CREDIT_AMOUNTS.map(amt => (
                  <button key={amt} onClick={() => setCreditAmount(amt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${creditAmount === amt
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-600'
                      }`}>
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Miktar</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  placeholder="Pozitif: Ekle, Negatif: Çıkar"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sebep</label>
                <textarea
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                  rows={2}
                  placeholder="Kredi ayarlama sebebi (opsiyonel)"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleCreditAdjustment} disabled={creditLoading || creditAmount === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all">
                {creditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {creditAmount > 0 ? `+${creditAmount} Ekle` : creditAmount < 0 ? `${creditAmount} Çıkar` : 'Miktar Girin'}
              </button>
              <button onClick={() => { setShowCreditModal(false); setCreditAmount(0); setCreditReason(''); }}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      {showUserDetail && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 h-full overflow-y-auto shadow-2xl" style={{ WebkitOverflowScrolling: 'touch' as any }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Kullanıcı Detayı</h3>
                <button onClick={() => { setShowUserDetail(false); setUserDetail(null); }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {(selectedUser.name || selectedUser.email)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{getUserName(selectedUser)}</p>
                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Shield className="w-3 h-3" /> Rol: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedUser.role}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Zap className="w-3 h-3" /> Paket: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedUser.package || 'Free'}</span>
                  </div>
                </div>
              </div>

              {/* Usage Stats */}
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Kullanım İstatistikleri</h4>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
                    <CreditCard className="w-3 h-3" /> Kredi Bakiye
                  </div>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{userDetail?.credits_balance?.toFixed(0) || 0}</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium mb-1">
                    <DollarSign className="w-3 h-3" /> Toplam Harcanan
                  </div>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{userDetail?.total_spent?.toFixed(0) || 0}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs font-medium mb-1">
                    <MessageCircle className="w-3 h-3" /> Sohbetler
                  </div>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{userDetail?.conversation_count || 0}</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-medium mb-1">
                    <Image className="w-3 h-3" /> Görseller
                  </div>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{userDetail?.image_count || 0}</p>
                </div>
              </div>

              {/* Actions */}
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">İşlemler</h4>
              <div className="space-y-2">
                <button onClick={() => { setShowUserDetail(false); setShowCreditModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-gray-600 transition-all group">
                  <Plus className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600">Kredi Ekle / Çıkar</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
                <button onClick={() => { setShowUserDetail(false); handleSuspendUser(selectedUser.id); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-red-50 dark:hover:bg-gray-600 transition-all group">
                  <Ban className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-red-600">Askıya Al</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-500" /> Admin Panel
            </h1>
            <p className="text-sm text-gray-500 mt-1">Platform yönetimi ve istatistikler</p>
          </div>
          <button onClick={fetchAdminData}
            className="mt-3 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Toplam Kullanıcı', value: stats?.total_users || 0, icon: Users, gradient: 'from-blue-500 to-indigo-500', bgLight: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Aktif (24s)', value: stats?.active_users_24h || 0, icon: Activity, gradient: 'from-emerald-500 to-teal-500', bgLight: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Toplam İşlem', value: stats?.total_generations || 0, icon: BarChart3, gradient: 'from-purple-500 to-pink-500', bgLight: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Toplam Kredi', value: Math.round(stats?.total_credits_in_circulation || 0), icon: DollarSign, gradient: 'from-amber-500 to-orange-500', bgLight: 'bg-amber-50 dark:bg-amber-900/20' },
          ].map((s, i) => (
            <div key={i} className={`${s.bgLight} rounded-2xl border border-gray-200/50 dark:border-gray-700 p-4 sm:p-5`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md`}>
                  <s.icon className="w-4.5 h-4.5 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{s.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Kullanıcı Yönetimi
                <span className="text-xs font-normal text-gray-400">({filteredUsers.length})</span>
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Email veya isim ara..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as any }}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Rol</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Kredi</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Son Giriş</th>
                  <th className="px-4 sm:px-6 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">30g Üretim</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Durum</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                      {searchTerm ? 'Kullanıcı bulunamadı' : 'Henüz kullanıcı yok'}
                    </td>
                  </tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getUserName(user)?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{getUserName(user)}</p>
                          <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 hidden sm:table-cell">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{Math.round(user.credits_balance || user.credits || 0)}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatLastLogin(user.last_login)}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 hidden lg:table-cell text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full ${
                        (user.generation_count_30d || 0) > 50 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : (user.generation_count_30d || 0) > 10 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        {user.generation_count_30d || 0}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${user.is_active !== false ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                        {user.is_active !== false ? <><CheckCircle className="w-3 h-3" /> Aktif</> : <><Ban className="w-3 h-3" /> Askıda</>}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => fetchUserDetail(user)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                          title="Detay">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setSelectedUser(user); setShowCreditModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                          title="Kredi Ayarla">
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleChangeRole(user.id, user.role)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                          title={user.role === 'admin' ? 'User Yap' : 'Admin Yap'}>
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        {user.is_active !== false ? (
                          <button onClick={() => handleSuspendUser(user.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            title="Askıya Al">
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => handleActivateUser(user.id)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                            title="Aktif Et">
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
