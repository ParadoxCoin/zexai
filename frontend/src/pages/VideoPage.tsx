import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api";
import {
  Video, Sparkles, Package, FolderOpen, Play, Upload,
  Star, Download, Clock, CheckCircle, Loader2, ArrowRight,
  Zap, Film, Wand2, Eye,
  Camera, Move, RotateCcw, Volume2, Maximize,
  Timer, Crown, Search, Image, X, RefreshCw,
  GitCompare, User, Layers, Check, Link2, Layout
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

  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
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
    // Redirect to billing/pricing page for purchase
    navigate('/billing');
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
    <div className="min-h-screen bg-[#030712] text-white selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
      </div>

      {/* Hero Header */}
      <div className="relative pt-8 pb-4 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-white/[0.01] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 w-fit">
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-300">
                {t('videoGen.badge', 'AI VIDEO COMMAND CENTER')}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase italic">
              {t('videoGen.title', 'Video ')}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
                {t('videoGen.highlight', 'Sentezleyici')}
              </span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl font-medium uppercase tracking-wider opacity-80">
              {t('videoGen.subtitle', 'Üst düzey yapay zeka modelleri ile metin ve görsellerinizi sinematik videolara dönüştürün.')}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
            <div className="flex flex-col items-end px-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">System Credits</span>
              <span className="text-sm font-black text-cyan-400">AVAILABLE</span>
            </div>
            <button
              onClick={() => navigate('/billing')}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20"
            >
              Top Up
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-10 bg-black/20 p-2 rounded-3xl border border-white/5 backdrop-blur-md w-fit">
            {contentTypes.map((type) => {
                const Icon = type.icon;
                const isActive = activeTab === type.id;
                return (
                    <button
                        key={type.id}
                        onClick={() => {
                            if (type.id === 'avatar') {
                                navigate('/avatar');
                                return;
                            }
                            setActiveTab(type.id);
                        }}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${isActive
                                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/20 scale-105'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        {type.name}
                    </button>
                );
            })}
        </div>

        {/* Text to Video / Image to Video / Video to Video Tabs */}
        <AnimatePresence mode="wait">
        {(activeTab === "text-to-video" || activeTab === "image-to-video" || activeTab === "video-to-video") && (
          <motion.div
             key="video-generation"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             transition={{ duration: 0.2 }}
             drag="x"
             dragConstraints={{ left: 0, right: 0 }}
             dragElastic={0.2}
             dragDirectionLock
             onDragEnd={handleDragEnd}
             className="grid grid-cols-1 lg:grid-cols-3 gap-6 touch-pan-y"
          >

            {/* Left Panel - Model Selection */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-cyan-400" />
                    01. {t('videoGen.modelsTitle', 'ENGINE REGISTRY')}
                  </h2>
                  <span className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest">{modelsData?.length || 0} UNITS</span>
                </div>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="text"
                    placeholder={t('videoGen.searchModel', 'SEARCH ENGINE...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-300 focus:ring-1 focus:ring-cyan-500/50 outline-none placeholder:text-slate-700 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Brand Sidebar */}
                {!searchQuery && (
                  <div className="w-28 sm:w-32 border-r border-white/5 overflow-y-auto bg-black/20 rounded-3xl">
                    {brands.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedProvider(b.id)}
                        className={`w-full p-4 flex flex-col items-center gap-2 transition-all relative group ${
                          selectedProvider === b.id
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        {selectedProvider === b.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                        )}
                        <span className="text-xl group-hover:scale-110 transition-transform">{b.icon}</span>
                        <span className="text-[9px] font-black text-center uppercase tracking-tighter line-clamp-1">{b.name}</span>
                        <span className="text-[8px] font-black opacity-40 px-1.5 py-0.5 bg-white/5 rounded-full">{b.count} VAR</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Models Grid */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                  {isLoadingModels ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
                    ))
                  ) : filteredModels.length === 0 ? (
                    <div className="text-center py-12 opacity-40">
                      <p className="text-[10px] font-black uppercase tracking-widest">{t('videoGen.noModelInCategory', 'NO ENGINES FOUND')}</p>
                    </div>
                  ) : (
                    filteredModels.map((model: any) => {
                      const isSupported = model.representative.isSupported !== false;
                      const isSelected = isSupported && (modelId === model.id || model.variants.some((v: any) => v.id === modelId));
                      return (
                        <div
                          key={model.id}
                          onClick={() => isSupported && setModelId(model.id)}
                          className={`relative p-4 rounded-2xl transition-all border-2 group cursor-pointer overflow-hidden ${
                            !isSupported ? 'opacity-30 grayscale cursor-not-allowed border-white/5' :
                            isSelected ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.1)]' :
                            'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                            }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className={`text-[10px] font-black uppercase tracking-widest line-clamp-1 transition-colors ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                              {model.baseName}
                            </h4>
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                              {model.representative.credits} ZEX
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-black/40 rounded border border-white/5">
                                {model.variants.length > 1 ? `${model.variants.length} VER` : model.representative.version_name || 'STD'}
                             </span>
                             <span className="text-[9px] font-black text-cyan-500/60 uppercase tracking-widest">{model.representative.resolution}</span>
                          </div>

                          {model.representative.badge && isSupported && (
                            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                              <Zap className="w-2.5 h-2.5" />
                              {model.representative.badge}
                            </div>
                          )}

                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/40">
                              <Check className="w-3 h-3 text-white" />
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
            <div className="lg:col-span-2 space-y-6">

              {/* Selected Model Info */}
              {selectedModel && (
                <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 border border-white/5 relative overflow-hidden group shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{selectedModel.name}</h3>
                        <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                          {selectedModel.provider || 'AI ENGINE'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider opacity-60 line-clamp-1">{selectedModel.description}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">TOTAL COST</div>
                        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 leading-none">{currentPrice} ZEX</div>
                      </div>
                      <div className="h-10 w-px bg-white/5" />
                      <div className="text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">DYNAMICS</div>
                        <div className="text-xs font-black text-white uppercase tracking-widest">{selectedDuration || selectedModel.duration}S / {selectedResolution || selectedModel.resolution}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Section - Changes based on content type */}
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl">

                {/* Image Upload for Image-to-Video */}
                {activeTab === "image-to-video" && (
                  <div className="p-6 border-b border-white/5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Image className="w-3.5 h-3.5 text-blue-400" />
                      02. {t('videoGen.startImage', 'INITIAL SOURCE IMAGE')}
                    </h3>
                    <div
                      onClick={() => imageInputRef.current?.click()}
                      className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center overflow-hidden
                        ${imagePreview ? 'border-cyan-500 bg-cyan-500/5' : 'border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5'}`}
                    >
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white text-[10px] font-black tracking-widest border border-white/20">
                              <RefreshCw className="w-3 h-3" /> {t('videoGen.changeImage', 'REPLACE')}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform border border-cyan-500/20">
                            <Upload className="w-6 h-6 text-cyan-400" />
                          </div>
                          <p className="text-white font-black text-[10px] uppercase tracking-widest">{t('videoGen.uploadImage', 'UPLOAD SOURCE')}</p>
                          <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-tighter">{t('videoGen.uploadImageDesc', 'JPG, PNG OR WEBP')}</p>
                        </div>
                      )}
                      <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                    </div>
                  </div>
                )}

                {/* Video Upload for Video-to-Video */}
                {activeTab === "video-to-video" && (
                  <div className="p-6 border-b border-white/5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Film className="w-3.5 h-3.5 text-purple-400" />
                      02. {t('videoGen.startVideo', 'INITIAL SOURCE VIDEO')}
                    </h3>
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center overflow-hidden
                        ${videoFile ? 'border-purple-500 bg-purple-500/5' : 'border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5'}`}
                    >
                      <input
                        type="file"
                        ref={videoInputRef}
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      />
                      {videoFile ? (
                        <div className="flex flex-col items-center">
                          <Check className="w-10 h-10 text-purple-500 mb-2" />
                          <p className="text-white font-black text-[10px] uppercase tracking-widest">{videoFile.name}</p>
                          <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest">{t('videoGen.uploadChangeImage', 'CLICK TO REPLACE')}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform border border-purple-500/20">
                            <Upload className="w-6 h-6 text-purple-400" />
                          </div>
                          <p className="text-white font-black text-[10px] uppercase tracking-widest">{t('videoGen.uploadVideo', 'UPLOAD SOURCE')}</p>
                          <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-tighter">MP4, MOV, WEBM</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Parameters Section */}
                {selectedModel && (
                  <div className="bg-black/20 p-8 space-y-10">
                    {/* Generation Parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Model Version & Duration */}
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Crown className="w-3.5 h-3.5 text-cyan-400" />
                            SYSTEM VERSION
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(selectedModel.variants || []).map((v: any) => (
                              <button
                                key={v.id}
                                onClick={() => setModelId(v.id)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                                  ${modelId === v.id
                                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                                    : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                              >
                                {v.version_name || 'STANDARD'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            TEMPORAL DURATION
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(selectedModel.video_caps?.durations || selectedModel.durations || [5, 10, 15]).map((d: number) => (
                              <button
                                key={d}
                                onClick={() => setSelectedDuration(d)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                                  ${selectedDuration === d
                                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                                    : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                              >
                                {d} SECONDS
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Resolution & Aspect */}
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Maximize className="w-3.5 h-3.5 text-purple-400" />
                            PRODUCTION FIDELITY
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(selectedModel.video_caps?.resolutions || selectedModel.resolutions || ["720p", "1080p", "4K"]).map((r: string) => (
                              <button
                                key={r}
                                onClick={() => setSelectedResolution(r)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                                  ${selectedResolution === r
                                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                                    : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Layout className="w-3.5 h-3.5 text-indigo-400" />
                            ASPECT RATIO
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {["16:9", "9:16", "1:1", "21:9"].map((a) => (
                              <button
                                key={a}
                                onClick={() => setAspectRatio(a)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                                  ${aspectRatio === a
                                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                                    : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prompt Section */}
                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          SYNTHESIS COMMAND (PROMPT)
                        </label>
                        <PromptEnhancer onEnhanced={(newPrompt) => setPrompt(newPrompt)} contentType="video" currentPrompt={prompt} />
                      </div>
                      <div className="relative group">
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={t('videoGen.promptPlaceholder', 'Enter synthesis instructions...')}
                          className="w-full h-40 p-6 bg-black/40 border border-white/5 rounded-3xl text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none text-sm leading-relaxed"
                        />
                      </div>
                    </div>

                    {/* Generate Button */}
                    <div className="pt-6 border-t border-white/5 flex gap-4">
                      <button
                        onClick={() => {
                          setPrompt("");
                          setImageFile(null);
                          setVideoFile(null);
                          setImagePreview("");
                        }}
                        className="px-6 bg-white/5 border border-white/5 text-slate-500 rounded-2xl hover:text-white transition-all"
                        title="RESET"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt || !modelId ||
                          (activeTab === "image-to-video" && !imageFile) ||
                          (activeTab === "video-to-video" && !videoFile)
                        }
                        className="flex-1 py-5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xs rounded-2xl shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] border-t border-white/10"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('videoGen.generating', 'INITIALIZING SYNTHESIS...')}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {activeTab === "text-to-video" && t('videoGen.generateBtnT2V', "EXECUTE PRODUCTION")}
                            {activeTab === "image-to-video" && t('videoGen.generateBtnI2V', "ANIMATE SOURCE")}
                            {activeTab === "video-to-video" && t('videoGen.generateBtnV2V', "TRANSFORM SIGNAL")}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
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
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <GitCompare className="w-3.5 h-3.5 text-orange-400" />
                    {t('videoGen.compareTitle', 'ENGINE DIAGNOSTICS')}
                  </h2>
                  <span className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest">
                    {selectedCompareModels.length}/4 ACTIVE
                  </span>
                </div>

                {/* Model Grid */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-hide">
                  {isLoadingModels ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                    ))
                  ) : allAvailableModelsSorted.map((model: any) => (
                    <button
                      key={model.id}
                      onClick={() => toggleCompareModel(model.id)}
                      className={`w-full p-4 rounded-2xl border transition-all text-left relative overflow-hidden group ${selectedCompareModels.includes(model.id)
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-white/5 bg-white/5 hover:bg-white/10'
                        }`}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedCompareModels.includes(model.id)
                            ? 'bg-orange-500 shadow-lg shadow-orange-500/20'
                            : 'bg-black/40'
                            }`}>
                            {selectedCompareModels.includes(model.id) ? (
                              <Check className="w-4 h-4 text-white" />
                            ) : (
                              <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity">{model.representative.icon || '🎬'}</span>
                            )}
                          </div>
                          <div>
                            <div className={`text-[11px] font-black uppercase tracking-widest transition-colors ${selectedCompareModels.includes(model.id) ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                               {model.baseName}
                            </div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{model.brand}</div>
                          </div>
                        </div>
                        <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                          {model.representative.credits} ZEX
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Total Credits */}
                {selectedCompareModels.length > 0 && (
                  <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                        {selectedCompareModels.length} NODES SELECTED
                      </span>
                      <span className="text-sm font-black text-white">
                        {totalCompareCredits} ZEX
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
                    { id: 'all', name: 'Tümü', icon: '✨' },
                    { id: 'viral', name: 'Viral', icon: '🔥' },
                    { id: 'magic', name: 'Sihir', icon: '🪄' },
                    { id: 'cinematic', name: 'Sinematik', icon: '🎥' },
                    { id: 'artistic', name: 'Sanatsal', icon: '🎨' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setEffectCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${effectCategory === cat.id
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:border-purple-300'
                        }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
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
                            <span className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-tighter line-clamp-1">{effect.name}</span>
                            
                            <div className="absolute top-1.5 left-1.5">
                               <span className="text-[8px] bg-purple-600 text-white px-1 py-0.5 rounded-full font-bold">SOON</span>
                            </div>

                            {effect.requires_two_images && (
                              <div className="absolute top-1.5 right-1.5">
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="2 Görsel Gerekli" />
                              </div>
                            )}
                            
                            {isSelected && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
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
                                   2 Images Required
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
                    {/* Apply Button - Coming Soon State */}
                    <div className="relative group/btn">
                      <button
                        onClick={handleApplyEffect}
                        disabled={true}
                        className="w-full py-4 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-semibold rounded-xl shadow-none cursor-not-allowed transition-all flex items-center justify-center gap-2 overflow-hidden relative"
                      >
                        <Sparkles className="w-5 h-5 opacity-50" />
                        <span>{t('common.comingSoon', 'Çok Yakında')}</span>
                        
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                      </button>
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 animate-bounce">
                        COMING SOON
                      </div>
                    </div>

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
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
                                  {pkg.name}
                                </h4>
                                <span className="text-[8px] bg-purple-600 text-white px-1 py-0.5 rounded-full font-bold">SOON</span>
                              </div>
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
                  {(() => {
                    const selectedPkg = packages.find((p: any) => p.id === packageId);
                    if (!selectedPkg) return null;

                    return (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-purple-500/20">
                          <div className="absolute top-0 right-0 px-4 py-2 bg-yellow-400 text-yellow-900 font-bold text-sm rounded-bl-xl shadow-lg">
                            {selectedPkg.discount_percent || 20}% İNDİRİM
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-5xl drop-shadow-lg">{selectedPkg.icon || '📦'}</span>
                            <div className="flex-1">
                              <h3 className="font-bold text-2xl drop-shadow-sm">{selectedPkg.name}</h3>
                              <p className="text-purple-100 mt-1 text-sm">{selectedPkg.description}</p>
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
                          {/* Buy Button - Coming Soon State */}
                          <div className="relative group/btn">
                            <button
                              onClick={() => {}}
                              disabled={true}
                              className="w-full py-4 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-semibold rounded-xl shadow-none cursor-not-allowed transition-all flex items-center justify-center gap-2 overflow-hidden relative"
                            >
                              <Package className="w-5 h-5 opacity-50" />
                              <span>{t('common.comingSoon', 'Çok Yakında')}</span>
                              
                              {/* Shimmer Effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                            </button>
                            <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 animate-bounce">
                              COMING SOON
                            </div>
                          </div>

                          {purchaseSuccess && (
                            <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl flex items-center gap-2">
                              <CheckCircle className="w-5 h-5" />
                              {purchaseSuccess}
                            </div>
                          )}
                        </div>
                      </div>
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
             className="space-y-8 touch-pan-y"
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase italic tracking-tighter">
                <FolderOpen className="w-6 h-6 text-emerald-400" />
                {t('videoGen.galleryTitle', 'Görsel Arşivim')}
              </h2>
              <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.2em]">
                DATABASE: {myVideos.length} {t('videoGen.imagesCount', 'ASSETS')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isLoadingMyVideos ? (
                [1, 2, 3, 4].map(i => <div key={i} className="aspect-video bg-white/5 rounded-2xl animate-pulse border border-white/5" />)
              ) : !Array.isArray(myVideos) || myVideos.length === 0 ? (
                <div className="col-span-full text-center py-24 bg-black/20 rounded-3xl border border-white/5 backdrop-blur-xl">
                  <Video className="w-16 h-16 text-slate-700 mx-auto mb-4 opacity-20" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('videoGen.galleryNoVideos', 'NO ARCHIVES DETECTED')}</p>
                </div>
              ) : (
                myVideos.map((video: any) => (
                  <div key={video.id} className="group relative bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all shadow-2xl">
                    <div className="aspect-video bg-black relative overflow-hidden">
                      {video.url || video.file_url ? (
                        <video src={video.url || video.file_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/40">
                          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest animate-pulse">PROCESSING</span>
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3 z-10">
                        <div className={`px-2 py-1 rounded font-black text-[8px] uppercase tracking-widest shadow-lg ${
                          video.status === 'completed' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 
                          video.status === 'processing' ? 'bg-orange-600 text-white animate-pulse' : 
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {video.status === 'completed' ? 'SYNCED' : video.status === 'processing' ? 'WORKING' : 'PENDING'}
                        </div>
                      </div>

                      {/* Play Hover Overlay */}
                      {video.status === 'completed' && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 scale-150 group-hover:scale-100 transition-all duration-500">
                            <Play className="w-5 h-5 text-white fill-white ml-1" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      {video.is_nft_minted && (
                        <div className="flex items-center gap-1.5 mb-3 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded w-fit">
                          <CheckCircle className="w-3 h-3 text-purple-400" />
                          <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">
                            NFT MINTED
                          </span>
                        </div>
                      )}
                      <p className="text-[11px] font-medium text-slate-200 line-clamp-2 mb-4 leading-relaxed italic opacity-80 group-hover:opacity-100 transition-opacity">
                        "{video.prompt || 'Synthesized Video Archive'}"
                      </p>
                      <div className="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">
                        <span className="text-emerald-500/60">{video.model_name || video.model}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {video.created_at && new Date(video.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {video.status === 'completed' && (video.url || video.file_url) && (
                        <div className="flex items-center gap-2 pt-4 border-t border-white/5 flex-wrap">
                          {!video.is_nft_minted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVideoForNft(video);
                                setNftModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
                            >
                              <Sparkles className="w-3 h-3 inline mr-1" />
                              MINT NFT
                            </button>
                          )}

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
                            className="p-2 bg-white/5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5"
                            title="DOWNLOAD"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Share to Earn - Twitter */}
                          <button
                            onClick={(e) => {
                              window.open(`https://twitter.com/intent/tweet?text=ZexAI ile ürettiğim muhteşem videoya göz atın! 🚀&url=${encodeURIComponent(video.url || video.file_url)}`, '_blank');
                              apiService.post('/social/share', { content_type: 'video', content_id: video.id, platform: 'twitter' })
                                .then((response) => {
                                  const data = response?.data || response;
                                  if (data?.reward_granted) {
                                    queryClient.invalidateQueries({ queryKey: ["userCredits"] });
                                    alert('🎉 Harika! X (Twitter) paylaşımınız için hesabınıza 5 AI Kredisi eklendi!');
                                  }
                                })
                                .catch((err) => { console.log('Reward already claimed or error', err); });
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all"
                            title="X (TWITTER) SHARE"
                          >
                            <span className="text-white">𝕏</span>
                            <span className="text-cyan-400">+5 ZEX</span>
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
                                .catch((err) => { console.log('Reward already claimed or error', err); });
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-blue-500/10 hover:border-blue-500/30 transition-all"
                            title="FACEBOOK SHARE"
                          >
                            <span className="text-blue-500 font-bold">f</span>
                            <span className="text-blue-400">+15 ZEX</span>
                          </button>
                          <div className="flex items-center gap-3 ml-auto">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(video.url || video.file_url);
                                alert(t('videoGen.linkCopied', 'Link kopyalandı!'));
                              }}
                              className="p-2 bg-white/5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5"
                              title="COPY LINK"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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