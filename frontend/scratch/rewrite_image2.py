import re

with open(r"c:\Users\my\Desktop\ZexAi\Zex\frontend\scratch\rewrite_image.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the Model & Aspect Ratio section
old_section = """                {/* ── Model & Aspect Ratio ── */}
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
                              {formatModelName(model.name).toUpperCase()} [{model.credits} Kredi]
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
                </div>"""

new_section = """                {/* ── System Version & Aspect Ratio ── */}
                <div className="px-8 pb-8 border-t border-white/5 pt-8 bg-white/[0.01]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block flex items-center gap-3">
                        <Star className="w-4 h-4 text-purple-400" />
                        SYSTEM VERSION
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableVersions.map((v: any) => (
                          <button
                            key={v.id}
                            onClick={() => setModelId(v.id)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2
                              ${modelId === v.id
                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                                : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                          >
                            {v.version_name || 'STANDARD'}
                          </button>
                        ))}
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
                </div>"""

content = content.replace(old_section, new_section)

# 2. Add Price display to Right Panel Top
price_header = """                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-3">
                      <Wand2 className="w-4 h-4 text-purple-400" />
                      {generationMode === 'img2img' ? t('imageGen.promptTitleI2I', 'EVOLUTION COMMAND') : t('imageGen.promptTitleT2I', 'SEMANTIC COMMAND')}
                    </h2>
                    {selectedModel && (
                      <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">COST:</span>
                        <span className="text-[11px] font-black text-purple-400">{selectedModel.credits} ZEX</span>
                      </div>
                    )}
                  </div>"""

old_title = """                  <div className="flex items-center justify-between mb-6">
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
                  </div>"""

content = content.replace(old_title, price_header)

# 3. Add inspiration button back below the banner if needed, or just keep it simple.
# The original layout had it in the title. I'll put it back but next to "SEMANTIC COMMAND" or something.
# Actually I'll put it below the banner.

with open(r"c:\Users\my\Desktop\ZexAi\Zex\frontend\scratch\rewrite_image.tsx", "w", encoding="utf-8") as f:
    f.write(content)
