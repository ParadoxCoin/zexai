import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Cpu, Database, Wifi, ShieldCheck, Zap } from 'lucide-react';

const NeuralSync: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const [load, setLoad] = useState(78);
  
  const rawLogs = t('neuralSync.logs', { returnObjects: true });
  const logPool = Array.isArray(rawLogs) ? rawLogs : [];

  useEffect(() => {
    if (logPool.length === 0) return;
    
    const interval = setInterval(() => {
      const msg = logPool[Math.floor(Math.random() * logPool.length)];
      setLogs(prev => [...prev.slice(-4), `> ${msg}`]);
      setLoad(Math.floor(Math.random() * 20) + 70);
    }, 3000);
    return () => clearInterval(interval);
  }, [logPool]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden lg:block w-72 bg-[#060612]/80 backdrop-blur-xl border border-teal-500/20 rounded-2xl p-4 shadow-[0_0_30px_rgba(45,212,191,0.1)] overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-ping absolute inset-0" />
            <div className="w-2 h-2 bg-teal-500 rounded-full relative" />
          </div>
          <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase">
            {t('neuralSync.badge')}
          </span>
        </div>
        <Wifi className="w-3 h-3 text-teal-500/50" />
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center text-[10px] mb-1">
          <span className="text-gray-500 uppercase">{t('neuralSync.load')}</span>
          <span className="text-teal-400 font-mono">{load}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            animate={{ width: `${load}%` }}
            className="h-full bg-gradient-to-r from-teal-500 to-indigo-500" 
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg border border-white/5">
          <Cpu className="w-3 h-3 text-emerald-400 mb-1" />
          <span className="text-[8px] text-gray-500 uppercase">{t('neuralSync.core')}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg border border-white/5">
          <Database className="w-3 h-3 text-cyan-400 mb-1" />
          <span className="text-[8px] text-gray-500 uppercase">{t('neuralSync.storage')}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg border border-white/5">
          <ShieldCheck className="w-3 h-3 text-teal-400 mb-1" />
          <span className="text-[8px] text-gray-500 uppercase">{t('neuralSync.safe')}</span>
        </div>
      </div>

      <div className="bg-black/40 rounded-xl p-3 font-mono text-[9px] text-teal-500/70 border border-teal-500/10 min-h-[80px]">
        <div className="space-y-1">
          {logs.map((log, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {log}
            </motion.div>
          ))}
          {logs.length === 0 && (
            <div className="animate-pulse">{t('neuralSync.booting')}</div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-[9px] text-gray-500 uppercase tracking-tighter">
        <Zap className="w-2 h-2 text-yellow-500/50 animate-pulse" />
        <span>{t('neuralSync.connected')}</span>
      </div>
    </motion.div>
  );
};

export default NeuralSync;
