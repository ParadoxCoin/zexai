import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface MarkdownPageProps {
    fileUrlTemplate: string;  // e.g. "/ZEX_TERMS_{LANG}.md"
    titleKey: string;         // e.g. "markdown.termsTitle"
}

const MarkdownPage: React.FC<MarkdownPageProps> = ({ fileUrlTemplate, titleKey }) => {
    const { t, i18n } = useTranslation();
    const [content, setContent] = useState('');
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        const lang = (i18n.language || 'en').toUpperCase();
        const fileUrl = fileUrlTemplate.replace('{LANG}', lang);
        const fallbackUrl = fileUrlTemplate.replace('{LANG}', 'EN');

        fetch(fileUrl)
            .then(res => {
                if (!res.ok) return fetch(fallbackUrl).then(r => r.text());
                return res.text();
            })
            .then(text => setContent(text))
            .catch(err => console.error("Error loading markdown:", err));
    }, [fileUrlTemplate, location.pathname, i18n.language]);

    return (
        <div className="min-h-screen bg-[#060612] text-gray-300 font-sans selection:bg-cyan-500/30 overflow-x-hidden pt-24 pb-32">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-teal-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[30%] bg-cyan-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                    >
                        <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </div>
                        <span className="font-medium">{t('markdown.backToHome')}</span>
                    </Link>

                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 border border-white/10 rounded-full">
                        <FileText className="w-5 h-5 text-cyan-400" />
                        <span className="font-bold text-gray-200 uppercase text-xs tracking-widest">
                            {t(titleKey)}
                        </span>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-[#0A0A1F]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative"
                >
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-t-3xl opacity-50" />

                    <div className="prose prose-invert prose-lg max-w-none
                        prose-headings:text-white prose-headings:tracking-tight
                        prose-h1:text-3xl md:prose-h1:text-4xl prose-h1:mb-6 prose-h1:font-black
                        prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:font-bold prose-h2:text-cyan-300
                        prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-teal-300
                        prose-p:text-gray-400 prose-p:leading-relaxed prose-p:mb-5
                        prose-strong:text-white prose-strong:font-bold
                        prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-6
                        prose-li:text-gray-400 prose-li:mb-2 prose-li:marker:text-cyan-500
                        prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
                        prose-blockquote:border-l-4 prose-blockquote:border-cyan-500 prose-blockquote:bg-white/5 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:rounded-r-xl prose-blockquote:my-6 prose-blockquote:italic
                        prose-hr:border-white/10 prose-hr:my-10
                    ">
                        {content ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content}
                            </ReactMarkdown>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                                <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                                <p className="text-sm uppercase tracking-widest text-cyan-300">{t('markdown.loading')}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default MarkdownPage;
