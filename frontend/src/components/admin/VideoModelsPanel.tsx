import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Zap, Star, Video, Image, Film } from 'lucide-react';
import { apiService } from '../../services/api';

interface VideoModel {
    id: string;
    provider_id: string;
    name: string;
    display_name?: string;
    description?: string;
    model_type: string;
    endpoint: string;
    credits: number;
    duration_options?: number[];
    quality_rating: number;
    speed_rating: number;
    badge?: string;
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
}

interface Provider {
    id: string;
    name: string;
    display_name?: string;
}

export const VideoModelsPanel: React.FC = () => {
    const [models, setModels] = useState<VideoModel[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingModel, setEditingModel] = useState<VideoModel | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [filterProvider, setFilterProvider] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');

    const [formData, setFormData] = useState<Partial<VideoModel>>({
        id: '',
        provider_id: '',
        name: '',
        display_name: '',
        model_type: 'text_to_video',
        endpoint: '',
        credits: 100,
        quality_rating: 3,
        speed_rating: 3,
        is_active: true,
        is_featured: false,
        sort_order: 100,
    });

    useEffect(() => {
        fetchModels();
        fetchProviders();
    }, []);

    const fetchModels = async () => {
        try {
            setLoading(true);
            const response = await apiService.get('/admin/providers/video-models?include_inactive=true');
            setModels(response.data.models || []);
        } catch (error) {
            console.error('Failed to fetch models:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProviders = async () => {
        try {
            const response = await apiService.get('/admin/providers?include_inactive=true');
            // Handle both response formats
            const data = response.data.providers || response.data || [];
            setProviders(data.map((p: any) => ({ id: p.id || p.name, name: p.name, display_name: p.display_name })));
        } catch (error) {
            console.error('Failed to fetch providers:', error);
        }
    };

    const handleCreate = async () => {
        try {
            await apiService.post('/admin/providers/video-models', formData);
            setShowCreateForm(false);
            resetForm();
            fetchModels();
        } catch (error: any) {
            alert(error?.response?.data?.detail || 'Model oluşturulamadı');
        }
    };

    const handleUpdate = async () => {
        if (!editingModel) return;
        try {
            await apiService.put(`/admin/providers/video-models/${editingModel.id}`, formData);
            setEditingModel(null);
            resetForm();
            fetchModels();
        } catch (error: any) {
            alert(error?.response?.data?.detail || 'Model güncellenemedi');
        }
    };

    const handleDelete = async (modelId: string) => {
        if (!confirm('Bu modeli silmek istediğinize emin misiniz?')) return;
        try {
            await apiService.delete(`/admin/providers/video-models/${modelId}`);
            fetchModels();
        } catch (error: any) {
            alert(error?.response?.data?.detail || 'Model silinemedi');
        }
    };

    const startEdit = (model: VideoModel) => {
        setEditingModel(model);
        setFormData(model);
        setShowCreateForm(false);
    };

    const resetForm = () => {
        setFormData({
            id: '',
            provider_id: '',
            name: '',
            display_name: '',
            model_type: 'text_to_video',
            endpoint: '',
            credits: 100,
            quality_rating: 3,
            speed_rating: 3,
            is_active: true,
            is_featured: false,
            sort_order: 100,
        });
    };

    const filteredModels = models.filter(m => {
        if (filterProvider && m.provider_id !== filterProvider) return false;
        if (filterType && m.model_type !== filterType) return false;
        return true;
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'text_to_video': return <Video className="w-4 h-4" />;
            case 'image_to_video': return <Image className="w-4 h-4" />;
            case 'video_to_video': return <Film className="w-4 h-4" />;
            default: return <Video className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Video Modelleri</h2>
                    <p className="text-gray-400 text-sm">Tüm video modellerini yönetin</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchModels}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { setShowCreateForm(true); setEditingModel(null); resetForm(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Yeni Model
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <select
                    value={filterProvider}
                    onChange={(e) => setFilterProvider(e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                    <option value="">Tüm Sağlayıcılar</option>
                    {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.display_name || p.name}</option>
                    ))}
                </select>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                    <option value="">Tüm Tipler</option>
                    <option value="text_to_video">Text to Video</option>
                    <option value="image_to_video">Image to Video</option>
                    <option value="video_to_video">Video to Video</option>
                    <option value="effect">Effect</option>
                </select>
            </div>

            {/* Create/Edit Form */}
            {(showCreateForm || editingModel) && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        {editingModel ? 'Model Düzenle' : 'Yeni Model Oluştur'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Model ID *</label>
                            <input
                                type="text"
                                value={formData.id || ''}
                                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                disabled={!!editingModel}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                                placeholder="premium_kling26_hd_5s"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Sağlayıcı *</label>
                            <select
                                value={formData.provider_id || ''}
                                onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="">Seçiniz</option>
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.display_name || p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Model Adı *</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                placeholder="Kling 2.6 HD 5s"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Görünür Ad</label>
                            <input
                                type="text"
                                value={formData.display_name || ''}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tip *</label>
                            <select
                                value={formData.model_type || 'text_to_video'}
                                onChange={(e) => setFormData({ ...formData, model_type: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="text_to_video">Text to Video</option>
                                <option value="image_to_video">Image to Video</option>
                                <option value="video_to_video">Video to Video</option>
                                <option value="effect">Effect</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Endpoint *</label>
                            <input
                                type="text"
                                value={formData.endpoint || ''}
                                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                placeholder="/kling/v2.6/standard/generate"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Kredi Maliyeti</label>
                            <input
                                type="number"
                                value={formData.credits || 100}
                                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Kalite (1-5)</label>
                            <input
                                type="number"
                                min="1"
                                max="5"
                                value={formData.quality_rating || 3}
                                onChange={(e) => setFormData({ ...formData, quality_rating: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Hız (1-5)</label>
                            <input
                                type="number"
                                min="1"
                                max="5"
                                value={formData.speed_rating || 3}
                                onChange={(e) => setFormData({ ...formData, speed_rating: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Badge</label>
                            <input
                                type="text"
                                value={formData.badge || ''}
                                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                placeholder="🔥 Yeni"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Sıralama</label>
                            <input
                                type="number"
                                value={formData.sort_order || 100}
                                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                        </div>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 rounded bg-gray-700"
                                />
                                <span className="text-gray-300">Aktif</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_featured}
                                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                                    className="w-4 h-4 rounded bg-gray-700"
                                />
                                <span className="text-gray-300">Öne Çıkan</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={editingModel ? handleUpdate : handleCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {editingModel ? 'Güncelle' : 'Oluştur'}
                        </button>
                        <button
                            onClick={() => { setEditingModel(null); setShowCreateForm(false); resetForm(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                            İptal
                        </button>
                    </div>
                </div>
            )}

            {/* Models Table */}
            {loading ? (
                <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
            ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-900">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm text-gray-400">Model</th>
                                <th className="px-4 py-3 text-left text-sm text-gray-400">Sağlayıcı</th>
                                <th className="px-4 py-3 text-left text-sm text-gray-400">Tip</th>
                                <th className="px-4 py-3 text-left text-sm text-gray-400">Kredi</th>
                                <th className="px-4 py-3 text-left text-sm text-gray-400">Kalite/Hız</th>
                                <th className="px-4 py-3 text-left text-sm text-gray-400">Durum</th>
                                <th className="px-4 py-3 text-right text-sm text-gray-400">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredModels.map((model) => (
                                <tr key={model.id} className={`hover:bg-gray-750 ${!model.is_active ? 'opacity-50' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {model.is_featured && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                                            <div>
                                                <div className="font-medium text-white">{model.display_name || model.name}</div>
                                                <div className="text-xs text-gray-500">{model.id}</div>
                                            </div>
                                            {model.badge && (
                                                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
                                                    {model.badge}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">{model.provider_id}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-gray-300">
                                            {getTypeIcon(model.model_type)}
                                            <span className="text-sm">{model.model_type}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-green-400 font-medium">{model.credits}c</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-yellow-400">⭐{model.quality_rating}</span>
                                            <span className="text-blue-400">⚡{model.speed_rating}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded ${model.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {model.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => startEdit(model)}
                                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4 text-blue-400" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(model.id)}
                                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredModels.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            Henüz model bulunamadı. Migration'ı çalıştırdığınızdan emin olun.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoModelsPanel;
