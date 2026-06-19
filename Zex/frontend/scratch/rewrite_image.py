import os
import re

file_path = r"c:\Users\my\Desktop\ZexAi\Zex\frontend\src\pages\ImageGenerationPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add getBaseName and getBrand above ImageGenerationPage = () => {
helpers = """
const getBaseName = (name: string) => {
  let base = name.split(' (')[0].trim();
  const suffixes = ['Pro', 'Max', 'Lite', 'Quality', 'Standard', 'Stable', 'Edit', 'Turbo', 'V3', 'V6.1', 'O3', 'O1', 'Flash'];
  suffixes.forEach(s => {
    const regex = new RegExp(`\\\\s+${s}$`, 'i');
    base = base.replace(regex, '');
  });
  return base.replace(/\\[.*?\\]/g, '').trim();
};

const getBrand = (name: string): { name: string; icon: string } => {
  const n = name.toLowerCase();
  if (n.includes("flux")) return { name: "FLUX", icon: "💎" };
  if (n.includes("ideogram")) return { name: "Ideogram", icon: "📝" };
  if (n.includes("google") || n.includes("nano") || n.includes("imagen")) return { name: "Google AI", icon: "🎨" };
  if (n.includes("gpt") || n.includes("openai") || n.includes("dalle")) return { name: "OpenAI", icon: "🤖" };
  if (n.includes("recraft")) return { name: "Recraft", icon: "✂️" };
  if (n.includes("kling")) return { name: "Kling AI", icon: "🎬" };
  if (n.includes("luma")) return { name: "Luma AI", icon: "✨" };
  if (n.includes("midjourney")) return { name: "Midjourney", icon: "🎨" };
  return { name: "Premium Engine", icon: "⚡" };
};

const ImageGenerationPage = () => {
"""

content = content.replace("const ImageGenerationPage = () => {", helpers)

# 2. Update query to fetch models
old_query_find = """  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ["imageModels"],
    queryFn: () => apiService.get("/image/models")
  });"""

new_query = """  const { data: allModelsRes, isLoading: isLoadingModels } = useQuery({
    queryKey: ["imageModels", "all"],
    queryFn: () => apiService.get("/image/models")
  });
  
  const rawModels = allModelsRes?.data || allModelsRes || [];
  
  // Grouping logic for Sidebar
  const { brands, variantsMap } = useMemo(() => {
    if (!Array.isArray(rawModels)) return { brands: [], variantsMap: {} };
    
    // Filter models based on active tab
    const filtered = rawModels.filter(m => {
       if (activeTab === 'generate') return m.type === 'text_to_image' || m.type === 'image_to_image';
       return true;
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

  const showSidebar = activeTab === 'generate';
  const [selectedBaseModelId, setSelectedBaseModelId] = useState("");
  
  // Derived selected model
  const selectedModel = useMemo(() => {
     return rawModels.find(m => m.id === modelId) || null;
  }, [rawModels, modelId]);
  
  const availableVersions = useMemo(() => {
     if (!selectedModel) return [];
     const baseName = selectedModel.base_name || getBaseName(selectedModel.name);
     return variantsMap[baseName] || [];
  }, [selectedModel, variantsMap]);
"""

# Find and replace query
# In the original file it might be slightly different
# Let's use a more flexible regex
content = re.sub(r'const\s*{\s*data:\s*modelsData,\s*isLoading:\s*isLoadingModels\s*}\s*=\s*useQuery\({\s*queryKey:\s*\["imageModels"\],\s*queryFn:\s*\(\)\s*=>\s*apiService\.get\("/image/models"\)\s*}\);', new_query, content)

# 3. Add default selection useEffect
default_selection_effect = """
  // Auto-select first model if none selected
  useEffect(() => {
    if (rawModels.length > 0 && !modelId) {
      const first = rawModels.find(m => m.type === 'text_to_image');
      if (first) {
        setModelId(first.id);
        setSelectedBaseModelId(first.id);
      }
    }
  }, [rawModels, modelId]);
"""

# Insert before handleGenerate
content = content.replace("const handleGenerate = async () => {", default_selection_effect + "\n  const handleGenerate = async () => {")

# 4. Redesign return statement layout
# Find the AnimatePresence and wrap it with the grid and sidebar
animate_presence_start = """      <AnimatePresence mode="wait">"""
new_layout_start = """      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - Brand Navigation */}
          {showSidebar && (
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-purple-400" />
                    SYSTEM ENGINES
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
                          const isSelected = selectedBaseModelId === bm.id || availableVersions.some((v: any) => v.id === modelId && v.base_name === bm.baseName);
                          return (
                            <button
                              key={bm.id}
                              onClick={() => {
                                setSelectedBaseModelId(bm.id);
                                setModelId(bm.representative.id);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between group
                                ${isSelected 
                                  ? 'bg-purple-600/10 border border-purple-500/20 text-purple-400 shadow-[inset_0_0_20px_rgba(147,51,234,0.05)]' 
                                  : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                            >
                              <div className="flex flex-col gap-1">
                                <span className={`text-[11px] font-black uppercase tracking-widest ${isSelected ? 'text-purple-400' : 'text-slate-300'}`}>
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

content = content.replace(animate_presence_start, new_layout_start)

# Fix the end of the AnimatePresence block
# I need to find where AnimatePresence ends and add closing tags
content = content.replace("      </AnimatePresence>\n\n      {/* NFT Minting Modal */}", "            </AnimatePresence>\n          </div>\n        </div>\n      </div>\n\n      {/* NFT Minting Modal */}")
# Try with other comment name
content = content.replace("      </AnimatePresence>\n\n      {/* NFT Mint Modal */}", "            </AnimatePresence>\n          </div>\n        </div>\n      </div>\n\n      {/* NFT Mint Modal */}")

# Remove the old max-w-7xl px-8 py-10 from generate tab
content = content.replace('className="max-w-7xl mx-auto px-8 py-10"', 'className="space-y-8"')

with open(r"c:\Users\my\Desktop\ZexAi\Zex\frontend\scratch\rewrite_image.tsx", "w", encoding="utf-8") as f:
    f.write(content)
