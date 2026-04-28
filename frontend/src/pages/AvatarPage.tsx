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
    const [jobId, setJobId] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
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
            apiService.post('/avatar/generate-audio', params),
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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/50 to-cyan-50 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-3">
                                <span className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                                    <User className="w-8 h-8" />
                                </span>
                                {t('avatar.createTitle')} <span className="text-emerald-500">{t('avatar.createHighlight')}</span>
                            </h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-400 text-lg">
                                {t('avatar.subtitle')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Side: Setup */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* 1. Photo Upload */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">1</div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('avatar.photo')}</h3>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center overflow-hidden
                                    ${imagePreview ? 'border-emerald-500 bg-emerald-50/10' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600'}`}
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white font-medium flex items-center gap-2">
                                                <RefreshCw className="w-4 h-4" /> {t('avatar.changePhoto')}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-8">
                                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <Camera className="w-8 h-8 text-blue-500" />
                                        </div>
                                        <p className="text-gray-900 dark:text-white font-bold text-lg">{t('avatar.uploadPhoto')}</p>
                                        <p className="text-gray-500 text-sm mt-1">{t('avatar.uploadPhotoFormats')}</p>
                                        <p className="text-gray-400 text-xs mt-4 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full inline-block">
                                            {t('avatar.uploadPhotoDesc')}
                                        </p>
                                    </div>
                                )}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center">
                                        <div className="text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('avatar.loading')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                        </div>

                        {/* 2. Text or Audio Input */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold">2</div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('avatar.sourceVoice')}</h3>
                                </div>

                                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                                    <button
                                        onClick={() => setInputMode('text')}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${inputMode === 'text' ? 'bg-white dark:bg-gray-800 text-emerald-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {t('avatar.modeText')}
                                    </button>
                                    <button
                                        onClick={() => setInputMode('audio')}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${inputMode === 'audio' ? 'bg-white dark:bg-gray-800 text-emerald-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {t('avatar.modeAudio')}
                                    </button>
                                </div>
                            </div>

                            {inputMode === 'text' ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value.slice(0, 500))}
                                            placeholder={t('avatar.enterText')}
                                            className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-base"
                                        />
                                        <div className="absolute bottom-4 right-4 flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
                                                {t('avatar.characters', { count: text.length })} / 500
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-500 bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
                                                {t('avatar.estimatedVideo', { count: Math.ceil(text.length / 15) })}
                                            </span>
                                        </div>
                                    </div>
                                    <PromptEnhancer onEnhanced={(newText) => setText(newText)} />
                                </div>
                            ) : (
                                <div
                                    onClick={() => audioInputRef.current?.click()}
                                    className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center
                                        ${audioUrl ? 'border-emerald-500 bg-emerald-50/10' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-400'}`}
                                >
                                    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <FileAudio className="w-6 h-6 text-orange-500" />
                                    </div>
                                    {isUploadingAudio ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                    ) : audioUrl ? (
                                        <div className="text-center">
                                            <p className="text-emerald-600 font-bold flex items-center justify-center gap-2">
                                                <Check className="w-4 h-4" /> {t('avatar.audioUploaded')}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">{audioFileName}</p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <p className="text-gray-900 dark:text-white font-bold">{t('avatar.uploadAudio')}</p>
                                            <p className="text-xs text-gray-500 mt-1">{t('avatar.audioFormats')}</p>
                                        </div>
                                    )}
                                    <p className="mt-4 text-[11px] text-gray-400 text-center max-w-sm">
                                        {t('avatar.audioTip')}
                                    </p>
                                    <input type="file" ref={audioInputRef} onChange={handleAudioSelect} accept="audio/*" className="hidden" />
                                </div>
                            )}
                        </div>

                        {/* 3. Voice Selection (Only for text mode) */}
                        {inputMode === 'text' && (
                            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">3</div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('avatar.voiceSelection')}</h3>
                                    </div>

                                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                                        <button onClick={() => setVoiceTab('builtin')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${voiceTab === 'builtin' ? 'bg-white dark:bg-gray-800 text-purple-600 shadow-sm' : 'text-gray-500'}`}>
                                            {t('avatar.tabBuiltin')}
                                        </button>
                                        <button onClick={() => setVoiceTab('premium')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${voiceTab === 'premium' ? 'bg-white dark:bg-gray-800 text-purple-600 shadow-sm' : 'text-gray-500'}`}>
                                            {t('avatar.tabPremium')}
                                        </button>
                                        <button onClick={() => setVoiceTab('cloned')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${voiceTab === 'cloned' ? 'bg-white dark:bg-gray-800 text-purple-600 shadow-sm' : 'text-gray-500'}`}>
                                            {t('avatar.tabCloned')}
                                        </button>
                                    </div>
                                </div>

                                {/* Filters */}
                                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                    <button
                                        onClick={() => setVoiceLanguageFilter('all')}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${voiceLanguageFilter === 'all' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white dark:bg-gray-800 text-gray-600 border-gray-200 dark:border-gray-700'}`}
                                    >
                                        {t('avatar.allLanguages')}
                                    </button>
                                    {languages.map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setVoiceLanguageFilter(lang)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap uppercase ${voiceLanguageFilter === lang ? 'bg-purple-500 text-white border-purple-500' : 'bg-white dark:bg-gray-800 text-gray-600 border-gray-200 dark:border-gray-700'}`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>

                                {/* Voice Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredVoices.map((voice) => (
                                        <div
                                            key={voice.id}
                                            onClick={() => setSelectedVoice(voice.id)}
                                            className={`relative group p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between
                                                ${selectedVoice === voice.id ? 'border-purple-500 bg-purple-50/30' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-purple-300'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                                                    {voice.gender === 'female' ? '👩' : '👨'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                                                        {voice.name}
                                                        {voice.category === 'multilingual' && <Globe className="w-3 h-3 text-blue-500" title={t('avatar.multilingual')} />}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{voice.language}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {voice.provider === 'elevenlabs' && <span className="text-[8px] bg-purple-600 text-white px-1.5 py-0.5 rounded-md font-bold tracking-widest">{t('avatar.proBadge')}</span>}
                                                {voice.clone_id && <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-md font-bold tracking-widest">{t('avatar.cloneBadge')}</span>}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePlayPreview(voice); }}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${playingVoiceId === voice.id ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-purple-100'}`}
                                                >
                                                    {playingVoiceId === voice.id ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            {selectedVoice === voice.id && (
                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                                    <Check className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {filteredVoices.length === 0 && (
                                        <div className="col-span-full py-12 text-center">
                                            <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium">
                                                {voiceTab === 'premium' ? t('avatar.premiumRequired') : voiceTab === 'cloned' ? t('avatar.noClonedVoices') : t('avatar.noVoiceFound')}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {voiceTab === 'premium' ? t('avatar.premiumTip') : voiceTab === 'cloned' ? t('avatar.noClonedVoicesTip') : ''}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Result & Controls */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Result Panel */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 sticky top-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-emerald-500" />
                                    {t('avatar.result')}
                                </h3>
                                {resultUrl && (
                                    <button onClick={() => { setResultUrl(null); setJobId(null); }} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 font-bold">
                                        <RefreshCw className="w-3 h-3" /> {t('avatar.newCreate')}
                                    </button>
                                )}
                            </div>

                            <div className={`aspect-video rounded-2xl overflow-hidden bg-gray-900 flex flex-col items-center justify-center relative shadow-inner
                                ${isGenerating ? 'ring-4 ring-emerald-500/20 animate-pulse' : ''}`}>
                                {resultUrl ? (
                                    <video src={resultUrl} controls className="w-full h-full object-contain" poster={imagePreview} />
                                ) : isGenerating ? (
                                    <div className="text-center p-8">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                                            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto relative" />
                                        </div>
                                        <p className="text-white font-bold text-lg">{t('avatar.generating')}</p>
                                        <p className="text-gray-400 text-sm mt-2">{t('avatar.generatingDesc')}</p>
                                        {jobId && (
                                            <div className="mt-4 px-3 py-1 bg-white/10 rounded-full inline-block">
                                                <p className="text-[10px] text-gray-300 font-mono">JOB ID: {jobId}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center p-8">
                                        <div className="w-20 h-20 bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-gray-700">
                                            <Video className="w-10 h-10 text-gray-600" />
                                        </div>
                                        <p className="text-white font-bold text-lg">{t('avatar.noResultYet')}</p>
                                        <p className="text-gray-500 text-sm mt-2">
                                            {t('avatar.noResultYetDesc')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-start gap-3">
                                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-6 space-y-3">
                                {!resultUrl ? (
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || isUploading || isUploadingAudio}
                                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-6 h-6" />
                                        )}
                                        {isGenerating ? t('avatar.processing') : t('avatar.generateAvatar')}
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <a
                                            href={resultUrl}
                                            download="zexai-avatar.mp4"
                                            className="py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <Download className="w-5 h-5" /> {t('avatar.download')}
                                        </a>
                                        <button
                                            onClick={() => { setResultUrl(null); setJobId(null); }}
                                            className="py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
                                        >
                                            <RefreshCw className="w-5 h-5" /> {t('avatar.newCreate')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Features Banner */}
                            <div className="mt-8 grid grid-cols-3 gap-2">
                                <div className="text-center">
                                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                                        <Zap className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-900 dark:text-white leading-tight">{t('avatar.fast')}</p>
                                    <p className="text-[8px] text-gray-500 mt-0.5">{t('avatar.fastDesc')}</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                                        <Star className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-900 dark:text-white leading-tight">{t('avatar.highQuality')}</p>
                                    <p className="text-[8px] text-gray-500 mt-0.5">{t('avatar.highQualityDesc')}</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                                        <Globe className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-900 dark:text-white leading-tight">{t('avatar.multiLang')}</p>
                                    <p className="text-[8px] text-gray-500 mt-0.5">{t('avatar.multiLangDesc')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Audio for Preview */}
            <audio ref={audioPreviewRef} className="hidden" />

            {/* Success Notifications */}
            {showCelebration && <Celebration onComplete={() => setShowCelebration(false)} />}
            {showCreditToast && (
                <CreditToast
                    amount={creditEarned.amount}
                    reason={creditEarned.reason}
                    onClose={() => setShowCreditToast(false)}
                />
            )}
        </div>
    );
};

export default AvatarPage;
