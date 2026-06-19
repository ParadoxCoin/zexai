import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Wallet, Calendar, PiggyBank, ArrowRight, Zap } from 'lucide-react';
import { useStats } from '../hooks/useStats';

const StakingCalculator: React.FC = () => {
  const { t } = useTranslation();
  const stats = useStats();
  const [amount, setAmount] = useState(50000);
  const [months, setMonths] = useState(12);
  const [roi, setRoi] = useState(0);
  const [total, setTotal] = useState(0);

  // ROI Rates pulled from the stats engine
  const RATES: Record<number, number> = useMemo(() => ({
    6: stats.apr6m,
    12: stats.apr12m,
    24: stats.apr24m
  }), [stats.apr6m, stats.apr12m, stats.apr24m]);

  useEffect(() => {
    const rate = RATES[months] || 0;
    const earned = (amount * rate * (months / 12)) / 100;
    setRoi(earned);
    setTotal(amount + earned);
  }, [amount, months, RATES]);

  return (
    <section className="py-24 px-4 mx-auto max-w-6xl sm:px-6 lg:px-8 relative z-10">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-full bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="flex flex-col lg:flex-row gap-12 items-center">
        {/* Left: Info */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6"
          >
            <Zap className="w-3 h-3" />
            {t('calc.badge', { defaultValue: 'Real Yield Protocol' })}
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black mb-6 leading-tight"
          >
             {t('calc.title', { defaultValue: '$ZEX Staking Returns' })}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg mb-8"
          >
            {t('calc.desc', { defaultValue: 'Maximize your $ZEX holdings with our Tier-based staking system. Earn a share of platform revenues through the global AI creator economy.' })}
          </motion.p>

          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             transition={{ delay: 0.2 }}
             className="grid grid-cols-3 gap-4"
          >
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="text-emerald-400 font-bold text-xl">12%</div>
              <div className="text-[10px] text-gray-500 uppercase">{t('calc.yearly', { defaultValue: 'APY (Yearly)' })}</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl ring-2 ring-cyan-500/30">
              <div className="text-cyan-400 font-bold text-xl">25%</div>
              <div className="text-[10px] text-gray-500 uppercase">{t('calc.yearly', { defaultValue: 'APY (Yearly)' })}</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="text-indigo-400 font-bold text-xl">55%</div>
              <div className="text-[10px] text-gray-500 uppercase">{t('calc.yearly', { defaultValue: 'APY (Yearly)' })}</div>
            </div>
          </motion.div>
        </div>

        {/* Right: Calculator Card */}
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
           className="w-full lg:w-[450px] bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Shine effect */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-teal-500/20 blur-[80px] rounded-full" />
          
          <div className="relative space-y-8">
            {/* Amount Slider */}
            <div>
              <div className="flex justify-between items-end mb-4">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                  {t('calc.labelAmount', { defaultValue: 'Staking Amount' })}
                </label>
                <span className="text-xl font-black text-white">{amount.toLocaleString()} ZEX</span>
              </div>
              <input 
                type="range"
                min="1000"
                max="1000000"
                step="5000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all"
              />
            </div>

            {/* Time Selector */}
            <div>
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-cyan-500" />
                {t('calc.labelPeriod', { defaultValue: 'Staking Period' })}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[6, 12, 24].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMonths(m)}
                    className={`py-3 rounded-xl border transition-all text-sm font-bold ${
                      months === m 
                        ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {m} {t('calc.months', { defaultValue: 'M' })}
                  </button>
                ))}
              </div>
            </div>

            {/* Result Panel */}
            <div className="bg-black/40 rounded-2xl p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">{t('calc.estimatedEarn', { defaultValue: 'Estimated Earnings' })}</span>
                <span className="text-emerald-400 font-bold">+{roi.toLocaleString()} ZEX</span>
              </div>
              <div className="h-px bg-white/5 w-full" />
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-bold">{t('calc.totalReturn', { defaultValue: 'Total Balance' })}</span>
                <span className="text-2xl font-black text-white flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-teal-500" />
                  {total.toLocaleString()}
                </span>
              </div>
            </div>

            <button disabled={true} className="w-full py-5 rounded-2xl bg-gray-800 text-gray-500 font-black tracking-widest uppercase text-sm shadow-xl flex items-center justify-center gap-2 cursor-not-allowed">
              {t('calc.comingSoon', { defaultValue: 'Coming Soon' })}
            </button>
            
            <p className="text-[10px] text-gray-600 text-center uppercase tracking-tighter">
              {t('calc.disclaimer', { defaultValue: '* Rates are estimated and subject to protocol governance' })}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default StakingCalculator;
