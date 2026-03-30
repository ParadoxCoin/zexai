import React, { useState, useEffect } from 'react';
import {
    CreditCard, DollarSign, Zap, CheckCircle, Tag,
    Wallet, RefreshCw, Sparkles, Package, Gift
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/ui/toast';

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
                api.get('/billing/credit-config'),
                api.get('/billing/special-packages'),
                api.get('/billing/plans')
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
                toast.success('Promo Kodu Geçerli!', `${response.data.discount?.description || 'İndirim uygulandı'}`);
            } else {
                setPromoValid(false);
                setPromoDetails(null);
                toast.error('Geçersiz Kod', response.data.message || 'Kod bulunamadı');
            }
        } catch (error: any) {
            setPromoValid(false);
            setPromoDetails(null);
            toast.error('Hata', error.response?.data?.detail || 'Kod doğrulanamadı');
        }
    };

    const handlePurchase = async () => {
        if (!calculation) return;
        setPurchasing(true);
        try {
            const response = await api.post('/billing/checkout/flexible-credit', {
                amount_usd: amount,
                promo_code: promoDetails?.code || null,
                payment_method: selectedPayment
            });

            if (response.data.checkout_url) {
                window.location.href = response.data.checkout_url;
            } else {
                toast.success('Başarılı!', 'Satın alma işlemi tamamlandı');
            }
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Satın alma başarısız');
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
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
                    <Wallet className="h-8 w-8 mr-3 text-purple-600" />
                    Kredi Satın Al
                </h1>
                <p className="mt-2 text-gray-600">
                    AI servislerini kullanmak için kredi satın alın. Toplu alımlarda özel indirimler!
                </p>
            </div>

            {/* No Expiry Banner */}
            <div className="mb-8 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-center gap-4">
                    <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                            <span className="text-3xl">♾️</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Kredileriniz Asla Sona Ermez!</h3>
                        <p className="text-white/90 mt-1">
                            Satın aldığınız krediler hesabınızda süresiz kalır. Ay sonunda sıfırlanmaz,
                            <br className="hidden md:block" />
                            <span className="font-semibold">dilediğiniz zaman kullanabilirsiniz!</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Amount Selection */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Purchase Type Tabs */}
                    <div className="bg-white rounded-2xl shadow-lg p-2 border border-gray-100">
                        <div className="flex space-x-1">
                            {[
                                { id: 'flexible', label: 'Esnek Kredi', icon: DollarSign },
                                { id: 'subscription', label: 'Abonelik', icon: CreditCard },
                                { id: 'package', label: 'Özel Paketler', icon: Gift }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setPurchaseType(tab.id as any);
                                        setSelectedPlan(null);
                                        setSelectedPackage(null);
                                    }}
                                    className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl text-sm font-medium transition-all ${purchaseType === tab.id
                                        ? 'bg-purple-600 text-white shadow-lg'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <tab.icon className="h-4 w-4 mr-2" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Flexible Credit Card - Only show when flexible is selected */}
                    {purchaseType === 'flexible' && (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <h2 className="text-xl font-semibold mb-4 flex items-center">
                                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                                Tutar Seçin
                            </h2>

                            {/* Amount Slider */}
                            <div className="mb-6">
                                <div className="flex justify-between text-sm text-gray-600 mb-2">
                                    <span>Min: ${config?.min_purchase_usd || 5}</span>
                                    <span className="text-2xl font-bold text-purple-600">${amount}</span>
                                    <span>Max: ${config?.max_purchase_usd || 500}</span>
                                </div>
                                <input
                                    type="range"
                                    min={config?.min_purchase_usd || 5}
                                    max={config?.max_purchase_usd || 500}
                                    value={amount}
                                    onChange={(e) => setAmount(parseInt(e.target.value))}
                                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="grid grid-cols-5 gap-2 mb-6">
                                {[25, 50, 100, 250, 500].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => setAmount(val)}
                                        className={`py-2 rounded-lg text-sm font-medium transition-all ${amount === val
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        ${val}
                                    </button>
                                ))}
                            </div>

                            {/* Bulk Discounts */}
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
                                <h3 className="text-sm font-semibold text-purple-700 mb-2 flex items-center">
                                    <Zap className="h-4 w-4 mr-1" />
                                    Toplu Alım İndirimleri
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {bulkDiscountTiers.map((tier, i) => (
                                        <span
                                            key={i}
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${amount >= tier.threshold
                                                ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            ${tier.threshold}+ → %{tier.discount} bonus
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Promo Code */}
                            <div className="flex space-x-2">
                                <div className="relative flex-1">
                                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Promo kodu girin"
                                        value={promoCode}
                                        onChange={(e) => {
                                            setPromoCode(e.target.value.toUpperCase());
                                            setPromoValid(null);
                                        }}
                                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg ${promoValid === true ? 'border-green-500 bg-green-50' :
                                            promoValid === false ? 'border-red-500 bg-red-50' :
                                                'border-gray-200'
                                            }`}
                                    />
                                </div>
                                <button
                                    onClick={validatePromo}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                                >
                                    Uygula
                                </button>
                            </div>
                            {promoValid && promoDetails && (
                                <div className="mt-2 text-sm text-green-600 flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {promoDetails.discount?.description || 'İndirim uygulandı!'}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Subscription Plans - Only show when subscription is selected */}
                    {purchaseType === 'subscription' && (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <h2 className="text-xl font-semibold mb-4 flex items-center">
                                <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                                Abonelik Planları Seçin
                            </h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Aylık abonelik ile her ay otomatik kredi yüklemesi ve özel avantajlar
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {subscriptionPlans.map((plan: any) => (
                                    <div
                                        key={plan.id}
                                        onClick={() => setSelectedPlan(plan)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan?.id === plan.id
                                            ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-300'
                                            : plan.is_popular
                                                ? 'border-purple-400 bg-purple-50'
                                                : 'border-gray-200 hover:border-purple-300'
                                            }`}
                                    >
                                        {plan.is_popular && (
                                            <div className="text-center mb-2">
                                                <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">EN POPÜLER</span>
                                            </div>
                                        )}
                                        <div className="text-center mb-3">
                                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">{plan.name?.toUpperCase()}</span>
                                        </div>
                                        <div className="text-center mb-3">
                                            <span className="text-3xl font-bold text-gray-900">${plan.monthly_price}</span>
                                            <span className="text-gray-500">/ay</span>
                                        </div>
                                        <div className="text-center text-sm text-purple-600 font-medium mb-3">
                                            {plan.monthly_credits?.toLocaleString()} kredi/ay
                                        </div>
                                        <ul className="space-y-2 text-sm text-gray-600">
                                            {(plan.features || []).slice(0, 4).map((feature: string, i: number) => (
                                                <li key={i} className="flex items-center">
                                                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Special Packages - Only show when package is selected */}
                    {purchaseType === 'package' && specialPackages.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <h2 className="text-xl font-semibold mb-4 flex items-center">
                                <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                                Özel Paket Seçin
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {specialPackages.map((pkg) => (
                                    <div
                                        key={pkg.id}
                                        onClick={() => setSelectedPackage(pkg)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPackage?.id === pkg.id
                                            ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-300'
                                            : pkg.is_featured
                                                ? 'border-yellow-400 bg-yellow-50'
                                                : 'border-gray-200 hover:border-purple-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-semibold">{pkg.name}</h3>
                                                <p className="text-sm text-gray-600">{pkg.description}</p>
                                            </div>
                                            {pkg.badge && (
                                                <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded">
                                                    {pkg.badge}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-baseline">
                                            <span className="text-2xl font-bold text-purple-600">${pkg.discounted_price}</span>
                                            {pkg.original_price > pkg.discounted_price && (
                                                <span className="ml-2 text-sm text-gray-400 line-through">${pkg.original_price}</span>
                                            )}
                                        </div>
                                        <div className="mt-1 text-sm text-green-600">
                                            {(pkg.credits + pkg.bonus_credits).toLocaleString()} kredi
                                            {pkg.bonus_credits > 0 && ` (+${pkg.bonus_credits.toLocaleString()} bonus)`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Summary & Checkout */}
                <div className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-xl p-6 text-white sticky top-4">
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                            <Package className="h-5 w-5 mr-2" />
                            Sipariş Özeti
                        </h2>

                        {/* Dynamic Order Summary based on purchase type */}
                        {purchaseType === 'flexible' && calculation && (
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-purple-200">
                                    <span>Tutar</span>
                                    <span>${calculation.amount_usd}</span>
                                </div>
                                <div className="flex justify-between text-purple-200">
                                    <span>Temel Kredi</span>
                                    <span>{calculation.base_credits.toLocaleString()}</span>
                                </div>
                                {calculation.bonus_credits > 0 && (
                                    <div className="flex justify-between text-green-300">
                                        <span>Bonus Kredi (+%{calculation.discount_percent})</span>
                                        <span>+{calculation.bonus_credits.toLocaleString()}</span>
                                    </div>
                                )}
                                {calculation.promo_applied && (
                                    <div className="flex justify-between text-yellow-300">
                                        <span>Promo İndirim</span>
                                        <span>-${calculation.promo_discount}</span>
                                    </div>
                                )}
                                <div className="border-t border-purple-400 pt-3">
                                    <div className="flex justify-between text-xl font-bold">
                                        <span>Toplam Kredi</span>
                                        <span>{calculation.total_credits.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-2xl font-bold mt-2">
                                        <span>Ödeme</span>
                                        <span>${calculation.final_price}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {purchaseType === 'subscription' && selectedPlan && (
                            <div className="space-y-3 mb-6">
                                <div className="p-3 bg-purple-500/30 rounded-lg">
                                    <div className="font-semibold text-lg">{selectedPlan.name || selectedPlan.display_name}</div>
                                    <div className="text-sm text-purple-200">Aylık Abonelik</div>
                                </div>
                                <div className="flex justify-between text-purple-200">
                                    <span>Aylık Kredi</span>
                                    <span>{(selectedPlan.monthly_credits || 0).toLocaleString()}</span>
                                </div>
                                <div className="border-t border-purple-400 pt-3">
                                    <div className="flex justify-between text-2xl font-bold">
                                        <span>Aylık Ödeme</span>
                                        <span>${selectedPlan.monthly_price || 0}/ay</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {purchaseType === 'package' && selectedPackage && (
                            <div className="space-y-3 mb-6">
                                <div className="p-3 bg-purple-500/30 rounded-lg">
                                    <div className="font-semibold text-lg">{selectedPackage.name}</div>
                                    {selectedPackage.badge && <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded">{selectedPackage.badge}</span>}
                                </div>
                                <div className="flex justify-between text-purple-200">
                                    <span>Kredi</span>
                                    <span>{selectedPackage.credits.toLocaleString()}</span>
                                </div>
                                {selectedPackage.bonus_credits > 0 && (
                                    <div className="flex justify-between text-green-300">
                                        <span>Bonus</span>
                                        <span>+{selectedPackage.bonus_credits.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t border-purple-400 pt-3">
                                    <div className="flex justify-between text-xl font-bold">
                                        <span>Toplam Kredi</span>
                                        <span>{(selectedPackage.credits + selectedPackage.bonus_credits).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-2xl font-bold mt-2">
                                        <span>Ödeme</span>
                                        <span>${selectedPackage.discounted_price}</span>
                                    </div>
                                    {selectedPackage.original_price > selectedPackage.discounted_price && (
                                        <div className="text-right text-sm text-green-300 mt-1">
                                            <span className="line-through text-gray-400">${selectedPackage.original_price}</span>
                                            <span className="ml-2">%{Math.round((1 - selectedPackage.discounted_price / selectedPackage.original_price) * 100)} İndirim!</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Empty state - nothing selected */}
                        {((purchaseType === 'subscription' && !selectedPlan) ||
                            (purchaseType === 'package' && !selectedPackage) ||
                            (purchaseType === 'flexible' && !calculation)) && (
                                <div className="text-center py-6 text-purple-200">
                                    <p>Lütfen bir seçim yapın</p>
                                </div>
                            )}

                        {/* Payment Methods */}
                        <div className="mb-6">
                            <p className="text-sm text-purple-200 mb-2">Ödeme Yöntemi</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'lemonsqueezy', label: '💳 Kart', discount: 0 },
                                    { id: 'nowpayments', label: '₿ Crypto', discount: 5 },
                                    { id: 'binance', label: '🔶 Binance Pay', discount: 5 },
                                    { id: 'metamask', label: '🦊 ZEX Token (Polygon)', discount: 15 }
                                ].map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setSelectedPayment(method.id)}
                                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${selectedPayment === method.id
                                            ? 'bg-white text-purple-700'
                                            : 'bg-purple-500/30 text-white hover:bg-purple-500/50'
                                            }`}
                                    >
                                        {method.label}
                                        {method.discount > 0 && (
                                            <span className="text-xs text-green-400 block">+%{method.discount}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handlePurchase}
                            disabled={purchasing || !calculation}
                            className="w-full py-4 bg-white text-purple-700 rounded-xl font-bold text-lg hover:bg-purple-50 disabled:opacity-50 flex items-center justify-center"
                        >
                            {purchasing ? (
                                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                            ) : (
                                <CreditCard className="h-5 w-5 mr-2" />
                            )}
                            {purchasing ? 'İşleniyor...' : 'Satın Al'}
                        </button>

                        <p className="text-xs text-purple-200 mt-4 text-center">
                            Güvenli ödeme. Krediler anında hesabınıza tanımlanır.
                        </p>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default CreditPurchasePage;
