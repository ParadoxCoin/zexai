import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import {
  Volume2, Music, Mic, Wand2, Download, Play, Pause,
  CheckCircle, Loader2, ArrowRight, Headphones, Radio,
  Waves, Package, FolderOpen, Star, Sparkles, X
} from "lucide-react";
import PromptEnhancer from "@/components/PromptEnhancer";
import NFTMintModal from "@/components/NFTMintModal";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from 'framer-motion';

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

// Audio Packages
const audioPakages = [
  { id: 'podcast', name: 'audio.packageList.podcast.name', desc: 'audio.packageList.podcast.desc', discount: 25, original: 200, price: 150, icon: '🎙️' },
  { id: 'game', name: 'audio.packageList.game.name', desc: 'audio.packageList.game.desc', discount: 30, original: 300, price: 210, icon: '🎮' },
  { id: 'ads', name: 'audio.packageList.ads.name', desc: 'audio.packageList.ads.desc', discount: 20, original: 180, price: 144, icon: '📺' },
];

const AudioPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("tts");

  const tabIds = ["tts", "music", "voice", "library"];
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      const currentIndex = tabIds.indexOf(activeTab);
      if (currentIndex < tabIds.length - 1) setActiveTab(tabIds[currentIndex + 1]);
    } else if (info.offset.x > swipeThreshold) {
      const currentIndex = tabIds.indexOf(activeTab);
      if (currentIndex > 0) setActiveTab(tabIds[currentIndex - 1]);
    }
  };

  const [text, setText] = useState("");
  const [musicPrompt, setMusicPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [speed, setSpeed] = useState(1.0);
  const [mood, setMood] = useState("happy");
  const queryClient = useQueryClient();

  // Voice Clone States
  const [voiceName, setVoiceName] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [cloneError, setCloneError] = useState("");
  const [cloneSuccess, setCloneSuccess] = useState("");

  // NFT State
  const [nftModalOpen, setNftModalOpen] = useState(false);
  const [selectedAudioForNft, setSelectedAudioForNft] = useState<any>(null);

  const { data: ttsModels, isLoading: isLoadingTTS } = useQuery({
    queryKey: ["audioModels", "tts"],
    queryFn: () => apiService.get("/audio/models/tts")
  });

  const { data: userAudio, isLoading: isLoadingAudio } = useQuery({
    queryKey: ["userAudio"],
    queryFn: () => apiService.get("/audio/my-audio"),
    refetchInterval: 10000
  });

  // Voice Clone - Get user's cloned voices
  const { data: clonedVoices, isLoading: isLoadingVoices, refetch: refetchVoices } = useQuery({
    queryKey: ["clonedVoices"],
    queryFn: () => apiService.get("/voice/list"),
    staleTime: 30000
  });

  const { mutate: generateTTS, isPending: isGeneratingTTS } = useMutation({
    mutationFn: (data: any) => apiService.post("/audio/tts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userAudio"] });
      setText("");
    },
  });

  // Voice Clone Mutation
  const { mutate: cloneVoice, isPending: isCloning } = useMutation({
    mutationFn: async () => {
      if (!audioFile || !voiceName) throw new Error(t('audio.errorFields', 'Dosya ve isim gerekli'));
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("name", voiceName);
      return apiService.upload("/voice/clone", formData);
    },
    onSuccess: () => {
      setCloneSuccess(t('audio.cloneSuccess', 'Ses başarıyla klonlandı! 🎉'));
      setCloneError("");
      setVoiceName("");
      setAudioFile(null);
      refetchVoices();
      setTimeout(() => setCloneSuccess(""), 3000);
    },
    onError: (error: any) => {
      setCloneError(error.response?.data?.detail || t('audio.statusFailed'));
      setCloneSuccess("");
    }
  });

  // Delete cloned voice
  const { mutate: deleteVoice } = useMutation({
    mutationFn: (id: string) => apiService.delete(`/voice/${id}`),
    onSuccess: () => refetchVoices()
  });

  const { mutate: generateMusic, isPending: isGeneratingMusic } = useMutation({
    mutationFn: (data: any) => apiService.post("/audio/music", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userAudio"] });
      setMusicPrompt("");
      setActiveTab("library");
    },
  });

  const handleTTSSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedModel) return;
    generateTTS({ text: text.trim(), model_id: selectedModel, voice: selectedVoice || "default", speed });
  };

  const handleMusicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() && !selectedGenre) return;
    const genreText = selectedGenre ? `${t('audio.musicGenres.' + selectedGenre, selectedGenre)} tarzında, ` : '';
    const moodText = mood ? `${t('audio.musicMoods.' + mood, mood)} ruh halinde ` : '';
    const finalPrompt = `${genreText}${moodText}${musicPrompt}`.trim();
    generateMusic({ prompt: finalPrompt, model_id: "kie_suno_v35" });
  };

  const handleVoiceClone = () => {
    if (!audioFile || !voiceName.trim()) {
      setCloneError(t('audio.cloneError', 'Lütfen bir ses dosyası seçin ve isim girin'));
      return;
    }
    setCloneError("");
    cloneVoice();
  };

  const models = ttsModels?.data || ttsModels || [];
  const myAudio = userAudio?.data?.outputs || [];
  const myVoices = (clonedVoices as any)?.voices || [];

  const tabs = [
    { id: "tts", name: t('audio.tabTTS'), icon: Volume2 },
    { id: "music", name: t('audio.tabMusic'), icon: Music },
    { id: "voice", name: t('audio.tabVoice'), icon: Mic },
    { id: "library", name: t('audio.tabLibrary'), icon: FolderOpen },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-pink-500/30 overflow-x-hidden">
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
      </div>

      {/* Hero Header */}
      <div className="relative pt-12 pb-10 px-8 border-b border-white/5 bg-white/[0.01] backdrop-blur-md overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Waves className="w-64 h-64 text-pink-500" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 w-fit">
              <Headphones className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-pink-400">
                {t('audio.badge', 'NEURAL AUDIO ENGINE')}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic leading-none">
              {t('audio.title', 'SONIC ')}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500">
                {t('audio.titleHighlight', 'SYNTHESIS')}
              </span>
            </h1>
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] max-w-xl opacity-80 leading-relaxed">
              {t('audio.desc', 'GENERATE HIGH-FIDELITY SPEECH, ATMOSPHERIC SOUNDSCAPES, AND NEURAL CLONES.')}
            </p>
          </div>

          <div className="flex items-center gap-6 bg-black/60 p-4 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">SYSTEM CREDITS</span>
              <span className="text-xl font-black text-white">{userAudio?.credits || 0} <span className="text-pink-500">ZEX</span></span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <button
              onClick={() => window.location.href = '/billing'}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-pink-600/20 border-t border-white/20 active:scale-95"
            >
              UPGRADE
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex bg-black/60 backdrop-blur-2xl border border-white/5 p-1.5 rounded-3xl shadow-2xl">
            {tabs.map((tab) => {
              if (tab.id === 'packages') return null;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 relative overflow-hidden group ${isActive
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabAudio"
                      className="absolute inset-0 bg-gradient-to-r from-rose-600 to-pink-600 shadow-xl shadow-pink-600/20"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <tab.icon className={`w-4 h-4 relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="relative z-10">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TTS Tab */}
        <AnimatePresence mode="wait">
        {activeTab === "tts" && (
          <motion.div
             key="tts"
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
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl shadow-black/50">
                <div className="p-6">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5 text-pink-400" />
                    {t('audio.ttsTitle')}
                  </h2>
                  <div className="relative">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t('audio.ttsPlaceholder')}
                      rows={4}
                      disabled={isGeneratingTTS}
                      className="w-full px-5 py-5 bg-black/40 border border-white/5 rounded-2xl resize-none focus:ring-1 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all text-slate-200 text-sm placeholder-slate-600 leading-relaxed"
                    />
                    <div className="absolute right-3 top-3">
                      <PromptEnhancer contentType="audio" currentPrompt={text} onSelectPrompt={(p) => setText(p)} />
                    </div>
                  </div>
                </div>

                {/* Voice Selection */}
                <div className="px-6 pb-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5" />
                    {t('audio.voiceCharacter')}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {voiceCharacters.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`relative p-4 rounded-xl text-left transition-all border ${selectedVoice === voice.id
                          ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20'
                          : 'bg-black/40 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                          }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{voice.lang}</span>
                          <span className="font-black text-[10px] uppercase tracking-widest">{voice.name}</span>
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-tighter opacity-60 italic">{t(voice.type)} • {t(voice.emotion)}</div>
                        {selectedVoice === voice.id && (
                          <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed & Model */}
                <div className="px-6 pb-6 border-t border-white/5 pt-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                        {t('audio.speed')}: <span className="text-pink-400">{speed}x</span>
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-pink-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">{t('audio.model')}</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isLoadingTTS}
                        className="w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-xs font-bold text-slate-300 focus:ring-1 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-slate-900">{t('audio.selectModel')}</option>
                        {Array.isArray(models) && models.map((model: any) => (
                          <option key={model.id} value={model.id} className="bg-slate-900">{model.name} - {model.credits} ZEX</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="p-6 bg-black/20">
                  <button
                    onClick={handleTTSSubmit}
                    disabled={isGeneratingTTS || !text || !selectedModel}
                    className="w-full py-5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center gap-3 border-t border-white/10"
                  >
                    {isGeneratingTTS ? <><Loader2 className="w-4 h-4 animate-spin" />{t('audio.generating', 'SYNTHESIZING...')}</> : <><Play className="w-4 h-4" />{t('audio.generateBtn', 'INITIALIZE SYNTHESIS')}</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Model Cards */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                <Star className="w-3.5 h-3.5 text-yellow-500" />
                {t('audio.popModelsTitle', 'TOP ENGINES')}
              </h3>
              <div className="space-y-3">
                {isLoadingTTS ? (
                  [1, 2, 3].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse border border-white/5" />)
                ) : (
                  Array.isArray(models) && models.slice(0, 4).map((model: any) => (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`p-5 bg-black/40 backdrop-blur-xl rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${selectedModel === model.id ? 'border-pink-500 shadow-xl shadow-pink-500/20 bg-pink-500/5' : 'border-white/5'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-white">{model.name}</h4>
                        <span className="px-2 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[9px] font-black rounded-lg">
                          {model.credits} ZEX
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic line-clamp-2">"{model.description || t('audio.modelDesc')}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Music Tab */}
        {activeTab === "music" && (
          <motion.div
             key="music"
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
            <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-8 shadow-2xl">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-purple-400" />
                {t('audio.musicTitle', 'ATMOSPHERIC COMPOSITION')}
              </h2>

              {/* Genre Selection */}
              <div className="mb-10">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">{t('audio.musicSelectGenre', 'GENRE SELECTOR')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {musicGenres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => setSelectedGenre(genre.id)}
                      className={`relative p-6 rounded-2xl text-center transition-all border group ${selectedGenre === genre.id
                        ? `bg-gradient-to-br ${genre.color} border-white/20 text-white shadow-xl scale-[1.02]`
                        : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10'
                        }`}
                    >
                      <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">{genre.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest block">{(t(`audio.musicGenres.${genre.id}`, genre.name))}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood Selection */}
              <div className="mb-10">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">{t('audio.musicMood', 'EMOTIONAL STATE')}</h3>
                <div className="flex flex-wrap gap-2">
                  {['happy', 'sad', 'epic', 'calm', 'energetic', 'romantic'].map((m) => {
                    return (
                      <button
                        key={m}
                        onClick={() => setMood(m)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${mood === m
                          ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                          : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'
                          }`}
                      >
                        {t(`audio.musicMoods.${m}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative mb-8">
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder={t('audio.musicPlaceholder', 'Describe the soundscape or composition details...')}
                  rows={4}
                  disabled={isGeneratingMusic}
                  className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-2xl text-slate-200 text-sm placeholder-slate-700 focus:ring-1 focus:ring-purple-500/50 outline-none resize-none transition-all leading-relaxed shadow-inner"
                />
              </div>

              <button
                onClick={handleMusicSubmit}
                disabled={isGeneratingMusic || (!musicPrompt.trim() && !selectedGenre)}
                className="w-full py-5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-purple-600/20 transition-all flex items-center justify-center gap-3 border-t border-white/10"
              >
                {isGeneratingMusic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGeneratingMusic ? t('audio.generating', 'COMPOSING...') : t('audio.musicGenerateBtn', 'EXECUTE COMPOSITION')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Voice Cloning Tab */}
        {activeTab === "voice" && (
          <motion.div
             key="voice"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             transition={{ duration: 0.2 }}
             drag="x"
             dragConstraints={{ left: 0, right: 0 }}
             dragElastic={0.2}
             dragDirectionLock
             onDragEnd={handleDragEnd}
             className="max-w-4xl mx-auto space-y-10 touch-pan-y"
          >
            {/* Clone New Voice */}
            <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-10 shadow-2xl">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-blue-400" />
                {t('audio.cloneTitle', 'NEURAL VOICE CLONING')}
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  {/* Voice Name Input */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">
                      {t('audio.cloneVoiceNameLabel', 'IDENTIFIER NAME')}
                    </label>
                    <input
                      type="text"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      placeholder={t('audio.cloneVoiceNamePlaceholder', 'E.g. Professional Narrative...')}
                      className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-slate-200 text-sm focus:ring-1 focus:ring-blue-500/50 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">
                      {t('audio.cloneAudioFileLabel', 'SOURCE SIGNAL')}
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer group ${audioFile
                        ? 'border-blue-500 bg-blue-500/5'
                        : 'border-white/5 bg-white/[0.02] hover:border-blue-500/50 hover:bg-blue-500/5'
                        }`}
                      onClick={() => document.getElementById('voiceFileInput')?.click()}
                    >
                      <input
                        id="voiceFileInput"
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                      />
                      {audioFile ? (
                        <>
                          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                            <Music className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-blue-400 font-black text-[11px] uppercase tracking-widest truncate max-w-xs mx-auto">{audioFile.name}</p>
                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">{t('audio.cloneUploadChange', 'CLICK TO RE-UPLOAD')}</p>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <Mic className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition-colors" />
                          </div>
                          <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{t('audio.cloneUploadClick', 'DROP SIGNAL FILE OR CLICK')}</p>
                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">MP3, WAV, M4A • MAX 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Tips */}
                  <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-3xl">
                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">{t('audio.cloneTipsTitle', 'BEST PRACTICES')}</h4>
                    <ul className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <li key={i} className="flex gap-3 text-[11px] text-slate-400 font-medium leading-relaxed italic">
                          <span className="text-blue-500 font-black">0{i}.</span>
                          {t(`audio.cloneTip${i}`)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Messages */}
                  <AnimatePresence>
                    {(cloneError || cloneSuccess) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${cloneError ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}
                      >
                        {cloneError ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        {cloneError || cloneSuccess}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Clone Button */}
                  <button
                    onClick={handleVoiceClone}
                    disabled={isCloning || !audioFile || !voiceName.trim()}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 border-t border-white/10 active:scale-95"
                  >
                    {isCloning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('audio.cloning', 'CLONING SIGNAL...')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {t('audio.cloneBtn', 'INITIALIZE CLONING')} (100 ZEX)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* My Cloned Voices */}
            <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-8 shadow-2xl">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                {t('audio.clonedVoicesTitle', 'REGISTERED VOICES')}
              </h3>

              {isLoadingVoices ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse border border-white/5" />)}
                </div>
              ) : myVoices.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] rounded-3xl border border-white/5">
                  <Mic className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('audio.noClonedVoices', 'NO REGISTERED SIGNALS')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myVoices.map((voice: any) => (
                    <div key={voice.id} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <Mic className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-black text-[11px] text-white uppercase tracking-widest">{voice.name}</p>
                          <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">
                            {voice.status === 'ready' ? t('audio.statusReady', 'OPERATIONAL') :
                              voice.status === 'processing' ? t('audio.statusProcessing', 'PROCESSING') :
                                voice.status === 'failed' ? t('audio.statusFailed', 'OFFLINE') : voice.status}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteVoice(voice.id)}
                        className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
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
             className="space-y-6 touch-pan-y"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-6 h-6 text-pink-500" />
                {t('audio.packagesTitle')}
              </h2>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-medium rounded-full">
                {t('audio.discountBadge')}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {audioPakages.map((pkg) => (
                <div key={pkg.id} className="relative overflow-hidden bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold">
                    %{pkg.discount} {t('common.discount')}
                  </div>
                  <div className="text-4xl mb-4">{pkg.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{t(pkg.name)}</h3>
                  <p className="text-pink-100 text-sm mb-4">{t(pkg.desc)}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-pink-200 line-through text-sm">{pkg.original}c</span>
                    <span className="text-2xl font-bold">{pkg.price}c</span>
                  </div>
                  <button className="w-full py-3 bg-white text-pink-600 hover:bg-pink-50 rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                    {t('audio.buyPackageBtn')} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Library Tab */}
        {activeTab === "library" && (
          <motion.div
             key="library"
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
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              {t('audio.libraryTitle', 'SYNTHESIS ARCHIVE')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoadingAudio ? (
                [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse border border-white/5" />)
              ) : myAudio.length === 0 ? (
                <div className="col-span-full text-center py-24 bg-white/[0.02] rounded-3xl border border-white/5">
                  <Volume2 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{t('audio.noAudio', 'NO SYNTHESIZED OUTPUTS FOUND')}</p>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">{t('audio.createFirstAudio', 'INITIALIZE YOUR FIRST GENERATION')}</p>
                </div>
              ) : (
                myAudio.map((audio: any) => (
                  <div key={audio.id} className="group bg-black/40 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/5 hover:border-white/10 transition-all hover:shadow-2xl hover:shadow-black/50">
                    <div className="h-28 bg-gradient-to-br from-white/[0.02] to-white/[0.05] flex items-center justify-center relative overflow-hidden">
                      <Waves className="w-16 h-16 text-slate-800 group-hover:text-emerald-500/20 transition-colors" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-4">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${audio.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
                          }`}>
                          {audio.status === 'completed' ? t('audio.statusReady2', 'COMPLETED') : t('audio.statusProcessing2', 'PROCESSING')}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-[11px] text-slate-300 font-medium line-clamp-2 mb-4 leading-relaxed italic group-hover:text-white transition-colors">"{audio.prompt || t('audio.audioItem', 'Neural Audio Signal')}"</p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                         <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                           {new Date(audio.created_at).toLocaleDateString()}
                         </span>
                        {audio.status === 'completed' && audio.file_url && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAudioForNft(audio);
                                setNftModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all hover:bg-purple-500 hover:text-white flex items-center gap-1.5"
                              title={t('audio.mintNft')}
                            >
                              MINT NFT
                            </button>
                            <button 
                              onClick={() => {
                                window.open(audio.file_url, '_blank');
                              }}
                              className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* NFT Mint Modal */}
      <NFTMintModal
        isOpen={nftModalOpen}
        onClose={() => {
          setNftModalOpen(false);
          setSelectedAudioForNft(null);
        }}
        image={selectedAudioForNft}
      />
    </div>
  );
};

export default AudioPage;