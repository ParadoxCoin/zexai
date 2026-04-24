import React, { useState, useEffect } from 'react';
import { ModelManagementPanel } from '@/components/admin/ModelManagementPanel';
import { ProviderManagementPanel } from '@/components/admin/ProviderManagementPanel';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { AuditLogPanel } from '@/components/admin/AuditLogPanel';
import { FailoverPanel } from '@/components/admin/FailoverPanel';
import { RoleManagementPanel } from '@/components/admin/RoleManagementPanel';
import { PricingManagementPanel } from '@/components/admin/PricingManagementPanel';
import AdminGamificationPanel from '@/components/admin/AdminGamificationPanel';
import { VestingPanel } from '@/components/admin/VestingPanel';
import {
  Users, DollarSign, Activity, TrendingUp, Search, Edit, Ban, CheckCircle,
  Plus, Minus, Bell, Settings, BarChart3, PieChart, LineChart, AlertCircle,
  Server, Zap, Clock, UserCheck, CreditCard, Package, Wifi, WifiOff,
  RefreshCw, Download, Upload, Eye, Shield, Database, LayoutGrid, XCircle, Trophy,
  UserPlus, Sparkles
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/skeleton';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Try multiple token storage locations (Supabase stores in different places)
  let token = localStorage.getItem('auth_token') ||
    localStorage.getItem('sb-access-token') ||
    sessionStorage.getItem('sb-access-token');

  // Also check for Supabase session in localStorage
  if (!token) {
    const supabaseKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (supabaseKey) {
      try {
        const session = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
        if (session.access_token) {
          token = session.access_token;
        }
      } catch (e) { }
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type TabType = 'overview' | 'users' | 'analytics' | 'monitoring' | 'models' | 'settings' | 'audit' | 'gamification' | 'vesting';

export const AdminDashboardEnhanced: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<any>(null);
  const [realtimeStats, setRealtimeStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [creditAmount, setCreditAmount] = useState(0);
  const [actionReason, setActionReason] = useState('');
  const [providerStatus, setProviderStatus] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [notifications, setNotifications] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal'
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchRealtimeData, 30000); // 30 saniyede bir güncelle
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats/platform'),
        api.get('/admin/users/advanced')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data?.users || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Hata', 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    try {
      const [realtimeRes, providersRes] = await Promise.all([
        api.get('/admin/stats/realtime'),
        api.get('/admin/providers/status')
      ]);
      setRealtimeStats(realtimeRes.data?.stats);
      setProviderStatus(providersRes.data?.providers);
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    }
  };

  const sendNotification = async () => {
    try {
      await api.post('/admin/notifications/send', notifications);
      toast.success('Başarılı', 'Bildirim gönderildi');
      setNotifications({ title: '', message: '', type: 'info', priority: 'normal' });
    } catch (error: any) {
      toast.error('Hata', error.response?.data?.detail || 'Bildirim gönderilemedi');
    }
  };

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0) return;
    try {
      await api.post('/admin/users/bulk-action', {
        action: bulkAction,
        user_ids: selectedUsers,
        reason: actionReason,
        value: bulkAction === 'add_credits' ? creditAmount : undefined
      });
      toast.success('Başarılı', 'Toplu işlem tamamlandı');
      setShowBulkModal(false);
      setSelectedUsers([]);
      setBulkAction('');
      setActionReason('');
      setCreditAmount(0);
      fetchData();
    } catch (error: any) {
      toast.error('Hata', error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Rol değiştirme fonksiyonu
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.put(`/admin/roles/user/${userId}`, { role_id: newRole });
      toast.success('Başarılı', 'Kullanıcı rolü güncellendi');
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error: any) {
      toast.error('Hata', error.response?.data?.detail || 'Rol değiştirilemedi');
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!confirm('Kullanıcıyı askıya almak istediğinizden emin misiniz?')) return;
    try {
      await api.post(`/admin/users/${userId}/suspend`);
      toast.success('Başarılı', 'Kullanıcı askıya alındı');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u));
    } catch (error: any) {
      toast.error('Hata', error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/activate`);
      toast.success('Başarılı', 'Kullanıcı aktif edildi');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: true } : u));
    } catch (error: any) {
      toast.error('Hata', error.response?.data?.detail || 'İşlem başarısız');
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

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Bulk Action Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Toplu İşlem - {selectedUsers.length} kullanıcı seçildi
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İşlem</label>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Seçiniz</option>
                  <option value="add_credits">Kredi Ekle</option>
                  <option value="suspend">Askıya Al</option>
                  <option value="activate">Aktifleştir</option>
                  <option value="set_role">Rol Değiştir</option>
                </select>
              </div>
              {bulkAction === 'add_credits' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kredi Miktarı</label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sebep</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || !actionReason}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  Uygula
                </button>
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkAction('');
                    setActionReason('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gelişmiş Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">Gerçek zamanlı platform yönetimi</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchRealtimeData}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </button>
          <div className="flex items-center text-sm text-gray-600">
            <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Canlı Veri
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Genel Bakış', icon: BarChart3 },
            { id: 'users', label: 'Kullanıcılar', icon: Users },
            { id: 'models', label: 'Modeller', icon: LayoutGrid },
            { id: 'monitoring', label: 'Monitoring', icon: Server },
            { id: 'gamification', label: 'Gamification', icon: Trophy },
            { id: 'vesting', label: 'Vesting (Token Kilit)', icon: Shield },
            { id: 'audit', label: 'Audit Log', icon: Shield },
            { id: 'settings', label: 'Ayarlar', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Real-time Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Toplam Kullanıcı</p>
                  <p className="text-3xl font-bold mt-2">{realtimeStats?.users?.total || stats?.total_users || 0}</p>
                  <p className="text-sm text-blue-100 mt-1">
                    +{realtimeStats?.users?.new_24h || 0} bugün
                  </p>
                </div>
                <div className="bg-blue-400 rounded-full p-3">
                  <Users className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Aktif Kullanıcı</p>
                  <p className="text-3xl font-bold mt-2">{realtimeStats?.users?.active || 0}</p>
                  <p className="text-sm text-green-100 mt-1">
                    %{realtimeStats?.users?.growth_rate?.toFixed(1) || 0} büyüme
                  </p>
                </div>
                <div className="bg-green-400 rounded-full p-3">
                  <UserCheck className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Toplam Kredi</p>
                  <p className="text-3xl font-bold mt-2">{realtimeStats?.credits?.total_balance?.toLocaleString() || 0}</p>
                  <p className="text-sm text-purple-100 mt-1">
                    {realtimeStats?.credits?.total_used_30d?.toLocaleString() || 0} kullanıldı
                  </p>
                </div>
                <div className="bg-purple-400 rounded-full p-3">
                  <CreditCard className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Aylık Gelir</p>
                  <p className="text-3xl font-bold mt-2">${realtimeStats?.revenue?.total_30d?.toFixed(0) || 0}</p>
                  <p className="text-sm text-orange-100 mt-1">
                    ${realtimeStats?.revenue?.avg_per_user?.toFixed(2) || 0} / kullanıcı
                  </p>
                </div>
                <div className="bg-orange-400 rounded-full p-3">
                  <DollarSign className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-green-600" />
                Sistem Sağlığı
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium">Veritabanı</span>
                  </div>
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Çalışıyor
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <Server className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium">API Servisleri</span>
                  </div>
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aktif
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <Wifi className="h-5 w-5 text-blue-600 mr-3" />
                    <span className="text-sm font-medium">WebSocket</span>
                  </div>
                  <span className="flex items-center text-blue-600">
                    <Wifi className="h-4 w-4 mr-1" />
                    {realtimeStats?.realtime?.websocket_connections?.total_connections || 0} bağlantı
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                Gerçek Zamanlı Aktivite
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">Toplam İstek (30g)</span>
                  <span className="text-lg font-bold text-blue-600">
                    {realtimeStats?.usage?.total_requests_30d?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium">Ortalama İstek/Kullanıcı</span>
                  <span className="text-lg font-bold text-purple-600">
                    {realtimeStats?.usage?.avg_requests_per_user?.toFixed(1) || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Kredi/İstek</span>
                  <span className="text-lg font-bold text-green-600">
                    {realtimeStats?.usage?.credits_per_request?.toFixed(2) || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Status */}
          {providerStatus && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                AI Sağlayıcı Durumu
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(providerStatus).map(([provider, status]: [string, any]) => (
                  <div key={provider} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{provider}</h4>
                      <div className={`flex items-center ${status.status === 'healthy' ? 'text-green-600' :
                        status.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                        {status.status === 'healthy' ? <CheckCircle className="h-4 w-4" /> :
                          status.status === 'degraded' ? <AlertCircle className="h-4 w-4" /> :
                            <XCircle className="h-4 w-4" />}
                        <span className="ml-1 text-sm capitalize">{status.status}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">
                      Son kontrol: {new Date(status.last_check).toLocaleTimeString('tr-TR')}
                    </p>
                    {status.response_time && (
                      <p className="text-xs text-gray-600">
                        Yanıt süresi: {status.response_time}ms
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Kullanıcı ara..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {selectedUsers.length > 0 && (
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Toplu İşlem ({selectedUsers.length})
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {filteredUsers.length} kullanıcı
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map(u => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İsim</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kredi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Son Giriş</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">30g Üretim</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{user.email}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{user.full_name || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <select
                        value={user.role || 'customer'}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`text-xs font-semibold rounded-md border-0 py-1 px-2 cursor-pointer ${user.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'moderator' ? 'bg-orange-100 text-orange-800' :
                              user.role === 'premium_customer' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                          }`}
                      >
                        <optgroup label="Personel">
                          <option value="super_admin">Süper Admin</option>
                          <option value="admin">Yönetici</option>
                          <option value="moderator">Moderatör</option>
                        </optgroup>
                        <optgroup label="Müşteri">
                          <option value="customer">Müşteri</option>
                          <option value="premium_customer">Premium Müşteri</option>
                          <option value="trial_customer">Deneme</option>
                        </optgroup>
                      </select>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.credits_balance?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatLastLogin(user.last_login)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full ${
                        (user.generation_count_30d || 0) > 50 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : (user.generation_count_30d || 0) > 10 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        <Sparkles className="h-3 w-3" />
                        {user.generation_count_30d || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${user.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {user.is_active !== false ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aktif
                          </>
                        ) : (
                          <>
                            <Ban className="h-3 w-3 mr-1" />
                            Askıda
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-1">
                        {user.is_active !== false ? (
                          <button
                            onClick={() => handleSuspendUser(user.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Askıya Al">
                            <Ban className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateUser(user.id)}
                            className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                            title="Aktif Et">
                            <UserPlus className="h-4 w-4" />
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
      )}

      {/* Analytics artık Ayarlar -> Analytics altında */}

      {/* Model Management Tab */}
      {activeTab === 'models' && (
        <ModelManagementPanel />
      )}

      {/* Monitoring Tab - Provider Management */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">WebSocket Bağlantıları</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {realtimeStats?.realtime?.websocket_connections?.total_connections || 0}
                  </p>
                </div>
                <Wifi className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sağlıklı Sağlayıcı</p>
                  <p className="text-2xl font-bold text-green-600">
                    {realtimeStats?.system?.provider_health || 0}/{realtimeStats?.system?.total_providers || 0}
                  </p>
                </div>
                <Server className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-2xl font-bold text-purple-600">99.9%</p>
                </div>
                <Zap className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Provider Management Panel */}
          <ProviderManagementPanel />

          {/* Failover Panel */}
          <FailoverPanel />
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <SettingsPanel />
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <AuditLogPanel />
      )}

      {/* Gamification Tab */}
      {activeTab === 'gamification' && (
        <AdminGamificationPanel />
      )}

      {/* Vesting Tab */}
      {activeTab === 'vesting' && (
        <VestingPanel />
      )}
    </div>
  );
};