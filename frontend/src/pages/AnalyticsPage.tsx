import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Zap, Calendar, Download } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

export const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const toast = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/user/analytics?range=${timeRange}`);
      setStats(response.data?.data || {});
    } catch (error) {
      toast.error('Hata', 'İstatistikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    toast.info('İndiriliyor', 'Verileriniz hazırlanıyor...');
    // Export logic here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const mockStats = {
    total_requests: 1247,
    total_credits_used: 3542,
    total_spent: 89.50,
    avg_response_time: 2.3,
    success_rate: 98.5,
    daily_usage: [
      { date: '2024-01-15', requests: 45, credits: 120 },
      { date: '2024-01-16', requests: 67, credits: 180 },
      { date: '2024-01-17', requests: 89, credits: 240 },
      { date: '2024-01-18', requests: 123, credits: 350 },
      { date: '2024-01-19', requests: 98, credits: 280 },
      { date: '2024-01-20', requests: 156, credits: 420 },
      { date: '2024-01-21', requests: 178, credits: 510 },
    ],
    by_service: {
      image: { requests: 450, credits: 1350, percentage: 38 },
      video: { requests: 280, credits: 1400, percentage: 24 },
      audio: { requests: 320, credits: 480, percentage: 27 },
      chat: { requests: 197, credits: 312, percentage: 11 },
    },
    top_models: [
      { name: 'FLUX Pro', requests: 234, credits: 1170 },
      { name: 'Veo 3.1', requests: 156, credits: 780 },
      { name: 'ElevenLabs Turbo', requests: 189, credits: 567 },
    ]
  };

  const data = stats || mockStats;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kullanım Analitikleri</h1>
          <p className="mt-2 text-sm text-gray-700">
            Detaylı kullanım istatistikleriniz ve raporlarınız
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="24h">Son 24 Saat</option>
            <option value="7d">Son 7 Gün</option>
            <option value="30d">Son 30 Gün</option>
            <option value="90d">Son 90 Gün</option>
          </select>
          <button
            onClick={exportData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam İstek</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{data.total_requests.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Kullanılan Kredi</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{data.total_credits_used.toLocaleString()}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Harcama</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${data.total_spent}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Başarı Oranı</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{data.success_rate}%</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Usage Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Günlük Kullanım</h2>
        <div className="h-64 flex items-end justify-around space-x-2">
          {data.daily_usage.map((day: any, idx: number) => {
            const maxRequests = Math.max(...data.daily_usage.map((d: any) => d.requests));
            const height = (day.requests / maxRequests) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full relative group">
                  <div
                    className="w-full bg-primary-500 rounded-t hover:bg-primary-600 transition-all cursor-pointer"
                    style={{ height: `${height}%` }}
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {day.requests} istek<br/>{day.credits} kredi
                  </div>
                </div>
                <span className="text-xs text-gray-600 mt-2">
                  {new Date(day.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Service Usage */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Servis Kullanımı</h2>
          <div className="space-y-4">
            {Object.entries(data.by_service).map(([service, stats]: [string, any]) => (
              <div key={service}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium capitalize">{service}</span>
                  <span className="text-gray-600">{stats.requests} istek • {stats.credits} kredi</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Models */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">En Çok Kullanılan Modeller</h2>
          <div className="space-y-3">
            {data.top_models.map((model: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary-100 text-primary-600 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{model.name}</p>
                    <p className="text-xs text-gray-500">{model.requests} istek</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">{model.credits} kredi</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
