import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Download,
    RefreshCw,
    Filter,
    Calendar,
    Loader2,
    FileText,
    PieChart
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface ModelPerformance {
    model_id: string;
    model_name: string;
    category: string;
    provider: string | null;
    total_uses: number;
    total_revenue: number;
    avg_credits_per_use: number;
    success_rate: number;
    avg_response_time_ms: number | null;
}

interface PeriodComparison {
    current_period: {
        new_users: number;
        total_transactions: number;
        total_credits_used: number;
    };
    previous_period: {
        new_users: number;
        total_transactions: number;
        total_credits_used: number;
    };
    changes: {
        new_users_change: number;
        transactions_change: number;
        credits_change: number;
    };
    period_type: string;
}

const AdvancedReportsPanel: React.FC = () => {
    const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
    const [comparison, setComparison] = useState<PeriodComparison | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [category, setCategory] = useState<string>('');
    const [sortBy, setSortBy] = useState('total_uses');

    const fetchReports = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');

        try {
            const [modelsRes, comparisonRes] = await Promise.all([
                axios.get(`${API_URL}/admin/reports/models`, {
                    params: { period, category: category || undefined, sort_by: sortBy },
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/admin/reports/comparison`, {
                    params: { period_type: period === 'week' ? 'week' : 'month' },
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            setModelPerformance(modelsRes.data.models || []);
            setComparison(comparisonRes.data);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [period, category, sortBy]);

    const handleExport = async (format: 'csv' | 'json') => {
        const token = localStorage.getItem('token');

        try {
            const response = await axios.get(`${API_URL}/admin/reports/export`, {
                params: { report_type: 'models', period, format },
                headers: { Authorization: `Bearer ${token}` },
                responseType: format === 'csv' ? 'blob' : 'json'
            });

            if (format === 'csv') {
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `model_report_${period}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `model_report_${period}.json`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const ChangeIndicator = ({ value }: { value: number }) => {
        const isPositive = value >= 0;
        return (
            <span className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(value).toFixed(1)}%
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-indigo-500" />
                        Gelişmiş Raporlar
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Model performansı ve dönem karşılaştırmaları
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleExport('csv')}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </button>
                    <button
                        onClick={() => handleExport('json')}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                        <FileText className="w-4 h-4" />
                        JSON
                    </button>
                    <button
                        onClick={fetchReports}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Yenile
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    >
                        <option value="week">Son 7 Gün</option>
                        <option value="month">Son 30 Gün</option>
                        <option value="quarter">Son 90 Gün</option>
                        <option value="year">Son 1 Yıl</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    >
                        <option value="">Tüm Kategoriler</option>
                        <option value="image">Görsel</option>
                        <option value="video">Video</option>
                        <option value="chat">Chat</option>
                        <option value="audio">Ses</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-gray-500" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    >
                        <option value="total_uses">Kullanım Sayısı</option>
                        <option value="total_revenue">Gelir</option>
                        <option value="success_rate">Başarı Oranı</option>
                    </select>
                </div>
            </div>

            {/* Period Comparison */}
            {comparison && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Yeni Kullanıcılar</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {comparison.current_period.new_users}
                                </p>
                            </div>
                            <ChangeIndicator value={comparison.changes.new_users_change} />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Önceki dönem: {comparison.previous_period.new_users}
                        </p>
                    </div>

                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">İşlem Sayısı</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {comparison.current_period.total_transactions}
                                </p>
                            </div>
                            <ChangeIndicator value={comparison.changes.transactions_change} />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Önceki dönem: {comparison.previous_period.total_transactions}
                        </p>
                    </div>

                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Kullanılan Kredi</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {comparison.current_period.total_credits_used.toLocaleString()}
                                </p>
                            </div>
                            <ChangeIndicator value={comparison.changes.credits_change} />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Önceki dönem: {comparison.previous_period.total_credits_used.toLocaleString()}
                        </p>
                    </div>
                </div>
            )}

            {/* Model Performance Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Model Performansı</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Model</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kategori</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Provider</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kullanım</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Gelir</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Başarı %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {modelPerformance.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        Bu dönem için veri bulunamadı
                                    </td>
                                </tr>
                            ) : (
                                modelPerformance.map((model, index) => (
                                    <tr key={model.model_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 text-sm">#{index + 1}</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{model.model_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                                                {model.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                            {model.provider || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                            {model.total_uses.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
                                            ${model.total_revenue.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`font-medium ${model.success_rate >= 95 ? 'text-green-600' : model.success_rate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {model.success_rate.toFixed(1)}%
                                            </span>
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

export default AdvancedReportsPanel;
