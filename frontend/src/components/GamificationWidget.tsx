import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
    Flame, Gift, Clock, Zap, Trophy,
    CheckCircle, ChevronDown, ChevronUp, Star
} from 'lucide-react';
import { Celebration, CreditToast, LevelUpCelebration, AchievementCelebration } from './Celebration';
import playHapticFeedback from '@/utils/haptics';

interface GamificationStats {
    level: number;
    level_name: string;
    level_emoji: string;
    current_xp: number;
    total_xp: number;
    xp_to_next_level: number;
    next_level_xp: number;
    streak_days: number;
    longest_streak: number;
    credit_bonus_percent: number;
    can_claim_daily: boolean;
    stats: {
        images: number;
        videos: number;
        audio: number;
        chat: number;
        referrals: number;
    };
}

interface Achievement {
    id: string;
    name: string;
    description: string;
    emoji: string;
    xp_reward: number;
    credit_reward: number;
    unlocked: boolean;
}

interface GamificationProps {
    imagesCount?: number;
    videosCount?: number;
    audioCount?: number;
    chatsCount?: number;
    referralsCount?: number;
}

export const GamificationWidget: React.FC<GamificationProps> = ({
    imagesCount,
    videosCount,
    audioCount,
    chatsCount,
    referralsCount
}) => {
    const queryClient = useQueryClient();
    const [showClaimSuccess, setShowClaimSuccess] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);

    // Celebration states
    const [showConfetti, setShowConfetti] = useState(false);
    const [showCreditToast, setShowCreditToast] = useState(false);
    const [creditEarned, setCreditEarned] = useState({ amount: 0, reason: '' });
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [levelUpData, setLevelUpData] = useState({ level: 1, name: '', emoji: '🌱', bonus: 0 });
    const prevLevelRef = useRef<number | null>(null);
    const prevXPRef = useRef<number | null>(null);
    const [xpGain, setXpGain] = useState<{ amount: number, id: number } | null>(null);

    // Achievement celebration state
    const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
    const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
    const { data: statsData, isLoading, isError } = useQuery({
        queryKey: ['gamificationStats'],
        queryFn: () => apiService.get('/gamification/stats'),
        refetchInterval: 30000,
        retry: 1,
    });

    const stats: GamificationStats | null = (statsData as any)?.data;

    // Detect XP gain for floating animation
    useEffect(() => {
        if (stats && prevXPRef.current !== null && stats.total_xp > prevXPRef.current) {
            const gain = stats.total_xp - prevXPRef.current;
            setXpGain({ amount: gain, id: Date.now() });
            setTimeout(() => setXpGain(null), 2000);
        }
        if (stats) {
            prevXPRef.current = stats.total_xp;
        }
    }, [stats?.total_xp]);

    const { data: achievementsData } = useQuery({
        queryKey: ['achievements'],
        queryFn: () => apiService.get('/gamification/achievements'),
        enabled: showAchievements,
    });

    // Check for NEWLY unlocked achievements periodically
    const { data: newAchievementsData } = useQuery({
        queryKey: ['newAchievements'],
        queryFn: () => apiService.get('/gamification/achievements/new'),
        refetchInterval: 15000, // Check every 15s for new popups
        retry: 1
    });

    // Process achievement queue
    useEffect(() => {
        if ((newAchievementsData as any)?.data?.length > 0) {
            const newOnes = (newAchievementsData as any).data.filter(
                (newAch: any) => !achievementQueue.find(q => q.id === newAch.id) && currentAchievement?.id !== newAch.id
            );
            if (newOnes.length > 0) {
                setAchievementQueue(prev => [...prev, ...newOnes]);
            }
        }
    }, [newAchievementsData]);

    useEffect(() => {
        if (!currentAchievement && achievementQueue.length > 0) {
            const next = achievementQueue[0];
            setCurrentAchievement(next);
            setAchievementQueue(prev => prev.slice(1));
        }
    }, [achievementQueue, currentAchievement]);

    const { mutate: claimDaily, isPending: isClaiming } = useMutation({
        mutationFn: () => apiService.post('/gamification/daily-claim'),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['gamificationStats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['userCredits'] });

            if (data.success) {
                // Show celebration
                playHapticFeedback('success');
                setShowConfetti(true);
                setShowClaimSuccess(true);

                // Show credit toast
                setCreditEarned({
                    amount: data.credits_earned || 5,
                    reason: `Günlük ödül - ${data.streak_days || 1} gün streak! 🔥`
                });
                setShowCreditToast(true);

                setTimeout(() => setShowClaimSuccess(false), 3000);
            }
        },
    });

    const achievements = ((achievementsData as any)?.data?.achievements || []) as Achievement[];
    const unlockedCount = (achievementsData as any)?.data?.unlocked || 0;
    const totalCount = (achievementsData as any)?.data?.total || 0;

    // Detect level up
    useEffect(() => {
        if (stats && prevLevelRef.current !== null && stats.level > prevLevelRef.current) {
            // Level up detected!
            setLevelUpData({
                level: stats.level,
                name: stats.level_name,
                emoji: stats.level_emoji,
                bonus: stats.credit_bonus_percent
            });
            setShowLevelUp(true);
        }
        if (stats) {
            prevLevelRef.current = stats.level;
        }
    }, [stats?.level]);

    if (isError) {
        return (
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-3 text-center">
                <span className="text-sm text-gray-500">🎮 Gamification yükleniyor...</span>
            </div>
        );
    }

    if (isLoading || !stats) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow border border-gray-100 dark:border-gray-700 animate-pulse">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
        );
    }

    const xpProgress = stats.next_level_xp
        ? ((stats.current_xp) / (stats.xp_to_next_level + stats.current_xp)) * 100
        : 100;

    const currentStreakDayProgress = (stats.streak_days % 7) || (stats.streak_days > 0 ? 7 : 0);

    return (
        <>
            {/* Celebrations */}
            <Celebration
                show={showConfetti}
                type="coins"
                onComplete={() => setShowConfetti(false)}
            />
            <CreditToast
                show={showCreditToast}
                amount={creditEarned.amount}
                reason={creditEarned.reason}
                onClose={() => setShowCreditToast(false)}
            />
            <LevelUpCelebration
                show={showLevelUp}
                newLevel={levelUpData.level}
                levelName={levelUpData.name}
                levelEmoji={levelUpData.emoji}
                bonusPercent={levelUpData.bonus}
                onClose={() => setShowLevelUp(false)}
            />
            <AchievementCelebration
                show={!!currentAchievement}
                name={currentAchievement?.name || ''}
                description={currentAchievement?.description || ''}
                emoji={currentAchievement?.emoji || ''}
                xpReward={currentAchievement?.xp_reward || 0}
                creditReward={currentAchievement?.credit_reward || 0}
                onClose={() => setCurrentAchievement(null)}
            />

            <motion.div
                id="gamification-widget"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-[1px] shadow-xl"
            >
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
                    {/* Compact Header Row */}
                    <div className="flex items-center justify-between gap-4">
                        {/* Level & XP */}
                        <div className="flex items-center gap-3 flex-1">
                            <motion.span
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 3 }}
                                className="text-3xl"
                            >
                                {stats.level_emoji}
                            </motion.span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base font-bold text-gray-900 dark:text-white">
                                        Seviye {stats.level}
                                    </span>
                                    <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                                        {stats.level_name}
                                    </span>
                                    {stats.credit_bonus_percent > 0 && (
                                        <div className="flex items-center text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                                            <Zap className="w-2.5 h-2.5 mr-0.5 fill-current" />+{stats.credit_bonus_percent}%
                                        </div>
                                    )}
                                </div>
                                {/* XP Bar */}
                                <div className="relative h-2.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                                    />

                                    {/* Floating XP Gain Animation */}
                                    <AnimatePresence>
                                        {xpGain && (
                                            <motion.div
                                                key={xpGain.id}
                                                initial={{ y: 0, opacity: 0, scale: 0.5 }}
                                                animate={{ y: -20, opacity: 1, scale: 1 }}
                                                exit={{ y: -40, opacity: 0 }}
                                                className="absolute right-0 top-0 text-[10px] font-black text-indigo-500 bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded-full shadow-lg border border-indigo-500/20 z-10"
                                            >
                                                +{xpGain.amount} XP
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[10px] font-medium text-gray-400">{stats.current_xp} / {stats.xp_to_next_level + stats.current_xp} XP</span>
                                    {stats.xp_to_next_level > 0 && (
                                        <span className="text-[10px] font-bold text-indigo-500">+{stats.xp_to_next_level} XP sonrakine</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Streak & Daily Action */}
                        <div className="flex flex-col items-end gap-2">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 rounded-xl border border-orange-100 dark:border-orange-500/20"
                            >
                                <motion.div
                                    animate={stats.streak_days >= 3 ? {
                                        scale: [1, 1.2, 1],
                                        filter: ["drop-shadow(0 0 0px #ffedd5)", "drop-shadow(0 0 8px #f97316)", "drop-shadow(0 0 0px #ffedd5)"]
                                    } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <Flame className={`w-5 h-5 ${stats.streak_days > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} />
                                </motion.div>
                                <span className="text-sm font-black text-orange-600 dark:text-orange-400">{stats.streak_days} GÜN</span>
                            </motion.div>

                            {/* Daily Claim Button */}
                            <AnimatePresence mode="wait">
                                {stats.can_claim_daily ? (
                                    <motion.button
                                        key="claim-btn"
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{
                                            scale: 1,
                                            opacity: 1,
                                            boxShadow: ["0 0 0px rgba(245, 158, 11, 0)", "0 0 15px rgba(245, 158, 11, 0.4)", "0 0 0px rgba(245, 158, 11, 0)"]
                                        }}
                                        transition={{
                                            boxShadow: { repeat: Infinity, duration: 2 }
                                        }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => claimDaily()}
                                        disabled={isClaiming}
                                        className="px-4 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white text-xs font-black rounded-xl shadow-lg border border-white/20 flex items-center gap-2 group"
                                    >
                                        {isClaiming ? <Clock className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                                        GÜNLÜK ÖDÜLÜ AL
                                    </motion.button>
                                ) : showClaimSuccess ? (
                                    <motion.div
                                        key="success-badge"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="px-4 py-2 bg-green-500 text-white text-xs font-black rounded-xl flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" /> ALINDI!
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="wait-badge"
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700/50 text-gray-400 text-xs font-bold rounded-xl flex items-center gap-2"
                                    >
                                        <Clock className="w-3.5 h-3.5" /> YARIN TEKRAR GEL
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Streak Progress Chart (7 Day Cycle) */}
                    <div className="mt-5 p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Haftalık Seri Takibi</span>
                            <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span className="text-[10px] font-black text-amber-600">7. GÜN: +50 KREDİ</span>
                            </div>
                        </div>
                        <div className="flex justify-between gap-1">
                            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                                const currentStreak = stats.streak_days || 0;
                                const cycleDay = currentStreak % 7;
                                const isCompleted = stats.can_claim_daily ? day <= cycleDay : (cycleDay === 0 && currentStreak > 0 ? true : day <= cycleDay);
                                const isCurrent = stats.can_claim_daily ? day === (cycleDay + 1) : false;

                                return (
                                    <div key={day} className="flex-1 flex flex-col items-center gap-2">
                                        <motion.div
                                            initial={false}
                                            animate={isCompleted ? {
                                                scale: [1, 1.1, 1],
                                                backgroundColor: ['#f97316', '#ec4899']
                                            } : isCurrent ? {
                                                scale: [0.9, 1, 0.9],
                                                borderWidth: "2px"
                                            } : {}}
                                            transition={{ repeat: isCurrent ? Infinity : 0, duration: 2 }}
                                            className={`w-full aspect-square max-w-[36px] rounded-xl flex items-center justify-center text-xs font-black transition-all border
                                                ${isCompleted
                                                    ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white border-transparent shadow-lg shadow-orange-500/20'
                                                    : isCurrent
                                                        ? 'bg-white dark:bg-gray-800 text-indigo-500 border-indigo-500'
                                                        : 'bg-white dark:bg-gray-800 text-gray-300 border-gray-100 dark:border-gray-700'
                                                }`}
                                        >
                                            {day === 7 ? '🎁' : isCompleted ? '✓' : day}
                                        </motion.div>
                                        <span className={`text-[8px] font-bold uppercase ${isCompleted ? 'text-indigo-500' : 'text-gray-400'}`}>
                                            {day}. GÜN
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Achievements & Stats Row */}
                    <div className="mt-4 flex items-center gap-4">
                        <button
                            onClick={() => setShowAchievements(!showAchievements)}
                            className="flex-1 flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-500/20 text-xs font-bold transition-all hover:bg-amber-100 dark:hover:bg-amber-900/20"
                        >
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span className="text-gray-700 dark:text-gray-300">BAŞARILAR</span>
                                <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[9px] font-black">
                                    {unlockedCount}/{totalCount}
                                </span>
                            </div>
                            {showAchievements ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                    </div>

                    {/* Achievements Grid (Animated) */}
                    <AnimatePresence>
                        {showAchievements && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    {achievements.length > 0 ? achievements.map((ach) => (
                                        <motion.div
                                            key={ach.id}
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center text-xl cursor-help transition-all shadow-sm
                                                ${ach.unlocked
                                                    ? 'bg-gradient-to-br from-amber-100 to-yellow-200 dark:from-amber-900/40 dark:to-yellow-700/40 border border-amber-200 dark:border-amber-700/50'
                                                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-300 border border-gray-100 dark:border-gray-700 grayscale'
                                                }`}
                                        >
                                            <span>{ach.emoji}</span>
                                            {/* Advanced Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                                <div className="bg-gray-900/95 backdrop-blur shadow-2xl text-white text-[10px] rounded-xl px-3 py-2 border border-white/10 w-48 overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-yellow-600" />
                                                    <div className="font-black text-amber-400 mb-0.5 uppercase tracking-tighter">{ach.name}</div>
                                                    <div className="text-gray-400 leading-tight mb-1.5">{ach.description}</div>
                                                    <div className="flex gap-2">
                                                        {ach.xp_reward > 0 && <span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">+{ach.xp_reward} XP</span>}
                                                        {ach.credit_reward > 0 && <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">+{ach.credit_reward}💎</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )) : (
                                        <div className="w-full text-center py-4 text-gray-400 text-xs italic">
                                            Başarılar yükleniyor...
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Quick Stats Row (Modern Compact) */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-4 gap-2">
                        <div className="bg-blue-50/50 dark:bg-blue-500/5 rounded-lg p-1.5 text-center transition-transform hover:scale-105">
                            <div className="text-[10px] font-black text-blue-600 dark:text-blue-400">{imagesCount ?? stats.stats.images}</div>
                            <div className="text-[8px] font-bold text-gray-400 uppercase">Görsel</div>
                        </div>
                        <div className="bg-purple-50/50 dark:bg-purple-500/5 rounded-lg p-1.5 text-center transition-transform hover:scale-105">
                            <div className="text-[10px] font-black text-purple-600 dark:text-purple-400">{videosCount ?? stats.stats.videos}</div>
                            <div className="text-[8px] font-bold text-gray-400 uppercase">Video</div>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-500/5 rounded-lg p-1.5 text-center transition-transform hover:scale-105">
                            <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{audioCount ?? stats.stats.audio}</div>
                            <div className="text-[8px] font-bold text-gray-400 uppercase">Ses</div>
                        </div>
                        <div className="bg-orange-50/50 dark:bg-orange-500/5 rounded-lg p-1.5 text-center transition-transform hover:scale-105">
                            <div className="text-[10px] font-black text-orange-600 dark:text-orange-400">{referralsCount ?? stats.stats.referrals}</div>
                            <div className="text-[8px] font-bold text-gray-400 uppercase">Davet</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default GamificationWidget;

