import { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
    Camera, Upload, Mic, Play, Download, RefreshCw, Sparkles,
    Volume2, Image, Video, ChevronDown, User, Loader2, Check, X
} from 'lucide-react';
import { Celebration, CreditToast } from '@/components/Celebration';
import PromptEnhancer from '@/components/PromptEnhancer';

interface Voice {
    id: string;
    name: string;
    language: string;
    gender: string;
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

export const AvatarPage = () => {
    const queryClient = useQueryClient();

    // States
    const [imageUrl, setImageUrl] = useState<string>('');
    const [imagePreview, setImagePreview] = useState<string>('');
    const [text, setText] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('tr-TR-AhmetNeural');
    const [isGenerating, setIsGenerating] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showCreditToast, setShowCreditToast] = useState(false);
    const [creditEarned, setCreditEarned] = useState({ amount: 0, reason: '' });
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch voices
    const { data: voicesData } = useQuery({
        queryKey: ['avatarVoices'],
        queryFn: () => apiService.get('/avatar/voices'),
    });
    const voices = (voicesData?.data || []) as Voice[];

    // Generate mutation
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

                // Demo mode returns immediately
                if (data.demo_mode) {
                    setResultUrl('https://d-id-talks-prod.s3.us-west-2.amazonaws.com/sample.mp4');
                    setIsGenerating(false);
                    setShowCelebration(true);
                    setShowCreditToast(true);
                } else {
                    // Start polling for status
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

    // Start polling for job status
    const startPolling = (id: string) => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }

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
    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setImagePreview(dataUrl);
                // In production, upload to storage and get URL
                setImageUrl(dataUrl);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    // Handle generate
    const handleGenerate = () => {
        if (!imageUrl || !text.trim()) {
            setError('Lütfen bir fotoğraf yükleyin ve metin girin');
            return;
        }

        setError(null);
        setResultUrl(null);
        generateMutation.mutate({
            image_url: imageUrl,
            text: text,
            voice_id: selectedVoice
        });
    };

    // Reset
    const handleReset = () => {
        setImageUrl('');
        setImagePreview('');
        setText('');
        setResultUrl(null);
        setJobId(null);
        setError(null);
        setIsGenerating(false);
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
    };

    // Estimate duration and cost
    const estimatedDuration = Math.max(15, Math.min(120, text.length / 10));
    const estimatedCost = estimatedDuration <= 15 ? 10 : estimatedDuration <= 30 ? 20 : estimatedDuration <= 60 ? 40 : 75;

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
                                        <button
                                            onClick={() => { setImagePreview(''); setImageUrl(''); }}
                                            className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
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

                            {/* Text Input */}
                            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Volume2 className="w-5 h-5 text-purple-400" />
                                    Metin
                                </h3>
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
                            </div>

                            {/* Voice Selection */}
                            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Mic className="w-5 h-5 text-purple-400" />
                                    Ses Seçimi
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {voices.map((voice) => (
                                        <button
                                            key={voice.id}
                                            onClick={() => setSelectedVoice(voice.id)}
                                            className={`p-3 rounded-xl border transition-all ${selectedVoice === voice.id
                                                ? 'border-purple-500 bg-purple-500/20 text-white'
                                                : 'border-gray-600 hover:border-gray-500 text-gray-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${voice.gender === 'male' ? 'bg-blue-500/30 text-blue-400' : 'bg-pink-500/30 text-pink-400'
                                                    }`}>
                                                    {voice.gender === 'male' ? '♂' : '♀'}
                                                </span>
                                                <div className="text-left">
                                                    <p className="font-medium text-sm">{voice.name}</p>
                                                    <p className="text-xs text-gray-500">{voice.language}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !imageUrl || !text.trim()}
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
                            <p className="text-gray-400 text-sm">Türkçe, İngilizce, Almanca, Fransızca</p>
                        </div>
                        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                            <div className="text-2xl mb-2">⚡</div>
                            <h4 className="font-semibold text-white mb-1">Hızlı</h4>
                            <p className="text-gray-400 text-sm">30-60 saniyede hazır</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AvatarPage;
