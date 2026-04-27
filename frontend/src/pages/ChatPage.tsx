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
    <div className="space-y-3 leading-relaxed">
      {parts.map((part, idx) => {
        const codeMatch = part.match(/```(\w*)\n([\s\S]*?)```/);
        if (codeMatch) {
          const [, lang, code] = codeMatch;
          return <CodeBlock key={idx} code={code} language={lang || 'javascript'} />;
        }
        if (part.trim()) {
          const formatted = part
            .replace(/`([^`]+)`/g, '<code class="bg-gray-200/80 dark:bg-gray-600/80 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300 text-[13px] font-mono">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
            .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
            .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$1. $2</li>')
            .replace(/\n/g, '<br/>');
          return <div key={idx} className="text-[14px]" dangerouslySetInnerHTML={{ __html: formatted }} />;
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
      className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-gray-900"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ═══ Left Sidebar (overlay on mobile) ═══ */}
      {showSidebar && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setShowSidebar(false)} />
          <div className="fixed md:relative z-30 md:z-auto w-72 h-full border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800 md:bg-gray-50/50 md:dark:bg-gray-800/50">
            {/* New Chat + Toggle */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <button onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-[0.98]">
                <Plus className="w-4 h-4" /> {t('chat.newChat', 'Yeni Sohbet')}
              </button>
            </div>

            {/* Model Selector */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 max-h-[45vh] flex flex-col">
              {/* Search */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder={t('chat.searchModel', 'Model ara...')} value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>

              <div className="overflow-y-auto space-y-1 flex-1" style={{ scrollbarWidth: 'thin' }}>
                {/* 🆓 Free Section */}
                {freeModels.length > 0 && (
                  <>
                    <button onClick={() => setShowFreeModels(!showFreeModels)}
                      className="w-full flex items-center gap-1.5 px-1 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors">
                      {showFreeModels ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      🆓 Free ({freeModels.length})
                    </button>
                    {showFreeModels && freeModels.map((model) => (
                      <button key={model.id} onClick={() => setSelectedModel(model.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all ${selectedModel === model.id
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                        <span className="text-sm">{model.icon}</span>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-[11px] truncate">{model.name}</div>
                          <div className="text-[9px] opacity-50 truncate">{model.desc}</div>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">FREE</span>
                        {selectedModel === model.id && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                      </button>
                    ))}
                  </>
                )}

                {/* 💎 Premium Section */}
                {premiumModels.length > 0 && (
                  <>
                    <button onClick={() => setShowPremiumModels(!showPremiumModels)}
                      className="w-full flex items-center gap-1.5 px-1 py-1 mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors">
                      {showPremiumModels ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      💎 Premium ({premiumModels.length})
                    </button>
                    {showPremiumModels && premiumModels.map((model) => (
                      <button key={model.id} onClick={() => setSelectedModel(model.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all ${selectedModel === model.id
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                        <span className="text-sm">{model.icon}</span>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-[11px] truncate">{model.name}</div>
                          <div className="text-[9px] opacity-50 truncate">{model.desc}</div>
                        </div>
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">{model.cost}cr</span>
                        {selectedModel === model.id && <Check className="w-3 h-3 text-amber-500 shrink-0" />}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* History Header */}
            <div className="px-3 pt-3 pb-1 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">{t('chat.pastChats', 'Geçmiş Sohbetler')}</p>
              <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{conversationsList.length}</span>
            </div>

            {/* Conversation History - always visible */}
            <div className="flex-1 overflow-y-auto px-3 pb-2">
              <div className="space-y-1">
                {isLoadingConversations ? (
                  [1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)
                ) : conversationsList.length === 0 ? (
                  <div className="text-center py-10">
                    <History className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">{t('chat.noChats', 'Henüz sohbet yok')}</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{t('chat.firstMsg', 'İlk mesajınızı yazın!')}</p>
                  </div>
                ) : conversationsList.map((conv: any) => (
                  <div key={conv.id} onClick={() => loadConversation(conv.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all group border ${currentConversation?.id === conv.id
                      ? 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-700 shadow-sm'
                      : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600'
                      }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate leading-tight">
                          {conv.title || t('chat.untitled', "Başlıksız Sohbet")}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-1 leading-tight">{conv.last_message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                            {conv.message_count} {t('chat.msgCount', 'mesaj')}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(conv.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                        className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compare button at bottom */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setActiveTab("compare")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-[0.98]">
                <Zap className="w-4 h-4" /> {t('chat.compare', 'Model Karşılaştır')}
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
            {/* Chat Header (Premium Gradient) */}
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex-shrink-0 shadow-md">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
              <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 40" fill="none" className="h-4 sm:h-6 w-full text-gray-50 dark:text-gray-900" preserveAspectRatio="none"><path d="M0 40V0C240 26.6667 480 40 720 40C960 40 1200 26.6667 1440 0V40H0Z" fill="currentColor" /></svg>
              </div>
              
              <div className="relative h-16 px-4 flex items-center justify-between z-10 pb-2">
                {/* Left */}
                <div className="flex-1 flex items-center justify-start">
                  <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                    {showSidebar ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                  </button>
                </div>

                {/* Center */}
                <div className="flex-1 flex items-center justify-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner flex items-center justify-center text-lg border border-white/30`}>
                    {currentModel.icon}
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-bold text-white leading-tight drop-shadow-sm">{currentConversation?.title || t('chat.newChat', "Yeni Sohbet")}</h3>
                    <p className="text-xs text-emerald-100 font-medium flex items-center justify-center gap-1">
                      <Cpu className="w-3.5 h-3.5" /> {currentModel.name}
                    </p>
                  </div>
                </div>

                {/* Right */}
                <div className="flex-1 flex items-center justify-end gap-2">
                  {isTyping && (
                    <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-100 mr-2 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      {t('chat.typing', 'Yazıyor...')}
                    </span>
                  )}
                  <button onClick={startNewConversation} className="p-2 text-emerald-100 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all shadow-sm border border-white/10" title="Yeni Sohbet">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto relative overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as any }}>
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {/* Empty State */}
                {!currentConversation?.messages?.length && (
                  <div className="flex flex-col items-center justify-center pt-8 pb-12">
                    <div className="relative mb-8 group">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl flex items-center justify-center border border-gray-100 dark:border-gray-700 relative z-10">
                        <img src="/logo192.png" alt="ZexAi" className="w-14 h-14 object-contain" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 mb-3 text-center">
                      {t('chat.emptyTitle', 'Size nasıl yardımcı olabilirim?')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md text-center text-sm leading-relaxed">
                      {t('chat.emptyDesc', 'Yapay zeka asistanınız hazır. İstediğiniz herhangi bir konuda soru sorabilir, kod yazdırabilir veya beyin fırtınası yapabilirsiniz.')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                      {suggestedPrompts.map((item, idx) => (
                        <button key={idx} onClick={() => setMessage(item.prompt)}
                          className={`p-4 rounded-2xl text-left bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all group relative overflow-hidden`}>
                          <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${item.gradient.split(' ')[0]} opacity-0 group-hover:opacity-100 transition-opacity`} />
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{item.icon}</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{item.title}</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages List */}
                {currentConversation?.messages?.map((msg, index) => (
                  <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] min-w-[60px] ${msg.role === 'user' ? 'order-first' : ''}`}>
                      <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-md shadow-lg shadow-emerald-500/10'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-md border border-gray-200 dark:border-gray-700'}`}>
                        {msg.role === 'assistant' ? (
                          <MessageContent content={msg.content} />
                        ) : (
                          <p className="whitespace-pre-wrap text-[14px]">{msg.content}</p>
                        )}
                        {msg.role === 'assistant' && !msg.content && isTyping && (
                          <div className="flex gap-1 py-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                      {/* Meta row */}
                      <div className={`flex items-center gap-2 mt-1 px-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        <span className="text-[10px] text-gray-400">
                          {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.content && (
                          <button onClick={() => copyToClipboard(msg.content, `${index}`)}
                            className="p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors">
                            {copiedMessageId === `${index}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <User className="w-3.5 h-3.5 text-white" />
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
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
                <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl p-2 border border-gray-200 dark:border-gray-700 focus-within:border-emerald-300 dark:focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                  <textarea
                    ref={textareaRef}
                    placeholder={t('chat.typeMsg', "Mesajınızı yazın...")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={1}
                    disabled={isTyping}
                    className="flex-1 px-3 py-2 bg-transparent border-0 resize-none focus:ring-0 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm max-h-[160px]"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                  />
                  <button type="submit" disabled={isTyping || !message.trim()}
                    className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 text-white rounded-xl transition-all shadow-md disabled:shadow-none hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95">
                    {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-2">
                  {currentModel.icon} {currentModel.name} · {t('chat.shortcut', "Shift+Enter ile yeni satır")}
                </p>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;