import { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
    Camera, Upload, Mic, Play, Download, RefreshCw, Sparkles,
    Volume2, Image, Video, ChevronDown, User, Loader2, Check, X,
    Globe, Star, Music, Pause, FileAudio, UploadCloud
} from 'lucide-react';
import { Celebration, CreditToast } from '@/components/Celebration';
import PromptEnhancer from '@/components/PromptEnhancer';

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
    const availableLanguages = Array.from(new Set(builtinVoices.map(v => v.language?.split('-')[0]).filter(Boolean)));

    // Generate mutation (text mode)
    const generateMutation = useMutation({
        mutationFn: (data: { image_url: string; text: string; voice_id: string }) =>
            apiService.post('/avatar/generate', data),
        onSuccess: (data: GenerationResult) => {
            if (data.success && data.job_id) {
                setJobId(data.job_id);
                setIsGenerating(true);
                setCreditEarned({
                    amount: data.credit_cost || 0,
                    reason: 'Avatar video üretimi'
                });
                if (data.demo_mode) {
                    setResultUrl('https://d-id-talks-prod.s3.us-west-2.amazonaws.com/sample.mp4');
                    setIsGenerating(false);
                    setShowCelebration(true);
                    setShowCreditToast(true);
                } else {
                    startPolling(data.job_id);
                }
            } else {
                setError(data.message || 'Bir hata oluştu');
            }
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || 'Üretim hatası');
            setIsGenerating(false);
        }
    });

    // Generate with audio mutation
    const generateWithAudioMutation = useMutation({
        mutationFn: (data: { image_url: string; audio_url: string }) =>
            apiService.post('/avatar/generate-with-audio', data),
        onSuccess: (data: GenerationResult) => {
            if (data.success && data.job_id) {
                setJobId(data.job_id);
                setIsGenerating(true);
                setCreditEarned({
                    amount: data.credit_cost || 0,
                    reason: 'Avatar video üretimi (ses dosyası)'
                });
                if (data.demo_mode) {
                    setResultUrl('https://d-id-talks-prod.s3.us-west-2.amazonaws.com/sample.mp4');
                    setIsGenerating(false);
                    setShowCelebration(true);
                    setShowCreditToast(true);
                } else {
                    startPolling(data.job_id);
                }
            } else {
                setError(data.message || 'Bir hata oluştu');
            }
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || 'Üretim hatası');
            setIsGenerating(false);
        }
    });

    // Start polling
    const startPolling = (id: string) => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(async () => {
            try {
                const status = await apiService.get(`/avatar/status/${id}`);
                if (status.status === 'done' && status.result_url) {
                    clearInterval(pollIntervalRef.current!);
                    setResultUrl(status.result_url);
                    setIsGenerating(false);
                    setShowCelebration(true);
                    setShowCreditToast(true);
                    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
                } else if (status.status === 'error') {
                    clearInterval(pollIntervalRef.current!);
                    setError('Video üretimi başarısız');
                    setIsGenerating(false);
                }
            } catch (e) {
                clearInterval(pollIntervalRef.current!);
                setIsGenerating(false);
            }
        }, 3000);
    };

    // Handle image upload
    const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => setImagePreview(event.target?.result as string);
        reader.readAsDataURL(file);
        setIsUploading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await apiService.upload('/files/upload', formData);
            if (response.public_url) {
                setImageUrl(response.public_url);
            } else {
                setError('Fotoğraf yüklenemedi, lütfen tekrar deneyin');
                setImagePreview('');
            }
        } catch (err: any) {
            console.error('Image upload failed:', err);
            setError(err.response?.data?.detail || 'Fotoğraf yükleme hatası');
            setImagePreview('');
        } finally {
            setIsUploading(false);
        }
    }, []);

    // Handle audio upload
    const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAudioFileName(file.name);
        setIsUploadingAudio(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await apiService.upload('/files/upload', formData);
            if (response.public_url) {
                setAudioUrl(response.public_url);
            } else {
                setError('Ses dosyası yüklenemedi');
                setAudioFileName('');
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Ses yükleme hatası');
            setAudioFileName('');
        } finally {
            setIsUploadingAudio(false);
        }
    }, []);

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
            setError('Lütfen bir fotoğraf yükleyin');
            return;
        }
        if (inputMode === 'audio') {
            if (!audioUrl) {
                setError('Lütfen bir ses dosyası yükleyin');
                return;
            }
            setError(null);
            setResultUrl(null);
            generateWithAudioMutation.mutate({ image_url: imageUrl, audio_url: audioUrl });
        } else {
            if (!text.trim()) {
                setError('Lütfen bir metin girin');
                return;
            }
            setError(null);
            setResultUrl(null);
            generateMutation.mutate({ image_url: imageUrl, text, voice_id: selectedVoice });
        }
    };

    // Reset
    const handleReset = () => {
        setImageUrl(''); setImagePreview(''); setText('');
        setResultUrl(null); setJobId(null); setError(null);
        setIsGenerating(false); setAudioUrl(''); setAudioFileName('');
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };

    // Estimate
    const estimatedDuration = Math.max(15, Math.min(120, text.length / 10));
    const estimatedCost = inputMode === 'audio' ? 20 : estimatedDuration <= 15 ? 10 : estimatedDuration <= 30 ? 20 : estimatedDuration <= 60 ? 40 : 75;

    // Voice Card Component
    const VoiceCard = ({ voice }: { voice: Voice }) => {
        const isSelected = selectedVoice === voice.id;
        const isPlaying = playingVoiceId === voice.id;
        const hasPreview = !!voice.preview_url;

        return (
            <button
                onClick={() => setSelectedVoice(voice.id)}
                className={`group relative p-3 rounded-xl border transition-all duration-300 text-left w-full ${isSelected
                    ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30'
                    : 'border-gray-700/60 hover:border-gray-600 hover:bg-gray-800/40'
                    }`}
            >
                {/* Selected checkmark */}
                {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-3 h-3 text-white" />
                    </div>
                )}

                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${voice.gender === 'male'
                            ? 'bg-gradient-to-br from-blue-500/30 to-cyan-500/30 text-blue-300'
                            : voice.gender === 'female'
                                ? 'bg-gradient-to-br from-pink-500/30 to-rose-500/30 text-pink-300'
                                : 'bg-gradient-to-br from-purple-500/30 to-violet-500/30 text-purple-300'
                        }`}>
                        {voice.flag || (voice.gender === 'male' ? '♂' : voice.gender === 'female' ? '♀' : '🎤')}
                        {isSelected && (
                            <div className="absolute inset-0 rounded-full ring-2 ring-purple-400 animate-pulse" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                {voice.name}
                            </p>
                            {voice.provider === 'ElevenLabs' && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 rounded-full border border-amber-500/30">
                                    PRO
                                </span>
                            )}
                            {voice.provider === 'clone' && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 rounded-full border border-green-500/30">
                                    KLON
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                            {voice.language === 'multilingual' ? '🌍 Çok dilli' : voice.language}
                        </p>
                    </div>

                    {/* Preview button */}
                    {hasPreview && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePlayPreview(voice); }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isPlaying
                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white opacity-0 group-hover:opacity-100'
                                }`}
                        >
                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                        </button>
                    )}
                </div>
            </button>
        );
    };

    // Voice tabs config
    const voiceTabs = [
        { id: 'builtin' as VoiceTab, label: 'Hazır Sesler', icon: Globe, count: builtinVoices.length },
        { id: 'premium' as VoiceTab, label: 'Premium AI', icon: Star, count: premiumVoices.length },
        { id: 'cloned' as VoiceTab, label: 'Kendi Sesin', icon: Mic, count: clonedVoices.length },
    ];

    return (
        <>
            {/* Celebrations */}
            <Celebration show={showCelebration} type="stars" onComplete={() => setShowCelebration(false)} />
            <CreditToast
                show={showCreditToast}
                amount={creditEarned.amount}
                reason={creditEarned.reason}
                onClose={() => setShowCreditToast(false)}
            />

            {/* Hidden audio player for previews */}
            <audio ref={audioPreviewRef} className="hidden" />

            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-4">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span className="text-purple-300 text-sm font-medium">AI Avatar</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            Konuşan <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Avatar</span> Oluştur
                        </h1>
                        <p className="text-gray-400 max-w-xl mx-auto">
                            Fotoğrafını yükle, metni yaz ve AI ile konuşan bir avatar videosu oluştur!
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Left: Input Section */}
                        <div className="space-y-6">
                            {/* Image Upload */}
                            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Image className="w-5 h-5 text-purple-400" />
                                    Fotoğraf
                                </h3>

                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full h-64 object-cover rounded-xl"
                                        />
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                                    <span className="text-white text-sm">Yükleniyor...</span>
                                                </div>
                                            </div>
                                        )}
                                        {!isUploading && (
                                            <button
                                                onClick={() => { setImagePreview(''); setImageUrl(''); }}
                                                className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-xl p-8 text-center cursor-pointer transition-all hover:bg-gray-700/30"
                                    >
                                        <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                                            <Upload className="w-8 h-8 text-purple-400" />
                                        </div>
                                        <p className="text-gray-300 font-medium mb-1">Fotoğraf Yükle</p>
                                        <p className="text-gray-500 text-sm">veya sürükle bırak</p>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </div>

                            {/* Input Mode Toggle */}
                            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <Volume2 className="w-5 h-5 text-purple-400" />
                                        Ses Kaynağı
                                    </h3>
                                    <div className="flex-1" />
                                    <div className="flex bg-gray-900/60 rounded-lg p-0.5 border border-gray-700">
                                        <button
                                            onClick={() => setInputMode('text')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${inputMode === 'text'
                                                    ? 'bg-purple-600 text-white shadow-md'
                                                    : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            ✍️ Metin
                                        </button>
                                        <button
                                            onClick={() => setInputMode('audio')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${inputMode === 'audio'
                                                    ? 'bg-purple-600 text-white shadow-md'
                                                    : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            🎵 Ses Dosyası
                                        </button>
                                    </div>
                                </div>

                                {inputMode === 'text' ? (
                                    <>
                                        <div className="relative">
                                            <textarea
                                                value={text}
                                                onChange={(e) => setText(e.target.value)}
                                                placeholder="Avatar'ın söyleyeceği metni yazın..."
                                                className="w-full h-32 pr-12 bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                            />
                                            <div className="absolute right-3 top-3">
                                                <PromptEnhancer contentType="avatar" currentPrompt={text} onSelectPrompt={(p) => setText(p)} />
                                            </div>
                                        </div>
                                        <div className="flex justify-between mt-2 text-sm">
                                            <span className="text-gray-500">{text.length} karakter</span>
                                            <span className="text-purple-400">~{Math.ceil(estimatedDuration)}sn video</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        {audioUrl ? (
                                            <div className="flex items-center gap-3 p-4 bg-gray-900/50 border border-green-500/30 rounded-xl">
                                                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                                    <FileAudio className="w-5 h-5 text-green-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-medium truncate">{audioFileName}</p>
                                                    <p className="text-green-400 text-xs">✓ Yüklendi</p>
                                                </div>
                                                <button
                                                    onClick={() => { setAudioUrl(''); setAudioFileName(''); }}
                                                    className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-400"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => audioInputRef.current?.click()}
                                                className="border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-gray-700/30"
                                            >
                                                {isUploadingAudio ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                                        <p className="text-gray-300 text-sm">Yükleniyor...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 mx-auto mb-3 bg-purple-500/20 rounded-full flex items-center justify-center">
                                                            <UploadCloud className="w-6 h-6 text-purple-400" />
                                                        </div>
                                                        <p className="text-gray-300 font-medium text-sm mb-1">Ses Dosyası Yükle</p>
                                                        <p className="text-gray-500 text-xs">MP3, WAV, OGG desteklenir</p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <input
                                            ref={audioInputRef}
                                            type="file"
                                            accept="audio/*"
                                            onChange={handleAudioUpload}
                                            className="hidden"
                                        />
                                        <p className="text-xs text-gray-500">
                                            💡 Kendi ses kaydınızı yükleyin, avatar dudak hareketlerini senkronize edecek.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Voice Selection — only shown in text mode */}
                            {inputMode === 'text' && (
                                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
                                    {/* Section header */}
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <Mic className="w-5 h-5 text-purple-400" />
                                        Ses Seçimi
                                    </h3>

                                    {/* Tabs */}
                                    <div className="flex gap-1 mb-4 bg-gray-900/50 rounded-xl p-1 border border-gray-700/50">
                                        {voiceTabs.map((tab) => {
                                            const Icon = tab.icon;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => { setVoiceTab(tab.id); setVoiceLanguageFilter('all'); }}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${voiceTab === tab.id
                                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                                                        }`}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">{tab.label}</span>
                                                    {tab.count > 0 && (
                                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${voiceTab === tab.id ? 'bg-white/20' : 'bg-gray-700'
                                                            }`}>
                                                            {tab.count}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Language filter (only for builtin) */}
                                    {voiceTab === 'builtin' && availableLanguages.length > 1 && (
                                        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                                            <button
                                                onClick={() => setVoiceLanguageFilter('all')}
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${voiceLanguageFilter === 'all'
                                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                                        : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:text-gray-200'
                                                    }`}
                                            >
                                                🌍 Tümü
                                            </button>
                                            {availableLanguages.map((lang) => {
                                                const langFlags: Record<string, string> = { tr: '🇹🇷', en: '🇺🇸', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', ja: '🇯🇵', ko: '🇰🇷', ar: '🇸🇦' };
                                                const langNames: Record<string, string> = { tr: 'Türkçe', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', ja: '日本語', ko: '한국어', ar: 'العربية' };
                                                return (
                                                    <button
                                                        key={lang}
                                                        onClick={() => setVoiceLanguageFilter(lang)}
                                                        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${voiceLanguageFilter === lang
                                                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                                                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:text-gray-200'
                                                            }`}
                                                    >
                                                        {langFlags[lang] || '🌐'} {langNames[lang] || lang.toUpperCase()}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Voice cards grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                                        {filteredVoices.length > 0 ? (
                                            filteredVoices.map((voice) => (
                                                <VoiceCard key={voice.id} voice={voice} />
                                            ))
                                        ) : (
                                            <div className="col-span-2 py-8 text-center text-gray-500">
                                                {voiceTab === 'premium' ? (
                                                    <div className="space-y-2">
                                                        <Star className="w-8 h-8 mx-auto text-gray-600" />
                                                        <p className="text-sm">ElevenLabs API anahtarı gerekli</p>
                                                        <p className="text-xs">Premium sesler için ayarlardan API anahtarını ekleyin</p>
                                                    </div>
                                                ) : voiceTab === 'cloned' ? (
                                                    <div className="space-y-2">
                                                        <Mic className="w-8 h-8 mx-auto text-gray-600" />
                                                        <p className="text-sm">Henüz klonlanmış sesiniz yok</p>
                                                        <p className="text-xs">Ses klonlama sayfasından sesinizi klonlayabilirsiniz</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm">Bu filtreye uygun ses bulunamadı</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || isUploading || isUploadingAudio || !imageUrl
                                    || (inputMode === 'text' && !text.trim())
                                    || (inputMode === 'audio' && !audioUrl)}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 text-lg shadow-lg shadow-purple-500/25 disabled:shadow-none"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Oluşturuluyor...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Avatar Oluştur
                                        <span className="text-sm opacity-80">({estimatedCost}💎)</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Right: Preview / Result */}
                        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 flex flex-col">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Video className="w-5 h-5 text-purple-400" />
                                Sonuç
                            </h3>

                            <div className="flex-1 flex items-center justify-center">
                                {isGenerating ? (
                                    <div className="text-center">
                                        <div className="w-20 h-20 mx-auto mb-4 relative">
                                            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
                                            <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" />
                                            <div className="absolute inset-2 border-4 border-transparent border-t-pink-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                                        </div>
                                        <p className="text-white font-medium mb-1">Video Oluşturuluyor...</p>
                                        <p className="text-gray-400 text-sm">Bu işlem 30-60 saniye sürebilir</p>
                                    </div>
                                ) : resultUrl ? (
                                    <div className="w-full">
                                        <video
                                            src={resultUrl}
                                            controls
                                            autoPlay
                                            className="w-full rounded-xl max-h-[400px]"
                                        />
                                        <div className="flex gap-3 mt-4">
                                            <a
                                                href={resultUrl}
                                                download="avatar.mp4"
                                                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl flex items-center justify-center gap-2"
                                            >
                                                <Download className="w-4 h-4" />
                                                İndir
                                            </a>
                                            <button
                                                onClick={handleReset}
                                                className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-xl flex items-center justify-center gap-2"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                Yeni Oluştur
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <div className="w-24 h-24 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
                                            <User className="w-12 h-12 text-gray-500" />
                                        </div>
                                        <p>Fotoğraf yükle ve metin gir</p>
                                        <p className="text-sm mt-1">Avatar videon burada görünecek</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="grid sm:grid-cols-3 gap-4 mt-8">
                        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                            <div className="text-2xl mb-2">🎨</div>
                            <h4 className="font-semibold text-white mb-1">Yüksek Kalite</h4>
                            <p className="text-gray-400 text-sm">Gerçekçi dudak senkronizasyonu</p>
                        </div>
                        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                            <div className="text-2xl mb-2">🌍</div>
                            <h4 className="font-semibold text-white mb-1">Çoklu Dil</h4>
                            <p className="text-gray-400 text-sm">15+ ses, 8 dil desteği</p>
                        </div>
                        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                            <div className="text-2xl mb-2">⚡</div>
                            <h4 className="font-semibold text-white mb-1">Hızlı</h4>
                            <p className="text-gray-400 text-sm">30-60 saniyede hazır</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom scrollbar styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(139, 92, 246, 0.3);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(139, 92, 246, 0.5);
                }
            `}</style>
        </>
    );
};

export default AvatarPage;
