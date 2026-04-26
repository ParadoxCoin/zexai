import React, { useEffect, useState } from 'react';
import { referralService, ReferralStats, ReferralEarning } from '@/services/referralService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Users, DollarSign, TrendingUp, Share2, Check, Sparkles, Gift, ArrowRight } from 'lucide-react';

const REFERRAL_BASE_URL = 'https://app.zexai.io/ref/';

const ReferralPage: React.FC = () => {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [history, setHistory] = useState<ReferralEarning[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const statsRes = await referralService.getStats();
            setStats(statsRes.data as any);

            const historyRes = await referralService.getHistory();
            setHistory(historyRes.data as any || []);
        } catch (error) {
            console.error("Failed to fetch referral data", error);
        } finally {
            setLoading(false);
        }
    };

    const createCode = async () => {
        try {
            await referralService.createCode();
            fetchData();
        } catch (error) {
            console.error("Failed to create code", error);
        }
    };

    const referralUrl = stats?.code ? `${REFERRAL_BASE_URL}${stats.code.replace('MANUS-', 'ZEXAI-')}` : '';

    const copyUrl = () => {
        if (referralUrl) {
            navigator.clipboard.writeText(referralUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareTwitter = () => {
        const text = `🤖 Unlock the power of AI with ZexAI! Sign up with my referral link and get started 🚀\n\n${referralUrl}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareTelegram = () => {
        const text = `🤖 Create stunning AI content with ZexAI — images, videos, music & more! Join now: ${referralUrl}`;
        window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareWhatsApp = () => {
        const text = `🤖 Hey! Check out ZexAI — the ultimate AI content platform. Use my referral link to sign up: ${referralUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-5xl">
            {/* Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl p-8 text-white shadow-2xl">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute w-40 h-40 bg-white/10 rounded-full -top-20 -right-20 animate-pulse" />
                    <div className="absolute w-32 h-32 bg-white/5 rounded-full bottom-10 -left-16 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl shadow-lg">
                            <Gift className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Referral Program</h1>
                            <p className="text-purple-200 text-sm">Invite friends, earn free credits</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                            <Sparkles className="w-6 h-6 mx-auto mb-2 text-yellow-300" />
                            <p className="text-2xl font-black">5%</p>
                            <p className="text-xs text-purple-200">Value in Credits</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                            <Users className="w-6 h-6 mx-auto mb-2 text-blue-300" />
                            <p className="text-2xl font-black">{stats?.total_referrals || 0}</p>
                            <p className="text-xs text-purple-200">Total Referrals</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                            <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-300" />
                            <p className="text-2xl font-black">{stats?.total_earnings?.toFixed(0) || 0}</p>
                            <p className="text-xs text-purple-200">Credits Earned</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Code or Show Referral Link */}
            {!stats?.code ? (
                <div className="text-center py-12">
                    <Gift className="w-16 h-16 mx-auto text-purple-500 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Get Your Referral Code</h2>
                    <p className="text-gray-400 mb-6">Generate your unique referral link and start earning 5% from every purchase</p>
                    <Button onClick={createCode} className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg">
                        Generate My Referral Code <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            ) : (
                <>
                    {/* Referral Link Card */}
                    <Card className="p-6 bg-gray-800/60 border-gray-700 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-purple-400" />
                            Your Referral Link
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-800 rounded-xl px-4 py-3 font-mono text-sm text-purple-300 truncate border border-gray-700">
                                {referralUrl}
                            </div>
                            <button
                                onClick={copyUrl}
                                className={`px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
                                    copied
                                        ? 'bg-green-600 text-white'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                                }`}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>

                        {/* Social Media Share Buttons */}
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-700">
                            <span className="text-sm text-gray-500">Share on:</span>
                            <button
                                onClick={shareTwitter}
                                className="px-4 py-2 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                X / Twitter
                            </button>
                            <button
                                onClick={shareTelegram}
                                className="px-4 py-2 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                Telegram
                            </button>
                            <button
                                onClick={shareWhatsApp}
                                className="px-4 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                WhatsApp
                            </button>
                        </div>
                    </Card>

                    {/* How It Works */}
                    <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4">
                                <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-purple-400 font-bold">1</span>
                                </div>
                                <p className="text-sm text-gray-300 font-medium">Share your link</p>
                                <p className="text-xs text-gray-500 mt-1">Send your unique URL to friends</p>
                            </div>
                            <div className="text-center p-4">
                                <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-blue-400 font-bold">2</span>
                                </div>
                                <p className="text-sm text-gray-300 font-medium">They sign up & purchase</p>
                                <p className="text-xs text-gray-500 mt-1">Your friend joins and buys a plan</p>
                            </div>
                            <div className="text-center p-4">
                                <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-green-400 font-bold">3</span>
                                </div>
                                <p className="text-sm text-gray-300 font-medium">You earn 5% credits</p>
                                <p className="text-xs text-gray-500 mt-1">Free credits added to your account</p>
                            </div>
                        </div>
                    </div>

                    {/* Earnings History */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-400" /> Earnings History
                        </h2>

                        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-800/50">
                                    <tr>
                                        <th className="p-4 text-gray-400 font-medium text-sm">Date</th>
                                        <th className="p-4 text-gray-400 font-medium text-sm">Purchase</th>
                                        <th className="p-4 text-gray-400 font-medium text-sm">Rate</th>
                                        <th className="p-4 text-gray-400 font-medium text-sm">Credits Earned</th>
                                        <th className="p-4 text-gray-400 font-medium text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-500">
                                                <Gift className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                No earnings yet. Start inviting friends!
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((item) => (
                                            <tr key={item.id} className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
                                                <td className="p-4 text-gray-300 text-sm">
                                                    {new Date(item.created_at).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className="p-4 text-gray-300 text-sm">${item.purchase_amount.toFixed(2)}</td>
                                                <td className="p-4 text-gray-300 text-sm">{(item.commission_rate * 100).toFixed(0)}%</td>
                                                <td className="p-4 text-green-400 font-medium text-sm">+{item.amount.toFixed(0)} credits</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        item.status === 'completed' ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
                                                    }`}>
                                                        {item.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ReferralPage;
