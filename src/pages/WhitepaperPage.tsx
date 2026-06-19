import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TokenDistributionChart from '../components/TokenDistributionChart';

const WhitepaperPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [content, setContent] = useState('');

    useEffect(() => {
        const lang = i18n.language || 'en';
        const fileUrl = `/ZEX_WHITEPAPER_${lang.toUpperCase()}.md`;
        const fallbackUrl = '/ZEX_WHITEPAPER_EN.md';

        fetch(fileUrl)
            .then(res => {
                if (!res.ok) return fetch(fallbackUrl).then(r => r.text());
                return res.text();
            })
            .then(text => setContent(text))
            .catch(err => console.error("Error loading whitepaper:", err));
    }, [i18n.language]);

    return (
        <div className="min-h-screen bg-[#060612] text-gray-300 font-sans selection:bg-emerald-500/30 overflow-x-hidden pt-24 pb-32">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/8 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] right-[-10%] w-[30%] h-[50%] bg-teal-600/8 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-cyan-600/8 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Navigation */}
                <div className="mb-12 flex items-center justify-between border-b border-white/10 pb-6">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                    >
                        <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </div>
                        <span className="font-medium">{t('whitepaper.backToHome')}</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-emerald-400" />
                        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 tracking-widest uppercase text-sm">
                            {t('whitepaper.officialDoc')}
                        </span>
                    </div>
                </div>

                {/* Markdown Content Container */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="bg-[#0A0A1F]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 lg:p-16 shadow-2xl relative"
                >
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-t-3xl" />

                    <div className="prose prose-invert prose-lg max-w-none
                        prose-headings:font-bold prose-headings:text-white prose-headings:tracking-tight
                        prose-h1:text-2xl md:prose-h1:text-3xl prose-h1:mb-6 prose-h1:text-white
                        prose-h2:text-xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-3
                        prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-teal-300
                        prose-p:text-gray-400 prose-p:leading-relaxed prose-p:mb-5
                        prose-strong:text-white prose-strong:font-semibold
                        prose-li:text-gray-400 prose-li:mb-2
                        prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:text-cyan-300 hover:prose-a:underline
                        prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-500/5 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:rounded-r-xl prose-blockquote:my-8 prose-blockquote:italic prose-blockquote:text-gray-300
                    ">
                        {content ? (
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                rehypePlugins={[rehypeRaw]}
                            >
                                {/* SECURITY HARDENING: Strip out any potential <script> tags or malicious event handlers before rendering */}
                                {content
                                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                    .replace(/on\w+\s*=\s*(['"])(.*?)\1/gi, '')}
                            </ReactMarkdown>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
                                <p>{t('whitepaper.loading')}</p>
                            </div>
                        )}
                    </div>

                    {/* Interactive Token Distribution Chart */}
                    <TokenDistributionChart />
                </motion.div>
            </div>
        </div>
    );
};

export default WhitepaperPage;
