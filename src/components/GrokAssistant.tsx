import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bot, Send, X, Volume2, VolumeX, Sparkles } from 'lucide-react';

export const GrokAssistant: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { 
      role: 'assistant', 
      content: t('grok.welcome')
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showVision, setShowVision] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSyncing) {
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setIsSyncing(false), 500);
            return 100;
          }
          return prev + 2;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isSyncing]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const speak = (text: string) => {
    if (!speechEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const trVoice = voices.find(v => v.lang.includes('tr'));
    if (trVoice && currentLang === 'tr') utterance.voice = trVoice;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsTyping(true);

    const visionKeywords = ['vizyon', 'vision', 'gelecek', 'future', 'roadmap', 'yol haritasi'];
    if (visionKeywords.some(kw => userMsg.toLowerCase().includes(kw))) {
      setShowVision(true);
      setTimeout(() => setShowVision(false), 5000);
    }

    const currentMessages = [...messages, { role: 'user' as const, content: userMsg }];
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang: currentLang,
          messages: [
            ...currentMessages.slice(-7)
          ]
        })
      });

      if (!response.ok) throw new Error("Server Failure");
      const data = await response.json();
      const assistantMsg = data.choices?.[0]?.message?.content || "";
      
      const refusalStrings = ["I'm sorry", "sorry, but", "cannot help", "as an AI", "not able to help", "yard\u0131mc\u0131 olamam", "maalesef", "uygun de\u011Fil"];
      const isRefusal = refusalStrings.some(ref => assistantMsg.toLowerCase().includes(ref.toLowerCase()));

      if (isRefusal || assistantMsg.length < 5) throw new Error("AI Refusal detected");

      setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }]);
      speak(assistantMsg);
    } catch (error: any) {
      console.error("AI Fetch Failure, engaging Smart Fact Rotation:", error);
      
      const rawFacts = t('grokFacts', { returnObjects: true });
      const factPool = Array.isArray(rawFacts) ? rawFacts : [t('grok.welcome')];
      let answer = factPool[Math.floor(Math.random() * factPool.length)] || t('grok.welcome');
      
      const historyText = currentMessages.map(m => m.content).join(' ').toLowerCase();

      if (historyText.includes('robot')) {
        answer = t('grok.intents.robot');
      }
      else if (historyText.includes('buyback') || historyText.includes('geri al') || historyText.includes('burn')) {
        answer = t('grok.intents.buyback');
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      speak(answer);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[550px] bg-[#0A0A1F]/90 border border-teal-500/30 rounded-3xl shadow-[0_0_50px_rgba(45,212,191,0.2)] flex flex-col overflow-hidden backdrop-blur-2xl"
          >
            {/* Neural Sync Overlay */}
            <AnimatePresence>
              {isSyncing && (
                <motion.div 
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute inset-0 z-50 bg-[#0A0A1F] flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full" />
                    <motion.div 
                      className="absolute inset-0 border-4 border-t-teal-500 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-teal-400 font-bold">
                      {syncProgress}%
                    </div>
                  </div>
                  <h3 className="text-white font-bold mb-2 tracking-widest uppercase text-sm">{t('grok.syncing')}</h3>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-4">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-teal-500 to-indigo-500"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                  <div className="font-mono text-[10px] text-teal-500/50 space-y-1 text-left w-full h-20 overflow-hidden">
                    <div>&gt; {t('grok.logs.connecting')}</div>
                    <div>&gt; {t('grok.logs.syncing')}</div>
                    <div>&gt; {t('grok.logs.initializing')}</div>
                    {syncProgress > 50 && <div>&gt; {t('grok.logs.matching')}</div>}
                    {syncProgress > 80 && <div>&gt; {t('grok.logs.granted')}</div>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vision projection Overlay */}
            <AnimatePresence>
              {showVision && (
                <motion.div
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 bg-teal-500/10 backdrop-blur-md flex flex-col items-center justify-center p-6 border border-teal-400/30"
                >
                  <Sparkles className="w-12 h-12 text-teal-400 mb-4 animate-pulse" />
                  <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter text-center">{t('grok.visionTitle')}</h2>
                  <div className="w-full space-y-3 font-mono text-[11px] text-teal-300">
                    <div className="border-l-2 border-teal-500 pl-3 py-1 bg-white/5">{t('grok.vision.phase')}</div>
                    <div className="border-l-2 border-indigo-500 pl-3 py-1 bg-white/5">{t('grok.vision.neural')}</div>
                    <div className="border-l-2 border-teal-500 pl-3 py-1 bg-white/5">{t('grok.vision.economy')}</div>
                  </div>
                  <motion.div 
                    className="mt-6 text-[10px] text-teal-500/70"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    {t('grok.status')}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Network Pulse Background */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(45,212,191,0.1)_0,rgba(0,0,0,0)_50%)]" />
              <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #2dd4bf 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            </div>
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center animate-pulse relative">
                  <Sparkles className="w-5 h-5 text-white" />
                  {(isTyping || isSpeaking) && (
                    <div className="absolute -inset-2 border border-teal-500/30 rounded-full animate-ping" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{t('grok.name')}</h4>
                  <p className="text-[10px] text-teal-400 font-mono">{t('grok.poweredBy')}</p>
                </div>
              </div>
              
              {/* Audio Waveform Visualization */}
              <div className="flex h-4 gap-[2px] items-center">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: (isTyping || isSpeaking) ? [4, 16, 8, 12, 4] : 4,
                      opacity: (isTyping || isSpeaking) ? 1 : 0.3
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut"
                    }}
                    className="w-[2px] bg-teal-400 rounded-full"
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSpeechEnabled(!speechEnabled)}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
                >
                  {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-teal-600 text-white rounded-tr-none' 
                      : 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-none'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-none flex gap-1">
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-white/5">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('grok.placeholder')}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm text-white focus:border-teal-500 transition-all outline-none"
                />
                <button 
                  type="submit"
                  className="absolute right-2 p-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition-all shadow-lg"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.4)] transition-all z-50 ${
          isOpen ? 'bg-red-500' : 'bg-gradient-to-r from-teal-500 to-indigo-600'
        }`}
      >
        {isOpen ? <X className="text-white" size={32} /> : <Bot className="text-white" size={32} />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#060612] animate-bounce" />
        )}
      </motion.button>
    </div>
  );
};
