import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api";
import {
  Video, Sparkles, Package, FolderOpen, Play, Upload,
  Star, Download, Clock, CheckCircle, Loader2, ArrowRight,
  Zap, Film, Wand2, Palette, ChevronRight, Eye, Filter,
  Scissors, Camera, Move, RotateCcw, Volume2, Maximize,
  Timer, Crown, Search, Image, RefreshCcw, X, Share2, Twitter, Facebook, Link2,
  GitCompare, Check, User, Layers
} from "lucide-react";
import PromptEnhancer from "@/components/PromptEnhancer";
import MotionBrushEditor from "@/components/video/MotionBrushEditor";
import NFTMintModal from "@/components/NFTMintModal";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from 'framer-motion';

// Provider styling
const providerStyles: Record<string, { bg: string; text: string; icon: string }> = {
  'premium': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', icon: '🔮' },
  'pollo.ai': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: '🎬' },
  'fal': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: '⚡' },
  'replicate': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: '🔄' },
};

// Video Styles
const videoStyles = [
  { id: 'cinematic', name: 'videoGen.styles.cinematic', icon: '🎬' },
  { id: 'anime', name: 'videoGen.styles.anime', icon: '🎨' },
  { id: 'realistic', name: 'videoGen.styles.realistic', icon: '📷' },
  { id: 'abstract', name: 'videoGen.styles.abstract', icon: '🌀' },
  { id: 'neon', name: 'videoGen.styles.neon', icon: '💫' },
  { id: 'vintage', name: 'videoGen.styles.vintage', icon: '📼' },
];

const getBaseName = (name: string) => {
  // 1. Strip parentheses content
  let base = name.split(' (')[0].trim();
  
  // 2. Aggressively strip common version suffixes
  const suffixes = ['Fast', 'Lite', 'Quality', 'Standard', 'Audio', 'Stable', 'Pro', 'Turbo'];
  suffixes.forEach(s => {
    const regex = new RegExp(`\\s+${s}$`, 'i');
    base = base.replace(regex, '');
  });
  
  return base.trim();
};

const VideoPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("text-to-video");

  // Content type tabs with translations
  const contentTypes = [
    { id: "text-to-video", name: t('videoGen.tabT2V', 'Metin → Video'), icon: Film, description: t('videoGen.t2vDesc', "Metinden video oluştur") },
    { id: "image-to-video", name: t('videoGen.tabI2V', 'Görsel → Video'), icon: Image, description: t('videoGen.i2vDesc', "Görseli hareketlendir") },
    { id: "compare", name: t('videoGen.tabCompare', 'Karşılaştır'), icon: GitCompare, description: t('videoGen.compareDescModels', "Modelleri karşılaştır") },
    { id: "avatar", name: t('videoGen.tabAvatar', 'Avatar'), icon: User, description: t('videoGen.avatarDesc', "Avatar oluştur") },
    { id: "effects", name: t('videoGen.tabEffects', 'Efektler'), icon: Sparkles, description: t('videoGen.effectsDesc', "Video efektleri") },
    { id: "packages", name: t('videoGen.tabPackages', 'Paketler'), icon: Package, description: t('videoGen.packagesDesc', "Efekt paketleri") },
    { id: "gallery", name: t('videoGen.tabGallery', 'Galerim'), icon: FolderOpen, description: t('videoGen.galleryDesc', "Videolarım") },
  ];

  const tabs = contentTypes.map(c => c.id);
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

  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  
  // New dynamic parameter states
  const [selectedVersionName, setSelectedVersionName] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [effectId, setEffectId] = useState("");
  const [effectCategory, setEffectCategory] = useState("all");
  const [packageId, setPackageId] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
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
    queryFn: () => apiService.get(`/video/models?t=${Date.now()}`)
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

  // Force refresh user credits on mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["userCredits"] });
  }, []);

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
      setPurchaseSuccess(t('videoGen.purchaseSuccess', { name: pkgName, credits }));
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      setTimeout(() => setPurchaseSuccess(null), 5000);
    } catch (error: any) {
      alert(error?.response?.data?.detail || t('videoGen.purchaseFailed'));
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Upload image to get URL, then apply effect
  const handleApplyEffect = async () => {
    if (!imageFile || !effectId) return;

    const selectedEffect = effects.find((e: any) => e.id === effectId);
    if (selectedEffect?.requires_two_images && !imageFile2) {
      alert(t('videoGen.twoImagesRequired'));
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
        alert(t('videoGen.imageUrlFailed'));
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
      const taskId = effectResponse?.data?.task_id || effectResponse?.task_id;
      setEffectSuccess(t('videoGen.effectApplying', { name: selectedEffect?.name, id: taskId }));
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      queryClient.invalidateQueries({ queryKey: ["myVideos"] });
      setImageFile(null);
      setImageFile2(null);
      setTimeout(() => setEffectSuccess(null), 8000);

    } catch (error: any) {
      console.error('[Effects] Full error:', error);
      console.error('[Effects] Response data:', error?.response?.data);

      // Extract error message from any possible format
      let errorMsg = t('videoGen.effectFailed');
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

      const taskId = motionRes?.data?.task_id || motionRes?.task_id;
      alert(t('videoGen.motionBrushSuccess', { id: taskId }));
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      queryClient.invalidateQueries({ queryKey: ["myVideos"] });
      setShowMotionBrush(false);

    } catch (error: any) {
      alert(error?.response?.data?.detail || t('videoGen.motionBrushFailed'));
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
        alert(t('videoGen.maxModelsWarning'));
        return prev;
      }
      return [...prev, modelId];
    });
  };

  // Handle compare generation - runs all selected models in parallel
  const handleCompare = async () => {
    if (!prompt || selectedCompareModels.length < 2) {
      alert(t('videoGen.promptAndModelsRequired'));
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

  // Advanced model grouping with brand, base, and variants
  const { brands, filteredModels, allAvailableModels, variantsMap } = useMemo(() => {
    if (!Array.isArray(rawModels)) return { brands: [], filteredModels: [], variantsMap: {} };

    // Map tab to model type
    const typeMap: Record<string, string> = {
      'text-to-video': 'text_to_video',
      'image-to-video': 'image_to_video',
      'video-to-video': 'video_to_video'
    };
    const modelType = typeMap[activeTab];

    // Initial filter by active tab type
    const rawFiltered = rawModels.map((m: any) => {
      let isSupported = true;
      const n = (m.name || "").toLowerCase();
      const mid = (m.id || "").toLowerCase();

      if (activeTab === 'image-to-video') {
         // STRICT FILTER: Only allow known KIE I2V models or models explicitly marked as I2V in DB
         const isKieI2V = mid.startsWith('kie_') && (mid.includes('i2v') || mid.includes('image-to-video'));
         const isExplicitI2V = m.type === 'image_to_video' || m.model_type === 'image_to_video';
         
         isSupported = isKieI2V || isExplicitI2V;
      } else if (activeTab === 'video-to-video') {
         isSupported = mid.startsWith('kie_') && (mid.includes('v2v') || mid.includes('video-to-video') || n.includes('runway') || n.includes('kling'));
      }
      return { ...m, isSupported };
    });

    // ── DEDUPLICATION LOGIC ──
    // If multiple models have the same base_name + version_name, prefer 'kie_' prefixed ones (our high-quality production models)
    const uniqueModelsMap = new Map();
    rawFiltered.forEach(m => {
       const bName = m.base_name || getBaseName(m.name);
       const vName = m.version_name || (m.name.includes('(') ? m.name.split('(')[1].split(')')[0] : "Standard");
       const key = `${bName.toLowerCase()}|${vName.toLowerCase()}`;
       
       const existing = uniqueModelsMap.get(key);
       if (!existing || (m.id.startsWith('kie_') && !existing.id.startsWith('kie_'))) {
          uniqueModelsMap.set(key, m);
       }
    });
    const baseModelsList = Array.from(uniqueModelsMap.values());

    const getBrand = (name: string): { name: string; icon: string } => {
      const n = name.toLowerCase();
      if (n.includes("veo")) return { name: "Google Veo", icon: "🌐" };
      if (n.includes("sora")) return { name: "OpenAI Sora", icon: "🤖" };
      if (n.includes("kling")) return { name: "Kling AI", icon: "⚔️" };
      if (n.includes("wan")) return { name: "Wan AI", icon: "🌀" };
      if (n.includes("hailuo")) return { name: "Hailuo AI", icon: "🌊" };
      if (n.includes("seedance")) return { name: "Seedance", icon: "💃" };
      if (n.includes("grok")) return { name: "Grok AI", icon: "𝕏" };
      if (n.includes("runway") || n.includes("aleph")) return { name: "Runway", icon: "🎥" };
      if (n.includes("luma")) return { name: "Luma AI", icon: "💎" };
      if (n.includes("kandinsky")) return { name: "Kandinsky", icon: "🎨" };
      return { name: name.split(' ')[0], icon: "📦" };
    };

    // Grouping structure: Brand -> Base Model -> Variants
    const grouped: Record<string, any> = {};
    const localVariantsMap: Record<string, any[]> = {};

    baseModelsList.forEach(m => {
      const brandInfo = getBrand(m.name);
      const bName = brandInfo.name;
      const baseName = m.base_name || getBaseName(m.name);

      if (!grouped[bName]) {
        grouped[bName] = { 
          id: bName, 
          name: bName, 
          icon: brandInfo.icon, 
          baseModels: {},
          count: 0 
        };
      }

      if (!grouped[bName].baseModels[baseName]) {
        grouped[bName].baseModels[baseName] = {
          id: m.id, // Representative ID
          baseName: baseName,
          brand: bName,
          variants: [],
          representative: m
        };
      }
      
      grouped[bName].baseModels[baseName].variants.push(m);
      localVariantsMap[baseName] = grouped[bName].baseModels[baseName].variants;
    });

    const brandList = Object.values(grouped).map((b: any) => ({
      ...b,
      baseModels: Object.values(b.baseModels),
      count: Object.values(b.baseModels).length
    }));

    brandList.sort((a, b) => {
      if (a.name.includes("Google")) return -1;
      if (b.name.includes("Google")) return 1;
      if (a.name.includes("OpenAI")) return -1;
      if (b.name.includes("OpenAI")) return 1;
      return b.count - a.count;
    });

    // Reset selected brand if needed
    if (selectedProvider && !grouped[selectedProvider] && !searchQuery) {
      setSelectedProvider(brandList[0]?.id || null);
    } else if (!selectedProvider && brandList.length > 0) {
      setSelectedProvider(brandList[0].id);
    }

    // Filter base models for display
    let displayBaseModels: any[] = [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      brandList.forEach(b => {
        b.baseModels.forEach((bm: any) => {
          if (bm.baseName.toLowerCase().includes(q)) displayBaseModels.push(bm);
        });
      });
    } else if (selectedProvider) {
      displayBaseModels = grouped[selectedProvider]?.baseModels ? Object.values(grouped[selectedProvider].baseModels) : [];
    }

    const allAvailableModelsList: any[] = [];
    const allGroups: Record<string, any> = {};

    baseModelsList.filter(m => m.isSupported).forEach(m => {
       const baseName = m.base_name || getBaseName(m.name);
       if (!allGroups[baseName]) {
          allGroups[baseName] = {
             id: m.id,
             baseName: baseName,
             brand: getBrand(m.name).name,
             representative: m,
             variants: [m]
          };
          allAvailableModelsList.push(allGroups[baseName]);
       } else {
          allGroups[baseName].variants.push(m);
       }
    });

    return { 
      brands: brandList, 
      filteredModels: displayBaseModels, 
      allAvailableModels: allAvailableModelsList, 
      variantsMap: localVariantsMap 
    };
  }, [rawModels, activeTab, searchQuery, selectedProvider]);

  const models = filteredModels;
  // allAvailableModels is now properly grouped from useMemo destruct
  const allAvailableModelsSorted = useMemo(() => {
    return [...allAvailableModels].sort((a, b) => (b.representative.quality || 0) - (a.representative.quality || 0));
  }, [allAvailableModels]);

  // Get selected model details
  const selectedModel = useMemo(() => {
    if (!Array.isArray(rawModels) || !modelId) return null;
    
    // 1. Try to find the exact model by ID
    const found = rawModels.find(m => m.id === modelId);
    if (found) return found;

    // 2. If not found (maybe ID changed), find any model from the same brand
    return rawModels[0] || null;
  }, [rawModels, modelId]);

  // Sync states when modelId changes
  useEffect(() => {
    if (selectedModel) {
      setSelectedVersionName(selectedModel.version_name || "Standard");
      setSelectedDuration(selectedModel.duration);
      setSelectedResolution(selectedModel.resolution);
    }
  }, [selectedModel?.id]); // Only sync when the actual model identity changes

  // 2. Deterministic Pricing Logic
  const currentPrice = useMemo(() => {
    if (!selectedModel) return 0;
    const caps = selectedModel.video_caps;
    
    if (caps && caps.pricing) {
        const d = String(selectedDuration || (caps.durations?.[0] || 5));
        const r = selectedResolution || (caps.resolutions?.[0] || "720p");
        
        const price = caps.pricing[d]?.[r] || caps.pricing[d]?.["720p"];
        if (price) return price;
    }
    
    // Fallback to legacy calculation
    const baseCredits = selectedModel.credits || 100;
    const duration = selectedDuration || 5;
    const resolution = (selectedResolution || "720p").toLowerCase();
    const multipliers = { "720p": 1.0, "1080p": 1.5, "4k": 2.5 };
    return Math.round(baseCredits * (duration/5) * (multipliers[resolution] || 1.0));
  }, [selectedModel, selectedDuration, selectedResolution]);

  // 3. Deterministic Selection Reset
  useEffect(() => {
    if (selectedModel) {
      const caps = selectedModel.video_caps;
      if (caps) {
        if (caps.durations && !caps.durations.includes(selectedDuration)) {
          setSelectedDuration(caps.durations[0]);
        }
        if (caps.resolutions && !caps.resolutions.includes(selectedResolution)) {
          setSelectedResolution(caps.resolutions[0]);
        }
      } else {
        setSelectedDuration(selectedModel.duration || 5);
        setSelectedResolution(selectedModel.resolution || "720p");
      }
    }
  }, [selectedModel?.id]);


  // Calculate total credits for selected compare models

  // Calculate total credits for selected compare models
  const totalCompareCredits = useMemo(() => {
    return selectedCompareModels.reduce((total, modelId) => {
      const model = models.find((m: any) => m.id === modelId);
      return total + (model?.credits || 0);
    }, 0);
  }, [selectedCompareModels, models]);

  // Get available variants for the current base model
  const availableVersions = useMemo(() => {
    if (!selectedModel || !variantsMap) return [];
    const baseName = selectedModel.base_name || getBaseName(selectedModel.name);
    const versions = variantsMap[baseName] || [];
    
    // De-duplicate by version_name
    const unique: Record<string, any> = {};
    versions.forEach(v => {
      const vName = v.version_name || "Standard";
      if (!unique[vName]) unique[vName] = v;
    });
    return Object.values(unique);
  }, [selectedModel, variantsMap]);

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
              reject(new Error(t('videoGen.imageSizeTooSmall', { width: img.width, height: img.height })));
            }
            resolve();
          };
          img.onerror = () => reject(new Error(t('videoGen.imageLoadFailed')));
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
          alert(t('videoGen.imageUrlFailed'));
          return;
        }

        // Validate URL is external (not local path)
        if (imageUrl.startsWith('/api/') || imageUrl.startsWith('/files/')) {
          console.error('[I2V] URL is local path, not public:', imageUrl);
          alert(t('videoGen.localPathError'));
          return;
        }
      } catch (error: any) {
        console.error('[I2V] Image upload failed:', error);
        alert(error?.message || t('videoGen.imageUploadFailed'));
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
          alert(t('videoGen.videoUrlFailed'));
          return;
        }

        // Validate URL is external (not local path)
        if (videoUrl.startsWith('/api/') || videoUrl.startsWith('/files/')) {
          console.error('[V2V] URL is local path, not public:', videoUrl);
          alert(t('videoGen.localPathError'));
          return;
        }
      } catch (error: any) {
        console.error('[V2V] Video upload failed:', error);
        alert(error?.message || t('videoGen.videoUploadFailed'));
        return;
      }
    }

    generateVideo({
      prompt: enhancedPrompt,
      model_id: modelId,
      duration: selectedDuration || selectedModel?.duration || 5,
      resolution: selectedResolution || selectedModel?.resolution || "720p",
      aspect_ratio: aspectRatio,
      image_url: imageUrl,  // Include for I2V
      video_url: videoUrl   // Include for V2V
    });
  };

  const getProviderStyle = (provider: string) => {
    return providerStyles[provider?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🎥' };
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Header - Corporate Dark Theme */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 border-b border-cyan-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent,rgba(6,182,212,0.03),transparent)]" />
        <div className="relative px-4 sm:px-6 py-4 sm:py-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-sm mb-3">
              <Video className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-300">{t('videoGen.badge', 'AI Video Stüdyosu')}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-1 text-white">
              {t('videoGen.title', 'Video ')}<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{t('videoGen.titleHighlight', 'Stüdyosu')}</span>
              <span className="ml-2 text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-bold border border-cyan-500/30">v2.6</span>
            </h1>
            <p className="text-sm text-gray-400">{t('videoGen.desc', 'Sora 2, Veo 3.1, Kling 2.6, Runway ve daha fazlası')}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="h-6 sm:h-8 w-full text-gray-50 dark:text-gray-900" preserveAspectRatio="none"><path d="M0 60V0C240 40 480 60 720 60C960 60 1200 40 1440 0V60H0Z" fill="currentColor" /></svg>
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
                    if (type.id === 'avatar') {
                      navigate('/avatar');
                      return;
                    }
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
        <AnimatePresence mode="wait">
        {(activeTab === "text-to-video" || activeTab === "image-to-video" || activeTab === "video-to-video") && (
          <motion.div
             key="video-generation"
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 20 }}
             transition={{ duration: 0.2 }}
             drag="x"
             dragConstraints={{ left: 0, right: 0 }}
             dragElastic={0.2}
             dragDirectionLock
             onDragEnd={handleDragEnd}
             className="grid grid-cols-1 lg:grid-cols-3 gap-6 touch-pan-y"
          >

            {/* Left Panel - Model Selection */}
            <div className="lg:col-span-1 h-[600px] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Search Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    {t('videoGen.modelsList', "Modeller")}
                  </h2>
                  <span className="text-xs text-gray-500">{modelsData?.length || 0} {t('videoGen.modelCount', 'model')}</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('videoGen.searchModel', 'Model ara...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Brand Sidebar */}
                {!searchQuery && (
                  <div className="w-28 sm:w-36 border-r border-gray-100 dark:border-gray-700 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/20">
                    {brands.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedProvider(b.id)}
                        className={`w-full p-3 flex flex-col items-center gap-1 transition-all border-l-4 ${
                          selectedProvider === b.id
                            ? 'bg-white dark:bg-gray-800 border-purple-500 text-purple-600 dark:text-purple-400 shadow-sm'
                            : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-xl">{b.icon}</span>
                        <span className="text-[10px] font-bold text-center uppercase tracking-tight line-clamp-1">{b.name}</span>
                        <span className="text-[9px] opacity-60 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">{b.count} {t('videoGen.versions', 'sürüm')}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Models Grid */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {isLoadingModels ? (
                    [1, 2, 3, 4].map(i => (
                      <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                    ))
                  ) : filteredModels.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">{t('videoGen.noModelInCategory', 'Model bulunamadı')}</p>
                    </div>
                  ) : (
                    filteredModels.map((model: any) => {
                      const isSupported = model.representative.isSupported !== false;
                      const isSelected = isSupported && (modelId === model.id || model.variants.some((v: any) => v.id === modelId));
                      return (
                        <div
                          key={model.id}
                          onClick={() => isSupported && setModelId(model.id)}
                          className={`relative p-3 rounded-xl transition-all border-2 ${
                            !isSupported ? 'opacity-60 grayscale cursor-not-allowed border-gray-200 dark:border-gray-800' :
                            isSelected ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 shadow-md cursor-pointer' :
                            'border-transparent bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
                            }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">
                              {model.baseName}
                            </h4>
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full">
                              {model.representative.credits}c
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                             <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md font-medium uppercase tracking-tight">
                                {model.variants.length > 1 ? `${model.variants.length} versiyon` : model.representative.version_name || 'Standard'}
                             </span>
                             <span className="text-gray-400">•</span>
                             <span className="uppercase font-bold text-cyan-500/70">{model.representative.resolution}</span>
                          </div>

                          {model.representative.badge && isSupported && (
                            <span className="mt-2 inline-block px-2 py-0.5 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold rounded border border-yellow-400/20">
                              {model.representative.badge}
                            </span>
                          )}

                          {!isSupported && (
                            <span className="mt-2 inline-block px-2 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold rounded border border-gray-300 dark:border-gray-700">
                              Yakında
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
                <div className="bg-gradient-to-r from-gray-800 via-slate-800 to-gray-800 rounded-2xl p-4 text-white border border-cyan-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-white">{selectedModel.name}</h3>
                      <p className="text-gray-400 text-sm">{selectedModel.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-cyan-400">{currentPrice}c</div>
                      <div className="text-gray-400 text-xs">{selectedDuration || selectedModel.duration}s • {selectedResolution || selectedModel.resolution}</div>
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

                {/* Dynamic Parameters Section - 3 Steps Flow */}
                {selectedModel && (
                  <div className="px-5 pb-5 space-y-6 border-t border-gray-100 dark:border-gray-700 pt-5 bg-gray-50/30 dark:bg-gray-900/10">
                    
                    {/* Step 1: Version Selection */}
                    {availableVersions.length > 1 && (
                      <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5" />
                          01. {t('videoGen.stepVersion', 'Versiyon Seçimi')}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {availableVersions.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => {
                                setSelectedVersionName(v.version_name);
                                setModelId(v.id);
                              }}
                              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                                (selectedVersionName || selectedModel.version_name) === v.version_name
                                  ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/20'
                                  : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-purple-300'
                              }`}
                            >
                              {v.version_name || "Standard"}
                              {v.badge && <span className="ml-2 text-[8px] opacity-70 px-1.5 py-0.5 bg-white/20 rounded uppercase">{v.badge.split(' ')[0]}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 2 & 3: Duration & Quality */}
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Duration */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Timer className="w-4 h-4" />
                            02. {t('videoGen.stepDuration', 'Süre')}
                          </h3>
                          <span className="text-xs font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800">
                            {selectedDuration || selectedModel.duration}s
                          </span>
                        </div>

                        {selectedModel.slider_duration ? (
                          <div className="px-2 pt-4 pb-2">
                            <input
                              type="range"
                              min="1"
                              max="15"
                              step="1"
                              value={selectedDuration || selectedModel.duration}
                              onChange={(e) => setSelectedDuration(parseInt(e.target.value))}
                              className="w-full h-2 bg-indigo-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between mt-3 text-[10px] text-gray-400 font-bold">
                              <span>1s</span>
                              <span>5s</span>
                              <span>10s</span>
                              <span>15s</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const caps = selectedModel.video_caps || {};
                              let durations = caps.durations || selectedModel.durations || [selectedModel.duration || 5];
                              
                              // FAIL-SAFE: If backend only sends [5] but we know the model supports more
                              if (durations.length === 1 && durations[0] === 5) {
                                const n = selectedModel.name.toLowerCase();
                                if (n.includes('veo')) durations = [4, 6, 8];
                                else if (n.includes('kling')) durations = [5, 10, 15];
                                else if (n.includes('wan')) durations = [5, 10, 15];
                                else if (n.includes('sora')) durations = [10, 15];
                              }
                              
                              return durations.map((d: number) => (
                                <button
                                  key={d}
                                  onClick={() => setSelectedDuration(d)}
                                  className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all border-2 flex-none ${
                                    (selectedDuration || selectedModel.duration) === d
                                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/30 scale-105'
                                      : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700 hover:border-indigo-300'
                                  }`}
                                >
                                  {d}s
                                </button>
                              ));
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Quality */}
                      <div className="flex-1 space-y-4">
                        <h3 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Maximize className="w-4 h-4" />
                          03. {t('videoGen.stepQuality', 'Kalite')}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const caps = selectedModel.video_caps || {};
                            const resolutions = caps.resolutions || selectedModel.resolutions || ["720p", "1080p", "4K"];
                            
                            return resolutions.map((r: string) => {
                              const isAvailable = resolutions.includes(r);
                              return (
                                <button
                                  key={r}
                                  disabled={!isAvailable}
                                  onClick={() => setSelectedResolution(r)}
                                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${
                                    selectedResolution === r
                                      ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30 scale-105'
                                      : isAvailable
                                      ? 'bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700 hover:border-blue-300'
                                      : 'bg-gray-50 dark:bg-gray-900 text-gray-300 border-gray-100 dark:border-gray-800 cursor-not-allowed'
                                  }`}
                                >
                                  {r}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Aspect Ratio (Global) */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Move className="w-3.5 h-3.5" />
                        {t('videoGen.stepAspect', 'En-Boy Oranı')}
                      </h3>
                      <div className="flex gap-2">
                        {[
                          { id: '16:9', label: t('common.horizontal'), icon: '🖥️' },
                          { id: '9:16', label: t('common.vertical'), icon: '📱' },
                          { id: '1:1', label: t('common.square'), icon: '⬜' }
                        ].map((ratio) => (
                          <button
                            key={ratio.id}
                            onClick={() => setAspectRatio(ratio.id)}
                            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1 ${
                              aspectRatio === ratio.id
                                ? 'bg-white dark:bg-gray-800 border-2 border-purple-500 text-purple-600 dark:text-purple-400 shadow-lg'
                                : 'bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-purple-300'
                            }`}
                          >
                            <span className="text-lg">{ratio.icon}</span>
                            <span className="text-[10px] uppercase">{ratio.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <div className="p-5 bg-gray-50 dark:bg-gray-900/50 flex gap-3">
                  {selectedModel && (
                    <button
                      onClick={() => setModelId("")}
                      className="px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
                      title={t('common.reset', 'Sıfırla')}
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt || !modelId ||
                      (activeTab === "image-to-video" && !imageFile) ||
                      (activeTab === "video-to-video" && !videoFile)
                    }
                    className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />{t('videoGen.generating', 'Video Oluşturuluyor...')}</>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        {activeTab === "text-to-video" && t('videoGen.generateBtnT2V', "Video Oluştur")}
                        {activeTab === "image-to-video" && t('videoGen.generateBtnI2V', "Görseli Hareketlendir")}
                        {activeTab === "video-to-video" && t('videoGen.generateBtnV2V', "Videoyu Dönüştür")}
                        {selectedModel && ` (${currentPrice}c)`}
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
          </motion.div>
        )}

        {/* Compare Tab */}
        {activeTab === "compare" && (
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
             className="grid grid-cols-1 lg:grid-cols-3 gap-6 touch-pan-y"
          >

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
                  ) : allAvailableModelsSorted.map((model: any) => (
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
                               {model.baseName}
                            </div>
                            <div className="text-[10px] text-gray-500">{model.brand}</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-purple-600">
                          {model.representative.credits}c
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
          </motion.div>
        )}

        {/* Effects Tab */}
        {activeTab === "effects" && (
          <motion.div
             key="effects"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             transition={{ duration: 0.2 }}
             drag="x"
             dragConstraints={{ left: 0, right: 0 }}
             dragElastic={0.2}
             dragDirectionLock
             onDragEnd={handleDragEnd}
             className="grid grid-cols-1 lg:grid-cols-3 gap-6 touch-pan-y"
          >

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
                  className="w-full mb-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-xl flex items-center j                {/* Effect List */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {isLoadingEffects ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                    ))
                  ) : filteredEffects.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      {t('videoGen.effectsNoCat', 'Bu kategoride efekt yok')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredEffects.map((effect: any) => {
                        const isSelected = effectId === effect.id;
                        return (
                          <div
                            key={effect.id}
                            onClick={() => setEffectId(effect.id)}
                            className={`relative group p-3 rounded-2xl cursor-pointer transition-all border-2 flex flex-col items-center text-center gap-2 ${isSelected
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md ring-2 ring-purple-500/20'
                              : 'border-transparent bg-gray-50 dark:bg-gray-900 hover:border-purple-300 dark:hover:border-purple-700'
                              }`}
                          >
                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                              {effect.icon || '✨'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-gray-900 dark:text-white text-[11px] leading-tight line-clamp-1">
                                {effect.name}
                              </h4>
                              <div className="mt-1 flex items-center justify-center gap-1">
                                <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-[9px] font-bold rounded-md">
                                  {effect.credits}c
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                                <CheckCircle className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* Right Panel - Apply Effect */}
            <div className="lg:col-span-2 space-y-4">
              {/* Selected Effect Info & Example */}
              {effectId ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-xl shadow-purple-500/10 border border-white/10 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-8 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                       <div className="relative">
                          <span className="text-5xl mb-4 block">{effects.find((e: any) => e.id === effectId)?.icon || '✨'}</span>
                          <h3 className="font-black text-2xl tracking-tight mb-2">{effects.find((e: any) => e.id === effectId)?.name}</h3>
                          <p className="text-purple-200/80 text-sm font-medium leading-relaxed mb-6">{effects.find((e: any) => e.id === effectId)?.description}</p>
                          <div className="flex items-center gap-2">
                             <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                <span className="font-bold text-lg">{effects.find((e: any) => e.id === effectId)?.credits}c</span>
                             </div>
                             {effects.find((e: any) => e.id === effectId)?.requires_two_images && (
                                <div className="px-4 py-2 bg-orange-500/20 backdrop-blur-md rounded-2xl border border-orange-500/30 text-orange-400 font-bold text-xs uppercase tracking-wider">
                                   2 Image Required
                                </div>
                             )}
                          </div>
                       </div>
                    </div>

                    <div className="bg-black rounded-3xl overflow-hidden shadow-2xl relative group">
                       <div className="absolute top-4 left-4 z-10">
                          <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold rounded-full border border-white/20 uppercase tracking-widest">
                             Example Preview
                          </span>
                       </div>
                       <video 
                          src={effects.find((e: any) => e.id === effectId)?.example_url || "https://cdn.example.com/default-effect.mp4"}
                          autoPlay 
                          loop 
                          muted 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                       />
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
          </motion.div>
        )}

        {/* Packages Tab */}
        {activeTab === "packages" && (
          <motion.div
             key="packages"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             transition={{ duration: 0.2 }}
             drag="x"
             dragConstraints={{ left: 0, right: 0 }}
             dragElastic={0.2}
             dragDirectionLock
             onDragEnd={handleDragEnd}
             className="grid grid-cols-1 lg:grid-cols-3 gap-6 touch-pan-y"
          >

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
          </motion.div>
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
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
             className="space-y-6 touch-pan-y"
          >
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
          </motion.div>
        )}
        </AnimatePresence>
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