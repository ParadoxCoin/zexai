import React, { useState, useEffect } from 'react';
import {
    Clock, Play, Pause, RefreshCw, Trash2, CheckCircle, XCircle,
    AlertTriangle, Calendar, Activity, Zap, History, Power, PowerOff,
    Edit2, Save, X
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

interface Job {
    id: string;
    name: string;
    description: string;
    trigger_type: 'interval' | 'cron';
    trigger_args: Record<string, any>;
    status: 'running' | 'paused' | 'pending' | 'error';
    next_run: string | null;
    last_run: string | null;
    last_status: string | null;
    run_count: number;
    error_count: number;
    is_system: boolean;
}

interface ExecutionLog {
    job_id: string;
    job_name: string;
    started_at: string;
    finished_at: string | null;
    status: string;
    result: string | null;
    error: string | null;
}

interface SchedulerStats {
    is_running: boolean;
    total_jobs: number;
    running_jobs: number;
    paused_jobs: number;
    total_executions: number;
    total_errors: number;
    error_rate: number;
}

interface EditForm {
    name: string;
    description: string;
    trigger_type: 'interval' | 'cron';
    interval_value: number;
    interval_unit: 'minutes' | 'hours' | 'days';
    cron_hour: number;
    cron_minute: number;
}

const SchedulerPanel: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [stats, setStats] = useState<SchedulerStats | null>(null);
    const [history, setHistory] = useState<ExecutionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit modal state
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({
        name: '',
        description: '',
        trigger_type: 'interval',
        interval_value: 5,
        interval_unit: 'minutes',
        cron_hour: 0,
        cron_minute: 0
    });

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/admin/scheduler/jobs');
            setJobs(response.data.jobs || []);
            setStats(response.data.stats || null);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Görevler yüklenemedi');
            console.error('Failed to fetch jobs:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (jobId?: string) => {
        try {
            const url = jobId ? `/admin/scheduler/history?job_id=${jobId}` : '/admin/scheduler/history';
            const response = await api.get(url);
            setHistory(response.data || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const openEditModal = (job: Job) => {
        setEditingJob(job);

        // Parse trigger args
        let interval_value = 5;
        let interval_unit: 'minutes' | 'hours' | 'days' = 'minutes';
        let cron_hour = 0;
        let cron_minute = 0;

        if (job.trigger_type === 'interval') {
            if (job.trigger_args.days) {
                interval_value = job.trigger_args.days;
                interval_unit = 'days';
            } else if (job.trigger_args.hours) {
                interval_value = job.trigger_args.hours;
                interval_unit = 'hours';
            } else if (job.trigger_args.minutes) {
                interval_value = job.trigger_args.minutes;
                interval_unit = 'minutes';
            }
        } else if (job.trigger_type === 'cron') {
            cron_hour = job.trigger_args.hour || 0;
            cron_minute = job.trigger_args.minute || 0;
        }

        setEditForm({
            name: job.name,
            description: job.description,
            trigger_type: job.trigger_type,
            interval_value,
            interval_unit,
            cron_hour,
            cron_minute
        });
    };

    const closeEditModal = () => {
        setEditingJob(null);
    };

    const handleSaveEdit = async () => {
        if (!editingJob) return;

        try {
            setActionLoading('edit');

            // Build trigger args based on type
            let trigger_args: Record<string, any> = {};
            if (editForm.trigger_type === 'interval') {
                trigger_args[editForm.interval_unit] = editForm.interval_value;
            } else {
                trigger_args = {
                    hour: editForm.cron_hour,
                    minute: editForm.cron_minute
                };
            }

            await api.put(`/admin/scheduler/jobs/${editingJob.id}`, {
                name: editForm.name,
                description: editForm.description,
                trigger_type: editForm.trigger_type,
                trigger_args
            });

            await fetchJobs();
            closeEditModal();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Görev güncellenemedi');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePauseJob = async (jobId: string) => {
        try {
            setActionLoading(jobId);
            await api.post(`/admin/scheduler/jobs/${jobId}/pause`);
            await fetchJobs();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Görev durdurulamadı');
        } finally {
            setActionLoading(null);
        }
    };

    const handleResumeJob = async (jobId: string) => {
        try {
            setActionLoading(jobId);
            await api.post(`/admin/scheduler/jobs/${jobId}/resume`);
            await fetchJobs();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Görev devam ettirilemedi');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRunNow = async (jobId: string) => {
        try {
            setActionLoading(jobId);
            await api.post(`/admin/scheduler/jobs/${jobId}/run`);
            await fetchJobs();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Görev çalıştırılamadı');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteJob = async (jobId: string) => {
        if (!confirm('Bu görevi silmek istediğinize emin misiniz?')) return;

        try {
            setActionLoading(jobId);
            await api.delete(`/admin/scheduler/jobs/${jobId}`);
            await fetchJobs();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Görev silinemedi');
        } finally {
            setActionLoading(null);
        }
    };

    const handleStartScheduler = async () => {
        try {
            setActionLoading('scheduler');
            await api.post('/admin/scheduler/start');
            await fetchJobs();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Scheduler başlatılamadı');
        } finally {
            setActionLoading(null);
        }
    };

    const handleStopScheduler = async () => {
        if (!confirm('Scheduler\'ı durdurmak istediğinize emin misiniz? Tüm zamanlanmış görevler duracak.')) return;

        try {
            setActionLoading('scheduler');
            await api.post('/admin/scheduler/stop');
            await fetchJobs();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Scheduler durdurulamadı');
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'text-green-600 bg-green-100';
            case 'paused': return 'text-yellow-600 bg-yellow-100';
            case 'pending': return 'text-blue-600 bg-blue-100';
            case 'error': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running': return <CheckCircle className="h-4 w-4" />;
            case 'paused': return <Pause className="h-4 w-4" />;
            case 'pending': return <Clock className="h-4 w-4" />;
            case 'error': return <XCircle className="h-4 w-4" />;
            default: return <AlertTriangle className="h-4 w-4" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'running': return 'Aktif';
            case 'paused': return 'Duraklatıldı';
            case 'pending': return 'Beklemede';
            case 'error': return 'Hata';
            default: return status;
        }
    };

    const formatTrigger = (type: string, args: Record<string, any>) => {
        if (type === 'interval') {
            if (args.minutes) return `Her ${args.minutes} dakika`;
            if (args.hours) return `Her ${args.hours} saat`;
            if (args.days) return `Her ${args.days} gün`;
            return 'Interval';
        }
        if (type === 'cron') {
            if (args.hour !== undefined && args.minute !== undefined) {
                return `Her gün ${String(args.hour).padStart(2, '0')}:${String(args.minute).padStart(2, '0')}`;
            }
            return 'Cron';
        }
        return type;
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
                    <Clock className="h-6 w-6 text-purple-600 mr-3" />
                    <h2 className="text-xl font-semibold dark:text-white">Zamanlanmış Görevler</h2>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => {
                            setShowHistory(!showHistory);
                            if (!showHistory) fetchHistory();
                        }}
                        className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"
                    >
                        <History className="h-4 w-4 mr-2" />
                        Geçmiş
                    </button>
                    <button
                        onClick={fetchJobs}
                        className="flex items-center px-3 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-lg"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Yenile
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
                        <XCircle className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Scheduler Status & Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Durum</span>
                            {stats.is_running ? (
                                <span className="flex items-center text-green-600">
                                    <Power className="h-4 w-4 mr-1" /> Aktif
                                </span>
                            ) : (
                                <span className="flex items-center text-red-600">
                                    <PowerOff className="h-4 w-4 mr-1" /> Durduruldu
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-purple-600">{stats.total_jobs}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Görev</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-green-600">{stats.running_jobs}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Aktif Görev</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-yellow-600">{stats.paused_jobs}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Duraklatılmış</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-blue-600">{stats.total_executions}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Çalışma</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-red-600">{stats.error_rate.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Hata Oranı</div>
                    </div>
                </div>
            )}

            {/* Scheduler Control */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium dark:text-white">Scheduler Kontrolü</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Tüm zamanlanmış görevleri başlat veya durdur
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        {stats?.is_running ? (
                            <button
                                onClick={handleStopScheduler}
                                disabled={actionLoading === 'scheduler'}
                                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading === 'scheduler' ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <PowerOff className="h-4 w-4 mr-2" />
                                )}
                                Durdur
                            </button>
                        ) : (
                            <button
                                onClick={handleStartScheduler}
                                disabled={actionLoading === 'scheduler'}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {actionLoading === 'scheduler' ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Power className="h-4 w-4 mr-2" />
                                )}
                                Başlat
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Jobs List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-gray-700">
                    <h3 className="font-medium dark:text-white flex items-center">
                        <Activity className="h-5 w-5 mr-2 text-purple-600" />
                        Görev Listesi
                    </h3>
                </div>
                <div className="divide-y dark:divide-gray-700">
                    {jobs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Henüz zamanlanmış görev bulunmuyor</p>
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <div key={job.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                                                {getStatusIcon(job.status)}
                                                <span className="ml-1">{getStatusLabel(job.status)}</span>
                                            </span>
                                            <span className="ml-3 font-medium dark:text-white">{job.name}</span>
                                            {job.is_system && (
                                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                    Sistem
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {job.description}
                                        </p>
                                        <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                                            <span className="flex items-center">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {formatTrigger(job.trigger_type, job.trigger_args)}
                                            </span>
                                            <span>
                                                Son: {formatDateTime(job.last_run)}
                                            </span>
                                            <span>
                                                Sonraki: {formatDateTime(job.next_run)}
                                            </span>
                                            <span>
                                                Çalışma: {job.run_count} | Hata: {job.error_count}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        {/* Edit Button */}
                                        <button
                                            onClick={() => openEditModal(job)}
                                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                                            title="Düzenle"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        {job.status === 'running' ? (
                                            <button
                                                onClick={() => handlePauseJob(job.id)}
                                                disabled={actionLoading === job.id}
                                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg disabled:opacity-50"
                                                title="Duraklat"
                                            >
                                                {actionLoading === job.id ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Pause className="h-4 w-4" />
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleResumeJob(job.id)}
                                                disabled={actionLoading === job.id}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                                                title="Devam Ettir"
                                            >
                                                {actionLoading === job.id ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Play className="h-4 w-4" />
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleRunNow(job.id)}
                                            disabled={actionLoading === job.id}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                                            title="Şimdi Çalıştır"
                                        >
                                            <Zap className="h-4 w-4" />
                                        </button>
                                        {!job.is_system && (
                                            <button
                                                onClick={() => handleDeleteJob(job.id)}
                                                disabled={actionLoading === job.id}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                                title="Sil"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingJob && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-semibold dark:text-white flex items-center">
                                <Edit2 className="h-5 w-5 mr-2 text-purple-600" />
                                Görevi Düzenle
                            </h3>
                            <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Görev Adı
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Açıklama
                                </label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            {/* Trigger Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Zamanlama Tipi
                                </label>
                                <select
                                    value={editForm.trigger_type}
                                    onChange={(e) => setEditForm({ ...editForm, trigger_type: e.target.value as 'interval' | 'cron' })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="interval">Aralık (Interval)</option>
                                    <option value="cron">Günlük Saat (Cron)</option>
                                </select>
                            </div>

                            {/* Interval Settings */}
                            {editForm.trigger_type === 'interval' && (
                                <div className="flex space-x-3">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Değer
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editForm.interval_value}
                                            onChange={(e) => setEditForm({ ...editForm, interval_value: parseInt(e.target.value) || 1 })}
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Birim
                                        </label>
                                        <select
                                            value={editForm.interval_unit}
                                            onChange={(e) => setEditForm({ ...editForm, interval_unit: e.target.value as 'minutes' | 'hours' | 'days' })}
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="minutes">Dakika</option>
                                            <option value="hours">Saat</option>
                                            <option value="days">Gün</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Cron Settings */}
                            {editForm.trigger_type === 'cron' && (
                                <div className="flex space-x-3">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Saat
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="23"
                                            value={editForm.cron_hour}
                                            onChange={(e) => setEditForm({ ...editForm, cron_hour: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Dakika
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={editForm.cron_minute}
                                            onChange={(e) => setEditForm({ ...editForm, cron_minute: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end space-x-3">
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={actionLoading === 'edit'}
                                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                                {actionLoading === 'edit' ? (
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

            {/* Execution History */}
            {showHistory && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
                        <h3 className="font-medium dark:text-white flex items-center">
                            <History className="h-5 w-5 mr-2 text-purple-600" />
                            Çalışma Geçmişi
                        </h3>
                        <button
                            onClick={() => setShowHistory(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <XCircle className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Görev</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlangıç</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bitiş</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sonuç</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                            Henüz çalışma geçmişi bulunmuyor
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((log, index) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-sm font-medium dark:text-white">
                                                {log.job_name}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {formatDateTime(log.started_at)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {formatDateTime(log.finished_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-700' :
                                                        log.status === 'error' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {log.status === 'success' ? 'Başarılı' :
                                                        log.status === 'error' ? 'Hata' : 'Çalışıyor'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                                {log.error || log.result || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchedulerPanel;
