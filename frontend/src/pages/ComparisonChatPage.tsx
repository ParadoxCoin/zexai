import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
    Sparkles, Send, Check, Copy, Clock, Zap,
    Loader2, Trophy, Star, ArrowLeft, BarChart3, Timer, RefreshCw
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

interface Model {
    id: string; name: string; icon: string; color: string; tier: 'free' | 'premium'; available: boolean;
}

interface ComparisonResult {
    model_id: string; name: string; icon: string; color: string; tier: string;
    success: boolean; error?: string; response?: string;
    metrics?: { duration_ms: number; token_count: number; cost: number; speed_score: number; };
}

// Reuse message renderer
const ResponseContent = ({ content }: { content: string }) => {
    if (!content) return null;
    const parts = content.split(/(```\w*\n[\s\S]*?```)/g);
    return (
        <div className="space-y-2 leading-relaxed">
            {parts.map((part, idx) => {
                const codeMatch = part.match(/```(\w*)\n([\s\S]*?)```/);
                if (codeMatch) {
                    const [, lang, code] = codeMatch;
                    return <CodeBlock key={idx} code={code} language={lang || 'javascript'} />;
                }
                if (part.trim()) {
                    const formatted = part
                        .replace(/`([^`]+)`/g, '<code class="bg-gray-200/80 dark:bg-gray-600/80 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300 text-[13px] font-mono">$1</code>')
                        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
                        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                        .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-2 mb-1">$1</h3>')
                        .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-3 mb-1">$1</h2>')
                        .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc text-[13px]">$1</li>')
                        .replace(/\n/g, '<br/>');
                    return <div key={idx} className="text-[13px]" dangerouslySetInnerHTML={{ __html: formatted }} />;
                }
                return null;
            })}
        </div>
    );
};

export const ComparisonChatPage = ({ onBack }: { onBack?: () => void }) => {
    const [prompt, setPrompt] = useState('');
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [results, setResults] = useState<ComparisonResult[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [generalError, setGeneralError] = useState<string | null>(null);

    const { data: modelsData } = useQuery({
        queryKey: ['comparison-models'],
        queryFn: () => apiService.get('/comparison/models'),
        staleTime: 60000
    });

    useEffect(() => {
        console.log("ComparisonChatPage: component mounted");
    }, []);

    const freeModels: Model[] = (modelsData as any)?.free || [];
    const premiumModels: Model[] = (modelsData as any)?.premium || [];
    const allModels = [...freeModels, ...premiumModels];

    const compareMutation = useMutation({
        mutationFn: () => apiService.post('/comparison/compare', { prompt: prompt.trim(), model_ids: selectedModels }),
        onSuccess: (data: any) => {
            setGeneralError(null);
            setResults(data.results || []);
        },
        onError: (err: any) => {
            const errorMsg = err?.response?.data?.detail || err?.message || 'Karşılaştırma sırasında bir hata oluştu.';
            setGeneralError(errorMsg);
            setResults([]);
        }
    });

    const toggleModel = (modelId: string) => {
        setSelectedModels(prev =>
            prev.includes(modelId) ? prev.filter(id => id !== modelId) : prev.length < 6 ? [...prev, modelId] : prev
        );
    };

    const handleCompare = () => {
        if (prompt.trim().length < 5 || selectedModels.length < 2) return;
        setResults([]);
        setGeneralError(null);
        compareMutation.mutate();
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getWinner = () => {
        const ok = results.filter(r => r.success && r.metrics);
        if (ok.length === 0) return null;
        return ok.reduce((p, c) => (c.metrics?.duration_ms || 999999) < (p.metrics?.duration_ms || 999999) ? c : p);
    };
    const winner = getWinner();

    const getGridCols = () => {
        const n = results.length || selectedModels.length;
        if (n <= 2) return 'grid-cols-1 sm:grid-cols-2';
        if (n <= 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-gradient-to-br from-emerald-50 via-teal-50/50 to-cyan-50 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        {onBack && (
                            <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Model Karşılaştırma</h1>
                            <p className="text-[10px] sm:text-[11px] text-gray-500 hidden sm:block">AI modellerini yan yana test edin</p>
                        </div>
                    </div>
                    {results.length > 0 && (
                        <button onClick={() => { setResults([]); setPrompt(''); setGeneralError(null); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors">
                            <RefreshCw className="w-3 h-3" /> <span className="hidden sm:inline">Yeni </span>Sıfırla
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

                    {/* ═══ Setup Area (shown when no results) ═══ */}
                    {results.length === 0 && (
                        <>
                            {/* Model Selection */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-purple-500" />
                                        Model Seçimi
                                        <span className="text-xs font-normal text-gray-400 ml-1">({selectedModels.length}/6)</span>
                                    </h3>
                                    {selectedModels.length > 0 && (
                                        <button onClick={() => setSelectedModels([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                                            Temizle
                                        </button>
                                    )}
                                </div>

                                {/* Free Models */}
                                {freeModels.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">🆓 Ücretsiz</p>
                                        <div className="flex flex-wrap gap-2">
                                            {freeModels.map((model) => (
                                                <button key={model.id} onClick={() => toggleModel(model.id)} disabled={!model.available}
                                                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${selectedModels.includes(model.id)
                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500 shadow-sm'
                                                        : model.available
                                                            ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-transparent'}`}>
                                                    <span>{model.icon}</span>
                                                    <span>{model.name}</span>
                                                    {selectedModels.includes(model.id) && <Check className="w-3.5 h-3.5" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Premium Models */}
                                {premiumModels.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">💎 Premium</p>
                                        <div className="flex flex-wrap gap-2">
                                            {premiumModels.map((model) => (
                                                <button key={model.id} onClick={() => toggleModel(model.id)} disabled={!model.available}
                                                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${selectedModels.includes(model.id)
                                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-2 border-amber-500 shadow-sm'
                                                        : model.available
                                                            ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-transparent'}`}>
                                                    <span>{model.icon}</span>
                                                    <span>{model.name}</span>
                                                    {selectedModels.includes(model.id) && <Check className="w-3.5 h-3.5" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Prompt Input */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Karşılaştırmak istediğiniz soruyu yazın... (min. 5 karakter)"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 dark:focus:border-purple-600 text-sm transition-all"
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCompare(); } }}
                                />
                                <div className="flex justify-between items-center mt-3">
                                    <p className="text-xs text-gray-400">
                                        {selectedModels.length < 2
                                            ? <span className="text-amber-500">⚠ En az 2 model seçin</span>
                                            : <span className="text-emerald-500">✓ {selectedModels.length} model hazır</span>}
                                    </p>
                                    <button onClick={handleCompare}
                                        disabled={compareMutation.isPending || prompt.trim().length < 5 || selectedModels.length < 2}
                                        className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/20 disabled:shadow-none flex items-center gap-2 transition-all text-sm active:scale-95">
                                        {compareMutation.isPending ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Karşılaştırılıyor...</>
                                        ) : (
                                            <><Zap className="w-4 h-4" /> Karşılaştır</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ═══ Loading State ═══ */}
                    {compareMutation.isPending && (
                        <div className={`grid ${getGridCols()} gap-4`}>
                            {selectedModels.map((modelId) => {
                                const model = allModels.find(m => m.id === modelId);
                                return (
                                    <div key={modelId} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                                        <div className={`px-4 py-2.5 bg-gradient-to-r ${model?.color || 'from-gray-400 to-gray-500'} flex items-center gap-2`}>
                                            <span className="text-lg">{model?.icon}</span>
                                            <span className="font-semibold text-white text-sm">{model?.name}</span>
                                        </div>
                                        <div className="p-10 flex flex-col items-center justify-center">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
                                                <Loader2 className="relative w-8 h-8 animate-spin text-purple-500" />
                                            </div>
                                            <p className="text-gray-400 text-xs mt-4">Yanıt bekleniyor...</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ═══ Error State ═══ */}
                    {generalError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-lg shrink-0">
                                <span>❌</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">Hata Oluştu</h4>
                                <p className="text-sm text-red-600 dark:text-red-300 mt-1">{generalError}</p>
                                <button
                                    onClick={() => compareMutation.mutate()}
                                    className="mt-3 px-4 py-1.5 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/80 text-red-700 dark:text-red-300 text-xs font-medium rounded-lg transition-colors border border-red-200 dark:border-red-800"
                                >
                                    Tekrar Dene
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ Results ═══ */}
                    {results.length > 0 && (
                        <>
                            {/* Prompt recap */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-start gap-3">
                                <Send className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700 dark:text-gray-300">{prompt}</p>
                            </div>

                            {/* Summary stats */}
                            {winner && (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3 flex items-center gap-3">
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">En Hızlı</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{winner.icon} {winner.name}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 flex items-center gap-3">
                                        <Timer className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Süre</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{(winner.metrics!.duration_ms / 1000).toFixed(1)}s</p>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-3">
                                        <Star className="w-5 h-5 text-emerald-500" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Token</p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{winner.metrics!.token_count}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Model results grid */}
                            <div className={`grid ${getGridCols()} gap-4`}>
                                {results.map((result) => (
                                    <div key={result.model_id}
                                        className={`bg-white dark:bg-gray-800 border rounded-2xl overflow-hidden transition-all hover:shadow-lg ${winner?.model_id === result.model_id
                                            ? 'border-yellow-400 dark:border-yellow-600 ring-1 ring-yellow-400/30 shadow-lg shadow-yellow-500/10'
                                            : 'border-gray-200 dark:border-gray-700'}`}>

                                        {/* Card Header */}
                                        <div className={`px-4 py-2.5 bg-gradient-to-r ${result.color} flex items-center justify-between`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{result.icon}</span>
                                                <span className="font-semibold text-white text-sm">{result.name}</span>
                                            </div>
                                            {winner?.model_id === result.model_id && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400 rounded-full">
                                                    <Trophy className="w-3 h-3 text-yellow-900" />
                                                    <span className="text-[10px] font-bold text-yellow-900">1.</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Metrics bar */}
                                        {result.success && result.metrics && (
                                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4 text-[11px]">
                                                <span className="flex items-center gap-1 text-blue-500">
                                                    <Clock className="w-3 h-3" />{(result.metrics.duration_ms / 1000).toFixed(1)}s
                                                </span>
                                                <span className="flex items-center gap-1 text-emerald-500">
                                                    <Zap className="w-3 h-3" />{result.metrics.token_count} tk
                                                </span>
                                                <span className="flex items-center gap-1 text-amber-500">
                                                    <Star className="w-3 h-3" />{result.metrics.speed_score.toFixed(1)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Response */}
                                        <div className="p-4 max-h-[400px] overflow-y-auto">
                                            {result.success ? (
                                                <div className="text-gray-800 dark:text-gray-200">
                                                    <ResponseContent content={result.response || ''} />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                    <span>❌</span>
                                                    <span>{result.error}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {result.success && (
                                            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                                <button onClick={() => copyToClipboard(result.response || '', result.model_id)}
                                                    className="w-full py-1.5 text-xs font-medium text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 flex items-center justify-center gap-1.5 transition-colors">
                                                    {copiedId === result.model_id ? (
                                                        <><Check className="w-3 h-3 text-emerald-500" /> Kopyalandı</>
                                                    ) : (
                                                        <><Copy className="w-3 h-3" /> Yanıtı Kopyala</>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// No default export to avoid confusion with named export
