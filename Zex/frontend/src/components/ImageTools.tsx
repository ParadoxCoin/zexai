import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
    ImageOff, ZoomIn, Upload, Download, Loader2,
    CheckCircle, ArrowRight, Sparkles, Wand2, User,
    Palette, Eraser, Expand, Camera, RotateCcw, Stamp, SunMedium,
    Crop, ShoppingBag, Layers, UserCircle
} from 'lucide-react';

const imageTools = [
    { id: 'remove-bg', name: 'Arka Plan Kaldır', icon: ImageOff, color: 'pink', cost: 5 },
    { id: 'upscale', name: 'Büyüt (4K)', icon: ZoomIn, color: 'blue', cost: 10 },
    { id: 'img2img', name: 'Varyasyon', icon: Wand2, color: 'purple', cost: 8 },
    // { id: 'face-swap', name: 'Yüz Değiştir', icon: User, color: 'orange', cost: 10 },
    // { id: 'style', name: 'Stil Dönüştür', icon: Palette, color: 'cyan', cost: 8 },
    // { id: 'inpaint', name: 'Nesne Sil', icon: Eraser, color: 'red', cost: 8 },
    // { id: 'outpaint', name: 'Genişlet', icon: Expand, color: 'green', cost: 12 },
    // { id: 'restore', name: 'Fotoğraf Onar', icon: RotateCcw, color: 'amber', cost: 10 },
    // { id: 'remove-watermark', name: 'Filigran Kaldır', icon: Stamp, color: 'indigo', cost: 8 },
    // { id: 'color-correct', name: 'Renk Düzelt', icon: SunMedium, color: 'yellow', cost: 5 },
    // { id: 'magic-resize', name: 'Boyutlandır', icon: Crop, color: 'teal', cost: 8 },
    // { id: 'product-photo', name: 'Ürün Foto', icon: ShoppingBag, color: 'rose', cost: 15 },
    // { id: 'character', name: 'Karakter', icon: UserCircle, color: 'violet', cost: 12 },
];

const styleOptions = [
    { id: 'anime', name: 'Anime', icon: '🎨' },
    { id: 'oil-painting', name: 'Yağlı Boya', icon: '🖼️' },
    { id: 'watercolor', name: 'Suluboya', icon: '💧' },
    { id: 'sketch', name: 'Karakalem', icon: '✏️' },
    { id: '3d-render', name: '3D', icon: '🎮' },
    { id: 'cyberpunk', name: 'Cyberpunk', icon: '🌃' },
    { id: 'vintage', name: 'Vintage', icon: '📷' },
];

const colorOptions = [
    { id: 'auto', name: 'Otomatik', icon: '✨' },
    { id: 'vibrant', name: 'Canlı', icon: '🌈' },
    { id: 'warm', name: 'Sıcak', icon: '☀️' },
    { id: 'cool', name: 'Soğuk', icon: '❄️' },
    { id: 'vintage', name: 'Vintage', icon: '📼' },
];

const platformOptions = [
    { id: 'instagram_post', name: 'IG Post', icon: '📷', size: '1080x1080' },
    { id: 'instagram_story', name: 'IG Story', icon: '📱', size: '1080x1920' },
    { id: 'facebook_post', name: 'FB Post', icon: '👍', size: '1200x630' },
    { id: 'twitter_post', name: 'Twitter', icon: '🐦', size: '1200x675' },
    { id: 'youtube_thumbnail', name: 'YouTube', icon: '▶️', size: '1280x720' },
    { id: 'pinterest', name: 'Pinterest', icon: '📌', size: '1000x1500' },
];

const productBgOptions = [
    { id: 'studio_white', name: 'Stüdyo Beyaz', icon: '⚪' },
    { id: 'studio_gray', name: 'Stüdyo Gri', icon: '⭕' },
    { id: 'gradient_blue', name: 'Mavi', icon: '🟦' },
    { id: 'marble', name: 'Mermer', icon: '🪨' },
    { id: 'wood', name: 'Ahşap', icon: '🪵' },
    { id: 'lifestyle_desk', name: 'Masa', icon: '💻' },
];

const characterStyleOptions = [
    { id: 'realistic', name: 'Gerçekçi', icon: '📷' },
    { id: 'anime', name: 'Anime', icon: '🎨' },
    { id: '3d', name: '3D', icon: '🎮' },
    { id: 'cartoon', name: 'Karikatür', icon: '🎭' },
    { id: 'oil-painting', name: 'Yağlı Boya', icon: '🖼️' },
];

interface ImageToolsProps {
    onImageProcessed?: (url: string) => void;
}

const ImageTools = ({ onImageProcessed }: ImageToolsProps) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [secondFile, setSecondFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState('anime');
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const secondFileRef = useRef<HTMLInputElement>(null);

    const processImage = async (toolId: string) => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setActiveTool(toolId);

        try {
            const formData = new FormData();

            switch (toolId) {
                case 'remove-bg':
                    formData.append('file', selectedFile);
                    const bgResult = await apiService.upload('/image/remove-background', formData);
                    setResult(bgResult.image_base64 || bgResult.image_url);
                    break;

                case 'upscale':
                    formData.append('file', selectedFile);
                    formData.append('scale', '4');
                    const upResult = await apiService.upload('/image/upscale', formData);
                    setResult(upResult.image_url);
                    break;

                case 'img2img':
                    formData.append('file', selectedFile);
                    formData.append('prompt', prompt || 'high quality, detailed');
                    formData.append('strength', '0.7');
                    const i2iResult = await apiService.upload('/image/img2img', formData);
                    setResult(i2iResult.image_url);
                    break;

                case 'face-swap':
                    if (!secondFile) {
                        alert('Hedef görsel seçin');
                        return;
                    }
                    formData.append('source_face', selectedFile);
                    formData.append('target_image', secondFile);
                    const fsResult = await apiService.upload('/image/face-swap', formData);
                    setResult(fsResult.image_url);
                    break;

                case 'style':
                    formData.append('content_image', selectedFile);
                    formData.append('style', selectedStyle);
                    const stResult = await apiService.upload('/image/style-transfer', formData);
                    setResult(stResult.image_url);
                    break;

                case 'outpaint':
                    formData.append('file', selectedFile);
                    formData.append('prompt', prompt);
                    formData.append('direction', 'all');
                    const opResult = await apiService.upload('/image/outpaint', formData);
                    setResult(opResult.image_url);
                    break;

                case 'restore':
                    formData.append('file', selectedFile);
                    const restoreResult = await apiService.upload('/image/restore', formData);
                    setResult(restoreResult.image_url);
                    break;

                case 'remove-watermark':
                    formData.append('file', selectedFile);
                    const wmResult = await apiService.upload('/image/remove-watermark', formData);
                    setResult(wmResult.image_url);
                    break;

                case 'color-correct':
                    formData.append('file', selectedFile);
                    formData.append('enhancement_type', selectedStyle || 'auto');
                    const ccResult = await apiService.upload('/image/color-correct', formData);
                    setResult(ccResult.image_url);
                    break;

                case 'magic-resize':
                    formData.append('file', selectedFile);
                    formData.append('platform', selectedStyle || 'instagram_post');
                    formData.append('fill_mode', 'extend');
                    const mrResult = await apiService.upload('/image/magic-resize', formData);
                    setResult(mrResult.image_url);
                    break;

                case 'product-photo':
                    formData.append('file', selectedFile);
                    formData.append('background', selectedStyle || 'studio_white');
                    const ppResult = await apiService.upload('/image/product-photo', formData);
                    setResult(ppResult.image_url);
                    break;

                case 'character':
                    formData.append('reference_image', selectedFile);
                    formData.append('prompt', prompt || 'same person in different pose');
                    formData.append('style', selectedStyle || 'realistic');
                    const charResult = await apiService.upload('/image/character-generate', formData);
                    setResult(charResult.image_url);
                    break;
            }

            if (result) onImageProcessed?.(result);

        } catch (error: any) {
            console.error('Processing error:', error);
            alert(error.message || 'İşlem başarısız');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isSecond = false) => {
        const file = e.target.files?.[0];
        if (file) {
            if (isSecond) {
                setSecondFile(file);
            } else {
                setSelectedFile(file);
                setResult(null);
                const reader = new FileReader();
                reader.onload = (e) => setPreview(e.target?.result as string);
                reader.readAsDataURL(file);
            }
        }
    };

    const getColorClass = (color: string) => {
        const colors: Record<string, string> = {
            pink: 'hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20',
            blue: 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20',
            purple: 'hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20',
            orange: 'hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20',
            cyan: 'hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20',
            red: 'hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
            green: 'hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20',
            amber: 'hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20',
            indigo: 'hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
            yellow: 'hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20',
            teal: 'hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20',
            rose: 'hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20',
            violet: 'hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20',
        };
        return colors[color] || colors.blue;
    };

    const getIconColor = (color: string) => {
        const colors: Record<string, string> = {
            pink: 'text-pink-500', blue: 'text-blue-500', purple: 'text-purple-500',
            orange: 'text-orange-500', cyan: 'text-cyan-500', red: 'text-red-500',
            green: 'text-green-500', amber: 'text-amber-500', indigo: 'text-indigo-500',
            yellow: 'text-yellow-500', teal: 'text-teal-500', rose: 'text-rose-500',
            violet: 'text-violet-500',
        };
        return colors[color] || 'text-gray-500';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Görsel Araçları
            </h2>

            {/* Upload Area */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${preview ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-purple-500'
                        }`}
                >
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileSelect(e)} className="hidden" />
                    {preview ? (
                        <img src={preview} alt="Preview" className="max-h-24 mx-auto rounded-lg" />
                    ) : (
                        <>
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Ana Görsel</p>
                        </>
                    )}
                </div>

                {/* Result */}
                <div className={`border-2 border-dashed rounded-xl p-6 text-center ${result ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                    {result ? (
                        <div className="relative">
                            <img src={result} alt="Result" className="max-h-24 mx-auto rounded-lg" />
                            <a href={result} download className="absolute -bottom-2 -right-2 p-1.5 bg-emerald-500 rounded-full text-white">
                                <Download className="w-3 h-3" />
                            </a>
                        </div>
                    ) : (
                        <>
                            <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">Sonuç</p>
                        </>
                    )}
                </div>
            </div>

            {/* Prompt Input (for some tools) */}
            {selectedFile && (activeTool === 'img2img' || activeTool === 'outpaint') && (
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Prompt (opsiyonel)"
                    className="w-full px-4 py-2 mb-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm"
                />
            )}

            {/* Style Selector */}
            {selectedFile && activeTool === 'style' && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {styleOptions.map((style) => (
                        <button
                            key={style.id}
                            onClick={() => setSelectedStyle(style.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${selectedStyle === style.id
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-100'
                                }`}
                        >
                            <span>{style.icon}</span>
                            {style.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Color Correction Selector */}
            {selectedFile && activeTool === 'color-correct' && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {colorOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setSelectedStyle(option.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${selectedStyle === option.id
                                ? 'bg-yellow-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-100'
                                }`}
                        >
                            <span>{option.icon}</span>
                            {option.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Platform Selector for Magic Resize */}
            {selectedFile && activeTool === 'magic-resize' && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {platformOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setSelectedStyle(option.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${selectedStyle === option.id
                                ? 'bg-teal-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-teal-100'
                                }`}
                        >
                            <span>{option.icon}</span>
                            {option.name}
                            <span className="text-xs opacity-70">({option.size})</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Product Background Selector */}
            {selectedFile && activeTool === 'product-photo' && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {productBgOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setSelectedStyle(option.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${selectedStyle === option.id
                                ? 'bg-rose-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-rose-100'
                                }`}
                        >
                            <span>{option.icon}</span>
                            {option.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Character Style Selector */}
            {selectedFile && activeTool === 'character' && (
                <>
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Karakter için yeni sahne tanımı (örn: aynı kişi sahilde)"
                        className="w-full px-4 py-2 mb-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm"
                    />
                    <div className="flex flex-wrap gap-2 mb-4">
                        {characterStyleOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setSelectedStyle(option.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${selectedStyle === option.id
                                    ? 'bg-violet-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-violet-100'
                                    }`}
                            >
                                <span>{option.icon}</span>
                                {option.name}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Tools Grid */}
            {selectedFile && (
                <div className="grid grid-cols-7 gap-2">
                    {imageTools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <button
                                key={tool.id}
                                onClick={() => {
                                    setActiveTool(tool.id);
                                    if (tool.id !== 'style' && tool.id !== 'img2img' && tool.id !== 'outpaint' && tool.id !== 'face-swap' && tool.id !== 'color-correct' && tool.id !== 'magic-resize' && tool.id !== 'product-photo' && tool.id !== 'character') {
                                        processImage(tool.id);
                                    }
                                }}
                                disabled={isProcessing}
                                className={`p-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 transition-all disabled:opacity-50 ${getColorClass(tool.color)}`}
                            >
                                {isProcessing && activeTool === tool.id ? (
                                    <Loader2 className={`w-6 h-6 mx-auto animate-spin ${getIconColor(tool.color)}`} />
                                ) : (
                                    <Icon className={`w-6 h-6 mx-auto ${getIconColor(tool.color)}`} />
                                )}
                                <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{tool.name}</p>
                                <p className="text-xs text-gray-400">{tool.cost}₺</p>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Process Button for tools that need extra input */}
            {selectedFile && (activeTool === 'style' || activeTool === 'img2img' || activeTool === 'outpaint' || activeTool === 'color-correct' || activeTool === 'magic-resize' || activeTool === 'product-photo' || activeTool === 'character') && (
                <button
                    onClick={() => processImage(activeTool)}
                    disabled={isProcessing}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    İşle
                </button>
            )}

            {/* Second file input for face swap */}
            {selectedFile && activeTool === 'face-swap' && (
                <div className="mt-4">
                    <input ref={secondFileRef} type="file" accept="image/*" onChange={(e) => handleFileSelect(e, true)} className="hidden" />
                    <button
                        onClick={() => secondFileRef.current?.click()}
                        className="w-full py-3 border-2 border-dashed border-orange-400 text-orange-500 rounded-xl"
                    >
                        {secondFile ? '✓ Hedef görsel seçildi' : 'Hedef görseli seç'}
                    </button>
                    {secondFile && (
                        <button
                            onClick={() => processImage('face-swap')}
                            disabled={isProcessing}
                            className="w-full mt-2 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium"
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Yüz Değiştir'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageTools;
