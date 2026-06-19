import React, { useEffect, useState } from 'react';
import { referralService, ReferralStats, ReferralEarning } from '@/services/referralService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Users, Zap, TrendingUp, Share2, Check, Sparkles, Gift, ArrowRight, Twitter, Send, MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const REFERRAL_BASE_URL = 'https://app.zexai.io/ref/';

const ReferralPage: React.FC = () => {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [history, setHistory] = useState<ReferralEarning[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const toast = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const statsRes = await referralService.getStats();
            if (statsRes.data) {
                setStats(statsRes.data as any);
            }

            const historyRes = await referralService.getHistory();
            setHistory(historyRes.data as any || []);
        } catch (error) {
            console.error("Failed to fetch referral data", error);
        } finally {
            setLoading(false);
        }
    };

    const createCode = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        try {
            const res = await referralService.createCode();
            console.log("Code generation response:", res);
            await fetchData();
            toast.success("Success", "Your referral identity has been activated!");
        } catch (error: any) {
            console.error("Failed to create code", error);
            toast.error("Activation Failed", error.response?.data?.detail || "Could not connect to the referral engine.");
        } finally {
            setIsGenerating(false);
        }
    };

    const referralUrl = stats?.code ? `${REFERRAL_BASE_URL}${stats.code.replace('MANUS-', 'ZEXAI-')}` : 'Activate to get your link';

    const copyUrl = () => {
        if (!stats?.code) {
            createCode();
            return;
        }
        navigator.clipboard.writeText(referralUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied", "Link copied to clipboard!");
    };

    const getShareMessage = () => {
        return `🚀 Transform your creativity with ZexAi! Join the ultimate AI ecosystem and start generating stunning images, videos, and music. \n\nUse my referral link to get exclusive perks: ${referralUrl}\n\n#ZexAi #AI #Web3 #Creativity`;
    };

    const handleShare = (platform: 'twitter' | 'telegram' | 'whatsapp') => {
        if (!stats?.code) {
            toast.info("Activation Required", "Please activate your identity first.");
            createCode();
            return;
        }

        const msg = getShareMessage();
        if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`, '_blank');
        if (platform === 'telegram') window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(msg)}`, '_blank');
        if (platform === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                        <Sparkles className="w-5 h-5 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-gray-400 font-medium animate-pulse">Synchronizing Referral Engine...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-5xl animate-in fade-in duration-700">
            {/* Header / Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-[2rem] p-10 border border-white/10 shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Zap className="w-48 h-48 text-purple-400" />
                </div>
                
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/20">
                            <Gift className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-white">Referral Program</h1>
                            <p className="text-gray-400 text-lg">Invite friends, earn free credits</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all group">
                            <Sparkles className="w-6 h-6 mb-3 text-purple-400 group-hover:scale-110 transition-transform" />
                            <p className="text-3xl font-black text-white">5%</p>
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Value in Credits</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-blue-500/30 transition-all group">
                            <Users className="w-6 h-6 mb-3 text-blue-400 group-hover:scale-110 transition-transform" />
                            <p className="text-3xl font-black text-white">{stats?.total_referrals || 0}</p>
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Referrals</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-emerald-500/30 transition-all group">
                            <Zap className="w-6 h-6 mb-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <p className="text-3xl font-black text-white">{stats?.total_earnings?.toFixed(0) || 0}</p>
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Credits Earned</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Always Visible Now */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Share Card */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-8 bg-[#0a0a0f] border-gray-800 shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl group-hover:bg-purple-600/10 transition-all" />
                        
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Share2 className="w-5 h-5 text-purple-400" />
                                    Spread the Word
                                </h3>
                                <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 uppercase tracking-widest">
                                    Instant CR Payouts
                                </span>
                            </div>

                            <div className="space-y-4">
                                {!stats?.code ? (
                                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6 text-center space-y-4">
                                        <p className="text-gray-400 text-sm">Your unique referral identity is not active yet.</p>
                                        <Button 
                                            onClick={createCode} 
                                            disabled={isGenerating}
                                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl px-8"
                                        >
                                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                                            Generate My Referral Code <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="group/input relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <TrendingUp className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <input
                                            type="text"
                                            value={referralUrl}
                                            readOnly
                                            className="w-full bg-gray-900/50 border border-gray-800 rounded-2xl pl-12 pr-32 py-4 text-sm font-mono text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                                        />
                                        <button
                                            onClick={copyUrl}
                                            className={`absolute right-2 top-2 bottom-2 px-6 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                                                copied ? 'bg-emerald-500 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'
                                            }`}
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copied ? 'COPIED' : 'COPY'}
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-3">
                                    <button onClick={() => handleShare('twitter')} className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-black hover:bg-gray-900 border border-white/5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]">
                                        <Twitter className="w-4 h-4" /> Twitter / X
                                    </button>
                                    <button onClick={() => handleShare('telegram')} className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-[#0088cc] hover:bg-[#0099ee] rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]">
                                        <Send className="w-4 h-4" /> Telegram
                                    </button>
                                    <button onClick={() => handleShare('whatsapp')} className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#26e46e] rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]">
                                        <MessageCircle className="w-4 h-4" /> WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* How it works */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { title: "1. Share", desc: "Send your link to friends", icon: <Share2 className="w-5 h-5" /> },
                            { title: "2. Sign Up", desc: "They join & purchase", icon: <Users className="w-5 h-5" /> },
                            { title: "3. Earn", desc: "5% Credits instantly", icon: <Zap className="w-5 h-5" /> }
                        ].map((step, idx) => (
                            <div key={idx} className="p-6 bg-gray-900/30 border border-gray-800 rounded-2xl text-center space-y-2">
                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-2 text-purple-400 border border-white/5">
                                    {step.icon}
                                </div>
                                <h4 className="text-sm font-bold text-white">{step.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar / Stats */}
                <div className="space-y-6">
                    <Card className="p-6 bg-gray-900/50 border-gray-800 rounded-2xl h-full flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" /> Recent Activity
                        </h3>
                        
                        <div className="flex-1 space-y-4">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 opacity-20">
                                        <Gift className="w-8 h-8" />
                                    </div>
                                    <p className="text-gray-500 text-sm">No activity recorded yet.</p>
                                </div>
                            ) : (
                                history.slice(0, 5).map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-white">Purchase Detected</p>
                                            <p className="text-[10px] text-gray-500">{new Date(item.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <p className="text-sm font-black text-emerald-400">+{item.amount.toFixed(0)} CR</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-2 text-center">Referral Tier</p>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="w-1/3 h-full bg-gradient-to-r from-purple-500 to-pink-500" />
                            </div>
                            <p className="text-[10px] text-purple-400 mt-2 text-center font-bold">SILVER PARTNER (5% Commission)</p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ReferralPage;
