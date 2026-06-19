import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Loader, Lock, Rocket, Users, Globe, Cpu, Bot } from 'lucide-react';

interface MilestoneItem {
  quarter: string;
  title: string;
  items: string[];
  status: 'completed' | 'active' | 'upcoming';
  icon: React.ReactNode;
}

const Roadmap: React.FC = () => {
  const { t } = useTranslation();

  const milestones: MilestoneItem[] = [
    {
      quarter: 'Q2 2026',
      title: t('roadmap.q1Title', { defaultValue: 'Foundation & Launch' }),
      items: [
        t('roadmap.q1i1', { defaultValue: 'Multi-model AI platform launch (40+ models)' }),
        t('roadmap.q1i2', { defaultValue: 'NFT minting integration (OpenSea & Zora)' }),
        t('roadmap.q1i3', { defaultValue: 'Credit system & referral program' }),
        t('roadmap.q1i4', { defaultValue: 'ZexAI Assistant (Grok) deployment' }),
      ],
      status: 'active',
      icon: <Rocket className="w-5 h-5" />,
    },
    {
      quarter: 'Q3 2026',
      title: t('roadmap.q2Title', { defaultValue: 'Token & Community' }),
      items: [
        t('roadmap.q2i1', { defaultValue: '$ZEX Token presale on Polygon' }),
        t('roadmap.q2i2', { defaultValue: 'Staking & burn mechanisms activation' }),
        t('roadmap.q2i3', { defaultValue: 'Community governance voting (DAO Phase 1)' }),
        t('roadmap.q2i4', { defaultValue: 'First DEX listing (QuickSwap)' }),
      ],
      status: 'upcoming',
      icon: <Users className="w-5 h-5" />,
    },
    {
      quarter: 'Q4 2026',
      title: t('roadmap.q3Title', { defaultValue: 'Robot Ecosystem' }),
      items: [
        t('roadmap.q3i1', { defaultValue: 'Humanoid robot first batch delivery (80 units)' }),
        t('roadmap.q3i2', { defaultValue: 'Robot SDK & behavior module marketplace' }),
        t('roadmap.q3i3', { defaultValue: 'Developer API & documentation' }),
        t('roadmap.q3i4', { defaultValue: 'CEX listings (Tier 2)' }),
      ],
      status: 'upcoming',
      icon: <Bot className="w-5 h-5" />,
    },
    {
      quarter: 'H1 2027',
      title: t('roadmap.q4Title', { defaultValue: 'Global Expansion' }),
      items: [
        t('roadmap.q4i1', { defaultValue: 'Robot behavior module marketplace launch' }),
        t('roadmap.q4i2', { defaultValue: 'Enterprise partnerships & B2B integrations' }),
        t('roadmap.q4i3', { defaultValue: 'Mobile app release (iOS & Android)' }),
        t('roadmap.q4i4', { defaultValue: 'CEX listings (Tier 1)' }),
        t('roadmap.q4i5', { defaultValue: 'Autonomous Hardware & Unitree Integration (H1 2027)' }),
      ],
      status: 'upcoming',
      icon: <Globe className="w-5 h-5" />,
    },
    {
      quarter: '2027+',
      title: t('roadmap.q5Title', { defaultValue: 'The Vision' }),
      items: [
        t('roadmap.q5i1', { defaultValue: 'Autonomous AI agent network' }),
        t('roadmap.q5i2', { defaultValue: 'Cross-chain bridge (Ethereum, Solana)' }),
        t('roadmap.q5i3', { defaultValue: 'Full DAO governance transition' }),
        t('roadmap.q5i4', { defaultValue: 'Next-gen robot hardware (Gen 2)' }),
      ],
      status: 'upcoming',
      icon: <Cpu className="w-5 h-5" />,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'from-emerald-500 to-teal-500';
      case 'active': return 'from-cyan-500 to-blue-500';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4 text-white" />;
      case 'active': return <Loader className="w-4 h-4 text-white animate-spin" />;
      default: return <Lock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <section className="py-24 px-4 mx-auto max-w-5xl sm:px-6 lg:px-8 relative z-10">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-full bg-teal-500/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16 relative"
      >
        <h2 className="text-4xl md:text-5xl font-black mb-4">
          {t('roadmap.title', { defaultValue: 'Roadmap' })}
        </h2>
        <p className="text-gray-400 text-lg">
          {t('roadmap.subtitle', { defaultValue: 'Our journey from vision to reality.' })}
        </p>
      </motion.div>

      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500/50 via-cyan-500/30 to-gray-700/20" />

        {milestones.map((milestone, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`relative flex items-start mb-12 last:mb-0 ${
              index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
            }`}
          >
            {/* Timeline Node */}
            <div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-10">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getStatusColor(milestone.status)} flex items-center justify-center shadow-lg ${
                milestone.status === 'active' ? 'ring-4 ring-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : ''
              }`}>
                {getStatusIcon(milestone.status)}
              </div>
            </div>

            {/* Content Card */}
            <div className={`ml-20 md:ml-0 md:w-[calc(50%-3rem)] ${
              index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'
            }`}>
              <div className={`bg-white/[0.03] border rounded-2xl p-6 backdrop-blur-sm transition-all hover:bg-white/[0.06] ${
                milestone.status === 'active'
                  ? 'border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]'
                  : milestone.status === 'completed'
                    ? 'border-emerald-500/20'
                    : 'border-white/10'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
                    milestone.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : milestone.status === 'active'
                        ? 'bg-cyan-500/20 text-cyan-400 animate-pulse'
                        : 'bg-white/5 text-gray-500'
                  }`}>
                    {milestone.quarter}
                  </span>
                  <span className={milestone.status === 'upcoming' ? 'text-gray-600' : 'text-white'}>
                    {milestone.icon}
                  </span>
                </div>

                <h3 className={`text-xl font-bold mb-3 ${
                  milestone.status === 'upcoming' ? 'text-gray-500' : 'text-white'
                }`}>
                  {milestone.title}
                </h3>

                <ul className="space-y-2">
                  {milestone.items.map((item, i) => (
                    <li key={i} className={`flex items-start gap-2 text-sm ${
                      milestone.status === 'upcoming' ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        milestone.status === 'completed'
                          ? 'bg-emerald-400'
                          : milestone.status === 'active'
                            ? 'bg-cyan-400'
                            : 'bg-gray-600'
                      }`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Roadmap;
