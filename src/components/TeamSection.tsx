import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Twitter, Linkedin, Github, ExternalLink } from 'lucide-react';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  socials: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  gradient: string;
}

const TeamSection: React.FC = () => {
  const { t } = useTranslation();
  const [flippedCard, setFlippedCard] = useState<number | null>(null);

  const team: TeamMember[] = [
    {
      name: 'ZexAI Founder',
      role: t('team.founderRole', { defaultValue: 'Founder & CEO' }),
      bio: t('team.founderBio', { defaultValue: 'Visionary technologist bridging AI, Web3, and robotics. Building the infrastructure for the next generation of intelligent systems.' }),
      avatar: '/logo192.png',
      socials: {
        twitter: 'https://x.com/ZexAi_io',
        linkedin: '#',
      },
      gradient: 'from-teal-500 to-emerald-500',
    },
    {
      name: 'ZexAI Core',
      role: t('team.ctoRole', { defaultValue: 'AI Architecture' }),
      bio: t('team.ctoBio', { defaultValue: 'Multi-model AI engine powering 40+ models. Neural network optimization, real-time inference, and autonomous agent orchestration.' }),
      avatar: '/logo192.png',
      socials: {
        github: 'https://github.com/zexai',
      },
      gradient: 'from-cyan-500 to-blue-500',
    },
    {
      name: 'Community',
      role: t('team.communityRole', { defaultValue: 'DAO & Governance' }),
      bio: t('team.communityBio', { defaultValue: 'The heart of ZexAI. Token holders, creators, and developers shaping the future together through decentralized governance.' }),
      avatar: '/logo192.png',
      socials: {
        twitter: 'https://x.com/ZexAi_io',
      },
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      name: 'Robotics Lab',
      role: t('team.robotRole', { defaultValue: 'Hardware & Integration' }),
      bio: t('team.robotBio', { defaultValue: 'Bridging software intelligence with physical robotics. Unitree G1 integration, custom behavior modules, and sensor fusion systems.' }),
      avatar: '/logo192.png',
      socials: {},
      gradient: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <section className="py-24 px-4 mx-auto max-w-6xl sm:px-6 lg:px-8 relative z-10">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-full bg-purple-500/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16 relative"
      >
        <h2 className="text-4xl md:text-5xl font-black mb-4">
          {t('team.title', { defaultValue: 'The Minds Behind ZexAI' })}
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          {t('team.subtitle', { defaultValue: 'A fusion of human vision and artificial intelligence, building the future together.' })}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {team.map((member, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group perspective-1000 cursor-pointer"
            onClick={() => setFlippedCard(flippedCard === index ? null : index)}
          >
            <div
              className={`relative h-80 transition-transform duration-700 preserve-3d ${
                flippedCard === index ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden">
                <div className="h-full bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden transition-all group-hover:bg-white/[0.06] group-hover:border-white/20 group-hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]">
                  {/* Top gradient bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${member.gradient}`} />
                  
                  <div className="p-6 flex flex-col items-center text-center h-full">
                    {/* Avatar */}
                    <div className="relative mb-5">
                      <div className={`absolute -inset-2 bg-gradient-to-r ${member.gradient} rounded-full blur-lg opacity-30 group-hover:opacity-60 transition-opacity`} />
                      <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/20">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                    <p className={`text-sm font-medium bg-gradient-to-r ${member.gradient} bg-clip-text text-transparent mb-4`}>
                      {member.role}
                    </p>

                    {/* Social Icons */}
                    <div className="flex gap-3 mt-auto">
                      {member.socials.twitter && (
                        <a href={member.socials.twitter} target="_blank" rel="noopener noreferrer"
                          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#1DA1F2] hover:bg-white/10 transition-all"
                          onClick={e => e.stopPropagation()}>
                          <Twitter className="w-4 h-4" />
                        </a>
                      )}
                      {member.socials.linkedin && (
                        <a href={member.socials.linkedin} target="_blank" rel="noopener noreferrer"
                          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#0A66C2] hover:bg-white/10 transition-all"
                          onClick={e => e.stopPropagation()}>
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                      {member.socials.github && (
                        <a href={member.socials.github} target="_blank" rel="noopener noreferrer"
                          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                          onClick={e => e.stopPropagation()}>
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-600 mt-3 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {t('team.clickToFlip', { defaultValue: 'Click to learn more' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180">
                <div className={`h-full bg-gradient-to-br ${member.gradient} rounded-2xl p-6 flex flex-col items-center justify-center text-center`}>
                  <h3 className="text-xl font-bold text-white mb-4">{member.name}</h3>
                  <p className="text-white/90 text-sm leading-relaxed">{member.bio}</p>
                  <p className="text-white/50 text-xs mt-4 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {t('team.clickToFlipBack', { defaultValue: 'Click to flip back' })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default TeamSection;
