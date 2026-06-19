import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Zap, Shield, Rocket, ArrowRight } from 'lucide-react';

interface SEOPageProps {
  title: string;
  subtitle: string;
  content: string;
  benefits: string[];
  ctaText: string;
  targetKeywords: string[];
}

const SEOPage: React.FC<SEOPageProps> = ({ title, subtitle, content, benefits, ctaText, targetKeywords }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[600px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-bold tracking-wider uppercase mb-6 inline-block">
            {targetKeywords[0] || 'AI Innovation'}
          </span>
          <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent leading-tight">
            {title}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl mb-16"
        >
          <div className="prose prose-invert max-w-none mb-12">
            <p className="text-lg text-gray-300 leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <CheckCircle className="w-6 h-6 text-teal-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold mb-6 animate-bounce">
            <Zap className="w-3 h-3" />
            UNLIMITED VALIDITY: CREDITS NEVER EXPIRE
          </div>
          <br />
          <a
            href="https://app.zexai.io"
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full font-black text-lg hover:shadow-[0_0_40px_rgba(20,184,166,0.4)] hover:scale-105 transition-all group"
          >
            {ctaText}
            <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </a>
          <p className="mt-6 text-gray-500 text-sm">
            Join 10,000+ creators and traders building on ZexAI.
          </p>
        </motion.div>

        {/* Keywords Cloud (Subtle for SEO) */}
        <div className="mt-24 pt-12 border-t border-white/5 flex flex-wrap justify-center gap-4 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
          {targetKeywords.map((kw, i) => (
            <span key={i} className="text-xs text-gray-400">#{kw.replace(/\s+/g, '')}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SEOPage;
