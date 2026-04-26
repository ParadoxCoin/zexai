import React, { useState, useEffect } from 'react';
import { Gift, Loader2, TrendingUp, Users, DollarSign, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/ui/toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  let token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const ReferralManagementPanel: React.FC = () => {
  const toast = useToast();
  const [stats, setStats] = useState<any>(null);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, earningsRes] = await Promise.all([
        api.get('/admin/referrals/stats'),
        api.get('/admin/referrals/earnings')
      ]);
      setStats(statsRes.data);
      setEarnings(earningsRes.data.data);
    } catch (error) {
      console.error("Failed to fetch referral data", error);
      toast.error('Hata', 'Referans verileri alınamadı');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Toplam Referans</span>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.total_successful_referrals || 0)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Gift className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aktif Kodlar</span>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.total_referral_codes || 0)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ödenen Komisyon (Kredi)</span>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.total_commissions_paid_credits?.toLocaleString() || 0)}
          </div>
        </div>
      </div>

      {/* Earnings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Platform Referans Kazançları
          </h3>
          <button 
            onClick={fetchData}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Yenile
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Referans Yapan</th>
                <th className="px-6 py-4">Getirilen Kullanıcı</th>
                <th className="px-6 py-4">İşlem Tutarı</th>
                <th className="px-6 py-4">Kazanılan Kredi</th>
                <th className="px-6 py-4">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                  </td>
                </tr>
              ) : earnings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Henüz bir kazanç kaydı bulunmuyor.</td>
                </tr>
              ) : (
                earnings.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{row.referrer?.full_name || 'N/A'}</span>
                        <span className="text-xs text-gray-500">{row.referrer?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{row.source_user?.full_name || 'N/A'}</span>
                        <span className="text-xs text-gray-500">{row.source_user?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">${row.purchase_amount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold">
                        +{row.amount} Kredi
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
