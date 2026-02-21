import React, { useState, useEffect } from 'react';
import {
    DollarSign, Plus, Edit2, Trash2, RefreshCw, Save, X, Tag, Gift,
    Package, CreditCard, Percent, Calendar, CheckCircle, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../ui/toast';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

api.interceptors.request.use((config) => {
    let token = localStorage.getItem('auth_token') ||
        localStorage.getItem('sb-access-token') ||
        sessionStorage.getItem('sb-access-token');
    if (!token) {
        const supabaseKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        if (supabaseKey) {
            try {
                const session = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
                token = session.access_token;
            } catch (e) { }
        }
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

interface SubscriptionPlan {
    id: string;
    name: string;
    display_name: string;
    monthly_price: number;
    monthly_credits: number;
    description: string;
    features: string[];
    is_active: boolean;
}

interface PromoCode {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    current_uses: number;
    max_uses?: number;
    valid_until?: string;
    is_active: boolean;
}

interface SpecialPackage {
    id: string;
    name: string;
    original_price: number;
    discounted_price: number;
    credits: number;
    bonus_credits: number;
    badge?: string;
    is_active: boolean;
}

export const PricingManagementPanel: React.FC = () => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'plans' | 'promo' | 'packages' | 'config'>('plans');
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [packages, setPackages] = useState<SpecialPackage[]>([]);
    const [creditConfig, setCreditConfig] = useState<any>(null);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [editingPackage, setEditingPackage] = useState<SpecialPackage | null>(null);
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [showPackageModal, setShowPackageModal] = useState(false);

    // Promo form state
    const [promoForm, setPromoForm] = useState({
        code: '', discount_type: 'percent', discount_value: 10,
        max_uses: 100, max_uses_per_user: 1, valid_until: ''
    });

    // Package form state
    const [packageForm, setPackageForm] = useState({
        name: '', original_price: 100, discounted_price: 80,
        credits: 10000, bonus_credits: 1000, badge: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [plansRes, promoRes, packagesRes, configRes] = await Promise.all([
                api.get('/admin/billing/plans'),
                api.get('/admin/billing/promo-codes'),
                api.get('/admin/billing/special-packages'),
                api.get('/admin/billing/credit-config')
            ]);
            setPlans(plansRes.data.plans || []);
            setPromoCodes(promoRes.data.promo_codes || []);
            setPackages(packagesRes.data.packages || []);
            setCreditConfig(configRes.data.config || {});
        } catch (error: any) {
            console.error('Failed to fetch billing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePlan = async (planId: string, data: Partial<SubscriptionPlan>) => {
        try {
            await api.put(`/admin/billing/plans/${planId}`, data);
            toast.success('Başarılı', 'Plan güncellendi');
            setEditingPlan(null);
            fetchData();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Güncelleme başarısız');
        }
    };

    const handleCreatePromo = async () => {
        try {
            await api.post('/admin/billing/promo-codes', {
                ...promoForm,
                valid_until: promoForm.valid_until ? new Date(promoForm.valid_until).toISOString() : null
            });
            toast.success('Başarılı', 'Promo kod oluşturuldu');
            setShowPromoModal(false);
            setPromoForm({ code: '', discount_type: 'percent', discount_value: 10, max_uses: 100, max_uses_per_user: 1, valid_until: '' });
            fetchData();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Oluşturma başarısız');
        }
    };

    const handleDeletePromo = async (id: string) => {
        if (!confirm('Bu promo kodunu silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/admin/billing/promo-codes/${id}`);
            toast.success('Başarılı', 'Promo kod silindi');
            fetchData();
        } catch (error: any) {
            toast.error('Hata', 'Silme başarısız');
        }
    };

    const handleCreatePackage = async () => {
        try {
            await api.post('/admin/billing/special-packages', packageForm);
            toast.success('Başarılı', 'Paket oluşturuldu');
            setShowPackageModal(false);
            setPackageForm({ name: '', original_price: 100, discounted_price: 80, credits: 10000, bonus_credits: 1000, badge: '' });
            fetchData();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Oluşturma başarısız');
        }
    };

    const handleUpdatePackage = async () => {
        if (!editingPackage) return;
        try {
            await api.put(`/admin/billing/special-packages/${editingPackage.id}`, {
                name: editingPackage.name,
                discounted_price: editingPackage.discounted_price,
                credits: editingPackage.credits,
                bonus_credits: editingPackage.bonus_credits,
                is_active: editingPackage.is_active
            });
            toast.success('Başarılı', 'Paket güncellendi');
            setEditingPackage(null);
            fetchData();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Güncelleme başarısız');
        }
    };

    const handleDeletePackage = async (id: string) => {
        if (!confirm('Bu paketi silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/admin/billing/special-packages/${id}`);
            toast.success('Başarılı', 'Paket silindi');
            fetchData();
        } catch (error: any) {
            toast.error('Hata', 'Silme başarısız');
        }
    };

    const handleUpdateConfig = async () => {
        try {
            await api.put('/admin/billing/credit-config', creditConfig);
            toast.success('Başarılı', 'Kredi ayarları güncellendi');
        } catch (error: any) {
            toast.error('Hata', 'Güncelleme başarısız');
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
                        <DollarSign className="h-6 w-6 mr-2 text-green-600" />
                        Fiyatlandırma Yönetimi
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Abonelik, promo kod ve özel paket yönetimi
                    </p>
                </div>
                <button onClick={fetchData} className="flex items-center px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <RefreshCw className="h-4 w-4 mr-2" /> Yenile
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-4">
                    {[
                        { id: 'plans', label: 'Abonelik Planları', icon: Package },
                        { id: 'promo', label: 'Promo Kodları', icon: Tag },
                        { id: 'packages', label: 'Özel Paketler', icon: Gift },
                        { id: 'config', label: 'Kredi Ayarları', icon: CreditCard }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center ${activeTab === tab.id
                                ? 'border-green-600 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon className="h-4 w-4 mr-1" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Plans Tab */}
            {activeTab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div key={plan.id} className="bg-white rounded-lg shadow border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">{plan.display_name}</h3>
                                <button onClick={() => setEditingPlan(plan)} className="text-blue-600 hover:text-blue-800">
                                    <Edit2 className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Aylık Fiyat:</span>
                                    <span className="font-semibold">${plan.monthly_price}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Aylık Kredi:</span>
                                    <span className="font-semibold">{plan.monthly_credits.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Durum:</span>
                                    <span className={plan.is_active ? 'text-green-600' : 'text-red-600'}>
                                        {plan.is_active ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Promo Codes Tab */}
            {activeTab === 'promo' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => setShowPromoModal(true)} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <Plus className="h-4 w-4 mr-2" /> Yeni Promo Kod
                        </button>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kod</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Değer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanım</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {promoCodes.map(promo => (
                                    <tr key={promo.id}>
                                        <td className="px-6 py-4 font-mono font-semibold">{promo.code}</td>
                                        <td className="px-6 py-4">{promo.discount_type === 'percent' ? '%' : promo.discount_type === 'credits' ? 'Kredi' : '$'}</td>
                                        <td className="px-6 py-4">{promo.discount_value}</td>
                                        <td className="px-6 py-4">{promo.current_uses}/{promo.max_uses || '∞'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${promo.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {promo.is_active ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleDeletePromo(promo.id)} className="text-red-600 hover:text-red-800">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Special Packages Tab */}
            {activeTab === 'packages' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => setShowPackageModal(true)} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                            <Plus className="h-4 w-4 mr-2" /> Yeni Paket
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {packages.map(pkg => (
                            <div key={pkg.id} className="bg-white rounded-lg shadow border p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold">{pkg.name}</span>
                                    <div className="flex items-center space-x-2">
                                        {pkg.badge && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{pkg.badge}</span>}
                                        <button onClick={() => setEditingPackage(pkg)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDeletePackage(pkg.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-green-600">${pkg.discounted_price} <span className="text-sm text-gray-400 line-through">${pkg.original_price}</span></div>
                                <div className="text-sm text-gray-600 mt-1">{pkg.credits.toLocaleString()} + {pkg.bonus_credits.toLocaleString()} bonus kredi</div>
                                <div className="mt-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {pkg.is_active ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Credit Config Tab */}
            {activeTab === 'config' && creditConfig && (
                <div className="bg-white rounded-lg shadow p-6 max-w-lg">
                    <h3 className="text-lg font-semibold mb-4">Kredi Satın Alma Ayarları</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum USD</label>
                            <input
                                type="number"
                                value={creditConfig.min_purchase_usd || 5}
                                onChange={e => setCreditConfig({ ...creditConfig, min_purchase_usd: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Maksimum USD</label>
                            <input
                                type="number"
                                value={creditConfig.max_purchase_usd || 500}
                                onChange={e => setCreditConfig({ ...creditConfig, max_purchase_usd: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">USD Başına Kredi</label>
                            <input
                                type="number"
                                value={creditConfig.credits_per_usd || 100}
                                onChange={e => setCreditConfig({ ...creditConfig, credits_per_usd: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        <button onClick={handleUpdateConfig} className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <Save className="h-4 w-4 mr-2" /> Kaydet
                        </button>
                    </div>
                </div>
            )}

            {/* Plan Edit Modal */}
            {editingPlan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Plan Düzenle: {editingPlan.display_name}</h3>
                            <button onClick={() => setEditingPlan(null)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Aylık Fiyat ($)</label>
                                <input type="number" value={editingPlan.monthly_price} onChange={e => setEditingPlan({ ...editingPlan, monthly_price: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Aylık Kredi</label>
                                <input type="number" value={editingPlan.monthly_credits} onChange={e => setEditingPlan({ ...editingPlan, monthly_credits: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div className="flex space-x-3">
                                <button onClick={() => setEditingPlan(null)} className="flex-1 px-4 py-2 bg-gray-200 rounded-md">İptal</button>
                                <button onClick={() => handleUpdatePlan(editingPlan.id, { monthly_price: editingPlan.monthly_price, monthly_credits: editingPlan.monthly_credits })} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md">Kaydet</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Promo Modal */}
            {showPromoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Yeni Promo Kod</h3>
                            <button onClick={() => setShowPromoModal(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <input placeholder="Kod (örn: YILBASI24)" value={promoForm.code} onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-md" />
                            <select value={promoForm.discount_type} onChange={e => setPromoForm({ ...promoForm, discount_type: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                                <option value="percent">Yüzde (%)</option>
                                <option value="fixed">Sabit ($)</option>
                                <option value="credits">Bonus Kredi</option>
                            </select>
                            <input type="number" placeholder="Değer" value={promoForm.discount_value} onChange={e => setPromoForm({ ...promoForm, discount_value: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
                            <input type="date" value={promoForm.valid_until} onChange={e => setPromoForm({ ...promoForm, valid_until: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                            <button onClick={handleCreatePromo} className="w-full px-4 py-2 bg-green-600 text-white rounded-md">Oluştur</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Package Modal */}
            {showPackageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Yeni Özel Paket</h3>
                            <button onClick={() => setShowPackageModal(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <input placeholder="Paket Adı" value={packageForm.name} onChange={e => setPackageForm({ ...packageForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" placeholder="Orijinal $" value={packageForm.original_price} onChange={e => setPackageForm({ ...packageForm, original_price: parseFloat(e.target.value) })} className="px-3 py-2 border rounded-md" />
                                <input type="number" placeholder="İndirimli $" value={packageForm.discounted_price} onChange={e => setPackageForm({ ...packageForm, discounted_price: parseFloat(e.target.value) })} className="px-3 py-2 border rounded-md" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" placeholder="Kredi" value={packageForm.credits} onChange={e => setPackageForm({ ...packageForm, credits: parseInt(e.target.value) })} className="px-3 py-2 border rounded-md" />
                                <input type="number" placeholder="Bonus" value={packageForm.bonus_credits} onChange={e => setPackageForm({ ...packageForm, bonus_credits: parseInt(e.target.value) })} className="px-3 py-2 border rounded-md" />
                            </div>
                            <input placeholder="Badge (örn: 🎄 YILBAŞI)" value={packageForm.badge} onChange={e => setPackageForm({ ...packageForm, badge: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                            <button onClick={handleCreatePackage} className="w-full px-4 py-2 bg-purple-600 text-white rounded-md">Oluştur</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Package Edit Modal */}
            {editingPackage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Paket Düzenle: {editingPackage.name}</h3>
                            <button onClick={() => setEditingPackage(null)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paket Adı</label>
                                <input value={editingPackage.name} onChange={e => setEditingPackage({ ...editingPackage, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">İndirimli Fiyat ($)</label>
                                    <input type="number" value={editingPackage.discounted_price} onChange={e => setEditingPackage({ ...editingPackage, discounted_price: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kredi</label>
                                    <input type="number" value={editingPackage.credits} onChange={e => setEditingPackage({ ...editingPackage, credits: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Kredi</label>
                                    <input type="number" value={editingPackage.bonus_credits} onChange={e => setEditingPackage({ ...editingPackage, bonus_credits: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                                    <select value={editingPackage.is_active ? 'true' : 'false'} onChange={e => setEditingPackage({ ...editingPackage, is_active: e.target.value === 'true' })} className="w-full px-3 py-2 border rounded-md">
                                        <option value="true">Aktif</option>
                                        <option value="false">Pasif</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleUpdatePackage} className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                <Save className="h-4 w-4 mr-2" /> Güncelle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PricingManagementPanel;
