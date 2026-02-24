// Build v2.1 - Fixed conversation history display
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import {
  MessageCircle, Send, Plus, Trash2, Bot, User,
  Copy, Check, Sparkles, History, Loader2, ChevronRight,
  Crown, Zap, PanelLeftClose, PanelLeft, RotateCcw,
  Cpu, ArrowDown, Hash
} from "lucide-react";
import { ComparisonChatPage } from "./ComparisonChatPage";
import CodeBlock from "@/components/CodeBlock";

// Available AI Models
const availableModels = [
  { id: "llama-3.3-70b", name: "Llama 3.3 70B", icon: "🦙", tier: "free", speed: "fast", color: "from-blue-500 to-purple-500", desc: "Güçlü ve ücretsiz" },
  { id: "llama-3.1-8b", name: "Llama 3.1 8B", icon: "⚡", tier: "free", speed: "ultra", color: "from-cyan-500 to-blue-500", desc: "Ultra hızlı" },
  { id: "gpt-4o", name: "GPT-4o", icon: "🧠", tier: "premium", speed: "fast", color: "from-green-500 to-emerald-500", desc: "En akıllı model" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", icon: "✨", tier: "premium", speed: "ultra", color: "from-teal-500 to-green-500", desc: "Hızlı ve akıllı" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5", icon: "🎭", tier: "premium", speed: "fast", color: "from-amber-500 to-orange-500", desc: "Yaratıcı asistan" },
];

// Suggested Prompts
const suggestedPrompts = [
  { icon: '💡', title: 'Kod Yardımı', prompt: 'React componenti nasıl optimize ederim?', gradient: 'from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-800' },
  { icon: '📝', title: 'İçerik Yazımı', prompt: 'Blog yazısı için SEO uyumlu başlık öner', gradient: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-800' },
  { icon: '🎯', title: 'Strateji', prompt: 'SaaS ürünü için büyüme stratejisi öner', gradient: 'from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800' },
  { icon: '🔍', title: 'Analiz', prompt: 'Rakip analizi nasıl yapılır?', gradient: 'from-pink-500/10 to-rose-500/10 border-pink-200 dark:border-pink-800' },
  { icon: '🌍', title: 'Çeviri', prompt: 'Bu metni İngilizce\'ye çevir:', gradient: 'from-violet-500/10 to-indigo-500/10 border-violet-200 dark:border-violet-800' },
  { icon: '📊', title: 'Veri Analizi', prompt: 'Excel formülü nasıl yazılır?', gradient: 'from-cyan-500/10 to-sky-500/10 border-cyan-200 dark:border-cyan-800' },
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tokenQueueRef = useRef<string[]>([]); // Queue for natural typing
  const isProcessingRef = useRef(false);
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await apiService.get("/chat/conversations");
      console.log("[DEBUG] /chat/conversations raw response:", JSON.stringify(res).substring(0, 500));
      return res;
    }
  });

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
  const currentModel = availableModels.find(m => m.id === selectedModel) || availableModels[0];

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-gray-900">
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
                <Plus className="w-4 h-4" /> Yeni Sohbet
              </button>
            </div>

            {/* Model Selector */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Model</p>
              <div className="space-y-1">
                {availableModels.map((model) => (
                  <button key={model.id} onClick={() => setSelectedModel(model.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${selectedModel === model.id
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                    <span className="text-base">{model.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-xs">{model.name}</div>
                      <div className="text-[10px] opacity-60">{model.desc}</div>
                    </div>
                    {model.tier === 'premium' && <Crown className="w-3 h-3 text-amber-500" />}
                    {selectedModel === model.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="p-3 flex gap-1">
              {[
                { id: "chat", label: "Sohbet", Icon: MessageCircle },
                { id: "history", label: "Geçmiş", Icon: History },
                { id: "compare", label: "Karşılaştır", Icon: Zap },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === t.id ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  <t.Icon className="w-3 h-3" /> {t.label}
                </button>
              ))}
            </div>

            {/* History in sidebar */}
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {activeTab === "history" ? (
                <div className="space-y-1.5">
                  {isLoadingConversations ? (
                    [1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />)
                  ) : conversationsList.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-8">Henüz sohbet yok</p>
                  ) : conversationsList.map((conv: any) => (
                    <div key={conv.id} onClick={() => loadConversation(conv.id)}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all group ${currentConversation?.id === conv.id ? 'bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{conv.title || "Başlıksız"}</p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{conv.last_message}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                            <Hash className="w-2.5 h-2.5" />{conv.message_count}
                            <span>{new Date(conv.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {conversationsList.slice(0, 8).map((conv: any) => (
                    <button key={conv.id} onClick={() => loadConversation(conv.id)}
                      className={`w-full text-left p-2 rounded-lg text-xs truncate transition-all ${currentConversation?.id === conv.id ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                      {conv.title || "Başlıksız"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings at bottom */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div>
                <label className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                  <span>Sıcaklık</span><span className="font-mono">{temperature}</span>
                </label>
                <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1 accent-emerald-500 cursor-pointer" />
              </div>
              <div>
                <label className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                  <span>Max Token</span><span className="font-mono">{maxTokens}</span>
                </label>
                <input type="range" min="256" max="4096" step="256" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full h-1 accent-emerald-500 cursor-pointer" />
              </div>
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
            {/* Chat Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                  {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${currentModel.color} flex items-center justify-center text-xs`}>
                    {currentModel.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{currentConversation?.title || "Yeni Sohbet"}</h3>
                    <p className="text-[10px] text-gray-400">{currentModel.name}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isTyping && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-500 mr-2">
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    Yazıyor
                  </span>
                )}
                <button onClick={startNewConversation} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" title="Yeni Sohbet">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto relative overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as any }}>
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {/* Empty State */}
                {!currentConversation?.messages?.length && (
                  <div className="flex flex-col items-center justify-center pt-12 pb-8">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-2xl opacity-15 scale-150" />
                      <img src="/logo192.png" alt="ZexAi" className="relative w-16 h-16 object-contain" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Nasıl yardımcı olabilirim?</h2>
                    <p className="text-sm text-gray-500 mb-8">Sormak istediğiniz her şeyi yazabilirsiniz</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 w-full max-w-xl">
                      {suggestedPrompts.map((item, idx) => (
                        <button key={idx} onClick={() => setMessage(item.prompt)}
                          className={`p-3.5 rounded-xl text-left bg-gradient-to-br ${item.gradient} border hover:scale-[1.02] transition-all group`}>
                          <span className="text-xl mb-1.5 block">{item.icon}</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200 text-xs block">{item.title}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 block">{item.prompt}</span>
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
                    placeholder="Mesajınızı yazın..."
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
                  {currentModel.icon} {currentModel.name} · Shift+Enter ile yeni satır
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