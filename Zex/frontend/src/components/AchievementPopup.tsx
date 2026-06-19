import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { X, Sparkles, Gift, Zap } from 'lucide-react';

interface Achievement {
    id: string;
    name: string;
    description: string;
    emoji: string;
    xp_reward: number;
    credit_reward: number;
    unlocked_at: string;
}

export const AchievementPopup = () => {
    const [visible, setVisible] = useState(false);
    const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
    const [queue, setQueue] = useState<Achievement[]>([]);
    const queryClient = useQueryClient();

    const { data: newAchievements } = useQuery({
        queryKey: ['newAchievements'],
        queryFn: () => apiService.get('/gamification/achievements/new'),
        refetchInterval: 30000, // Check every 30 seconds
    });

    useEffect(() => {
        const achievements = (newAchievements?.data as Achievement[] | undefined);
        if (achievements && achievements.length > 0) {
            setQueue(prev => [...prev, ...achievements]);
            queryClient.invalidateQueries({ queryKey: ['gamificationStats'] });
        }
    }, [newAchievements, queryClient]);

    useEffect(() => {
        if (!visible && queue.length > 0) {
            const [next, ...rest] = queue;
            setCurrentAchievement(next);
            setQueue(rest);
            setVisible(true);
        }
    }, [visible, queue]);

    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                setVisible(false);
                setCurrentAchievement(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible || !currentAchievement) return null;

    return (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
            <div className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 rounded-2xl p-[2px] shadow-2xl shadow-amber-500/30">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 min-w-[320px]">
                    <button
                        onClick={() => setVisible(false)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-4">
                        {/* Achievement Icon */}
                        <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                                {currentAchievement.emoji}
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Yeni Başarı!
                            </p>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                                {currentAchievement.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {currentAchievement.description}
                            </p>

                            {/* Rewards */}
                            <div className="flex items-center gap-3 mt-3">
                                {currentAchievement.xp_reward > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                        <Zap className="w-3 h-3 text-purple-500" />
                                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                            +{currentAchievement.xp_reward} XP
                                        </span>
                                    </div>
                                )}
                                {currentAchievement.credit_reward > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                        <Gift className="w-3 h-3 text-emerald-500" />
                                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            +{currentAchievement.credit_reward} 💎
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full animate-shrink"
                            style={{ animation: 'shrink 5s linear forwards' }}
                        />
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
        </div>
    );
};

export default AchievementPopup;
