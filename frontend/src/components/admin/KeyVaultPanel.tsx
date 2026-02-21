import React, { useState, useEffect } from 'react';
import {
    Key, Shield, RefreshCw, Plus, Trash2, Eye, EyeOff,
    Copy, Check, AlertTriangle, Lock, Unlock, RotateCw,
    X, Save, Clock
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({
    baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Add auth token to requests
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

interface KeyInfo {
    id: string;
    provider_id: string;
    key_name: string;
    key_prefix: string;
    is_active: boolean;
    rotation_count: number;
    last_rotated_at: string | null;
    last_used_at: string | null;
    created_at: string;
    created_by: string | null;
}

interface VaultStats {
    total_keys: number;
    active_keys: number;
    inactive_keys: number;
    keys_by_provider: Record<string, number>;
    recently_rotated: number;
    providers_with_keys: string[];
}

interface Provider {
    id: string;
    name: string;
    env_var: string;
}

const KeyVaultPanel: React.FC = () => {
    const [keys, setKeys] = useState<KeyInfo[]>([]);
    const [stats, setStats] = useState<VaultStats | null>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    // Add key modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [newKey, setNewKey] = useState({ provider_id: '', key_name: 'primary', api_key: '' });
    const [showKeyValue, setShowKeyValue] = useState(false);

    // Rotate key modal
    const [rotatingKey, setRotatingKey] = useState<KeyInfo | null>(null);
    const [newKeyValue, setNewKeyValue] = useState('');

    // Copy feedback
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [showInactive]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [keysRes, statsRes, providersRes] = await Promise.all([
                api.get(`/admin/vault/keys?include_inactive=${showInactive}`),
                api.get('/admin/vault/stats'),
                api.get('/admin/vault/providers')
            ]);

            setKeys(keysRes.data.keys || []);
            setStats(statsRes.data);
            setProviders(providersRes.data.providers || []);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Veriler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleAddKey = async () => {
        if (!newKey.provider_id || !newKey.api_key) {
            setError('Provider ve API Key zorunludur');
            return;
        }

        try {
            setActionLoading('add');
            await api.post('/admin/vault/keys', newKey);
            await fetchData();
            setShowAddModal(false);
            setNewKey({ provider_id: '', key_name: 'primary', api_key: '' });
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Key eklenemedi');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRotateKey = async () => {
        if (!rotatingKey || !newKeyValue) return;

        try {
            setActionLoading('rotate');
            await api.post(`/admin/vault/keys/${rotatingKey.id}/rotate`, {
                api_key: newKeyValue
            });
            await fetchData();
            setRotatingKey(null);
            setNewKeyValue('');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Key rotate edilemedi');
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleKey = async (keyId: string, isActive: boolean) => {
        try {
            setActionLoading(keyId);
            await api.patch(`/admin/vault/keys/${keyId}/toggle`, { is_active: isActive });
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Key durumu değiştirilemedi');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteKey = async (keyId: string, hardDelete: boolean = false) => {
        const message = hardDelete
            ? 'Bu key kalıcı olarak silinecek. Emin misiniz?'
            : 'Bu key deaktive edilecek. Emin misiniz?';

        if (!confirm(message)) return;

        try {
            setActionLoading(keyId);
            await api.delete(`/admin/vault/keys/${keyId}?hard_delete=${hardDelete}`);
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Key silinemedi');
        } finally {
            setActionLoading(null);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    const formatDateTime = (isoString: string | null) => {
        if (!isoString) return '-';
        try {
            return new Date(isoString).toLocaleString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return isoString;
        }
    };

    const getProviderName = (providerId: string) => {
        const provider = providers.find(p => p.id === providerId);
        return provider?.name || providerId;
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
                    <Shield className="h-6 w-6 text-purple-600 mr-3" />
                    <h2 className="text-xl font-semibold dark:text-white">API Key Vault</h2>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="mr-2"
                        />
                        Pasif Key'leri Göster
                    </label>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Key Ekle
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-purple-600">{stats.total_keys}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Key</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-green-600">{stats.active_keys}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Aktif Key</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-blue-600">{stats.providers_with_keys.length}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Provider</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-orange-600">{stats.recently_rotated}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Son 30 Gün Rotate</div>
                    </div>
                </div>
            )}

            {/* Security Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start">
                    <Lock className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-amber-800 dark:text-amber-200">Güvenlik Notu</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Tüm API key'ler Fernet (AES-128) şifreleme ile güvenli şekilde saklanmaktadır.
                            Key değerleri sadece ekleme sırasında görülebilir ve asla plain-text olarak loglanmaz.
                        </p>
                    </div>
                </div>
            </div>

            {/* Keys List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-gray-700">
                    <h3 className="font-medium dark:text-white flex items-center">
                        <Key className="h-5 w-5 mr-2 text-purple-600" />
                        Kayıtlı API Key'ler
                    </h3>
                </div>
                <div className="divide-y dark:divide-gray-700">
                    {keys.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Henüz kayıtlı API key bulunmuyor</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-3 text-purple-600 hover:text-purple-700"
                            >
                                İlk key'i ekleyin →
                            </button>
                        </div>
                    ) : (
                        keys.map((key) => (
                            <div key={key.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!key.is_active ? 'opacity-60' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${key.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {key.is_active ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                                                {key.is_active ? 'Aktif' : 'Pasif'}
                                            </span>
                                            <span className="ml-3 font-medium dark:text-white">
                                                {getProviderName(key.provider_id)}
                                            </span>
                                            <span className="ml-2 text-sm text-gray-500">
                                                ({key.key_name})
                                            </span>
                                        </div>
                                        <div className="flex items-center mt-2 space-x-4 text-sm">
                                            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                                                {key.key_prefix}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(key.key_prefix, key.id)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                {copiedId === key.id ? (
                                                    <Check className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                                            <span className="flex items-center">
                                                <RotateCw className="h-3 w-3 mr-1" />
                                                {key.rotation_count} rotation
                                            </span>
                                            <span>
                                                Oluşturulma: {formatDateTime(key.created_at)}
                                            </span>
                                            {key.last_rotated_at && (
                                                <span>
                                                    Son Rotate: {formatDateTime(key.last_rotated_at)}
                                                </span>
                                            )}
                                            {key.last_used_at && (
                                                <span className="flex items-center">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    Son Kullanım: {formatDateTime(key.last_used_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        {/* Rotate */}
                                        <button
                                            onClick={() => setRotatingKey(key)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="Key Rotate"
                                        >
                                            <RotateCw className="h-4 w-4" />
                                        </button>
                                        {/* Toggle */}
                                        <button
                                            onClick={() => handleToggleKey(key.id, !key.is_active)}
                                            disabled={actionLoading === key.id}
                                            className={`p-2 rounded-lg ${key.is_active
                                                    ? 'text-yellow-600 hover:bg-yellow-50'
                                                    : 'text-green-600 hover:bg-green-50'
                                                }`}
                                            title={key.is_active ? 'Deaktive Et' : 'Aktive Et'}
                                        >
                                            {actionLoading === key.id ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : key.is_active ? (
                                                <Lock className="h-4 w-4" />
                                            ) : (
                                                <Unlock className="h-4 w-4" />
                                            )}
                                        </button>
                                        {/* Delete */}
                                        <button
                                            onClick={() => handleDeleteKey(key.id, !key.is_active)}
                                            disabled={actionLoading === key.id}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            title={key.is_active ? 'Deaktive Et' : 'Kalıcı Sil'}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Key Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-semibold dark:text-white flex items-center">
                                <Plus className="h-5 w-5 mr-2 text-purple-600" />
                                Yeni API Key Ekle
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Provider Select */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Provider *
                                </label>
                                <select
                                    value={newKey.provider_id}
                                    onChange={(e) => setNewKey({ ...newKey, provider_id: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">Seçiniz...</option>
                                    {providers.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.env_var})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Key Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Key Adı
                                </label>
                                <input
                                    type="text"
                                    value={newKey.key_name}
                                    onChange={(e) => setNewKey({ ...newKey, key_name: e.target.value })}
                                    placeholder="primary"
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Aynı provider için birden fazla key (örn: primary, backup)
                                </p>
                            </div>

                            {/* API Key */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    API Key *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showKeyValue ? 'text' : 'password'}
                                        value={newKey.api_key}
                                        onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                                        placeholder="sk-..."
                                        className="w-full px-3 py-2 pr-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKeyValue(!showKeyValue)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                    >
                                        {showKeyValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Key şifrelenerek saklanacak, tekrar görüntülenemez
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleAddKey}
                                disabled={actionLoading === 'add' || !newKey.provider_id || !newKey.api_key}
                                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                                {actionLoading === 'add' ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rotate Key Modal */}
            {rotatingKey && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-semibold dark:text-white flex items-center">
                                <RotateCw className="h-5 w-5 mr-2 text-blue-600" />
                                Key Rotate - {getProviderName(rotatingKey.provider_id)}
                            </h3>
                            <button onClick={() => setRotatingKey(null)} className="text-gray-500 hover:text-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Mevcut Key:</strong> {rotatingKey.key_prefix}
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                    Rotation sayısı: {rotatingKey.rotation_count}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Yeni API Key *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showKeyValue ? 'text' : 'password'}
                                        value={newKeyValue}
                                        onChange={(e) => setNewKeyValue(e.target.value)}
                                        placeholder="sk-..."
                                        className="w-full px-3 py-2 pr-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKeyValue(!showKeyValue)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                    >
                                        {showKeyValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end space-x-3">
                            <button
                                onClick={() => setRotatingKey(null)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleRotateKey}
                                disabled={actionLoading === 'rotate' || !newKeyValue}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {actionLoading === 'rotate' ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <RotateCw className="h-4 w-4 mr-2" />
                                )}
                                Rotate Et
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KeyVaultPanel;
