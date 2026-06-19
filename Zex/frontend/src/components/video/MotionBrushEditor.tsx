import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Wand2, Upload, Play, Trash2, RotateCcw, Move,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Loader2,
    CheckCircle, X, Minus, Plus
} from 'lucide-react';

interface MotionPath {
    id: string;
    x: number;
    y: number;
    direction: 'up' | 'down' | 'left' | 'right' | 'custom';
    intensity: number;
    endX?: number;
    endY?: number;
}

interface MotionBrushEditorProps {
    onGenerate: (imageUrl: string, paths: MotionPath[]) => Promise<void>;
    isGenerating?: boolean;
}

const DIRECTIONS = [
    { id: 'up', icon: ArrowUp, label: 'Yukarı' },
    { id: 'down', icon: ArrowDown, label: 'Aşağı' },
    { id: 'left', icon: ArrowLeft, label: 'Sol' },
    { id: 'right', icon: ArrowRight, label: 'Sağ' },
    { id: 'custom', icon: Move, label: 'Özel' },
];

export const MotionBrushEditor: React.FC<MotionBrushEditorProps> = ({
    onGenerate,
    isGenerating = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

    const [motionPaths, setMotionPaths] = useState<MotionPath[]>([]);
    const [selectedDirection, setSelectedDirection] = useState<'up' | 'down' | 'left' | 'right' | 'custom'>('right');
    const [brushIntensity, setBrushIntensity] = useState(0.5);
    const [isDrawingCustom, setIsDrawingCustom] = useState(false);
    const [customStart, setCustomStart] = useState<{ x: number; y: number } | null>(null);

    // Load image when file changes
    useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setImageUrl(url);

            const img = new Image();
            img.onload = () => {
                setImageDimensions({ width: img.width, height: img.height });
            };
            img.src = url;

            return () => URL.revokeObjectURL(url);
        }
    }, [imageFile]);

    // Draw canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imageUrl) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            // Set canvas size to match container
            const container = containerRef.current;
            if (!container) return;

            const containerWidth = container.clientWidth;
            const scale = containerWidth / img.width;
            const canvasHeight = img.height * scale;

            canvas.width = containerWidth;
            canvas.height = canvasHeight;

            // Draw image
            ctx.drawImage(img, 0, 0, containerWidth, canvasHeight);

            // Draw motion paths
            motionPaths.forEach((path, index) => {
                const scaledX = path.x * scale;
                const scaledY = path.y * scale;

                // Draw arrow
                ctx.beginPath();
                ctx.arc(scaledX, scaledY, 15, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(139, 92, 246, 0.7)';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw direction arrow
                ctx.beginPath();
                ctx.moveTo(scaledX, scaledY);

                let endX = scaledX;
                let endY = scaledY;
                const arrowLength = 40 * path.intensity;

                if (path.direction === 'custom' && path.endX && path.endY) {
                    endX = path.endX * scale;
                    endY = path.endY * scale;
                } else {
                    switch (path.direction) {
                        case 'up': endY -= arrowLength; break;
                        case 'down': endY += arrowLength; break;
                        case 'left': endX -= arrowLength; break;
                        case 'right': endX += arrowLength; break;
                    }
                }

                ctx.lineTo(endX, endY);
                ctx.strokeStyle = '#8b5cf6';
                ctx.lineWidth = 3;
                ctx.stroke();

                // Arrow head
                const angle = Math.atan2(endY - scaledY, endX - scaledX);
                const headLength = 10;
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fillStyle = '#8b5cf6';
                ctx.fill();

                // Number label
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText((index + 1).toString(), scaledX, scaledY);
            });
        };
        img.src = imageUrl;
    }, [imageUrl, motionPaths]);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !imageUrl) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert to original image coordinates
        const scale = canvas.width / imageDimensions.width;
        const originalX = Math.round(clickX / scale);
        const originalY = Math.round(clickY / scale);

        if (selectedDirection === 'custom') {
            if (!customStart) {
                // First click - set start
                setCustomStart({ x: originalX, y: originalY });
                setIsDrawingCustom(true);
            } else {
                // Second click - set end and create path
                const newPath: MotionPath = {
                    id: Date.now().toString(),
                    x: customStart.x,
                    y: customStart.y,
                    direction: 'custom',
                    intensity: brushIntensity,
                    endX: originalX,
                    endY: originalY
                };
                setMotionPaths([...motionPaths, newPath]);
                setCustomStart(null);
                setIsDrawingCustom(false);
            }
        } else {
            // Non-custom direction - single click
            const newPath: MotionPath = {
                id: Date.now().toString(),
                x: originalX,
                y: originalY,
                direction: selectedDirection,
                intensity: brushIntensity
            };
            setMotionPaths([...motionPaths, newPath]);
        }
    }, [imageUrl, imageDimensions, selectedDirection, brushIntensity, customStart, motionPaths]);

    const removePath = (id: string) => {
        setMotionPaths(motionPaths.filter(p => p.id !== id));
    };

    const clearAllPaths = () => {
        setMotionPaths([]);
        setCustomStart(null);
        setIsDrawingCustom(false);
    };

    const handleGenerate = async () => {
        if (!imageUrl || motionPaths.length === 0) return;
        await onGenerate(imageUrl, motionPaths);
    };

    return (
        <div className="space-y-4">
            {/* Image Upload or Canvas */}
            {!imageFile ? (
                <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
                    onClick={() => document.getElementById('motion-brush-image')?.click()}
                >
                    <input
                        id="motion-brush-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">Görsel Yükle</p>
                    <p className="text-sm text-gray-500 mt-2">Hareket eklemek istediğiniz görseli seçin</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Canvas Container */}
                    <div
                        ref={containerRef}
                        className="relative bg-gray-900 rounded-xl overflow-hidden"
                    >
                        <canvas
                            ref={canvasRef}
                            onClick={handleCanvasClick}
                            className="w-full cursor-crosshair"
                        />

                        {isDrawingCustom && (
                            <div className="absolute top-2 left-2 px-3 py-1 bg-purple-600 text-white text-sm rounded-lg">
                                Bitiş noktasını seçin...
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        {/* Direction Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Hareket Yönü
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DIRECTIONS.map((dir) => {
                                    const Icon = dir.icon;
                                    return (
                                        <button
                                            key={dir.id}
                                            onClick={() => setSelectedDirection(dir.id as any)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${selectedDirection === dir.id
                                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-sm">{dir.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Intensity Slider */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Hareket Yoğunluğu: {Math.round(brushIntensity * 100)}%
                            </label>
                            <div className="flex items-center gap-3">
                                <Minus className="w-4 h-4 text-gray-400" />
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.1"
                                    value={brushIntensity}
                                    onChange={(e) => setBrushIntensity(parseFloat(e.target.value))}
                                    className="flex-1 accent-purple-600"
                                />
                                <Plus className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>

                        {/* Motion Paths List */}
                        {motionPaths.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Hareket Noktaları ({motionPaths.length})
                                    </label>
                                    <button
                                        onClick={clearAllPaths}
                                        className="text-red-500 text-sm hover:underline flex items-center gap-1"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        Tümünü Temizle
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {motionPaths.map((path, index) => (
                                        <div
                                            key={path.id}
                                            className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-sm"
                                        >
                                            <span className="font-medium text-purple-700 dark:text-purple-300">
                                                {index + 1}. {path.direction === 'custom' ? 'Özel' : DIRECTIONS.find(d => d.id === path.direction)?.label}
                                            </span>
                                            <button
                                                onClick={() => removePath(path.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setImageFile(null);
                                    setImageUrl(null);
                                    setMotionPaths([]);
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <button
                                onClick={handleGenerate}
                                disabled={motionPaths.length === 0 || isGenerating}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Play className="w-5 h-5" />
                                )}
                                {isGenerating ? 'Oluşturuluyor...' : 'Video Oluştur (50c)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-sm text-purple-700 dark:text-purple-300">
                <p className="font-medium mb-1">💡 Nasıl Kullanılır:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Görselinizi yükleyin</li>
                    <li>Yön seçin ve görsel üzerine tıklayarak hareket noktası ekleyin</li>
                    <li>"Özel" yön için başlangıç ve bitiş noktası belirleyin</li>
                    <li>Birden fazla hareket noktası ekleyebilirsiniz</li>
                </ul>
            </div>
        </div>
    );
};

export default MotionBrushEditor;
