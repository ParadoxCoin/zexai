import React, { useState, useEffect } from 'react';
import {
    Shield, RefreshCw, AlertTriangle, Ban, CheckCircle, Edit2, Save, X,
    Activity, Users, Globe, BarChart3
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

interface RateTier {
    id: string;
    tier_name: string;
    service_type: string;
    per_minute: number;
    per_hour: number;
    per_day: number;
    burst_limit: number;
    is_active: boolean;
}

interface Violation {
    id: string;
    ip_address: string;
    user_id?: string;
    service_type: string;
    limit_type: string;
    timestamp: string;
}

interface ViolationStats {
    total_violations: number;
    by_service: Record<string, number>;
    top_offending_ips: Array<{ ip: string; count: number }>;
}

export const RateLimitPanel: React.FC = () => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'tiers' | 'violations' | 'blacklist'>('tiers');
    const [loading, setLoading] = useState(true);
    const [tiers, setTiers] = useState<RateTier[]>([]);
    const [violations, setViolations] = useState<Violation[]>([]);
    const [stats, setStats] = useState<ViolationStats | null>(null);
    const [blacklist, setBlacklist] = useState<any[]>([]);
    const [editingTier, setEditingTier] = useState<RateTier | null>(null);
    const [newBlacklistIP, setNewBlacklistIP] = useState('');
    const [newBlacklistReason, setNewBlacklistReason] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tiersRes, violationsRes, statsRes, blacklistRes] = await Promise.all([
                api.get('/admin/rate-limits/tiers'),
                api.get('/admin/rate-limits/violations?limit=20'),
                api.get('/admin/rate-limits/violations/stats?hours=24'),
                api.get('/admin/rate-limits/blacklist')
            ]);
            setTiers(tiersRes.data.tiers || []);
            setViolations(violationsRes.data.violations || []);
            setStats(statsRes.data || null);
            setBlacklist(blacklistRes.data.blacklist || []);
        } catch (error: any) {
            console.error('Failed to fetch rate limit data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTier = async () => {
        if (!editingTier) return;
        try {
            await api.put(`/admin/rate-limits/tiers/${editingTier.id}`, {
                per_minute: editingTier.per_minute,
                per_hour: editingTier.per_hour,
                per_day: editingTier.per_day,
                burst_limit: editingTier.burst_limit
            });
            toast.success('Başarılı', 'Limit güncellendi');
            setEditingTier(null);
            fetchData();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Güncelleme başarısız');
        }
    };

    const handleAddBlacklist = async () => {
        if (!newBlacklistIP.trim()) return;
        try {
            await api.post('/admin/rate-limits/blacklist', {
                ip_address: newBlacklistIP.trim(),
                reason: newBlacklistReason || 'Manuel engelleme'
            });
            toast.success('Başarılı', 'IP kara listeye eklendi');
            setNewBlacklistIP('');
            setNewBlacklistReason('');
            fetchData();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Ekleme başarısız');
        }
    };

    const handleRemoveBlacklist = async (ip: string) => {
        if (!confirm(`${ip} adresini kara listeden çıkarmak istiyor musunuz?`)) return;
        try {
            await api.delete(`/admin/rate-limits/blacklist/${ip}`);
            toast.success('Başarılı', 'IP kara listeden çıkarıldı');
            fetchData();
        } catch (error: any) {
            toast.error('Hata', 'İşlem başarısız');
        }
    };

    // Group tiers by tier_name
    const groupedTiers = tiers.reduce((acc, tier) => {
        if (!acc[tier.tier_name]) acc[tier.tier_name] = [];
        acc[tier.tier_name].push(tier);
        return acc;
    }, {} as Record<string, RateTier[]>);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold flex items-center">
                        <Shield className="h-6 w-6 mr-2 text-red-600" />
                        Rate Limiting
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Tier limitleri ve ihlal izleme
                    </p>
                </div>
                <button onClick={fetchData} className="flex items-center px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <RefreshCw className="h-4 w-4 mr-2" /> Yenile
                </button>
            </div>

            {/* Stats Summary */}
            {stats && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-red-600">24s İhlal</p>
                                <p className="text-2xl font-bold text-red-700">{stats.total_violations}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-400" />
                        </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-orange-600">Kara Liste</p>
                                <p className="text-2xl font-bold text-orange-700">{blacklist.length}</p>
                            </div>
                            <Ban className="h-8 w-8 text-orange-400" />
                        </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600">Tier Sayısı</p>
                                <p className="text-2xl font-bold text-green-700">{Object.keys(groupedTiers).length}</p>
                            </div>
                            <Activity className="h-8 w-8 text-green-400" />
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-4">
                    {[
                        { id: 'tiers', label: 'Tier Limitleri', icon: BarChart3 },
                        { id: 'violations', label: 'İhlaller', icon: AlertTriangle },
                        { id: 'blacklist', label: 'Kara Liste', icon: Ban }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center ${activeTab === tab.id
                                ? 'border-red-600 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon className="h-4 w-4 mr-1" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tiers Tab */}
            {activeTab === 'tiers' && (
                <div className="space-y-4">
                    {Object.entries(groupedTiers).map(([tierName, tierList]) => (
                        <div key={tierName} className="bg-white rounded-lg shadow p-4">
                            <h3 className="text-lg font-semibold mb-3 capitalize flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-2 ${tierName === 'free' ? 'bg-gray-400' :
                                    tierName === 'basic' ? 'bg-blue-500' :
                                        tierName === 'pro' ? 'bg-purple-500' :
                                            tierName === 'enterprise' ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}></span>
                                {tierName.toUpperCase()}
                            </h3>
                            <div className="grid grid-cols-5 gap-2 text-sm">
                                {tierList.map(tier => (
                                    <div key={tier.id} className="bg-gray-50 rounded p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium capitalize">{tier.service_type}</span>
                                            <button onClick={() => setEditingTier(tier)} className="text-blue-600 hover:text-blue-800">
                                                <Edit2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <div className="text-xs text-gray-600 space-y-1">
                                            <div>{tier.per_minute}/min</div>
                                            <div>{tier.per_hour || '-'}/saat</div>
                                            <div>{tier.burst_limit}/10s</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Violations Tab */}
            {activeTab === 'violations' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">IP</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Servis</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Limit</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Zaman</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {violations.map(v => (
                                <tr key={v.id}>
                                    <td className="px-4 py-3 font-mono text-sm">{v.ip_address}</td>
                                    <td className="px-4 py-3 text-sm capitalize">{v.service_type}</td>
                                    <td className="px-4 py-3 text-sm text-red-600">{v.limit_type}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {new Date(v.timestamp).toLocaleString('tr-TR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Blacklist Tab */}
            {activeTab === 'blacklist' && (
                <div className="space-y-4">
                    <div className="flex space-x-3">
                        <input
                            type="text"
                            placeholder="IP Adresi"
                            value={newBlacklistIP}
                            onChange={e => setNewBlacklistIP(e.target.value)}
                            className="px-3 py-2 border rounded-lg"
                        />
                        <input
                            type="text"
                            placeholder="Sebep"
                            value={newBlacklistReason}
                            onChange={e => setNewBlacklistReason(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg"
                        />
                        <button onClick={handleAddBlacklist} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                            <Ban className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">IP</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Sebep</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tarih</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {blacklist.map(b => (
                                    <tr key={b.id}>
                                        <td className="px-4 py-3 font-mono text-sm font-semibold text-red-600">{b.ip_address}</td>
                                        <td className="px-4 py-3 text-sm">{b.reason}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {new Date(b.created_at).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleRemoveBlacklist(b.ip_address)} className="text-green-600 hover:text-green-800">
                                                <CheckCircle className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit Tier Modal */}
            {editingTier && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">Limit Düzenle: {editingTier.tier_name} - {editingTier.service_type}</h3>
                            <button onClick={() => setEditingTier(null)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm mb-1">Dakika</label>
                                <input type="number" value={editingTier.per_minute} onChange={e => setEditingTier({ ...editingTier, per_minute: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Saat</label>
                                <input type="number" value={editingTier.per_hour || 0} onChange={e => setEditingTier({ ...editingTier, per_hour: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Burst (10sn)</label>
                                <input type="number" value={editingTier.burst_limit} onChange={e => setEditingTier({ ...editingTier, burst_limit: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded" />
                            </div>
                            <button onClick={handleUpdateTier} className="w-full px-4 py-2 bg-red-600 text-white rounded flex items-center justify-center">
                                <Save className="h-4 w-4 mr-2" /> Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RateLimitPanel;
