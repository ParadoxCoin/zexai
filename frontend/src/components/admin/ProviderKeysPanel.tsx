import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, RefreshCw, Key, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiService } from '../../services/api';

interface ProviderKey {
    id: string;
    provider_id: string;
    key_name: string;
    key_preview: string;
    is_active: boolean;
    usage_count: number;
    last_used_at?: string;
    created_at?: string;
}

interface Provider {
    id: string;
    name: string;
    display_name?: string;
    icon?: string;
}

const PROVIDER_LIST: Provider[] = [
    { id: 'kie', name: 'kie', display_name: 'Kie.ai', icon: '🔮' },
    { id: 'fal', name: 'fal', display_name: 'Fal.ai', icon: '⚡' },
    { id: 'replicate', name: 'replicate', display_name: 'Replicate', icon: '🔄' },
    { id: 'pollo', name: 'pollo', display_name: 'Pollo.ai', icon: '🎬' },
    { id: 'openai', name: 'openai', display_name: 'OpenAI', icon: '🤖' },
    { id: 'anthropic', name: 'anthropic', display_name: 'Anthropic', icon: '🧠' },
    { id: 'google', name: 'google', display_name: 'Google AI', icon: '🌐' },
    { id: 'elevenlabs', name: 'elevenlabs', display_name: 'ElevenLabs', icon: '🎙️' },
];

export const ProviderKeysPanel: React.FC = () => {
    const [keys, setKeys] = useState<ProviderKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showApiKey, setShowApiKey] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        provider_id: '',
        key_name: 'primary',
        api_key: '',
    });

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            setLoading(true);
            const response = await apiService.get('/admin/providers/keys');
            setKeys(response.data.keys || []);
        } catch (error) {
            console.error('Failed to fetch keys:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddKey = async () => {
        if (!formData.provider_id || !formData.api_key) {
            alert('Sağlayıcı ve API Key zorunludur');
            return;
        }

        try {
            await apiService.post('/admin/providers/keys', formData);
            setShowAddForm(false);
            setFormData({ provider_id: '', key_name: 'primary', api_key: '' });
            fetchKeys();
        } catch (error: any) {
            alert(error?.response?.data?.detail || 'Key eklenemedi');
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        if (!confirm('Bu API key\'i silmek istediğinize emin misiniz?')) return;

        try {
            await apiService.delete(`/admin/providers/keys/${keyId}`);
            fetchKeys();
        } catch (error: any) {
            alert(error?.response?.data?.detail || 'Key silinemedi');
        }
    };

    const handleToggleKey = async (keyId: string, currentStatus: boolean) => {
        try {
            await apiService.post(`/admin/providers/keys/${keyId}/toggle?is_active=${!currentStatus}`);
            fetchKeys();
        } catch (error: any) {
            alert(error?.response?.data?.detail || 'Key durumu değiştirilemedi');
        }
    };

    const getProviderInfo = (providerId: string) => {
        return PROVIDER_LIST.find(p => p.id === providerId) || { icon: '🔌', display_name: providerId };
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Group keys by provider
    const keysByProvider = keys.reduce((acc, key) => {
        if (!acc[key.provider_id]) acc[key.provider_id] = [];
        acc[key.provider_id].push(key);
        return acc;
    }, {} as Record<string, ProviderKey[]>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">API Anahtarları</h2>
                    <p className="text-gray-400 text-sm">Sağlayıcı API anahtarlarını yönetin</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchKeys}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Yeni Key
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Yeni API Key Ekle</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Sağlayıcı *</label>
                            <select
                                value={formData.provider_id}
                                onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="">Seçiniz</option>
                                {PROVIDER_LIST.map(p => (
                                    <option key={p.id} value={p.id}>{p.icon} {p.display_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Key Adı</label>
                            <select
                                value={formData.key_name}
                                onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="primary">Primary</option>
                                <option value="backup">Backup</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">API Key *</label>
                            <div className="relative">
                                <input
                                    type={showApiKey === 'form' ? 'text' : 'password'}
                                    value={formData.api_key}
                                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                    className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                    placeholder="sk-..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(showApiKey === 'form' ? null : 'form')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    {showApiKey === 'form' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleAddKey}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Kaydet
                        </button>
                        <button
                            onClick={() => { setShowAddForm(false); setFormData({ provider_id: '', key_name: 'primary', api_key: '' }); }}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                            İptal
                        </button>
                    </div>
                </div>
            )}

            {/* Keys List */}
            {loading ? (
                <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
            ) : (
                <div className="grid gap-4">
                    {/* Show providers with existing keys */}
                    {Object.entries(keysByProvider).map(([providerId, providerKeys]) => {
                        const provider = getProviderInfo(providerId);
                        return (
                            <div key={providerId} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">{provider.icon}</span>
                                    <div>
                                        <h3 className="font-semibold text-white">{provider.display_name}</h3>
                                        <p className="text-sm text-gray-400">{providerKeys.length} key</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {providerKeys.map((key) => (
                                        <div
                                            key={key.id}
                                            className={`flex items-center justify-between p-3 bg-gray-900 rounded-lg ${!key.is_active ? 'opacity-50' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <Key className="w-5 h-5 text-gray-400" />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-mono">{key.key_preview}</span>
                                                        <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                                                            {key.key_name}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Kullanım: {key.usage_count || 0} • Son kullanım: {formatDate(key.last_used_at)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleToggleKey(key.id, key.is_active)}
                                                    className={`p-2 rounded-lg transition-colors ${key.is_active ? 'text-green-400 hover:bg-green-500/20' : 'text-gray-400 hover:bg-gray-700'}`}
                                                    title={key.is_active ? 'Deaktif et' : 'Aktif et'}
                                                >
                                                    {key.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-5 h-5 text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Show providers without keys */}
                    {PROVIDER_LIST.filter(p => !keysByProvider[p.id]).length > 0 && (
                        <div className="bg-gray-800/50 border border-dashed border-gray-700 rounded-xl p-4">
                            <h4 className="text-sm font-medium text-gray-400 mb-3">Key Eklenmemiş Sağlayıcılar</h4>
                            <div className="flex flex-wrap gap-2">
                                {PROVIDER_LIST.filter(p => !keysByProvider[p.id]).map(provider => (
                                    <button
                                        key={provider.id}
                                        onClick={() => { setFormData({ ...formData, provider_id: provider.id }); setShowAddForm(true); }}
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                    >
                                        <span>{provider.icon}</span>
                                        <span className="text-white text-sm">{provider.display_name}</span>
                                        <Plus className="w-4 h-4 text-gray-400" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {keys.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            Henüz API key eklenmemiş. Yukarıdaki "Yeni Key" butonunu kullanarak ekleyebilirsiniz.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProviderKeysPanel;
