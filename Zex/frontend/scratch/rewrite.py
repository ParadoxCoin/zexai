import os
import re

file_path = r"c:\Users\my\Desktop\ZexAi\Zex\frontend\src\pages\AudioPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add getBaseName and getBrand above AudioPage = () => {
helpers = """
const getBaseName = (name: string) => {
  let base = name.split(' (')[0].trim();
  const suffixes = ['Fast', 'Lite', 'Quality', 'Standard', 'Audio', 'Stable', 'Pro', 'Turbo', 'V2', 'V3', '3.5', '3.2'];
  suffixes.forEach(s => {
    const regex = new RegExp(`\\\\s+${s}$`, 'i');
    base = base.replace(regex, '');
  });
  return base.replace(/\\[.*?\\]/g, '').trim();
};

const getBrand = (name: string): { name: string; icon: string } => {
  const n = name.toLowerCase();
  if (n.includes("eleven")) return { name: "ElevenLabs", icon: "🎙️" };
  if (n.includes("suno")) return { name: "Suno AI", icon: "🎵" };
  if (n.includes("udio")) return { name: "Udio", icon: "📻" };
  return { name: "Premium Audio", icon: "🎧" };
};

const AudioPage = () => {
"""

content = content.replace("const AudioPage = () => {", helpers)

# 2. Replace the ttsModels query with allModels query
old_query = """  const { data: ttsModels, isLoading: isLoadingTTS } = useQuery({
    queryKey: ["audioModels", "tts"],
    queryFn: () => apiService.get("/audio/models/tts")
  });"""

new_query = """  const { data: allModelsRes, isLoading: isLoadingModels } = useQuery({
    queryKey: ["audioModels", "all"],
    queryFn: () => apiService.get("/audio/models")
  });
  
  const rawModels = allModelsRes?.data || allModelsRes || [];
  
  // Grouping logic for Sidebar
  const { brands, variantsMap } = React.useMemo(() => {
    if (!Array.isArray(rawModels)) return { brands: [], variantsMap: {} };
    
    // Filter models based on active tab
    const filtered = rawModels.filter(m => {
       if (activeTab === 'tts') return m.type === 'text_to_speech' || m.type === 'sound_effects';
       if (activeTab === 'music') return m.type === 'music_generation';
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
      const brandInfo = getBrand(m.name);
      const bName = brandInfo.name;
      const baseName = m.base_name || getBaseName(m.name);

      if (!grouped[bName]) {
        grouped[bName] = { id: bName, name: bName, icon: brandInfo.icon, baseModels: {}, count: 0 };
      }

      if (!grouped[bName].baseModels[baseName]) {
        grouped[bName].baseModels[baseName] = {
          id: m.id,
          baseName: baseName,
          brand: bName,
          variants: [],
          representative: m
        };
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

  const showSidebar = ["tts", "music"].includes(activeTab);
  const [selectedBaseModelId, setSelectedBaseModelId] = useState("");
  
  // Derived selected model
  const selectedModel = React.useMemo(() => {
     return rawModels.find(m => m.id === selectedModelId) || null;
  }, [rawModels, selectedModelId]);
  
  const availableVersions = React.useMemo(() => {
     if (!selectedModel) return [];
     const baseName = selectedModel.base_name || getBaseName(selectedModel.name);
     return variantsMap[baseName] || [];
  }, [selectedModel, variantsMap]);
"""

# Wait, `import { useState } from "react"` doesn't have `React.useMemo`. We need to fix imports.
import_replace = """import React, { useState, useMemo, useEffect } from "react";"""
content = re.sub(r'import\s+{\s*useState\s*}\s+from\s+"react";', import_replace, content)

content = content.replace(old_query, new_query)

# We need to change `const [selectedModel, setSelectedModel] = useState("");`
# to `const [selectedModelId, setSelectedModelId] = useState("");`
content = content.replace('const [selectedModel, setSelectedModel] = useState("");', 'const [selectedModelId, setSelectedModelId] = useState("");')

# Fix remaining `setSelectedModel` to `setSelectedModelId`
content = content.replace('setSelectedModel(', 'setSelectedModelId(')

# Now, we need to rewrite the main content wrapper.
main_wrapper_start = """      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}"""

new_wrapper_start = """      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}"""
content = content.replace(main_wrapper_start, new_wrapper_start)

# Now, after Tab Navigation, the VideoPage structure has `grid grid-cols-1 lg:grid-cols-12 gap-8`
# We need to find the AnimatePresence and wrap it.
animate_presence_start = """        <AnimatePresence mode="wait">"""
new_animate_presence = """        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - Brand Navigation */}
          {showSidebar && (
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-pink-400" />
                    {t('videoGen.modelLibrary', 'SYSTEM ENGINES')}
                  </h2>
                </div>
                <div className="p-3 space-y-2">
                  {brands.map((brand: any) => (
                    <div key={brand.id} className="space-y-1">
                      <div className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span>{brand.icon}</span>
                        {brand.name}
                      </div>
                      <div className="space-y-1">
                        {brand.baseModels.map((bm: any) => {
                          const isSelected = selectedBaseModelId === bm.id || availableVersions.some((v: any) => v.id === selectedModelId && v.base_name === bm.baseName);
                          return (
                            <button
                              key={bm.id}
                              onClick={() => {
                                setSelectedBaseModelId(bm.id);
                                setSelectedModelId(bm.representative.id);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between group
                                ${isSelected 
                                  ? 'bg-pink-600/10 border border-pink-500/20 text-pink-400 shadow-[inset_0_0_20px_rgba(2db2ff,0.05)]' 
                                  : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                            >
                              <div className="flex flex-col gap-1">
                                <span className={`text-[11px] font-black uppercase tracking-widest ${isSelected ? 'text-pink-400' : 'text-slate-300'}`}>
                                  {bm.baseName}
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-tighter opacity-60">
                                  {bm.representative.provider} • {bm.variants.length} Version{bm.variants.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={`space-y-6 ${showSidebar ? 'lg:col-span-9' : 'lg:col-span-12'}`}>
            <AnimatePresence mode="wait">"""

content = content.replace(animate_presence_start, new_animate_presence)

# Don't forget to close the div at the very end.
content = content.replace("      </div>\n\n      {/* NFT Minting Modal */}", "            </div>\n          </div>\n      </div>\n\n      {/* NFT Minting Modal */}")

# Now we need to remove the "Model Cards" (Popular Models) from TTS and Music tabs.
# The TTS tab has `<div className="space-y-4">` containing `<Star ...> TOP ENGINES`. We can use regex to remove it.
# Actually, it's easier to write it out to a file and run a script.

with open("c:\\Users\\my\\Desktop\\ZexAi\\Zex\\frontend\\scratch\\rewrite.tsx", "w", encoding="utf-8") as f:
    f.write(content)
