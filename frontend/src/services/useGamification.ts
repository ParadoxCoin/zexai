import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from './api';

export interface GamificationStats {
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

export interface LeaderboardUser {
    rank: number;
    user_id: string;
    username: string;
    level: number;
    total_xp: number;
    streak_days: number;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    requirement_type: string;
    requirement_value: number;
    xp_reward: number;
    credit_reward: number;
    icon?: string;
    emoji?: string;
    unlocked: boolean;
    unlocked_at?: string;
}

export function useGamificationStats() {
    return useQuery({
        queryKey: ['gamificationStats'],
        queryFn: async () => {
            const response = await apiService.get<{ data: GamificationStats }>('/gamification/stats');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useLeaderboard(period: string = 'weekly', limit: number = 25) {
    return useQuery({
        queryKey: ['gamificationLeaderboard', period, limit],
        queryFn: async () => {
            const response = await apiService.get<{ data: LeaderboardUser[] }>(`/gamification/leaderboard?period=${period}&limit=${limit}`);
            return response.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

export function useAchievements() {
    return useQuery({
        queryKey: ['gamificationAchievements'],
        queryFn: async () => {
            const response = await apiService.get<{ data: { total: number; unlocked: number; achievements: Achievement[] } }>('/gamification/achievements');
            return response.data;
        },
    });
}

export function useDailyClaim() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await apiService.post<{ success: boolean; streak_days: number; credits_earned: number; bonus_credits: number; xp_earned: number; error?: string }>('/gamification/daily-claim', {});
            if (!response.success && response.error) {
                throw new Error(response.error);
            }
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gamificationStats'] });
            queryClient.invalidateQueries({ queryKey: ['userCredits'] });
        },
    });
}
