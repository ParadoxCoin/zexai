import React, { useState, useEffect } from 'react';
import {
    BarChart3, TrendingUp, Users, DollarSign, Zap, RefreshCw,
    Calendar, ArrowUp, ArrowDown, Activity, Server
} from 'lucide-react';
import axios from 'axios';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const api = axios.create({
    baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1',
});

api.interceptors.request.use(async (config) => {
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

interface OverviewData {
    total_users: number;
    active_users: number;
    today_revenue: number;
    today_generations: number;
    growth_rate: number;
}

interface ChartData {
    date: string;
    [key: string]: any;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const AnalyticsDashboardPanel: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [revenueData, setRevenueData] = useState<any>(null);
    const [usageData, setUsageData] = useState<any>(null);
    const [providerData, setProviderData] = useState<any>(null);
    const [growthData, setGrowthData] = useState<any>(null);

    useEffect(() => {
        fetchAllData();
    }, [period]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/analytics/all?period=${period}`);
            const data = response.data;

            setOverview(data.overview);
            setRevenueData(data.revenue);
            setUsageData(data.usage);
            setProviderData(data.providers);
            setGrowthData(data.user_growth);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD' }).format(value);
    };

    const formatNumber = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <BarChart3 className="h-6 w-6 text-purple-600 mr-3" />
                    <h2 className="text-xl font-semibold dark:text-white">Analytics Dashboard</h2>
                </div>
                <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as any)}
                        className="px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="day">Bugün</option>
                        <option value="week">Bu Hafta</option>
                        <option value="month">Bu Ay</option>
                    </select>
                    <button
                        onClick={fetchAllData}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            {overview && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">Toplam Kullanıcı</p>
                                <p className="text-2xl font-bold mt-1">{formatNumber(overview.total_users)}</p>
                            </div>
                            <Users className="h-10 w-10 text-blue-200" />
                        </div>
                        <div className="flex items-center mt-3 text-sm">
                            <ArrowUp className="h-4 w-4 mr-1" />
                            <span>{overview.growth_rate}% büyüme</span>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm">Bugünkü Gelir</p>
                                <p className="text-2xl font-bold mt-1">{formatCurrency(overview.today_revenue)}</p>
                            </div>
                            <DollarSign className="h-10 w-10 text-green-200" />
                        </div>
                        <div className="flex items-center mt-3 text-sm">
                            <ArrowUp className="h-4 w-4 mr-1" />
                            <span>Aktif: {overview.active_users}</span>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm">Bugünkü Üretim</p>
                                <p className="text-2xl font-bold mt-1">{formatNumber(overview.today_generations)}</p>
                            </div>
                            <Zap className="h-10 w-10 text-purple-200" />
                        </div>
                        <div className="flex items-center mt-3 text-sm">
                            <Activity className="h-4 w-4 mr-1" />
                            <span>AI Çağrısı</span>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm">Aktif Kullanıcı</p>
                                <p className="text-2xl font-bold mt-1">{formatNumber(overview.active_users)}</p>
                            </div>
                            <TrendingUp className="h-10 w-10 text-orange-200" />
                        </div>
                        <div className="flex items-center mt-3 text-sm">
                            <span>Son 7 gün</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                {revenueData && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold dark:text-white flex items-center">
                                <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                                Gelir Trendi
                            </h3>
                            <span className="text-sm text-gray-500">
                                Toplam: {formatCurrency(revenueData.total)}
                            </span>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={revenueData.chart_data}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: any) => formatCurrency(value)}
                                    contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 8 }}
                                    labelStyle={{ color: '#9CA3AF' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Usage Trend */}
                {usageData && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold dark:text-white flex items-center">
                                <Activity className="h-5 w-5 mr-2 text-purple-500" />
                                Kullanım Trendi
                            </h3>
                            <span className="text-sm text-gray-500">
                                Toplam: {formatNumber(usageData.total)}
                            </span>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={usageData.trend_data}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 8 }}
                                    labelStyle={{ color: '#9CA3AF' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#8B5CF6"
                                    strokeWidth={2}
                                    dot={{ fill: '#8B5CF6', strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Service Breakdown */}
                {usageData && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                        <h3 className="font-semibold dark:text-white mb-4 flex items-center">
                            <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                            Servis Dağılımı
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={usageData.service_breakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {usageData.service_breakdown.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Provider Stats */}
                {providerData && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 col-span-2">
                        <h3 className="font-semibold dark:text-white mb-4 flex items-center">
                            <Server className="h-5 w-5 mr-2 text-blue-500" />
                            Provider Performansı
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={providerData.providers} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis type="number" tick={{ fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                                <Tooltip
                                    contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 8 }}
                                />
                                <Bar dataKey="total" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
                            {providerData.providers.slice(0, 4).map((p: any, i: number) => (
                                <div key={p.name} className="text-center">
                                    <p className="font-medium dark:text-white">{p.name}</p>
                                    <p className="text-green-500">{p.success_rate}%</p>
                                    <p className="text-gray-500">{p.avg_response_time}ms</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* User Growth */}
            {growthData && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold dark:text-white flex items-center">
                            <Users className="h-5 w-5 mr-2 text-blue-500" />
                            Kullanıcı Büyümesi
                        </h3>
                        <span className="text-sm text-gray-500">
                            +{growthData.new_users} yeni kullanıcı
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={growthData.chart_data}>
                            <defs>
                                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 8 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                fill="url(#colorGrowth)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboardPanel;
