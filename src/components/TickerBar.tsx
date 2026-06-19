import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Bot, Clock, TrendingUp } from 'lucide-react';
import { useStats } from '../hooks/useStats';

const TickerBar: React.FC = () => {
  const { t } = useTranslation();
  const stats = useStats();
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const targetDate = new Date('2026-07-01T00:00:00Z');
    const update = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown(t('ticker.live', { defaultValue: 'LIVE NOW' }));
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${days}d ${hours}h ${mins}m ${secs}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [t]);

  const items = [
    { 
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />, 
      text: t('tickerStats.price', { price: stats.price.toFixed(4) }), 
      highlight: true 
    },
    { 
      icon: <Flame className="w-3.5 h-3.5 text-orange-400" />, 
      text: t('tickerStats.burned', { count: Math.floor(stats.burned).toLocaleString() }) as string 
    },
    { 
      icon: <Bot className="w-3.5 h-3.5 text-teal-400" />, 
      text: t('tickerStats.robots', { sold: stats.robotSales, total: stats.totalRobots }) as string 
    },
    { 
      icon: <Clock className="w-3.5 h-3.5 text-cyan-400" />, 
      text: `${t('tickerStats.presale')}: ${countdown}` 
    },
  ];

  // Duplicate for seamless loop
  const allItems = [...items, ...items, ...items];

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-[#060612] via-[#0a1628] to-[#060612] border-b border-white/5 overflow-hidden h-8 flex items-center">
      <div className="ticker-track flex items-center gap-8 whitespace-nowrap">
        {allItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-medium">
            {item.icon}
            <span className={item.highlight ? 'text-emerald-400 font-bold' : 'text-gray-400'}>
              {item.text}
            </span>
            <span className="text-white/10 ml-4">|</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TickerBar;
