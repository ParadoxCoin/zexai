import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import {
  Volume2, Music, Mic, Wand2, Download, Play, Pause,
  CheckCircle, Loader2, ArrowRight, Headphones, Radio,
  Waves, Package, FolderOpen, Star, Sparkles, X, Upload, Zap, Shield,
  Globe, Clock, Coins, Gauge
} from "lucide-react";
import PromptEnhancer from "@/components/PromptEnhancer";
import NFTMintModal from "@/components/NFTMintModal";
import { InsufficientCreditsModal } from "@/components/InsufficientCreditsModal";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from 'framer-motion';

// ─── KIE.AI TTS MODEL CATALOG ────────────────────────────────────────────────
const KIE_TTS_CATALOG = [
  {
    id: "kie_elevenlabs_turbo_25",
    name: "ElevenLabs Turbo 2.5",
    subtitle: "Hızlı İngilizce TTS",
    badge: "⚡ TURBO",
    badgeColor: "from-amber-500 to-orange-500",
    credits: 6,
    speed: "FAST",
    speedColor: "text-emerald-400",
    quality: 5,
    features: ["English Focused", "Ultra Low Latency", "Studio Grade"],
    icon: "🎙️",
    accent: "from-amber-600/20 to-orange-700/10",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/10",
  },
  {
    id: "kie_elevenlabs_multilingual_v2",
    name: "ElevenLabs Omni V2",
    subtitle: "29 Dil Desteği",
    badge: "🌍 MULTI",
    badgeColor: "from-sky-500 to-blue-600",
    credits: 12,
    speed: "MEDIUM",
    speedColor: "text-sky-400",
    quality: 5,
    features: ["29 Languages", "High Fidelity", "Emotion Control"],
    icon: "🌐",
    accent: "from-sky-600/20 to-blue-700/10",
    border: "border-sky-500/20",
    glow: "shadow-sky-500/10",
  },
  {
    id: "kie_elevenlabs_v3",
    name: "Neural Voice V3",
    subtitle: "Diyalog & Duygusal TTS",
    badge: "🗣️ OMNI",
    badgeColor: "from-purple-500 to-pink-600",
    credits: 8,
    speed: "MEDIUM",
    speedColor: "text-purple-400",
    quality: 5,
    features: ["Dialogue Mode", "Emotional Depth", "Multilingual"],
    icon: "🧠",
    accent: "from-purple-600/20 to-pink-700/10",
    border: "border-purple-500/20",
    glow: "shadow-purple-500/10",
  },
  {
    id: "kie_elevenlabs_sfx",
    name: "Sonic SFX Engine V2",
    subtitle: "Ses Efektleri Üretici",
    badge: "🔊 SFX",
    badgeColor: "from-teal-500 to-cyan-600",
    credits: 5,
    speed: "FAST",
    speedColor: "text-teal-400",
    quality: 5,
    features: ["Sound Effects", "Per-Second Billing", "Professional"],
    icon: "🎚️",
    accent: "from-teal-600/20 to-cyan-700/10",
    border: "border-teal-500/20",
    glow: "shadow-teal-500/10",
  },
];

// ─── KIE.AI MUSIC MODEL CATALOG ──────────────────────────────────────────────
const KIE_MUSIC_CATALOG = [
  {
    id: "kie_suno_v3_5",
    name: "Sonic Engine V3.5",
    subtitle: "Profesyonel Müzik Stüdyosu",
    badge: "🎵 STUDIO",
    badgeColor: "from-violet-500 to-purple-600",
    credits: 6,
    speed: "MEDIUM",
    speedColor: "text-violet-400",
    quality: 5,
    features: ["Full Song", "Instrumental", "Lyrics Support"],
    icon: "🎼",
    accent: "from-violet-600/20 to-purple-700/10",
    border: "border-violet-500/20",
    glow: "shadow-violet-500/10",
  },
  {
    id: "kie_suno_v4",
    name: "Sonic Engine V4.0",
    subtitle: "Endüstri Standardı Prodüksiyon",
    badge: "🔥 ELITE",
    badgeColor: "from-rose-500 to-pink-600",
    credits: 12,
    speed: "MEDIUM",
    speedColor: "text-rose-400",
    quality: 5,
    features: ["Next-Gen AI", "Rich Harmonics", "Commercial Rights"],
    icon: "🎸",
    accent: "from-rose-600/20 to-pink-700/10",
    border: "border-rose-500/20",
    glow: "shadow-rose-500/10",
  },
  {
    id: "kie_suno_v45",
    name: "Sonic Engine V4.5",
    subtitle: "4 Dakikaya Kadar Müzik",
    badge: "🎵 PRO STUDIO",
    badgeColor: "from-indigo-500 to-blue-600",
    credits: 20,
    speed: "MEDIUM",
    speedColor: "text-indigo-400",
    quality: 5,
    features: ["4 Min Songs", "Enhanced Vocals", "Song Structure AI"],
    icon: "🎹",
    accent: "from-indigo-600/20 to-blue-700/10",
    border: "border-indigo-500/20",
    glow: "shadow-indigo-500/10",
  },
  {
    id: "kie_suno_v45_plus",
    name: "Sonic Engine V4.5+",
    subtitle: "8 Dakikaya Kadar Epik Müzik",
    badge: "🎼 8 MIN PLUS",
    badgeColor: "from-fuchsia-500 to-purple-700",
    credits: 40,
    speed: "SLOW",
    speedColor: "text-fuchsia-400",
    quality: 5,
    features: ["8 Min Songs", "Smart Prompts", "Epic Compositions"],
    icon: "🏆",
    accent: "from-fuchsia-600/20 to-purple-800/10",
    border: "border-fuchsia-500/20",
    glow: "shadow-fuchsia-500/10",
  },
];

// Voice Characters
const voiceCharacters = [
  { id: 'emre', name: 'Emre', type: 'audio.voiceTypes.male', lang: '🇹🇷', emotion: 'audio.voiceEmotions.professional' },
  { id: 'elif', name: 'Elif', type: 'audio.voiceTypes.female', lang: '🇹🇷', emotion: 'audio.voiceEmotions.friendly' },
  { id: 'john', name: 'John', type: 'audio.voiceTypes.male', lang: '🇺🇸', emotion: 'audio.voiceEmotions.casual' },
  { id: 'sarah', name: 'Sarah', type: 'audio.voiceTypes.female', lang: '🇺🇸', emotion: 'audio.voiceEmotions.energetic' },
  { id: 'hans', name: 'Hans', type: 'audio.voiceTypes.male', lang: '🇩🇪', emotion: 'audio.voiceEmotions.formal' },
  { id: 'marie', name: 'Marie', type: 'audio.voiceTypes.female', lang: '🇫🇷', emotion: 'audio.voiceEmotions.elegant' },
];

// Music Genres
const musicGenres = [
  { id: 'electronic', name: 'Elektronik', icon: '🎹', color: 'from-cyan-500 to-blue-600' },
  { id: 'rock', name: 'Rock', icon: '🎸', color: 'from-red-500 to-orange-600' },
  { id: 'jazz', name: 'Jazz', icon: '🎷', color: 'from-amber-500 to-yellow-600' },
  { id: 'classical', name: 'Klasik', icon: '🎻', color: 'from-purple-500 to-pink-600' },
  { id: 'hiphop', name: 'Hip-Hop', icon: '🎤', color: 'from-gray-700 to-gray-900' },
  { id: 'ambient', name: 'Ambient', icon: '🌊', color: 'from-teal-500 to-emerald-600' },
];

// Pricing Packages
const pricingPackages = [
  { id: 'basic', name: 'PRO-SYNTH', price: '29', credits: '3500', features: ['High Fidelity Synthesis', 'Commercial Rights', '48kHz Sample Rate'], featured: false },
  { id: 'pro', name: 'MASTER-STUDIO', price: '99', credits: '12500', features: ['Neural Voice Cloning', 'API Access', 'Priority Rendering', 'Infinite Archival'], featured: true },
  { id: 'enterprise', name: 'NEURAL-ENTITY', price: '249', credits: '35000', features: ['Private Training', 'Dedicated Support', 'White-labeling'], featured: false },
];

const getBaseName = (name: string) => {
  let base = name.split(' (')[0].trim();
  const suffixes = ['Fast', 'Lite', 'Quality', 'Standard', 'Audio', 'Stable', 'Pro', 'Turbo', 'V2', 'V3', '3.5', '3.2'];
  suffixes.forEach(s => {
    const regex = new RegExp(`\\s+${s}$`, 'i');
    base = base.replace(regex, '');
  });
  return base.replace(/\[.*?\]/g, '').trim();
};

const getBrand = (m: any): { name: string; icon: string } => {
  const n = (m.name || "").toLowerCase();
  const p = (m.provider || "").toLowerCase();
  
  if (p.includes("kie")) return { name: "ZexAi", icon: "⚡" };
  if (n.includes("eleven") || n.includes("neural voice") || n.includes("sonic sfx")) return { name: "ElevenLabs", icon: "🎙️" };
  if (n.includes("suno")) return { name: "Suno AI", icon: "🎵" };
  if (n.includes("udio")) return { name: "Udio", icon: "📻" };
  return { name: m.provider || "Premium Audio", icon: "🎧" };
};

const AudioPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("tts");
  const [text, setText] = useState("");
  const [musicPrompt, setMusicPrompt] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedBaseModelId, setSelectedBaseModelId] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [speed, setSpeed] = useState(1.0);
  const [mood, setMood] = useState("happy");
  const [voiceName, setVoiceName] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [cloneError, setCloneError] = useState("");
  const [cloneSuccess, setCloneSuccess] = useState("");
  const [nftModalOpen, setNftModalOpen] = useState(false);
  const [selectedAudioForNft, setSelectedAudioForNft] = useState<any>(null);
  const [voiceTypeTab, setVoiceTypeTab] = useState("presets");
  const [musicMode, setMusicMode] = useState("simple"); // 'simple' or 'custom'
  const [lyrics, setLyrics] = useState("");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  
  const queryClient = useQueryClient();

  const { data: creditStats } = useQuery({
    queryKey: ['dashboardStats', 'audioPageCredits'],
    queryFn: () => apiService.get<any>('/dashboard/stats'),
    refetchInterval: 15000,
  });
  const liveCredits = Math.round((creditStats as any)?.credits_balance ?? (creditStats as any)?.data?.credits_balance ?? 0);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const { data: allModelsRes, isLoading: isLoadingModels } = useQuery({
    queryKey: ["audioModels", "all"],
    queryFn: () => apiService.get("/audio/models")
  });
  const rawModels = allModelsRes?.data || allModelsRes || [];
  const hasAnyModels = Array.isArray(rawModels) && rawModels.length > 0;

  const { data: userAudio, isLoading: isLoadingAudio } = useQuery({
    queryKey: ["userAudio"],
    queryFn: () => apiService.get("/audio/my-audio"),
    refetchInterval: 10000
  });

  const { data: clonedVoices, isLoading: isLoadingVoices, refetch: refetchVoices } = useQuery({
    queryKey: ["clonedVoices"],
    queryFn: () => apiService.get("/voice/list"),
    staleTime: 30000
  });
  const myVoices = (clonedVoices as any)?.voices || (clonedVoices as any)?.data || [];

  const { brands, variantsMap } = useMemo(() => {
    if (!Array.isArray(rawModels)) return { brands: [], variantsMap: {} };
    const filtered = rawModels.filter(m => {
       if (activeTab === 'tts') return m.type === 'text_to_speech' || m.type === 'sound_effects' || m.type === 'text_to_audio';
       if (activeTab === 'music') return m.type === 'music_generation' || m.type === 'text_to_music';
       return false;
    });

    const uniqueModelsMap = new Map();
    filtered.forEach(m => {
       const bName = m.base_name || getBaseName(m.name);
       const vName = m.version_name || "Standard";
       const key = `${bName.toLowerCase()}|${vName.toLowerCase()}`;
       const existing = uniqueModelsMap.get(key);
       if (!existing || (m.id.startsWith('kie_') && !existing.id.startsWith('kie_'))) {
          uniqueModelsMap.set(key, m);
       }
    });
    
    const baseModelsList = Array.from(uniqueModelsMap.values());
    const grouped: Record<string, any> = {};
    const localVariantsMap: Record<string, any[]> = {};

    baseModelsList.forEach(m => {
      const brandInfo = getBrand(m);
      const bName = brandInfo.name;
      const baseName = m.base_name || getBaseName(m.name);
      if (!grouped[bName]) grouped[bName] = { id: bName, name: bName, icon: brandInfo.icon, baseModels: {}, count: 0 };
      if (!grouped[bName].baseModels[baseName]) {
        grouped[bName].baseModels[baseName] = { id: m.id, baseName: baseName, brand: bName, variants: [], representative: m };
      } else {
        const current = grouped[bName].baseModels[baseName];
        if (m.id.startsWith('kie_') && !current.representative.id.startsWith('kie_')) {
          current.representative = m;
          current.id = m.id;
        }
      }
      grouped[bName].baseModels[baseName].variants.push(m);
      localVariantsMap[baseName] = grouped[bName].baseModels[baseName].variants;
    });

    const brandList = Object.values(grouped).map((b: any) => ({
      ...b,
      baseModels: Object.values(b.baseModels),
      count: Object.values(b.baseModels).length
    }));
    
    return { brands: brandList, variantsMap: localVariantsMap };
  }, [rawModels, activeTab]);

  const selectedModel = useMemo(() => rawModels.find(m => m.id === selectedModelId) || null, [rawModels, selectedModelId]);
  const selectedModelCost = useMemo(() => {
    if (activeTab === 'tts') {
      const km = KIE_TTS_CATALOG.find(m => m.id === selectedModelId);
      if (km) return km.credits;
    } else if (activeTab === 'music') {
      const km = KIE_MUSIC_CATALOG.find(m => m.id === selectedModelId);
      if (km) return km.credits;
    }
    return selectedModel?.credits || 0;
  }, [activeTab, selectedModelId, selectedModel]);
  const availableVersions = useMemo(() => {
     if (!selectedModel) return [];
     const baseName = selectedModel.base_name || getBaseName(selectedModel.name);
     return variantsMap[baseName] || [];
  }, [selectedModel, variantsMap]);

  // Auto-select first KIE model when tab changes
  useEffect(() => {
    if (activeTab === 'tts') {
      setSelectedModelId(KIE_TTS_CATALOG[0].id);
      setSelectedBaseModelId(KIE_TTS_CATALOG[0].id);
    } else if (activeTab === 'music') {
      setSelectedModelId(KIE_MUSIC_CATALOG[0].id);
      setSelectedBaseModelId(KIE_MUSIC_CATALOG[0].id);
    }
  }, [activeTab]);

  const { mutate: generateTTS, isPending: isGeneratingTTS } = useMutation({
    mutationFn: (data: any) => apiService.post("/audio/tts", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["userAudio"] }); setText(""); },
  });

  const { mutate: cloneVoice, isPending: isCloning } = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("audio", audioFile!);
      formData.append("name", voiceName);
      return apiService.upload("/voice/clone", formData);
    },
    onSuccess: () => {
      setCloneSuccess("VOICE CLONED SUCCESSFULLY");
      setVoiceName("");
      setAudioFile(null);
      refetchVoices();
      setTimeout(() => setCloneSuccess(""), 3000);
    },
    onError: () => setCloneError("CLONING FAILED")
  });

  const { mutate: generateMusic, isPending: isGeneratingMusic } = useMutation({
    mutationFn: (data: any) => apiService.post("/audio/music", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["userAudio"] }); setMusicPrompt(""); setActiveTab("library"); },
  });

  const handleTTSSubmit = () => {
    if (!text.trim() || !selectedModelId) return;
    if (liveCredits < selectedModelCost) {
      setShowCreditsModal(true);
      return;
    }
    generateTTS({ text: text.trim(), model_id: selectedModelId, voice: selectedVoice || "default", speed });
  };

  const handleMusicSubmit = () => {
    if (liveCredits < selectedModelCost) {
      setShowCreditsModal(true);
      return;
    }
    if (musicMode === 'simple') {
      if (!musicPrompt.trim() && !selectedGenre) return;
      const finalPrompt = `${selectedGenre} style, ${mood} mood, ${musicPrompt}`.trim();
      generateMusic({ prompt: finalPrompt, model_id: selectedModelId });
    } else {
      if (!lyrics.trim() || !style.trim()) return;
      const finalPrompt = `Title: ${title}\nStyle: ${style}\nLyrics: ${lyrics}`.trim();
      generateMusic({ prompt: finalPrompt, model_id: selectedModelId });
    }
  };

  const showSidebar = ["tts", "music"].includes(activeTab);

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-pink-500/30 overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative pt-12 pb-10 px-8 border-b border-white/5 bg-white/[0.01] backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 w-fit">
              <Headphones className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-pink-400">NEURAL AUDIO ENGINE</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">SONIC <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500">SYNTHESIS</span></h1>
          </div>
          <div className="flex items-center gap-6 bg-black/60 p-2.5 rounded-[2rem] border border-white/10 backdrop-blur-3xl shadow-2xl">
            <div className="flex flex-col items-end px-5">
              <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">AVAILABLE SYNTHESIS POWER</span>
              <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500 tracking-tighter italic">{liveCredits} {t('common.credits', 'Credits')}</span>
            </div>
            <button
              onClick={() => window.location.href = '/credits'}
              className="px-6 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-pink-600/30 border-t border-white/10 active:scale-95"
            >
              INITIALIZE RECHARGE
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center mb-12">
          <div className="flex bg-black/60 backdrop-blur-2xl border border-white/5 p-1.5 rounded-3xl">
            {["tts", "music", "voice", "library"].map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 relative ${activeTab === id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {activeTab === id && <motion.div layoutId="activeTabAudio" className="absolute inset-0 bg-gradient-to-r from-rose-600 to-pink-600 shadow-xl" />}
                <span className="relative z-10">{id}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {showSidebar && (
            <div className="lg:col-span-4 space-y-4">
              {/* ─── KIE.AI MODEL CATALOG HEADER ─── */}
              <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-pink-400 uppercase tracking-[0.25em]">ZEXAI POWERED</p>
                  <p className="text-[11px] font-black text-white uppercase tracking-wider">
                    {activeTab === 'tts' ? 'TTS ENGINE CATALOG' : 'MUSIC ENGINE CATALOG'}
                  </p>
                </div>
              </div>

              {/* ─── TTS MODELS ─── */}
              {activeTab === 'tts' && (
                <div className="space-y-3">
                  {KIE_TTS_CATALOG.map((model) => {
                    const isSelected = selectedModelId === model.id;
                    return (
                      <motion.button
                        key={model.id}
                        onClick={() => { setSelectedModelId(model.id); setSelectedBaseModelId(model.id); }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden shadow-xl ${
                          isSelected
                            ? `bg-gradient-to-br ${model.accent} ${model.border} shadow-lg ${model.glow}`
                            : 'bg-black/40 border-white/5 hover:border-white/10'
                        }`}
                      >
                        {/* Top: Icon + Name + Badge */}
                        <div className="p-4 pb-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl leading-none">{model.icon}</span>
                              <div>
                                <p className="text-[11px] font-black text-white uppercase tracking-wider leading-tight">{model.name}</p>
                                <p className="text-[9px] text-slate-500 font-medium mt-0.5">{model.subtitle}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                            )}
                          </div>

                          {/* Badge + Credit Strip */}
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg bg-gradient-to-r ${model.badgeColor} text-white text-[8px] font-black uppercase tracking-widest shadow-sm`}>
                              {model.badge}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Coins className="w-3 h-3 text-yellow-400" />
                              <span className="text-[13px] font-black text-yellow-300 leading-none">{model.credits}</span>
                              <span className="text-[8px] font-bold text-slate-500 uppercase">{t('common.credits', 'Credits')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Speed + Features */}
                        <div className={`px-4 py-2.5 border-t ${isSelected ? 'border-white/10 bg-white/5' : 'border-white/5 bg-black/20'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1">
                              <Gauge className="w-2.5 h-2.5 text-slate-500" />
                              <span className={`text-[8px] font-black uppercase tracking-widest ${model.speedColor}`}>{model.speed}</span>
                            </div>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-2 h-2 ${i < model.quality ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {model.features.map((f) => (
                              <span key={f} className="px-1.5 py-0.5 bg-white/5 rounded text-[7px] font-bold text-slate-400 uppercase tracking-wide">{f}</span>
                            ))}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* ─── MUSIC MODELS ─── */}
              {activeTab === 'music' && (
                <div className="space-y-3">
                  {KIE_MUSIC_CATALOG.map((model) => {
                    const isSelected = selectedModelId === model.id;
                    return (
                      <motion.button
                        key={model.id}
                        onClick={() => { setSelectedModelId(model.id); setSelectedBaseModelId(model.id); }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden shadow-xl ${
                          isSelected
                            ? `bg-gradient-to-br ${model.accent} ${model.border} shadow-lg ${model.glow}`
                            : 'bg-black/40 border-white/5 hover:border-white/10'
                        }`}
                      >
                        {/* Top: Icon + Name + Badge */}
                        <div className="p-4 pb-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl leading-none">{model.icon}</span>
                              <div>
                                <p className="text-[11px] font-black text-white uppercase tracking-wider leading-tight">{model.name}</p>
                                <p className="text-[9px] text-slate-500 font-medium mt-0.5">{model.subtitle}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                            )}
                          </div>

                          {/* Badge + Credit Strip */}
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg bg-gradient-to-r ${model.badgeColor} text-white text-[8px] font-black uppercase tracking-widest shadow-sm`}>
                              {model.badge}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Coins className="w-3 h-3 text-yellow-400" />
                              <span className="text-[13px] font-black text-yellow-300 leading-none">{model.credits}</span>
                              <span className="text-[8px] font-bold text-slate-500 uppercase">{t('common.credits', 'Credits')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Speed + Features */}
                        <div className={`px-4 py-2.5 border-t ${isSelected ? 'border-white/10 bg-white/5' : 'border-white/5 bg-black/20'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-slate-500" />
                              <span className={`text-[8px] font-black uppercase tracking-widest ${model.speedColor}`}>{model.speed}</span>
                            </div>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-2 h-2 ${i < model.quality ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {model.features.map((f) => (
                              <span key={f} className="px-1.5 py-0.5 bg-white/5 rounded text-[7px] font-bold text-slate-400 uppercase tracking-wide">{f}</span>
                            ))}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* ─── KIE.AI PROVIDER BADGE ─── */}
              <div className="flex items-center gap-2 px-4 py-3 bg-black/30 rounded-2xl border border-white/5">
                <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-3 h-3 text-black" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Powered by</p>
                  <p className="text-[10px] font-black text-white">ZexAi Neural API</p>
                </div>
                <Shield className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
              </div>
            </div>
          )}

          <div className={`space-y-6 ${showSidebar ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            {/* Selected Model Banner */}
            {showSidebar && selectedModelId && (() => {
              const catalog = activeTab === 'tts' ? KIE_TTS_CATALOG : KIE_MUSIC_CATALOG;
              const kieModel = catalog.find(m => m.id === selectedModelId);
              if (!kieModel) return null;
              return (
                <motion.div key={selectedModelId} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-gradient-to-r ${kieModel.accent} rounded-2xl p-5 border ${kieModel.border} flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{kieModel.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white uppercase tracking-widest">{kieModel.name}</span>
                        <span className={`px-2 py-0.5 rounded-lg bg-gradient-to-r ${kieModel.badgeColor} text-white text-[8px] font-black uppercase tracking-widest`}>{kieModel.badge}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{kieModel.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">UNIT COST</div>
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="text-2xl font-black text-yellow-300">{kieModel.credits}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{t('common.credits', 'Credits')}</span>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-center">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">SPEED</div>
                      <span className={`text-xs font-black uppercase ${kieModel.speedColor}`}>{kieModel.speed}</span>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-center">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">QUALITY</div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-2.5 h-2.5 ${i < kieModel.quality ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            <AnimatePresence mode="wait">
              {activeTab === "tts" && (
                <motion.div key="tts" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8 space-y-6">
                      <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-6">
                          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Wand2 className="w-3.5 h-3.5 text-pink-400" /> TEXT TO SPEECH</h2>
                          <div className="relative">
                            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="ENTER TRANSCRIPT FOR NEURAL SYNTHESIS..." rows={6} className="w-full px-5 py-5 bg-black/40 border border-white/5 rounded-2xl resize-none focus:ring-1 focus:ring-pink-500/50 text-slate-200 text-sm leading-relaxed" />
                            <div className="absolute right-3 top-3"><PromptEnhancer contentType="audio" currentPrompt={text} onSelectPrompt={(p) => setText(p)} /></div>
                          </div>
                        </div>
                        <div className="p-6 bg-black/20 border-t border-white/5">
                          <button onClick={handleTTSSubmit} disabled={isGeneratingTTS || !text || !selectedModelId} className="w-full py-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:from-slate-800 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3">
                            {isGeneratingTTS ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} {isGeneratingTTS ? 'SYNTHESIZING...' : 'INITIALIZE SYNTHESIS'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="xl:col-span-4 space-y-6">
                      {/* Integrated Voice Selector Panel */}
                      <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl flex flex-col h-[400px]">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Mic className="w-3.5 h-3.5 text-pink-400" />
                            VOICE ENGINE
                          </h3>
                        </div>
                        
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-4">
                          <button 
                            onClick={() => setVoiceTypeTab('presets')}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${voiceTypeTab === 'presets' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Presets
                          </button>
                          <button 
                            onClick={() => setVoiceTypeTab('custom')}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${voiceTypeTab === 'custom' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Custom {myVoices.length > 0 && `(${myVoices.length})`}
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-2">
                          {voiceTypeTab === 'presets' ? (
                            voiceCharacters.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => setSelectedVoice(v.id)}
                                className={`w-full p-3 rounded-xl text-left border transition-all flex items-center justify-between group
                                  ${selectedVoice === v.id
                                    ? 'bg-pink-500/20 border-pink-500/30 text-white'
                                    : 'bg-black/40 border-white/5 text-slate-400 hover:text-slate-200'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">{v.lang}</span>
                                  <div className="flex flex-col">
                                    <span className="font-black text-[10px] uppercase tracking-widest">{v.name}</span>
                                    <span className="text-[8px] font-bold opacity-50">{t(v.emotion)}</span>
                                  </div>
                                </div>
                                {selectedVoice === v.id && <CheckCircle className="w-3.5 h-3.5 text-pink-500" />}
                              </button>
                            ))
                          ) : (
                            myVoices.length > 0 ? (
                              myVoices.map((v: any) => (
                                <button
                                  key={v.id || v.voice_id}
                                  onClick={() => setSelectedVoice(v.id || v.voice_id)}
                                  className={`w-full p-3 rounded-xl text-left border transition-all flex items-center justify-between group
                                    ${selectedVoice === (v.id || v.voice_id)
                                      ? 'bg-pink-500/20 border-pink-500/30 text-white'
                                      : 'bg-black/40 border-white/5 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-[10px] font-black text-white">
                                      {v.name ? v.name.charAt(0).toUpperCase() : 'V'}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-black text-[10px] uppercase tracking-widest">{v.name}</span>
                                      <span className="text-[8px] font-bold opacity-50">CLONED VOICE</span>
                                    </div>
                                  </div>
                                  {selectedVoice === (v.id || v.voice_id) && <CheckCircle className="w-3.5 h-3.5 text-pink-500" />}
                                </button>
                              ))
                            ) : (
                              <div className="text-center py-10 opacity-30 flex flex-col items-center gap-3">
                                <Mic className="w-8 h-8" />
                                <p className="text-[9px] font-black uppercase tracking-widest">No custom voices</p>
                                <button onClick={() => setActiveTab('voice')} className="text-[8px] text-pink-400 underline font-black">CLONE NOW</button>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Version & Speed Panel */}
                      <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                SPEED / DYNAMICS:
                              </label>
                              <span className="text-pink-400 text-[10px] font-black">{speed}X</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="2"
                              step="0.1"
                              value={speed}
                              onChange={(e) => setSpeed(parseFloat(e.target.value))}
                              className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-pink-500"
                            />
                          </div>
                          
                          <div className="pt-6 border-t border-white/5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block flex items-center gap-2">
                              <Star className="w-3.5 h-3.5 text-pink-400" />
                              SYSTEM VERSION
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {availableVersions.map((v: any) => (
                                <button
                                  key={v.id}
                                  onClick={() => setSelectedModelId(v.id)}
                                  className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex flex-col items-center gap-0.5
                                    ${selectedModelId === v.id
                                      ? 'bg-pink-600 border-pink-500 text-white shadow-lg'
                                      : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                >
                                  <span>{v.version_name || 'STANDARD'}</span>
                                  <span className="text-[7px] opacity-60">{v.credits} ZEX</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "music" && (
                <motion.div key="music" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8 space-y-6">
                      <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Music className="w-3.5 h-3.5 text-purple-400" />
                              ATMOSPHERIC COMPOSITION
                            </h2>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                              <button 
                                onClick={() => setMusicMode('simple')}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${musicMode === 'simple' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}
                              >
                                Simple
                              </button>
                              <button 
                                onClick={() => setMusicMode('custom')}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${musicMode === 'custom' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}
                              >
                                Custom
                              </button>
                            </div>
                          </div>
                          
                          <AnimatePresence mode="wait">
                            {musicMode === 'simple' ? (
                              <motion.div key="simple" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <textarea 
                                  value={musicPrompt} 
                                  onChange={(e) => setMusicPrompt(e.target.value)} 
                                  placeholder="DESCRIBE SOUNDSCAPE PARAMETERS (e.g. 'Chill lo-fi beats with rain sounds')..." 
                                  rows={8} 
                                  className="w-full px-5 py-5 bg-black/40 border border-white/5 rounded-2xl resize-none focus:ring-1 focus:ring-purple-500/50 text-slate-200 text-sm leading-relaxed" 
                                />
                              </motion.div>
                            ) : (
                              <motion.div key="custom" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                <input 
                                  type="text" 
                                  value={title} 
                                  onChange={(e) => setTitle(e.target.value)} 
                                  placeholder="SONG TITLE..." 
                                  className="w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-sm text-slate-200 outline-none focus:ring-1 focus:ring-purple-500/50" 
                                />
                                <input 
                                  type="text" 
                                  value={style} 
                                  onChange={(e) => setStyle(e.target.value)} 
                                  placeholder="MUSICAL STYLE (e.g. 'Synthesized Pop, 120BPM, Female Vocals')..." 
                                  className="w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-sm text-slate-200 outline-none focus:ring-1 focus:ring-purple-500/50" 
                                />
                                <textarea 
                                  value={lyrics} 
                                  onChange={(e) => setLyrics(e.target.value)} 
                                  placeholder="ENTER LYRICS (OR USE [INSTRUMENTAL] FOR BEATS)..." 
                                  rows={5} 
                                  className="w-full px-5 py-5 bg-black/40 border border-white/5 rounded-2xl resize-none focus:ring-1 focus:ring-purple-500/50 text-slate-200 text-sm leading-relaxed" 
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="p-6 bg-black/20 border-t border-white/5">
                          <button 
                            onClick={handleMusicSubmit} 
                            disabled={isGeneratingMusic || !selectedModelId} 
                            className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3"
                          >
                            {isGeneratingMusic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />} 
                            {isGeneratingMusic ? 'COMPOSING...' : 'INITIALIZE COMPOSITION'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="xl:col-span-4 space-y-6">
                      {musicMode === 'simple' && (
                        <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Radio className="w-3.5 h-3.5 text-purple-400" /> GENRE PRESETS</h3>
                          <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto scrollbar-hide pr-1">
                            {musicGenres.map((g) => (
                              <button 
                                key={g.id} 
                                onClick={() => setSelectedGenre(g.id)} 
                                className={`p-3 rounded-xl text-left border flex flex-col gap-1 transition-all ${selectedGenre === g.id ? 'bg-purple-500/20 border-purple-500/30 text-white' : 'bg-black/40 border-white/5 text-slate-400 hover:text-slate-200'}`}
                              >
                                <span className="text-lg">{g.icon}</span>
                                <span className="font-black text-[9px] uppercase tracking-widest">{g.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">SYNTHESIS ENGINE</label>
                        <div className="grid grid-cols-1 gap-2">
                          {availableVersions.map((v: any) => (
                            <button 
                              key={v.id} 
                              onClick={() => setSelectedModelId(v.id)} 
                              className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-between ${selectedModelId === v.id ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20' : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                            >
                              <span>{v.version_name || 'STANDARD'}</span>
                              <span className="opacity-60">{v.credits} ZEX</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "voice" && (
                <motion.div key="voice" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-8 shadow-2xl">
                      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Mic className="w-3.5 h-3.5 text-pink-400" /> NEURAL VOICE CLONING</h2>
                      <div className="space-y-6">
                        <div><label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">VOICE NAME</label><input type="text" value={voiceName} onChange={(e) => setVoiceName(e.target.value)} placeholder="IDENTIFIER..." className="w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-sm text-slate-200" /></div>
                        <div onClick={() => document.getElementById('voice-upload')?.click()} className="border-2 border-dashed border-white/5 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-pink-500/30 transition-all group">
                          <input id="voice-upload" type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} className="hidden" />
                          <Upload className={`w-8 h-8 ${audioFile ? 'text-pink-500' : 'text-slate-600'}`} />
                          <span className="text-[10px] font-black text-slate-400 uppercase">{audioFile ? audioFile.name : 'UPLOAD SAMPLE'}</span>
                        </div>
                        <button onClick={() => cloneVoice()} disabled={isCloning || !audioFile || !voiceName} className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white font-black text-[10px] uppercase rounded-xl shadow-lg shadow-pink-600/20">{isCloning ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'INITIALIZE CLONING'}</button>
                      </div>
                    </div>
                    <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-8 shadow-2xl">
                      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Waves className="w-3.5 h-3.5 text-cyan-400" /> NEURAL VOICE CLUSTER</h2>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
                        {myVoices.length > 0 ? (
                          myVoices.map((v: any) => (
                            <div key={v.id || v.voice_id} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-pink-500/30 transition-all">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center font-black text-white uppercase italic">
                                  {v.name ? v.name.charAt(0) : 'V'}
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">{v.name || 'Unnamed Voice'}</p>
                                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                                    {(() => {
                                      const p = (v.provider || '').toLowerCase();
                                      if (p.includes('kie')) return 'ZexAi Premium';
                                      if (p.includes('replicate')) return 'ZexAi Neural';
                                      if (p.includes('pollo')) return 'ZexAi Creative';
                                      return v.provider || 'Neural Engine';
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button className="p-2 text-slate-500 hover:text-pink-400 transition-colors"><Play className="w-4 h-4" /></button>
                                <button 
                                  onClick={() => setSelectedVoice(v.id || v.voice_id)}
                                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${selectedVoice === (v.id || v.voice_id) ? 'bg-pink-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                >
                                  {selectedVoice === (v.id || v.voice_id) ? 'SELECTED' : 'USE VOICE'}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-20 opacity-20">
                            <Mic className="w-10 h-10 mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">NO CUSTOM VOICES DETECTED</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "library" && (
                <motion.div key="library" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                  <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-8 shadow-2xl">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5 text-amber-400" /> NEURAL ARCHIVE</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {userAudio?.outputs?.map((audio: any) => (
                        <div key={audio.id} className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden group hover:border-pink-500/30 transition-all shadow-xl shadow-black/50">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4"><span className="px-2 py-0.5 bg-white/5 rounded text-[8px] font-black text-slate-400 uppercase tracking-widest">{audio.type === 'audio_tts' ? 'SYNTHESIS' : 'COMPOSITION'}</span><span className="text-[8px] font-bold text-slate-600 uppercase">{new Date(audio.created_at).toLocaleDateString()}</span></div>
                            <p className="text-slate-300 text-xs font-medium line-clamp-2 mb-6 h-8 italic">"{audio.prompt}"</p>
                            <div className="flex items-center gap-3"><button className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-pink-600/20 hover:scale-105 transition-transform"><Play className="w-5 h-5" /></button><div className="flex-1 h-1 bg-white/5 rounded-full relative"><div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 w-1/3 rounded-full" /></div></div>
                          </div>
                          <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <button onClick={() => window.open(audio.file_url, '_blank')} className="p-2 text-slate-500 hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
                                <button onClick={() => { setSelectedAudioForNft(audio); setNftModalOpen(true); }} className="p-2 text-slate-500 hover:text-amber-400 transition-colors"><Star className="w-4 h-4" /></button>
                             </div>
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{audio.credits_cost} {t('common.credits', 'Credits')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <NFTMintModal isOpen={nftModalOpen} onClose={() => { setNftModalOpen(false); setSelectedAudioForNft(null); }} image={selectedAudioForNft} />

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        requiredCredits={selectedModelCost}
        currentCredits={liveCredits}
      />
    </div>
  );
};

export default AudioPage;
