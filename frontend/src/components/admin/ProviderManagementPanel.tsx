import React, { useState, useEffect } from 'react';
import {
    Server, Plus, Edit2, Trash2, RefreshCw, Power,
    CheckCircle, AlertCircle, XCircle, Clock,
    Save, X, Zap, LayoutGrid, List
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../ui/toast';

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

interface Provider {
    id: string;
    name: string;
    display_name: string;
    api_endpoint?: string;
    rate_limit: number;
    timeout: number;
    is_active: boolean;
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    response_time?: number;
    consecutive_failures: number;
    last_check?: string;
    model_count: number;
    auth_type?: string;
    retry_count?: number;
    custom_headers?: string;
    config: Record<string, any>;
}

type ViewMode = 'grid' | 'list';

export const ProviderManagementPanel: React.FC = () => {
    const toast = useToast();
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ healthy: 0, degraded: 0, down: 0, unknown: 0 });
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
    const [checkingHealth, setCheckingHealth] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        display_name: '',
        api_key: '',
        api_endpoint: '',
        auth_type: 'bearer',
        rate_limit: 100,
        timeout: 300,
        retry_count: 3,
        custom_headers: '',
        is_active: true
    });

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/providers');
            setProviders(response.data.providers || []);
            setSummary(response.data.summary || { healthy: 0, degraded: 0, down: 0, unknown: 0 });
        } catch (error: any) {
            console.error('Failed to fetch providers:', error);
            // Fallback to hardcoded providers for display
            setProviders([
                { id: 'piapi', name: 'piapi', display_name: 'PiAPI', rate_limit: 100, timeout: 300, is_active: true, status: 'unknown', consecutive_failures: 0, model_count: 0, config: {} },
                { id: 'goapi', name: 'goapi', display_name: 'GoAPI', rate_limit: 100, timeout: 300, is_active: true, status: 'unknown', consecutive_failures: 0, model_count: 0, config: {} },
                { id: 'fal', name: 'fal', display_name: 'Fal.ai', rate_limit: 100, timeout: 300, is_active: true, status: 'unknown', consecutive_failures: 0, model_count: 0, config: {} },
                { id: 'replicate', name: 'replicate', display_name: 'Replicate', rate_limit: 100, timeout: 300, is_active: true, status: 'unknown', consecutive_failures: 0, model_count: 0, config: {} },
                { id: 'pollo', name: 'pollo', display_name: 'Pollo.ai', rate_limit: 100, timeout: 300, is_active: true, status: 'unknown', consecutive_failures: 0, model_count: 0, config: {} },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleProvider = async (providerId: string) => {
        try {
            await api.post(`/admin/providers/${providerId}/toggle`);
            toast.success('Başarılı', 'Sağlayıcı durumu güncellendi');
            fetchProviders();
        } catch (error) {
            toast.error('Hata', 'Durum güncellenemedi');
        }
    };

    const handleHealthCheck = async (providerId: string) => {
        try {
            setCheckingHealth(providerId);
            const response = await api.post(`/admin/providers/${providerId}/health-check`);
            if (response.data.success) {
                toast.success('Sağlık Kontrolü', `Durum: ${response.data.status}, Yanıt: ${response.data.response_time?.toFixed(0) || '-'}ms`);
            } else {
                toast.warning('Sağlık Kontrolü', response.data.error || 'Kontrol başarısız');
            }
            fetchProviders();
        } catch (error) {
            toast.error('Hata', 'Sağlık kontrolü başarısız');
        } finally {
            setCheckingHealth(null);
        }
    };

    const handleSaveProvider = async () => {
        try {
            if (editingProvider) {
                await api.put(`/admin/providers/${editingProvider.id}`, {
                    display_name: formData.display_name,
                    api_endpoint: formData.api_endpoint || null,
                    auth_type: formData.auth_type,
                    rate_limit: formData.rate_limit,
                    timeout: formData.timeout,
                    retry_count: formData.retry_count,
                    custom_headers: formData.custom_headers || null,
                    is_active: formData.is_active
                });
                toast.success('Başarılı', 'Sağlayıcı güncellendi');
            } else {
                await api.post('/admin/providers', formData);
                toast.success('Başarılı', 'Sağlayıcı eklendi');
            }
            setShowAddModal(false);
            setEditingProvider(null);
            resetForm();
            fetchProviders();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'İşlem başarısız');
        }
    };

    const handleDeleteProvider = async (providerId: string, providerName: string) => {
        if (!confirm(`"${providerName}" sağlayıcısını silmek istediğinize emin misiniz?`)) return;

        try {
            await api.delete(`/admin/providers/${providerId}`);
            toast.success('Başarılı', 'Sağlayıcı silindi');
            fetchProviders();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Silme başarısız');
        }
    };

    const openEditModal = (provider: Provider) => {
        setEditingProvider(provider);
        setFormData({
            name: provider.name,
            display_name: provider.display_name,
            api_key: '',
            api_endpoint: provider.api_endpoint || '',
            auth_type: provider.auth_type || 'bearer',
            rate_limit: provider.rate_limit,
            timeout: provider.timeout,
            retry_count: provider.retry_count || 3,
            custom_headers: provider.custom_headers || '',
            is_active: provider.is_active
        });
        setShowAddModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            display_name: '',
            api_key: '',
            api_endpoint: '',
            auth_type: 'bearer',
            rate_limit: 100,
            timeout: 300,
            retry_count: 3,
            custom_headers: '',
            is_active: true
        });
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
            case 'down': return 'Çevrimdışı';
            default: return 'Bilinmiyor';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold flex items-center">
                        <Server className="h-6 w-6 mr-2" />
                        AI Sağlayıcı Yönetimi
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Sağlayıcıları ekleyin, düzenleyin ve durumlarını izleyin
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Kart Görünümü"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Liste Görünümü"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                    <button
                        onClick={fetchProviders}
                        className="flex items-center px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Yenile
                    </button>
                    <button
                        onClick={() => { resetForm(); setEditingProvider(null); setShowAddModal(true); }}
                        className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Sağlayıcı Ekle
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{summary.healthy}</div>
                    <div className="text-sm text-green-700">Sağlıklı</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{summary.degraded}</div>
                    <div className="text-sm text-yellow-700">Düşük</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{summary.down}</div>
                    <div className="text-sm text-red-700">Çevrimdışı</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-600">{summary.unknown}</div>
                    <div className="text-sm text-gray-700">Bilinmiyor</div>
                </div>
            </div>

            {/* Provider Cards - Grid View */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {providers.map((provider) => (
                        <div
                            key={provider.id}
                            className={`bg-white rounded-lg shadow border-l-4 p-4 ${provider.status === 'healthy' ? 'border-l-green-500' :
                                provider.status === 'degraded' ? 'border-l-yellow-500' :
                                    provider.status === 'down' ? 'border-l-red-500' :
                                        'border-l-gray-400'
                                }`}
                        >
                            {/* Provider Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                    <Zap className="h-5 w-5 text-primary-600 mr-2" />
                                    <span className="font-semibold">{provider.display_name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs rounded-full flex items-center ${getStatusColor(provider.status)}`}>
                                        {getStatusIcon(provider.status)}
                                        <span className="ml-1">{getStatusLabel(provider.status)}</span>
                                    </span>
                                    <button
                                        onClick={() => handleToggleProvider(provider.id)}
                                        className={`p-1 rounded ${provider.is_active ? 'text-green-600' : 'text-gray-400'}`}
                                        title={provider.is_active ? 'Aktif' : 'Pasif'}
                                    >
                                        <Power className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Provider Info */}
                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                                <div className="flex justify-between">
                                    <span>Auth:</span>
                                    <span className="font-medium">{provider.auth_type || 'Bearer'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Yanıt Süresi:</span>
                                    <span className="font-medium">{provider.response_time?.toFixed(0) || '-'} ms</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Model Sayısı:</span>
                                    <span className="font-medium">{provider.model_count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Rate Limit:</span>
                                    <span className="font-medium">{provider.rate_limit}/dk</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Hata Sayısı:</span>
                                    <span className={`font-medium ${provider.consecutive_failures > 0 ? 'text-red-600' : ''}`}>
                                        {provider.consecutive_failures}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t">
                                <button
                                    onClick={() => handleHealthCheck(provider.id)}
                                    disabled={checkingHealth === provider.id}
                                    className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-3 w-3 mr-1 ${checkingHealth === provider.id ? 'animate-spin' : ''}`} />
                                    Kontrol Et
                                </button>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => openEditModal(provider)}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                                        title="Düzenle"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProvider(provider.id, provider.display_name)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        title="Sil"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Provider Table - List View */}
            {viewMode === 'list' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sağlayıcı</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yanıt Süresi</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate Limit</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hata</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktif</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {providers.map((provider) => (
                                <tr key={provider.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Zap className="h-4 w-4 text-primary-600 mr-2" />
                                            <div>
                                                <div className="font-medium text-gray-900">{provider.display_name}</div>
                                                <div className="text-xs text-gray-500">{provider.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit ${getStatusColor(provider.status)}`}>
                                            {getStatusIcon(provider.status)}
                                            <span className="ml-1">{getStatusLabel(provider.status)}</span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        {provider.response_time?.toFixed(0) || '-'} ms
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        {provider.model_count}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        {provider.rate_limit}/dk
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`text-sm font-medium ${provider.consecutive_failures > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            {provider.consecutive_failures}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <button
                                            onClick={() => handleToggleProvider(provider.id)}
                                            className={`p-1 rounded ${provider.is_active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                                        >
                                            <Power className="h-4 w-4" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end space-x-1">
                                            <button
                                                onClick={() => handleHealthCheck(provider.id)}
                                                disabled={checkingHealth === provider.id}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                                                title="Sağlık Kontrolü"
                                            >
                                                <RefreshCw className={`h-4 w-4 ${checkingHealth === provider.id ? 'animate-spin' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(provider)}
                                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                                                title="Düzenle"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProvider(provider.id, provider.display_name)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                title="Sil"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                {editingProvider ? 'Sağlayıcı Düzenle' : 'Yeni Sağlayıcı Ekle'}
                            </h3>
                            <button onClick={() => { setShowAddModal(false); setEditingProvider(null); }} className="text-gray-500 hover:text-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {!editingProvider && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sağlayıcı Adı (Tekil ID)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="my_provider"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Görünen Ad
                                </label>
                                <input
                                    type="text"
                                    value={formData.display_name}
                                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="My Provider"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kimlik Doğrulama</label>
                                <select
                                    value={formData.auth_type}
                                    onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="bearer">Bearer Token</option>
                                    <option value="api-key-header">API Key Header</option>
                                    <option value="basic">Basic Auth</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>

                            {!editingProvider && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                                    <input
                                        type="password"
                                        value={formData.api_key}
                                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="sk-..."
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={formData.api_endpoint}
                                    onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="https://api.example.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (/dk)</label>
                                    <input
                                        type="number"
                                        value={formData.rate_limit}
                                        onChange={(e) => setFormData({ ...formData, rate_limit: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (sn)</label>
                                    <input
                                        type="number"
                                        value={formData.timeout}
                                        onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Retry Sayısı</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={formData.retry_count}
                                        onChange={(e) => setFormData({ ...formData, retry_count: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Aktif</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Özel Headers (JSON)</label>
                                <textarea
                                    value={formData.custom_headers}
                                    onChange={(e) => setFormData({ ...formData, custom_headers: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                                    placeholder='{"X-Custom-Header": "value"}'
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => { setShowAddModal(false); setEditingProvider(null); }}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSaveProvider}
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {editingProvider ? 'Güncelle' : 'Ekle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
