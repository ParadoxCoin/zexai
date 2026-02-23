import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import {
  MessageCircle, Send, Plus, Trash2, Download, Bot, User,
  Clock, Zap, Copy, Check, Sparkles, Settings2, History,
  Loader2, ChevronRight, Star, Brain, Crown, Code, Cpu
} from "lucide-react";
import ComparisonChatPage from "./ComparisonChatPage";
import CodeBlock from "@/components/CodeBlock";

// Available AI Models
const availableModels = [
  { id: "llama-3.3-70b", name: "Llama 3.3 70B", icon: "🦙", tier: "free", speed: "fast", color: "from-blue-500 to-purple-500" },
  { id: "llama-3.1-8b", name: "Llama 3.1 8B", icon: "⚡", tier: "free", speed: "ultra", color: "from-cyan-500 to-blue-500" },
  { id: "gpt-4o", name: "GPT-4o", icon: "🧠", tier: "premium", speed: "fast", color: "from-green-500 to-emerald-500" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", icon: "✨", tier: "premium", speed: "ultra", color: "from-teal-500 to-green-500" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", icon: "🎭", tier: "premium", speed: "fast", color: "from-amber-500 to-orange-500" },
];

// Suggested Prompts
const suggestedPrompts = [
  { icon: '💡', title: 'Kod Yardımı', prompt: 'React componentí nasıl optimize ederim?' },
  { icon: '📝', title: 'İçerik Yazımı', prompt: 'Blog yazısı için SEO uyumlu başlık öner' },
  { icon: '🎯', title: 'Strateji', prompt: 'SaaS ürünü için büyüme stratejisi öner' },
  { icon: '🔍', title: 'Analiz', prompt: 'Rakip analizi nasıl yapılır?' },
];

// Message content renderer with code blocks
const MessageContent = ({ content }: { content: string }) => {
  if (!content) return null;

  // Split by code blocks
  const parts = content.split(/(```\w*\n[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {parts.map((part, idx) => {
        const codeMatch = part.match(/```(\w*)\n([\s\S]*?)```/);
        if (codeMatch) {
          const [, lang, code] = codeMatch;
          return <CodeBlock key={idx} code={code} language={lang || 'javascript'} />;
        }

        // Regular text with inline formatting
        if (part.trim()) {
          const formatted = part
            .replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1.5 py-0.5 rounded text-pink-400 text-sm">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br/>');

          return (
            <div
              key={idx}
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
  model: string;
  total_tokens: number;
  total_credits: number;
  created_at: string;
  updated_at: string;
}

const ChatPage = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [serverConversationId, setServerConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: models, isLoading: isLoadingModels } = useQuery({
    queryKey: ["chatModels"],
    queryFn: () => apiService.get("/chat/models")
  });

  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiService.get("/chat/conversations")
  });

  const { mutate: sendMessageFn, isPending: isSending } = useMutation({
    mutationFn: (data: any) => apiService.post("/chat", data),
    onMutate: () => setIsTyping(true),
    onSuccess: (response) => {
      if (currentConversation) {
        const newMessage: Message = {
          role: "assistant",
          content: response.data.response,
          timestamp: new Date().toISOString()
        };
        setCurrentConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage],
          total_tokens: prev.total_tokens + response.data.tokens_used,
          total_credits: prev.total_credits + response.data.credits_charged
        } : null);
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessage("");
      setIsTyping(false);
    },
    onError: () => setIsTyping(false),
  });

  const { mutate: deleteConversation } = useMutation({
    mutationFn: (id: string) => apiService.delete(`/chat/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setCurrentConversation(null);
    },
  });

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [currentConversation?.messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [message]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    const userMessage: Message = { role: "user", content: message.trim(), timestamp: new Date().toISOString() };
    const userInput = message.trim();
    setMessage("");

    // Create or update conversation with user message
    let conversation = currentConversation;
    if (conversation) {
      conversation = { ...conversation, messages: [...conversation.messages, userMessage] };
    } else {
      conversation = {
        id: `temp-${Date.now()}`,
        title: userInput.substring(0, 50) + "...",
        messages: [userMessage],
        model: selectedModel,
        total_tokens: 0,
        total_credits: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    setCurrentConversation(conversation);

    // Add empty assistant message for streaming
    const assistantMessage: Message = { role: "assistant", content: "", timestamp: new Date().toISOString() };
    setCurrentConversation(prev => prev ? { ...prev, messages: [...prev.messages, assistantMessage] } : null);
    setIsTyping(true);

    try {
      // Get fresh token from Supabase session
      let token: string | null = null;
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || null;
      } catch { /* fallback */ }
      if (!token) token = localStorage.getItem('auth_token');

      if (!token || token === 'null' || token === 'undefined') {
        throw new Error('No auth token available');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userInput,
          model: selectedModel,
          conversation_id: serverConversationId || currentConversation?.id?.replace('temp-', '') || null,
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value); const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                console.error('Stream error:', data.error);
                break;
              }
              if (data.content) {
                fullContent += data.content;
                // Update last message with streaming content
                setCurrentConversation(prev => {
                  if (!prev) return null;
                  const msgs = [...prev.messages];
                  msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullContent };
                  return { ...prev, messages: msgs };
                });
              }
              // Track conversation ID from server for subsequent messages
              if (data.conversation_id) {
                setServerConversationId(data.conversation_id);
                setCurrentConversation(prev => prev ? { ...prev, id: data.conversation_id } : null);
              }
            } catch (e) { /* ignore parse errors */ }
          }
        }
      }

      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

    } catch (error) {
      console.error('Streaming error:', error);
      setIsTyping(false);
      // Fallback to non-streaming
      sendMessageFn({ message: userInput, model: selectedModel, conversation_id: serverConversationId || null, temperature, max_tokens: maxTokens });
    }
  };

  const startNewConversation = () => { setCurrentConversation(null); setServerConversationId(null); setMessage(""); };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await apiService.get(`/chat/conversations/${conversationId}`);
      setCurrentConversation(response.data);
      setServerConversationId(conversationId);
      setActiveTab("chat");
    } catch (error) { console.error("Failed to load conversation:", error); }
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const modelsList = models?.data || models || [];
  const conversationsList = conversations?.data?.conversations || [];

  const tabs = [
    { id: "chat", name: "Sohbet", icon: MessageCircle },
    { id: "compare", name: "Karşılaştır", icon: Zap },
    { id: "history", name: "Geçmiş", icon: History },
    { id: "settings", name: "Ayarlar", icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative px-6 py-10 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-3">
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium">AI Sohbet Asistanı</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">
              Akıllı <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-white">Sohbet</span>
            </h1>
            <p className="text-teal-100">Gelişmiş AI modelleriyle her konuda yardım alın</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none"><path d="M0 60V0C240 40 480 60 720 60C960 60 1200 40 1440 0V60H0Z" fill="currentColor" className="text-gray-50 dark:text-gray-900" /></svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 -mt-4">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 h-[600px] flex flex-col overflow-hidden">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{currentConversation?.title || "Yeni Sohbet"}</h3>
                      <p className="text-xs text-gray-500">
                        {isTyping ? (
                          <span className="flex items-center gap-1">
                            <span className="flex gap-0.5">
                              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" />
                              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                            Yazıyor...
                          </span>
                        ) : 'Aktif'}
                      </p>
                    </div>
                  </div>
                  <button onClick={startNewConversation} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Yeni
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {!currentConversation?.messages.length && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="relative flex items-center justify-center w-24 h-24 mb-6">
                        <div className="absolute inset-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-xl opacity-20" />
                        <img src="/logo192.png" alt="ZexAi Logo" className="relative w-20 h-20 object-contain drop-shadow-xl hover:scale-105 transition-transform" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Merhaba! 👋</h3>
                      <p className="text-gray-500 max-w-md mb-6">Size nasıl yardımcı olabilirim?</p>

                      {/* Suggested Prompts */}
                      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                        {suggestedPrompts.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => setMessage(item.prompt)}
                            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors border border-gray-100 dark:border-gray-600 group"
                          >
                            <span className="text-2xl mb-2 block">{item.icon}</span>
                            <span className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 inline ml-1" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentConversation?.messages.map((msg, index) => (
                    <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gradient-to-br from-emerald-400 to-cyan-500'
                        }`}>
                        {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                      </div>
                      <div className={`max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block p-4 rounded-2xl ${msg.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-tr-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-sm'
                          }`}>
                          {msg.role === 'assistant' ? (
                            <MessageContent content={msg.content} />
                          ) : (
                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                          )}
                        </div>
                        <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          <span className="text-xs text-gray-400">
                            {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button onClick={() => copyToClipboard(msg.content, `${index}`)} className="p-1 text-gray-400 hover:text-gray-600">
                            {copiedMessageId === `${index}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm p-4">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-end gap-2 bg-white dark:bg-gray-800 rounded-2xl p-2 border border-gray-200 dark:border-gray-700">
                    <textarea
                      ref={textareaRef}
                      placeholder="Mesajınızı yazın..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={1}
                      disabled={isSending}
                      className="flex-1 px-3 py-2 bg-transparent border-0 resize-none focus:ring-0 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm max-h-[150px]"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                    />
                    <button type="submit" disabled={isSending || !message.trim()} className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all shadow-lg disabled:shadow-none hover:shadow-emerald-500/25">
                      {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-500" />Model Seç
                </h3>
                <div className="space-y-2">
                  {availableModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${selectedModel === model.id
                        ? `bg-gradient-to-r ${model.color} text-white border-transparent shadow-lg`
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-emerald-500'
                        }`}
                    >
                      <span className="text-xl">{model.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">{model.name}</div>
                        <div className={`flex items-center gap-1 text-xs ${selectedModel === model.id ? 'text-white/80' : 'text-gray-500'}`}>
                          {model.tier === 'premium' ? <Crown className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                          {model.tier === 'premium' ? 'Premium' : 'Ücretsiz'}
                          <span className="mx-1">•</span>
                          {model.speed === 'ultra' ? '⚡ Ultra Hızlı' : '🚀 Hızlı'}
                        </div>
                      </div>
                      {selectedModel === model.id && <Check className="w-5 h-5" />}
                    </button>
                  ))}
                </div>
              </div>
              {/* Ayarlar */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 text-sm">⚙️ Ayarlar</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sıcaklık: {temperature}</label>
                    <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Token</label>
                    <input type="number" min="100" max="4000" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" />
                  </div>
                </div>
              </div>

              {/* İstatistikler */}
              {currentConversation && (
                <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-4 text-white shadow-lg">
                  <h3 className="font-medium mb-2 text-sm">📊 İstatistikler</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="opacity-80">Mesaj:</span><span className="font-medium">{currentConversation.messages.length}</span></div>
                    <div className="flex justify-between"><span className="opacity-80">Token:</span><span className="font-medium">{currentConversation.total_tokens}</span></div>
                    <div className="flex justify-between"><span className="opacity-80">Kredi:</span><span className="font-medium">{currentConversation.total_credits.toFixed(2)}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {
          activeTab === "history" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Sohbet Geçmişi</h2>
              <div className="space-y-3">
                {isLoadingConversations ? (
                  [1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)
                ) : conversationsList.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Henüz sohbet yok</p>
                  </div>
                ) : (
                  conversationsList.map((conv: any) => (
                    <div key={conv.id} onClick={() => loadConversation(conv.id)} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-600 transition-all cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{conv.title || "Başlıksız"}</h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{conv.last_message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>{conv.message_count} mesaj</span>
                            <span>{new Date(conv.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        }

        {/* Settings Tab */}
        {
          activeTab === "settings" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Mevcut Modeller</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoadingModels ? (
                  [1, 2].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)
                ) : (
                  Array.isArray(modelsList) && modelsList.map((model: any) => (
                    <div key={model.id} className="p-5 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-600 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{model.name}</h3>
                        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-full">{model.cost_per_1k_tokens}c/1k</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{model.description}</p>
                      <div className="text-xs text-gray-400">Max token: {model.max_tokens?.toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        }

        {/* Comparison Tab - Embedded */}
        {
          activeTab === "compare" && (
            <ComparisonChatPage />
          )
        }
      </div >
    </div >
  );
};

export default ChatPage;