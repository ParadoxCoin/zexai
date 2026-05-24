// Build v3.0 - Premium Three-Panel Chat Studio
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import {
  MessageCircle, Send, Plus, Trash2, Bot, User,
  Copy, Check, Sparkles, History, Loader2, ChevronRight, ChevronDown,
  Crown, Zap, PanelLeftClose, PanelLeft, RotateCcw,
  Cpu, ArrowDown, Hash, Search, Sliders, Terminal, PenTool, BarChart3, Microscope, Settings
} from "lucide-react";
import { ComparisonChatPage } from "./ComparisonChatPage";
import CodeBlock from "@/components/CodeBlock";
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";

interface UiChatModel {
  id: string;
  name: string;
  icon: string;
  tier: "free" | "premium";
  desc: string;
  cost: string;
}

const fallbackChatModels: UiChatModel[] = [
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    icon: "🦙",
    tier: "free",
    desc: "Fast general assistant",
    cost: "0"
  },
  {
    id: "llama-3.1-8b",
    name: "Llama 3.1 8B",
    icon: "🦙",
    tier: "free",
    desc: "Low-latency assistant",
    cost: "0"
  }
];

const getApiBaseUrl = () => (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");

// Brand classification helper
const getModelBrand = (id: string, name: string): string => {
  const value = `${id} ${name}`.toLowerCase();
  if (value.includes("gpt") || value.includes("openai")) return "openai";
  if (value.includes("claude") || value.includes("anthropic")) return "anthropic";
  if (value.includes("gemini")) return "gemini";
  if (value.includes("deepseek") || value.includes("r1")) return "deepseek";
  if (value.includes("llama") || value.includes("meta")) return "meta";
  if (value.includes("kie") || value.includes("zex") || value.includes("premium")) return "kie";
  return "other";
};

// Brand UI Configurations
const brandConfigs: Record<string, {
  name: string;
  color: string;
  glow: string;
  icon: string;
  border: string;
  text: string;
  bg: string;
  activeBorder: string;
}> = {
  openai: {
    name: "OpenAI GPT",
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.12)",
    icon: "🧠",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    activeBorder: "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  gemini: {
    name: "Google Gemini",
    color: "#0ea5e9",
    glow: "rgba(14, 165, 233, 0.12)",
    icon: "✨",
    border: "border-sky-500/20 hover:border-sky-500/40",
    activeBorder: "border-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.15)]",
    text: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  anthropic: {
    name: "Anthropic Claude",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.12)",
    icon: "👑",
    border: "border-amber-500/20 hover:border-amber-500/40",
    activeBorder: "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  deepseek: {
    name: "DeepSeek AI",
    color: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.12)",
    icon: "🔍",
    border: "border-cyan-500/20 hover:border-cyan-500/40",
    activeBorder: "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]",
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  meta: {
    name: "Meta Llama",
    color: "#6366f1",
    glow: "rgba(99, 102, 241, 0.12)",
    icon: "🦙",
    border: "border-indigo-500/20 hover:border-indigo-500/40",
    activeBorder: "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]",
    text: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  kie: {
    name: "Zex Premium",
    color: "#d946ef",
    glow: "rgba(217, 70, 239, 0.12)",
    icon: "🔮",
    border: "border-fuchsia-500/20 hover:border-fuchsia-500/40",
    activeBorder: "border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.15)]",
    text: "text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
  },
  other: {
    name: "Diğer Modeller",
    color: "#94a3b8",
    glow: "rgba(148, 163, 184, 0.1)",
    icon: "🤖",
    border: "border-slate-500/20 hover:border-slate-500/40",
    activeBorder: "border-slate-500 shadow-[0_0_20px_rgba(148,163,184,0.1)]",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
  }
};

const getModelIcon = (id: string, name: string) => {
  const brand = getModelBrand(id, name);
  return brandConfigs[brand]?.icon || "🤖";
};

const normalizeChatModel = (model: any): UiChatModel | null => {
  const id = String(model?.id || model?.model_id || model?.provider_model_id || "").trim();
  if (!id) return null;

  const rawCost = Number(model?.cost_per_1k_tokens ?? model?.cost ?? 0);
  const safeCost = Number.isFinite(rawCost) ? rawCost : 0;
  const name = String(model?.name || id.replace(/[-_]/g, " "));

  return {
    id,
    name,
    icon: getModelIcon(id, name),
    tier: safeCost > 0 ? "premium" : "free",
    desc: String(model?.description || model?.desc || "Production-ready chat model"),
    cost: safeCost >= 1 ? Math.round(safeCost).toString() : safeCost.toFixed(2)
  };
};

// Suggested Prompts
const suggestedPrompts = [
  { icon: '💡', title: 'Code Help', prompt: 'React uygulamasında performans optimizasyonu nasıl yapılır?', gradient: 'from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-800' },
  { icon: '📝', title: 'Content Writing', prompt: 'Yapay zeka teknolojileri hakkında ilgi çekici blog başlıkları öner.', gradient: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-800' },
  { icon: '🎯', title: 'Strategy', prompt: 'Yeni çıkan bir SaaS ürünü için büyüme stratejisi tasarla.', gradient: 'from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800' },
  { icon: '🔍', title: 'Analysis', prompt: 'Girişim pazarında rakip analizi nasıl yapılır?', gradient: 'from-pink-500/10 to-rose-500/10 border-pink-200 dark:border-pink-800' },
];

// System Persona Presets
const systemPresets = [
  {
    id: "default",
    name: "Zex Default",
    icon: "🤖",
    iconComponent: Bot,
    desc: "Genel yapay zeka asistanı",
    prompt: ""
  },
  {
    id: "coder",
    name: "Yazılım Mimarı",
    icon: "💻",
    iconComponent: Terminal,
    desc: "Temiz, performanslı kod yazar",
    prompt: "Sen son derece yetkin, kıdemli bir yazılım mimarısın. Çözümlerini temiz kod kurallarına (Clean Code), modern tasarım kalıplarına ve güvenlik standartlarına uygun olarak sun. Kod yazarken açıklayıcı ve eğitici yorumlar ekle."
  },
  {
    id: "writer",
    name: "Metin Yazarı",
    icon: "✍️",
    iconComponent: PenTool,
    desc: "Etkileyici ve yaratıcı içerik üretir",
    prompt: "Sen ödüllü bir metin yazarı ve içerik üreticisisin. Yanıtlarını son derece akıcı, etkileyici, ikna edici ve dilbilgisi kurallarına mükemmel düzeyde uygun olarak yaz. SEO dostu yapıyı göz önünde bulundur."
  },
  {
    id: "analyst",
    name: "Stratejik Analist",
    icon: "📊",
    iconComponent: BarChart3,
    desc: "Veri odaklı, yapılandırılmış raporlama",
    prompt: "Sen deneyimli bir iş analisti ve finansal stratejistsin. Yanıtlarını tamamen veri odaklı, yapılandırılmış, SWOT analizi veya benzeri analitik çerçeveler kullanarak sun. Maddeler halinde ve tablolarla desteklenmiş net stratejiler oluştur."
  },
  {
    id: "researcher",
    name: "Araştırmacı",
    icon: "🔬",
    iconComponent: Microscope,
    desc: "Akademik ve kanıta dayalı bilgi",
    prompt: "Sen titiz bir bilimsel araştırmacısın. Yanıtlarını tamamen doğrulanabilir gerçeklere, bilimsel kanıtlara ve derinlemesine araştırmalara dayandır. Spekülatif ifadelerden kaçın, varsayımları belirt ve konuyu en ince ayrıntısına kadar açıkla."
  }
];

// Token streaming delay (ms) for natural typing feel
const STREAM_DELAY_MS = 14;

// Message content renderer with code blocks
const MessageContent = ({ content }: { content: string }) => {
  if (!content) return null;
  const parts = content.split(/(```\w*\n[\s\S]*?```)/g);
  return (
    <div className="space-y-4 leading-relaxed font-medium">
      {parts.map((part, idx) => {
        const codeMatch = part.match(/```(\w*)\n([\s\S]*?)```/);
        if (codeMatch) {
          const [, lang, code] = codeMatch;
          return (
            <div key={idx} className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
              <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{lang || 'CODE'}</span>
              </div>
              <CodeBlock code={code} language={lang || 'javascript'} />
            </div>
          );
        }
        if (part.trim()) {
          const formatted = part
            .replace(/`([^`]+)`/g, '<code class="bg-indigo-500/10 px-1.5 py-0.5 rounded text-indigo-400 text-[12px] font-mono border border-indigo-500/20">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-black text-white">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em class="italic text-slate-300">$1</em>')
            .replace(/^### (.+)$/gm, '<h3 class="text-sm font-black text-white uppercase tracking-widest mt-6 mb-2 border-l-2 border-indigo-500 pl-3">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-base font-black text-white uppercase tracking-[0.15em] mt-8 mb-3">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-lg font-black text-white uppercase tracking-[0.2em] mt-10 mb-4">$1</h1>')
            .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-300 mb-1">$1</li>')
            .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-300 mb-1">$1. $2</li>')
            .replace(/\n/g, '<br/>');

          const sanitized = DOMPurify.sanitize(formatted, {
            ALLOWED_TAGS: ['code', 'strong', 'em', 'h3', 'h2', 'h1', 'li', 'br', 'span', 'div', 'p'],
            ALLOWED_ATTR: ['class']
          });
          
          return <div key={idx} className="text-[14px] text-slate-300" dangerouslySetInnerHTML={{ __html: sanitized }} />;
        }
        return null;
      })}
    </div>
  );
};

interface Message { role: "user" | "assistant"; content: string; timestamp: string; }
interface Conversation { id: string; title?: string; messages: Message[]; model: string; total_tokens: number; total_credits: number; created_at: string; updated_at: string; }

const ChatPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("chat");
  
  // Sidebar Tabs: "engines" | "history"
  const [sidebarTab, setSidebarTab] = useState<"engines" | "history">("engines");
  
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [serverConversationId, setServerConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [showRightPanel, setShowRightPanel] = useState(window.innerWidth > 1280);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  
  // Accordion active state for brands
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    kie: true,
    openai: true,
    gemini: false,
    anthropic: false,
    deepseek: false,
    meta: false,
    other: false
  });

  // Selected system persona
  const [selectedPresetId, setSelectedPresetId] = useState("default");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tokenQueueRef = useRef<string[]>([]); // Queue for natural typing
  const isProcessingRef = useRef(false);
  const queryClient = useQueryClient();

  const toggleAccordion = (brand: string) => {
    setOpenAccordions(prev => ({ ...prev, [brand]: !prev[brand] }));
  };

  // Touch handlers for mobile swipe
  const touchStartX = useRef(0);
  const touchEndY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndYDiff = Math.abs(e.changedTouches[0].clientY - touchEndY.current);
    const touchEndXDiff = Math.abs(touchEndX - touchStartX.current);

    if (touchEndXDiff > 50 && touchEndXDiff > touchEndYDiff) {
      if (touchEndX > touchStartX.current) {
        setShowSidebar(true);
      } else {
        setShowSidebar(false);
      }
    }
  };

  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await apiService.get("/chat/conversations");
      return res;
    }
  });

  const { data: modelsData, isLoading: isLoadingModels, isError: isModelsError } = useQuery({
    queryKey: ["chatModels"],
    queryFn: async () => {
      const res = await apiService.get("/chat/models");
      const payload = (res as any)?.data || res || [];
      const models = Array.isArray((payload as any)?.models) ? (payload as any).models : payload;
      if (!Array.isArray(models)) return [];
      return models.map((m: any) => {
        const normalized = normalizeChatModel(m);
        if (normalized) return normalized;

        const modelId = String(m?.id || m?.model_id || m?.provider_model_id || "llama-3.3-70b");
        const modelName = String(m?.name || modelId.replace(/[-_]/g, " "));
        const rawCost = Number(m?.cost_per_1k_tokens ?? m?.cost ?? 0);
        const safeCost = Number.isFinite(rawCost) ? rawCost : 0;
        const displayCost = safeCost >= 1 ? Math.round(safeCost).toString() : safeCost.toFixed(2);
        m = { ...(typeof m === "object" && m ? m : {}), id: modelId, name: modelName, cost_per_1k_tokens: safeCost };
        
        return {
          id: modelId,
          name: modelName,
          icon: getModelIcon(modelId, modelName),
          tier: safeCost > 0 ? 'premium' : 'free',
          desc: m?.description || 'Production-ready chat model',
          cost: displayCost
        } as UiChatModel;
      });
    }
  });

  const availableModels: UiChatModel[] = modelsData?.length ? modelsData : fallbackChatModels;

  useEffect(() => {
    if (availableModels.length && !availableModels.some(model => model.id === selectedModel)) {
      setSelectedModel(availableModels[0].id);
    }
  }, [availableModels, selectedModel]);

  // Dynamic active brand selector
  const activeModelDetails = useMemo(() => {
    const found = availableModels.find(m => m.id === selectedModel);
    if (found) return found;
    return availableModels[0] || fallbackChatModels[0];
  }, [availableModels, selectedModel]);

  const activeBrandKey = useMemo(() => {
    return getModelBrand(activeModelDetails.id, activeModelDetails.name);
  }, [activeModelDetails]);

  const activeBrand = useMemo(() => {
    return brandConfigs[activeBrandKey] || brandConfigs.other;
  }, [activeBrandKey]);

  // Group models by brand
  const groupedModels = useMemo(() => {
    const groups: Record<string, UiChatModel[]> = {
      kie: [],
      openai: [],
      gemini: [],
      anthropic: [],
      deepseek: [],
      meta: [],
      other: []
    };
    
    availableModels.forEach(m => {
      if (modelSearch.trim() && !m.name.toLowerCase().includes(modelSearch.toLowerCase())) {
        return;
      }
      const brand = getModelBrand(m.id, m.name);
      if (groups[brand]) {
        groups[brand].push(m);
      } else {
        groups.other.push(m);
      }
    });
    
    return groups;
  }, [availableModels, modelSearch]);

  const activePreset = useMemo(() => {
    return systemPresets.find(p => p.id === selectedPresetId) || systemPresets[0];
  }, [selectedPresetId]);

  const { mutate: sendMessageFn } = useMutation({
    mutationFn: (data: any) => apiService.post("/chat", data),
    onMutate: () => setIsTyping(true),
    onSuccess: (response) => {
      const resData = response?.data || response;
      if (currentConversation) {
        const newMessage: Message = { role: "assistant", content: resData.response, timestamp: new Date().toISOString() };
        setCurrentConversation(prev => {
          if (!prev) return null;
          const messages = [...prev.messages];
          const lastMessage = messages[messages.length - 1];
          if (lastMessage?.role === "assistant" && !lastMessage.content) {
            messages[messages.length - 1] = newMessage;
          } else {
            messages.push(newMessage);
          }
          return { ...prev, id: resData.conversation_id || prev.id, messages };
        });
      }
      if (resData.conversation_id) setServerConversationId(resData.conversation_id);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessage(""); setIsTyping(false);
    },
    onError: () => setIsTyping(false),
  });

  const { mutate: deleteConversation } = useMutation({
    mutationFn: (id: string) => apiService.delete(`/chat/conversations/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["conversations"] }); setCurrentConversation(null); },
  });

  const scrollToBottom = useCallback(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), []);
  useEffect(() => { scrollToBottom(); }, [currentConversation?.messages?.length, isTyping, scrollToBottom]);

  // Check scroll position for "scroll down" button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [message]);

  // Natural typing: process token queue with delay
  const processTokenQueue = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const drain = () => {
      if (tokenQueueRef.current.length === 0) {
        isProcessingRef.current = false;
        return;
      }
      const token = tokenQueueRef.current.shift()!;
      setCurrentConversation(prev => {
        if (!prev) return null;
        const msgs = [...prev.messages];
        const last = msgs[msgs.length - 1];
        msgs[msgs.length - 1] = { ...last, content: last.content + token };
        return { ...prev, messages: msgs };
      });
      setTimeout(drain, STREAM_DELAY_MS);
    };
    drain();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isTyping) return;

    const userMessage: Message = { role: "user", content: message.trim(), timestamp: new Date().toISOString() };
    const userInput = message.trim();
    setMessage("");

    let conversation = currentConversation;
    if (conversation) {
      conversation = { ...conversation, messages: [...conversation.messages, userMessage] };
    } else {
      conversation = {
        id: `temp-${Date.now()}`, title: userInput.substring(0, 50) + (userInput.length > 50 ? "..." : ""),
        messages: [userMessage], model: selectedModel, total_tokens: 0, total_credits: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      };
    }
    setCurrentConversation(conversation);

    // Add empty assistant placeholder
    const assistantMessage: Message = { role: "assistant", content: "", timestamp: new Date().toISOString() };
    setCurrentConversation(prev => prev ? { ...prev, messages: [...prev.messages, assistantMessage] } : null);
    setIsTyping(true);
    tokenQueueRef.current = [];

    try {
      let token: string | null = null;
      try { const { data } = await supabase.auth.getSession(); token = data?.session?.access_token || null; } catch { }
      if (!token) token = sessionStorage.getItem('auth_token');
      if (!token || token === 'null' || token === 'undefined') throw new Error('No auth token');

      const response = await fetch(`${getApiBaseUrl()}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          message: userInput, 
          model: selectedModel, 
          conversation_id: serverConversationId || null,
          temperature, 
          max_tokens: maxTokens,
          system_prompt: activePreset.prompt || null,
          history: conversation.messages.filter((m: Message) => m.content?.trim()).map((m: Message) => ({ role: m.role, content: m.content }))
        })
      });
      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) { console.error('Stream error:', data.error); break; }
              if (data.content) {
                tokenQueueRef.current.push(data.content);
                processTokenQueue();
              }
              if (data.conversation_id) {
                setServerConversationId(data.conversation_id);
                setCurrentConversation(prev => prev ? { ...prev, id: data.conversation_id } : null);
              }
            } catch { }
          }
        }
      }

      // Wait for queue to drain
      await new Promise<void>(resolve => {
        const check = () => tokenQueueRef.current.length === 0 ? resolve() : setTimeout(check, 50);
        check();
      });
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

    } catch (error: any) {
      console.error('Streaming error:', error);
      setIsTyping(false);

      // Fallback to non-streaming API if stream connection fails
      try {
        await sendMessageFn({
          message: userInput,
          model: selectedModel,
          conversation_id: serverConversationId || null,
          temperature,
          max_tokens: maxTokens,
          system_prompt: activePreset.prompt || null,
          history: currentConversation?.messages?.filter((m: Message) => m.content?.trim())
            .map((m: Message) => ({ role: m.role, content: m.content })) || []
        });
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    }
  };

  const startNewConversation = () => { setCurrentConversation(null); setServerConversationId(null); setMessage(""); };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await apiService.get(`/chat/conversations/${conversationId}`);
      const convData = (response as any)?.data || response;

      if (convData && typeof convData.messages === 'string') {
        try { convData.messages = JSON.parse(convData.messages); } catch { convData.messages = []; }
      }

      setCurrentConversation(convData);
      setServerConversationId(conversationId);
      if (convData?.model) setSelectedModel(convData.model);
      setActiveTab("chat");
    } catch (error) { console.error("Failed to load conversation:", error); }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Extract conversations list - handle ALL possible response shapes
  const rawConv = conversations as any;
  const conversationsList: any[] =
    rawConv?.conversations ||
    rawConv?.data?.conversations ||
    (Array.isArray(rawConv?.data) ? rawConv.data : []) ||
    (Array.isArray(rawConv) ? rawConv : []);

  const currentModel = activeModelDetails;

  return (
    <div 
      className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#030712] text-white selection:bg-indigo-500/30"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Animated Dynamic Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.06, 0.09, 0.06],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ backgroundColor: activeBrand.color }}
          className="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full blur-[140px]"
        />
        <motion.div 
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.04, 0.07, 0.04],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          style={{ backgroundColor: activeBrand.color }}
          className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px]"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.025] brightness-120 contrast-125" />
      </div>

      {/* ═══ Left Sidebar (overlay on mobile) ═══ */}
      {showSidebar && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 md:hidden" onClick={() => setShowSidebar(false)} />
          
          <div className="fixed md:relative z-30 md:z-auto w-80 h-full border-r border-white/5 flex flex-col bg-black/40 backdrop-blur-2xl shadow-2xl">
            
            {/* Action Pill Selector - Mode Selector */}
            <div className="p-4 border-b border-white/5 flex flex-col gap-3">
              <button onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] border-t border-white/10">
                <Plus className="w-4 h-4" /> {t('chat.newChat', 'New Chat')}
              </button>

              {/* Sidebar Tabs Slider */}
              <div className="bg-white/[0.02] border border-white/5 p-1 rounded-xl flex items-center relative overflow-hidden">
                <button 
                  onClick={() => setSidebarTab("engines")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all z-10 ${sidebarTab === "engines" ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Cpu className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" /> Modeller
                </button>
                <button 
                  onClick={() => setSidebarTab("history")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all z-10 ${sidebarTab === "history" ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <History className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" /> Geçmiş ({conversationsList.length})
                </button>
              </div>
            </div>

            {/* Content area based on selected sidebarTab */}
            <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
              
              {/* --- ENGINES VIEW --- */}
              {sidebarTab === "engines" && (
                <div className="p-4 space-y-4 flex-1 flex flex-col">
                  {/* Search box with dynamic brand highlights */}
                  <div className="relative group">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${modelSearch ? activeBrand.text : 'text-slate-500'}`} />
                    <input 
                      type="text" 
                      placeholder={t('chat.searchModel', 'Model ara...')} 
                      value={modelSearch} 
                      onChange={e => setModelSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-[10px] bg-black/40 border border-white/5 rounded-xl text-slate-300 placeholder-slate-700 font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500/50" 
                    />
                  </div>

                  {/* Brand Grouped Accordions */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto scrollbar-hide">
                    {isLoadingModels && (
                      <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Catalog yükleniyor...
                      </div>
                    )}
                    
                    {Object.entries(groupedModels).map(([brandKey, models]) => {
                      if (models.length === 0) return null;
                      const bConfig = brandConfigs[brandKey] || brandConfigs.other;
                      const isOpen = openAccordions[brandKey];
                      
                      return (
                        <div key={brandKey} className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden transition-all">
                          {/* Accordion Header */}
                          <button
                            onClick={() => toggleAccordion(brandKey)}
                            className="w-full flex items-center justify-between p-3.5 bg-white/[0.01] hover:bg-white/[0.03] transition-all text-left"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{bConfig.icon}</span>
                              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-300">{bConfig.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{models.length}</span>
                              {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                            </div>
                          </button>

                          {/* Accordion Content */}
                          {isOpen && (
                            <div className="p-2 space-y-1.5 bg-black/40 border-t border-white/5">
                              {models.map((model) => {
                                const isSelected = selectedModel === model.id;
                                return (
                                  <button
                                    key={model.id}
                                    onClick={() => setSelectedModel(model.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all border group relative overflow-hidden ${
                                      isSelected
                                        ? `${bConfig.activeBorder} ${bConfig.bg} text-white`
                                        : 'bg-white/[0.01] border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5 hover:border-white/5'
                                    }`}
                                  >
                                    <div className="flex-1 text-left min-w-0">
                                      <div className={`font-black text-[11px] uppercase tracking-widest truncate ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                        {model.name}
                                      </div>
                                      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter truncate mt-0.5">{model.desc}</div>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border shrink-0 uppercase transition-all ${
                                      model.tier === 'free'
                                        ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                        : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                                    }`}>
                                      {model.tier === 'free' ? 'FREE' : `${model.cost} Kredi`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- CONVERSATIONS LOGS --- */}
              {sidebarTab === "history" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-hide">
                  {isLoadingConversations ? (
                    [1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse border border-white/5" />)
                  ) : conversationsList.length === 0 ? (
                    <div className="text-center py-16">
                      <History className="w-10 h-10 text-slate-800 mx-auto mb-4" />
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t('chat.noChats', 'No conversations yet')}</p>
                    </div>
                  ) : conversationsList.map((conv: any) => {
                    const isSelected = currentConversation?.id === conv.id;
                    return (
                      <div key={conv.id} onClick={() => loadConversation(conv.id)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all group border relative overflow-hidden ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/30 shadow-xl shadow-indigo-500/5'
                            : 'border-transparent bg-white/[0.01] hover:bg-white/5 hover:border-white/5'
                        }`}>
                        <div className="flex items-start justify-between gap-3 relative z-10">
                          <div className="flex-1 min-w-0">
                            <p className={`text-[12px] font-black uppercase tracking-widest truncate leading-tight transition-colors ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                              {conv.title || t('chat.untitled', "UNTITLED LOG")}
                            </p>
                            <p className="text-[10px] text-slate-600 font-medium truncate mt-2 leading-tight italic line-clamp-1 opacity-70">
                              "{conv.last_message}"
                            </p>
                            <div className="flex items-center gap-3 mt-3.5">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" /> {conv.message_count}
                              </span>
                              <div className="w-1 h-1 bg-slate-700 rounded-full" />
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                {new Date(conv.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                            className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-red-500/10 flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compare engines trigger */}
            <div className="p-4 border-t border-white/5 bg-black/10">
              <button onClick={() => setActiveTab("compare")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 group">
                <Zap className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" /> {t('chat.compare', 'Modelleri Karşılaştır')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ Center Interactive Generation Panel ═══ */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        {activeTab === "compare" ? (
          <ComparisonChatPage onBack={() => setActiveTab("chat")} />
        ) : (
          <>
            {/* Main Chat Header (Premium Glassmorphism) */}
            <div className="relative border-b border-white/5 bg-[#030712]/40 backdrop-blur-2xl flex-shrink-0 z-10">
              <div className="h-20 px-8 flex items-center justify-between">
                
                {/* Left Area - Active model brand badge */}
                <div className="flex items-center gap-6">
                  {!showSidebar && (
                    <button onClick={() => setShowSidebar(true)} className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-white/5 shadow-xl">
                      <PanelLeft className="w-5 h-5 animate-pulse" />
                    </button>
                  )}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-black/40 border ${activeBrand.border} shadow-2xl flex items-center justify-center text-2xl relative group transition-all duration-300`}>
                      <div className="absolute inset-0 bg-white/[0.01] rounded-2xl blur-xl group-hover:bg-white/[0.04] transition-all" />
                      <span className="relative z-10">{currentModel.icon}</span>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-[13px] font-black text-white uppercase tracking-[0.2em] leading-tight drop-shadow-sm truncate max-w-xs md:max-w-md">
                        {currentConversation?.title || t('chat.newChat', "ZexAi Chat Studio")}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[9px] font-black ${activeBrand.text} uppercase tracking-widest ${activeBrand.bg} px-2 py-0.5 rounded-md border ${activeBrand.border}`}>
                          {currentModel.name}
                        </span>
                        <div className="w-1 h-1 bg-slate-700 rounded-full" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {currentModel.tier === 'free' ? 'STANDART MOTOR' : 'PREMIUM ENGINES'}
                        </span>
                        {selectedPresetId !== "default" && (
                          <>
                            <div className="w-1 h-1 bg-slate-700 rounded-full" />
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                              {activePreset.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Area - Stream and settings selectors */}
                <div className="flex items-center gap-4">
                  <AnimatePresence>
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 backdrop-blur-md"
                      >
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{t('chat.typing', 'GENERATING...')}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button 
                    onClick={() => setShowRightPanel(!showRightPanel)} 
                    className={`p-3 rounded-2xl transition-all shadow-xl border border-white/10 group ${showRightPanel ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-white bg-white/5'}`}
                    title="Parametre Paneli"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  <div className="h-8 w-px bg-white/5 mx-2" />
                  
                  <button onClick={startNewConversation} className="p-3 text-slate-500 hover:text-white bg-white/5 hover:bg-indigo-600/20 rounded-2xl transition-all shadow-xl border border-white/10 group" title="Sohbeti Yenile">
                    <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* Conversation Messages Content View */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto relative overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as any }}>
              <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                
                {/* Empty State / Suggestions Dashboard */}
                {!currentConversation?.messages?.length && (
                  <div className="flex flex-col items-center justify-center pt-8 pb-12">
                    <div className="relative mb-8 group">
                      <div className="absolute inset-0 bg-indigo-500/20 rounded-[2.5rem] blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                      <div className="w-24 h-24 bg-black/40 backdrop-blur-2xl rounded-[2.2rem] shadow-2xl flex items-center justify-center border border-white/10 relative z-10 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/15 to-transparent" />
                        <Sparkles className="w-10 h-10 text-indigo-400" />
                      </div>
                    </div>
                    
                    <h2 className="text-3xl font-black text-white mb-3 text-center uppercase tracking-tight italic">
                      ZEXAI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-500">STUDIO</span>
                    </h2>
                    <p className="text-slate-500 text-[10.5px] font-black uppercase tracking-[0.25em] mb-10 max-w-md text-center leading-relaxed">
                      Lüks tasarım ve yüksek performanslı yapay zeka motorları ile çalışın.
                    </p>
                    
                    {/* Visual Prompt Card Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                      {suggestedPrompts.map((item, idx) => (
                        <button key={idx} onClick={() => setMessage(item.prompt)}
                          className="p-5 rounded-3xl text-left bg-black/40 backdrop-blur-xl border border-white/5 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden">
                          <div className="flex items-center gap-3.5 mb-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">{item.icon}</div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.title}</span>
                          </div>
                          <span className="text-[11.5px] text-slate-500 font-medium line-clamp-2 leading-relaxed italic">"{item.prompt}"</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages List Render */}
                {currentConversation?.messages?.map((msg, index) => (
                  <div key={index} className={`flex gap-4.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                    
                    {/* Assistant Bubble Icon */}
                    {msg.role === 'assistant' && (
                      <div className={`w-10 h-10 rounded-2xl bg-black/40 border ${activeBrand.border} flex items-center justify-center flex-shrink-0 mt-1 shadow-2xl relative overflow-hidden group`}>
                        <div className={`absolute inset-0 ${activeBrand.bg} transition-all`} />
                        <Bot className={`w-5 h-5 ${activeBrand.text} relative z-10`} />
                      </div>
                    )}
                    
                    {/* Main bubble */}
                    <div className={`max-w-[85%] min-w-[100px] ${msg.role === 'user' ? 'order-first' : ''}`}>
                      <div className={`px-6 py-4 rounded-[2rem] shadow-2xl relative overflow-hidden border ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-lg border-white/20'
                        : 'bg-black/40 backdrop-blur-xl text-slate-200 rounded-tl-lg border-white/5'}`}>
                        {msg.role === 'assistant' ? (
                          <MessageContent content={msg.content} />
                        ) : (
                          <p className="whitespace-pre-wrap text-[14px] leading-relaxed font-medium">{msg.content}</p>
                        )}
                        {msg.role === 'assistant' && !msg.content && isTyping && (
                          <div className="flex gap-1.5 py-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                      
                      {/* Message Meta Info Row */}
                      <div className={`flex items-center gap-3 mt-2.5 px-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.content && (
                          <button onClick={() => copyToClipboard(msg.content, `${index}`)}
                            className="p-1 text-slate-600 hover:text-white transition-colors">
                            {copiedMessageId === `${index}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* User Bubble Icon */}
                    {msg.role === 'user' && (
                      <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-violet-500/10 group-hover:bg-violet-500/20 transition-all" />
                        <User className="w-5 h-5 text-violet-400 relative z-10" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Float Scroll Controller */}
              {showScrollDown && (
                <button onClick={scrollToBottom}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 rounded-full shadow-2xl transition-all z-10 active:scale-95">
                  <ArrowDown className="w-4 h-4 text-white" />
                </button>
              )}
            </div>

            {/* Chat Composer Section */}
            <div className="border-t border-white/5 bg-[#030712]/40 backdrop-blur-2xl p-6 relative z-10">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
                <div className={`absolute inset-0 rounded-3xl blur-3xl opacity-20 pointer-events-none transition-all duration-300`} style={{ backgroundColor: activeBrand.color }} />
                
                <div className="flex items-end gap-3 bg-black/60 backdrop-blur-3xl rounded-[2rem] p-3 border border-white/5 focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all shadow-2xl relative z-10">
                  <textarea
                    ref={textareaRef}
                    placeholder={`${currentModel.name} ile konuşun...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={1}
                    disabled={isTyping}
                    className="flex-1 px-5 py-3.5 bg-transparent border-0 resize-none focus:ring-0 focus:outline-none text-slate-100 placeholder-slate-700 text-[14.5px] font-medium max-h-[180px] scrollbar-hide"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                  />
                  <button type="submit" disabled={isTyping || !message.trim()}
                    className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:bg-slate-800 disabled:from-slate-800 disabled:to-slate-850 disabled:text-slate-600 text-white rounded-[1.25rem] transition-all shadow-xl shadow-indigo-600/10 active:scale-90 border-t border-white/10 shrink-0">
                    {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
             
                {/* Micro info footer row */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeBrand.color }} />
                    {currentModel.name} · {currentModel.tier === 'free' ? 'FREE ENGINE' : 'PREMIUM COMPILATION'}
                  </p>
                  <div className="w-1 h-1 bg-slate-800 rounded-full" />
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    Shift+Enter ile yeni satır
                  </p>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {/* ═══ Right Studio Settings Panel (Desktop only, toggleable) ═══ */}
      {showRightPanel && (
        <div className="w-72 h-full border-l border-white/5 flex flex-col bg-black/40 backdrop-blur-2xl shadow-2xl relative overflow-y-auto p-6 space-y-6 z-10 shrink-0">
          
          {/* Section 1: Title */}
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2 mb-4">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              PARAMETRELER
            </h2>
            <div className="h-px bg-white/5 w-full" />
          </div>

          {/* Temperature Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yaratıcılık</span>
              <span className="text-[10px] font-mono font-black text-indigo-400">{temperature.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1.5" 
              step="0.1" 
              value={temperature} 
              onChange={e => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[8.5px] font-black text-slate-600 uppercase tracking-tighter">
              <span>Hassas</span>
              <span>Dengeli</span>
              <span>Yaratıcı</span>
            </div>
          </div>

          {/* Max Response Tokens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yanıt Limiti</span>
              <span className="text-[10px] font-mono font-black text-indigo-400">{maxTokens}</span>
            </div>
            <input 
              type="range" 
              min="500" 
              max="8000" 
              step="100" 
              value={maxTokens} 
              onChange={e => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[8.5px] font-black text-slate-600 uppercase tracking-tighter">
              <span>Kısa</span>
              <span>Uzun</span>
            </div>
          </div>

          {/* Section 2: Personas Title */}
          <div className="pt-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              SİSTEM PERSONASI
            </h2>
            <div className="h-px bg-white/5 w-full" />
          </div>

          {/* Persona Selection Grid */}
          <div className="space-y-2.5">
            {systemPresets.map((preset) => {
              const IconComp = preset.iconComponent;
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 group relative overflow-hidden ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.08)]'
                      : 'border-white/5 bg-white/[0.01] hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <div className={`p-2 rounded-xl border shrink-0 transition-all ${
                    isSelected ? 'border-indigo-400/20 bg-indigo-500/10 text-indigo-400' : 'border-white/5 bg-white/5 text-slate-500 group-hover:text-slate-300'
                  }`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className={`block text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                      {preset.name}
                    </span>
                    <span className="block text-[9.5px] font-bold text-slate-600 uppercase tracking-tighter truncate mt-1">
                      {preset.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
