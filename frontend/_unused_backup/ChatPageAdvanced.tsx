import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, MessageCircle, Send, Plus, Trash2, Download,
  Bot, User, Clock, Zap, Copy, Check, Sparkles, Settings2
} from "lucide-react";

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

const ChatPageAdvanced = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama-v3p1-70b-instruct");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
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
      if (currentConversation) setCurrentConversation(null);
    },
  });

  const { mutate: exportConversation } = useMutation({
    mutationFn: ({ id, format }: { id: string; format: string }) =>
      apiService.post(`/chat/conversations/${id}/export?format=${format}`),
    onSuccess: (response, variables) => {
      const blob = new Blob([response.data.content], {
        type: variables.format === 'json' ? 'application/json' : 'text/plain'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation.${variables.format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollToBottom(); }, [currentConversation?.messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [message]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    const userMessage: Message = { role: "user", content: message.trim(), timestamp: new Date().toISOString() };

    if (currentConversation) {
      setCurrentConversation(prev => prev ? { ...prev, messages: [...prev.messages, userMessage] } : null);
    } else {
      const newConversation: Conversation = {
        id: `temp-${Date.now()}`,
        title: message.trim().substring(0, 50) + "...",
        messages: [userMessage],
        model: selectedModel,
        total_tokens: 0,
        total_credits: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCurrentConversation(newConversation);
    }

    sendMessageFn({ message: message.trim(), model: selectedModel, temperature, max_tokens: maxTokens });
  };

  const startNewConversation = () => { setCurrentConversation(null); setMessage(""); };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await apiService.get(`/chat/conversations/${conversationId}`);
      setCurrentConversation(response.data);
      setActiveTab("chat");
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative px-6 py-8 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-3">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">AI Sohbet</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">
              Akıllı <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-white">Konuşmalar</span>
            </h1>
            <p className="text-teal-100">Gelişmiş AI modelleriyle sohbet edin</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none"><path d="M0 60V0C240 40 480 60 720 60C960 60 1200 40 1440 0V60H0Z" fill="currentColor" className="text-gray-50 dark:text-gray-900" /></svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 -mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 p-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
            <TabsTrigger value="chat" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
              <MessageCircle className="h-4 w-4 mr-2" />Sohbet
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
              <Clock className="h-4 w-4 mr-2" />Geçmiş
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
              <Settings2 className="h-4 w-4 mr-2" />Ayarlar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
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
                        <p className="text-xs text-gray-500">{isTyping ? <span className="flex items-center gap-1"><span className="flex gap-0.5"><span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" /><span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></span>Yazıyor...</span> : 'Aktif'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={startNewConversation} className="rounded-xl">
                        <Plus className="h-4 w-4 mr-1" />Yeni
                      </Button>
                      {currentConversation && (
                        <Button size="sm" variant="ghost" onClick={() => exportConversation({ id: currentConversation.id, format: 'txt' })} className="rounded-xl">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {!currentConversation?.messages.length && (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 flex items-center justify-center shadow-xl">
                          <Sparkles className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Merhaba! 👋</h3>
                        <p className="text-gray-500 max-w-md">Size nasıl yardımcı olabilirim? Kod yazma, içerik oluşturma veya analiz yapma konularında yardımcı olabilirim.</p>
                      </div>
                    )}
                    {currentConversation?.messages.map((msg, index) => (
                      <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gradient-to-br from-emerald-400 to-cyan-500'}`}>
                          {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                        </div>
                        <div className={`max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                          <div className={`inline-block p-4 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-tr-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-sm'}`}>
                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            <span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <button onClick={() => copyToClipboard(msg.content, `${index}`)} className="p-1 text-gray-400 hover:text-gray-600">
                              {copiedMessageId === `${index}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm p-4">
                          <div className="flex gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>
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

              {/* Settings Sidebar */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-500" />Model Ayarları</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Model</label>
                      {isLoadingModels ? <Skeleton className="h-10 w-full rounded-xl" /> : (
                        <Select onValueChange={setSelectedModel} value={selectedModel}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{models?.data?.map((model: any) => (<SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>))}</SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Sıcaklık: {temperature}</label>
                      <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Max Token</label>
                      <Input type="number" min="100" max="4000" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} className="rounded-xl" />
                    </div>
                  </div>
                </div>
                {currentConversation && (
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg">
                    <h3 className="font-semibold mb-3">İstatistikler</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="opacity-80">Mesaj:</span><span className="font-medium">{currentConversation.messages.length}</span></div>
                      <div className="flex justify-between"><span className="opacity-80">Token:</span><span className="font-medium">{currentConversation.total_tokens}</span></div>
                      <div className="flex justify-between"><span className="opacity-80">Kredi:</span><span className="font-medium">{currentConversation.total_credits.toFixed(2)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Sohbet Geçmişi</h2>
              {isLoadingConversations ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
              ) : (
                <div className="space-y-3">
                  {conversations?.data?.conversations?.length > 0 ? (
                    conversations.data.conversations.map((conv: any) => (
                      <div key={conv.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-600 transition-all cursor-pointer" onClick={() => loadConversation(conv.id)}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{conv.title || "Başlıksız"}</h3>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{conv.last_message}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span>{conv.message_count} mesaj</span>
                              <span>{conv.model}</span>
                              <span>{new Date(conv.created_at).toLocaleDateString('tr-TR')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); exportConversation({ id: conv.id, format: 'txt' }); }} className="rounded-lg"><Download className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="rounded-lg text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">Henüz sohbet yok</p>
                      <p className="text-sm text-gray-400">Sohbet başlattığınızda geçmişiniz burada görünür.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Mevcut Modeller</h2>
              {isLoadingModels ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {models?.data?.map((model: any) => (
                    <div key={model.id} className="p-5 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-600 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{model.name}</h3>
                        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-full">{model.cost_per_1k_tokens}c/1k</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{model.description}</p>
                      <div className="text-xs text-gray-400">Max token: {model.max_tokens?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChatPageAdvanced;