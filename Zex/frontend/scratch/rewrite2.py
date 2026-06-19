import re

with open(r"c:\Users\my\Desktop\ZexAi\Zex\frontend\scratch\rewrite.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace the Speed & Model section in TTS tab
tts_model_section_old = """                {/* Speed & Model */}
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
                        value={selectedModelId}
                        onChange={(e) => setSelectedModelId(e.target.value)}
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
                </div>"""

tts_model_section_new = """                {/* Speed & System Version */}
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-pink-400" />
                        SYSTEM VERSION
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableVersions.map((v: any) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedModelId(v.id)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2
                              ${selectedModelId === v.id
                                ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-600/20'
                                : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                          >
                            {v.version_name || 'STANDARD'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>"""

content = content.replace(tts_model_section_old, tts_model_section_new)

# 2. Remove Top Engines from TTS
top_engines_old = """            {/* Model Cards */}
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
                      onClick={() => setSelectedModelId(model.id)}
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
            </div>"""

content = content.replace(top_engines_old, "")

# 3. Add SYSTEM VERSION to Music Tab
music_textarea_old = """              <div className="relative mb-8">
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder={t('audio.musicPlaceholder', 'Describe the soundscape or composition details...')}
                  rows={4}
                  disabled={isGeneratingMusic}
                  className="w-full px-6 py-5 bg-black/40 border border-white/5 rounded-2xl text-slate-200 text-sm placeholder-slate-700 focus:ring-1 focus:ring-purple-500/50 outline-none resize-none transition-all leading-relaxed shadow-inner"
                />
              </div>"""

music_system_version_new = """              <div className="mb-10">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-purple-400" />
                  SYSTEM VERSION
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableVersions.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedModelId(v.id)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2
                        ${selectedModelId === v.id
                          ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                          : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                    >
                      {v.version_name || 'STANDARD'}
                    </button>
                  ))}
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
              </div>"""

content = content.replace(music_textarea_old, music_system_version_new)

# 4. Fix handleMusicSubmit
music_submit_old = """  const handleMusicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() && !selectedGenre) return;
    const genreText = selectedGenre ? `${t('audio.musicGenres.' + selectedGenre, selectedGenre)} tarzında, ` : '';
    const moodText = mood ? `${t('audio.musicMoods.' + mood, mood)} ruh halinde ` : '';
    const finalPrompt = `${genreText}${moodText}${musicPrompt}`.trim();
    generateMusic({ prompt: finalPrompt, model_id: "kie_suno_v35" });
  };"""

music_submit_new = """  const handleMusicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() && !selectedGenre) return;
    if (!selectedModelId) return;
    const genreText = selectedGenre ? `${t('audio.musicGenres.' + selectedGenre, selectedGenre)} tarzında, ` : '';
    const moodText = mood ? `${t('audio.musicMoods.' + mood, mood)} ruh halinde ` : '';
    const finalPrompt = `${genreText}${moodText}${musicPrompt}`.trim();
    generateMusic({ prompt: finalPrompt, model_id: selectedModelId });
  };"""

content = content.replace(music_submit_old, music_submit_new)

# 5. Fix generate_button disabled states
tts_gen_btn_old = """disabled={isGeneratingTTS || !text || !selectedModel}"""
tts_gen_btn_new = """disabled={isGeneratingTTS || !text || !selectedModelId}"""
content = content.replace(tts_gen_btn_old, tts_gen_btn_new)

music_gen_btn_old = """disabled={isGeneratingMusic || (!musicPrompt.trim() && !selectedGenre)}"""
music_gen_btn_new = """disabled={isGeneratingMusic || (!musicPrompt.trim() && !selectedGenre) || !selectedModelId}"""
content = content.replace(music_gen_btn_old, music_gen_btn_new)

# 6. Change `selectedModel === model.id` to `selectedModelId === model.id` in Top Engines (if any are left)
content = content.replace("selectedModel === model.id", "selectedModelId === model.id")

# 7. Add currentPrice display next to SYSTEM VERSION in right panel top
price_info = """                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5 text-pink-400" />
                    {t('audio.ttsTitle')}
                  </h2>
                  {selectedModel && (
                    <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">COST:</span>
                      <span className="text-[11px] font-black text-pink-400">{selectedModel.credits} ZEX</span>
                    </div>
                  )}
                </div>"""

tts_title_old = """                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5 text-pink-400" />
                    {t('audio.ttsTitle')}
                  </h2>"""

content = content.replace(tts_title_old, price_info)

music_title_old = """              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-purple-400" />
                {t('audio.musicTitle', 'ATMOSPHERIC COMPOSITION')}
              </h2>"""

music_price_info = """              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Music className="w-3.5 h-3.5 text-purple-400" />
                  {t('audio.musicTitle', 'ATMOSPHERIC COMPOSITION')}
                </h2>
                {selectedModel && (
                  <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">COST:</span>
                    <span className="text-[11px] font-black text-purple-400">{selectedModel.credits} ZEX</span>
                  </div>
                )}
              </div>"""

content = content.replace(music_title_old, music_price_info)

with open(r"c:\Users\my\Desktop\ZexAi\Zex\frontend\scratch\rewrite.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done rewrite2")
