import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
    Sparkles, Send, Check, Copy, Clock, Zap,
    Loader2, Trophy, Star, ArrowLeft, BarChart3, Timer, RefreshCw
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';
import { useTranslation } from 'react-i18next';

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
    <div className="space-y-4 leading-relaxed font-medium">
      {parts.map((part, idx) => {
        const codeMatch = part.match(/```(\w*)\n([\s\S]*?)```/);
        if (codeMatch) {
          const [, lang, code] = codeMatch;
          return (
            <div key={idx} className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
              <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{lang || 'CODE'}</span>
              </div>
              <CodeBlock code={code} language={lang || 'javascript'} />
            </div>
          );
        }
        if (part.trim()) {
          const formatted = part
            .replace(/`([^`]+)`/g, '<code class="bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-400 text-[12px] font-mono border border-emerald-500/20">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-black text-white">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em class="italic text-slate-300">$1</em>')
            .replace(/^### (.+)$/gm, '<h3 class="text-sm font-black text-white uppercase tracking-widest mt-6 mb-2 border-l-2 border-emerald-500 pl-3">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-base font-black text-white uppercase tracking-[0.15em] mt-8 mb-3">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-lg font-black text-white uppercase tracking-[0.2em] mt-10 mb-4">$1</h1>')
            .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-300 mb-1">$1</li>')
            .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-300 mb-1">$1. $2</li>')
            .replace(/\n/g, '<br/>');
          return <div key={idx} className="text-[14px] text-slate-300" dangerouslySetInnerHTML={{ __html: formatted }} />;
        }
        return null;
      })}
    </div>
    );
};

export const ComparisonChatPage = ({ onBack }: { onBack?: () => void }) => {
    const { t } = useTranslation();
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
        mutationFn: () => apiService.post('/comparison/compare', { prompt: prompt.trim(), model_ids: selectedModels }, { timeout: 300000 }),
        onSuccess: (data: any) => {
            setGeneralError(null);
            setResults(data.results || []);
        },
        onError: (err: any) => {
            const errorMsg = err?.response?.data?.detail || err?.message || t('comparison.errorOccurred');
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
        if (prompt.trim().length < 1 || selectedModels.length < 2) return;
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
        <div className="flex flex-col h-[calc(100vh-64px)] bg-[#030712] relative overflow-hidden">
            {/* Background Ambient Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-900/10 rounded-full blur-[120px]" />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 px-8 py-5 border-b border-white/5 bg-white/[0.01] backdrop-blur-xl relative z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {onBack && (
                            <button onClick={onBack} className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 shadow-2xl flex items-center justify-center text-2xl relative group">
                                <div className="absolute inset-0 bg-purple-500/10 rounded-2xl blur-xl group-hover:bg-purple-500/20 transition-all" />
                                <Sparkles className="w-6 h-6 text-purple-400 relative z-10" />
                            </div>
                            <div>
                                <h1 className="text-[13px] font-black text-white uppercase tracking-[0.2em] leading-tight drop-shadow-sm">{t('comparison.title', 'DIAGNOSTIC COMPARISON')}</h1>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1 opacity-60">{t('comparison.subtitle', 'MULTI-MODEL NEURAL SYNTHESIS ANALYSIS')}</p>
                            </div>
                        </div>
                    </div>
                    {results.length > 0 && (
                        <button onClick={() => { setResults([]); setPrompt(''); setGeneralError(null); }}
                            className="flex items-center gap-2.5 px-5 py-2.5 text-[10px] font-black text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 uppercase tracking-widest">
                            <RefreshCw className="w-3.5 h-3.5" /> {t('comparison.reset', 'RESET DIAGNOSTICS')}
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

                    {/* ═══ Setup Area (shown when no results) ═══ */}
                    {results.length === 0 && (
                        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {/* Model Selection */}
                            <div className="bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-10 shadow-2xl">
                                <div className="flex items-center justify-between mb-10">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                        <BarChart3 className="w-4 h-4 text-purple-400" />
                                        {t('comparison.modelSelection', 'ENGINE SELECTION')}
                                        <span className="text-slate-600 ml-2">[{selectedModels.length} / 06]</span>
                                    </h3>
                                    {selectedModels.length > 0 && (
                                        <button onClick={() => setSelectedModels([])} className="text-[10px] font-black text-slate-600 hover:text-red-500 transition-colors uppercase tracking-widest">
                                            {t('comparison.clear', 'WIPE SELECTION')}
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-8">
                                    {/* Free Models */}
                                    {freeModels.length > 0 && (
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                {t('comparison.free', 'STANDARD CORES')}
                                            </p>
                                            <div className="flex flex-wrap gap-3">
                                                {freeModels.map((model) => (
                                                    <button key={model.id} onClick={() => toggleModel(model.id)} disabled={!model.available}
                                                        className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border ${selectedModels.includes(model.id)
                                                            ? 'bg-emerald-500/10 text-white border-emerald-500 shadow-lg shadow-emerald-500/10'
                                                            : model.available
                                                                ? 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10'
                                                                : 'bg-black/20 text-slate-800 cursor-not-allowed border-transparent'}`}>
                                                        <span className="text-lg opacity-60">{model.icon}</span>
                                                        <span>{model.name}</span>
                                                        {selectedModels.includes(model.id) && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Premium Models */}
                                    {premiumModels.length > 0 && (
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                {t('comparison.premium', 'HIGH-FIDELITY CORES')}
                                            </p>
                                            <div className="flex flex-wrap gap-3">
                                                {premiumModels.map((model) => (
                                                    <button key={model.id} onClick={() => toggleModel(model.id)} disabled={!model.available}
                                                        className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border ${selectedModels.includes(model.id)
                                                            ? 'bg-amber-500/10 text-white border-amber-500 shadow-lg shadow-amber-500/10'
                                                            : model.available
                                                                ? 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10'
                                                                : 'bg-black/20 text-slate-800 cursor-not-allowed border-transparent'}`}>
                                                        <span className="text-lg opacity-60">{model.icon}</span>
                                                        <span>{model.name}</span>
                                                        {selectedModels.includes(model.id) && <Check className="w-3.5 h-3.5 text-amber-400" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Prompt Input Area */}
                            <div className="bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-10 shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none" />
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={t('comparison.placeholder', 'DESCRIBE THE DIAGNOSTIC COMMAND...')}
                                    rows={4}
                                    className="w-full px-8 py-6 bg-black/60 border border-white/10 rounded-3xl text-slate-200 text-sm placeholder-slate-800 focus:ring-1 focus:ring-purple-500/50 outline-none resize-none transition-all leading-relaxed shadow-inner"
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCompare(); } }}
                                />
                                <div className="flex justify-between items-center mt-8">
                                    <p className="text-[10px] font-black uppercase tracking-widest">
                                        {selectedModels.length < 2
                                            ? <span className="text-amber-500/80 italic">{t('comparison.minModelsWarning', 'MINIMUM 2 ENGINES REQUIRED FOR ANALYSIS')}</span>
                                            : <span className="text-emerald-500/80">{t('comparison.modelsReady', { count: selectedModels.length })} {selectedModels.length} ENGINES OPERATIONAL</span>}
                                    </p>
                                    <button onClick={handleCompare}
                                        disabled={compareMutation.isPending || prompt.trim().length < 1 || selectedModels.length < 2}
                                        className="px-10 py-5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-purple-600/20 transition-all flex items-center justify-center gap-3 border-t border-white/10 active:scale-95">
                                        {compareMutation.isPending ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> {t('comparison.comparing', 'ANALYZING...')}</>
                                        ) : (
                                            <><Zap className="w-4 h-4" /> {t('comparison.compare', 'EXECUTE ANALYSIS')}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ Loading State ═══ */}
                    {compareMutation.isPending && (
                        <div className={`grid ${getGridCols()} gap-6 animate-in fade-in duration-500`}>
                            {selectedModels.map((modelId) => {
                                const model = allModels.find(m => m.id === modelId);
                                return (
                                    <div key={modelId} className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative h-80">
                                        <div className={`px-6 py-4 bg-gradient-to-r ${model?.color || 'from-slate-700 to-slate-900'} flex items-center gap-3 relative z-10`}>
                                            <span className="text-xl">{model?.icon}</span>
                                            <span className="font-black text-white text-[11px] uppercase tracking-widest">{model?.name}</span>
                                        </div>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-[40px] animate-pulse" />
                                                <Loader2 className="relative w-10 h-10 animate-spin text-purple-400" />
                                            </div>
                                            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-8">{t('comparison.waitingResponse', 'SYNTHESIZING...')}</p>
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
                                <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">{t('comparison.errorOccurred')}</h4>
                                <p className="text-sm text-red-600 dark:text-red-300 mt-1">{generalError}</p>
                                <button
                                    onClick={() => compareMutation.mutate()}
                                    className="mt-3 px-4 py-1.5 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/80 text-red-700 dark:text-red-300 text-xs font-medium rounded-lg transition-colors border border-red-200 dark:border-red-800"
                                >
                                    {t('comparison.retry')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ Results ═══ */}
                    {results.length > 0 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                            {/* Prompt recap */}
                            <div className="bg-black/60 backdrop-blur-2xl rounded-[2rem] border border-white/5 px-8 py-6 flex items-start gap-5 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500/50" />
                                <Send className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-slate-300 font-medium italic leading-relaxed">"{prompt}"</p>
                            </div>

                            {/* Summary stats */}
                            {winner && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-black/40 backdrop-blur-xl border border-yellow-500/20 rounded-3xl p-6 flex items-center gap-5 shadow-2xl relative group">
                                        <div className="absolute inset-0 bg-yellow-500/5 rounded-3xl" />
                                        <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Trophy className="w-6 h-6 text-yellow-500" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">{t('comparison.fastest', 'OPTIMAL SPEED')}</p>
                                            <p className="text-[12px] font-black text-white uppercase tracking-widest">{winner.icon} {winner.name}</p>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-6 flex items-center gap-5 shadow-2xl relative group">
                                        <div className="absolute inset-0 bg-blue-500/5 rounded-3xl" />
                                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Timer className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">{t('comparison.duration', 'LATENCY')}</p>
                                            <p className="text-[12px] font-black text-white uppercase tracking-widest">{(winner.metrics!.duration_ms / 1000).toFixed(2)}s</p>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-6 flex items-center gap-5 shadow-2xl relative group">
                                        <div className="absolute inset-0 bg-emerald-500/5 rounded-3xl" />
                                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Star className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">{t('comparison.tokens', 'THROUGHPUT')}</p>
                                            <p className="text-[12px] font-black text-white uppercase tracking-widest">{winner.metrics!.token_count} TOKENS</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Model results grid */}
                            <div className={`grid ${getGridCols()} gap-8`}>
                                {results.map((result) => (
                                    <div key={result.model_id}
                                        className={`bg-black/40 backdrop-blur-xl border rounded-[2rem] overflow-hidden transition-all hover:shadow-2xl hover:border-white/10 group ${winner?.model_id === result.model_id
                                            ? 'border-yellow-500/40 ring-1 ring-yellow-500/20 shadow-2xl shadow-yellow-500/5'
                                            : 'border-white/5'}`}>

                                        {/* Card Header */}
                                        <div className={`px-6 py-4 bg-gradient-to-r ${result.color} flex items-center justify-between relative overflow-hidden`}>
                                            <div className="absolute inset-0 bg-black/10" />
                                            <div className="flex items-center gap-3 relative z-10">
                                                <span className="text-xl">{result.icon}</span>
                                                <span className="font-black text-white text-[11px] uppercase tracking-widest">{result.name}</span>
                                            </div>
                                            {winner?.model_id === result.model_id && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400 rounded-full relative z-10 shadow-lg">
                                                    <Trophy className="w-3.5 h-3.5 text-yellow-900" />
                                                    <span className="text-[10px] font-black text-yellow-900 uppercase">RANK 01</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Metrics bar */}
                                        {result.success && result.metrics && (
                                            <div className="px-6 py-3 border-b border-white/5 flex items-center gap-6 bg-black/20">
                                                <span className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                                    <Clock className="w-3 h-3" />{(result.metrics.duration_ms / 1000).toFixed(2)}s
                                                </span>
                                                <span className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                                    <Zap className="w-3 h-3" />{result.metrics.token_count} TK
                                                </span>
                                                <span className="flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                                    <Star className="w-3 h-3" />{result.metrics.speed_score.toFixed(1)} PNT
                                                </span>
                                            </div>
                                        )}

                                        {/* Response */}
                                        <div className="p-8 max-h-[500px] overflow-y-auto scrollbar-hide bg-gradient-to-b from-white/[0.02] to-transparent">
                                            {result.success ? (
                                                <ResponseContent content={result.response || ''} />
                                            ) : (
                                                <div className="flex items-center gap-3 text-red-400 text-[11px] font-black uppercase tracking-widest p-5 bg-red-500/10 border border-red-500/20 rounded-2xl italic">
                                                    <span>DIAGNOSTIC FAILURE: {result.error}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {result.success && (
                                            <div className="px-6 py-4 border-t border-white/5 bg-black/40">
                                                <button onClick={() => copyToClipboard(result.response || '', result.model_id)}
                                                    className="w-full py-2.5 text-[10px] font-black text-slate-500 hover:text-white flex items-center justify-center gap-3 transition-all uppercase tracking-[0.2em] bg-white/5 rounded-xl border border-white/5 hover:bg-white/10">
                                                    {copiedId === result.model_id ? (
                                                        <><Check className="w-3.5 h-3.5 text-emerald-400" /> {t('comparison.copied', 'COPIED TO BUFFER')}</>
                                                    ) : (
                                                        <><Copy className="w-3.5 h-3.5" /> {t('comparison.copyResponse', 'CLONE RESPONSE')}</>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
