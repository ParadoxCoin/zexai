import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
    Camera, Upload, Mic, Play, Download, RefreshCw, Sparkles,
    Volume2, Image as ImageIcon, Video, ChevronDown, User, Loader2, Check, X,
    Globe, Star, Music, Pause, FileAudio, UploadCloud, Zap
} from 'lucide-react';
import { Celebration, CreditToast } from '@/components/Celebration';
import PromptEnhancer from '@/components/PromptEnhancer';
import { useTranslation } from 'react-i18next';

interface Voice {
    id: string;
    name: string;
    language: string;
    gender: string;
    flag?: string;
    provider?: string;
    preview_url?: string;
    category?: string;
    clone_id?: string;
}

interface GenerationResult {
    success: boolean;
    job_id?: string;
    status?: string;
    result_url?: string;
    demo_mode?: boolean;
    credit_cost?: number;
    message?: string;
    error?: string;
}

type VoiceTab = 'builtin' | 'premium' | 'cloned';
type InputMode = 'text' | 'audio';

export const AvatarPage = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    // States
    const [imageUrl, setImageUrl] = useState<string>('');
    const [imagePreview, setImagePreview] = useState<string>('');
    const [text, setText] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('tr-TR-AhmetNeural');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedEffect, setSelectedEffect] = useState<string | null>(null);
    const [hoveredEffect, setHoveredEffect] = useState<string | null>(null);

    const effects = [
        { id: 'ai-hug', name: 'AI Hug', icon: '🫂', color: 'from-blue-500/20', badge: 'Viral', preview: '/hug.png' },
        { id: 'ai-dance', name: 'AI Dance', icon: '💃', color: 'from-pink-500/20', badge: 'Hot', preview: '/dance.png' },
        { id: 'melt', name: 'Melt', icon: '🫠', color: 'from-orange-500/20', preview: '/melt.png' },
        { id: 'inflate', name: 'Inflate', icon: '🎈', color: 'from-blue-400/20' },
        { id: 'clay', name: 'Clay Style', icon: '🎨', color: 'from-emerald-500/20' },
        { id: 'crush', name: 'Crush It', icon: '🔨', color: 'from-red-500/20' },
        { id: 'cake', name: 'Cake It', icon: '🍰', color: 'from-amber-400/20' },
        { id: 'dissolve', name: 'Dissolve', icon: '💨', color: 'from-indigo-500/20' },
        { id: 'pixelate', name: 'Pixelate', icon: '👾', color: 'from-purple-500/20' },
        { id: 'sketch', name: 'Pencil Sketch', icon: '✏️', color: 'from-slate-500/20' }
    ];

    const activeEffect = effects.find(e => e.id === (hoveredEffect || selectedEffect));
    const [showCelebration, setShowCelebration] = useState(false);
    const [showCreditToast, setShowCreditToast] = useState(false);
    const [creditEarned, setCreditEarned] = useState({ amount: 0, reason: '' });
    const [error, setError] = useState<string | null>(null);

    // Voice section states
    const [voiceTab, setVoiceTab] = useState<VoiceTab>('builtin');
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [inputMode, setInputMode] = useState<InputMode>('text');
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);
    const [audioFileName, setAudioFileName] = useState('');
    const [voiceLanguageFilter, setVoiceLanguageFilter] = useState<string>('all');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const audioPreviewRef = useRef<HTMLAudioElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch built-in voices
    const { data: voicesData } = useQuery({
        queryKey: ['avatarVoices'],
        queryFn: () => apiService.get('/avatar/voices'),
    });
    const builtinVoices = (voicesData?.data || []) as Voice[];

    // Fetch premium voices
    const { data: premiumData } = useQuery({
        queryKey: ['avatarPremiumVoices'],
        queryFn: () => apiService.get('/avatar/voices/premium'),
        enabled: voiceTab === 'premium',
    });
    const premiumVoices = (premiumData?.data || []) as Voice[];

    // Fetch cloned voices
    const { data: clonedData } = useQuery({
        queryKey: ['avatarClonedVoices'],
        queryFn: () => apiService.get('/avatar/voices/cloned'),
        enabled: voiceTab === 'cloned',
    });
    const clonedVoices = (clonedData?.data || []) as Voice[];

    // Get current voice list based on active tab
    const currentVoices = voiceTab === 'builtin' ? builtinVoices : voiceTab === 'premium' ? premiumVoices : clonedVoices;

    // Filter voices by language
    const filteredVoices = voiceLanguageFilter === 'all'
        ? currentVoices
        : currentVoices.filter(v => v.language?.startsWith(voiceLanguageFilter));

    // Get unique languages for filter
    const languages = Array.from(new Set(currentVoices.map(v => v.language?.split('-')[0]))).filter(Boolean);

    // Upload image
    const uploadMutation = useMutation({
        mutationFn: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiService.post('/avatar/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: (data) => {
            setImageUrl(data.url);
            setIsUploading(false);
        },
        onError: () => {
            setIsUploading(false);
            setError(t('avatar.uploadPhotoFirst'));
        }
    });

    // Upload audio
    const uploadAudioMutation = useMutation({
        mutationFn: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiService.post('/avatar/upload-audio', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: (data) => {
            setAudioUrl(data.url);
            setIsUploadingAudio(false);
        },
        onError: () => {
            setIsUploadingAudio(false);
            setError(t('avatar.uploadAudioFirst'));
        }
    });

    // Generate avatar
    const generateMutation = useMutation({
        mutationFn: (params: { image_url: string, text: string, voice_id: string }) =>
            apiService.post('/avatar/generate', params),
        onSuccess: (data: GenerationResult) => {
            if (data.job_id) {
                setJobId(data.job_id);
                startPolling(data.job_id);
            } else if (data.result_url) {
                setResultUrl(data.result_url);
                setIsGenerating(false);
                handleSuccess(data);
            }
        },
        onError: (err: any) => {
            setIsGenerating(false);
            setError(err?.response?.data?.detail || t('avatar.errorOccurred'));
        }
    });

    // Generate with audio
    const generateWithAudioMutation = useMutation({
        mutationFn: (params: { image_url: string, audio_url: string }) =>
            apiService.post('/avatar/generate-with-audio', params),
        onSuccess: (data: GenerationResult) => {
            if (data.job_id) {
                setJobId(data.job_id);
                startPolling(data.job_id);
            } else if (data.result_url) {
                setResultUrl(data.result_url);
                setIsGenerating(false);
                handleSuccess(data);
            }
        },
        onError: (err: any) => {
            setIsGenerating(false);
            setError(err?.response?.data?.detail || t('avatar.errorOccurred'));
        }
    });

    const handleSuccess = (data: GenerationResult) => {
        setShowCelebration(true);
        if (data.credit_cost) {
            setCreditEarned({ amount: data.credit_cost, reason: t('avatar.generationComplete') });
            setShowCreditToast(true);
        }
        queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    };

    const startPolling = (id: string) => {
        setIsGenerating(true);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = setInterval(async () => {
            try {
                const statusData = await apiService.get(`/avatar/status/${id}`);
                if (statusData.status === 'completed' && statusData.result_url) {
                    setResultUrl(statusData.result_url);
                    setIsGenerating(false);
                    setJobId(null);
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    handleSuccess(statusData);
                } else if (statusData.status === 'failed') {
                    setError(statusData.error || t('avatar.errorOccurred'));
                    setIsGenerating(false);
                    setJobId(null);
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);
    };

    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    // Handle image selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
            setIsUploading(true);
            uploadMutation.mutate(file);
        }
    };

    // Handle audio selection
    const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFileName(file.name);
            setIsUploadingAudio(true);
            uploadAudioMutation.mutate(file);
        }
    };

    // Play voice preview
    const handlePlayPreview = (voice: Voice) => {
        if (playingVoiceId === voice.id) {
            audioPreviewRef.current?.pause();
            setPlayingVoiceId(null);
            return;
        }
        if (voice.preview_url && audioPreviewRef.current) {
            audioPreviewRef.current.src = voice.preview_url;
            audioPreviewRef.current.play();
            setPlayingVoiceId(voice.id);
            audioPreviewRef.current.onended = () => setPlayingVoiceId(null);
        }
    };

    // Handle generate
    const handleGenerate = () => {
        if (!imageUrl) {
            setError(t('avatar.uploadPhotoFirst'));
            return;
        }
        if (inputMode === 'audio') {
            if (!audioUrl) {
                setError(t('avatar.uploadAudioFirst'));
                return;
            }
            setError(null);
            setResultUrl(null);
            generateWithAudioMutation.mutate({ image_url: imageUrl, audio_url: audioUrl });
        } else {
            if (!text.trim()) {
                setError(t('avatar.enterTextFirst'));
                return;
            }
            setError(null);
            setResultUrl(null);
            generateMutation.mutate({ image_url: imageUrl, text, voice_id: selectedVoice });
        }
    };

    return (
        <div className="min-h-screen bg-[#030712] text-white selection:bg-cyan-500/30 overflow-x-hidden">
            {/* Background Ambient Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
            </div>

            {/* Hero Header */}
            <div className="relative pt-8 pb-4 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-white/[0.01] backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 w-fit">
                            <User className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-300">
                                {t('avatar.badge', 'AI AVATAR STUDIO')}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase italic">
                            {t('avatar.createTitle', 'Avatar ')}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                                {t('avatar.createHighlight', 'Stüdyosu')}
                            </span>
                        </h1>
                        <p className="text-slate-400 text-sm max-w-xl font-medium uppercase tracking-wider opacity-80">
                            {t('avatar.subtitle', 'Fotoğraflarınızı konuşturun, kurumsal sunumlar ve içerikler için gerçekçi avatarlar oluşturun.')}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
                        <div className="flex flex-col items-end px-3">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Current Balance</span>
                            <span className="text-sm font-black text-cyan-400">{1000} ZEX</span>
                        </div>
                        <button
                            onClick={() => window.location.href = '/billing'}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20"
                        >
                            Top Up
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Side: Setup */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* 1. Photo Upload */}
                        <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl shadow-black/50">
                            <div className="flex items-center gap-3 mb-6">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                                    01. {t('avatar.photo', 'AVATAR PHOTO')}
                                </h3>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center overflow-hidden
                                    ${imagePreview ? 'border-cyan-500 bg-cyan-500/5' : 'border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5'}`}
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                                            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white text-[10px] font-black tracking-widest border border-white/20">
                                                <RefreshCw className="w-3 h-3" /> {t('avatar.changePhoto', 'REPLACE')}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-6">
                                        <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform border border-cyan-500/20">
                                            <Camera className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        <p className="text-white font-black text-[10px] uppercase tracking-widest">{t('avatar.uploadPhoto', 'UPLOAD SOURCE')}</p>
                                        <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-tighter leading-relaxed px-4">{t('avatar.uploadPhotoDesc', 'Choose a clear, front-facing portrait.')}</p>
                                    </div>
                                )}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                                        <div className="text-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-cyan-500 mx-auto mb-2" />
                                            <p className="text-[10px] font-black text-white tracking-widest uppercase">{t('avatar.loading', 'UPLOADING...')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                        </div>

                        {/* AI Effects Selection */}
                        <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                    02. {t('avatar.effectsTitle', 'AI EFFECTS LIBRARY')}
                                </h3>
                                <div className="flex gap-1">
                                    {['all', 'viral', 'magic', 'art'].map(cat => (
                                        <button 
                                            key={cat}
                                            className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border border-white/5 bg-white/5 text-slate-500 hover:text-white transition-colors"
                                        >
                                            {t(`avatar.${cat}Badge`, cat)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                {effects.map(effect => (
                                    <button
                                        key={effect.id}
                                        onMouseEnter={() => setHoveredEffect(effect.id)}
                                        onMouseLeave={() => setHoveredEffect(null)}
                                        onClick={() => setSelectedEffect(effect.id === selectedEffect ? null : effect.id)}
                                        className={`group relative p-3 rounded-xl border transition-all text-left overflow-hidden
                                            ${selectedEffect === effect.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${effect.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-lg">{effect.icon}</span>
                                            {effect.badge && (
                                                <span className="text-[7px] font-black bg-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded uppercase tracking-tighter border border-cyan-500/20">
                                                    {effect.badge}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors relative z-10">{effect.name}</span>
                                        <div className={`absolute top-2 right-2 w-1.5 h-1.5 bg-cyan-500 rounded-full transition-all ${selectedEffect === effect.id ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover:opacity-50'}`} />
                                    </button>
                                ))}
                            </div>
                            
                            {/* Example Preview Section */}
                            <AnimatePresence>
                                {activeEffect && activeEffect.preview && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-4 border-t border-white/5"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Eye className="w-3 h-3 text-cyan-400" />
                                                {t('avatar.examplePreview', 'EXAMPLE PREVIEW')}
                                            </span>
                                            <span className="text-[8px] font-black text-cyan-400 uppercase tracking-tighter bg-cyan-400/10 px-1.5 py-0.5 rounded-full border border-cyan-400/20 animate-pulse">
                                                Live Mockup
                                            </span>
                                        </div>
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl group/preview">
                                            <img 
                                                src={activeEffect.preview} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/preview:scale-110" 
                                                alt="Preview" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                            <div className="absolute bottom-2 left-2 flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                    <Play className="w-2.5 h-2.5 text-white fill-white" />
                                                </div>
                                                <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-lg">
                                                    {activeEffect.name} Effect
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            <p className="text-[8px] text-slate-500 mt-4 uppercase tracking-tighter italic">* {t('avatar.effectsInfo', 'Effects will be applied to the generated video automatically.')}</p>
                        </div>

                        {/* Features Banner */}
                        <div className="bg-cyan-500/5 rounded-3xl p-6 border border-cyan-500/10 backdrop-blur-md">
                             <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-4">{t('avatar.features', 'INSTITUTIONAL GRADE')}</h4>
                             <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0 border border-cyan-500/20">
                                        <Zap className="w-4 h-4 text-cyan-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{t('avatar.fast', 'High Speed Synthesis')}</p>
                                        <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter">{t('avatar.fastDesc', 'Ready in minutes')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center shrink-0 border border-purple-500/20">
                                        <Star className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{t('avatar.highQuality', '4K Ultra Fidelity')}</p>
                                        <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter">{t('avatar.highQualityDesc', 'Realistic micro-expressions')}</p>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Middle: Input & Voice */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* 3. Text or Audio Input */}
                        <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Mic className="w-3.5 h-3.5 text-orange-400" />
                                    03. {t('avatar.sourceVoice', 'VOICE SOURCE')}
                                </h3>

                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setInputMode('text')}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${inputMode === 'text' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        TEXT
                                    </button>
                                    <button
                                        onClick={() => setInputMode('audio')}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${inputMode === 'audio' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        FILE
                                    </button>
                                </div>
                            </div>

                            {inputMode === 'text' ? (
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value.slice(0, 500))}
                                            placeholder={t('avatar.enterText', 'What should the avatar say?')}
                                            className="w-full h-40 p-5 bg-black/40 border border-white/5 rounded-2xl text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none text-sm leading-relaxed"
                                        />
                                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-400 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
                                                {text.length} / 500
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <PromptEnhancer onEnhanced={(newText) => setText(newText)} contentType="text" currentPrompt={text} />
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => audioInputRef.current?.click()}
                                    className={`p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[160px]
                                        ${audioUrl ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-orange-500/50 hover:bg-orange-500/5'}`}
                                >
                                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-orange-500/20">
                                        <FileAudio className="w-6 h-6 text-orange-400" />
                                    </div>
                                    {isUploadingAudio ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                    ) : audioUrl ? (
                                        <div className="text-center">
                                            <p className="text-emerald-400 text-[10px] font-black tracking-widest flex items-center justify-center gap-2">
                                                <Check className="w-3.5 h-3.5" /> {t('avatar.audioUploaded', 'AUDIO READY')}
                                            </p>
                                            <p className="text-[9px] text-slate-500 mt-1 truncate max-w-[150px] uppercase font-bold">{audioFileName}</p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <p className="text-white font-black text-[10px] uppercase tracking-widest">{t('avatar.uploadAudio', 'UPLOAD AUDIO')}</p>
                                            <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-tighter">{t('avatar.audioFormats', 'MP3, WAV, M4A')}</p>
                                        </div>
                                    )}
                                    <input type="file" ref={audioInputRef} onChange={handleAudioSelect} accept="audio/*" className="hidden" />
                                </div>
                            )}
                        </div>

                        {/* 4. Voice Selection (Only for text mode) */}
                        {inputMode === 'text' && (
                            <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
                                <div className="flex flex-col gap-4 mb-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                                        04. {t('avatar.voiceSelection', 'VOICE ENGINE')}
                                    </h3>

                                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                        {['builtin', 'premium', 'cloned'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setVoiceTab(tab as VoiceTab)}
                                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all uppercase ${voiceTab === tab ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                {t(`avatar.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Filters */}
                                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                    <button
                                        onClick={() => setVoiceLanguageFilter('all')}
                                        className={`px-3 py-1.5 rounded-full text-[9px] font-black border transition-all whitespace-nowrap uppercase ${voiceLanguageFilter === 'all' ? 'bg-purple-500 text-white border-purple-500' : 'bg-black/40 text-slate-500 border-white/10 hover:border-white/20'}`}
                                    >
                                        {t('avatar.allLanguages', 'ALL LANGUAGES')}
                                    </button>
                                    {languages.map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setVoiceLanguageFilter(lang)}
                                            className={`px-3 py-1.5 rounded-full text-[9px] font-black border transition-all whitespace-nowrap uppercase ${voiceLanguageFilter === lang ? 'bg-purple-500 text-white border-purple-500' : 'bg-black/40 text-slate-500 border-white/10 hover:border-white/20'}`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>

                                {/* Voice Grid */}
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {filteredVoices.map((voice) => (
                                        <div
                                            key={voice.id}
                                            onClick={() => setSelectedVoice(voice.id)}
                                            className={`group p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between
                                                ${selectedVoice === voice.id ? 'border-purple-500 bg-purple-500/10' : 'border-transparent bg-white/5 hover:bg-white/10'}`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center shadow-sm text-sm shrink-0 border border-white/10">
                                                    {voice.gender === 'female' ? '👩' : '👨'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-white text-[11px] flex items-center gap-1.5 truncate uppercase tracking-widest">
                                                        {voice.name}
                                                        {voice.category === 'multilingual' && <Globe className="w-2.5 h-2.5 text-blue-400" />}
                                                    </p>
                                                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter truncate opacity-60">{voice.language}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {voice.provider === 'ElevenLabs' && <span className="text-[7px] bg-indigo-600 text-white px-1 py-0.5 rounded font-black tracking-widest">PRO</span>}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePlayPreview(voice); }}
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${playingVoiceId === voice.id ? 'bg-purple-600 text-white scale-110' : 'bg-black/40 text-slate-400 hover:text-purple-400'}`}
                                                >
                                                    {playingVoiceId === voice.id ? <Pause className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {filteredVoices.length === 0 && (
                                        <div className="py-8 text-center">
                                            <Music className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-50" />
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('avatar.noVoiceFound', 'SES BULUNAMADI')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Result & Actions */}
                    <div className="lg:col-span-4">
                        <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl sticky top-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                    {t('avatar.result', 'LIVE PREVIEW')}
                                </h3>
                            </div>

                            <div className={`aspect-[3/4] rounded-2xl overflow-hidden bg-black/60 flex flex-col items-center justify-center relative shadow-2xl border border-white/5
                                ${isGenerating ? 'ring-1 ring-emerald-500/50' : ''}`}>
                                {resultUrl ? (
                                    <video src={resultUrl} controls className="w-full h-full object-cover" poster={imagePreview} autoPlay loop />
                                ) : isGenerating ? (
                                    <div className="text-center p-8 z-10">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
                                            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto relative" />
                                        </div>
                                        <p className="text-white font-black text-sm tracking-widest uppercase mb-2">{t('avatar.generating', 'ÜRETİLİYOR')}</p>
                                        <p className="text-gray-500 text-[10px] leading-relaxed max-w-[200px] mx-auto">{t('avatar.generatingDesc', 'AI modelimiz fotoğrafınızı analiz ediyor ve konuşma animasyonunu oluşturuyor...')}</p>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 opacity-20">
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
                                            <Video className="w-8 h-8 text-slate-500" />
                                        </div>
                                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{t('avatar.noResultYet', 'WAITING FOR DATA')}</p>
                                    </div>
                                )}

                                {/* Progress Indicator for Generating */}
                                {isGenerating && (
                                     <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                                         <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 30, ease: "linear" }}
                                            className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                                         />
                                     </div>
                                )}
                            </div>

                            {/* Error Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
                                    >
                                        <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-red-500 font-bold leading-tight uppercase">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Main Action Button */}
                            <div className="mt-8">
                                {!resultUrl ? (
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || isUploading || isUploadingAudio}
                                        className="w-full py-5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xs rounded-2xl shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] border-t border-white/10"
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Zap className="w-4 h-4" />
                                        )}
                                        {isGenerating ? t('avatar.processing', 'SYNTHESIZING...') : t('avatar.generateAvatar', 'INITIALIZE AVATAR')}
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <a
                                            href={resultUrl}
                                            download="zexai-avatar.mp4"
                                            className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-[0.3em] border-t border-white/10"
                                        >
                                            <Download className="w-4 h-4" /> {t('avatar.download', 'EXPORT MP4')}
                                        </a>
                                        <button
                                            onClick={() => { setResultUrl(null); setJobId(null); }}
                                            className="w-full py-3 bg-white/5 text-slate-300 font-black text-[10px] rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all uppercase tracking-widest border border-white/5"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" /> {t('avatar.newCreate', 'START OVER')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <p className="mt-4 text-[9px] text-gray-500 text-center uppercase tracking-widest font-bold">
                                {t('avatar.creditCost', 'Maliyet: ~20-50 kredi / videO')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Audio for Preview */}
            <audio ref={audioPreviewRef} className="hidden" />

            {/* Success Notifications */}
            <Celebration show={showCelebration} type="confetti" onComplete={() => setShowCelebration(false)} />
            <CreditToast
                show={showCreditToast}
                amount={creditEarned.amount}
                reason={creditEarned.reason}
                onClose={() => setShowCreditToast(false)}
            />
        </div>
    );
};

export default AvatarPage;
