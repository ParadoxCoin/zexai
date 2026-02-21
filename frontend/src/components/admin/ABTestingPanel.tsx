import React, { useState, useEffect } from 'react';
import {
    FlaskConical, Play, Plus, Trash2, RefreshCw, Clock,
    CheckCircle, XCircle, AlertTriangle, BarChart3, X,
    ChevronDown, ChevronUp, Zap, DollarSign
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

interface TestResult {
    model_id: string;
    success: boolean;
    response_time_ms: number;
    cost_credits: number;
    output_url?: string;
    error_message?: string;
}

interface ABTest {
    id: string;
    name: string;
    test_type: string;
    prompt: string;
    model_ids: string[];
    description?: string;
    status: string;
    created_at: string;
    results?: TestResult[];
}

interface ModelOption {
    id: string;
    name: string;
    provider: string;
}

const ABTestingPanel: React.FC = () => {
    const [tests, setTests] = useState<ABTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedTest, setExpandedTest] = useState<string | null>(null);

    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [availableModels, setAvailableModels] = useState<Record<string, ModelOption[]>>({});
    const [newTest, setNewTest] = useState({
        name: '',
        test_type: 'image',
        prompt: '',
        model_ids: [] as string[],
        description: ''
    });

    useEffect(() => {
        fetchTests();
        fetchAvailableModels();
    }, []);

    const fetchTests = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/ab-tests');
            setTests(response.data.tests || []);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Testler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableModels = async () => {
        try {
            const response = await api.get('/admin/ab-tests/models/available');
            setAvailableModels(response.data.models || {});
        } catch (err) {
            console.error('Failed to fetch models:', err);
        }
    };

    const handleCreateTest = async () => {
        if (!newTest.name || !newTest.prompt || newTest.model_ids.length < 2) {
            setError('İsim, prompt ve en az 2 model seçilmelidir');
            return;
        }

        try {
            setActionLoading('create');
            await api.post('/admin/ab-tests', newTest);
            await fetchTests();
            setShowCreateModal(false);
            setNewTest({ name: '', test_type: 'image', prompt: '', model_ids: [], description: '' });
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Test oluşturulamadı');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRunTest = async (testId: string) => {
        try {
            setActionLoading(testId);
            await api.post(`/admin/ab-tests/${testId}/run`);
            await fetchTests();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Test çalıştırılamadı');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteTest = async (testId: string) => {
        if (!confirm('Bu testi silmek istediğinize emin misiniz?')) return;

        try {
            setActionLoading(testId);
            await api.delete(`/admin/ab-tests/${testId}`);
            await fetchTests();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Test silinemedi');
        } finally {
            setActionLoading(null);
        }
    };

    const toggleModelSelection = (modelId: string) => {
        setNewTest(prev => ({
            ...prev,
            model_ids: prev.model_ids.includes(modelId)
                ? prev.model_ids.filter(id => id !== modelId)
                : [...prev.model_ids, modelId]
        }));
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'running':
                return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'failed':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700';
            case 'running': return 'bg-blue-100 text-blue-700';
            case 'failed': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const formatTime = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
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
                    <FlaskConical className="h-6 w-6 text-purple-600 mr-3" />
                    <h2 className="text-xl font-semibold dark:text-white">Model A/B Testing</h2>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Test
                </button>
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

            {/* Info Banner */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start">
                    <BarChart3 className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-purple-800 dark:text-purple-200">A/B Testing</h4>
                        <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                            Aynı prompt'u farklı modellerde test edin. Performans, maliyet ve kalite karşılaştırması yapın.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tests List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-gray-700">
                    <h3 className="font-medium dark:text-white">Testler</h3>
                </div>
                <div className="divide-y dark:divide-gray-700">
                    {tests.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Henüz test oluşturulmamış</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-3 text-purple-600 hover:text-purple-700"
                            >
                                İlk testi oluşturun →
                            </button>
                        </div>
                    ) : (
                        tests.map((test) => (
                            <div key={test.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                                                {getStatusIcon(test.status)}
                                                <span className="ml-1">{test.status}</span>
                                            </span>
                                            <span className="ml-3 font-medium dark:text-white">{test.name}</span>
                                            <span className="ml-2 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                {test.test_type}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1 truncate max-w-xl">
                                            {test.prompt}
                                        </p>
                                        <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                                            <span>{test.model_ids.length} model</span>
                                            <span>{new Date(test.created_at).toLocaleString('tr-TR')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        {test.status === 'pending' && (
                                            <button
                                                onClick={() => handleRunTest(test.id)}
                                                disabled={actionLoading === test.id}
                                                className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {actionLoading === test.id ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Play className="h-4 w-4 mr-1" />
                                                        Çalıştır
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                        >
                                            {expandedTest === test.id ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTest(test.id)}
                                            disabled={actionLoading === test.id}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Results */}
                                {expandedTest === test.id && test.results && test.results.length > 0 && (
                                    <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                        <h4 className="text-sm font-medium mb-3 dark:text-white">Sonuçlar</h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-500 border-b dark:border-gray-600">
                                                        <th className="pb-2">Model</th>
                                                        <th className="pb-2">Durum</th>
                                                        <th className="pb-2">Süre</th>
                                                        <th className="pb-2">Maliyet</th>
                                                        <th className="pb-2">Çıktı</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-gray-600">
                                                    {test.results.map((result, idx) => (
                                                        <tr key={idx}>
                                                            <td className="py-2 font-medium dark:text-white">{result.model_id}</td>
                                                            <td className="py-2">
                                                                {result.success ? (
                                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                                ) : (
                                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                                )}
                                                            </td>
                                                            <td className="py-2">
                                                                <span className="flex items-center">
                                                                    <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                                                                    {formatTime(result.response_time_ms)}
                                                                </span>
                                                            </td>
                                                            <td className="py-2">
                                                                <span className="flex items-center">
                                                                    <DollarSign className="h-3 w-3 mr-1 text-green-500" />
                                                                    {result.cost_credits} kr
                                                                </span>
                                                            </td>
                                                            <td className="py-2">
                                                                {result.output_url ? (
                                                                    <a href={result.output_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                                                                        Görüntüle
                                                                    </a>
                                                                ) : result.error_message ? (
                                                                    <span className="text-red-500 text-xs">{result.error_message}</span>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Test Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                            <h3 className="font-semibold dark:text-white flex items-center">
                                <Plus className="h-5 w-5 mr-2 text-purple-600" />
                                Yeni A/B Test
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Test Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Test Adı *
                                </label>
                                <input
                                    type="text"
                                    value={newTest.name}
                                    onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                                    placeholder="Flux vs SDXL Karşılaştırma"
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            {/* Test Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Test Tipi *
                                </label>
                                <select
                                    value={newTest.test_type}
                                    onChange={(e) => setNewTest({ ...newTest, test_type: e.target.value, model_ids: [] })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="image">Görsel (Image)</option>
                                    <option value="video">Video</option>
                                    <option value="chat">Chat</option>
                                    <option value="audio">Ses (Audio)</option>
                                </select>
                            </div>

                            {/* Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Prompt *
                                </label>
                                <textarea
                                    value={newTest.prompt}
                                    onChange={(e) => setNewTest({ ...newTest, prompt: e.target.value })}
                                    placeholder="A beautiful sunset over mountains with dramatic clouds"
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            {/* Model Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Modeller * (en az 2 seçin)
                                </label>
                                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2 dark:border-gray-600">
                                    {availableModels[newTest.test_type]?.map((model) => (
                                        <label key={model.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newTest.model_ids.includes(model.id)}
                                                onChange={() => toggleModelSelection(model.id)}
                                                className="mr-3"
                                            />
                                            <span className="dark:text-white">{model.name}</span>
                                            <span className="ml-2 text-xs text-gray-500">({model.provider})</span>
                                        </label>
                                    )) || (
                                            <p className="text-gray-500 text-sm p-2">Bu tip için model bulunamadı</p>
                                        )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Seçili: {newTest.model_ids.length} model
                                </p>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Açıklama (Opsiyonel)
                                </label>
                                <input
                                    type="text"
                                    value={newTest.description}
                                    onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                                    placeholder="Test hakkında notlar..."
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end space-x-3 sticky bottom-0 bg-white dark:bg-gray-800">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleCreateTest}
                                disabled={actionLoading === 'create' || !newTest.name || !newTest.prompt || newTest.model_ids.length < 2}
                                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                                {actionLoading === 'create' ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                )}
                                Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ABTestingPanel;
