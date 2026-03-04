import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import {
  Video, Sparkles, Package, FolderOpen, Play, Upload,
  Star, Download, Clock, CheckCircle, Loader2, ArrowRight,
  Zap, Film, Wand2, Palette, ChevronRight, Eye, Filter,
  Scissors, Camera, Move, RotateCcw, Volume2, Maximize,
  Timer, Crown, Search, Image, RefreshCcw, X, Share2, Twitter, Facebook, Link2,
  GitCompare, Check
} from "lucide-react";
import PromptEnhancer from "@/components/PromptEnhancer";
import MotionBrushEditor from "@/components/video/MotionBrushEditor";
import NFTMintModal from "@/components/NFTMintModal";
import { useTranslation } from "react-i18next";

// Provider styling
const providerStyles: Record<string, { bg: string; text: string; icon: string }> = {
  'kie.ai': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', icon: '🔮' },
  'pollo.ai': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: '🎬' },
  'fal': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: '⚡' },
  'replicate': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: '🔄' },
};

// Video Styles
const videoStyles = [
  { id: 'cinematic', name: 'Sinematik', icon: '🎬' },
  { id: 'anime', name: 'Anime', icon: '🎨' },
  { id: 'realistic', name: 'Gerçekçi', icon: '📷' },
  { id: 'abstract', name: 'Soyut', icon: '🌀' },
  { id: 'neon', name: 'Neon', icon: '💫' },
  { id: 'vintage', name: 'Vintage', icon: '📼' },
];

const VideoPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("text-to-video");

  // Content type tabs with translations
  const contentTypes = [
    { id: "text-to-video", name: t('videoGen.tabT2V', 'Metin → Video'), icon: Film, description: t('videoGen.t2vDesc', "Metinden video oluştur") },
    { id: "image-to-video", name: t('videoGen.tabI2V', 'Görsel → Video'), icon: Image, description: t('videoGen.i2vDesc', "Görseli hareketlendir") },
    { id: "compare", name: t('videoGen.tabCompare', 'Karşılaştır'), icon: GitCompare, description: t('videoGen.compareDescModels', "Modelleri karşılaştır") },
    { id: "effects", name: t('videoGen.tabEffects', 'Efektler'), icon: Sparkles, description: t('videoGen.effectsDesc', "Video efektleri") },
    { id: "packages", name: t('videoGen.tabPackages', 'Paketler'), icon: Package, description: t('videoGen.packagesDesc', "Efekt paketleri") },
    { id: "gallery", name: t('videoGen.tabGallery', 'Galerim'), icon: FolderOpen, description: t('videoGen.galleryDesc', "Videolarım") },
  ];
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [searchQuery, setSearchQuery] = useState("");
  const [effectId, setEffectId] = useState("");
  const [effectCategory, setEffectCategory] = useState("all");
  const [packageId, setPackageId] = useState("");
  const [showMotionBrush, setShowMotionBrush] = useState(false);
  const [motionBrushLoading, setMotionBrushLoading] = useState(false);

  // Current generation task - shows video inline
  const [currentTask, setCurrentTask] = useState<{
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    prompt?: string;
  } | null>(null);

  // NFT State
  const [nftModalOpen, setNftModalOpen] = useState(false);
  const [selectedVideoForNft, setSelectedVideoForNft] = useState<any>(null);

  // File states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageFile2, setImageFile2] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Compare tab states
  const [selectedCompareModels, setSelectedCompareModels] = useState<string[]>([]);
  const [compareTasks, setCompareTasks] = useState<{
    modelId: string;
    modelName: string;
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    credits: number;
  }[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  const queryClient = useQueryClient();

  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ["videoModels"],
    queryFn: () => apiService.get("/video/models")
  });

  const { data: effectsData, isLoading: isLoadingEffects } = useQuery({
    queryKey: ["videoEffects"],
    queryFn: () => apiService.get("/video/effects")
  });

  const { data: packagesData, isLoading: isLoadingPackages } = useQuery({
    queryKey: ["videoPackages"],
    queryFn: () => apiService.get("/video/effect-packages")
  });

  const { data: myVideosData, isLoading: isLoadingMyVideos } = useQuery({
    queryKey: ["myVideos"],
    queryFn: () => apiService.get("/video/my-videos"),
    refetchInterval: 10000
  });

  const { mutate: generateVideo, isPending: isGenerating } = useMutation({
    mutationFn: (data: any) => apiService.post("/video/generate", data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["myVideos"] });
      // Show inline - don't switch tabs
      setCurrentTask({
        taskId: response?.task_id || response?.data?.task_id || '',
        status: 'pending',
        prompt: prompt
      });
    },
  });

  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [applyingEffect, setApplyingEffect] = useState(false);
  const [effectSuccess, setEffectSuccess] = useState<string | null>(null);

  // Poll for task completion when currentTask exists
  useEffect(() => {
    if (!currentTask?.taskId) return;

    // Check myVideos for this task and update status
    const data = myVideosData as any;
    const videos = data?.outputs || data?.data || data || [];
    if (!Array.isArray(videos)) return;

    const foundVideo = videos.find((v: any) => v.id === currentTask.taskId);
    if (foundVideo) {
      const newStatus = foundVideo.status || 'pending';
      const videoUrl = foundVideo.file_url || foundVideo.url;

      if (newStatus !== currentTask.status || (videoUrl && !currentTask.videoUrl)) {
        setCurrentTask((prev: any) => prev ? {
          ...prev,
          status: newStatus,
          videoUrl: videoUrl || prev.videoUrl
        } : null);
      }
    }
  }, [myVideosData, currentTask?.taskId]);

  const handlePurchasePackage = async (pkgId: string, pkgName: string, credits: number) => {
    try {
      setPurchaseLoading(true);
      const response = await apiService.post("/packages/purchase", { package_id: pkgId });
      setPurchaseSuccess(`${pkgName} başarıyla satın alındı! ${credits}c düşüldü.`);
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      setTimeout(() => setPurchaseSuccess(null), 5000);
    } catch (error: any) {
      alert(error?.response?.data?.detail || 'Satın alma başarısız');
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Upload image to get URL, then apply effect
  const handleApplyEffect = async () => {
    if (!imageFile || !effectId) return;

    const selectedEffect = effects.find((e: any) => e.id === effectId);
    if (selectedEffect?.requires_two_images && !imageFile2) {
      alert('Bu efekt için 2 görsel gerekli');
      return;
    }

    try {
      setApplyingEffect(true);

      // Upload image(s) first
      const formData = new FormData();
      formData.append('file', imageFile);
      const uploadRes = await apiService.upload('/files/upload', formData);
      const imageUrl = uploadRes?.public_url || uploadRes?.data?.public_url || uploadRes?.data?.url || uploadRes?.url;

      console.log('[Effects] Upload response:', uploadRes);
      console.log('[Effects] Image URL:', imageUrl);

      if (!imageUrl) {
        alert('Görsel URL alınamadı. Lütfen tekrar deneyin.');
        return;
      }

      let imageUrl2 = null;
      if (imageFile2) {
        const formData2 = new FormData();
        formData2.append('file', imageFile2);
        const uploadRes2 = await apiService.upload('/files/upload', formData2);
        imageUrl2 = uploadRes2?.public_url || uploadRes2?.data?.public_url || uploadRes2?.data?.url || uploadRes2?.url;
      }

      // Apply effect
      console.log('[Effects] Applying effect:', effectId, 'with image:', imageUrl);
      const effectResponse = await apiService.post('/video/effects/apply', {
        effect_id: effectId,
        image_url: imageUrl,
        image_url_2: imageUrl2
      });

      console.log('[Effects] Effect response:', effectResponse);
      setEffectSuccess(`${selectedEffect?.name} uygulanıyor! Görev ID: ${effectResponse?.data?.task_id || effectResponse?.task_id}`);
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      queryClient.invalidateQueries({ queryKey: ["myVideos"] });
      setImageFile(null);
      setImageFile2(null);
      setTimeout(() => setEffectSuccess(null), 8000);

    } catch (error: any) {
      console.error('[Effects] Full error:', error);
      console.error('[Effects] Response data:', error?.response?.data);

      // Extract error message from any possible format
      let errorMsg = 'Efekt uygulama başarısız';
      const data = error?.response?.data;

      if (typeof data === 'string') {
        errorMsg = data;
      } else if (data?.detail && typeof data.detail === 'string') {
        errorMsg = data.detail;
      } else if (data?.detail?.message) {
        errorMsg = data.detail.message;
      } else if (data?.message) {
        errorMsg = data.message;
      } else if (data?.error) {
        errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (data?.detail) {
        errorMsg = JSON.stringify(data.detail);
      } else if (error?.message && typeof error.message === 'string') {
        errorMsg = error.message;
      }

      alert(errorMsg);
    } finally {
      setApplyingEffect(false);
    }
  };

  // Handle Motion Brush video generation
  const handleMotionBrush = async (imageUrl: string, paths: any[]) => {
    try {
      setMotionBrushLoading(true);

      // Upload the image first (imageUrl is blob URL)
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'motion-brush-image.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await apiService.upload('/files/upload', formData);
      const uploadedImageUrl = uploadRes?.data?.url || uploadRes?.url;

      // Call motion brush API
      const motionRes = await apiService.post('/video/motion-brush', {
        image_url: uploadedImageUrl,
        motion_paths: paths.map(p => ({
          x: p.x,
          y: p.y,
          direction: p.direction,
          intensity: p.intensity,
          end_x: p.endX,
          end_y: p.endY
        })),
        duration: 5
      });

      alert(`Motion Brush video oluşturuluyor! Görev ID: ${motionRes?.data?.task_id || motionRes?.task_id}`);
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      queryClient.invalidateQueries({ queryKey: ["myVideos"] });
      setShowMotionBrush(false);

    } catch (error: any) {
      alert(error?.response?.data?.detail || 'Motion Brush başarısız');
    } finally {
      setMotionBrushLoading(false);
    }
  };

  // Toggle model selection for compare tab
  const toggleCompareModel = (modelId: string) => {
    setSelectedCompareModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length >= 4) {
        alert('En fazla 4 model seçebilirsiniz');
        return prev;
      }
      return [...prev, modelId];
    });
  };

  // Handle compare generation - runs all selected models in parallel
  const handleCompare = async () => {
    if (!prompt || selectedCompareModels.length < 2) {
      alert('Lütfen prompt girin ve en az 2 model seçin');
      return;
    }

    setIsComparing(true);
    setCompareTasks([]);

    const enhancedPrompt = selectedStyle ? `${prompt}, ${selectedStyle} style` : prompt;

    // Create tasks array for tracking
    const newTasks = selectedCompareModels.map(modelId => {
      const model = models.find((m: any) => m.id === modelId);
      return {
        modelId,
        modelName: model?.display_name || model?.name || modelId,
        taskId: '',
        status: 'pending' as const,
        credits: model?.credits || 0
      };
    });
    setCompareTasks(newTasks);

    // Fire all requests in parallel
    const promises = selectedCompareModels.map(async (modelId, index) => {
      try {
        const model = models.find((m: any) => m.id === modelId);
        const response = await apiService.post("/video/generate", {
          prompt: enhancedPrompt,
          model_id: modelId,
          duration: model?.duration || 5,
          aspect_ratio: aspectRatio
        });

        const taskId = response?.task_id || response?.data?.task_id || '';

        // Update the specific task with taskId
        setCompareTasks(prev => prev.map((t, i) =>
          i === index ? { ...t, taskId, status: 'processing' as const } : t
        ));

        return { modelId, taskId, success: true };
      } catch (error: any) {
        // Mark as failed
        setCompareTasks(prev => prev.map((t, i) =>
          i === index ? { ...t, status: 'failed' as const } : t
        ));
        return { modelId, success: false };
      }
    });

    await Promise.all(promises);
    setIsComparing(false);
    queryClient.invalidateQueries({ queryKey: ["myVideos"] });
    queryClient.invalidateQueries({ queryKey: ["userCredits"] });
  };

  // Poll for compare task status updates
  useEffect(() => {
    if (compareTasks.length === 0) return;

    const data = myVideosData as any;
    const videos = data?.outputs || data?.data || data || [];
    if (!Array.isArray(videos)) return;

    // Update each compare task status
    setCompareTasks(prev => prev.map(task => {
      if (!task.taskId) return task;

      const foundVideo = videos.find((v: any) => v.id === task.taskId);
      if (foundVideo) {
        const newStatus = foundVideo.status || task.status;
        const videoUrl = foundVideo.file_url || foundVideo.url;

        if (newStatus !== task.status || (videoUrl && !task.videoUrl)) {
          return {
            ...task,
            status: newStatus,
            videoUrl: videoUrl || task.videoUrl
          };
        }
      }
      return task;
    }));
  }, [myVideosData, compareTasks.length]);

  const rawModels = modelsData?.data || modelsData || [];
  const effects = effectsData?.data || effectsData || [];
  const packages = packagesData?.data || packagesData || [];
  const myVideos = myVideosData?.outputs || myVideosData?.data || myVideosData || [];

  // Filter models by current content type
  const models = useMemo(() => {
    if (!Array.isArray(rawModels)) return [];

    // Map tab to model type
    const typeMap: Record<string, string> = {
      'text-to-video': 'text_to_video',
      'image-to-video': 'image_to_video',
      'video-to-video': 'video_to_video'
    };
    const modelType = typeMap[activeTab];

    return rawModels.filter((m: any) => {
      // Type filter - if it's a video type tab
      if (modelType) {
        // Check both type and model_type fields (different APIs may use different names)
        const typeMatch = m.type === modelType || m.model_type === modelType;
        const capabilityMatch = m.capabilities?.[modelType.replace(/_/g, '')] ||
          m.capabilities?.[modelType];
        if (!typeMatch && !capabilityMatch) return false;
      }

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return m.name?.toLowerCase().includes(q) ||
          m.provider?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q);
      }

      return true;
    });
  }, [rawModels, activeTab, searchQuery]);

  // Calculate total credits for selected compare models
  const totalCompareCredits = useMemo(() => {
    return selectedCompareModels.reduce((total, modelId) => {
      const model = models.find((m: any) => m.id === modelId);
      return total + (model?.credits || 0);
    }, 0);
  }, [selectedCompareModels, models]);

  // Get selected model details
  const selectedModel = useMemo(() => {
    return models.find((m: any) => m.id === modelId);
  }, [models, modelId]);

  // Get model capabilities
  const modelCapabilities = useMemo(() => {
    if (!selectedModel) return [];
    const caps = [];
    if (selectedModel.capabilities?.synchronized_audio) caps.push({ icon: Volume2, label: 'Sesli Video' });
    if (selectedModel.capabilities?.image_to_video) caps.push({ icon: Upload, label: 'Görsel→Video' });
    if (selectedModel.capabilities?.camera_control) caps.push({ icon: Camera, label: 'Kamera Kontrolü' });
    if (selectedModel.resolution === '1080p') caps.push({ icon: Maximize, label: '1080p HD' });
    if (selectedModel.resolution === '720p') caps.push({ icon: Maximize, label: '720p' });
    return caps;
  }, [selectedModel]);

  // Filter effects by category
  const filteredEffects = useMemo(() => {
    if (!Array.isArray(effects)) return [];
    if (effectCategory === 'all') return effects;
    return effects.filter((e: any) => e.category === effectCategory);
  }, [effects, effectCategory]);

  const handleGenerate = async () => {
    if (!prompt || !modelId) return;

    const enhancedPrompt = selectedStyle ? `${prompt}, ${selectedStyle} style` : prompt;

    // For I2V models, upload image first and get URL
    let imageUrl = null;
    if (activeTab === "image-to-video" && imageFile) {
      try {
        // Validate image dimensions first (min 256x256)
        // Use window.Image to avoid conflict with lucide-react Image icon
        const img = new window.Image();
        const imgUrl = URL.createObjectURL(imageFile);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(imgUrl);
            if (img.width < 256 || img.height < 256) {
              reject(new Error(`Görsel boyutu çok küçük: ${img.width}x${img.height}. Minimum 256x256 piksel gerekli.`));
            }
            resolve();
          };
          img.onerror = () => reject(new Error('Görsel yüklenemedi'));
          img.src = imgUrl;
        });

        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadRes = await apiService.upload('/files/upload', formData);
        // FileUploadResponse uses public_url field
        imageUrl = uploadRes?.public_url || uploadRes?.data?.public_url || uploadRes?.url || uploadRes?.data?.url;
        console.log('[I2V] Upload response:', uploadRes);
        console.log('[I2V] Extracted image URL:', imageUrl);

        if (!imageUrl) {
          console.error('[I2V] No URL in response:', uploadRes);
          alert('Görsel URL alınamadı');
          return;
        }

        // Validate URL is external (not local path)
        if (imageUrl.startsWith('/api/') || imageUrl.startsWith('/files/')) {
          console.error('[I2V] URL is local path, not public:', imageUrl);
          alert('Görsel yükleme başarısız: Supabase storage yapılandırılmalı.');
          return;
        }
      } catch (error: any) {
        console.error('[I2V] Image upload failed:', error);
        alert(error?.message || 'Görsel yükleme başarısız');
        return;
      }
    }

    // For V2V models, upload video first and get URL
    let videoUrl = null;
    if (activeTab === "video-to-video" && videoFile) {
      try {
        console.log('[V2V] Uploading video file:', videoFile.name);

        const formData = new FormData();
        formData.append('file', videoFile);
        const uploadRes = await apiService.upload('/files/upload', formData);
        videoUrl = uploadRes?.public_url || uploadRes?.data?.public_url || uploadRes?.url || uploadRes?.data?.url;
        console.log('[V2V] Upload response:', uploadRes);
        console.log('[V2V] Extracted video URL:', videoUrl);

        if (!videoUrl) {
          console.error('[V2V] No URL in response:', uploadRes);
          alert('Video URL alınamadı');
          return;
        }

        // Validate URL is external (not local path)
        if (videoUrl.startsWith('/api/') || videoUrl.startsWith('/files/')) {
          console.error('[V2V] URL is local path, not public:', videoUrl);
          alert('Video yükleme başarısız: Supabase storage yapılandırılmalı.');
          return;
        }
      } catch (error: any) {
        console.error('[V2V] Video upload failed:', error);
        alert(error?.message || 'Video yükleme başarısız');
        return;
      }
    }

    generateVideo({
      prompt: enhancedPrompt,
      model_id: modelId,
      duration: selectedModel?.duration || 5,
      aspect_ratio: aspectRatio,
      image_url: imageUrl,  // Include for I2V
      video_url: videoUrl   // Include for V2V
    });
  };

  const getProviderStyle = (provider: string) => {
    return providerStyles[provider?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🎥' };
  };

  // Get current content type info
  const currentContentType = contentTypes.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative px-6 py-8 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-3">
              <Video className="w-4 h-4" />
              <span className="text-sm font-medium">{t('videoGen.badge', 'AI Video Stüdyosu')}</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">
              {t('videoGen.title', 'Video ')}<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-yellow-300">{t('videoGen.titleHighlight', 'Sihirbazı')}</span>
            </h1>
            <p className="text-purple-100">{t('videoGen.desc', 'Sora 2, Veo 3.1, Kling 2.6, Runway ve daha fazlası')}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none"><path d="M0 60V0C240 40 480 60 720 60C960 60 1200 40 1440 0V60H0Z" fill="currentColor" className="text-gray-50 dark:text-gray-900" /></svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 -mt-4">
        {/* Content Type Navigation */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-2xl p-1 sm:p-1.5 shadow-lg border border-gray-100 dark:border-gray-700 max-w-full overflow-x-auto scrollbar-hide">
            {contentTypes.map((type) => {
              const Icon = type.icon;
              const isActive = activeTab === type.id;
              const gradients: Record<string, string> = {
                'text-to-video': 'from-purple-500 to-violet-500',
                'image-to-video': 'from-blue-500 to-cyan-500',
                'compare': 'from-orange-500 to-red-500',
                'effects': 'from-pink-500 to-rose-500',
                'packages': 'from-amber-500 to-yellow-500',
                'gallery': 'from-emerald-500 to-teal-500',
              };
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    setActiveTab(type.id);
                    setModelId("");
                  }}
                  className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap ${isActive
                    ? `bg-gradient-to-r ${gradients[type.id] || 'from-purple-500 to-violet-500'} text-white shadow-lg`
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {type.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text to Video / Image to Video / Video to Video Tabs */}
        {(activeTab === "text-to-video" || activeTab === "image-to-video" || activeTab === "video-to-video") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Panel - Model Selection */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    {activeTab === "text-to-video" && t('videoGen.modelsListT2V', "Text → Video Modeller")}
                    {activeTab === "image-to-video" && t('videoGen.modelsListI2V', "Image → Video Modeller")}
                    {activeTab === "video-to-video" && t('videoGen.modelsListV2V', "Video → Video Modeller")}
                  </h2>
                  <span className="text-xs text-gray-500">{models.length} {t('videoGen.modelCount', 'model')}</span>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('videoGen.searchModel', 'Model ara...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Model List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {isLoadingModels ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                    ))
                  ) : models.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>{t('videoGen.noModelInCategory', 'Bu kategoride model bulunamadı')}</p>
                    </div>
                  ) : (
                    models.map((model: any) => {
                      const style = getProviderStyle(model.provider);
                      const isSelected = modelId === model.id;
                      return (
                        <div
                          key={model.id}
                          onClick={() => setModelId(model.id)}
                          className={`relative p-3 rounded-xl cursor-pointer transition-all border-2 ${isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                            : 'border-transparent bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
                              {model.name}
                            </h4>
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-full">
                              {model.credits}c
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <span className={`px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
                              {style.icon} {model.provider}
                            </span>
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {model.duration}s
                            </span>
                            <span className="text-yellow-500">
                              {'★'.repeat(model.quality || 4)}
                            </span>
                          </div>

                          {model.badge && (
                            <span className="inline-block px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 text-xs font-bold rounded-full">
                              {model.badge}
                            </span>
                          )}

                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Creation */}
            <div className="lg:col-span-2 space-y-4">

              {/* Selected Model Info */}
              {selectedModel && (
                <div className="bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{selectedModel.name}</h3>
                      <p className="text-purple-100 text-sm">{selectedModel.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{selectedModel.credits}c</div>
                      <div className="text-purple-200 text-xs">{selectedModel.duration}s • {selectedModel.resolution}</div>
                    </div>
                  </div>

                  {modelCapabilities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {modelCapabilities.map((cap, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-xs">
                          <cap.icon className="w-3 h-3" />
                          {cap.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Input Section - Changes based on content type */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">

                {/* Image Upload for Image-to-Video */}
                {activeTab === "image-to-video" && (
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Image className="w-5 h-5 text-purple-500" />
                      {t('videoGen.startImage', 'Başlangıç Görseli')}
                    </h3>
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${imageFile ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                        }`}
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      />
                      {imageFile ? (
                        <>
                          <CheckCircle className="w-10 h-10 text-purple-500 mx-auto mb-2" />
                          <p className="text-purple-600 font-medium">{imageFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('videoGen.uploadChangeImage', 'Değiştirmek için tıklayın')}</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 dark:text-gray-400">{t('videoGen.uploadClickImage', 'Görsel yüklemek için tıklayın')}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('videoGen.formatsImage', 'PNG, JPG, WebP')}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Video Upload for Video-to-Video */}
                {activeTab === "video-to-video" && (
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Film className="w-5 h-5 text-purple-500" />
                      {t('videoGen.sourceVideo', 'Kaynak Video')}
                    </h3>
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${videoFile ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                        }`}
                      onClick={() => document.getElementById('video-upload')?.click()}
                    >
                      <input
                        id="video-upload"
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      />
                      {videoFile ? (
                        <>
                          <CheckCircle className="w-10 h-10 text-purple-500 mx-auto mb-2" />
                          <p className="text-purple-600 font-medium">{videoFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('videoGen.uploadChangeImage', 'Değiştirmek için tıklayın')}</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 dark:text-gray-400">{t('videoGen.uploadClickVideo', 'Video yüklemek için tıklayın')}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('videoGen.formatsVideo', 'MP4, MOV, WebM')}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Prompt Section */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Wand2 className="w-5 h-5 text-purple-500" />
                      {activeTab === "video-to-video" ? t('videoGen.promptTitleV2V', "Dönüşüm Talimatı") : t('videoGen.promptTitleT2V', "Video Senaryosu")}
                    </h2>
                  </div>
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        activeTab === "video-to-video"
                          ? t('videoGen.promptPlaceholderV2V', "Dönüşüm talimatı yazın... (Örn: Anime stiline çevir, gece vakti yap)")
                          : t('videoGen.promptPlaceholderT2V', "Videonuzun detaylı bir tanımını yazın...")
                      }
                      rows={4}
                      disabled={isGenerating}
                      className="w-full px-4 py-3 pr-14 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                    />
                    <div className="absolute right-3 top-3">
                      <PromptEnhancer contentType="video" currentPrompt={prompt} onSelectPrompt={(p) => setPrompt(p)} />
                    </div>
                  </div>
                </div>

                {/* Style Selection - Only for text-to-video */}
                {activeTab === "text-to-video" && (
                  <div className="px-5 pb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('videoGen.styleTitle', 'Stil (Opsiyonel)')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {videoStyles.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(selectedStyle === style.id ? '' : style.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedStyle === style.id
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                        >
                          {style.icon} {style.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aspect Ratio */}
                <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('videoGen.aspectRatio', 'En-Boy Oranı')}</h3>
                  <div className="flex gap-2">
                    {['16:9', '9:16', '1:1'].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${aspectRatio === ratio
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                          }`}
                      >
                        {ratio === '16:9' && '🖥️ Yatay'}
                        {ratio === '9:16' && '📱 Dikey'}
                        {ratio === '1:1' && '⬜ Kare'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="p-5 bg-gray-50 dark:bg-gray-900/50">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt || !modelId ||
                      (activeTab === "image-to-video" && !imageFile) ||
                      (activeTab === "video-to-video" && !videoFile)
                    }
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />{t('videoGen.generating', 'Video Oluşturuluyor...')}</>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        {activeTab === "text-to-video" && t('videoGen.generateBtnT2V', "Video Oluştur")}
                        {activeTab === "image-to-video" && t('videoGen.generateBtnI2V', "Görseli Hareketlendir")}
                        {activeTab === "video-to-video" && t('videoGen.generateBtnV2V', "Videoyu Dönüştür")}
                        {selectedModel && ` (${selectedModel.credits}c)`}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Inline Video Preview - Shows generated video on same screen */}
              {currentTask && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Video className="w-5 h-5 text-purple-500" />
                        {t('videoGen.previewTitle', 'Üretilen Video')}
                      </h3>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${currentTask.status === 'completed' ? 'bg-green-100 text-green-700' :
                        currentTask.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                          currentTask.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-purple-100 text-purple-700'
                        }`}>
                        {currentTask.status === 'completed' ? t('videoGen.statusCompleted', '✓ Hazır') :
                          currentTask.status === 'processing' ? t('videoGen.statusProcessing', '⏳ İşleniyor') :
                            currentTask.status === 'failed' ? t('videoGen.statusFailed', '✗ Hata') :
                              t('videoGen.statusPending', '⏳ Bekliyor')}
                      </div>
                    </div>
                  </div>
                  <div className="aspect-video bg-gray-900 relative">
                    {currentTask.videoUrl ? (
                      <video
                        src={currentTask.videoUrl}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
                        <p className="text-sm text-gray-400">{t('videoGen.previewGenerating', 'Video üretiliyor...')}</p>
                        <p className="text-xs text-gray-500 mt-2 max-w-md text-center px-4">{currentTask.prompt || t('videoGen.previewWait', 'Oluşturuluyor...')}</p>
                      </div>
                    )}
                  </div>
                  {currentTask.videoUrl && (
                    <div className="p-4 flex gap-2">
                      <a
                        href={currentTask.videoUrl}
                        download
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <Download className="w-4 h-4" /> {t('videoGen.download', 'İndir')}
                      </a>
                      <button
                        onClick={() => setCurrentTask(null)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium"
                      >
                        {t('videoGen.close', 'Kapat')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compare Tab */}
        {activeTab === "compare" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Panel - Model Selection */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-purple-500" />
                    {t('videoGen.compareTitle', 'Modelleri Karşılaştır')}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {selectedCompareModels.length}/4 seçili
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  {t('videoGen.compareDesc', '2-4 model seçin ve aynı prompt ile karşılaştırın')}
                </p>

                {/* Model Grid */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {isLoadingModels ? (
                    [1, 2, 3, 4].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                    ))
                  ) : models.map((model: any) => (
                    <button
                      key={model.id}
                      onClick={() => toggleCompareModel(model.id)}
                      className={`w-full p-3 rounded-xl border transition-all text-left ${selectedCompareModels.includes(model.id)
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-sm ${selectedCompareModels.includes(model.id)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700'
                            }`}>
                            {selectedCompareModels.includes(model.id) ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <span className="text-lg">{model.badge?.charAt(0) || '🎬'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                              {model.display_name || model.name}
                            </div>
                            <div className="text-xs text-gray-500">{model.provider}</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-purple-600">
                          {model.credits}💎
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Total Credits */}
                {selectedCompareModels.length > 0 && (
                  <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-700 dark:text-purple-300">
                        {selectedCompareModels.length} {t('videoGen.modelCount', 'model')} seçili
                      </span>
                      <span className="font-bold text-purple-600">
                        Toplam: {totalCompareCredits}💎
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle + Right Panel - Prompt & Results */}
            <div className="lg:col-span-2 space-y-4">
              {/* Prompt Input */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('videoGen.comparePromptLabel', 'Prompt (Tüm modeller için)')}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('videoGen.comparePromptPlaceholder', "Karşılaştırmak istediğiniz video için açıklama girin...")}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={3}
                  />
                </div>

                {/* Aspect Ratio */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <label className="block text-xs text-gray-500 mb-2">{t('videoGen.aspectRatio', 'En-Boy Oranı')}</label>
                  <div className="flex gap-2">
                    {['16:9', '9:16', '1:1'].map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${aspectRatio === ratio
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                      >
                        {ratio === '16:9' && '🖥️ Yatay'}
                        {ratio === '9:16' && '📱 Dikey'}
                        {ratio === '1:1' && '⬜ Kare'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                  <button
                    onClick={handleCompare}
                    disabled={isComparing || !prompt || selectedCompareModels.length < 2}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {isComparing ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />{t('videoGen.compareGenerating', 'Karşılaştırma Başlatılıyor...')}</>
                    ) : (
                      <>
                        <GitCompare className="w-5 h-5" />
                        {t('videoGen.compareBtn', 'Karşılaştır')} ({selectedCompareModels.length} {t('videoGen.modelCount', 'Model').replace(/^[a-z]/, c => c.toUpperCase())})
                        <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                          {totalCompareCredits}💎
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Compare Results Grid */}
              {compareTasks.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Eye className="w-5 h-5 text-purple-500" />
                    {t('videoGen.compareResultsTitle', 'Karşılaştırma Sonuçları')}
                  </h3>

                  <div className={`grid gap-4 ${compareTasks.length === 2 ? 'grid-cols-2' :
                    compareTasks.length === 3 ? 'grid-cols-3' :
                      'grid-cols-2'
                    }`}>
                    {compareTasks.map((task, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        {/* Model Header */}
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {task.modelName}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                              task.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                                task.status === 'failed' ? 'bg-red-100 text-red-700' :
                                  'bg-purple-100 text-purple-700'
                              }`}>
                              {task.status === 'completed' ? t('videoGen.statusCompleted', '✓ Hazır') :
                                task.status === 'processing' ? t('videoGen.statusProcessing', '⏳ İşleniyor') :
                                  task.status === 'failed' ? t('videoGen.statusFailed', '✗ Hata') :
                                    t('videoGen.statusPending', '⏳ Bekliyor')}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{task.credits}💎</div>
                        </div>

                        {/* Video Preview */}
                        <div className="aspect-video bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                          {task.status === 'completed' && task.videoUrl ? (
                            <video
                              src={task.videoUrl}
                              controls
                              className="w-full h-full object-cover"
                              autoPlay
                              muted
                              loop
                            />
                          ) : task.status === 'failed' ? (
                            <div className="text-center p-4">
                              <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">{t('videoGen.compareGenFailed', 'Üretim başarısız')}</p>
                            </div>
                          ) : (
                            <div className="text-center p-4">
                              <Loader2 className="w-8 h-8 text-purple-500 mx-auto mb-2 animate-spin" />
                              <p className="text-xs text-gray-500">{t('videoGen.generating', 'Video oluşturuluyor...')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Effects Tab */}
        {activeTab === "effects" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Panel - Effect Selection */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    {t('videoGen.effectsTitle', 'Video Efektleri')}
                  </h2>
                  <span className="text-xs text-gray-500">{filteredEffects.length} {t('videoGen.effectsCount', 'efekt')}</span>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {[
                    { id: 'all', name: 'Tümü', icon: '🎬' },
                    { id: 'romantic', name: 'Romantik', icon: '💕' },
                    { id: 'transform', name: 'Dönüşüm', icon: '🔄' },
                    { id: 'fun', name: 'Eğlence', icon: '🎉' },
                    { id: 'animation', name: 'Animasyon', icon: '🎨' },
                    { id: 'avatar', name: 'Avatar', icon: '🗣️' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setEffectCategory(cat.id)}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${effectCategory === cat.id
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                        }`}
                    >
                      {cat.icon}
                    </button>
                  ))}
                </div>

                {/* Motion Brush Button */}
                <button
                  onClick={() => setShowMotionBrush(true)}
                  className="w-full mb-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
                >
                  <Wand2 className="w-4 h-4" />
                  Motion Brush
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">50c</span>
                </button>

                {/* Effect List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {isLoadingEffects ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                    ))
                  ) : filteredEffects.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      {t('videoGen.effectsNoCat', 'Bu kategoride efekt yok')}
                    </div>
                  ) : (
                    filteredEffects.map((effect: any) => {
                      const isSelected = effectId === effect.id;
                      return (
                        <div
                          key={effect.id}
                          onClick={() => setEffectId(effect.id)}
                          className={`relative p-3 rounded-xl cursor-pointer transition-all border-2 ${isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                            : 'border-transparent bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{effect.icon || '✨'}</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
                                {effect.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-full">
                                  {effect.credits}c
                                </span>
                                {effect.requires_two_images && (
                                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">
                                    2 Görsel
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Apply Effect */}
            <div className="lg:col-span-2 space-y-4">
              {/* Selected Effect Info */}
              {effectId ? (
                <>
                  <div className="bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{effects.find((e: any) => e.id === effectId)?.icon || '✨'}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{effects.find((e: any) => e.id === effectId)?.name}</h3>
                        <p className="text-purple-100 text-sm">{effects.find((e: any) => e.id === effectId)?.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{effects.find((e: any) => e.id === effectId)?.credits}c</div>
                      </div>
                    </div>
                  </div>

                  {/* Upload Section */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-purple-500" />
                      Görsel Yükle
                    </h3>

                    <div className={`grid gap-4 mb-6 ${effects.find((e: any) => e.id === effectId)?.requires_two_images ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {/* Image 1 Upload */}
                      <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${imageFile ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                          }`}
                        onClick={() => document.getElementById('effect-image-1')?.click()}
                      >
                        <input
                          id="effect-image-1"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        />
                        {imageFile ? (
                          <>
                            <CheckCircle className="w-12 h-12 text-purple-500 mx-auto mb-2" />
                            <p className="text-purple-600 font-medium">{imageFile.name}</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 dark:text-gray-400 font-medium">
                              {effects.find((e: any) => e.id === effectId)?.requires_two_images ? t('videoGen.upload1stImage', '1. Görsel') : t('videoGen.uploadImage', 'Görsel Yükle')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{t('videoGen.formatsImage', 'PNG, JPG, WebP')}</p>
                          </>
                        )}
                      </div>

                      {/* Image 2 Upload (if required) */}
                      {effects.find((e: any) => e.id === effectId)?.requires_two_images && (
                        <div
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${imageFile2 ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                            }`}
                          onClick={() => document.getElementById('effect-image-2')?.click()}
                        >
                          <input
                            id="effect-image-2"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setImageFile2(e.target.files?.[0] || null)}
                          />
                          {imageFile2 ? (
                            <>
                              <CheckCircle className="w-12 h-12 text-purple-500 mx-auto mb-2" />
                              <p className="text-purple-600 font-medium">{imageFile2.name}</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-600 dark:text-gray-400 font-medium">2. Görsel</p>
                              <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={handleApplyEffect}
                      disabled={applyingEffect || !imageFile || (effects.find((e: any) => e.id === effectId)?.requires_two_images && !imageFile2)}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      {applyingEffect ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                      {applyingEffect ? t('videoGen.applyingEffect', 'İşleniyor...') : `${t('videoGen.applyEffect', 'Efekt Uygula')} (${effects.find((e: any) => e.id === effectId)?.credits}c)`}
                    </button>

                    {effectSuccess && (
                      <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        {effectSuccess}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
                  <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('videoGen.selectEffectTitle', 'Efekt Seçin')}</h3>
                  <p className="text-gray-500">{t('videoGen.selectEffectHelp', 'Sol taraftan bir efekt seçerek başlayın')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Packages Tab */}
        {activeTab === "packages" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Panel - Package Selection */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-500" />
                    {t('videoGen.packagesTitle', 'Efekt Paketleri')}
                  </h2>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                    %30'a varan
                  </span>
                </div>

                {/* Package List */}
                <div className="space-y-2">
                  {isLoadingPackages ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                    ))
                  ) : !Array.isArray(packages) || packages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      {t('videoGen.packagesNoCat', 'Henüz paket yok')}
                    </div>
                  ) : (
                    packages.map((pkg: any) => {
                      const isSelected = packageId === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setPackageId(pkg.id)}
                          className={`relative p-3 rounded-xl cursor-pointer transition-all border-2 ${isSelected
                            ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 shadow-md'
                            : 'border-transparent bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{pkg.icon || '📦'}</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
                                {pkg.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-400 line-through">{pkg.original_credits || Math.round((pkg.total_credits || 100) * 1.25)}c</span>
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full">
                                  {pkg.total_credits || 100}c
                                </span>
                                <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 text-xs font-medium rounded">
                                  -{pkg.discount_percent || 20}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Package Details */}
            <div className="lg:col-span-2 space-y-4">
              {packageId ? (
                <>
                  {/* Selected Package Info */}
                  {(() => {
                    const selectedPkg = packages.find((p: any) => p.id === packageId);
                    if (!selectedPkg) return null;

                    return (
                      <>
                        <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden">
                          <div className="absolute top-0 right-0 px-4 py-2 bg-yellow-400 text-yellow-900 font-bold text-sm rounded-bl-xl">
                            {selectedPkg.discount_percent || 20}% İNDİRİM
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-5xl">{selectedPkg.icon || '📦'}</span>
                            <div className="flex-1">
                              <h3 className="font-bold text-2xl">{selectedPkg.name}</h3>
                              <p className="text-purple-100 mt-1">{selectedPkg.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-purple-200 line-through text-lg">{selectedPkg.original_credits || Math.round((selectedPkg.total_credits || 100) * 1.25)}c</div>
                              <div className="text-3xl font-bold">{selectedPkg.total_credits || 100}c</div>
                            </div>
                          </div>
                        </div>

                        {/* Included Effects */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            {t('videoGen.packageIncludedEffects', 'Pakete Dahil Efektler')} ({selectedPkg.effects?.length || 0})
                          </h3>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                            {(selectedPkg.effects || []).map((effectIdItem: string) => {
                              // Find effect details from effects list
                              const effectDetail = effects.find((e: any) => e.id === effectIdItem);
                              return (
                                <div key={effectIdItem} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                  <span className="text-xl">{effectDetail?.icon || '✨'}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                                      {effectDetail?.name || effectIdItem}
                                    </p>
                                    <p className="text-xs text-gray-500">{effectDetail?.credits || 20}c</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Savings Calculation */}
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-6">
                            <div className="flex items-center justify-between">
                              <span className="text-green-700 dark:text-green-300 font-medium">{t('videoGen.packageTotalSavings', 'Toplam Tasarruf')}</span>
                              <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                                {(selectedPkg.original_credits || Math.round((selectedPkg.total_credits || 100) * 1.25)) - (selectedPkg.total_credits || 100)}c {t('videoGen.packageYouSave', 'kazanıyorsunuz!')}
                              </span>
                            </div>
                          </div>

                          {/* Buy Button */}
                          <button
                            onClick={() => handlePurchasePackage(selectedPkg.id, selectedPkg.name, selectedPkg.total_credits || 100)}
                            disabled={purchaseLoading}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                          >
                            {purchaseLoading ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Package className="w-5 h-5" />
                            )}
                            {purchaseLoading ? 'İşleniyor...' : `${t('videoGen.buyPackage', 'Paketi Satın Al')} (${selectedPkg.total_credits || 100}c)`}
                          </button>

                          {purchaseSuccess && (
                            <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl flex items-center gap-2">
                              <CheckCircle className="w-5 h-5" />
                              {purchaseSuccess}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('videoGen.selectPackageTitle', 'Paket Seçin')}</h3>
                  <p className="text-gray-500">{t('videoGen.selectPackageHelp', 'Sol taraftan bir paket seçerek detayları görüntüleyin')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-purple-500" />
              {t('videoGen.galleryTitle', 'Videolarım')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingMyVideos ? (
                [1, 2, 3].map(i => <div key={i} className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)
              ) : !Array.isArray(myVideos) || myVideos.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">{t('videoGen.galleryNoVideos', 'Henüz video yok')}</p>
                  <p className="text-sm text-gray-400">{t('videoGen.galleryCreateFirst', 'İlk videonuzu oluşturun!')}</p>
                </div>
              ) : (
                myVideos.map((video: any) => (
                  <div key={video.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
                    <div className="aspect-video bg-gray-900 relative">
                      {video.url || video.file_url ? (
                        <video src={video.url || video.file_url} className="w-full h-full object-cover" controls />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        </div>
                      )}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${video.status === 'completed' ? 'bg-green-500' : video.status === 'processing' ? 'bg-yellow-500' : 'bg-gray-500'
                        } text-white`}>
                        {video.status === 'completed' ? t('videoGen.statusCompleted', '✓ Hazır') : video.status === 'processing' ? t('videoGen.statusProcessing', '⏳ İşleniyor') : t('videoGen.statusPending', 'Bekliyor')}
                      </div>
                    </div>
                    <div className="p-4">
                      {video.is_nft_minted && (
                        <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-md w-fit">
                          <CheckCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400">
                            ZexAI Ecosystem NFT Olarak Basıldı
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2 mb-2">{video.prompt || 'Video'}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>{video.model_name || video.model}</span>
                        <span>{video.created_at && new Date(video.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>

                      {/* Action Buttons */}
                      {video.status === 'completed' && (video.url || video.file_url) && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex-wrap">
                          {/* NFT Mint Button */}
                          {!video.is_nft_minted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVideoForNft(video);
                                setNftModalOpen(true);
                              }}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow hover:from-purple-600 hover:to-indigo-600"
                              title="NFT Olarak Bas"
                            >
                              💎 NFT Yap
                            </button>
                          )}

                          {/* Showcase Toggle */}
                          <button
                            onClick={async () => {
                              try {
                                await apiService.post(`/video/my-videos/${video.id}/showcase`, { is_showcase: !video.is_showcase });
                                queryClient.invalidateQueries({ queryKey: ["myVideos"] });
                              } catch (e) { console.error(e); }
                            }}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${video.is_showcase
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                              }`}
                            title={video.is_showcase ? "Showcase'dan kaldır" : "Showcase'a ekle"}
                          >
                            <Star className={`w-3.5 h-3.5 ${video.is_showcase ? 'fill-yellow-500' : ''}`} />
                            <span className="hidden sm:inline">{video.is_showcase ? 'Showcase' : t('videoGen.share', 'Paylaş')}</span>
                          </button>

                          {/* Download */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await fetch(video.url || video.file_url);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `ZexAi_Video_${Date.now()}.mp4`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              } catch (err) {
                                console.error("Download failed:", err);
                                window.open(video.url || video.file_url, '_blank');
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-xs font-medium transition-colors"
                            title="İndir"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Share to Earn - Twitter */}
                          <button
                            onClick={(e) => {
                              // 1. Synchronous popup bypass wrapper
                              window.open(`https://twitter.com/intent/tweet?text=ZexAI ile ürettiğim muhteşem videoya göz atın! 🚀&url=${encodeURIComponent(video.url || video.file_url)}`, '_blank');

                              // 2. Async reward logic
                              apiService.post('/social/share', { content_type: 'video', content_id: video.id, platform: 'twitter' })
                                .then((response) => {
                                  const data = response?.data || response;
                                  if (data?.reward_granted) {
                                    queryClient.invalidateQueries({ queryKey: ["userCredits"] });
                                    alert('🎉 Harika! X (Twitter) paylaşımınız için hesabınıza 5 AI Kredisi eklendi!');
                                  }
                                })
                                .catch((err) => {
                                  console.log('Reward already claimed or error', err);
                                });
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-semibold transition-colors border border-blue-200 dark:border-blue-800/50 shadow-sm"
                            title="Twitter'da Paylaş & Kazan"
                          >
                            <span className="text-black dark:text-white font-bold">𝕏</span> Twitter <span className="text-[10px] bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded text-blue-700 dark:text-blue-300">+5c</span>
                          </button>

                          {/* Share to Earn - Facebook */}
                          <button
                            onClick={(e) => {
                              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(video.url || video.file_url)}`, '_blank');

                              apiService.post('/social/share', { content_type: 'video', content_id: video.id, platform: 'facebook' })
                                .then((response) => {
                                  const data = response?.data || response;
                                  if (data?.reward_granted) {
                                    queryClient.invalidateQueries({ queryKey: ["userCredits"] });
                                    alert('Facebook üzerinden paylaştığınız için 5 kredi kazandınız!');
                                  }
                                })
                                .catch((err) => {
                                  console.log('Reward already claimed or error', err);
                                });
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-semibold transition-colors border border-indigo-200 dark:border-indigo-800/50 shadow-sm"
                            title="Facebook'ta Paylaş & Kazan"
                          >
                            <span className="text-blue-600 font-bold">f</span> Facebook <span className="text-[10px] bg-indigo-100 dark:bg-indigo-800 px-1 py-0.5 rounded text-indigo-700 dark:text-indigo-300">+15c</span>
                          </button>
                          <a
                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(video.url || video.file_url)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            <span className="text-blue-700 font-bold">in</span> LinkedIn
                          </a>
                          <a
                            href={`https://t.me/share/url?url=${encodeURIComponent(video.url || video.file_url)}&text=AI ile üretilmiş video!`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            <span className="text-blue-500">✈️</span> Telegram
                          </a>
                          <a
                            href={`https://api.whatsapp.com/send?text=AI ile üretilmiş video! ${encodeURIComponent(video.url || video.file_url)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            <span className="text-green-500">📱</span> WhatsApp
                          </a>
                          <a
                            href={`https://www.youtube.com/upload`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            <span className="text-red-600">▶️</span> YouTube
                          </a>
                          <a
                            href={`https://www.tiktok.com/upload`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            <span>🎵</span> TikTok
                          </a>
                          <a
                            href={`https://www.instagram.com/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            <span className="text-pink-500">📷</span> Instagram
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(video.url || video.file_url);
                              alert(t('videoGen.linkCopied', 'Link kopyalandı!'));
                            }}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm border-t border-gray-100 dark:border-gray-700"
                          >
                            <Link2 className="w-4 h-4" /> {t('videoGen.copyLink', 'Linki Kopyala')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {/* Motion Brush Modal */}
        {showMotionBrush && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
                    <Wand2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Motion Brush</h2>
                    <p className="text-xs text-gray-500">Görseli hareket ettirin</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMotionBrush(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <MotionBrushEditor
                  onGenerate={handleMotionBrush}
                  isGenerating={motionBrushLoading}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NFT Mint Modal */}
      <NFTMintModal
        isOpen={nftModalOpen}
        onClose={() => {
          setNftModalOpen(false);
          setSelectedVideoForNft(null);
        }}
        image={selectedVideoForNft}
      />
    </div>
  );
};

export default VideoPage;