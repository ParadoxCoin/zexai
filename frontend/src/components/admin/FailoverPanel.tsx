import React, { useState, useEffect } from 'react';
import {
    Shield, RefreshCw, ArrowUpDown, RotateCcw, CheckCircle, AlertCircle,
    XCircle, Clock, ChevronDown, ChevronUp, Activity, Zap, AlertTriangle,
    Circle, MoveUp, MoveDown, Save
} from 'lucide-react';
import axios from 'axios';

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

interface ProviderHealth {
    provider_id: string;
    provider_name: string;
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    consecutive_failures: number;
    total_requests: number;
    failed_requests: number;
    success_rate: number;
    last_success: string | null;
    last_failure: string | null;
    avg_response_time_ms: number;
    is_available: boolean;
    priority_score: number;
}

interface FailoverSummary {
    total_providers: number;
    healthy: number;
    degraded: number;
    down: number;
    unknown: number;
    categories: string[];
}

interface FailoverConfig {
    failure_threshold: number;
    recovery_cooldown_seconds: number;
    degraded_threshold_ms: number;
    health_check_interval_seconds: number;
}

interface FailoverChainItem {
    position: number;
    is_primary: boolean;
    provider_id: string;
    provider_name: string;
    status: string;
    priority_score: number;
    avg_response_time_ms: number;
}

export const FailoverPanel: React.FC = () => {
    const [summary, setSummary] = useState<FailoverSummary | null>(null);
    const [providers, setProviders] = useState<Record<string, ProviderHealth>>({});
    const [config, setConfig] = useState<FailoverConfig | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('video');
    const [failoverChain, setFailoverChain] = useState<FailoverChainItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [resetting, setResetting] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savingPriority, setSavingPriority] = useState(false);
    const [localChain, setLocalChain] = useState<FailoverChainItem[]>([]);
    const [chainModified, setChainModified] = useState(false);

    useEffect(() => {
        fetchFailoverStatus();
        const interval = setInterval(fetchFailoverStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            fetchFailoverChain(selectedCategory);
        }
    }, [selectedCategory]);

    const fetchFailoverStatus = async () => {
        try {
            const response = await api.get('/admin/providers/failover/status');
            setSummary(response.data.summary);
            setProviders(response.data.providers);
            setConfig(response.data.config);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch failover status:', err);
            setError(err.response?.data?.detail || 'Failover durumu alınamadı');
        } finally {
            setLoading(false);
        }
    };

    const fetchFailoverChain = async (category: string) => {
        try {
            const response = await api.get(`/admin/providers/failover/chain/${category}`);
            const chain = response.data.failover_chain || [];
            setFailoverChain(chain);
            setLocalChain(chain);
            setChainModified(false);
        } catch (err) {
            console.error('Failed to fetch failover chain:', err);
            setFailoverChain([]);
            setLocalChain([]);
        }
    };

    const handleMovePriority = (index: number, direction: 'up' | 'down') => {
        const newChain = [...localChain];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= newChain.length) return;

        // Swap items
        [newChain[index], newChain[newIndex]] = [newChain[newIndex], newChain[index]];

        // Update positions
        newChain.forEach((item, i) => {
            item.position = i + 1;
            item.is_primary = i === 0;
        });

        setLocalChain(newChain);
        setChainModified(true);
    };

    const handleSavePriority = async () => {
        try {
            setSavingPriority(true);
            await api.post('/admin/providers/failover/priority', {
                category: selectedCategory,
                provider_ids: localChain.map(item => item.provider_id)
            });
            setChainModified(false);
            await fetchFailoverChain(selectedCategory);
        } catch (err: any) {
            console.error('Failed to save priority:', err);
        } finally {
            setSavingPriority(false);
        }
    };

    const handleResetProvider = async (providerId: string) => {
        try {
            setResetting(providerId);
            await api.post(`/admin/providers/failover/reset/${providerId}`);
            await fetchFailoverStatus();
            await fetchFailoverChain(selectedCategory);
        } catch (err: any) {
            console.error('Failed to reset provider:', err);
        } finally {
            setResetting(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-100';
            case 'degraded': return 'text-yellow-600 bg-yellow-100';
            case 'down': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy': return <CheckCircle className="h-4 w-4" />;
            case 'degraded': return <AlertCircle className="h-4 w-4" />;
            case 'down': return <XCircle className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'healthy': return 'Sağlıklı';
            case 'degraded': return 'Düşük';
            case 'down': return 'Çökmüş';
            default: return 'Bilinmiyor';
        }
    };

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-blue-600" />
                        Provider Auto-Failover
                    </h3>
                    <button
                        onClick={fetchFailoverStatus}
                        className="flex items-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Yenile
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Summary Stats */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900">{summary.total_providers}</p>
                            <p className="text-sm text-gray-600">Toplam</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{summary.healthy}</p>
                            <p className="text-sm text-green-700">Sağlıklı</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-yellow-600">{summary.degraded}</p>
                            <p className="text-sm text-yellow-700">Düşük</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-red-600">{summary.down}</p>
                            <p className="text-sm text-red-700">Çökmüş</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-gray-600">{summary.unknown}</p>
                            <p className="text-sm text-gray-600">Bilinmiyor</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Failover Chain */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold flex items-center">
                        <ArrowUpDown className="h-4 w-4 mr-2 text-purple-600" />
                        Failover Sıralaması
                        {chainModified && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                Değişiklik var
                            </span>
                        )}
                    </h4>
                    <div className="flex items-center space-x-2">
                        {chainModified && (
                            <button
                                onClick={handleSavePriority}
                                disabled={savingPriority}
                                className="flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                                <Save className={`h-4 w-4 mr-1 ${savingPriority ? 'animate-spin' : ''}`} />
                                Kaydet
                            </button>
                        )}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="video">Video</option>
                            <option value="image">Image</option>
                            <option value="chat">Chat</option>
                            <option value="general">General</option>
                        </select>
                    </div>
                </div>

                {localChain.length > 0 ? (
                    <div className="space-y-2">
                        {localChain.map((item, idx) => (
                            <div
                                key={item.provider_id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${item.is_primary
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-200 bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center space-x-4">
                                    {/* Up/Down Buttons */}
                                    <div className="flex flex-col space-y-1">
                                        <button
                                            onClick={() => handleMovePriority(idx, 'up')}
                                            disabled={idx === 0}
                                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Yukarı taşı"
                                        >
                                            <MoveUp className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleMovePriority(idx, 'down')}
                                            disabled={idx === localChain.length - 1}
                                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Aşağı taşı"
                                        >
                                            <MoveDown className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${item.is_primary
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-300 text-gray-700'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {item.provider_name}
                                            {item.is_primary && (
                                                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                                    Aktif
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Skor: {item.priority_score} | Yanıt: {item.avg_response_time_ms.toFixed(0)}ms
                                        </p>
                                    </div>
                                </div>
                                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                    {getStatusIcon(item.status)}
                                    <span className="ml-1">{getStatusLabel(item.status)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Bu kategori için provider bulunamadı</p>
                    </div>
                )}
            </div>

            {/* Provider Details */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h4 className="text-md font-semibold flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-yellow-600" />
                        Provider Sağlık Durumu
                    </h4>
                </div>
                <div className="divide-y divide-gray-200">
                    {Object.entries(providers).map(([pid, health]) => (
                        <div key={pid} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.status)}`}>
                                        {getStatusIcon(health.status)}
                                        <span className="ml-1">{getStatusLabel(health.status)}</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{health.provider_name}</p>
                                        <p className="text-xs text-gray-500">ID: {health.provider_id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleResetProvider(health.provider_id)}
                                    disabled={resetting === health.provider_id}
                                    className="flex items-center px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                                >
                                    <RotateCcw className={`h-3 w-3 mr-1 ${resetting === health.provider_id ? 'animate-spin' : ''}`} />
                                    Sıfırla
                                </button>
                            </div>

                            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Başarı Oranı</p>
                                    <p className={`font-medium ${health.success_rate >= 90 ? 'text-green-600' : health.success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        %{health.success_rate}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Toplam İstek</p>
                                    <p className="font-medium text-gray-900">{health.total_requests}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Başarısız</p>
                                    <p className={`font-medium ${health.failed_requests > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {health.failed_requests}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Ort. Yanıt</p>
                                    <p className="font-medium text-gray-900">{health.avg_response_time_ms.toFixed(0)}ms</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Ardışık Hata</p>
                                    <p className={`font-medium ${health.consecutive_failures >= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {health.consecutive_failures}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                                <span>Son Başarı: {formatTime(health.last_success)}</span>
                                <span>Son Hata: {formatTime(health.last_failure)}</span>
                                <span className={health.is_available ? 'text-green-600' : 'text-red-600'}>
                                    {health.is_available ? '● Kullanılabilir' : '○ Kullanılamaz'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Config Info */}
            <div className="bg-white rounded-lg shadow">
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
                >
                    <h4 className="text-md font-semibold flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                        Failover Konfigürasyonu
                    </h4>
                    {showConfig ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                {showConfig && config && (
                    <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Hata Eşiği</p>
                            <p className="text-lg font-bold text-gray-900">{config.failure_threshold}</p>
                            <p className="text-xs text-gray-500">ardışık hata</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Toparlanma Süresi</p>
                            <p className="text-lg font-bold text-gray-900">{config.recovery_cooldown_seconds}s</p>
                            <p className="text-xs text-gray-500">bekleme</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Düşük Eşiği</p>
                            <p className="text-lg font-bold text-gray-900">{config.degraded_threshold_ms}ms</p>
                            <p className="text-xs text-gray-500">yanıt süresi</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Kontrol Aralığı</p>
                            <p className="text-lg font-bold text-gray-900">{config.health_check_interval_seconds}s</p>
                            <p className="text-xs text-gray-500">periyodik</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FailoverPanel;
