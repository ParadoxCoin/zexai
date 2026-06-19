import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ConnectButton from './ConnectButton';

const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'su', name: 'Sumerian', flag: '🗿' }
];

const Navbar: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [langMenuOpen, setLangMenuOpen] = useState(false);
    const langMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
                setLangMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setLangMenuOpen(false);
    };

    const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`fixed w-full top-8 z-50 transition-all duration-300 ${scrolled ? 'bg-[#060612]/90 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="relative flex items-center justify-center w-10 h-10 group cursor-pointer">
                            <div className="absolute inset-1 bg-gradient-to-tr from-teal-500 to-cyan-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                            <img src="/logo192.png" alt="ZexAi" className="relative w-10 h-10 object-contain drop-shadow-lg" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                            ZexAi
                        </span>
                    </a>

                    <div className="flex items-center gap-4">
                        {/* Language Switcher */}
                        <div className="relative hidden md:flex items-center" ref={langMenuRef}>
                            <button
                                onClick={() => setLangMenuOpen(!langMenuOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 text-sm font-medium text-gray-300 hover:text-white"
                            >
                                <Globe className="w-4 h-4 text-teal-400" />
                                <span>{currentLang.flag} {currentLang.name}</span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {langMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full right-0 mt-2 w-48 bg-[#0A0A1F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2"
                                    >
                                        {languages.map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => changeLanguage(lang.code)}
                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${i18n.language === lang.code ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                <span>{lang.flag}</span>
                                                {lang.name}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Wallet Connect Button */}
                        <div className="hidden md:flex items-center">
                            <ConnectButton />
                        </div>

                        {/* App Login */}
                        <a
                            href="https://app.zexai.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden md:block px-5 py-2.5 rounded-xl font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm text-white"
                        >
                            {t('nav.goToApp')}
                        </a>

                        {/* Mobile Menu Toggle */}
                        <div className="-mr-2 flex md:hidden">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="text-gray-400 hover:text-white p-2"
                            >
                                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="md:hidden bg-[#0A0A1F] border-b border-white/10"
                >
                    <div className="px-4 pt-4 pb-6 space-y-3">
                        {/* Mobile Language Switcher */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => changeLanguage(lang.code)}
                                    className={`px-3 py-2 rounded-lg text-sm text-center border transition-colors ${i18n.language === lang.code ? 'bg-teal-500/20 border-teal-500/50 text-teal-200' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                                >
                                    {lang.flag} {lang.name}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-center w-full">
                            <ConnectButton />
                        </div>
                        <a
                            href="https://app.zexai.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full block text-center px-5 py-3 rounded-xl font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm text-white"
                        >
                            {t('nav.goToApp')}
                        </a>
                    </div>
                </motion.div>
            )}
        </motion.nav>
    );
};

export default Navbar;
