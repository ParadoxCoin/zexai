import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import {
  Sparkles, Wand2, Download, Share2, Heart,
  Maximize2, Settings2, Layers, Check,
  ChevronRight, Zap, Image as ImageIcon, RefreshCw, GitCompare,
  Upload, X, SlidersHorizontal, Camera, Type, ImagePlus,
  Clock, CreditCard, Eye, ChevronDown, Loader2
} from "lucide-react";
import PromptEnhancer from "@/components/PromptEnhancer";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from 'framer-motion';

import SocialButtons from "@/components/SocialButtons";
import NFTMintModal from "@/components/NFTMintModal";
import { addWatermark } from "@/utils/watermark";
import playHapticFeedback from "@/utils/haptics";

const aspectRatios = [
  { id: '1:1', name: 'imageGen.aspectRatios.square', icon: '⬜', width: 1024, height: 1024 },
  { id: '16:9', name: 'imageGen.aspectRatios.wide', icon: '🖼️', width: 1280, height: 720 },
  { id: '9:16', name: 'imageGen.aspectRatios.vertical', icon: '📱', width: 720, height: 1280 },
  { id: '4:3', name: 'imageGen.aspectRatios.classic', icon: '🖥️', width: 1024, height: 768 },
];



// ---- Helper: Poll a task until completed ----
const pollTask = (taskId: string, onProgress: (status: string) => void): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 100; // 100 * 3s = 300s (matches backend 300s limit)
    const interval = setInterval(async () => {
      attempts++;
      try {
        const statusRes = await apiService.get(`/image/tasks/${taskId}`);
        const taskData = (statusRes?.data || statusRes) as any;

        if (taskData?.status === "completed") {
          clearInterval(interval);
          resolve(taskData.image_urls || []);
        } else if (taskData?.status === "failed") {
          clearInterval(interval);
          reject(new Error(taskData.error_message || "Generation failed"));
        } else {
          onProgress(`Processing... (${Math.min(95, Math.round((attempts / maxAttempts) * 100))}%)`);
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error("Timeout"));
        }
      }
    }, 3000);

    setTimeout(() => { clearInterval(interval); reject(new Error("Timeout (5min)")); }, 320000);
  });
};

const ImageGenerationPage = () => {
  const { t } = useTranslation();

  const inspirationPrompts = [
    t('imageGen.inspiration.prompt1', "Neon ışıklarla aydınlatılmış yağmurlu bir cyberpunk sokak"),
    t('imageGen.inspiration.prompt2', "Gökyüzünde süzülen büyülü bir kale"),
    t('imageGen.inspiration.prompt3', "Yalnız bir astronot uzak bir gezegenin yüzeyinde"),
    t('imageGen.inspiration.prompt4', "Gün batımında sakin bir Japon bahçesi"),
    t('imageGen.inspiration.prompt5', "Fütüristik uçan arabaların olduğu bir şehir"),
  ];

  const location = useLocation();
  const getPromptFromQuery = () => {
    const params = new URLSearchParams(location.search);
    return params.get('prompt') || "";
  };
  const [prompt, setPrompt] = useState(location.state?.remixPrompt || getPromptFromQuery());
  const [modelId, setModelId] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatedTaskIds, setGeneratedTaskIds] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'generate' | 'gallery' | 'compare'>('generate');

  const tabs: ('generate' | 'gallery' | 'compare')[] = ['generate', 'gallery', 'compare'];

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      // Swiped left -> next
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
    } else if (info.offset.x > swipeThreshold) {
      // Swiped right -> prev
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const [selectedModelsForCompare, setSelectedModelsForCompare] = useState<string[]>([]);
  const [compareResults, setCompareResults] = useState<any[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // -- NFT State --
  const [nftModalOpen, setNftModalOpen] = useState(false);
  const [selectedImageForNft, setSelectedImageForNft] = useState<any>(null);

  // ---- Mode: text2img or img2img ----
  const [generationMode, setGenerationMode] = useState<'text2img' | 'img2img'>('text2img');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [strength, setStrength] = useState(0.7);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  // ---- Gallery state ----
  const [galleryPage, setGalleryPage] = useState(0);
  const [generateLightboxImage, setGenerateLightboxImage] = useState<string | null>(null);
  const [galleryLightboxItem, setGalleryLightboxItem] = useState<any | null>(null);
  const GALLERY_LIMIT = 20;

  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Inspiration rotation
  const [currentInspiration, setCurrentInspiration] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentInspiration((prev) => (prev + 1) % 5);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ---- Models query ----
  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ["imageModels"],
    queryFn: () => apiService.get("/image/models")
  });

  // Helper to format model name (remove kie_ prefix)
  const formatModelName = (name: string) => {
    if (!name) return "";
    return name.replace(/^kie_/, '')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ---- Filtered models based on generation mode ----
  const allModels: any[] = (modelsData as any) || [];
  const txt2imgModels = allModels.filter((m: any) => m.type === 'text_to_image');
  const img2imgModels = allModels.filter((m: any) =>
    m.type === 'image_to_image' ||
    (m.type === 'text_to_image' && m.capabilities?.image_editing === true)
  );
  const generateModels = generationMode === 'img2img' ? img2imgModels : txt2imgModels;
  const compareModels = txt2imgModels;

  // Reset model selection when mode changes
  useEffect(() => { setModelId(''); }, [generationMode]);

  // ---- Gallery query (persistent, from backend) ----
  const { data: galleryData, isLoading: isLoadingGallery, refetch: refetchGallery } = useQuery({
    queryKey: ["myImageGallery", galleryPage],
    queryFn: () => apiService.get(`/image/my-images?limit=${GALLERY_LIMIT}&offset=${galleryPage * GALLERY_LIMIT}`),
    enabled: activeTab === 'gallery',
  });

  const galleryItems = (galleryData as any)?.outputs || (galleryData as any)?.data?.outputs || [];
  const galleryTotal = (galleryData as any)?.total || (galleryData as any)?.data?.total || 0;

  // ---- Image generation handler (unified) ----
  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt || !modelId) return;

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // For img2img mode, upload ref image first then call img2img endpoint
      if (generationMode === 'img2img' && referenceImage) {
        const formData = new FormData();
        formData.append('file', referenceImage);
        formData.append('prompt', prompt);
        formData.append('strength', strength.toString());
        formData.append('model_id', modelId);

        try {
          const result = await apiService.upload('/image/img2img', formData);

          // Check for async task_id (Kie) or sync image_url (Legacy)
          const taskId = result?.task_id || result?.data?.task_id;

          if (taskId) {
            const urls = await pollTask(taskId, () => { });
            if (urls.length > 0) {
              setGeneratedImages(prev => [...urls, ...prev]);
              setGeneratedTaskIds(prev => [...urls.map((_, i) => `${taskId}_${i}`), ...prev]);
              setSelectedImageIndex(0);
            }
          } else {
            const url = result?.image_url || result?.data?.image_url;
            if (url) {
              setGeneratedImages(prev => [url, ...prev]);
              setGeneratedTaskIds(prev => [`gen_${Date.now()}_0`, ...prev]); // Fallback id
              setSelectedImageIndex(0);
            }
          }
        } catch (imgErr: any) {
          // Fallback: use generate endpoint with prompt only
          const res = await apiService.post("/image/generate", {
            prompt: `${prompt}, inspired by reference image`,
            model_id: modelId,
            num_images: 1,
            aspect_ratio: aspectRatio,
          });
          const taskId = res?.data?.task_id || res?.task_id;
          if (taskId) {
            const urls = await pollTask(taskId, () => { });
            if (urls.length > 0) {
              setGeneratedImages(prev => [...urls, ...prev]);
              setGeneratedTaskIds(prev => [...urls.map((_, i) => `${taskId}_${i}`), ...prev]);
              setSelectedImageIndex(0);
            }
          }
        }
      } else {
        // Text-to-image: use standard generate
        const res = await apiService.post("/image/generate", {
          prompt,
          model_id: modelId,
          num_images: 1,
          aspect_ratio: aspectRatio,
        });

        const taskId = res?.data?.task_id || res?.task_id;
        if (!taskId) {
          setGenerationError(t('imageGen.invalidResponse', 'Invalid server response'));
          return;
        }

        const urls = await pollTask(taskId, () => { });
        if (urls.length > 0) {
          setGeneratedImages(prev => [...urls, ...prev]);
          setGeneratedTaskIds(prev => [...urls.map((_, i) => `${taskId}_${i}`), ...prev]);
          setSelectedImageIndex(0);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["myImageGallery"] });
    } catch (err: any) {
      setGenerationError(err?.message || t('imageGen.generationError', 'An error occurred while generating the image'));
    } finally {
      setIsGenerating(false);
    }
  };

  const useInspiration = () => {
    setPrompt(inspirationPrompts[currentInspiration]);
  };

  // ---- Ref image handler ----
  const handleRefImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setReferencePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRefImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setReferencePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ---- Compare handler (with polling) ----
  const handleCompare = async () => {
    if (selectedModelsForCompare.length < 2 || !prompt) return;
    setIsComparing(true);
    setCompareResults(
      selectedModelsForCompare.map(mId => ({
        model_id: mId,
        model_name: allModels.find((m: any) => m.id === mId)?.name || mId,
        status: 'generating',
        progress: t('imageGen.starting', 'Starting...'),
        image_url: null,
        error: null,
      }))
    );

    // Kick off all generations in parallel
    const taskPromises = selectedModelsForCompare.map(async (mId, idx) => {
      try {
        const res = await apiService.post("/image/generate", {
          prompt,
          model_id: mId,
          num_images: 1,
          aspect_ratio: aspectRatio
        });
        const taskId = res?.data?.task_id || res?.task_id;
        if (!taskId) throw new Error("Could not retrieve task_id");

        // Poll this specific task
        const urls = await pollTask(taskId, (progressMsg) => {
          setCompareResults(prev => prev.map((r, i) =>
            i === idx ? { ...r, progress: progressMsg } : r
          ));
        });

        setCompareResults(prev => prev.map((r, i) =>
          i === idx ? { ...r, status: 'completed', image_url: urls[0] || null } : r
        ));
      } catch (err: any) {
        setCompareResults(prev => prev.map((r, i) =>
          i === idx ? { ...r, status: 'failed', error: err.message } : r
        ));
      }
    });

    await Promise.allSettled(taskPromises);
    setIsComparing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative px-4 sm:px-6 py-8 sm:py-12 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm mb-3 sm:mb-4">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">{t('imageGen.badge', 'AI Görsel Üretici')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">
              {t('imageGen.title', 'Hayal Et, ')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-yellow-300">{t('imageGen.titleHighlight', 'Oluştur')}</span>
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-purple-100 max-w-2xl mx-auto px-2">
              {t('imageGen.desc', 'Düşüncelerinizi saniyeler içinde etkileyici görsellere dönüştürün')}
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100V0C240 66.6667 480 100 720 100C960 100 1200 66.6667 1440 0V100H0Z" fill="currentColor" className="text-gray-50 dark:text-gray-900" />
          </svg>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 -mt-4 mb-6">
        <div className="flex justify-center">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-2xl p-1 sm:p-1.5 shadow-lg border border-gray-100 dark:border-gray-700 max-w-full overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap ${activeTab === 'generate'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('imageGen.tabGenerate', 'Üret')}
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap ${activeTab === 'gallery'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('imageGen.tabGallery', 'Galeri')}
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap ${activeTab === 'compare'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <GitCompare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('imageGen.tabCompare', 'Karşılaştır')}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* GENERATE TAB */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
      {activeTab === 'generate' && (
        <motion.div
           key="generate"
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: 20 }}
           transition={{ duration: 0.2 }}
           drag="x"
           dragConstraints={{ left: 0, right: 0 }}
           dragElastic={0.2}
           dragDirectionLock
           onDragEnd={handleDragEnd}
           className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 touch-pan-y"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Panel - Creation Tools */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">

                {/* ── Mode Toggle (Text→Image / Image→Image) ── */}
                <div className="p-6 pb-0">
                  <div className="relative bg-gray-100 dark:bg-gray-900 rounded-2xl p-1 flex">
                    <button
                      onClick={() => setGenerationMode('text2img')}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm ${generationMode === 'text2img'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-[1.02]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                        }`}
                    >
                      <Type className="w-4 h-4" />
                      {t('imageGen.modeText2Img', 'Metin → Görsel')}
                    </button>
                    <button
                      onClick={() => setGenerationMode('img2img')}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm ${generationMode === 'img2img'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform scale-[1.02]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                        }`}
                    >
                      <ImagePlus className="w-4 h-4" />
                      {t('imageGen.modeImg2Img', 'Görsel → Görsel')}
                    </button>
                  </div>
                </div>

                {/* ── Reference Image Upload (img2img mode) ── */}
                {generationMode === 'img2img' && (
                  <div className="px-6 pt-4">
                    <input
                      ref={refImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleRefImageSelect}
                      className="hidden"
                    />
                    {referencePreview ? (
                      <div className="relative group">
                        <div className="rounded-2xl overflow-hidden border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                          <img src={referencePreview} alt="Referans" className="w-full h-40 object-contain" />
                        </div>
                        <button
                          onClick={() => { setReferenceImage(null); setReferencePreview(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-lg backdrop-blur-sm">
                          📷 {t('imageGen.refImage', 'Referans Görsel')}
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => refImageInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleRefImageDrop}
                        className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
                      >
                        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Upload className="w-8 h-8 text-blue-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('imageGen.uploadRef', 'Referans görsel yükleyin')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {t('imageGen.dragDrop', 'Sürükle-bırak veya tıklayın')}
                        </p>
                      </div>
                    )}

                    {/* Strength Slider */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                          {t('imageGen.strength', 'Dönüşüm Gücü')}
                        </label>
                        <span className="text-sm font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                          {Math.round(strength * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={strength}
                        onChange={(e) => setStrength(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-blue-200 to-cyan-400 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{t('imageGen.lessChange', 'Az değişim')}</span>
                        <span>{t('imageGen.moreChange', 'Çok değişim')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Prompt Card ── */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Wand2 className="w-5 h-5 text-purple-500" />
                      {generationMode === 'img2img' ? t('imageGen.promptTitleI2I', 'Yönlendirme Promptu') : t('imageGen.promptTitleT2I', 'Prompt Yaz')}
                    </h2>
                    <button
                      onClick={useInspiration}
                      className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      {t('imageGen.getInspiration', 'İlham Al')}
                    </button>
                  </div>

                  {/* Inspiration Banner */}
                  <div
                    onClick={useInspiration}
                    className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl cursor-pointer hover:shadow-md transition-all group"
                  >
                    <p className="text-sm text-purple-700 dark:text-purple-300 italic">
                      "{inspirationPrompts[currentInspiration]}"
                    </p>
                    <p className="text-xs text-purple-500 mt-1 group-hover:text-purple-700 transition-colors">
                      {t('imageGen.clickToUse', 'Kullanmak için tıkla →')}
                    </p>
                  </div>

                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={generationMode === 'img2img'
                        ? t('imageGen.promptPlaceholderI2I', "Referans görseli nasıl dönüştürmek istediğinizi yazın...")
                        : t('imageGen.promptPlaceholderT2I', "Hayalinizdeki görseli detaylı bir şekilde tanımlayın...")
                      }
                      rows={4}
                      disabled={isGenerating}
                      className="w-full px-4 py-3 pr-14 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400"
                    />
                    <div className="absolute right-3 top-3">
                      <PromptEnhancer
                        contentType="image"
                        currentPrompt={prompt}
                        onSelectPrompt={(p) => setPrompt(p)}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Model & Aspect Ratio ── */}
                <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700 pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        {t('imageGen.modelTitle', 'AI Model')}
                      </label>
                      <select
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                        disabled={isLoadingModels || isGenerating}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">{t('imageGen.selectModel', 'Model seçin')}</option>
                        {generateModels.map((model: any) => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({model.credits} {t('imageGen.credits', 'kredi')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block flex items-center gap-2">
                        <Maximize2 className="w-4 h-4" />
                        {t('imageGen.sizeTitle', 'Boyut')}
                      </label>
                      <div className="flex gap-1">
                        {aspectRatios.map((ratio) => (
                          <button
                            key={ratio.id}
                            onClick={() => setAspectRatio(ratio.id)}
                            className={`flex-1 py-2 text-lg rounded-lg transition-all ${aspectRatio === ratio.id
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            title={t(ratio.name)}
                          >
                            {ratio.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Generate Button ── */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt || !modelId || (generationMode === 'img2img' && !referenceImage)}
                    className={`w-full py-4 font-semibold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-white ${generationMode === 'img2img'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-blue-500/25'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/25'
                      } disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none`}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {t('imageGen.generating', 'Oluşturuluyor...')}
                      </>
                    ) : (
                      <>
                        {generationMode === 'img2img' ? <Camera className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                        {generationMode === 'img2img' ? t('imageGen.generateBtnI2I', 'Görseli Dönüştür') : t('imageGen.generateBtnT2I', 'Görsel Oluştur')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-500" />
                    {t('imageGen.previewTitle', 'Önizleme')}
                  </h2>
                </div>

                <div className="flex-1 p-6">
                  {isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <div className="relative w-32 h-32">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse opacity-20" />
                        <div className="absolute inset-2 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden">
                          <img src="/logo192.png" alt="ZexAi Loading" className="w-20 h-20 object-contain animate-pulse" style={{ animationDuration: '1s' }} />
                        </div>
                        <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" />
                      </div>
                      <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">
                        {generationMode === 'img2img' ? t('imageGen.previewGeneratingI2I', 'Görsel dönüştürülüyor...') : t('imageGen.previewGeneratingT2I', 'Görseliniz oluşturuluyor...')}
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        {t('imageGen.waitSecs', 'Bu birkaç saniye sürebilir')}
                      </p>
                    </div>
                  ) : generatedImages.length > 0 ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 relative group">
                        <img
                          src={generatedImages[selectedImageIndex]}
                          alt="Generated"
                          className="w-full h-full object-contain rounded-2xl"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-4">
                          <button
                            onClick={async () => {
                              playHapticFeedback('medium');
                              try {
                                const response = await fetch(generatedImages[selectedImageIndex]);
                                const initialBlob = await response.blob();

                                // Free users get a watermark
                                let finalBlob = initialBlob;
                                if (user?.package === 'free') {
                                  try {
                                    finalBlob = await addWatermark(generatedImages[selectedImageIndex], "ZexAi Studio");
                                  } catch (fwErr) {
                                    console.error("Watermark error:", fwErr);
                                    // Fallback to original if watermark fails
                                  }
                                }

                                const url = window.URL.createObjectURL(finalBlob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `ZexAi_${Date.now()}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              } catch (err) {
                                console.error("Download failed:", err);
                              }
                            }}
                            className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                            title={t('imageGen.download', 'İndir')}
                          >
                            <Download className="w-6 h-6 text-white" />
                          </button>

                          <button
                            onClick={() => setGenerateLightboxImage(generatedImages[selectedImageIndex])}
                            className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                            title={t('imageGen.fullscreen', 'Tam Ekran Göster')}
                          >
                            <Maximize2 className="w-6 h-6 text-white" />
                          </button>
                          <SocialButtons
                            contentType="image"
                            contentId={generatedTaskIds[selectedImageIndex] || `gen_${Date.now()}_${selectedImageIndex}`}
                            contentUrl={generatedImages[selectedImageIndex]}
                            contentTitle={prompt}
                            className="bg-white/20 backdrop-blur-sm rounded-full p-1"
                          />
                        </div>
                      </div>
                      {/* Thumbnail strip for recent generations */}
                      {generatedImages.length > 1 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                          {generatedImages.slice(0, 8).map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedImageIndex(idx)}
                              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImageIndex === idx
                                ? 'border-purple-500 ring-2 ring-purple-300 scale-105'
                                : 'border-gray-200 dark:border-gray-600 opacity-60 hover:opacity-100'
                                }`}
                            >
                              <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon className="w-12 h-12 text-purple-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {t('imageGen.emptyPreviewTitle', 'Hayal edin, biz oluşturalım')}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        {t('imageGen.emptyPreviewDesc', "Sol taraftan bir prompt yazın ve AI'ın sihrini izleyin")}
                      </p>
                    </div>
                  )}
                </div>

                {generationError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ❌ {t('imageGen.errorLabel', 'Error')}: {generationError}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}



      {/* ═══════════════════════════════════════════════════════ */}
      {/* GALLERY TAB (Persistent from backend) */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'gallery' && (
        <motion.div
           key="gallery"
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.2 }}
           drag="x"
           dragConstraints={{ left: 0, right: 0 }}
           dragElastic={0.2}
           dragDirectionLock
           onDragEnd={handleDragEnd}
           className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 touch-pan-y"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-500" />
                {t('imageGen.galleryTitle', 'Görsel Galerim')}
                {galleryTotal > 0 && (
                  <span className="text-sm font-normal text-gray-400 ml-2">({galleryTotal} {t('imageGen.imagesCount', 'görsel')})</span>
                )}
              </h2>
              <button
                onClick={() => refetchGallery()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={t('imageGen.refresh', 'Yenile')}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {isLoadingGallery ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                <span className="ml-3 text-gray-500">{t('imageGen.loading', 'Yükleniyor...')}</span>
              </div>
            ) : galleryItems.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {galleryItems.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => setGalleryLightboxItem(item)}
                    >
                      <div className="aspect-square">
                        <img
                          src={item.file_url || item.thumbnail_url}
                          alt={item.prompt || `Görsel ${idx}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0QxRDVEQiIgZm9udC1zaXplPSIxNCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkfDtnJzZWw8L3RleHQ+PC9zdmc+';
                          }}
                        />
                        {item.is_nft_minted && (
                          <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-black/60 backdrop-blur-md border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.4)] rounded-md flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-purple-400" />
                            <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">
                              NFT Minted
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-white text-xs line-clamp-2 mb-2">{item.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70">{formatModelName(item.model_name || item.model_id || item.model)}</span>
                          <div className="flex gap-1">
                            {!item.is_nft_minted && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedImageForNft(item);
                                  setNftModalOpen(true);
                                }}
                                className="px-2 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg text-xs font-medium shadow transition-all flex items-center gap-1"
                              >
                                💎 {t('imageGen.makeNft', 'NFT Yap')}
                              </button>
                            )}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const response = await fetch(item.file_url);
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `ZexAi_Gallery_${Date.now()}.png`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                } catch (err) {
                                  console.error("Download failed:", err);
                                  window.open(item.file_url, '_blank');
                                }
                              }}
                              className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                              title={t('imageGen.download', 'İndir')}
                            >
                              <Download className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {galleryTotal > GALLERY_LIMIT && (
                  <div className="flex items-center justify-center mt-8 gap-2">
                    <button
                      onClick={() => setGalleryPage(Math.max(0, galleryPage - 1))}
                      disabled={galleryPage === 0}
                      className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('imageGen.prevPage', '← Önceki')}
                    </button>
                    <span className="text-sm text-gray-500 px-3">
                      {t('imageGen.page', 'Sayfa')} {galleryPage + 1} / {Math.ceil(galleryTotal / GALLERY_LIMIT)}
                    </span>
                    <button
                      onClick={() => setGalleryPage(galleryPage + 1)}
                      disabled={(galleryPage + 1) * GALLERY_LIMIT >= galleryTotal}
                      className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('imageGen.nextPage', 'Sonraki →')}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-emerald-400" />
                </div>
                <p className="text-gray-500 font-medium text-lg">{t('imageGen.noImagesTitle', 'Henüz görsel yok')}</p>
                <p className="text-sm text-gray-400 mt-1">{t('imageGen.noImagesDesc', 'Üret sekmesinden ilk görselinizi oluşturun')}</p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  {t('imageGen.generateBtnT2I', 'Görsel Oluştur')}
                </button>
              </div>
            )}
          </div>

          {/* Lightbox Modal */}
          {galleryLightboxItem && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setGalleryLightboxItem(null)}
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-md">
                      {formatModelName(galleryLightboxItem.model_name || galleryLightboxItem.model_id || galleryLightboxItem.model)}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(galleryLightboxItem.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <button
                    onClick={() => setGalleryLightboxItem(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                  <img
                    src={galleryLightboxItem.file_url}
                    alt={galleryLightboxItem.prompt}
                    className="max-w-full max-h-full object-contain rounded-xl"
                  />
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{galleryLightboxItem.prompt}"</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(galleryLightboxItem.file_url);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `ZexAi_Gallery_${Date.now()}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error("Download failed:", err);
                          window.open(galleryLightboxItem.file_url, '_blank');
                        }
                      }}
                      className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {t('imageGen.download', 'İndir')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* COMPARE TAB (with proper async polling) */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'compare' && (
        <motion.div
           key="compare"
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.2 }}
           drag="x"
           dragConstraints={{ left: 0, right: 0 }}
           dragElastic={0.2}
           dragDirectionLock
           onDragEnd={handleDragEnd}
           className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 touch-pan-y"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-orange-500" />
              {t('imageGen.compareTitle', 'Model Karşılaştırma')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {t('imageGen.compareDesc', 'Aynı prompt ile birden fazla model seçip sonuçları yan yana karşılaştırın')}
            </p>

            {/* Model Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('imageGen.selectModels', 'Model Seçin (en az 2, en fazla 4)')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {compareModels.map((model: any) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModelsForCompare(prev =>
                        prev.includes(model.id)
                          ? prev.filter(id => id !== model.id)
                          : prev.length < 4 ? [...prev, model.id] : prev
                      );
                    }}
                    disabled={isComparing}
                    className={`p-3 rounded-xl text-left transition-all border-2 ${selectedModelsForCompare.includes(model.id)
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      } disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{model.name}</span>
                      {selectedModelsForCompare.includes(model.id) && (
                        <Check className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{model.credits} {t('imageGen.credits', 'kredi')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input + Enhancer */}
            <div className="mb-6">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('imageGen.comparePromptPlaceholder', "Karşılaştırmak istediğiniz görseli tanımlayın...")}
                  rows={3}
                  disabled={isComparing}
                  className="w-full px-4 py-3 pr-14 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                />
                <div className="absolute right-3 top-3">
                  <PromptEnhancer
                    contentType="image"
                    currentPrompt={prompt}
                    onSelectPrompt={(p) => setPrompt(p)}
                  />
                </div>
              </div>
            </div>

            {/* Compare Button */}
            <button
              onClick={handleCompare}
              disabled={isComparing || selectedModelsForCompare.length < 2 || !prompt}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              {isComparing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {t('imageGen.comparing', 'Karşılaştırılıyor...')} ({selectedModelsForCompare.length} {t('imageGen.model', 'model')})
                </>
              ) : (
                <>
                  <GitCompare className="w-5 h-5" />
                  {selectedModelsForCompare.length} {t('imageGen.compareBtn', 'Model ile Karşılaştır')}
                </>
              )}
            </button>

            {/* Results Grid */}
            {compareResults.length > 0 && (
              <div className={`mt-8 grid gap-4 ${compareResults.length === 2 ? 'grid-cols-2' :
                compareResults.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'
                }`}>
                {compareResults.map((result, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium text-center text-sm">
                      {result.model_name}
                    </div>
                    <div className="aspect-square relative">
                      {result.status === 'generating' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
                          <div className="relative w-16 h-16 mb-3">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse opacity-20" />
                            <div className="absolute inset-1.5 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden">
                              <img src="/logo192.png" alt="ZexAi Loading" className="w-10 h-10 object-contain animate-pulse" style={{ animationDuration: '1s' }} />
                            </div>
                            <div className="absolute inset-0 border-3 border-transparent border-t-orange-500 rounded-full animate-spin" />
                          </div>
                          <p className="text-xs text-gray-500 font-medium">{result.progress}</p>
                        </div>
                      ) : result.status === 'completed' && result.image_url ? (
                        <div className="relative group w-full h-full">
                          <img
                            src={result.image_url}
                            alt={result.model_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                const errDiv = document.createElement('div');
                                errDiv.className = 'w-full h-full flex items-center justify-center text-gray-400 text-sm';
                                errDiv.textContent = '⚠️ Image failed to load';
                                parent.appendChild(errDiv);
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a
                              href={result.image_url}
                              download
                              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                            >
                              <Download className="w-5 h-5 text-white" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-red-500 p-4 text-center bg-red-50 dark:bg-red-900/10">
                          <X className="w-8 h-8 mb-2 text-red-400" />
                          <span className="text-sm font-medium">{t('imageGen.errorLabel', 'Error')}</span>
                          <span className="text-xs text-red-400 mt-1">{result.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      {generateLightboxImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setGenerateLightboxImage(null)}
        >
          <img
            src={generateLightboxImage}
            alt="Enlarged view"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
          <button
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
            onClick={(e) => {
              e.stopPropagation();
              setGenerateLightboxImage(null);
            }}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* NFT Mint Modal */}
      <NFTMintModal
        isOpen={nftModalOpen}
        onClose={() => {
          setNftModalOpen(false);
          setSelectedImageForNft(null);
        }}
        image={selectedImageForNft}
      />
    </div>
  );
};

export default ImageGenerationPage;