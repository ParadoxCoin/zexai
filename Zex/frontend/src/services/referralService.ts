import { apiService } from './api';

export interface ReferralStats {
    id: string;
    user_id: string;
    code: string;
    total_referrals: number;
    total_earnings: number;
    created_at: string;
}

export interface ReferralEarning {
    id: string;
    source_user_id: string;
    amount: number;
    purchase_amount: number;
    commission_rate: number;
    status: string;
    created_at: string;
}

class ReferralService {
    async createCode() {
        return apiService.post<{ status: string; code: string }>('/referral/create');
    }

    async getStats() {
        return apiService.get<{ status: string; data: ReferralStats }>('/referral/stats');
    }

    async getHistory() {
        return apiService.get<{ status: string; data: ReferralEarning[] }>('/referral/history');
    }
}

export const referralService = new ReferralService();
