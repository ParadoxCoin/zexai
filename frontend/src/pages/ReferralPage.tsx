import React, { useEffect, useState } from 'react';
import { referralService, ReferralStats, ReferralEarning } from '@/services/referralService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Users, DollarSign, TrendingUp } from 'lucide-react';

const ReferralPage: React.FC = () => {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [history, setHistory] = useState<ReferralEarning[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const statsRes = await referralService.getStats();
            setStats(statsRes.data);

            const historyRes = await referralService.getHistory();
            setHistory(historyRes.data);
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

    const copyCode = () => {
        if (stats?.code) {
            navigator.clipboard.writeText(stats.code);
            alert("Referral code copied!");
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading referral data...</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Referral Program</h1>
                    <p className="text-gray-400 mt-2">Invite friends and earn lifetime commissions.</p>
                </div>
                {!stats?.code && (
                    <Button onClick={createCode} className="bg-purple-600 hover:bg-purple-700">
                        Generate My Referral Code
                    </Button>
                )}
            </div>

            {stats?.code && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Code Card */}
                    <Card className="p-6 bg-gray-900 border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-200">Your Referral Code</h3>
                            <Copy className="h-5 w-5 text-purple-400 cursor-pointer" onClick={copyCode} />
                        </div>
                        <div className="text-3xl font-bold text-purple-500 tracking-wider">
                            {stats.code}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Share this code with your friends</p>
                    </Card>

                    {/* Total Referrals */}
                    <Card className="p-6 bg-gray-900 border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-200">Total Referrals</h3>
                            <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {stats.total_referrals}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Users joined with your code</p>
                    </Card>

                    {/* Total Earnings */}
                    <Card className="p-6 bg-gray-900 border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-200">Total Earnings</h3>
                            <DollarSign className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="text-3xl font-bold text-green-500">
                            ${stats.total_earnings.toFixed(2)}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Lifetime commission earned</p>
                    </Card>
                </div>
            )}

            {/* Earnings History */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> Earnings History
                </h2>

                <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="p-4 text-gray-400 font-medium">Date</th>
                                <th className="p-4 text-gray-400 font-medium">Purchase Amount</th>
                                <th className="p-4 text-gray-400 font-medium">Commission Rate</th>
                                <th className="p-4 text-gray-400 font-medium">You Earned</th>
                                <th className="p-4 text-gray-400 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        No earnings yet. Start inviting friends!
                                    </td>
                                </tr>
                            ) : (
                                history.map((item) => (
                                    <tr key={item.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="p-4 text-gray-300">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-gray-300">${item.purchase_amount.toFixed(2)}</td>
                                        <td className="p-4 text-gray-300">{(item.commission_rate * 100).toFixed(0)}%</td>
                                        <td className="p-4 text-green-400 font-medium">+${item.amount.toFixed(2)}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs ${item.status === 'paid' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                                                }`}>
                                                {item.status.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReferralPage;
