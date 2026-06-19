import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { Wand2, Sparkles, Copy, Check, X, Loader2, Palette, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EnhancedPrompt {
    prompt: string;
    style: string;
    description: string;
}

interface PromptEnhancerProps {
    contentType: 'image' | 'video' | 'audio' | 'avatar' | 'construction';
    onSelectPrompt: (prompt: string) => void;
    currentPrompt?: string;
    className?: string;
}

export const PromptEnhancer = ({
    contentType,
    onSelectPrompt,
    currentPrompt = '',
    className = ''
}: PromptEnhancerProps) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState(currentPrompt);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // Update input when currentPrompt changes
    useEffect(() => {
        if (currentPrompt && currentPrompt !== input) {
            setInput(currentPrompt);
        }
    }, [currentPrompt]);

    // Enhance mutation
    const enhanceMutation = useMutation({
        mutationFn: (data: { input: string; content_type: string; language?: string }) =>
            apiService.post('/prompt/enhance', data),
        onSuccess: () => {
            // Prompts are shown from mutation.data
        }
    });

    const handleEnhance = () => {
        if (!input.trim() || input.length < 3) return;
        enhanceMutation.mutate({
            input: input.trim(),
            content_type: contentType,
            language: i18n.language || 'en'
        });
    };

    const handleSelectPrompt = (prompt: string, index: number) => {
        onSelectPrompt(prompt);
        setCopiedIndex(index);
        setTimeout(() => {
            setCopiedIndex(null);
            setIsOpen(false);
        }, 500);
    };

    const handleCopy = (prompt: string, index: number) => {
        navigator.clipboard.writeText(prompt);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1500);
    };

    const enhancedPrompts = (enhanceMutation.data?.enhanced_prompts || []) as EnhancedPrompt[];

    return (
        <>
            {/* Magic Wand Button - More visible */}
            <button
                onClick={() => setIsOpen(true)}
                className={`p-2.5 rounded-xl transition-all hover:scale-110 shadow-lg ${className}
                    bg-gradient-to-r from-purple-600 to-pink-600 
                    hover:from-purple-500 hover:to-pink-500
                    border-2 border-white/20
                    text-white animate-pulse hover:animate-none`}
                title={t('promptEnhancer.btnTitle', '🪄 AI Prompt Geliştirici')}
            >
                <Wand2 className="w-5 h-5" />
            </button>

            {/* Modal - rendered via portal to body for proper z-index */}
            {isOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{t('promptEnhancer.modalTitle', 'AI Prompt Asistanı')}</h3>
                                    <p className="text-sm text-gray-400">{t('promptEnhancer.modalDesc', "Basit fikrinizi profesyonel prompt'a dönüştürün")}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                            {/* Input */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-gray-300 mb-2 block">
                                    {t('promptEnhancer.inputLabel', 'Fikrinizi yazın')}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleEnhance()}
                                        placeholder={t('promptEnhancer.inputPlaceholder', "Örn: Güneş batan bir sahil, palmiye ağaçları...")}
                                        className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={handleEnhance}
                                        disabled={enhanceMutation.isPending || input.length < 3}
                                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-xl transition-all flex items-center gap-2"
                                    >
                                        {enhanceMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Wand2 className="w-4 h-4" />
                                        )}
                                        {t('promptEnhancer.enhanceBtn', 'Geliştir')}
                                    </button>
                                </div>
                            </div>

                            {/* Results */}
                            {enhanceMutation.isPending && (
                                <div className="text-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                                    <p className="text-gray-400">{t('promptEnhancer.generating', "Prompt'lar oluşturuluyor...")}</p>
                                </div>
                            )}

                            {enhancedPrompts.length > 0 && !enhanceMutation.isPending && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Palette className="w-4 h-4 text-purple-400" />
                                        <span className="text-sm font-medium text-gray-300">{t('promptEnhancer.suggestedPrompts', 'Önerilen Promptlar')}</span>
                                    </div>

                                    {enhancedPrompts.map((item, index) => (
                                        <div
                                            key={index}
                                            className="group bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 rounded-xl p-4 transition-all cursor-pointer"
                                            onClick={() => handleSelectPrompt(item.prompt, index)}
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-medium rounded-lg">
                                                    {item.style}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopy(item.prompt, index);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                                                        title={t('promptEnhancer.copyTitle', 'Kopyala')}
                                                    >
                                                        {copiedIndex === index ? (
                                                            <Check className="w-4 h-4 text-green-400" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                                                </div>
                                            </div>
                                            <p className="text-gray-300 text-sm leading-relaxed">{item.prompt}</p>
                                            <p className="text-gray-500 text-xs mt-2">{item.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tips */}
                            {enhancedPrompts.length === 0 && !enhanceMutation.isPending && (
                                <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                                    <h4 className="text-sm font-medium text-gray-300 mb-2">{t('promptEnhancer.tipsTitle', '💡 İpuçları')}</h4>
                                    <ul className="text-sm text-gray-400 space-y-1">
                                        <li>{t('promptEnhancer.tip1', '• Basit ve kısa fikirler yazın (örn: "kedi", "uzay gemisi")')}</li>
                                        <li>{t('promptEnhancer.tip2', "• AI otomatik olarak detaylı prompt'lar üretecek")}</li>
                                        <li>{t('promptEnhancer.tip3', '• Farklı stillerde öneriler alacaksınız')}</li>
                                        <li>{t('promptEnhancer.tip4', "• Beğendiğiniz prompt'a tıklayarak kullanın")}</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default PromptEnhancer;
