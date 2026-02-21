import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
    Trophy, Users, Crown, Medal, Download, Calendar,
    TrendingUp, Edit, Trash2, Plus, Save, X, Target, Settings, Eye, EyeOff
} from 'lucide-react';

interface LeaderboardEntry {
    rank: number;
    user_id: string;
    username: string;
    level: number;
    total_xp: number;
    streak_days: number;
}

interface Achievement {
    id: string;
    name: string;
    description: string;
    emoji: string;
    category: string;
    xp_reward: number;
    credit_reward: number;
    requirement_type: string;
    requirement_value: number;
    is_active: boolean;
}

interface LevelDef {
    level: number;
    name: string;
    emoji: string;
    required_xp: number;
    credit_bonus_percent: number;
    description: string;
}

interface GamificationSettings {
    daily_credits: number;
    xp_per_image: number;
    xp_per_video: number;
    xp_per_audio: number;
    xp_per_chat: number;
    streak_bonus_7: number;
    streak_bonus_30: number;
    streak_bonus_100: number;
}

export const AdminGamificationPanel = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'achievements' | 'levels' | 'settings'>('leaderboard');
    const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all_time'>('weekly');
    const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
    const [settings, setSettings] = useState<GamificationSettings>({
        daily_credits: 5,
        xp_per_image: 10,
        xp_per_video: 25,
        xp_per_audio: 15,
        xp_per_chat: 5,
        streak_bonus_7: 25,
        streak_bonus_30: 100,
        streak_bonus_100: 500
    });

    const { data: leaderboardData, isLoading: loadingLeaderboard } = useQuery({
        queryKey: ['adminLeaderboard', period],
        queryFn: () => apiService.get(`/gamification/leaderboard?period=${period}&limit=50`),
    });

    const { data: achievementsData } = useQuery({
        queryKey: ['adminAchievements'],
        queryFn: () => apiService.get('/gamification/achievements'),
    });

    const { data: levelsData } = useQuery({
        queryKey: ['gamificationLevels'],
        queryFn: () => apiService.get('/gamification/levels'),
    });

    const leaderboard = (leaderboardData?.data || []) as LeaderboardEntry[];
    const achievements = (achievementsData?.data?.achievements || []) as Achievement[];
    const levels = (levelsData?.data || []) as LevelDef[];

    const exportLeaderboard = () => {
        const csvContent = [
            ['Sıra', 'Kullanıcı', 'Seviye', 'XP', 'Streak'].join(','),
            ...leaderboard.map(e => [e.rank, e.username, e.level, e.total_xp, e.streak_days].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leaderboard_${period}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleSaveSettings = async () => {
        // TODO: Save to backend when API is ready
        alert('Ayarlar kaydedildi! (Backend API hazır olduğunda veritabanına kaydedilecek)');
    };

    const tabs = [
        { id: 'leaderboard', name: 'Sıralama', icon: Trophy },
        { id: 'achievements', name: 'Başarılar', icon: Medal },
        { id: 'levels', name: 'Seviyeler', icon: Crown },
        { id: 'settings', name: 'Ayarlar', icon: Settings },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gamification Yönetimi</h2>
                        <p className="text-sm text-gray-500">Kullanıcı sıralaması, başarılar, seviyeler ve ödül ayarları</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
                <div className="space-y-4">
                    {/* Controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            {(['weekly', 'monthly', 'all_time'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                        }`}
                                >
                                    {p === 'weekly' ? 'Haftalık' : p === 'monthly' ? 'Aylık' : 'Tüm Zamanlar'}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={exportLeaderboard}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            CSV İndir
                        </button>
                    </div>

                    {/* Leaderboard Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sıra</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Seviye</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">XP</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Streak</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loadingLeaderboard ? (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
                                ) : leaderboard.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Henüz veri yok</td></tr>
                                ) : leaderboard.map((entry) => (
                                    <tr key={entry.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                                entry.rank === 2 ? 'bg-gray-100 text-gray-600' :
                                                    entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-50 text-gray-500'
                                                }`}>
                                                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{entry.username}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium rounded-full">
                                                Lv.{entry.level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-purple-600 dark:text-purple-400">
                                            {entry.total_xp.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-orange-500">🔥 {entry.streak_days}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Campaign Idea Box */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Target className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-amber-800 dark:text-amber-300">💡 Kampanya Fikirleri</h4>
                                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                    Bu listeyi sosyal medyada paylaşarak kullanıcıları motive edebilirsiniz.
                                    Örneğin: "Bu ay Seviye 5'e ilk ulaşan kullanıcıya $100 hediye çeki!"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {achievements.map((ach) => (
                            <div
                                key={ach.id}
                                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{ach.emoji}</span>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{ach.name}</h4>
                                            <p className="text-xs text-gray-500">{ach.description}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-xs ${ach.is_active
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {ach.is_active ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                                    <span className="text-purple-600">+{ach.xp_reward} XP</span>
                                    <span className="text-emerald-600">+{ach.credit_reward}💎</span>
                                    <span>{ach.requirement_type}: {ach.requirement_value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Levels Tab */}
            {activeTab === 'levels' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {levels.map((level) => (
                            <div
                                key={level.level}
                                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center"
                            >
                                <span className="text-4xl">{level.emoji}</span>
                                <h4 className="font-bold text-gray-900 dark:text-white mt-2">Lv.{level.level}</h4>
                                <p className="text-sm text-purple-600 dark:text-purple-400">{level.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{level.required_xp.toLocaleString()} XP</p>
                                {level.credit_bonus_percent > 0 && (
                                    <p className="text-xs text-green-600 mt-1">+{level.credit_bonus_percent}% bonus</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    {/* Daily Rewards Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            🎁 Günlük Ödül Ayarları
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Günlük Kredi Ödülü
                                </label>
                                <input
                                    type="number"
                                    value={settings.daily_credits}
                                    onChange={(e) => setSettings({ ...settings, daily_credits: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 mt-1">Her gün claim edilebilecek 💎 miktarı</p>
                            </div>
                        </div>
                    </div>

                    {/* XP Rewards Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            ⭐ XP Ödül Ayarları
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    🖼️ Görsel Başına XP
                                </label>
                                <input
                                    type="number"
                                    value={settings.xp_per_image}
                                    onChange={(e) => setSettings({ ...settings, xp_per_image: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    🎬 Video Başına XP
                                </label>
                                <input
                                    type="number"
                                    value={settings.xp_per_video}
                                    onChange={(e) => setSettings({ ...settings, xp_per_video: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    🎵 Ses Başına XP
                                </label>
                                <input
                                    type="number"
                                    value={settings.xp_per_audio}
                                    onChange={(e) => setSettings({ ...settings, xp_per_audio: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    💬 Chat Başına XP
                                </label>
                                <input
                                    type="number"
                                    value={settings.xp_per_chat}
                                    onChange={(e) => setSettings({ ...settings, xp_per_chat: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Streak Bonuses Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            🔥 Streak Bonus Ayarları
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    7 Gün Streak Bonusu
                                </label>
                                <input
                                    type="number"
                                    value={settings.streak_bonus_7}
                                    onChange={(e) => setSettings({ ...settings, streak_bonus_7: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 mt-1">7. gün ekstra 💎</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    30 Gün Streak Bonusu
                                </label>
                                <input
                                    type="number"
                                    value={settings.streak_bonus_30}
                                    onChange={(e) => setSettings({ ...settings, streak_bonus_30: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 mt-1">30. gün ekstra 💎</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    100 Gün Streak Bonusu
                                </label>
                                <input
                                    type="number"
                                    value={settings.streak_bonus_100}
                                    onChange={(e) => setSettings({ ...settings, streak_bonus_100: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 mt-1">100. gün ekstra 💎</p>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveSettings}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all"
                        >
                            <Save className="w-4 h-4" />
                            Ayarları Kaydet
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminGamificationPanel;
