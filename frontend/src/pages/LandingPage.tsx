import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    Bot, Sparkles, Cpu, ChevronRight, Zap, Image as ImageIcon, Video,
    Music, BrainCircuit, Rocket, Shield, Crown, Terminal, ArrowRight,
    ShoppingCart, Gift, Download
} from 'lucide-react';
import WalletConnect from '@/components/WalletConnect';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import playHapticFeedback from '@/utils/haptics';

const ROBOT_MAX_SUPPLY = 80;
const ROBOT_PRICE_ZEX = "50,000";

const features = [
    { icon: ImageIcon, title: "ImageGen", desc: "Photorealistic 8K generation" },
    { icon: Video, title: "VideoSynth", desc: "Text-to-Video in seconds" },
    { icon: Music, title: "AudioLab", desc: "Voice cloning & music tracks" },
    { icon: Terminal, title: "Prompt AI", desc: "Auto-enhancing AI assistant" }
];

export default function LandingPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { scrollYProgress } = useScroll();
    const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

    const [activeTab, setActiveTab] = useState<'ico' | 'store'>('ico');
    const [robotsSold, setRobotsSold] = useState(12); // Simulated mock data

    const handleInteract = () => playHapticFeedback('light');

    return (
        <div className="min-h-screen bg-[#060612] text-white selection:bg-purple-500/30 overflow-hidden font-sans">

            {/* Dynamic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[150px]"></div>
                <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-pink-600/10 rounded-full blur-[100px] animate-pulse"></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md border-b border-white/5 bg-[#060612]/50">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-10 h-10 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="absolute inset-1 bg-gradient-to-tr from-purple-500 to-cyan-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                        <img src="/logo192.png" alt="ZexAi" className="relative w-10 h-10 object-contain drop-shadow-lg" />
                    </div>
                    <span className="text-2xl font-black tracking-tighter bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                        ZexAi
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    <div className="hidden md:block">
                        <WalletConnect />
                    </div>
                    <Link
                        to="/login"
                        onMouseEnter={handleInteract}
                        className="px-5 py-2.5 rounded-xl font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm"
                    >
                        App Login
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 pt-20 pb-32">

                {/* Hero Section */}
                <section className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8 flex flex-col items-center text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-4xl"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/30 text-purple-300 text-sm font-medium mb-8">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span>ZEX Token Presale is Live</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
                            The Next Evolution of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 animate-gradient-x">
                                AI & Web3 Innovation
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            ZexAi combines 40+ elite AI models with decentralized infrastructure. Generate world-class media, stake tokens, and shape the future of artificial intelligence.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a
                                href="#presale"
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2"
                            >
                                Join Presale <ArrowRight className="w-5 h-5" />
                            </a>
                            <a
                                href="/whitepaper"
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-lg transition-all flex items-center justify-center gap-2"
                            >
                                Read Whitepaper <Download className="w-5 h-5" />
                            </a>
                        </div>
                    </motion.div>

                    {/* Platform Preview or Stats */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="mt-20 w-full max-w-5xl rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-hidden p-8"
                    >
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { label: "Active Models", value: "40+" },
                                { label: "Generations / Min", value: "1,200+" },
                                { label: "ZEX Staked", value: "$4.2M" },
                                { label: "Global Users", value: "85K+" },
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-3xl md:text-4xl font-black bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent mb-2">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm font-medium text-purple-300 uppercase tracking-widest">
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </section>

                {/* Campaign Section: Store & Giveaway */}
                <section id="campaign" className="mt-32 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            ZexAi Founder's Edition
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Exclusive Humanoid Robots for early adopters. Buy directly from the store or win one through the ZEX Token Presale giveaway.
                        </p>
                    </div>

                    <div className="flex justify-center mb-8">
                        <div className="bg-white/5 border border-white/10 p-1 rounded-xl inline-flex text-sm">
                            <button
                                onClick={() => setActiveTab('store')}
                                className={`px-6 py-2.5 rounded-lg transition-all font-medium ${activeTab === 'store' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <ShoppingCart className="w-4 h-4 inline-block mr-2" /> Robot Store
                            </button>
                            <button
                                onClick={() => setActiveTab('ico')}
                                className={`px-6 py-2.5 rounded-lg transition-all font-medium ${activeTab === 'ico' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Gift className="w-4 h-4 inline-block mr-2" /> ICO & Giveaway
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#0A0A1F] border border-white/10 rounded-3xl p-8 lg:p-12 relative overflow-hidden shadow-2xl">
                        {/* Background Effects inside Card */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]"></div>

                        <AnimatePresence mode="wait">
                            {activeTab === 'store' ? (
                                <motion.div
                                    key="store"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                                >
                                    <div className="relative group">
                                        <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                                        <div className="relative aspect-square bg-[#050510] rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                                            {/* Placeholder for Robot Image */}
                                            <Bot className="w-48 h-48 text-purple-400/50" />
                                            <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500/50 text-red-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                                Strictly Limited
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-cyan-400 mb-4">
                                            UNIT {robotsSold + 1} / {ROBOT_MAX_SUPPLY}
                                        </div>
                                        <h3 className="text-3xl font-bold mb-4">ZexAi Humanoid Prototype v1</h3>
                                        <p className="text-gray-400 mb-8 leading-relaxed">
                                            Secure a piece of history. Only 80 units of the Founder's Edition Humanoid Robot will ever be produced. Fully integrated with the ZexAi ecosystem, featuring autonomous learning and Web3 wallet capabilities.
                                        </p>

                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                                            <div className="flex items-end justify-between mb-2">
                                                <span className="text-gray-400">Fixed Price</span>
                                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                                                    {ROBOT_PRICE_ZEX} ZEX
                                                </span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-2 mt-4 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full"
                                                    style={{ width: `${(robotsSold / ROBOT_MAX_SUPPLY) * 100}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 text-right">{ROBOT_MAX_SUPPLY - robotsSold} units remaining</p>
                                        </div>

                                        <button className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2">
                                            <ShoppingCart className="w-5 h-5" /> Buy Robot with Web3 Wallet
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="ico"
                                    id="presale"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                                >
                                    <div>
                                        <h3 className="text-3xl font-bold mb-4">ZEX Token Presale</h3>
                                        <p className="text-gray-400 mb-6 leading-relaxed">
                                            Purchase ZEX tokens during the Presale phase and automatically earn tickets for the Humanoid Robot Giveaway.
                                        </p>

                                        <ul className="space-y-4 mb-8">
                                            {[
                                                { tier: "Tier 1: 1,000 ZEX", tickets: "1 Ticket" },
                                                { tier: "Tier 2: 5,000 ZEX", tickets: "10 Tickets (2x Bonus)" },
                                                { tier: "Tier 3: 10,000 ZEX", tickets: "25 Tickets (2.5x Bonus)" },
                                                { tier: "Tier 4: 50,000 ZEX", tickets: "Guaranteed Robot OR 150 Tickets" }
                                            ].map((item, idx) => (
                                                <li key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                                    <span className="font-semibold">{item.tier}</span>
                                                    <span className="text-cyan-400 font-bold">{item.tickets}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-[#050510] border border-white/10 rounded-2xl p-8 text-center relative">
                                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500"></div>
                                        <Gift className="w-16 h-16 text-cyan-400 mx-auto mb-6" />
                                        <h4 className="text-2xl font-bold mb-2">Connect to Participate</h4>
                                        <p className="text-gray-400 mb-8 text-sm">
                                            Connect your Ethereum wallet to participate in the presale and secure your giveaway entries instantly.
                                        </p>
                                        <div className="flex justify-center">
                                            <WalletConnect />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 bg-[#03030A] py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <img src="/logo192.png" alt="ZexAi" className="w-6 h-6 grayscale opacity-70" />
                        <span className="text-gray-500 font-medium">© 2026 ZexAi. All rights reserved.</span>
                    </div>
                    <div className="flex gap-6 text-sm text-gray-400">
                        <a href="/whitepaper" className="hover:text-white transition-colors">Whitepaper</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Twitter</a>
                        <a href="#" className="hover:text-white transition-colors">Discord</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
