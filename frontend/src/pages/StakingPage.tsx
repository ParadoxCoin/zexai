import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeb3, ZEX_STAKING_ADDRESS } from '@/contexts/Web3Context';
import {
    Wallet, Lock, Unlock, Gift, TrendingUp, AlertCircle,
    ArrowRight, Activity, ShieldCheck, Zap
} from 'lucide-react';
import { ethers } from 'ethers';
import playHapticFeedback from '@/utils/haptics';

export const StakingPage: React.FC = () => {
    const { account, zexBalance, getContracts, checkAndApproveZex, connectWallet } = useWeb3();

    // Staking State
    const [stakedBalance, setStakedBalance] = useState("0");
    const [earnedRewards, setEarnedRewards] = useState("0");
    const [totalStaked, setTotalStaked] = useState("0");
    const [rewardRateDisplay, setRewardRateDisplay] = useState("0");
    const [lockupEndTime, setLockupEndTime] = useState<number | null>(null);
    const [isLocked, setIsLocked] = useState(false);

    // UI Input State
    const [stakeAmount, setStakeAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [activeTab, setActiveTab] = useState<'stake' | 'withdraw'>('stake');

    // Loading States
    const [isStaking, setIsStaking] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // Fetch Staking Stats
    const fetchStakingStats = async () => {
        if (!account) return;
        setIsLoadingStats(true);
        try {
            const contracts = await getContracts();
            if (contracts && contracts.stakingContract) {
                // Fetch user staked balance
                const stakedWei = await contracts.stakingContract.balanceOf(account);
                setStakedBalance(parseFloat(ethers.formatEther(stakedWei)).toFixed(2));

                // Fetch earned rewards
                const earnedWei = await contracts.stakingContract.earned(account);
                setEarnedRewards(parseFloat(ethers.formatEther(earnedWei)).toFixed(4));

                // Fetch global stats
                const totalWei = await contracts.stakingContract.totalSupply();
                setTotalStaked(parseFloat(ethers.formatEther(totalWei)).toLocaleString());

                const rateWei = await contracts.stakingContract.rewardRate();
                // Just display reward rate as a fun metric
                setRewardRateDisplay(ethers.formatUnits(rateWei, 0));
            }
        } catch (error) {
            console.error("Error fetching staking stats:", error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    // Auto-refresh stats every 10 seconds (for live rewards)
    useEffect(() => {
        fetchStakingStats();
        const interval = setInterval(fetchStakingStats, 10000);
        return () => clearInterval(interval);
    }, [account]);

    const handleStake = async () => {
        if (!stakeAmount || parseFloat(stakeAmount) <= 0 || !account) return;
        setIsStaking(true);
        try {
            // 1. Approve allowance for Staking Contract
            const approved = await checkAndApproveZex(ZEX_STAKING_ADDRESS, stakeAmount);
            if (!approved) {
                alert("ERC20 ZEX harcama onayı verilmedi.");
                setIsStaking(false);
                return;
            }

            // 2. Stake
            const contracts = await getContracts();
            if (contracts && contracts.stakingContract) {
                const amountWei = ethers.parseEther(stakeAmount);
                const tx = await contracts.stakingContract.stake(amountWei);
                await tx.wait();
                playHapticFeedback('success');
                setStakeAmount("");
                fetchStakingStats();
            }
        } catch (error: any) {
            console.error("Staking failed:", error);
            alert("Stake işlemi başarısız oldu: " + (error?.reason || error?.message));
        } finally {
            setIsStaking(false);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0 || !account) return;
        
        // Warn about early penalty
        if (isLocked) {
           const confirmWithdraw = window.confirm(
               "⚠️ DİKKAT: Kilit süreniz henüz dolmadı!\n\nŞu an kilitli tokenlarınızı çekerseniz %10 Erken Çekim Cezası (Unstake Penalty) kesilecektir. Gerçekten ZEX'lerinizin %10'undan vazgeçerek işlemi onaylıyor musunuz?"
           );
           if (!confirmWithdraw) return;
        }

        setIsWithdrawing(true);
        try {
            const contracts = await getContracts();
            if (contracts && contracts.stakingContract) {
                const amountWei = ethers.parseEther(withdrawAmount);
                const tx = await contracts.stakingContract.withdraw(amountWei);
                await tx.wait();
                playHapticFeedback('success');
                setWithdrawAmount("");
                fetchStakingStats();
            }
        } catch (error: any) {
            console.error("Withdraw failed:", error);
            alert("Çekim işlemi başarısız oldu: " + (error?.reason || error?.message));
        } finally {
            setIsWithdrawing(false);
        }
    };

    const handleClaimRewards = async () => {
        if (!account) return;
        setIsClaiming(true);
        try {
            const contracts = await getContracts();
            if (contracts && contracts.stakingContract) {
                const tx = await contracts.stakingContract.getReward();
                await tx.wait();
                playHapticFeedback('success');
                fetchStakingStats();
            }
        } catch (error: any) {
            console.error("Claim failed:", error);
            alert("Ödül toplama işlemi başarısız oldu.");
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                        <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            ZEX Staking
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            Tokenlarını kilitle, pasif gelir ve ücretsiz AI kredileri kazan.
                        </p>
                    </div>
                </div>
            </div>

            {!account ? (
                /* Disconnected State */
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 text-center"
                >
                    <div className="w-20 h-20 mb-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                        <Wallet className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Web3 Cüzdanınızı Bağlayın</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                        Staking paneline erişmek ve Polygon Amoy ağı üzerinden ZEX kitlemek için MetaMask cüzdanınızı bağlamanız gereklidir.
                    </p>
                    <button
                        onClick={connectWallet}
                        className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/30 transition-all hover:scale-105"
                    >
                        Cüzdanı Bağla 🚀
                    </button>
                </motion.div>
            ) : (
                /* Connected State */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Stats & Claim */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Earned Rewards Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-3xl p-6 text-white shadow-2xl shadow-purple-500/25 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 blur-3xl rounded-full" />

                            <div className="relative z-10">
                                <span className="flex items-center gap-2 text-indigo-100 text-sm font-bold uppercase tracking-wider mb-2">
                                    <Gift className="w-4 h-4" /> Kazanılan Ödül
                                </span>
                                <div className="text-5xl font-black mb-1 truncate">
                                    {earnedRewards} <span className="text-2xl text-indigo-200">ZEX</span>
                                </div>
                                <p className="text-sm text-indigo-200 mb-6">
                                    ~ ${(parseFloat(earnedRewards) * 0.15).toFixed(2)} Değerinde
                                </p>

                                <button
                                    onClick={handleClaimRewards}
                                    disabled={isClaiming || parseFloat(earnedRewards) <= 0}
                                    className="w-full py-4 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-bold text-lg border border-white/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isClaiming ? <Activity className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                    Ödülleri Topla
                                </button>
                            </div>
                        </motion.div>

                        {/* Staked Balance / Wallet Balance Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700">
                                <ShieldCheck className="w-6 h-6 text-emerald-500 mb-3" />
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Kilitli My ZEX</h3>
                                <p className="text-xl font-black text-gray-900 dark:text-white truncate">{stakedBalance}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700">
                                <Wallet className="w-6 h-6 text-blue-500 mb-3" />
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cüzdan Bakiyesi</h3>
                                <p className="text-xl font-black text-gray-900 dark:text-white truncate">{zexBalance}</p>
                            </div>
                        </div>

                        {/* Global Pool Info */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" /> Havuz İstatistikleri
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Havuzdaki Toplam ZEX</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{totalStaked}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Yıllık Sabit Getiri (APY)</span>
                                    <span className="font-bold text-emerald-500">%{rewardRateDisplay}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Bağlı Ağ</span>
                                    <span className="font-bold text-gray-900 dark:text-white">Polygon Amoy</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Interaction Panel (Stake/Withdraw) */}
                    <div className="lg:col-span-7">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden h-full flex flex-col">
                            {/* Tab Headers */}
                            <div className="flex border-b border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => setActiveTab('stake')}
                                    className={`flex-1 py-5 text-center font-bold text-sm transition-colors flex justify-center items-center gap-2 ${activeTab === 'stake'
                                        ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 border-b-2 border-indigo-600'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <Lock className="w-4 h-4" /> TOKEN KİLİTLE (Stake)
                                </button>
                                <button
                                    onClick={() => setActiveTab('withdraw')}
                                    className={`flex-1 py-5 text-center font-bold text-sm transition-colors flex justify-center items-center gap-2 ${activeTab === 'withdraw'
                                        ? 'text-purple-600 bg-purple-50/50 dark:bg-purple-900/10 border-b-2 border-purple-600'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <Unlock className="w-4 h-4" /> KİLİDİ AÇ (Withdraw)
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="p-8 flex-1 flex flex-col justify-center">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'stake' ? (
                                        <motion.div
                                            key="stake-tab"
                                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                        >
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                    Stake Edilecek Miktar
                                                </label>
                                                <span className="text-xs font-medium text-gray-500">
                                                    Bakiye: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{zexBalance} ZEX</span>
                                                </span>
                                            </div>
                                            <div className="relative mb-6">
                                                <input
                                                    type="number"
                                                    value={stakeAmount}
                                                    onChange={(e) => setStakeAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full text-3xl font-black bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 rounded-2xl px-5 py-6 text-gray-900 dark:text-white"
                                                />
                                                <button
                                                    onClick={() => setStakeAmount(zexBalance)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                                                >
                                                    MAX
                                                </button>
                                            </div>

                                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 mb-8 flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-blue-900 dark:text-blue-300">Yeni Staking Kuralları (V2)</p>
                                                    <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
                                                        Tokenlarınızı kilitlediğiniz andan itibaren **14 Günlük** bir zorunlu kilit süresi (Lock-up) başlar. Kazançlarınız saniye saniye yansımaya başlar ve %{rewardRateDisplay} APY (Yıllık Getiri) ile değerlendirilir.
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleStake}
                                                disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || isStaking}
                                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                                            >
                                                {isStaking ? <Activity className="w-6 h-6 animate-spin" /> : 'ZEX Kilitle'}
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="withdraw-tab"
                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                        >
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                    Geri Çekilecek Miktar
                                                </label>
                                                <span className="text-xs font-medium text-gray-500">
                                                    Kilitli: <span className="text-purple-600 dark:text-purple-400 font-bold">{stakedBalance} ZEX</span>
                                                </span>
                                            </div>
                                            <div className="relative mb-6">
                                                <input
                                                    type="number"
                                                    value={withdrawAmount}
                                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full text-3xl font-black bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-purple-500 rounded-2xl px-5 py-6 text-gray-900 dark:text-white"
                                                />
                                                <button
                                                    onClick={() => setWithdrawAmount(stakedBalance)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                                                >
                                                    MAX
                                                </button>
                                            </div>

                                            <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-4 mb-8 flex items-start gap-3">
                                                <Unlock className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                                <div className="space-y-2 flex-1">
                                                    <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
                                                        Buradan ZEX tokenlarınızı cüzdanınıza geri çekebilirsiniz. Kilitli limitiniz azaldığı için kazanacağınız APY oranı aynı kalsa da miktar azalır.
                                                    </p>
                                                    
                                                    {isLocked && lockupEndTime && parseFloat(stakedBalance) > 0 && (
                                                        <div className="p-2.5 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg">
                                                            <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-0.5">⚠️ Erken Çekim Uyarısı</p>
                                                            <p className="text-[11px] text-red-500 dark:text-red-300">
                                                                Kilit sürenizin dolmasına kalan süre nedeniyle, şu an para çekerseniz çekilen miktar üzerinden <b>%10 oranında ceza (Burn)</b> kesilecektir.
                                                            </p>
                                                            <p className="text-[10px] text-red-400 dark:text-red-400/80 mt-1 font-mono">
                                                                Kilit Açılış Tarihi: {new Date(lockupEndTime).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleWithdraw}
                                                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || isWithdrawing}
                                                className="w-full py-5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/20 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                                            >
                                                {isWithdrawing ? <Activity className="w-6 h-6 animate-spin" /> : 'Kilidi Aç'}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StakingPage;
