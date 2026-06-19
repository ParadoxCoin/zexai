import React, { useState, useEffect } from 'react';
import {
  Users, DollarSign, Activity, TrendingUp, Search, Edit, Ban, CheckCircle,
  Plus, Minus, Bell, Settings, BarChart3, PieChart, LineChart, AlertCircle,
  Server, Zap, Clock, UserCheck, CreditCard, Package
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../components/ui/toast';
import { LoadingSpinner } from '../components/ui/skeleton';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

import { VestingPanel } from '../components/admin/VestingPanel';

type TabType = 'overview' | 'users' | 'analytics' | 'settings' | 'vesting';

export const AdminDashboard: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [creditAmount, setCreditAmount] = useState(0);
  const [actionReason, setActionReason] = useState('');
  const [packages, setPackages] = useState<any[]>([]);
  const [serviceCosts, setServiceCosts] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [notifications, setNotifications] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal'
  });

  // User edit modal state
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editCredits, setEditCredits] = useState(0);
  const [editRole, setEditRole] = useState('user');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users')
      ]);
      setStats(statsRes.data?.data);
      setUsers(usersRes.data?.data || []);

      if (activeTab === 'overview') {
        const recentRes = await api.get('/admin/recent-users?limit=5');
        setRecentUsers(recentRes.data || []);
      }

      if (activeTab === 'analytics') {
        const analyticsRes = await api.get('/admin/analytics');
        setAnalytics(analyticsRes.data);
      }

      if (activeTab === 'settings') {
        const [packagesRes, costsRes] = await Promise.all([
          api.get('/admin/pricing-packages'),
          api.get('/admin/service-costs')
        ]);
        setPackages(packagesRes.data?.packages || []);
        setServiceCosts(costsRes.data?.service_costs || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
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

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditCredits(user.credits || 0);
    setEditRole(user.role || 'user');
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      await api.put(`/admin/users/${editingUser.id}`, {
        credits: editCredits,
        role: editRole
      });
      toast.success('Başarılı', 'Kullanıcı güncellendi');
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      toast.error('Hata', error.response?.data?.detail || 'Güncelleme başarısız');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* User Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Kullanıcı Düzenle: {editingUser.email}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Kredi</label>
                <p className="text-sm text-gray-500">{editingUser.credits || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Kredi Değeri</label>
                <input
                  type="number"
                  value={editCredits}
                  onChange={(e) => setEditCredits(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Fark: {editCredits - (editingUser.credits || 0) > 0 ? '+' : ''}{editCredits - (editingUser.credits || 0)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="user">User</option>
                  <option value="premium">Premium</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleUpdateUser}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Güncelle
                </button>
                <button
                  onClick={() => setEditingUser(null)}
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Platform yönetimi ve analitik</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Genel Bakış', icon: BarChart3 },
            { id: 'users', label: 'Kullanıcılar', icon: Users },
            { id: 'analytics', label: 'Analitik', icon: PieChart },
            { id: 'vesting', label: 'Vesting (Token Kilit)', icon: CheckCircle },
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
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.total_users || 0}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">${stats?.total_revenue || 0}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam İşlem</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.total_generations || 0}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktif Kullanıcı</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.active_users || 0}</p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Son Kayıtlar</h3>
            <div className="space-y-3">
              {recentUsers.slice(0, 5).map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{user.email}</p>
                    <p className="text-sm text-gray-500">{user.name}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Sistem Sağlığı</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Veritabanı</span>
                <span className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Çalışıyor
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Servisleri</span>
                <span className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Çalışıyor
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">AI Sağlayıcılar</span>
                <span className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aktif
                </span>
              </div>
            </div>
          </div>
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İsim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kredi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.credits || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aktif
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button onClick={() => handleEditUser(user)} className="text-blue-600 hover:text-blue-900" title="Düzenle">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900" title="Askıya Al">
                          <Ban className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Gelir Grafiği (Son 6 Ay)</h3>
            <div className="h-64 flex items-end justify-around space-x-2">
              {[1200, 1900, 3000, 5000, 2000, 3000].map((value, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
                    style={{ height: `${(value / 5000) * 100}%` }}
                  />
                  <span className="text-xs text-gray-600 mt-2">
                    {['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz'][idx]}
                  </span>
                  <span className="text-xs font-semibold text-gray-900">${value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Service Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Servis Kullanımı</h3>
              <div className="space-y-3">
                {[
                  { name: 'Görsel', value: 35, color: 'bg-blue-500' },
                  { name: 'Video', value: 25, color: 'bg-purple-500' },
                  { name: 'Ses', value: 20, color: 'bg-pink-500' },
                  { name: 'Chat', value: 15, color: 'bg-orange-500' },
                  { name: 'Synapse', value: 5, color: 'bg-cyan-500' }
                ].map((service) => (
                  <div key={service.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{service.name}</span>
                      <span className="font-semibold">{service.value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${service.color} h-2 rounded-full`}
                        style={{ width: `${service.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Kullanıcı Aktivitesi</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <UserCheck className="h-5 w-5 text-blue-600 mr-3" />
                    <span className="text-sm font-medium">Bugün Aktif</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">127</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium">Bu Hafta</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">543</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 text-purple-600 mr-3" />
                    <span className="text-sm font-medium">Bu Ay</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">2,341</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Notification Sender */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Sistem Bildirimi Gönder</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                <input
                  type="text"
                  value={notifications.title}
                  onChange={(e) => setNotifications({ ...notifications, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Bildirim başlığı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
                <textarea
                  value={notifications.message}
                  onChange={(e) => setNotifications({ ...notifications, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Bildirim mesajı"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                  <select
                    value={notifications.type}
                    onChange={(e) => setNotifications({ ...notifications, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="info">Bilgi</option>
                    <option value="warning">Uyarı</option>
                    <option value="success">Başarı</option>
                    <option value="error">Hata</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
                  <select
                    value={notifications.priority}
                    onChange={(e) => setNotifications({ ...notifications, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Düşük</option>
                    <option value="normal">Normal</option>
                    <option value="high">Yüksek</option>
                    <option value="critical">Kritik</option>
                  </select>
                </div>
              </div>
              <button
                onClick={sendNotification}
                disabled={!notifications.title || !notifications.message}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                Tüm Kullanıcılara Gönder
              </button>
            </div>
          </div>

          {/* Pricing Packages */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Fiyatlandırma Paketleri</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map((pkg: any) => (
                <div key={pkg.id} className="border-2 border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-lg">{pkg.name}</h4>
                  <p className="text-2xl font-bold text-primary-600 my-2">${pkg.usd_price}</p>
                  <p className="text-sm text-gray-600">{pkg.credit_amount} kredi</p>
                  <p className="text-xs text-green-600 mt-1">%{pkg.discount_percent} indirim</p>
                </div>
              ))}
            </div>
          </div>

          {/* Service Costs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Servis Maliyetleri</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Servis</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Birim</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Maliyet</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {serviceCosts.map((cost: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cost.service_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{cost.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cost.cost_per_unit} kredi
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vesting Tab */}
      {activeTab === 'vesting' && (
        <VestingPanel />
      )}
    </div>
  );
};
