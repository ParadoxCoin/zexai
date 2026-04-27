import React, { useState, useEffect } from 'react';
import { Package, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Save, X, RefreshCw, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../ui/toast';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    // Try multiple token storage locations (Supabase stores in different places)
    const token = localStorage.getItem('auth_token') ||
        localStorage.getItem('sb-access-token') ||
        sessionStorage.getItem('sb-access-token');

    // Also check for Supabase session in localStorage
    if (!token) {
        // Supabase v2 stores session differently
        const supabaseKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        if (supabaseKey) {
            try {
                const session = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
                if (session.access_token) {
                    config.headers.Authorization = `Bearer ${session.access_token}`;
                    return config;
                }
            } catch (e) { }
        }
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

interface Model {
    id: string;
    name: string;
    category: string;
    type: string;
    provider?: string;
    cost_usd: number;
    cost_multiplier: number;
    credits: number;
    quality?: number;
    speed?: string;
    badge?: string;
    description?: string;
    is_active: boolean;
    source: string;
    capabilities?: any;
}

interface ModelListResponse {
    models: Model[];
    total: number;
    categories: { name: string; count: number }[];
}

// Default capabilities template for different model types
const CAPABILITIES_TEMPLATES: Record<string, object> = {
    video: {
        parameters: {
            duration: {
                label: "Süre",
                type: "enum",
                values: [5, 10],
                default: 5,
                description: "Video süresi (saniye)"
            },
            aspect_ratio: {
                label: "En-Boy Oranı",
                type: "enum",
                values: ["16:9", "9:16", "1:1"],
                default: "16:9"
            }
        }
    },
    image: {
        parameters: {
            size: {
                label: "Boyut",
                type: "enum",
                values: ["512x512", "1024x1024", "1024x768"],
                default: "1024x1024"
            },
            quality: {
                label: "Kalite",
                type: "enum",
                values: ["standard", "hd"],
                default: "standard"
            }
        }
    }
};

export const ModelManagementPanel: React.FC = () => {
    const toast = useToast();
    const [models, setModels] = useState<Model[]>([]);
    const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedProvider, setSelectedProvider] = useState<string>('all');
    const [showInactive, setShowInactive] = useState(true);
    const [editingModel, setEditingModel] = useState<Model | null>(null);
    const [expandedModel, setExpandedModel] = useState<string | null>(null);

    // Bulk selection
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [showBulkActions, setShowBulkActions] = useState(false);

    // Providers list
    const [providers, setProviders] = useState<{ id: string, name: string, display_name: string }[]>([]);

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: '',
        cost_usd: 0,
        cost_multiplier: 2.0,
        description: '',
        badge: '',
        provider: '',
        capabilities: '',
        // Video specific pricing
        per_second_pricing: false,
        base_duration: 5,
        duration_options: '5',
        resolutions: '720p, 1080p, 4K',
        quality_multipliers: '{"720p": 1.0, "1080p": 1.5, "4K": 2.5}'
    });

    // Show capabilities editor
    const [showCapabilitiesEditor, setShowCapabilitiesEditor] = useState(false);

    useEffect(() => {
        fetchModels();
        fetchProviders();
    }, [selectedCategory, showInactive]);

    const fetchProviders = async () => {
        try {
            const response = await api.get('/admin/providers');
            setProviders(response.data.providers || []);
        } catch (error) {
            console.error('Failed to fetch providers:', error);
            // Fallback providers
            setProviders([
                { id: 'piapi', name: 'piapi', display_name: 'PiAPI' },
                { id: 'goapi', name: 'goapi', display_name: 'GoAPI' },
                { id: 'fal', name: 'fal', display_name: 'Fal.ai' },
                { id: 'replicate', name: 'replicate', display_name: 'Replicate' },
                { id: 'pollo', name: 'pollo', display_name: 'Pollo.ai' },
            ]);
        }
    };

    const fetchModels = async () => {
        try {
            setLoading(true);
            const params: any = { active_only: !showInactive };
            if (selectedCategory !== 'all') {
                params.category = selectedCategory;
            }
            if (selectedProvider !== 'all') {
                params.provider = selectedProvider;
            }
            if (searchTerm) {
                params.search = searchTerm;
            }

            const response = await api.get<ModelListResponse>('/admin/models', { params });
            setModels(response.data.models || []);
            setCategories(response.data.categories || []);
        } catch (error: any) {
            console.error('Failed to fetch models:', error);
            toast.error('Hata', error.response?.data?.detail || 'Modeller yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchModels();
    };

    const toggleModelStatus = async (modelId: string) => {
        try {
            await api.patch(`/admin/models/${modelId}/toggle`);
            toast.success('Başarılı', 'Model durumu güncellendi');
            fetchModels();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Güncelleme başarısız');
        }
    };

    const startEditing = (model: Model) => {
        setEditingModel(model);
        setEditForm({
            name: model.name,
            cost_usd: model.cost_usd,
            cost_multiplier: model.cost_multiplier,
            description: model.description || '',
            badge: model.badge || '',
            provider: model.provider || '',
            capabilities: model.capabilities ? JSON.stringify(model.capabilities, null, 2) : '',
            per_second_pricing: (model as any).per_second_pricing || false,
            base_duration: (model as any).base_duration || 5,
            duration_options: (model as any).durations ? (model as any).durations.join(', ') : (model as any).duration_options ? (model as any).duration_options.join(', ') : '5',
            resolutions: (model as any).resolutions ? (model as any).resolutions.join(', ') : '720p, 1080p, 4K',
            quality_multipliers: (model as any).quality_multipliers ? JSON.stringify((model as any).quality_multipliers) : '{"720p": 1.0, "1080p": 1.5, "4K": 2.5}'
        });
        setShowCapabilitiesEditor(!!model.capabilities);
    };

    const saveModel = async () => {
        if (!editingModel) return;

        try {
            // Parse capabilities JSON if provided
            let capabilities = null;
            if (editForm.capabilities.trim()) {
                try {
                    capabilities = JSON.parse(editForm.capabilities);
                } catch (e) {
                    toast.error('Hata', 'Capabilities JSON formatı geçersiz');
                    return;
                }
            }

            // Handle advanced video parameters
            const duration_options = editForm.duration_options.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            const resolutions = editForm.resolutions.split(',').map(s => s.trim()).filter(s => s);
            let quality_multipliers = {};
            try {
                quality_multipliers = JSON.parse(editForm.quality_multipliers);
            } catch (e) {
                toast.error('Hata', 'Kalite çarpanları JSON formatı geçersiz');
                return;
            }

            await api.put(`/admin/models/${editingModel.id}`, {
                ...editForm,
                capabilities,
                duration_options,
                resolutions,
                quality_multipliers
            });
            toast.success('Başarılı', 'Model güncellendi');
            setEditingModel(null);
            setShowCapabilitiesEditor(false);
            fetchModels();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Güncelleme başarısız');
        }
    };

    const deleteModel = async (modelId: string) => {
        if (!confirm('Bu modeli silmek istediğinizden emin misiniz?')) return;

        try {
            await api.delete(`/admin/models/${modelId}`);
            toast.success('Başarılı', 'Model silindi');
            fetchModels();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Silme başarısız');
        }
    };

    // Toggle model selection for bulk actions
    const toggleModelSelection = (modelId: string) => {
        setSelectedModels(prev =>
            prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : [...prev, modelId]
        );
    };

    // Select/deselect all visible models
    const toggleSelectAll = () => {
        if (selectedModels.length === filteredModels.length) {
            setSelectedModels([]);
        } else {
            setSelectedModels(filteredModels.map(m => m.id));
        }
    };

    // Bulk toggle active status
    const handleBulkToggle = async (activate: boolean) => {
        try {
            for (const modelId of selectedModels) {
                const model = models.find(m => m.id === modelId);
                if (model && model.is_active !== activate) {
                    await api.patch(`/admin/models/${modelId}/toggle`);
                }
            }
            toast.success('Başarılı', `${selectedModels.length} model ${activate ? 'aktifleştirildi' : 'pasifleştirildi'}`);
            setSelectedModels([]);
            fetchModels();
        } catch (error: any) {
            toast.error('Hata', 'Toplu güncelleme başarısız');
        }
    };

    const filteredModels = models.filter(model =>
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (model.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            video: 'bg-purple-100 text-purple-800',
            image: 'bg-blue-100 text-blue-800',
            audio: 'bg-green-100 text-green-800',
            chat: 'bg-yellow-100 text-yellow-800',
            effect: 'bg-pink-100 text-pink-800',
        };
        return colors[category] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center dark:text-white">
                    <Package className="h-5 w-5 mr-2 text-purple-600" />
                    Model Yönetimi
                    <span className="ml-2 text-sm text-gray-500">({models.length} model)</span>
                </h3>
                <button
                    onClick={fetchModels}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Model ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>

                {/* Category Filter */}
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="all">Tüm Kategoriler</option>
                    {categories.map(cat => (
                        <option key={cat.name} value={cat.name}>
                            {cat.name} ({cat.count})
                        </option>
                    ))}
                </select>

                {/* Provider Filter */}
                <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="all">Tüm Sağlayıcılar</option>
                    {providers.map(p => (
                        <option key={p.id} value={p.name}>
                            {p.display_name}
                        </option>
                    ))}
                </select>

                {/* Show Inactive Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="rounded"
                    />
                    <span className="text-sm dark:text-gray-300">Pasif modelleri göster</span>
                </label>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedModels.length > 0 && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        {selectedModels.length} model seçildi
                    </span>
                    <button
                        onClick={() => handleBulkToggle(true)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                        Aktif Yap
                    </button>
                    <button
                        onClick={() => handleBulkToggle(false)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                        Pasif Yap
                    </button>
                    <button
                        onClick={() => setShowBulkActions(true)}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    >
                        Toplu Fiyat Güncelle
                    </button>
                    <button
                        onClick={() => setSelectedModels([])}
                        className="ml-auto px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                        Seçimi Temizle
                    </button>
                </div>
            )}

            {/* Models Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={selectedModels.length === filteredModels.length && filteredModels.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded"
                                    />
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Model</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Kategori</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Provider</th>
                                <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Maliyet (USD)</th>
                                <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Otomatik Kredi</th>
                                <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Durum</th>
                                <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredModels.map((model) => (
                                <React.Fragment key={model.id}>
                                    <tr className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${!model.is_active ? 'opacity-50' : ''}`}>
                                        {/* Checkbox */}
                                        <td className="py-3 px-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedModels.includes(model.id)}
                                                onChange={() => toggleModelSelection(model.id)}
                                                className="rounded"
                                            />
                                        </td>
                                        {/* Model Info */}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                                >
                                                    {expandedModel === model.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </button>
                                                <div>
                                                    <div className="font-medium dark:text-white">{model.name}</div>
                                                    <div className="text-xs text-gray-500">{model.id}</div>
                                                </div>
                                                {model.badge && (
                                                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                                                        {model.badge}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Category */}
                                        <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(model.category)}`}>
                                                {model.category}
                                            </span>
                                        </td>

                                        {/* Provider */}
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                                            {model.provider || '-'}
                                        </td>

                                        {/* Cost */}
                                        <td className="py-3 px-4 text-right">
                                            <div className="text-sm font-medium dark:text-white">${model.cost_usd.toFixed(3)}</div>
                                            <div className="text-xs text-gray-500">x{model.cost_multiplier}</div>
                                        </td>

                                        {/* Credits */}
                                        <td className="py-3 px-4 text-right">
                                            <span className="font-bold text-purple-600 dark:text-purple-400">
                                                {Math.max(1, Math.round(model.cost_usd * model.cost_multiplier * 100))}c
                                            </span>
                                            <div className="text-[10px] text-gray-400">Sabit değil</div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                onClick={() => toggleModelStatus(model.id)}
                                                className={`p-1 rounded ${model.is_active ? 'text-green-600' : 'text-gray-400'}`}
                                            >
                                                {model.is_active ? (
                                                    <ToggleRight className="h-6 w-6" />
                                                ) : (
                                                    <ToggleLeft className="h-6 w-6" />
                                                )}
                                            </button>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => startEditing(model)}
                                                    className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg"
                                                    title="Düzenle"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteModel(model.id)}
                                                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Details */}
                                    {expandedModel === model.id && (
                                        <tr className="bg-gray-50 dark:bg-gray-700">
                                            <td colSpan={7} className="p-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-500">Tip:</span>
                                                        <span className="ml-2 dark:text-white">{model.type}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Kalite:</span>
                                                        <span className="ml-2 dark:text-white">{model.quality || '-'}/5</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Hız:</span>
                                                        <span className="ml-2 dark:text-white">{model.speed || '-'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Kaynak:</span>
                                                        <span className="ml-2 dark:text-white">{model.source}</span>
                                                    </div>
                                                    {model.description && (
                                                        <div className="col-span-4">
                                                            <span className="text-gray-500">Açıklama:</span>
                                                            <span className="ml-2 dark:text-white">{model.description}</span>
                                                        </div>
                                                    )}
                                                    {model.capabilities && (
                                                        <div className="col-span-4">
                                                            <span className="text-gray-500">Capabilities:</span>
                                                            <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                                                {JSON.stringify(model.capabilities, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                    {filteredModels.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Hiç model bulunamadı.
                        </div>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {editingModel && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-semibold dark:text-white">Model Düzenle</h4>
                            <button onClick={() => setEditingModel(null)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Model Adı</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Maliyet (USD)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={editForm.cost_usd}
                                        onChange={(e) => setEditForm({ ...editForm, cost_usd: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Çarpan</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={editForm.cost_multiplier}
                                        onChange={(e) => setEditForm({ ...editForm, cost_multiplier: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-purple-700 dark:text-purple-300 font-medium">Kullanıcı Kredisi:</span>
                                    <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                        {Math.max(1, Math.round(editForm.cost_usd * editForm.cost_multiplier * 100))}c
                                    </span>
                                </div>
                                <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-1">
                                    Formül: Maliyet (USD) x Çarpan x 100
                                </p>
                            </div>


                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Badge</label>
                                <input
                                    type="text"
                                    value={editForm.badge}
                                    onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                                    placeholder="⭐ En Popüler"
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Sağlayıcı</label>
                                <select
                                    value={editForm.provider}
                                    onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Değiştirme</option>
                                    {providers.map(p => (
                                        <option key={p.id} value={p.name}>
                                            {p.display_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Açıklama</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>

                            {/* Video Specific Parameters */}
                            {editingModel.category === 'video' && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 space-y-4">
                                    <h5 className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                        <Zap className="h-4 w-4" />
                                        Gelişmiş Video Parametreleri
                                    </h5>
                                    
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editForm.per_second_pricing}
                                                onChange={(e) => setEditForm({ ...editForm, per_second_pricing: e.target.checked })}
                                                className="rounded"
                                            />
                                            <span className="text-sm font-medium dark:text-gray-300">Saniye Bazlı Fiyatlandırma</span>
                                        </label>
                                        
                                        {editForm.per_second_pricing && (
                                            <div className="flex-1">
                                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Baz Süre (sn)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.base_duration}
                                                    onChange={(e) => setEditForm({ ...editForm, base_duration: parseInt(e.target.value) })}
                                                    className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Süre Seçenekleri (virgülle ayır)</label>
                                            <input
                                                type="text"
                                                value={editForm.duration_options}
                                                onChange={(e) => setEditForm({ ...editForm, duration_options: e.target.value })}
                                                placeholder="5, 10, 15"
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Çözünürlükler</label>
                                            <input
                                                type="text"
                                                value={editForm.resolutions}
                                                onChange={(e) => setEditForm({ ...editForm, resolutions: e.target.value })}
                                                placeholder="720p, 1080p, 4K"
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kalite Çarpanları (JSON)</label>
                                        <input
                                            type="text"
                                            value={editForm.quality_multipliers}
                                            onChange={(e) => setEditForm({ ...editForm, quality_multipliers: e.target.value })}
                                            className="w-full px-2 py-1 text-sm font-mono border rounded dark:bg-gray-800 dark:border-gray-700"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Capabilities Editor */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium dark:text-gray-300">
                                        Model Özellikleri (Capabilities)
                                    </label>
                                    <div className="flex gap-2">
                                        {editingModel?.category && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const template = CAPABILITIES_TEMPLATES[editingModel.category] || CAPABILITIES_TEMPLATES.video;
                                                    setEditForm({ ...editForm, capabilities: JSON.stringify(template, null, 2) });
                                                    setShowCapabilitiesEditor(true);
                                                }}
                                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                            >
                                                Şablon Yükle
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowCapabilitiesEditor(!showCapabilitiesEditor)}
                                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                        >
                                            {showCapabilitiesEditor ? 'Gizle' : 'Göster'}
                                        </button>
                                    </div>
                                </div>
                                {showCapabilitiesEditor && (
                                    <div className="space-y-2">
                                        <textarea
                                            value={editForm.capabilities}
                                            onChange={(e) => setEditForm({ ...editForm, capabilities: e.target.value })}
                                            rows={10}
                                            className="w-full px-3 py-2 border rounded-lg font-mono text-sm dark:bg-gray-700 dark:border-gray-600"
                                            placeholder='{"parameters": {"duration": {"label": "Süre", "type": "enum", "values": [5, 10], "default": 5}}}'
                                        />
                                        <p className="text-xs text-gray-500">
                                            JSON formatında parametre tanımları. Video üretim sayfasında dropdown olarak görünür.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={() => setEditingModel(null)}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={saveModel}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelManagementPanel;
