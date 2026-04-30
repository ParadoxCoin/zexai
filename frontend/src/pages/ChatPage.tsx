// Build v2.1 - Fixed conversation history display
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import {
  MessageCircle, Send, Plus, Trash2, Bot, User,
  Copy, Check, Sparkles, History, Loader2, ChevronRight, ChevronDown,
  Crown, Zap, PanelLeftClose, PanelLeft, RotateCcw,
  Cpu, ArrowDown, Hash, Search
} from "lucide-react";
import { ComparisonChatPage } from "./ComparisonChatPage";
import CodeBlock from "@/components/CodeBlock";
import { useTranslation } from 'react-i18next';

// Available AI Models - Free (Groq + OpenRouter Free) + Premium (OpenRouter Paid)
// Models will be fetched from API


// Suggested Prompts
const suggestedPrompts = [
  { icon: '💡', title: 'Code Help', prompt: 'How do I optimize a React component?', gradient: 'from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-800' },
  { icon: '📝', title: 'Content Writing', prompt: 'Suggest SEO-friendly blog titles', gradient: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-800' },
  { icon: '🎯', title: 'Strategy', prompt: 'Suggest a growth strategy for a SaaS product', gradient: 'from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800' },
  { icon: '🔍', title: 'Analysis', prompt: 'How to do competitive analysis?', gradient: 'from-pink-500/10 to-rose-500/10 border-pink-200 dark:border-pink-800' },
  { icon: '🌍', title: 'Translation', prompt: 'Translate this text to English:', gradient: 'from-violet-500/10 to-indigo-500/10 border-violet-200 dark:border-violet-800' },
  { icon: '📊', title: 'Data Analysis', prompt: 'How to write Excel formulas?', gradient: 'from-cyan-500/10 to-sky-500/10 border-cyan-200 dark:border-cyan-800' },
];

// Token streaming delay (ms) for natural typing feel
const STREAM_DELAY_MS = 18;

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
            .replace(/`([^`]+)`/g, '<code class="bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-400 text-[12px] font-mono border border-emerald-500/20">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-black text-white">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em class="italic text-slate-300">$1</em>')
            .replace(/^### (.+)$/gm, '<h3 class="text-sm font-black text-white uppercase tracking-widest mt-6 mb-2 border-l-2 border-emerald-500 pl-3">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-base font-black text-white uppercase tracking-[0.15em] mt-8 mb-3">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-lg font-black text-white uppercase tracking-[0.2em] mt-10 mb-4">$1</h1>')
            .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-300 mb-1">$1</li>')
            .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-300 mb-1">$1. $2</li>')
            .replace(/\n/g, '<br/>');
          return <div key={idx} className="text-[14px] text-slate-300" dangerouslySetInnerHTML={{ __html: formatted }} />;
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
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [serverConversationId, setServerConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [showFreeModels, setShowFreeModels] = useState(true);
  const [showPremiumModels, setShowPremiumModels] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tokenQueueRef = useRef<string[]>([]); // Queue for natural typing
  const isProcessingRef = useRef(false);
  const queryClient = useQueryClient();

  // Swipe logic for sidebar
  const touchStartX = useRef(0);
  const touchEndY = useRef(0); // For identifying vertical vs horizontal

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndYDiff = Math.abs(e.changedTouches[0].clientY - touchEndY.current);
    const touchEndXDiff = Math.abs(touchEndX - touchStartX.current);

    // Only trigger if horizontal swipe is larger than vertical (prevents accidental triggers during scrolling)
    if (touchEndXDiff > 50 && touchEndXDiff > touchEndYDiff) {
      if (touchEndX > touchStartX.current) {
        // Swipe Right -> Open Sidebar
        setShowSidebar(true);
      } else {
        // Swipe Left -> Close Sidebar
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

  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ["chatModels"],
    queryFn: async () => {
      const res = await apiService.get("/chat/models");
      // Map API models to UI format
      const models = (res as any)?.data || res || [];
      return models.map((m: any) => {
        const rawCost = m.cost_per_1k_tokens;
        const displayCost = rawCost >= 1 ? Math.round(rawCost).toString() : rawCost.toFixed(2);
        
        return {
          id: m.id,
          name: m.name,
          icon: m.id.includes('llama') ? '🦙' : m.id.includes('gpt') ? '🧠' : m.id.includes('claude') ? '👑' : m.id.includes('gemini') ? '✨' : '🤖',
          tier: m.cost_per_1k_tokens > 0 ? 'premium' : 'free',
          desc: m.description || 'AI Model',
          cost: displayCost
        };
      });

    }
  });

  const availableModels = modelsData || [];


  useEffect(() => {
    console.log("[DEBUG] conversations state:", conversations);
  }, [conversations]);

  const { mutate: sendMessageFn } = useMutation({
    mutationFn: (data: any) => apiService.post("/chat", data),
    onMutate: () => setIsTyping(true),
    onSuccess: (response) => {
      const resData = response?.data || response;
      if (currentConversation) {
        const newMessage: Message = { role: "assistant", content: resData.response, timestamp: new Date().toISOString() };
        setCurrentConversation(prev => prev ? { ...prev, id: resData.conversation_id || prev.id, messages: [...prev.messages, newMessage] } : null);
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
      if (!token) token = localStorage.getItem('auth_token');
      if (!token || token === 'null' || token === 'undefined') throw new Error('No auth token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          message: userInput, model: selectedModel, conversation_id: serverConversationId || null,
          temperature, max_tokens: maxTokens,
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
          history: currentConversation?.messages?.filter((m: Message) => m.content?.trim())
            .map((m: Message) => ({ role: m.role, content: m.content })) || []
        });
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        // Could add a toast notification here if available
      }
    }
  };

  const startNewConversation = () => { setCurrentConversation(null); setServerConversationId(null); setMessage(""); };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await apiService.get(`/chat/conversations/${conversationId}`);
      const convData = (response as any)?.data || response;

      // Ensure messages is an array (might be JSON string from DB)
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
    rawConv?.conversations ||           // Direct: {conversations: [...]}
    rawConv?.data?.conversations ||     // Wrapped: {data: {conversations: [...]}}
    (Array.isArray(rawConv?.data) ? rawConv.data : []) ||  // Array: {data: [...]}
    (Array.isArray(rawConv) ? rawConv : []);                // Direct array: [...]

  console.log("[DEBUG] conversationsList length:", conversationsList.length);
  const currentModel = (availableModels && availableModels.length > 0)
    ? (availableModels.find((m: any) => m.id === selectedModel) || availableModels[0])
    : { id: "loading", name: "Yükleniyor...", icon: "⏳", tier: "free", desc: "", cost: 0 };

  const filteredModels = availableModels.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()));
  const freeModels = filteredModels.filter(m => m.tier === 'free');
  const premiumModels = filteredModels.filter(m => m.tier === 'premium');

  return (
    <div 
      className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#030712] text-white selection:bg-emerald-500/30"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
      </div>

      {/* ═══ Left Sidebar (overlay on mobile) ═══ */}
      {showSidebar && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden" onClick={() => setShowSidebar(false)} />
          <div className="fixed md:relative z-30 md:z-auto w-80 h-full border-r border-white/5 flex flex-col bg-black/40 backdrop-blur-2xl shadow-2xl">
            {/* New Chat + Toggle */}
            <div className="p-4 border-b border-white/5">
              <button onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] border-t border-white/10">
                <Plus className="w-4 h-4" /> {t('chat.newChat', 'INITIALIZE NEURAL CHAT')}
              </button>
            </div>

            {/* Model Selector */}
            <div className="p-4 border-b border-white/5 max-h-[45vh] flex flex-col">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder={t('chat.searchModel', 'FILTER ENGINES...')} value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-[10px] bg-black/40 border border-white/5 rounded-xl text-slate-300 placeholder-slate-700 font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
              </div>

              <div className="overflow-y-auto space-y-1.5 flex-1 scrollbar-hide">
                {/* 🆓 Free Section */}
                {freeModels.length > 0 && (
                  <>
                    <button onClick={() => setShowFreeModels(!showFreeModels)}
                      className="w-full flex items-center gap-2 px-1 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-emerald-400 transition-colors">
                      {showFreeModels ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      STANDARD ENGINES ({freeModels.length})
                    </button>
                    {showFreeModels && freeModels.map((model) => (
                      <button key={model.id} onClick={() => setSelectedModel(model.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all border group relative overflow-hidden ${selectedModel === model.id
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-lg'
                          : 'bg-white/[0.02] border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                        <span className="text-lg relative z-10 opacity-60 group-hover:opacity-100 transition-opacity">{model.icon}</span>
                        <div className="flex-1 text-left min-w-0 relative z-10">
                          <div className={`font-black text-[11px] uppercase tracking-widest truncate ${selectedModel === model.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{model.name}</div>
                          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter truncate">{model.desc}</div>
                        </div>
                        <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 shrink-0 relative z-10 uppercase">FREE</span>
                      </button>
                    ))}
                  </>
                )}

                {/* 💎 Premium Section */}
                {premiumModels.length > 0 && (
                  <>
                    <button onClick={() => setShowPremiumModels(!showPremiumModels)}
                      className="w-full flex items-center gap-2 px-1 py-2 mt-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-amber-400 transition-colors">
                      {showPremiumModels ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      PREMIUM ENGINES ({premiumModels.length})
                    </button>
                    {showPremiumModels && premiumModels.map((model) => (
                      <button key={model.id} onClick={() => setSelectedModel(model.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all border group relative overflow-hidden ${selectedModel === model.id
                          ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg'
                          : 'bg-white/[0.02] border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                        <span className="text-lg relative z-10 opacity-60 group-hover:opacity-100 transition-opacity">{model.icon}</span>
                        <div className="flex-1 text-left min-w-0 relative z-10">
                          <div className={`font-black text-[11px] uppercase tracking-widest truncate ${selectedModel === model.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{model.name}</div>
                          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter truncate">{model.desc}</div>
                        </div>
                        <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20 shrink-0 relative z-10 uppercase">{model.cost} ZEX</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* History Header */}
            <div className="px-4 pt-6 pb-2 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('chat.pastChats', 'TERMINAL LOGS')}</p>
              <span className="text-[9px] font-black text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{conversationsList.length}</span>
            </div>

            {/* Conversation History */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
              <div className="space-y-1.5">
                {isLoadingConversations ? (
                  [1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse border border-white/5" />)
                ) : conversationsList.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-10 h-10 text-slate-800 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t('chat.noChats', 'NO NEURAL LOGS FOUND')}</p>
                  </div>
                ) : conversationsList.map((conv: any) => (
                  <div key={conv.id} onClick={() => loadConversation(conv.id)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all group border relative overflow-hidden ${currentConversation?.id === conv.id
                      ? 'bg-emerald-500/10 border-emerald-500/30 shadow-xl'
                      : 'border-transparent bg-white/[0.01] hover:bg-white/5 hover:border-white/5'
                      }`}>
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-black uppercase tracking-widest truncate leading-tight transition-colors ${currentConversation?.id === conv.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                          {conv.title || t('chat.untitled', "UNTITLED LOG")}
                        </p>
                        <p className="text-[10px] text-slate-600 font-medium truncate mt-1.5 leading-tight italic line-clamp-1 opacity-60">"{conv.last_message}"</p>
                        <div className="flex items-center gap-3 mt-3">
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
                ))}
              </div>
            </div>

            {/* Compare button at bottom */}
            <div className="p-4 border-t border-white/5">
              <button onClick={() => setActiveTab("compare")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 group">
                <Zap className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" /> {t('chat.compare', 'DIAGNOSTIC COMPARISON')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === "compare" ? (
          <ComparisonChatPage onBack={() => setActiveTab("chat")} />
        ) : (
          <>
            {/* Chat Header (Institutional Dark) */}
            <div className="relative border-b border-white/5 bg-white/[0.01] backdrop-blur-xl flex-shrink-0 z-10">
              <div className="h-20 px-8 flex items-center justify-between">
                {/* Left */}
                <div className="flex items-center gap-6">
                  {!showSidebar && (
                    <button onClick={() => setShowSidebar(true)} className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10">
                      <PanelLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 shadow-2xl flex items-center justify-center text-2xl relative group">
                       <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl group-hover:bg-emerald-500/20 transition-all" />
                       <span className="relative z-10">{currentModel.icon}</span>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-[13px] font-black text-white uppercase tracking-[0.2em] leading-tight drop-shadow-sm">
                        {currentConversation?.title || t('chat.newChat', "NEURAL SESSION")}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          {currentModel.name}
                        </span>
                        <div className="w-1 h-1 bg-slate-700 rounded-full" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {currentModel.tier === 'free' ? 'STANDARD CORE' : 'PREMIUM CORE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right */}
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
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{t('chat.typing', 'SYNTHESIZING...')}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="h-8 w-px bg-white/5 mx-2" />
                  
                  <button onClick={startNewConversation} className="p-3 text-slate-500 hover:text-white bg-white/5 hover:bg-emerald-600/20 rounded-2xl transition-all shadow-xl border border-white/10 group" title="Yeni Sohbet">
                    <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto relative overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as any }}>
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {/* Empty State */}
                {!currentConversation?.messages?.length && (
                  <div className="flex flex-col items-center justify-center pt-12 pb-16">
                    <div className="relative mb-12 group">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-[2.5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <div className="w-28 h-28 bg-black/40 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-white/10 relative z-10 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                        <img src="/logo192.png" alt="ZexAi" className="w-16 h-16 object-contain relative z-10" />
                      </div>
                    </div>
                    <h2 className="text-4xl font-black text-white mb-4 text-center uppercase tracking-tighter italic">
                      {t('chat.emptyTitle', 'SYSTEM ')}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                        {t('chat.emptyTitleHighlight', 'READY')}
                      </span>
                    </h2>
                    <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] mb-12 max-w-md text-center leading-relaxed">
                      {t('chat.emptyDesc', 'INITIALIZE NEURAL INTERACTION. ASK QUESTIONS, GENERATE CODE, OR EXECUTE COMPLEX ANALYSES.')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
                      {suggestedPrompts.map((item, idx) => (
                        <button key={idx} onClick={() => setMessage(item.prompt)}
                          className="p-5 rounded-3xl text-left bg-black/40 backdrop-blur-xl border border-white/5 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group relative overflow-hidden">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">{item.icon}</div>
                            <span className="text-[11px] font-black text-white uppercase tracking-widest">{item.title}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed italic">"{item.prompt}"</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages List */}
                {currentConversation?.messages?.map((msg, index) => (
                  <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                    {msg.role === 'assistant' && (
                      <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-all" />
                        <Bot className="w-5 h-5 text-emerald-400 relative z-10" />
                      </div>
                    )}
                    <div className={`max-w-[85%] min-w-[100px] ${msg.role === 'user' ? 'order-first' : ''}`}>
                      <div className={`px-6 py-4 rounded-[2rem] shadow-2xl relative overflow-hidden border ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-lg border-white/20'
                        : 'bg-black/40 backdrop-blur-xl text-slate-200 rounded-tl-lg border-white/5'}`}>
                        {msg.role === 'assistant' ? (
                          <MessageContent content={msg.content} />
                        ) : (
                          <p className="whitespace-pre-wrap text-[14px] leading-relaxed font-medium">{msg.content}</p>
                        )}
                        {msg.role === 'assistant' && !msg.content && isTyping && (
                          <div className="flex gap-1.5 py-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                      {/* Meta row */}
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
                    {msg.role === 'user' && (
                      <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-purple-500/10 group-hover:bg-purple-500/20 transition-all" />
                        <User className="w-5 h-5 text-purple-400 relative z-10" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to bottom button */}
              {showScrollDown && (
                <button onClick={scrollToBottom}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all z-10">
                  <ArrowDown className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-white/5 bg-black/40 backdrop-blur-2xl p-6 relative z-10">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
                <div className="absolute inset-0 bg-emerald-500/5 rounded-3xl blur-2xl opacity-50 pointer-events-none" />
                <div className="flex items-end gap-3 bg-black/60 backdrop-blur-3xl rounded-[2rem] p-3 border border-white/5 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/5 transition-all shadow-2xl relative z-10">
                  <textarea
                    ref={textareaRef}
                    placeholder={t('chat.typeMsg', "ENTER NEURAL COMMAND...")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={1}
                    disabled={isTyping}
                    className="flex-1 px-5 py-3 bg-transparent border-0 resize-none focus:ring-0 focus:outline-none text-slate-100 placeholder-slate-700 text-[14px] font-medium max-h-[200px] scrollbar-hide"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                  />
                  <button type="submit" disabled={isTyping || !message.trim()}
                    className="w-12 h-12 flex items-center justify-center bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-[1.25rem] transition-all shadow-xl shadow-emerald-600/20 active:scale-90 border-t border-white/10 shrink-0">
                    {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {currentModel.name} · {currentModel.tier === 'free' ? 'STANDARD' : 'PREMIUM'} ENGINE ACTIVE
                  </p>
                  <div className="w-1 h-1 bg-slate-800 rounded-full" />
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    SHIFT+ENTER FOR MULTILINE COMMAND
                  </p>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;