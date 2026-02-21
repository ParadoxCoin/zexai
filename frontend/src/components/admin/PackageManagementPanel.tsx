import React, { useState, useEffect } from 'react';
import {
    Package, Plus, Edit, Trash2, Save, X, Search,
    Sparkles, DollarSign, Percent, CheckCircle, AlertCircle
} from 'lucide-react';

interface EffectPackage {
    id: string;
    name: string;
    description: string;
    icon: string;
    effects: string[];
    discount_percent: number;
    total_credits: number;
    is_active: boolean;
    original_credits?: number;
}

interface EffectInfo {
    id: string;
    name: string;
    icon: string;
    credits: number;
}

// Effect list for selection (from backend)
const EFFECT_OPTIONS: EffectInfo[] = [
    { id: 'ai_kissing', name: 'AI Kissing', icon: '💋', credits: 20 },
    { id: 'ai_hug', name: 'AI Hug', icon: '🤗', credits: 20 },
    { id: 'earth_zoom', name: 'Earth Zoom In', icon: '🌍', credits: 30 },
    { id: '360_rotation', name: '360° Rotation', icon: '🔄', credits: 24 },
    { id: 'zoom_out', name: 'AI Zoom Out', icon: '🔍', credits: 20 },
    { id: 'celebrity_selfie', name: 'Celebrity Selfie', icon: '🌟', credits: 40 },
    { id: 'polaroid_duo', name: 'Polaroid Duo', icon: '📸', credits: 16 },
    { id: 'ai_caricature', name: 'AI Caricature', icon: '🎨', credits: 20 },
    { id: 'baby_filter', name: 'Baby Filter', icon: '👶', credits: 20 },
    { id: 'anime_style', name: 'Anime Style', icon: '🎌', credits: 24 },
    { id: 'cartoon_style', name: 'Cartoon Style', icon: '🎬', credits: 24 },
    { id: 'talking_avatar', name: 'Talking Avatar', icon: '🗣️', credits: 50 },
    { id: 'singing_avatar', name: 'Singing Avatar', icon: '🎤', credits: 60 },
    { id: 'age_progression', name: 'Age Progression', icon: '👴', credits: 30 },
    { id: 'age_regression', name: 'Age Regression', icon: '👦', credits: 30 },
    { id: 'oil_painting', name: 'Oil Painting', icon: '🖼️', credits: 20 },
    { id: 'watercolor', name: 'Watercolor', icon: '🎨', credits: 20 },
    { id: 'parallax_3d', name: '3D Parallax', icon: '📐', credits: 36 },
    { id: 'slow_motion', name: 'Slow Motion', icon: '⏱️', credits: 24 },
    { id: 'background_removal', name: 'Background Removal', icon: '✂️', credits: 16 },
    { id: 'background_change', name: 'Background Change', icon: '🌄', credits: 24 },
];

const ICON_OPTIONS = ['📦', '💕', '🔥', '🎨', '🗣️', '✨', '🎬', '⚡', '🎯', '🎪', '🌟'];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const PackageManagementPanel: React.FC = () => {
    const [packages, setPackages] = useState<EffectPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingPackage, setEditingPackage] = useState<EffectPackage | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<EffectPackage>>({
        id: '',
        name: '',
        description: '',
        icon: '📦',
        effects: [],
        discount_percent: 20,
        total_credits: 100,
        is_active: true
    });

    useEffect(() => {
        fetchPackages();
    }, []);

    const getAuthToken = () => {
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
                } catch { }
            }
        }
        return token;
    };

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/packages/admin/all`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await res.json();
            setPackages(data.packages || []);
        } catch (err: any) {
            setError('Paketler yüklenemedi');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.id || !formData.name) {
            setError('ID ve isim zorunludur');
            return;
        }

        try {
            setSaving(true);
            const res = await fetch(`${API_BASE}/packages/admin/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Oluşturma başarısız');
            }

            setSuccess('Paket oluşturuldu!');
            setIsCreating(false);
            resetForm();
            fetchPackages();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingPackage) return;

        try {
            setSaving(true);
            const res = await fetch(`${API_BASE}/packages/admin/${editingPackage.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Güncelleme başarısız');
            }

            setSuccess('Paket güncellendi!');
            setEditingPackage(null);
            resetForm();
            fetchPackages();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`${id} paketini silmek istediğinize emin misiniz?`)) return;

        try {
            await fetch(`${API_BASE}/packages/admin/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            setSuccess('Paket devre dışı bırakıldı');
            fetchPackages();
        } catch (err: any) {
            setError('Silme başarısız');
        }
    };

    const resetForm = () => {
        setFormData({
            id: '',
            name: '',
            description: '',
            icon: '📦',
            effects: [],
            discount_percent: 20,
            total_credits: 100,
            is_active: true
        });
    };

    const startEditing = (pkg: EffectPackage) => {
        setEditingPackage(pkg);
        setFormData({ ...pkg });
        setIsCreating(false);
    };

    const startCreating = () => {
        setIsCreating(true);
        setEditingPackage(null);
        resetForm();
    };

    const cancelEdit = () => {
        setIsCreating(false);
        setEditingPackage(null);
        resetForm();
    };

    const toggleEffect = (effectId: string) => {
        const current = formData.effects || [];
        if (current.includes(effectId)) {
            setFormData({ ...formData, effects: current.filter(e => e !== effectId) });
        } else {
            setFormData({ ...formData, effects: [...current, effectId] });
        }
    };

    const filteredPackages = packages.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate total from selected effects
    const calculateTotalFromEffects = () => {
        const total = (formData.effects || []).reduce((sum, eid) => {
            const effect = EFFECT_OPTIONS.find(e => e.id === eid);
            return sum + (effect?.credits || 0);
        }, 0);
        return Math.round(total * (100 - (formData.discount_percent || 0)) / 100);
    };

    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-purple-600" />
                    <h2 className="text-xl font-bold text-gray-900">Efekt Paketleri Yönetimi</h2>
                </div>
                <button
                    onClick={startCreating}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Paket
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    {success}
                </div>
            )}

            {/* Create/Edit Form */}
            {(isCreating || editingPackage) && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {isCreating ? 'Yeni Paket Oluştur' : `Düzenle: ${editingPackage?.name}`}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* ID - only for new */}
                        {isCreating && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paket ID*</label>
                                <input
                                    type="text"
                                    value={formData.id}
                                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                    placeholder="romantic_pack"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Paket Adı*</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Romantik Paket"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Sevgilinizle viral videolar için..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        {/* Icon */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">İkon</label>
                            <div className="flex flex-wrap gap-2">
                                {ICON_OPTIONS.map((icon) => (
                                    <button
                                        key={icon}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, icon })}
                                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${formData.icon === icon ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                                            }`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Discount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">İndirim Oranı (%)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="90"
                                    value={formData.discount_percent}
                                    onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) || 0 })}
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                                <Percent className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>

                        {/* Total Credits */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Toplam Kredi</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.total_credits}
                                    onChange={(e) => setFormData({ ...formData, total_credits: parseInt(e.target.value) || 0 })}
                                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, total_credits: calculateTotalFromEffects() })}
                                    className="text-xs text-purple-600 hover:underline"
                                >
                                    Otomatik Hesapla
                                </button>
                            </div>
                        </div>

                        {/* Active */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-purple-600 rounded"
                                />
                                <span className="text-sm text-gray-600">Aktif</span>
                            </label>
                        </div>
                    </div>

                    {/* Effect Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Dahil Efektler ({(formData.effects || []).length} seçildi)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                            {EFFECT_OPTIONS.map((effect) => {
                                const selected = (formData.effects || []).includes(effect.id);
                                return (
                                    <button
                                        key={effect.id}
                                        type="button"
                                        onClick={() => toggleEffect(effect.id)}
                                        className={`flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-all ${selected
                                                ? 'bg-purple-100 border-2 border-purple-500 text-purple-700'
                                                : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                                            }`}
                                    >
                                        <span className="text-lg">{effect.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{effect.name}</p>
                                            <p className="text-xs text-gray-500">{effect.credits}c</p>
                                        </div>
                                        {selected && <CheckCircle className="w-4 h-4 text-purple-600" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={isCreating ? handleCreate : handleUpdate}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isCreating ? 'Oluştur' : 'Kaydet'}
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            <X className="w-4 h-4" />
                            İptal
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Paket ara..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
            </div>

            {/* Package List */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efektler</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İndirim</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kredi</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            [1, 2, 3].map((i) => (
                                <tr key={i}>
                                    <td colSpan={6} className="px-4 py-4">
                                        <div className="h-10 bg-gray-100 rounded animate-pulse" />
                                    </td>
                                </tr>
                            ))
                        ) : filteredPackages.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    Paket bulunamadı
                                </td>
                            </tr>
                        ) : (
                            filteredPackages.map((pkg) => (
                                <tr key={pkg.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{pkg.icon}</span>
                                            <div>
                                                <p className="font-medium text-gray-900">{pkg.name}</p>
                                                <p className="text-xs text-gray-500">{pkg.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {(pkg.effects || []).slice(0, 3).map((eid) => {
                                                const effect = EFFECT_OPTIONS.find(e => e.id === eid);
                                                return (
                                                    <span key={eid} className="text-lg" title={effect?.name || eid}>
                                                        {effect?.icon || '✨'}
                                                    </span>
                                                );
                                            })}
                                            {(pkg.effects || []).length > 3 && (
                                                <span className="text-xs text-gray-500 self-center">
                                                    +{(pkg.effects || []).length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                                            -{pkg.discount_percent}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-bold text-purple-600">{pkg.total_credits}c</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {pkg.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => startEditing(pkg)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Düzenle"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(pkg.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Sil"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PackageManagementPanel;
