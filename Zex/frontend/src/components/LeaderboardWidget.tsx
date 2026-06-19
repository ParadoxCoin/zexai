import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Medal, Users, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { useLeaderboard, LeaderboardUser } from '@/services/useGamification';
import { useTranslation } from 'react-i18next';

export const LeaderboardWidget: React.FC = () => {
    const { t } = useTranslation();
    const [period, setPeriod] = useState<'weekly' | 'all_time'>('weekly');
    const { data: leaderboardData, isLoading, isError } = useLeaderboard(period, 10);

    const entries: LeaderboardUser[] = leaderboardData || [];

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1: return "bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 border-amber-200 dark:border-amber-700/50 shadow-amber-500/10";
            case 2: return "bg-gradient-to-r from-gray-100 to-slate-200 dark:from-gray-800 dark:to-slate-800 border-gray-300 dark:border-gray-600 shadow-gray-500/10";
            case 3: return "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-200 dark:border-orange-800/50 shadow-orange-500/10";
            default: return "bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";
        }
    };

    const getRankBadge = (rank: number) => {
        switch (rank) {
            case 1: return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/40"><Trophy className="w-4 h-4" /></div>;
            case 2: return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-slate-400 flex items-center justify-center text-white shadow-lg shadow-gray-500/40"><Medal className="w-4 h-4" /></div>;
            case 3: return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-orange-500/40"><Medal className="w-4 h-4" /></div>;
            default: return <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-sm border border-gray-200 dark:border-gray-600">{rank}</div>;
        }
    };

    const getZexReward = (rank: number) => {
        if (period !== 'weekly') return null;
        switch (rank) {
            case 1: return 5000;
            case 2: return 3000;
            case 3: return 1500;
            case 4: return 1000;
            case 5: return 500;
            case 6: case 7: case 8: case 9: case 10: return 250;
            default: return null;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden border border-gray-100 dark:border-gray-700">
            {/* Header */}
            <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/80 dark:to-gray-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Users className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">
                        {t('leaderboard.title')}
                    </h2>
                </div>

                {/* Period Toggles */}
                <div className="p-1 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center text-xs font-bold">
                    <button
                        onClick={() => setPeriod('weekly')}
                        className={`px-3 py-1.5 rounded-md transition-all ${period === 'weekly' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        {t('leaderboard.weekly')}
                    </button>
                    <button
                        onClick={() => setPeriod('all_time')}
                        className={`px-3 py-1.5 rounded-md transition-all ${period === 'all_time' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        {t('leaderboard.allTime')}
                    </button>
                </div>
            </div>

            {/* Leaderboard List */}
            <div className="flex-1 p-4 overflow-y-auto min-h-[400px]">
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-700/50 animate-pulse border border-gray-200 dark:border-gray-600" />
                        ))}
                    </div>
                ) : isError ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <Trophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">{t('leaderboard.loadFailed')}</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <Star className="w-12 h-12 text-amber-200 dark:text-amber-900/30 mb-3 fill-current" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium pb-1">{t('leaderboard.noEntries')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{t('leaderboard.noEntriesDesc')}</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <AnimatePresence>
                            {entries.map((user, index) => (
                                <motion.div
                                    key={user.user_id + period}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${getRankStyle(user.rank)}`}
                                >
                                    <div className="flex-shrink-0">
                                        {getRankBadge(user.rank)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                {user.username ? user.username.split(' ').map(p => p.length > 2 ? p.substring(0, 2) + '*'.repeat(p.length - 2) : p).join(' ') : 'Anonymous'}
                                            </p>
                                            {user.rank <= 3 && (
                                                <span className="shrink-0 flex items-center px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">
                                                    Lv.{user.level}
                                                </span>
                                            )}
                                        </div>
                                        {user.rank > 3 && (
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Lv.{user.level} {t('leaderboard.member')}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {getZexReward(user.rank) && (
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1 px-2 py-1 rounded bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800/50">
                                                    <span className="text-[11px] font-black text-teal-600 dark:text-teal-400">+{getZexReward(user.rank)} ZEX</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50">
                                                <Star className="w-3 h-3 text-indigo-500 fill-indigo-500" />
                                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{user.total_xp.toLocaleString()} XP</span>
                                            </div>
                                            {user.streak_days > 0 && (
                                                <span className="text-[10px] font-bold text-orange-500 flex items-center gap-0.5">
                                                    <span className="text-lg leading-none mt-[-2px]">🔥</span> {user.streak_days} {t('leaderboard.days')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Footer Context */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 dark:bg-gray-800/80 dark:border-gray-700 text-center">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold flex justify-center items-center gap-1">
                    {t('leaderboard.weeklyPrize')} <Trophy className="w-3 h-3 text-amber-500" />
                </p>
            </div>
        </div>
    );
};

export default LeaderboardWidget;
