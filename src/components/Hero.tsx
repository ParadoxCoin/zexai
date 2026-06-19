import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Trans, useTranslation } from 'react-i18next';
import {
    Sparkles, ArrowRight,
    Palette, Heart, Coins, Shield, Bot, Gift, ShoppingCart, Quote,
    Ruler, Weight, Zap, Cpu, Scan as Radar, CreditCard, Landmark, Wallet, Check, Box, Copy, Users, Link as LinkIcon
} from 'lucide-react';
import ConnectButton from './ConnectButton';
import PresaleForm from './PresaleForm';
import { RobotCanvas } from './RobotCanvas';
import Roadmap from './Roadmap';
import StakingCalculator from './StakingCalculator';
import TeamSection from './TeamSection';


const ROBOT_MAX_SUPPLY = 50; // Reduced from 80 to 50 for Hyper-Exclusivity FOMO
const PRESALE_ADDRESS = "0x3B1029B045D635447EFF6973e95156d9a1285480";
const TOKEN_ADDRESS = "0x28De651aCA0f8584FA2E072cE7c1F4EE774a8B4a";
const ROBOT_WALLET = "0xEFBDe0B0B3eA2d5C13103E396Ada1958e4A580e3";
const ROBOT_PRICE_USD = 13500;

const PRESALE_ABI = [{ "inputs": [], "name": "getCurrentPrice", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];
const ERC20_ABI = [{ "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }];

const Hero: React.FC = () => {
    const { isConnected, address } = useAccount();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'vision' | 'tokenomics' | 'robot' | 'sdk'>('vision');
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [robotsSold, setRobotsSold] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'web3' | 'cc' | 'bank'>('web3');
    const [activeMedia, setActiveMedia] = useState(0);

    const [deliveryInfo, setDeliveryInfo] = useState({ name: '', email: '', phone: '', address: '' });
    const isFormValid = deliveryInfo.name && deliveryInfo.email && deliveryInfo.phone && deliveryInfo.address;

    const { data: currentPriceData } = useReadContract({
        address: PRESALE_ADDRESS as any,
        abi: PRESALE_ABI,
        functionName: 'getCurrentPrice',
    });

    const currentPriceUSD = 0.0012; 
    const rawZexRequired = Math.floor(ROBOT_PRICE_USD / currentPriceUSD);
    const discountedZex = Math.floor(rawZexRequired * 0.9);

    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    useEffect(() => {
        if (isTxSuccess) {
            // Send email securely via Vercel Edge Function using Resend
            fetch('/api/resend', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...deliveryInfo, order: 'ZexAI Robot', amount: discountedZex + ' ZEX' })
            }).catch(console.error);
            setRobotsSold(prev => prev + 1);
            alert("Ödeme başarılı! Teslimat bilgileriniz sisteme iletildi. Siparişiniz incelenecek.");
        }
    }, [isTxSuccess]);

    const handlePurchase = async () => {
        if (!isFormValid) return alert("Lütfen teslimat formunu eksiksiz doldurun.");
        writeContract({
            address: TOKEN_ADDRESS as any,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [ROBOT_WALLET, parseEther(discountedZex.toString())]
        });
    };

    const tabs: ('vision' | 'robot' | 'sdk')[] = ['vision', 'robot', 'sdk'];

    useEffect(() => {
        if (!isAutoPlaying) return;
        const interval = setInterval(() => {
            setActiveTab(prev => {
                const tz = ['vision', 'robot', 'sdk'] as const;
                const currentIndex = tz.indexOf(prev as any);
                return tz[(currentIndex + 1) % tz.length] as any;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [isAutoPlaying]);

    const handleDragEnd = (_event: any, info: any) => {
        setIsAutoPlaying(false);
        const swipeThreshold = 50;
        if (info.offset.x < -swipeThreshold) {
            // Swiped left -> next tab
            const currentIndex = tabs.indexOf(activeTab);
            if (currentIndex < tabs.length - 1) {
                setActiveTab(tabs[currentIndex + 1]);
            }
        } else if (info.offset.x > swipeThreshold) {
            // Swiped right -> prev tab
            const currentIndex = tabs.indexOf(activeTab);
            if (currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1]);
            }
        }
    };

    const robotMedia = [
        { type: '3d' as const, src: '3d', alt: 'ZexAI 3D AI Core' },
        { type: 'image' as const, src: '/robot-hero.png', alt: 'ZexAI Humanoid Robot - Front View' },
        { type: 'image' as const, src: '/robot-detail.png', alt: 'ZexAI Humanoid Robot - Detail' },
        { type: 'video' as const, src: 'https://www.youtube.com/embed/GzX1qOIO1bE', alt: 'Unitree G1 Demo Video' },
    ];

    return (
        <>
            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
                {/* Background Elements */}
                <div className="absolute inset-0 bg-[#060612]">
                    {/* Grain/noise texture — inline SVG data URI (no external dependency) */}
                    <div
                      className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '200px 200px',
                      }}
                    />
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-600/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[150px]" />
                    <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-emerald-600/10 rounded-full blur-[100px] animate-pulse" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-4xl"
                    >
                        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-emerald-500/30 text-emerald-300 text-sm font-medium">
                                <Heart className="w-4 h-4 text-emerald-400" />
                                <span>{t('hero.visionBadge')}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-sm font-bold animate-pulse shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                                <Zap className="w-4 h-4 text-teal-400" />
                                <span>{t('hero.creditsBadge') || 'CREDITS NEVER EXPIRE'}</span>
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
                            {t('hero.mainTitleLine1')} <br />
                            <span className="text-white">
                                {t('hero.mainTitleLine2')}
                            </span>
                        </h1>

                        <p className="text-base md:text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            {t('hero.description')}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => {
                                    document.getElementById('tokenomics')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2"
                            >
                                {t('hero.joinPresale')} <ArrowRight className="w-5 h-5" />
                            </button>
                            <a
                                href="https://app.zexai.io"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-lg transition-all flex items-center justify-center gap-2"
                            >
                                {t('hero.tryApp')} <Palette className="w-5 h-5" />
                            </a>
                        </div>
                    </motion.div>

                    {/* Platform Stats */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="mt-20 w-full max-w-5xl rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-hidden p-8"
                    >
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { label: t('hero.stats.aiModels'), value: "40+" },
                                { label: t('hero.stats.emotions'), value: "5+" },
                                { label: t('hero.stats.communityShare'), value: "25%" },
                                { label: t('hero.stats.status'), value: t('hero.stats.statusLive') },
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    className="text-center"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4 + i * 0.15, duration: 0.6 }}
                                >
                                    <div className="text-3xl md:text-4xl font-black bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent mb-2 stat-glow">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm font-medium text-teal-300 uppercase tracking-widest">
                                        {stat.label}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                </div>
            </section>

            {/* The Story / Whitepaper Narrative Section */}
            <section className="py-24 px-4 mx-auto max-w-6xl sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                    className="relative text-center mb-16"
                >
                    <Quote className="w-12 h-12 text-emerald-500/50 mx-auto mb-6" />
                    <h2 className="text-3xl md:text-4xl font-black mb-6">{t('story.title')}</h2>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-12 text-gray-400 text-lg leading-relaxed relative"
                >
                    <div className="space-y-6">
                        <p>
                            <Trans i18nKey="story.p1">
                                Our global technology vision is based on the principle that artificial intelligence should not just be a digital tool, but a "mind" that manages the physical world. Today, AI production and robotic control systems are progressing separately.
                            </Trans>
                        </p>
                        <p>
                            {t('story.p2')}
                        </p>
                    </div>
                    <div className="space-y-6">
                        <p>
                            <Trans i18nKey="story.p3">
                                Our platform serves as a bridge connecting multi-model AI architecture with physical world robots. <strong className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">ZexAI is not just a tool, but the backbone of the next generation digital and robotic economy.</strong>
                            </Trans>
                        </p>
                        <p>
                            {t('story.p4')}
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mt-12 text-center"
                >
                    <Link to="/whitepaper" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition-colors font-medium">
                        {t('story.readWhitepaper')} <ArrowRight className="w-4 h-4" />
                    </Link>
                </motion.div>
            </section>

            {/* Campaign Section: Vision, Tokenomics & Physical Robot */}
            <section id="campaign" className="mt-16 px-2 mx-auto max-w-[120rem] sm:px-4 lg:px-6 xl:px-8 pb-32">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        {t('campaign.title')}
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        {t('campaign.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12 items-start relative">
                    {/* Left Main Content */}
                    <div className="xl:col-span-7 flex flex-col w-full min-w-0">
                        <div className="flex justify-center mb-8 flex-wrap gap-2 w-full">
                            <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex flex-wrap text-sm">
                                <button
                                    onClick={() => { setActiveTab('vision'); setIsAutoPlaying(false); }}
                                    className={`px-4 sm:px-6 py-2.5 rounded-lg transition-all font-medium flex items-center ${activeTab === 'vision' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Palette className="w-4 h-4 mr-2" /> {t('campaign.tabVision')}
                                </button>
                                <button
                                    onClick={() => { setActiveTab('robot'); setIsAutoPlaying(false); }}
                                    className={`px-4 sm:px-6 py-2.5 rounded-lg transition-all font-medium flex items-center ${activeTab === 'robot' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Bot className="w-4 h-4 mr-2" /> {t('campaign.tabRobot')}
                                </button>
                                <button
                                    onClick={() => { setActiveTab('sdk'); setIsAutoPlaying(false); }}
                                    className={`px-4 sm:px-6 py-2.5 rounded-lg transition-all font-medium flex items-center ${activeTab === 'sdk' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Cpu className="w-4 h-4 mr-2" /> {t('campaign.tabSdk')}
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#0A0A1F] border border-white/10 rounded-3xl p-8 lg:p-12 relative overflow-hidden shadow-2xl">
                    {/* Background Effects inside Card */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px]" />

                    <AnimatePresence mode="wait">
                        {activeTab === 'vision' && (
                            <motion.div
                                key="vision"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.2}
                                dragDirectionLock
                                onDragEnd={handleDragEnd}
                                className="grid grid-cols-1 2xl:grid-cols-2 gap-12 items-center touch-pan-y"
                            >
                                <div className="relative group">
                                    <div className="absolute -inset-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                                    <div className="relative aspect-square bg-[#050510] rounded-2xl border border-white/10 flex flex-col items-center justify-center overflow-hidden p-8 text-center">
                                        <img src="/logo192.png" alt="ZexAI" className="w-32 h-32 mb-6 drop-shadow-[0_0_30px_rgba(236,72,153,0.4)]" />
                                        <h4 className="text-2xl font-bold mb-2">{t('vision.agentTitle')}</h4>
                                        <p className="text-gray-400">
                                            {t('vision.agentDesc')}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-cyan-400 mb-4">
                                        {t('vision.mintBadge')}
                                    </div>
                                    <h3 className="text-3xl font-bold mb-4">{t('vision.mintTitle')}</h3>
                                    <p className="text-gray-400 mb-8 leading-relaxed">
                                        {t('vision.mintDesc')}
                                    </p>

                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                                        <h4 className="text-lg font-semibold mb-4 text-white">{t('vision.whyWinTitle')}</h4>
                                        <ul className="space-y-3">
                                            <li className="flex items-center text-sm text-gray-300">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-3" />
                                                {t('vision.whyWin1')}
                                            </li>
                                            <li className="flex items-center text-sm text-gray-300">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-3" />
                                                {t('vision.whyWin2')}
                                            </li>
                                            <li className="flex items-center text-sm text-gray-300">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-3" />
                                                {t('vision.whyWin3')}
                                            </li>
                                        </ul>
                                    </div>

                                    <button className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2">
                                        <Palette className="w-5 h-5" /> {t('vision.startCreating')}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'sdk' && (
                            <motion.div
                                key="sdk"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.2}
                                dragDirectionLock
                                onDragEnd={handleDragEnd}
                                className="grid grid-cols-1 2xl:grid-cols-2 gap-12 items-center touch-pan-y"
                            >
                                <div className="space-y-6">
                                    <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-indigo-400 mb-4">
                                        {t('sdk.badge')}
                                    </div>
                                    <h3 className="text-3xl lg:text-4xl font-black mb-4">{t('sdk.title')}</h3>
                                    <p className="text-gray-400 leading-relaxed text-lg">
                                        {t('sdk.desc')}
                                    </p>
                                    
                                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 mb-8 mt-4 shadow-inner">
                                        <h4 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                                            <ShoppingCart className="w-5 h-5 text-indigo-400"/> {t('sdk.marketTitle')}
                                        </h4>
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            {t('sdk.marketDesc')}
                                        </p>
                                    </div>
                                    
                                    <Link to="/docs" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                                        {t('sdk.docsBtn')} <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </div>
                                
                                <div className="relative group lg:ml-8 perspective-1000">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                                    <div className="relative bg-[#050510] rounded-2xl border border-white/10 overflow-hidden transform transition-all duration-500 group-hover:rotate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                                        <div className="flex items-center px-4 py-3 bg-white/5 border-b border-white/10">
                                            <div className="flex space-x-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                            </div>
                                            <div className="mx-auto text-xs text-gray-500 font-mono">zexai-sdk-deploy.ts</div>
                                        </div>
                                        <div className="p-6 overflow-x-auto text-[13px] md:text-sm font-mono leading-relaxed bg-[#020208]">
<pre className="text-gray-300">
<span className="text-purple-400">import</span> {'{'} ZexClient {'}'} <span className="text-purple-400">from</span> <span className="text-green-300">'@zexai/sdk'</span>;{'\n\n'}
<span className="text-gray-500">// 1. Initialize the SDK with Web3 Provider</span>{'\n'}
<span className="text-purple-400">const</span> zex = <span className="text-purple-400">new</span> ZexClient({'{'}{'\n'}
{'  '}apiKey: process.env.ZEX_KEY,{'\n'}
{'  '}network: <span className="text-green-300">'polygon-mainnet'</span>{'\n'}
{'}'});{'\n\n'}
<span className="text-gray-500">// 2. Purchase AI Security Module using $ZEX</span>{'\n'}
<span className="text-purple-400">await</span> zex.robotMarket.installModule({'{'}{'\n'}
{'  '}robotId: <span className="text-green-300">'unitree-g1-0x4f...'</span>,{'\n'}
{'  '}moduleId: <span className="text-green-300">'sec-patrol-v2'</span>,{'\n'}
{'  '}payWith: <span className="text-green-300">'$ZEX'</span>,{'\n'}
{'  '}maxFee: <span className="text-orange-400">500</span>{'\n'}
{'}'});
</pre>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}



                        {activeTab === 'robot' && (
                            <motion.div
                                key="robot"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.2}
                                dragDirectionLock
                                onDragEnd={handleDragEnd}
                                className="grid grid-cols-1 2xl:grid-cols-12 gap-12 items-start touch-pan-y"
                            >
                                {/* Left Column: Robot Visual & Specs */}
                                <div className="2xl:col-span-5 space-y-4">
                                    {/* Main Media Display */}
                                    <div className="relative group">
                                        <div className="absolute -inset-4 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                                        <div className="relative aspect-[4/3] bg-[#050510] rounded-3xl border border-white/10 overflow-hidden">
                                            {robotMedia[activeMedia].type === '3d' ? (
                                                <div className="absolute inset-0 cursor-move">
                                                    <RobotCanvas />
                                                </div>
                                            ) : robotMedia[activeMedia].type === 'image' ? (
                                                <img
                                                    src={robotMedia[activeMedia].src}
                                                    alt={robotMedia[activeMedia].alt}
                                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                                                />
                                            ) : (
                                                <iframe
                                                    src={robotMedia[activeMedia].src}
                                                    title={robotMedia[activeMedia].alt}
                                                    className="w-full h-full"
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            )}
                                            <div className="absolute top-4 left-4 bg-teal-500/20 border border-teal-500/50 text-teal-300 px-3 py-1 rounded-full text-xs font-bold tracking-wider backdrop-blur-md flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" /> {t('robot.badgeLimited')}
                                            </div>
                                            <div className="absolute bottom-4 right-4 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                                {t('robot.badgeAi')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Thumbnail Strip */}
                                    <div className="flex gap-2">
                                        {robotMedia.map((media, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setActiveMedia(i)}
                                                className={`relative flex-1 aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                                                    activeMedia === i
                                                        ? 'border-teal-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                                        : 'border-white/10 opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                {media.type === '3d' ? (
                                                    <div className="w-full h-full bg-[#050510] flex flex-col items-center justify-center border border-teal-500/20 group-hover:border-teal-400">
                                                        <Box className="w-6 h-6 text-teal-400 mb-1" />
                                                        <span className="text-[10px] text-teal-400 font-bold">3D CORE</span>
                                                    </div>
                                                ) : media.type === 'image' ? (
                                                    <img src={media.src} alt={media.alt} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-[#050510] flex items-center justify-center">
                                                        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tech Specs Grid */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                            <Radar className="w-4 h-4 text-cyan-400" />
                                            {t('robot.specsTitle')}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {[
                                                { icon: <Ruler className="w-4 h-4" />, text: t('robot.specs.height') },
                                                { icon: <Weight className="w-4 h-4" />, text: t('robot.specs.weight') },
                                                { icon: <Zap className="w-4 h-4" />, text: t('robot.specs.speed') },
                                                { icon: <Bot className="w-4 h-4" />, text: t('robot.specs.dof') },
                                                { icon: <Zap className="w-4 h-4" />, text: t('robot.specs.battery') },
                                                { icon: <Cpu className="w-4 h-4" />, text: t('robot.specs.compute') },
                                                { icon: <Radar className="w-4 h-4" />, text: t('robot.specs.sensors') },
                                            ].map((spec, i) => (
                                                <div key={i} className="flex items-center gap-3 text-sm text-gray-400 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                                    <span className="text-cyan-400">{spec.icon}</span>
                                                    {spec.text}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Viral Raffle Section (Moved to Left Column) */}
                                    <div className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 rounded-2xl p-5 flex flex-col items-center text-center gap-4">
                                        <div className="bg-emerald-500/20 p-3 rounded-2xl">
                                            <Gift className="w-8 h-8 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-white mb-2">{t('robot.raffleTitle')}</h4>
                                            <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                                <Trans i18nKey="robot.raffleDesc">
                                                    Earn your raffle ticket by purchasing <strong className="text-white">at least 10,000 ZEX</strong> during the presale.
                                                </Trans>
                                            </p>
                                            <button className="w-full px-4 py-2 rounded-xl border border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-300 font-bold text-xs transition-all opacity-70 cursor-not-allowed">
                                                {t('robot.raffleBtn')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Purchase Form */}
                                <div className="2xl:col-span-7 space-y-6">
                                    <div>
                                        <h3 className="text-4xl font-black mb-4">{t('robot.title')}</h3>
                                        <p className="text-gray-400 mb-6 leading-relaxed text-lg">
                                            <Trans i18nKey="robot.desc">
                                                Transcend the limits of software! Own a custom-built Humanoid Robot, 100% integrated into the ZexAI ecosystem. The first batch is strictly limited to <strong className="text-white">only 80 units</strong> and will never be produced again.
                                            </Trans>
                                        </p>
                                    </div>

                                    <div className="bg-[#0D0D2B] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                                        {/* Status Header */}
                                        <div className="p-6 bg-gradient-to-r from-teal-900/40 to-cyan-900/40 border-b border-white/10">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <ShoppingCart className="w-6 h-6 text-teal-400" />
                                                    <h4 className="text-xl font-bold text-white">{t('robot.buyTitle')}</h4>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
                                                        $13,500 USD
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-400 flex items-center justify-end gap-2 mt-1">
                                                        <span className="line-through text-gray-500">{rawZexRequired.toLocaleString()} ZEX</span>
                                                        <span className="text-emerald-400 font-bold">≈ {discountedZex.toLocaleString()} ZEX</span>
                                                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                                            %10 İndirim
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mb-2">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(robotsSold / ROBOT_MAX_SUPPLY) * 100}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className="bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 h-full rounded-full"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold mt-1">
                                                <span className="text-gray-400">{robotsSold} / {ROBOT_MAX_SUPPLY} {t('robot.badgeLimited').toUpperCase()}</span>
                                                <span className="text-cyan-400 animate-pulse">{t('robot.buyLeft', { count: ROBOT_MAX_SUPPLY - robotsSold })}</span>
                                            </div>
                                        </div>

                                        {/* Payment Selection */}
                                        <div className="p-6 space-y-4">
                                            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('robot.paymentMethods')}</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {[
                                                    { id: 'web3', icon: <Wallet className="w-5 h-5" />, label: "ZEX Token (Polygon)" },
                                                    { id: 'cc', icon: <CreditCard className="w-5 h-5" />, label: "Kart (LemonSqueezy)" },
                                                    { id: 'bank', icon: <Landmark className="w-5 h-5" />, label: "Binance Pay / Crypto" },
                                                ].map((method) => (
                                                    <button
                                                        key={method.id}
                                                        onClick={() => setPaymentMethod(method.id as any)}
                                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 ${paymentMethod === method.id
                                                            ? 'bg-teal-600/20 border-teal-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {method.icon}
                                                        <span className="text-xs font-semibold text-center">{method.label}</span>
                                                        {paymentMethod === method.id && <Check className="w-3 h-3 absolute top-2 right-2 text-teal-400" />}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Dynamic Form based on Payment Method */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={paymentMethod}
                                                className="mt-6 space-y-6"
                                            >
                                                {/* Delivery Info Form - Required for all methods */}
                                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                                    <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                                                        <Box className="w-4 h-4 text-teal-400" /> {t('robot.shippingTitle', { defaultValue: 'Shipping & Delivery Information' })}
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <input type="text" placeholder={t('robot.shippingName', { defaultValue: 'Full Name' })} value={deliveryInfo.name} onChange={e => setDeliveryInfo({...deliveryInfo, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500" />
                                                        <input type="email" placeholder={t('robot.shippingEmail', { defaultValue: 'Email Address' })} value={deliveryInfo.email} onChange={e => setDeliveryInfo({...deliveryInfo, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500" />
                                                        <input type="tel" placeholder={t('robot.shippingPhone', { defaultValue: 'Phone Number' })} value={deliveryInfo.phone} onChange={e => setDeliveryInfo({...deliveryInfo, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 sm:col-span-2" />
                                                        <textarea placeholder={t('robot.shippingAddress', { defaultValue: 'Full Shipping Address' })} value={deliveryInfo.address} onChange={e => setDeliveryInfo({...deliveryInfo, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 sm:col-span-2 min-h-[80px]" />
                                                    </div>
                                                </div>

                                                {paymentMethod === 'web3' && (
                                                    <div className="text-center">
                                                        <button 
                                                            disabled={true}
                                                            className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all flex items-center justify-center gap-2 bg-[#050510] border border-white/5 opacity-80 cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.03)]"
                                                        >
                                                            <ShoppingCart className="w-5 h-5 text-gray-500" /> 
                                                            <span className="text-gray-400 tracking-wider">{t('robot.phase2Unlock', { defaultValue: 'PHASE 2: UNLOCKING SOON' })}</span>
                                                        </button>
                                                        <p className="text-[11px] text-teal-500/70 mt-3 font-medium tracking-wide">{t('robot.phase2Desc', { defaultValue: 'Hardware allocation is strictly reserved for Phase 2 participants.' })}</p>
                                                    </div>
                                                )}

                                                {paymentMethod === 'cc' && (
                                                    <div className="bg-[#050510] border border-white/5 rounded-2xl p-6 text-center space-y-4">
                                                        <CreditCard className="w-12 h-12 text-gray-600 mx-auto opacity-50" />
                                                        <p className="text-sm text-gray-500 leading-relaxed">
                                                            {t('robot.ccDescShort', { defaultValue: 'Seamless fiat integration via LemonSqueezy. Global credit & debit cards accepted.' })}
                                                        </p>
                                                        <button disabled className="w-full py-4 rounded-xl bg-[#030308] text-gray-500 font-bold text-sm tracking-widest transition-all cursor-not-allowed border border-white/5">
                                                            {t('robot.phase2Exclusive', { defaultValue: 'PHASE 2 EXCLUSIVE' })}
                                                        </button>
                                                    </div>
                                                )}

                                                {paymentMethod === 'bank' && (
                                                    <div className="bg-[#050510] border border-white/5 rounded-2xl p-6 text-center space-y-4">
                                                        <Box className="w-12 h-12 text-teal-600 mx-auto opacity-50" />
                                                        <p className="text-sm text-gray-500 leading-relaxed">
                                                            {t('robot.bankDescShort', { defaultValue: 'Process secure crypto transactions via Binance Pay or NOWPayments.' })}
                                                        </p>
                                                        <button disabled className="w-full py-4 rounded-xl bg-[#030308] text-gray-500 font-bold text-sm tracking-widest transition-all cursor-not-allowed border border-white/5">
                                                            {t('robot.phase2Exclusive', { defaultValue: 'PHASE 2 EXCLUSIVE' })}
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Additional Sections integrated into Left Column for sticky sidebar effect */}
                <div className="mt-24 space-y-24 w-full">
                    
                    {/* New Static Tokenomics Section */}
                    <div id="tokenomics" className="relative scroll-mt-24">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium mb-4">
                                <Coins className="w-4 h-4" />
                                <span>{t('tokenomics.supplyBadge')}</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                $ZEX Economy & Utility
                            </h2>
                            <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
                                {t('tokenomics.desc')}
                            </p>
                        </div>

                        {/* Token Distribution (6 items in 3x2 grid) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
                            {Array.isArray(t('tokenomics.tiers', { returnObjects: true })) 
                                ? (t('tokenomics.tiers', { returnObjects: true }) as any[]).map((item, idx) => {
                                    const colors = [
                                        'from-purple-500 to-indigo-500', 
                                        'from-cyan-500 to-blue-500', 
                                        'from-emerald-500 to-teal-500',
                                        'from-amber-500 to-orange-500',
                                        'from-pink-500 to-rose-500',
                                        'from-gray-400 to-gray-600'
                                    ];
                                    const colorStr = colors[idx % colors.length];
                                    return (
                                    <div key={idx} className="bg-[#050510] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors shadow-lg hover:-translate-y-1">
                                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colorStr}`}></div>
                                        <h4 className="text-xl font-black text-white mb-2 tracking-tight">{item.name?.split('—')[0]?.trim() || item.name}</h4>
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{item.name?.split('—')[1]?.trim() || ''}</div>
                                        <p className="text-sm text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">{item.desc}</p>
                                    </div>
                                )}) : null}
                        </div>

                        {/* Token Utility Section */}
                        <div className="bg-gradient-to-br from-[#0A0A1F] to-[#050510] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
                            <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 text-center sm:text-left">
                                <Shield className="w-12 h-12 text-cyan-400" />
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">{t('tokenomics.utilityTitle')}</h3>
                                    <p className="text-sm text-gray-400">{t('tokenomics.utilityDesc')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:bg-white/10 transition-colors group">
                                    <div className="bg-red-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform">🔥</div>
                                    <h4 className="text-white font-bold mb-2">{t('tokenomics.burnTitle')}</h4>
                                    <p className="text-sm text-gray-400 leading-relaxed">{t('tokenomics.burnDesc')?.replace(/^:\s*/, '')}</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:bg-white/10 transition-colors group">
                                    <div className="bg-amber-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform">💰</div>
                                    <h4 className="text-white font-bold mb-2">{t('tokenomics.yieldTitle')}</h4>
                                    <p className="text-sm text-gray-400 leading-relaxed">{t('tokenomics.yieldDesc')?.replace(/^:\s*/, '')}</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:bg-white/10 transition-colors group">
                                    <div className="bg-teal-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform">🤖</div>
                                    <h4 className="text-white font-bold mb-2">{t('tokenomics.robotTitle')}</h4>
                                    <p className="text-sm text-gray-400 leading-relaxed">{t('tokenomics.robotDesc')?.replace(/^:\s*/, '')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Roadmap />
                    <StakingCalculator />
                    <TeamSection />
                </div>
            </div>

            {/* Right Sticky Sidebar (Visible below tabs on mobile, right on desktop) */}
            <div className="xl:col-span-5 sticky top-24 z-10 w-full mt-8 xl:mt-0 space-y-6">
                <div className="bg-[#050510] border border-white/10 rounded-3xl p-6 lg:p-8 relative shadow-[0_0_50px_rgba(6,182,212,0.1)]">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
                    <div className="flex justify-center w-full">
                        <PresaleForm />
                    </div>
                </div>
            </div>
        </div>
    </section>
</>
    );
};

export default Hero;

