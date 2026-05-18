import React, { useState, useEffect } from 'react';
import {
    CreditCard, DollarSign, Zap, CheckCircle, Tag,
    Wallet, RefreshCw, Sparkles, Package, Gift, X, Star, Shield, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const api = axios.create({
    baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1',
});

api.interceptors.request.use((config) => {
    let token = localStorage.getItem('auth_token') ||
        localStorage.getItem('sb-access-token') ||
        sessionStorage.getItem('sb-access-token');
    if (!token) {
        const supabaseKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        if (supabaseKey) {
            try {
                const session = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
                token = session.access_token;
            } catch (e) { }
        }
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

interface CreditConfig {
    min_purchase_usd: number;
    max_purchase_usd: number;
    credits_per_usd: number;
    bulk_discounts: Record<string, number>;
}

interface SpecialPackage {
    id: string;
    name: string;
    description: string;
    original_price: number;
    discounted_price: number;
    credits: number;
    bonus_credits: number;
    badge?: string;
    is_featured: boolean;
}

interface PriceCalculation {
    amount_usd: number;
    base_credits: number;
    bonus_credits: number;
    total_credits: number;
    discount_percent: number;
    promo_applied: boolean;
    promo_discount: number;
    final_price: number;
}

export const CreditPurchasePage: React.FC = () => {
    const { t } = useTranslation();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<CreditConfig | null>(null);
    const [specialPackages, setSpecialPackages] = useState<SpecialPackage[]>([]);

    // Purchase state
    const [purchaseType, setPurchaseType] = useState<'flexible' | 'subscription' | 'package'>('flexible');
    const [amount, setAmount] = useState(25);
    const [promoCode, setPromoCode] = useState('');
    const [promoValid, setPromoValid] = useState<boolean | null>(null);
    const [promoDetails, setPromoDetails] = useState<any>(null);
    const [calculation, setCalculation] = useState<PriceCalculation | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<string>('lemonsqueezy');
    const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [selectedPackage, setSelectedPackage] = useState<SpecialPackage | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (config && purchaseType === 'flexible') {
            calculatePrice();
        }
    }, [amount, promoDetails, config]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [configRes, packagesRes, plansRes] = await Promise.all([
                api.get('/billing/credit-config').catch(() => ({ data: { min_purchase_usd: 5, max_purchase_usd: 500, credits_per_usd: 100, bulk_discounts: { "50": 5, "100": 10, "200": 15, "500": 25 } } })),
                api.get('/billing/special-packages').catch(() => ({ data: { packages: [] } })),
                api.get('/billing/plans').catch(() => ({ data: { plans: [] } }))
            ]);
            setConfig(configRes.data);
            setSpecialPackages(packagesRes.data?.packages || []);
            setSubscriptionPlans(plansRes.data?.plans || []);

            // Set default amount
            if (configRes.data?.min_purchase_usd) {
                setAmount(Math.max(25, configRes.data.min_purchase_usd));
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculatePrice = async () => {
        if (!config) return;
        setCalculating(true);
        try {
            const response = await api.post('/billing/calculate-price', null, {
                params: {
                    amount_usd: amount,
                    promo_code: promoDetails?.code || null
                }
            });
            setCalculation(response.data);
        } catch (error) {
            // Calculate locally as fallback
            const baseCredits = amount * (config.credits_per_usd || 100);
            const discountTiers = Object.entries(config.bulk_discounts || {})
                .map(([threshold, discount]) => ({ threshold: parseInt(threshold), discount }))
                .sort((a, b) => b.threshold - a.threshold);

            let discountPercent = 0;
            for (const tier of discountTiers) {
                if (amount >= tier.threshold) {
                    discountPercent = tier.discount;
                    break;
                }
            }

            const bonusCredits = Math.floor(baseCredits * discountPercent / 100);

            setCalculation({
                amount_usd: amount,
                base_credits: baseCredits,
                bonus_credits: bonusCredits,
                total_credits: baseCredits + bonusCredits,
                discount_percent: discountPercent,
                promo_applied: false,
                promo_discount: 0,
                final_price: amount
            });
        } finally {
            setCalculating(false);
        }
    };

    const validatePromo = async () => {
        if (!promoCode.trim()) return;
        try {
            const response = await api.post('/billing/validate-promo', {
                code: promoCode.trim().toUpperCase(),
                purchase_type: 'credits',
                amount_usd: amount
            });
            if (response.data.valid) {
                setPromoValid(true);
                setPromoDetails(response.data);
                toast.success(t('billing.promoSuccess'), `${response.data.discount?.description || t('billing.promoApplied')}`);
            } else {
                setPromoValid(false);
                setPromoDetails(null);
                toast.error(t('billing.invalidCode'), response.data.message || t('billing.codeNotFound'));
            }
        } catch (error: any) {
            setPromoValid(false);
            setPromoDetails(null);
            toast.error(t('billing.error'), error.response?.data?.detail || t('billing.validateError'));
        }
    };

    const handlePurchase = async () => {
        setPurchasing(true);
        try {
            let response;
            if (purchaseType === 'flexible') {
                if (!calculation) return;
                response = await api.post('/billing/checkout/flexible-credit', {
                    amount_usd: amount,
                    promo_code: promoDetails?.code || null,
                    payment_method: selectedPayment
                });
            } else if (purchaseType === 'subscription') {
                if (!selectedPlan) return;
                response = await api.post('/billing/checkout/create', {
                    item_type: 'subscription',
                    item_id: selectedPlan.id,
                    payment_method: selectedPayment
                });
            } else if (purchaseType === 'package') {
                if (!selectedPackage) return;
                response = await api.post('/billing/checkout/create', {
                    item_type: 'top_up',
                    item_id: selectedPackage.id,
                    payment_method: selectedPayment
                });
            }

            if (response && response.data.checkout_url) {
                window.location.href = response.data.checkout_url;
            } else {
                toast.success(t('billing.purchaseSuccess'), t('billing.purchaseCompleted'));
            }
        } catch (error: any) {
            toast.error(t('billing.error'), error.response?.data?.detail || t('billing.purchaseFailed'));
        } finally {
            setPurchasing(false);
        }
    };

    const bulkDiscountTiers = config?.bulk_discounts
        ? Object.entries(config.bulk_discounts)
            .map(([threshold, discount]) => ({ threshold: parseInt(threshold), discount }))
            .sort((a, b) => a.threshold - b.threshold)
        : [];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030712] flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('billing.loading', 'INITIALIZING BILLING CORE...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030712] text-white selection:bg-purple-500/30 overflow-x-hidden relative">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-purple-900/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-blue-900/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] brightness-120 contrast-150" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Hero Header */}
                <div className="text-center mb-12 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 w-fit mb-4">
                        <Wallet className="w-4 h-4 text-purple-400" />
                        <span className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em]">
                            ZEX FINANCIAL CORE
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase italic leading-none drop-shadow-2xl">
                        {t('billing.title', 'RECHARGE ')}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                            {t('billing.titleHighlight', 'ZEX CREDITS')}
                        </span>
                    </h1>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mt-3 opacity-80 leading-relaxed">
                        {t('billing.subtitle', 'ACQUIRE NEURAL POWER FOR GENERATING HIGH-FIDELITY AI ASSETS.')}
                    </p>
                </div>

                {/* High-Tech No Expiry Banner */}
                <div className="mb-12 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20 backdrop-blur-xl rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 text-center sm:text-left">
                        <div className="flex-shrink-0 w-14 h-14 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center shadow-lg">
                            <span className="text-2xl animate-pulse">♾️</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-wider text-emerald-400">{t('billing.noExpiryTitle', 'Your Credits Never Expire!')}</h3>
                            <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-2xl font-medium uppercase tracking-wider opacity-85">
                                {t('billing.noExpiryDesc', 'Purchased credits stay in your account indefinitely. They do not reset at the end of the month, so you can use them whenever you need!')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Panel: Package Selector */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Tab Switcher */}
                        <div className="bg-black/60 backdrop-blur-xl border border-white/5 p-1.5 rounded-[1.5rem] w-full flex shadow-2xl">
                            {[
                                { id: 'flexible', label: t('billing.tabFlexible', 'FLEXIBLE CREDIT'), icon: DollarSign, color: 'bg-purple-600 shadow-purple-600/30' },
                                { id: 'subscription', label: t('billing.tabSubscription', 'SUBSCRIPTION'), icon: CreditCard, color: 'bg-blue-600 shadow-blue-600/30' },
                                { id: 'package', label: t('billing.tabPackages', 'SPECIAL PACKAGES'), icon: Gift, color: 'bg-orange-600 shadow-orange-600/30' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setPurchaseType(tab.id as any);
                                        setSelectedPlan(null);
                                        setSelectedPackage(null);
                                    }}
                                    className={`flex-1 flex items-center justify-center py-4 px-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all relative overflow-hidden ${purchaseType === tab.id
                                        ? `${tab.color} text-white shadow-xl scale-[1.02] border-t border-white/10`
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                        }`}
                                >
                                    <tab.icon className="h-4 w-4 mr-2.5 shrink-0" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Switchable Interactive Panels */}
                        <AnimatePresence mode="wait">
                            {/* 1. Flexible Credit Slider */}
                            {purchaseType === 'flexible' && (
                                <motion.div
                                    key="flexible"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    className="bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
                                    
                                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.25em] mb-8 flex items-center gap-3">
                                        <DollarSign className="w-4.5 h-4.5 text-purple-400" />
                                        {t('billing.selectAmount', 'CHOOSE RECHARGE AMOUNT')}
                                    </h2>

                                    {/* Big Amount and Slider */}
                                    <div className="mb-8 space-y-6">
                                        <div className="flex items-end justify-between border-b border-white/5 pb-4">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">MIN: ${config?.min_purchase_usd || 5}</span>
                                            <span className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 tracking-tighter">
                                                ${amount}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">MAX: ${config?.max_purchase_usd || 500}</span>
                                        </div>
                                        
                                        <input
                                            type="range"
                                            min={config?.min_purchase_usd || 5}
                                            max={config?.max_purchase_usd || 500}
                                            value={amount}
                                            onChange={(e) => setAmount(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-purple-500"
                                        />
                                    </div>

                                    {/* Quick Amount Buttons */}
                                    <div className="grid grid-cols-5 gap-3 mb-8">
                                        {[25, 50, 100, 250, 500].map((val) => (
                                            <button
                                                key={val}
                                                onClick={() => setAmount(val)}
                                                className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${amount === val
                                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 scale-105 border-t border-white/10'
                                                    : 'bg-white/5 text-slate-400 border border-white/5 hover:border-white/10 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                ${val}
                                            </button>
                                        ))}
                                    </div>

                                    {/* High-Tech Bulk Discounts */}
                                    <div className="bg-purple-500/5 rounded-2xl p-6 border border-purple-500/10 mb-8">
                                        <h3 className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <Zap className="h-4 w-4" />
                                            {t('billing.bulkDiscounts', 'BULK PURCHASE DISCOUNTS')}
                                        </h3>
                                        <div className="flex flex-wrap gap-2.5">
                                            {bulkDiscountTiers.map((tier, i) => {
                                                const isActive = amount >= tier.threshold;
                                                return (
                                                    <span
                                                        key={i}
                                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isActive
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5'
                                                            : 'bg-black/40 border-white/5 text-slate-500'
                                                            }`}
                                                    >
                                                        {t('billing.bulkDiscountRow', { threshold: tier.threshold, discount: tier.discount })}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Promo Code Input */}
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <Tag className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <input
                                                type="text"
                                                placeholder={t('billing.promoPlaceholder', 'ENTER PROMO CODE')}
                                                value={promoCode}
                                                onChange={(e) => {
                                                    setPromoCode(e.target.value.toUpperCase());
                                                    setPromoValid(null);
                                                }}
                                                className={`w-full pl-12 pr-4 py-4 bg-black/60 border rounded-2xl outline-none transition-all text-xs font-black uppercase tracking-widest text-slate-200 placeholder-slate-700 ${promoValid === true ? 'border-green-500/50 bg-green-500/5' :
                                                    promoValid === false ? 'border-red-500/50 bg-red-500/5' :
                                                        'border-white/5 focus:border-purple-500/40'
                                                    }`}
                                            />
                                        </div>
                                        <button
                                            onClick={validatePromo}
                                            className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 active:scale-95 border-t border-white/20"
                                        >
                                            {t('billing.apply', 'APPLY')}
                                        </button>
                                    </div>
                                    {promoValid && promoDetails && (
                                        <div className="mt-3 text-[10px] font-black text-green-400 flex items-center gap-1.5 uppercase tracking-widest animate-pulse">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            {promoDetails.discount?.description || t('billing.promoApplied', 'PROMO CODE APPLIED')}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* 2. Subscription Plans */}
                            {purchaseType === 'subscription' && (
                                <motion.div
                                    key="subscription"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    className="bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
                                    
                                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.25em] mb-2 flex items-center gap-3">
                                        <CreditCard className="w-4.5 h-4.5 text-blue-400" />
                                        {t('billing.subscriptionPlans', 'MEMBERSHIP TIERS')}
                                    </h2>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-8 leading-relaxed">
                                        {t('billing.subscriptionDesc', 'UNLOCK FULL RECURRING AI POWER WITH PRIORITY RENDERING.')}
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {subscriptionPlans.map((plan: any) => {
                                            const isSelected = selectedPlan?.id === plan.id;
                                            return (
                                                <div
                                                    key={plan.id}
                                                    onClick={() => setSelectedPlan(plan)}
                                                    className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${isSelected
                                                        ? 'border-purple-600 bg-purple-600/10 shadow-2xl scale-[1.03]'
                                                        : plan.is_popular
                                                            ? 'border-purple-500/20 bg-black/40 hover:border-purple-500/40'
                                                            : 'border-white/5 bg-black/40 hover:border-white/15'
                                                        }`}
                                                >
                                                    {plan.is_popular && (
                                                        <div className="absolute top-3 right-3">
                                                            <span className="px-2.5 py-1 bg-purple-600 text-white text-[7px] font-black uppercase tracking-[0.2em] rounded-full border-t border-white/10 shadow-md">
                                                                {t('billing.popularBadge', 'MOST POPULAR')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    <div>
                                                        <div className="mb-4">
                                                            <span className="inline-block px-3 py-1 bg-white/5 border border-white/5 text-slate-300 text-[8px] font-black uppercase tracking-[0.2em] rounded-lg">
                                                                {plan.name?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="mb-4">
                                                            <span className="text-3xl font-black italic text-white">${plan.monthly_price}</span>
                                                            <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest ml-1">/mo</span>
                                                        </div>
                                                        <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-6">
                                                            {t('billing.creditsPerMonth', { count: plan.monthly_credits?.toLocaleString() })} Kredi
                                                        </div>
                                                    </div>
                                                    
                                                    <ul className="space-y-3.5 border-t border-white/5 pt-5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                                        {(plan.features || []).slice(0, 4).map((feature: string, i: number) => (
                                                            <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                                <span>{feature}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {/* 3. Special Packages */}
                            {purchaseType === 'package' && specialPackages.length > 0 && (
                                <motion.div
                                    key="package"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    className="bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
                                    
                                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.25em] mb-8 flex items-center gap-3">
                                        <Sparkles className="w-4.5 h-4.5 text-yellow-500 animate-pulse" />
                                        {t('billing.specialPackages', 'PRE-COMPILED POWER PACKS')}
                                    </h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {specialPackages.map((pkg) => {
                                            const isSelected = selectedPackage?.id === pkg.id;
                                            return (
                                                <div
                                                    key={pkg.id}
                                                    onClick={() => setSelectedPackage(pkg)}
                                                    className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${isSelected
                                                        ? 'border-purple-600 bg-purple-600/10 shadow-2xl scale-[1.02]'
                                                        : pkg.is_featured
                                                            ? 'border-yellow-500/20 bg-black/40 hover:border-yellow-500/40'
                                                            : 'border-white/5 bg-black/40 hover:border-white/15'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-black text-sm text-white uppercase tracking-widest">{pkg.name}</h3>
                                                            <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-tight">{pkg.description}</p>
                                                        </div>
                                                        {pkg.badge && (
                                                            <span className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[8px] font-black uppercase tracking-widest rounded-lg">
                                                                {pkg.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-baseline mb-3">
                                                        <span className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">${pkg.discounted_price}</span>
                                                        {pkg.original_price > pkg.discounted_price && (
                                                            <span className="ml-2 text-xs text-slate-600 line-through font-bold">${pkg.original_price}</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest border-t border-white/5 pt-4 mt-2">
                                                        {(pkg.credits + pkg.bonus_credits).toLocaleString()} Kredi
                                                        {pkg.bonus_credits > 0 && (
                                                            <span className="text-slate-500 ml-1 text-[9px] font-bold">
                                                                (+{pkg.bonus_credits.toLocaleString()} Bonus)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Panel: High-Tech Order Summary Sidebar */}
                    <div className="lg:col-span-4">
                        <div className="bg-gradient-to-br from-indigo-950/60 to-purple-950/60 backdrop-blur-2xl border border-purple-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden sticky top-8">
                            {/* Futuristic Grid Overlay */}
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjAuNSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] pointer-events-none" />
                            
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-3 relative z-10">
                                <Package className="h-4.5 w-4.5 text-purple-400" />
                                {t('billing.orderSummary', 'ORDER SUMMARY')}
                            </h2>

                            {/* Dynamic Details Area */}
                            <div className="relative z-10 mb-8 border-b border-white/5 pb-6">
                                {purchaseType === 'flexible' && calculation && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <span>{t('billing.amount', 'USD AMOUNT')}</span>
                                            <span className="text-white">${calculation.amount_usd}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <span>{t('billing.baseCredits', 'BASE POWER')}</span>
                                            <span className="text-white">{calculation.base_credits.toLocaleString()}</span>
                                        </div>
                                        {calculation.bonus_credits > 0 && (
                                            <div className="flex justify-between text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                                <span>{t('billing.bonusCredits', { percent: calculation.discount_percent })} BONUS</span>
                                                <span className="font-bold">+{calculation.bonus_credits.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {calculation.promo_applied && (
                                            <div className="flex justify-between text-[10px] font-black text-yellow-400 uppercase tracking-widest">
                                                <span>{t('billing.promoDiscount', 'PROMO DISCOUNT')}</span>
                                                <span className="font-bold">-${calculation.promo_discount}</span>
                                            </div>
                                        )}
                                        
                                        <div className="border-t border-white/5 pt-5 space-y-4">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('billing.totalCredits', 'TOTAL QUANTITY')}</span>
                                                <span className="text-xl font-black text-white italic">{calculation.total_credits.toLocaleString()} <span className="text-purple-400 text-xs">ZEX</span></span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('billing.totalPayment', 'TOTAL PAYMENT')}</span>
                                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 italic">${calculation.final_price}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {purchaseType === 'subscription' && selectedPlan && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="font-black text-xs text-white uppercase tracking-widest">{selectedPlan.name || selectedPlan.display_name}</div>
                                            <div className="text-[8px] text-purple-400 font-bold uppercase tracking-widest mt-1">{t('billing.monthlySubscription', 'MONTHLY SUBSCRIBER')}</div>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <span>{t('billing.monthlyCredits', 'MONTHLY CREDITS')}</span>
                                            <span className="text-white">{(selectedPlan.monthly_credits || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="border-t border-white/5 pt-5">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('billing.monthlyPayment', 'MONTHLY COST')}</span>
                                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 italic">${selectedPlan.monthly_price || 0}/ay</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {purchaseType === 'package' && selectedPackage && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                                            <div>
                                                <div className="font-black text-xs text-white uppercase tracking-widest">{selectedPackage.name}</div>
                                                <div className="text-[8px] text-purple-400 font-bold uppercase tracking-widest mt-1">SPECIAL COMBO PACK</div>
                                            </div>
                                            {selectedPackage.badge && <span className="text-[7px] bg-yellow-400 text-yellow-950 px-2 py-0.5 rounded font-black tracking-widest uppercase">{selectedPackage.badge}</span>}
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <span>{t('billing.baseCredits', 'BASE POWER')}</span>
                                            <span className="text-white">{selectedPackage.credits.toLocaleString()}</span>
                                        </div>
                                        {selectedPackage.bonus_credits > 0 && (
                                            <div className="flex justify-between text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                                <span>{t('billing.bonusCredits', 'BONUS CREDITS')}</span>
                                                <span className="font-bold">+{selectedPackage.bonus_credits.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-white/5 pt-5 space-y-4">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('billing.totalCredits', 'TOTAL QUANTITY')}</span>
                                                <span className="text-xl font-black text-white italic">{(selectedPackage.credits + selectedPackage.bonus_credits).toLocaleString()} <span className="text-purple-400 text-xs">ZEX</span></span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('billing.totalPayment', 'TOTAL PAYMENT')}</span>
                                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 italic">${selectedPackage.discounted_price}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Empty Selection State */}
                                {((purchaseType === 'subscription' && !selectedPlan) ||
                                    (purchaseType === 'package' && !selectedPackage) ||
                                    (purchaseType === 'flexible' && !calculation)) && (
                                        <div className="text-center py-8 text-slate-500 uppercase font-black text-[9px] tracking-widest flex flex-col items-center gap-3">
                                            <Star className="w-8 h-8 opacity-20 animate-pulse text-purple-400" />
                                            <p>{t('billing.makeSelection', 'AWAITING ITEM SELECTION')}</p>
                                        </div>
                                    )}
                            </div>

                            {/* High-Tech Payment Method Grid */}
                            <div className="relative z-10 mb-8">
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3">{t('billing.paymentMethod', 'SELECT PROTOCOL')}</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'lemonsqueezy', label: t('billing.methodCard', 'CREDIT CARD'), discount: 0, icon: <CreditCard className="w-3.5 h-3.5" /> },
                                        { id: 'nowpayments', label: t('billing.methodCrypto', 'B CRYPTO'), discount: 5, icon: <Wallet className="w-3.5 h-3.5 text-cyan-400" /> },
                                        { id: 'metamask', label: t('billing.methodMetamask', 'ZEX TOKEN'), discount: 15, icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> }
                                    ].map((method) => {
                                        const isSelected = selectedPayment === method.id;
                                        return (
                                            <button
                                                key={method.id}
                                                onClick={() => setSelectedPayment(method.id)}
                                                className={`py-3.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-between border ${isSelected
                                                    ? 'bg-purple-600 border-purple-500/50 text-white shadow-lg shadow-purple-600/20'
                                                    : 'bg-black/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {method.icon}
                                                    <span>{method.label}</span>
                                                </div>
                                                {method.discount > 0 && (
                                                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-black tracking-tighter border border-emerald-500/25">
                                                        +{method.discount}%
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Glowing Action Button */}
                            <button
                                onClick={handlePurchase}
                                disabled={
                                    purchasing || 
                                    (purchaseType === 'flexible' && !calculation) ||
                                    (purchaseType === 'subscription' && !selectedPlan) ||
                                    (purchaseType === 'package' && !selectedPackage)
                                }
                                className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-900 disabled:to-slate-950 text-white font-black text-xs uppercase tracking-[0.35em] rounded-2xl shadow-xl shadow-purple-500/25 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn border-t border-white/20 border-r border-white/5"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none" />
                                {purchasing ? (
                                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                                ) : (
                                    <Shield className="h-4.5 w-4.5" />
                                )}
                                {purchasing ? t('billing.processing', 'PROCESSING...') : t('billing.buyNow', 'BUY NOW')}
                            </button>

                            <p className="text-[8px] text-slate-600 font-bold uppercase tracking-wider mt-4 text-center">
                                {t('billing.secureNote', 'SECURE ENCRYPTED GATEWAY. POWERED BY SMART-ROUTE PROTOCOL.')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default CreditPurchasePage;
