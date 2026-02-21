import React, { useState, useEffect } from 'react';
import {
    FileText, Search, RefreshCw, Filter, Download, Trash2,
    CheckCircle, XCircle, User, Clock, ChevronLeft, ChevronRight,
    Eye, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../ui/toast';

const api = axios.create({
    baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Add auth token
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

interface AuditLog {
    id: string;
    user_id: string;
    user_email?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    resource_name?: string;
    old_value?: Record<string, any>;
    new_value?: Record<string, any>;
    ip_address?: string;
    details?: string;
    success: boolean;
    created_at: string;
}

interface AuditStats {
    total_logs: number;
    by_action: Record<string, number>;
    by_resource: Record<string, number>;
    by_user: Record<string, number>;
    period_days: number;
}

export const AuditLogPanel: React.FC = () => {
    const toast = useToast();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    // Filters
    const [actionFilter, setActionFilter] = useState('');
    const [resourceFilter, setResourceFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const pageSize = 25;

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [page, actionFilter, resourceFilter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params: any = { page, page_size: pageSize };
            if (actionFilter) params.action = actionFilter;
            if (resourceFilter) params.resource_type = resourceFilter;

            const response = await api.get('/admin/audit', { params });
            setLogs(response.data.logs || []);
            setTotalPages(Math.ceil((response.data.total || 0) / pageSize));
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
            // Fallback demo data
            setLogs([
                {
                    id: '1',
                    user_id: 'demo-user',
                    user_email: 'admin@example.com',
                    action: 'update',
                    resource_type: 'model',
                    resource_name: 'Kling v1.6',
                    success: true,
                    created_at: new Date().toISOString()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/audit/stats', { params: { days: 7 } });
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleCleanup = async () => {
        if (!confirm('90 günden eski logları silmek istediğinize emin misiniz?')) return;

        try {
            const response = await api.delete('/admin/audit/cleanup', { params: { days: 90 } });
            toast.success('Başarılı', response.data.message);
            fetchLogs();
            fetchStats();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Temizleme başarısız');
        }
    };

    const exportLogs = () => {
        const csv = [
            ['Tarih', 'Kullanıcı', 'İşlem', 'Kaynak', 'Kaynak ID', 'Durum', 'Detay'].join(','),
            ...logs.map(log => [
                log.created_at,
                log.user_email || log.user_id,
                log.action,
                log.resource_type,
                log.resource_id || '-',
                log.success ? 'Başarılı' : 'Başarısız',
                log.details || '-'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Başarılı', 'Loglar indirildi');
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'bg-green-100 text-green-800';
            case 'update': return 'bg-blue-100 text-blue-800';
            case 'delete': return 'bg-red-100 text-red-800';
            case 'toggle': return 'bg-yellow-100 text-yellow-800';
            case 'login': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            create: 'Oluştur',
            update: 'Güncelle',
            delete: 'Sil',
            toggle: 'Toggle',
            read: 'Görüntüle',
            login: 'Giriş',
            logout: 'Çıkış',
            export: 'Dışa Aktar',
            import: 'İçe Aktar',
            health_check: 'Sağlık Kontrolü',
            bulk_action: 'Toplu İşlem'
        };
        return labels[action] || action;
    };

    const getResourceLabel = (resource: string) => {
        const labels: Record<string, string> = {
            model: 'Model',
            provider: 'Sağlayıcı',
            settings: 'Ayarlar',
            user: 'Kullanıcı',
            credits: 'Kredi',
            api_key: 'API Key',
            system: 'Sistem'
        };
        return labels[resource] || resource;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            log.user_email?.toLowerCase().includes(search) ||
            log.resource_name?.toLowerCase().includes(search) ||
            log.details?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                <div className="flex items-center">
                    <FileText className="h-6 w-6 text-purple-600 mr-3" />
                    <div>
                        <h2 className="text-xl font-semibold dark:text-white">Audit Log</h2>
                        <p className="text-sm text-gray-500">Tüm admin işlemlerinin kaydı</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center px-3 py-2 rounded-lg border ${showFilters ? 'bg-purple-100 border-purple-300' : 'hover:bg-gray-100'}`}
                    >
                        <Filter className="h-4 w-4 mr-1" />
                        Filtrele
                    </button>
                    <button
                        onClick={exportLogs}
                        className="flex items-center px-3 py-2 rounded-lg border hover:bg-gray-100"
                    >
                        <Download className="h-4 w-4 mr-1" />
                        Dışa Aktar
                    </button>
                    <button
                        onClick={handleCleanup}
                        className="flex items-center px-3 py-2 rounded-lg border hover:bg-gray-100 text-red-600"
                        title="90 günden eski logları temizle"
                    >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Temizle
                    </button>
                    <button
                        onClick={() => { fetchLogs(); fetchStats(); }}
                        className="flex items-center px-3 py-2 rounded-lg border hover:bg-gray-100"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{stats.total_logs}</p>
                        <p className="text-xs text-gray-500">Son {stats.period_days} Gün</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.by_action?.create || 0}</p>
                        <p className="text-xs text-gray-500">Oluşturma</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.by_action?.update || 0}</p>
                        <p className="text-xs text-gray-500">Güncelleme</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{stats.by_action?.delete || 0}</p>
                        <p className="text-xs text-gray-500">Silme</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            {showFilters && (
                <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Ara</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="E-posta, kaynak adı..."
                                    className="w-full pl-10 pr-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">İşlem</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="">Tümü</option>
                                <option value="create">Oluştur</option>
                                <option value="update">Güncelle</option>
                                <option value="delete">Sil</option>
                                <option value="toggle">Toggle</option>
                                <option value="login">Giriş</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Kaynak Tipi</label>
                            <select
                                value={resourceFilter}
                                onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="">Tümü</option>
                                <option value="model">Model</option>
                                <option value="provider">Sağlayıcı</option>
                                <option value="settings">Ayarlar</option>
                                <option value="user">Kullanıcı</option>
                                <option value="system">Sistem</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kaynak</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detay</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center">
                                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-600" />
                                </td>
                            </tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    Kayıt bulunamadı
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        <div className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1 text-gray-400" />
                                            {formatDate(log.created_at)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 mr-1 text-gray-400" />
                                            {log.user_email || log.user_id.slice(0, 8)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                                            {getActionLabel(log.action)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div>
                                            <span className="font-medium">{getResourceLabel(log.resource_type)}</span>
                                            {log.resource_name && (
                                                <p className="text-xs text-gray-500">{log.resource_name}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                        {log.details || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {log.success ? (
                                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="p-1 hover:bg-gray-100 rounded"
                                            title="Detay"
                                        >
                                            <Eye className="h-4 w-4 text-gray-500" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
                <p className="text-sm text-gray-500">
                    Sayfa {page} / {totalPages}
                </p>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedLog(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold dark:text-white">Log Detayı</h3>
                            <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-700">×</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Tarih</label>
                                    <p className="dark:text-white">{formatDate(selectedLog.created_at)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Kullanıcı</label>
                                    <p className="dark:text-white">{selectedLog.user_email || selectedLog.user_id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">İşlem</label>
                                    <p><span className={`px-2 py-1 text-xs rounded-full ${getActionColor(selectedLog.action)}`}>{getActionLabel(selectedLog.action)}</span></p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Kaynak</label>
                                    <p className="dark:text-white">{getResourceLabel(selectedLog.resource_type)}{selectedLog.resource_name && ` - ${selectedLog.resource_name}`}</p>
                                </div>
                                {selectedLog.ip_address && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">IP Adresi</label>
                                        <p className="dark:text-white font-mono text-sm">{selectedLog.ip_address}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Durum</label>
                                    <p>{selectedLog.success ? <span className="text-green-600">Başarılı</span> : <span className="text-red-600">Başarısız</span>}</p>
                                </div>
                            </div>
                            {selectedLog.details && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Detay</label>
                                    <p className="dark:text-white">{selectedLog.details}</p>
                                </div>
                            )}
                            {selectedLog.old_value && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Eski Değer</label>
                                    <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">{JSON.stringify(selectedLog.old_value, null, 2)}</pre>
                                </div>
                            )}
                            {selectedLog.new_value && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Yeni Değer</label>
                                    <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">{JSON.stringify(selectedLog.new_value, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogPanel;
