import React, { useState, useEffect } from 'react';
import {
    Shuffle, Play, Download, Clock, DollarSign, CheckCircle, XCircle,
    RefreshCw, X, ChevronDown, Zap, Sparkles, AlertTriangle, Image as ImageIcon
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

interface Model {
    id: string;
    name: string;
    provider: string;
    cost: number;
    speed: string;
}

interface CompareResult {
    model_id: string;
    model_name: string;
    provider: string;
    success: boolean;
    output_url?: string;
    response_time_ms: number;
    cost_credits: number;
    error_message?: string;
}

interface CostInfo {
    model_costs: { model_id: string; model_name: string; cost: number }[];
    subtotal: number;
    discount_percent: number;
    discount_amount: number;
    total: number;
}

const ModelComparePanel: React.FC = () => {
    const [models, setModels] = useState<Model[]>([]);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [loading, setLoading] = useState(false);
    const [comparing, setComparing] = useState(false);
    const [costInfo, setCostInfo] = useState<CostInfo | null>(null);
    const [results, setResults] = useState<CompareResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchModels();
    }, []);

    useEffect(() => {
        if (selectedModels.length >= 2) {
            calculateCost();
        } else {
            setCostInfo(null);
        }
    }, [selectedModels]);

    const fetchModels = async () => {
        try {
            setLoading(true);
            const response = await api.get('/compare/models?compare_type=image');
            setModels(response.data.models || []);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Modeller yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const calculateCost = async () => {
        try {
            const response = await api.post('/compare/calculate-cost', {
                model_ids: selectedModels,
                compare_type: 'image'
            });
            setCostInfo(response.data);
        } catch (err) {
            console.error('Cost calculation failed:', err);
        }
    };

    const toggleModel = (modelId: string) => {
        if (selectedModels.includes(modelId)) {
            setSelectedModels(prev => prev.filter(id => id !== modelId));
        } else if (selectedModels.length < 4) {
            setSelectedModels(prev => [...prev, modelId]);
        }
    };

    const handleCompare = async () => {
        if (!prompt.trim() || selectedModels.length < 2) {
            setError('Prompt ve en az 2 model seçmelisiniz');
            return;
        }

        try {
            setComparing(true);
            setError(null);
            setResults([]);

            const response = await api.post('/compare/image', {
                prompt: prompt.trim(),
                model_ids: selectedModels,
                aspect_ratio: aspectRatio
            });

            setResults(response.data.results || []);

        } catch (err: any) {
            setError(err.response?.data?.detail || 'Karşılaştırma başarısız');
        } finally {
            setComparing(false);
        }
    };

    const handleDownload = async (url: string, modelName: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `compare_${modelName}_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    const getSpeedBadge = (speed: string) => {
        const colors = {
            fast: 'bg-green-100 text-green-700',
            medium: 'bg-yellow-100 text-yellow-700',
            slow: 'bg-orange-100 text-orange-700'
        };
        return colors[speed as keyof typeof colors] || 'bg-gray-100 text-gray-700';
    };

    const formatTime = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                    <Shuffle className="h-8 w-8 text-purple-600" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Model Compare</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                    Aynı prompt ile birden fazla modeli karşılaştırın, en iyisini seçin
                </p>
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

            {/* Compare Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
                {/* Prompt Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Prompt
                    </label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Görmek istediğiniz görüntüyü detaylı açıklayın..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                   dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 
                                   focus:border-transparent resize-none"
                    />
                </div>

                {/* Aspect Ratio */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Görüntü Oranı
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {['1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => (
                            <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`px-4 py-2 rounded-lg border transition-all ${aspectRatio === ratio
                                        ? 'bg-purple-600 text-white border-purple-600'
                                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-purple-400'
                                    }`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Model Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Modeller <span className="text-gray-500">(2-4 seçin)</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {models.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => toggleModel(model.id)}
                                disabled={!selectedModels.includes(model.id) && selectedModels.length >= 4}
                                className={`relative p-4 rounded-xl border-2 transition-all ${selectedModels.includes(model.id)
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 disabled:opacity-50'
                                    }`}
                            >
                                {selectedModels.includes(model.id) && (
                                    <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-purple-600" />
                                )}
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900 dark:text-white">{model.name}</p>
                                    <p className="text-xs text-gray-500">{model.provider}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className={`text-xs px-2 py-0.5 rounded ${getSpeedBadge(model.speed)}`}>
                                            {model.speed}
                                        </span>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {model.cost} kredi
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cost Summary */}
                {costInfo && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 
                                    rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <DollarSign className="h-6 w-6 text-purple-600" />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        <span className="line-through">{costInfo.subtotal} kredi</span>
                                        <span className="ml-2 text-green-600 font-medium">
                                            %{costInfo.discount_percent} indirim!
                                        </span>
                                    </p>
                                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                                        {costInfo.total} kredi
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCompare}
                                disabled={comparing || !prompt.trim() || selectedModels.length < 2}
                                className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 
                                           text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 
                                           disabled:opacity-50 disabled:cursor-not-allowed transition-all
                                           shadow-lg hover:shadow-xl"
                            >
                                {comparing ? (
                                    <>
                                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                        Karşılaştırılıyor...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-5 w-5 mr-2" />
                                        Karşılaştır
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Grid */}
            {results.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        Karşılaştırma Sonuçları
                    </h2>
                    <div className={`grid gap-4 ${results.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                            results.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
                                'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                        }`}>
                        {results.map((result, i) => (
                            <div
                                key={result.model_id}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                            >
                                {/* Image */}
                                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                                    {result.success && result.output_url ? (
                                        <img
                                            src={result.output_url}
                                            alt={`${result.model_name} output`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                            <XCircle className="h-12 w-12 mb-2 text-red-500" />
                                            <p className="text-sm text-center px-4">
                                                {result.error_message || 'Üretim başarısız'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {result.model_name}
                                            </h3>
                                            <p className="text-xs text-gray-500">{result.provider}</p>
                                        </div>
                                        {result.success ? (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                                            <Clock className="h-4 w-4 mr-1" />
                                            {formatTime(result.response_time_ms)}
                                        </div>
                                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                                            <DollarSign className="h-4 w-4 mr-0.5" />
                                            {result.cost_credits} kr
                                        </div>
                                    </div>

                                    {result.success && result.output_url && (
                                        <button
                                            onClick={() => handleDownload(result.output_url!, result.model_name)}
                                            className="w-full flex items-center justify-center px-4 py-2 
                                                       bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 
                                                       dark:hover:bg-gray-600 rounded-lg transition-colors"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            İndir
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Prompt for empty state */}
            {results.length === 0 && !comparing && (
                <div className="text-center py-12 text-gray-500">
                    <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>Modelleri seçin, prompt yazın ve karşılaştırın!</p>
                </div>
            )}
        </div>
    );
};

export default ModelComparePanel;
