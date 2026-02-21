import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
    Sparkles, Send, Check, Copy, Download, Clock, Coins, Zap,
    ChevronDown, Loader2, Trophy, Star, RefreshCw, Settings
} from 'lucide-react';

interface Model {
    id: string;
    name: string;
    icon: string;
    color: string;
    tier: 'free' | 'premium';
    available: boolean;
}

interface ComparisonResult {
    model_id: string;
    name: string;
    icon: string;
    color: string;
    tier: string;
    success: boolean;
    error?: string;
    response?: string;
    metrics?: {
        duration_ms: number;
        token_count: number;
        cost: number;
        speed_score: number;
    };
}

export const ComparisonChatPage = () => {
    const [prompt, setPrompt] = useState('');
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [results, setResults] = useState<ComparisonResult[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Fetch available models
    const { data: modelsData, isLoading: isLoadingModels } = useQuery({
        queryKey: ['comparison-models'],
        queryFn: () => apiService.get('/comparison/models'),
        staleTime: 60000
    });

    const freeModels: Model[] = (modelsData as any)?.free || [];
    const premiumModels: Model[] = (modelsData as any)?.premium || [];

    // Compare mutation
    const compareMutation = useMutation({
        mutationFn: () => apiService.post('/comparison/compare', {
            prompt: prompt.trim(),
            model_ids: selectedModels
        }),
        onSuccess: (data: any) => {
            setResults(data.results || []);
        }
    });

    const toggleModel = (modelId: string) => {
        setSelectedModels(prev =>
            prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : prev.length < 6 ? [...prev, modelId] : prev
        );
    };

    const handleCompare = () => {
        if (prompt.trim().length < 5 || selectedModels.length < 2) return;
        setResults([]);
        compareMutation.mutate();
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Find winner (fastest)
    const getWinner = () => {
        const successResults = results.filter(r => r.success && r.metrics);
        if (successResults.length === 0) return null;
        return successResults.reduce((prev, curr) =>
            (curr.metrics?.duration_ms || 999999) < (prev.metrics?.duration_ms || 999999) ? curr : prev
        );
    };

    const winner = getWinner();

    // Calculate grid columns based on selected models
    const getGridCols = () => {
        const count = results.length || selectedModels.length;
        if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
        if (count <= 3) return 'grid-cols-1 md:grid-cols-3';
        if (count <= 4) return 'grid-cols-2 lg:grid-cols-4';
        return 'grid-cols-2 lg:grid-cols-3';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
            <div className="max-w-[1800px] mx-auto p-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full mb-4">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300 text-sm font-medium">Side-by-Side AI Comparison</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                            Model Karşılaştırma
                        </span>
                    </h1>
                    <p className="text-gray-400">En iyi AI modellerini yan yana test et, sonuçları karşılaştır</p>
                </div>

                {/* Model Selection */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Settings className="w-5 h-5 text-purple-400" />
                            Model Seçimi
                            <span className="text-sm text-gray-400 font-normal">({selectedModels.length}/6 seçili)</span>
                        </h3>
                    </div>

                    {/* Free Models */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">🆓 ÜCRETSİZ</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {freeModels.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => toggleModel(model.id)}
                                    disabled={!model.available}
                                    className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${selectedModels.includes(model.id)
                                            ? `bg-gradient-to-r ${model.color} text-white shadow-lg scale-105`
                                            : model.available
                                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    <span>{model.icon}</span>
                                    {model.name}
                                    {selectedModels.includes(model.id) && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Premium Models */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">💎 PREMİUM</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {premiumModels.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => toggleModel(model.id)}
                                    disabled={!model.available}
                                    className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${selectedModels.includes(model.id)
                                            ? `bg-gradient-to-r ${model.color} text-white shadow-lg scale-105`
                                            : model.available
                                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    <span>{model.icon}</span>
                                    {model.name}
                                    {selectedModels.includes(model.id) && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Prompt Input */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-6">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Karşılaştırmak istediğiniz promptu yazın... (min. 5 karakter)"
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <div className="flex justify-between items-center mt-4">
                        <p className="text-sm text-gray-400">
                            {selectedModels.length < 2
                                ? `En az 2 model seçin (${2 - selectedModels.length} kaldı)`
                                : `${selectedModels.length} model seçildi`}
                        </p>
                        <button
                            onClick={handleCompare}
                            disabled={compareMutation.isPending || prompt.trim().length < 5 || selectedModels.length < 2}
                            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2 transition-all"
                        >
                            {compareMutation.isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Karşılaştırılıyor...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    Karşılaştır
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Results Grid */}
                {results.length > 0 && (
                    <div className={`grid ${getGridCols()} gap-4`}>
                        {results.map((result) => (
                            <div
                                key={result.model_id}
                                className={`bg-gray-800/80 border rounded-2xl overflow-hidden transition-all ${winner?.model_id === result.model_id
                                        ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                                        : 'border-gray-700'
                                    }`}
                            >
                                {/* Card Header */}
                                <div className={`px-4 py-3 bg-gradient-to-r ${result.color} flex items-center justify-between`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{result.icon}</span>
                                        <span className="font-semibold text-white">{result.name}</span>
                                    </div>
                                    {winner?.model_id === result.model_id && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500 rounded-full">
                                            <Trophy className="w-3 h-3 text-yellow-900" />
                                            <span className="text-xs font-bold text-yellow-900">EN HIZLI</span>
                                        </div>
                                    )}
                                </div>

                                {/* Metrics */}
                                {result.success && result.metrics && (
                                    <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-700 flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1 text-blue-400">
                                            <Clock className="w-4 h-4" />
                                            <span>{result.metrics.duration_ms}ms</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-green-400">
                                            <Zap className="w-4 h-4" />
                                            <span>{result.metrics.token_count} tokens</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-yellow-400">
                                            <Star className="w-4 h-4" />
                                            <span>{result.metrics.speed_score.toFixed(1)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Response */}
                                <div className="p-4 max-h-96 overflow-y-auto">
                                    {result.success ? (
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <div className="text-gray-300 whitespace-pre-wrap">{result.response}</div>
                                        </div>
                                    ) : (
                                        <div className="text-red-400 text-sm">
                                            ❌ Hata: {result.error}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {result.success && (
                                    <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/30 flex items-center gap-2">
                                        <button
                                            onClick={() => copyToClipboard(result.response || '', result.model_id)}
                                            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                        >
                                            {copiedId === result.model_id ? (
                                                <><Check className="w-4 h-4 text-green-400" /> Kopyalandı</>
                                            ) : (
                                                <><Copy className="w-4 h-4" /> Kopyala</>
                                            )}
                                        </button>
                                        <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors">
                                            <Check className="w-4 h-4" /> Seç
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Loading State */}
                {compareMutation.isPending && (
                    <div className={`grid ${getGridCols()} gap-4`}>
                        {selectedModels.map((modelId) => {
                            const model = [...freeModels, ...premiumModels].find(m => m.id === modelId);
                            return (
                                <div key={modelId} className="bg-gray-800/80 border border-gray-700 rounded-2xl overflow-hidden">
                                    <div className={`px-4 py-3 bg-gradient-to-r ${model?.color || 'from-gray-600 to-gray-700'}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{model?.icon}</span>
                                            <span className="font-semibold text-white">{model?.name}</span>
                                        </div>
                                    </div>
                                    <div className="p-8 flex flex-col items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
                                        <p className="text-gray-400 text-sm">Yanıt bekleniyor...</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComparisonChatPage;
