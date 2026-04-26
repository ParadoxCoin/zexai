import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle, Download } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/ui/toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  let token = localStorage.getItem('auth_token') ||
    localStorage.getItem('sb-access-token') ||
    sessionStorage.getItem('sb-access-token');

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

export const AirdropManagementPanel: React.FC = () => {
  const toast = useToast();
  const [airdropData, setAirdropData] = useState<any>(null);
  const [airdropLoading, setAirdropLoading] = useState(false);
  const [airdropActionLoading, setAirdropActionLoading] = useState(false);

  const fetchAirdrops = async () => {
    setAirdropLoading(true);
    try {
      const res = await api.get('/admin/airdrops/pending');
      setAirdropData(res.data);
    } catch (error) {
      console.error("Failed to fetch airdrops", error);
      toast.error('Hata', 'Airdrop verisi alınamadı');
    } finally {
      setAirdropLoading(false);
    }
  };

  useEffect(() => {
    fetchAirdrops();
  }, []);

  const handleDownloadAirdrops = (format: 'json' | 'csv') => {
    if (!airdropData || !airdropData.data || airdropData.data.length === 0) {
      toast.error('Hata', 'İndirilecek veri yok');
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    let content = '';
    let mimeType = '';

    if (format === 'csv') {
      content = 'Address,Amount\n' + airdropData.data.map((r: any) => `${r.address},${r.amount}`).join('\n');
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(airdropData.data, null, 2);
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `airdrops_${dateStr}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Başarılı', `${format.toUpperCase()} dosyası indirildi`);
  };

  const handleMarkDistributed = async () => {
    if (!airdropData || !airdropData.record_ids || airdropData.record_ids.length === 0) return;
    if (!confirm('Bu cüzdanlara airdrop gönderdiğinizi onaylıyor musunuz? (Bu işlem geri alınamaz)')) return;

    setAirdropActionLoading(true);
    try {
      await api.post('/admin/airdrops/mark-distributed', {
        record_ids: airdropData.record_ids
      });
      toast.success('Başarılı', 'Airdroplar başarıyla dağıtıldı olarak işaretlendi');
      fetchAirdrops();
    } catch (error) {
      toast.error('Hata', 'Airdroplar güncellenemedi');
    } finally {
      setAirdropActionLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-t-lg">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-500" /> Presale Airdrop Yönetimi
        </h2>
        <p className="text-sm text-gray-500 mt-1">Haftalık referans kazançlarını indir ve dağıtıldı olarak işaretle</p>
      </div>
      <div className="p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 w-full grid grid-cols-2 gap-4">
          <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Bekleyen Cüzdan</div>
            <div className="text-4xl font-black text-gray-900 dark:text-white">
              {airdropLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : (airdropData?.total_wallets || 0)}
            </div>
          </div>
          <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Toplam Ödenecek ZEX</div>
            <div className="text-4xl font-black text-emerald-700 dark:text-emerald-300">
              {airdropLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : (airdropData?.total_zex?.toLocaleString() || 0)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full md:w-64 shrink-0">
          <div className="flex gap-2">
            <button onClick={() => handleDownloadAirdrops('csv')} disabled={!airdropData?.data?.length}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 text-gray-700 dark:text-gray-200">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </button>
            <button onClick={() => handleDownloadAirdrops('json')} disabled={!airdropData?.data?.length}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 text-gray-700 dark:text-gray-200">
              <Download className="w-4 h-4 mr-2" />
              JSON
            </button>
          </div>
          <button onClick={handleMarkDistributed} disabled={!airdropData?.data?.length || airdropActionLoading}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
            {airdropActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Dağıtıldı Olarak İşaretle
          </button>
        </div>
      </div>
    </div>
  );
};
