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

  const tabIds = ["tts", "music", "voice", "packages", "library"];
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
    { id: "packages", name: t('audio.tabPackages'), icon: Package },
    { id: "library", name: t('audio.tabLibrary'), icon: FolderOpen },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative px-6 py-10 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-3">
              <Headphones className="w-4 h-4" />
              <span className="text-sm font-medium">{t('audio.badge')}</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">
              {t('audio.title')}<span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-white">{t('audio.titleHighlight')}</span>
            </h1>
            <p className="text-pink-100">{t('audio.desc')}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none"><path d="M0 60V0C240 40 480 60 720 60C960 60 1200 40 1440 0V60H0Z" fill="currentColor" className="text-gray-50 dark:text-gray-900" /></svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 -mt-4">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-2xl p-1 sm:p-1.5 shadow-lg border border-gray-100 dark:border-gray-700 max-w-full overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const gradients: Record<string, string> = {
                'tts': 'from-rose-500 to-pink-500',
                'music': 'from-purple-500 to-violet-500',
                'voice': 'from-blue-500 to-cyan-500',
                'packages': 'from-amber-500 to-yellow-500',
                'library': 'from-emerald-500 to-teal-500',
              };
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap ${isActive
                    ? `bg-gradient-to-r ${gradients[tab.id] || 'from-rose-500 to-pink-500'} text-white shadow-lg`
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {tab.name}
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-pink-500" />
                    {t('audio.ttsTitle')}
                  </h2>
                  <div className="relative">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t('audio.ttsPlaceholder')}
                      rows={4}
                      disabled={isGeneratingTTS}
                      className="w-full px-4 py-3 pr-14 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400"
                    />
                    <div className="absolute right-3 top-3">
                      <PromptEnhancer contentType="audio" currentPrompt={text} onSelectPrompt={(p) => setText(p)} />
                    </div>
                  </div>
                </div>

                {/* Voice Selection */}
                <div className="px-6 pb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    {t('audio.voiceCharacter')}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {voiceCharacters.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`relative p-4 rounded-xl text-left transition-all ${selectedVoice === voice.id
                          ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{voice.lang}</span>
                          <span className="font-medium">{voice.name}</span>
                        </div>
                        <div className="text-xs opacity-80">{t(voice.type)} • {t(voice.emotion)}</div>
                        {selectedVoice === voice.id && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed & Model */}
                <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700 pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        {t('audio.speed')}: {speed}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full accent-pink-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('audio.model')}</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isLoadingTTS}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="">{t('audio.selectModel')}</option>
                        {Array.isArray(models) && models.map((model: any) => (
                          <option key={model.id} value={model.id}>{model.name} - {model.credits}c</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
                  <button
                    onClick={handleTTSSubmit}
                    disabled={isGeneratingTTS || !text || !selectedModel}
                    className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/25 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {isGeneratingTTS ? <><Loader2 className="w-5 h-5 animate-spin" />{t('audio.generating')}</> : <><Play className="w-5 h-5" />{t('audio.generateBtn')}</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Model Cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                {t('audio.popModelsTitle')}
              </h3>
              <div className="space-y-3">
                {isLoadingTTS ? (
                  [1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)
                ) : (
                  Array.isArray(models) && models.slice(0, 4).map((model: any) => (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`p-4 bg-white dark:bg-gray-800 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${selectedModel === model.id ? 'border-pink-500 shadow-lg shadow-pink-500/20' : 'border-gray-100 dark:border-gray-700'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{model.name}</h4>
                        <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-medium rounded-full">
                          {model.credits}c
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{model.description || t('audio.modelDesc')}</p>
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
             className="space-y-6 touch-pan-y"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Music className="w-6 h-6 text-pink-500" />
                {t('audio.musicTitle')}
              </h2>

              {/* Genre Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('audio.musicSelectGenre')}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {musicGenres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => setSelectedGenre(genre.id)}
                      className={`relative p-4 rounded-xl text-center transition-all ${selectedGenre === genre.id
                        ? `bg-gradient-to-br ${genre.color} text-white shadow-lg scale-105`
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                      <span className="text-3xl block mb-2">{genre.icon}</span>
                      <span className="text-xs font-medium">{(t(`audio.musicGenres.${genre.id}`, genre.name))}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('audio.musicMood')}</h3>
                <div className="flex flex-wrap gap-2">
                  {['happy', 'sad', 'epic', 'calm', 'energetic', 'romantic'].map((m) => {
                    return (
                      <button
                        key={m}
                        onClick={() => setMood(m)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${mood === m
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                          }`}
                      >
                        {t(`audio.musicMoods.${m}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                placeholder={t('audio.musicPlaceholder')}
                rows={3}
                disabled={isGeneratingMusic}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-pink-500 mb-4"
              />

              <button
                onClick={handleMusicSubmit}
                disabled={isGeneratingMusic || (!musicPrompt.trim() && !selectedGenre)}
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all">
                {isGeneratingMusic ? <Loader2 className="w-5 h-5 animate-spin" /> : <Music className="w-5 h-5" />}
                {isGeneratingMusic ? t('audio.generating') : t('audio.musicGenerateBtn')}
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
             className="max-w-2xl mx-auto space-y-6 touch-pan-y"
          >
            {/* Clone New Voice */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Mic className="w-6 h-6 text-pink-500" />
                {t('audio.cloneTitle')}
              </h2>

              {/* Voice Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('audio.cloneVoiceNameLabel')}
                </label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder={t('audio.cloneVoiceNamePlaceholder')}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('audio.cloneAudioFileLabel')}
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${audioFile
                    ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-pink-400'
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
                      <Music className="w-12 h-12 text-pink-500 mx-auto mb-3" />
                      <p className="text-pink-600 dark:text-pink-400 font-medium">{audioFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{t('audio.cloneUploadChange')}</p>
                    </>
                  ) : (
                    <>
                      <Mic className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{t('audio.cloneUploadClick')}</p>
                      <p className="text-xs text-gray-500">{t('audio.cloneUploadReqs')}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Messages */}
              {cloneError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
                  {cloneError}
                </div>
              )}
              {cloneSuccess && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400">
                  {cloneSuccess}
                </div>
              )}

              {/* Tips */}
              <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-xl mb-6">
                <h4 className="font-medium text-pink-900 dark:text-pink-300 mb-2">{t('audio.cloneTipsTitle')}</h4>
                <ul className="text-sm text-pink-800 dark:text-pink-200 space-y-1">
                  <li>{t('audio.cloneTip1')}</li>
                  <li>{t('audio.cloneTip2')}</li>
                  <li>{t('audio.cloneTip3')}</li>
                </ul>
              </div>

              {/* Clone Button */}
              <button
                onClick={handleVoiceClone}
                disabled={isCloning || !audioFile || !voiceName.trim()}
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                {isCloning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('audio.cloning')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t('audio.cloneBtn')} (100 ZEX)
                  </>
                )}
              </button>
            </div>

            {/* My Cloned Voices */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-pink-500" />
                {t('audio.clonedVoicesTitle')}
              </h3>

              {isLoadingVoices ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                </div>
              ) : myVoices.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('audio.noClonedVoices')}</p>
              ) : (
                <div className="space-y-3">
                  {myVoices.map((voice: any) => (
                    <div key={voice.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                          <Mic className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{voice.name}</p>
                          <p className="text-xs text-gray-500">
                            {voice.status === 'ready' ? t('audio.statusReady') :
                              voice.status === 'processing' ? t('audio.statusProcessing') :
                                voice.status === 'failed' ? t('audio.statusFailed') : voice.status}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteVoice(voice.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
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
             className="space-y-6 touch-pan-y"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('audio.libraryTitle')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingAudio ? (
                [1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)
              ) : myAudio.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Volume2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">{t('audio.noAudio')}</p>
                  <p className="text-sm text-gray-400">{t('audio.createFirstAudio')}</p>
                </div>
              ) : (
                myAudio.map((audio: any) => (
                  <div key={audio.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
                    <div className="h-20 bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 flex items-center justify-center">
                      <Waves className="w-12 h-12 text-pink-400" />
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2 mb-2">{audio.prompt || t('audio.audioItem')}</p>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${audio.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {audio.status === 'completed' ? t('audio.statusReady2') : t('audio.statusProcessing2')}
                        </span>
                        {audio.status === 'completed' && audio.file_url && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAudioForNft(audio);
                                setNftModalOpen(true);
                              }}
                              className="px-2 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg text-xs font-medium shadow transition-all flex items-center gap-1"
                              title={t('audio.mintNft')}
                            >
                              💎 {t('audio.mintNft')}
                            </button>
                            <button className="p-2 text-pink-500 hover:bg-pink-50 rounded-lg">
                              <Download className="w-4 h-4" />
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