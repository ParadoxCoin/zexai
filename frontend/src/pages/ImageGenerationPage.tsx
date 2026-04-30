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
  Clock, CreditCard, Eye, ChevronDown, Loader2, CheckCircle
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
    <div className="min-h-screen bg-[#030712] text-white selection:bg-purple-500/30 overflow-x-hidden">
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
      </div>

      {/* Hero Header */}
      <div className="relative pt-12 pb-6 px-8 border-b border-white/5 bg-white/[0.01] backdrop-blur-xl relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 w-fit">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em]">
                {t('imageGen.badge', 'NEURAL IMAGING CORE')}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase italic leading-none drop-shadow-2xl">
              {t('imageGen.title', 'SYNTHESIZE ')}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                {t('imageGen.titleHighlight', 'REALITY')}
              </span>
            </h1>
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] max-w-xl leading-relaxed">
              {t('imageGen.desc', 'CONVERT ABSTRACT THOUGHTS INTO HIGH-FIDELITY VISUAL ASSETS USING NEXT-GEN NEURAL ENGINES.')}
            </p>
          </div>

          <div className="flex items-center gap-6 bg-black/60 p-2.5 rounded-[2rem] border border-white/10 backdrop-blur-3xl shadow-2xl">
            <div className="flex flex-col items-end px-5">
              <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">AVAILABLE SYNTHESIS POWER</span>
              <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 tracking-tighter italic">{user?.credits || 0} ZEX</span>
            </div>
            <button
              onClick={() => window.location.href = '/billing'}
              className="px-6 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-purple-600/30 border-t border-white/10 active:scale-95"
            >
              INITIALIZE RECHARGE
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-8 mt-10">
        <div className="flex bg-black/40 backdrop-blur-2xl border border-white/5 p-1.5 rounded-[2rem] w-fit shadow-2xl relative z-20">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-8 py-3.5 rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-3 relative overflow-hidden ${activeTab === 'generate'
              ? 'bg-purple-600 text-white shadow-xl shadow-purple-600/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
          >
            <Sparkles className="w-4 h-4" />
            {t('imageGen.tabGenerate', 'SYNTHESIZE')}
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-8 py-3.5 rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-3 relative overflow-hidden ${activeTab === 'gallery'
              ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
          >
            <Layers className="w-4 h-4" />
            {t('imageGen.tabGallery', 'ARCHIVE')}
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`px-8 py-3.5 rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-3 relative overflow-hidden ${activeTab === 'compare'
              ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
          >
            <GitCompare className="w-4 h-4" />
            {t('imageGen.tabCompare', 'DIAGNOSTIC')}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
      {activeTab === 'generate' && (
        <motion.div
           key="generate"
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.98 }}
           transition={{ duration: 0.3 }}
           className="max-w-7xl mx-auto px-8 py-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* Left Panel - Creation Tools */}
            <div className="space-y-8">
              <div className="bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                {/* ── Mode Toggle (Text→Image / Image→Image) ── */}
                <div className="p-8 pb-0">
                  <div className="relative bg-black/60 rounded-[1.5rem] p-1.5 flex border border-white/5 shadow-inner">
                    <button
                      onClick={() => setGenerationMode('text2img')}
                      className={`flex-1 py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-500 flex items-center justify-center gap-3 ${generationMode === 'text2img'
                        ? 'bg-purple-600 text-white shadow-xl shadow-purple-600/20 border-t border-white/10 scale-[1.02] z-10'
                        : 'text-slate-600 hover:text-slate-400'
                        }`}
                    >
                      <Type className="w-4 h-4" />
                      {t('imageGen.modeText2Img', 'SEMANTIC SYNTHESIS')}
                    </button>
                    <button
                      onClick={() => setGenerationMode('img2img')}
                      className={`flex-1 py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-500 flex items-center justify-center gap-3 ${generationMode === 'img2img'
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 border-t border-white/10 scale-[1.02] z-10'
                        : 'text-slate-600 hover:text-slate-400'
                        }`}
                    >
                      <ImagePlus className="w-4 h-4" />
                      {t('imageGen.modeImg2Img', 'IMAGE EVOLUTION')}
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
                        <div className="rounded-2xl overflow-hidden border border-blue-500/30 bg-blue-500/5">
                          <img src={referencePreview} alt="Referans" className="w-full h-40 object-contain" />
                        </div>
                        <button
                          onClick={() => { setReferenceImage(null); setReferencePreview(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/80 text-white text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-sm border border-white/10">
                          📷 {t('imageGen.refImage', 'REFERENCE')}
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => refImageInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleRefImageDrop}
                        className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
                      >
                        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-500/20">
                          <Upload className="w-8 h-8 text-blue-400" />
                        </div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          {t('imageGen.uploadRef', 'UPLOAD REFERENCE')}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter">
                          {t('imageGen.dragDrop', 'Drag & drop or click')}
                        </p>
                      </div>
                    )}

                    {/* Strength Slider */}
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                          {t('imageGen.strength', 'Dönüşüm Gücü')}
                        </label>
                        <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-md">
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
                        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                        <span>{t('imageGen.lessChange', 'Less Change')}</span>
                        <span>{t('imageGen.moreChange', 'More Change')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Prompt Card ── */}
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-3">
                      <Wand2 className="w-4 h-4 text-purple-400" />
                      {generationMode === 'img2img' ? t('imageGen.promptTitleI2I', 'EVOLUTION COMMAND') : t('imageGen.promptTitleT2I', 'SEMANTIC COMMAND')}
                    </h2>
                    <button
                      onClick={useInspiration}
                      className="flex items-center gap-2 text-[10px] font-black text-purple-500 uppercase tracking-widest hover:text-purple-400 transition-all group"
                    >
                      <Zap className="w-3.5 h-3.5 group-hover:scale-125 transition-transform" />
                      {t('imageGen.getInspiration', 'INJECT CREATIVITY')}
                    </button>
                  </div>

                  {/* Inspiration Banner */}
                  <div
                    onClick={useInspiration}
                    className="mb-6 p-5 bg-purple-500/5 border border-purple-500/10 rounded-2xl cursor-pointer hover:bg-purple-500/10 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/30" />
                    <p className="text-[13px] text-purple-200 italic opacity-80 group-hover:opacity-100 transition-opacity leading-relaxed font-medium">
                      "{inspirationPrompts[currentInspiration]}"
                    </p>
                    <p className="text-[9px] font-black text-purple-600 mt-3 uppercase tracking-[0.2em] group-hover:text-purple-400 transition-colors">
                      {t('imageGen.clickToUse', 'EXECUTE PROTOCOL →')}
                    </p>
                  </div>

                  <div className="relative group">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={generationMode === 'img2img'
                        ? t('imageGen.promptPlaceholderI2I', "How should we transform this image? Describe your vision...")
                        : t('imageGen.promptPlaceholderT2I', "Describe the masterpiece you want to create in detail...")
                      }
                      rows={5}
                      disabled={isGenerating}
                      className="w-full px-6 py-6 bg-black/60 border border-white/5 rounded-3xl resize-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-slate-200 text-[14px] font-medium placeholder-slate-800 leading-relaxed shadow-inner"
                    />
                    <div className="absolute right-4 top-4">
                      <PromptEnhancer
                        contentType="image"
                        currentPrompt={prompt}
                        onSelectPrompt={(p) => setPrompt(p)}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Model & Aspect Ratio ── */}
                <div className="px-8 pb-8 border-t border-white/5 pt-8 bg-white/[0.01]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block flex items-center gap-3">
                        <Layers className="w-4 h-4 text-purple-400" />
                        {t('imageGen.modelTitle', 'NEURAL ENGINE')}
                      </label>
                      <div className="relative group">
                        <select
                          value={modelId}
                          onChange={(e) => setModelId(e.target.value)}
                          disabled={isLoadingModels || isGenerating}
                          className="w-full px-5 py-4 bg-black/60 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-300 focus:ring-1 focus:ring-purple-500/50 outline-none appearance-none cursor-pointer transition-all hover:bg-white/5 shadow-inner"
                        >
                          <option value="" className="bg-slate-900">{t('imageGen.selectModel', 'SELECT ENGINE')}</option>
                          {generateModels.map((model: any) => (
                            <option key={model.id} value={model.id} className="bg-slate-900">
                              {formatModelName(model.name).toUpperCase()} [{model.credits} ZEX]
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover:text-purple-400 transition-colors">
                          <ChevronDown className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block flex items-center gap-3">
                        <Maximize2 className="w-4 h-4 text-purple-400" />
                        {t('imageGen.sizeTitle', 'CANVAS RATIO')}
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {aspectRatios.map((ratio) => (
                          <button
                            key={ratio.id}
                            onClick={() => setAspectRatio(ratio.id)}
                            className={`py-4 rounded-2xl transition-all border flex flex-col items-center justify-center gap-2 group
                              ${aspectRatio === ratio.id
                                ? 'bg-purple-600 border-purple-500/50 text-white shadow-xl shadow-purple-600/30 scale-[1.05] z-10'
                                : 'bg-black/60 border-white/5 text-slate-600 hover:text-slate-400 hover:bg-white/5'
                              }`}
                          >
                            <span className={`text-lg transition-transform ${aspectRatio === ratio.id ? 'scale-110' : 'group-hover:scale-110 opacity-60 group-hover:opacity-100'}`}>{ratio.icon}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest">{ratio.id}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Generate Button ── */}
                <div className="p-8 bg-black/40 border-t border-white/5 relative z-10">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt || !modelId || (generationMode === 'img2img' && !referenceImage)}
                    className={`w-full py-6 font-black text-xs uppercase tracking-[0.4em] rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-4 text-white relative overflow-hidden group/btn ${generationMode === 'img2img'
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'
                      : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/30'
                      } disabled:bg-slate-900 disabled:text-slate-700 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98] border-t border-white/20`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none" />
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {t('imageGen.generating', 'EXECUTING NEURAL SYNTHESIS...')}
                      </>
                    ) : (
                      <>
                        {generationMode === 'img2img' ? <Camera className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                        {generationMode === 'img2img' ? t('imageGen.generateBtnI2I', 'EVOLVE IMAGE') : t('imageGen.generateBtnT2I', 'SYNTHESIZE')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="space-y-8">
              <div className="bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl min-h-[600px] flex flex-col relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-transparent pointer-events-none" />
                <div className="p-8 border-b border-white/5 flex-shrink-0 relative z-10">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-3">
                    <ImageIcon className="w-4 h-4 text-purple-400" />
                    {t('imageGen.previewTitle', 'SYNTHESIS PREVIEW')}
                  </h2>
                </div>

                <div className="flex-1 p-6">
                  {isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center py-20">
                      <div className="relative w-40 h-40">
                        <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-pulse blur-xl" />
                        <div className="absolute inset-0 border-t-2 border-l-2 border-purple-500 rounded-full animate-spin" />
                        <div className="absolute inset-4 border-t-2 border-r-2 border-purple-400/30 rounded-full animate-spin-reverse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-10 h-10 text-purple-500 animate-pulse" />
                        </div>
                      </div>
                      <p className="mt-10 text-slate-200 font-black text-xs uppercase tracking-[0.3em] animate-pulse">
                        {generationMode === 'img2img' ? t('imageGen.previewGeneratingI2I', 'ENGINEERING IMAGE...') : t('imageGen.previewGeneratingT2I', 'SYNTHESIZING IMAGE...')}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">
                        {t('imageGen.waitSecs', 'ESTIMATED TIME: 5-15 SECONDS')}
                      </p>
                    </div>
                  ) : generatedImages.length > 0 ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 relative group rounded-2xl overflow-hidden border border-white/5 bg-black/40 shadow-inner">
                        <img
                          src={generatedImages[selectedImageIndex]}
                          alt="Generated"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
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
                            className="p-4 bg-purple-500 text-white rounded-2xl hover:bg-purple-400 transition-all hover:scale-110 shadow-lg shadow-purple-500/20"
                            title={t('imageGen.download', 'İndir')}
                          >
                            <Download className="w-5 h-5" />
                          </button>

                          <button
                            onClick={() => setGenerateLightboxImage(generatedImages[selectedImageIndex])}
                            className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all hover:scale-110 border border-white/10 backdrop-blur-xl"
                            title={t('imageGen.fullscreen', 'Tam Ekran Göster')}
                          >
                            <Maximize2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      {/* Thumbnail strip for recent generations */}
                      {generatedImages.length > 1 && (
                        <div className="mt-6 flex gap-3 overflow-x-auto pb-2 px-1">
                          {generatedImages.slice(0, 8).map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                playHapticFeedback('light');
                                setSelectedImageIndex(idx);
                              }}
                              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${selectedImageIndex === idx
                                ? 'border-purple-500 shadow-lg shadow-purple-500/30 scale-105'
                                : 'border-white/5 opacity-40 hover:opacity-100 hover:border-white/20'
                                }`}
                            >
                              <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-20 relative z-10">
                      <div className="w-28 h-28 bg-purple-500/5 border border-purple-500/10 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl relative group">
                        <div className="absolute inset-0 bg-purple-500/10 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <ImageIcon className="w-12 h-12 text-purple-500/40 relative z-10" />
                      </div>
                      <h3 className="text-sm font-black text-slate-300 uppercase tracking-[0.3em] mb-4">
                        {t('imageGen.emptyPreviewTitle', 'ENGINE IDLE')}
                      </h3>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] max-w-xs leading-relaxed italic">
                        {t('imageGen.emptyPreviewDesc', "INPUT SEMANTIC COMMANDS TO INITIALIZE THE NEURAL SYNTHESIS CLUSTER.")}
                      </p>
                    </div>
                  )}
                </div>

                {generationError && (
                  <div className="p-4 bg-red-500/10 border-t border-red-500/20">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest text-center">
                      ⚠ {t('imageGen.errorLabel', 'ENGINE ERROR')}: {generationError}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="max-w-7xl mx-auto px-8 py-10"
        >
          <div className="bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 relative z-10">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-white flex items-center gap-4 uppercase italic tracking-tighter leading-none">
                  <Layers className="w-8 h-8 text-emerald-500" />
                  {t('imageGen.galleryTitle', 'NEURAL ARCHIVE')}
                </h2>
                {galleryTotal > 0 && (
                  <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.25em]">
                    SYSTEM LOG: {galleryTotal} HIGH-FIDELITY ASSETS DETECTED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => refetchGallery()}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl border border-white/5 transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('imageGen.refresh', 'SYNC CLOUD')}
                </button>
              </div>
            </div>

            {isLoadingGallery ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                <span className="ml-3 text-gray-500">{t('imageGen.loading', 'Yükleniyor...')}</span>
              </div>
            ) : galleryItems.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {galleryItems.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="relative group rounded-2xl overflow-hidden bg-black/40 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer shadow-xl"
                      onClick={() => setGalleryLightboxItem(item)}
                    >
                      <div className="aspect-square relative overflow-hidden">
                        <img
                          src={item.file_url || item.thumbnail_url}
                          alt={item.prompt || `Görsel ${idx}`}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 backdrop-blur-[1px]">
                        <p className="text-white text-[10px] font-medium line-clamp-2 mb-3 leading-relaxed opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                          {item.prompt}
                        </p>
                        <div className="flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 delay-75">
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter truncate max-w-[80px]">
                            {formatModelName(item.model_name || item.model_id || item.model)}
                          </span>
                          <div className="flex gap-2">
                            {!item.is_nft_minted && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedImageForNft(item);
                                  setNftModalOpen(true);
                                }}
                                className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
                                title={t('imageGen.makeNft', 'MINT NFT')}
                              >
                                <Sparkles className="w-3 h-3" />
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
                              className="p-1.5 bg-white/10 backdrop-blur-md rounded-lg hover:bg-white/20 transition-all border border-white/10"
                              title={t('imageGen.download', 'DOWNLOAD')}
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
                  <div className="flex items-center justify-center mt-12 gap-3">
                    <button
                      onClick={() => setGalleryPage(Math.max(0, galleryPage - 1))}
                      disabled={galleryPage === 0}
                      className="px-6 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 disabled:opacity-20 hover:bg-white/10 hover:text-white transition-all"
                    >
                      {t('imageGen.prevPage', 'PREVIOUS')}
                    </button>
                    <div className="px-4 py-2 bg-black/40 rounded-xl border border-white/5 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      {galleryPage + 1} / {Math.ceil(galleryTotal / GALLERY_LIMIT)}
                    </div>
                    <button
                      onClick={() => setGalleryPage(galleryPage + 1)}
                      disabled={(galleryPage + 1) * GALLERY_LIMIT >= galleryTotal}
                      className="px-6 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 disabled:opacity-20 hover:bg-white/10 hover:text-white transition-all"
                    >
                      {t('imageGen.nextPage', 'NEXT')}
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
              className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[9999] flex items-center justify-center p-8 cursor-zoom-out"
              onClick={() => setGalleryLightboxItem(null)}
            >
              <div
                className="bg-[#030712] border border-white/10 rounded-[2.5rem] max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 px-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-6">
                    <span className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                      {formatModelName(galleryLightboxItem.model_name || galleryLightboxItem.model_id || galleryLightboxItem.model)} ENGINE
                    </span>
                    <span className="text-[10px] font-black text-slate-600 flex items-center gap-2 uppercase tracking-[0.2em]">
                      <Clock className="w-3.5 h-3.5" />
                      SYNTHESIZED: {new Date(galleryLightboxItem.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <button
                    onClick={() => setGalleryLightboxItem(null)}
                    className="p-3 text-slate-500 hover:text-white rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-10 flex items-center justify-center bg-black/40" style={{ maxHeight: 'calc(95vh - 220px)' }}>
                  <img
                    src={galleryLightboxItem.file_url}
                    alt={galleryLightboxItem.prompt}
                    className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl"
                  />
                </div>
                <div className="p-8 px-10 border-t border-white/5 bg-white/[0.01]">
                  <p className="text-slate-300 text-[14px] font-medium italic leading-relaxed">"{galleryLightboxItem.prompt}"</p>
                  <div className="mt-8 flex gap-4">
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
                      className="px-8 py-4 bg-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/30 flex items-center gap-3 border-t border-white/10"
                    >
                      <Download className="w-4 h-4" />
                      {t('imageGen.download', 'DOWNLOAD SOURCE')}
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
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.98 }}
           transition={{ duration: 0.4 }}
           className="max-w-7xl mx-auto px-8 py-10"
        >
          <div className="bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.02] to-transparent pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 relative z-10">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-white flex items-center gap-4 uppercase italic tracking-tighter leading-none">
                  <GitCompare className="w-8 h-8 text-orange-500" />
                  {t('imageGen.compareTitle', 'DIAGNOSTIC ANALYSIS')}
                </h2>
                <p className="text-[10px] font-black text-orange-500/60 uppercase tracking-[0.25em]">
                  {t('imageGen.compareDesc', 'MULTI-ENGINE CROSS-COMPARISON PROTOCOL. ANALYZE NEURAL VARIATIONS FOR THE SAME SEMANTIC COMMAND.')}
                </p>
              </div>
            </div>

            {/* Model Selection */}
            <div className="mb-12 relative z-10">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
                <Layers className="w-4 h-4 text-orange-400" />
                {t('imageGen.selectModels', 'SELECT ENGINES [MAX 04]')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    className={`group relative p-6 rounded-[1.5rem] border transition-all text-left overflow-hidden shadow-lg
                      ${selectedModelsForCompare.includes(model.id) 
                        ? 'border-orange-500 bg-orange-500/10 scale-[1.02] shadow-orange-500/10' 
                        : 'border-white/5 bg-black/40 hover:bg-white/5 hover:border-white/10'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${selectedModelsForCompare.includes(model.id) ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'}`}>
                        {formatModelName(model.name)}
                      </span>
                      {selectedModelsForCompare.includes(model.id) && (
                        <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/30 border-t border-white/20">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest italic">
                      {model.credits} ZEX POWER
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input + Enhancer */}
            <div className="mb-10 relative z-10">
              <div className="relative group">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('imageGen.comparePromptPlaceholder', "Karşılaştırmak istediğiniz görseli tanımlayın...")}
                  rows={4}
                  disabled={isComparing}
                  className="w-full px-8 py-6 bg-black/60 border border-white/5 rounded-[2rem] resize-none focus:ring-1 focus:ring-orange-500/50 outline-none transition-all text-slate-200 text-[14px] font-medium placeholder-slate-800 leading-relaxed shadow-inner"
                />
                <div className="absolute right-6 top-6">
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
              className="w-full py-6 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-900 disabled:text-slate-700 text-white font-black text-xs rounded-2xl shadow-2xl shadow-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.4em] border-t border-white/20 relative z-10"
            >
              {isComparing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {t('imageGen.comparing', 'DIAGNOSING ENGINES...')}
                </>
              ) : (
                <>
                  <GitCompare className="w-5 h-5" />
                  {t('imageGen.compareBtn', 'INITIALIZE COMPARISON')}
                </>
              )}
            </button>

            {/* Results Grid */}
            {compareResults.length > 0 && (
              <div className={`mt-8 grid gap-4 ${compareResults.length === 2 ? 'grid-cols-2' :
                compareResults.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'
                }`}>
                {compareResults.map((result, idx) => (
                  <div key={idx} className="bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                    <div className="p-3 border-b border-white/5 bg-white/[0.02] text-white font-black text-[10px] text-center uppercase tracking-widest">
                      {result.model_name}
                    </div>
                    <div className="aspect-square relative group">
                      {result.status === 'generating' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 p-6">
                          <div className="relative w-12 h-12 mb-4">
                            <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-pulse blur-xl" />
                            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto relative" />
                          </div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest animate-pulse">{result.progress}</p>
                        </div>
                      ) : result.status === 'completed' && result.image_url ? (
                        <div className="w-full h-full">
                          <img
                            src={result.image_url}
                            alt={result.model_name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[1px]">
                            <a
                              href={result.image_url}
                              download
                              className="p-3 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 transition-all border border-white/10 shadow-xl"
                            >
                              <Download className="w-5 h-5 text-white" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-red-500 p-6 text-center bg-red-500/5">
                          <X className="w-8 h-8 mb-3 text-red-400 opacity-50" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('imageGen.errorLabel', 'ENGINE ERROR')}</span>
                          <span className="text-[9px] text-red-400/60 mt-1 uppercase leading-tight">{result.error}</span>
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