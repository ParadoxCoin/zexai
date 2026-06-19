import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ArrowRight, Activity, Shield, ExternalLink, ChevronDown, Zap, Users, Copy, Link as LinkIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ConnectButton from './ConnectButton';

const PRESALE_ADDRESS = "0x3B1029B045D635447EFF6973e95156d9a1285480";
const TOKEN_ADDRESS = "0x28De651aCA0f8584FA2E072cE7c1F4EE774a8B4a";

const PRESALE_ABI = [
  { "inputs": [], "name": "buyWithPol", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [], "name": "presaleActive", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalTokensSold", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getCurrentPrice", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

const ERC20_ABI = [
  { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

// Supported coins for NOWPayments
const COINS = [
  { id: 'pol', ticker: 'matic', name: 'POL', network: 'Polygon', color: '#8247E5', isNative: true },
  { id: 'usdt', ticker: 'usdtmatic', name: 'USDT', network: 'Polygon', color: '#26A17B', isNative: false },
  { id: 'usdc', ticker: 'usdcmatic', name: 'USDC', network: 'Polygon', color: '#2775CA', isNative: false },
  { id: 'weth', ticker: 'wethmatic', name: 'WETH', network: 'Polygon', color: '#627EEA', isNative: false },
  { id: 'wbtc', ticker: 'wbtcmatic', name: 'WBTC', network: 'Polygon', color: '#F7931A', isNative: false },
  { id: 'dai', ticker: 'daimatic', name: 'DAI', network: 'Polygon', color: '#F5AC37', isNative: false },
  { id: 'btc', ticker: 'btc', name: 'BTC', network: 'Bitcoin', color: '#F7931A', isNative: false },
  { id: 'eth', ticker: 'eth', name: 'ETH', network: 'Ethereum', color: '#627EEA', isNative: false },
];

const ZEX_PRICE_USD = 0.0012; // Presale price

export const PresaleForm: React.FC = () => {
    const { t } = useTranslation();
    const { isConnected, address } = useAccount();
    const { data: ethBalance } = useBalance({ address });
    const { data: zexBalanceData, refetch: refetchZexBalance } = useReadContract({
        address: TOKEN_ADDRESS as any, abi: ERC20_ABI, functionName: 'balanceOf',
        args: [address], query: { enabled: !!address }
    });
    const { data: zexAllowanceData, refetch: refetchAllowance } = useReadContract({
        address: TOKEN_ADDRESS as any, abi: ERC20_ABI, functionName: 'allowance',
        args: [address, PRESALE_ADDRESS], query: { enabled: !!address }
    });

    const [polAmount, setPolAmount] = useState('');
    const [usdAmount, setUsdAmount] = useState('');
    const [refundAmount, setRefundAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'buy' | 'refund' | 'referral'>('buy');
    const [selectedCoin, setSelectedCoin] = useState(COINS[0]);
    const [showCoinMenu, setShowCoinMenu] = useState(false);
    const [npLoading, setNpLoading] = useState(false);
    const [npError, setNpError] = useState('');
    const [npSuccess, setNpSuccess] = useState(false);
    const [buyerWallet, setBuyerWallet] = useState('');

    const { data: isPresaleActive } = useReadContract({ address: PRESALE_ADDRESS as any, abi: PRESALE_ABI, functionName: 'presaleActive' });
    const { data: currentPriceData } = useReadContract({ address: PRESALE_ADDRESS as any, abi: PRESALE_ABI, functionName: 'getCurrentPrice' });

    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending } = useWriteContract();
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });

    const isPrivateSale = false;
    const activeRate = 333;
    const zexAllowance = zexAllowanceData ? Number(formatEther(zexAllowanceData as bigint)) : 0;

    const recordReferral = async (eventType: 'welcome_bounty' | 'purchase_commission', amount: number, txHash?: string) => {
        const referrer = localStorage.getItem('zexai_presale_ref');
        if (!referrer || !address || referrer.toLowerCase() === address.toLowerCase()) return;
        
        try {
            await fetch('/api/record-referral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    referrer_wallet: referrer,
                    referred_wallet: address,
                    event_type: eventType,
                    zex_amount: amount,
                    tx_hash: txHash
                })
            });
        } catch (e) {
            console.error("Failed to record referral", e);
        }
    };

    // Record welcome bounty when wallet connects
    useEffect(() => {
        if (isConnected && address) {
            const recordedKey = `zexai_ref_welcome_${address}`;
            if (!localStorage.getItem(recordedKey) && localStorage.getItem('zexai_presale_ref')) {
                recordReferral('welcome_bounty', 50).then(() => {
                    localStorage.setItem(recordedKey, 'true');
                });
            }
        }
    }, [isConnected, address]);

    useEffect(() => {
        if (isTxSuccess) { 
            setPolAmount(''); 
            setRefundAmount(''); 
            refetchZexBalance?.(); 
            refetchAllowance?.();
            
            // Record purchase commission (5% of expected ZEX)
            if (polAmount) {
                const boughtZex = Number(polAmount) * activeRate;
                const commission = boughtZex * 0.05;
                if (commission > 0) recordReferral('purchase_commission', commission, txHash);
            }
        }
    }, [isTxSuccess]);

    useEffect(() => {
        if (isApproveSuccess) { refetchAllowance?.(); }
    }, [isApproveSuccess]);

    // Check URL for payment success/cancel
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            setNpSuccess(true);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleBuy = async () => {
        if (!polAmount || Number(polAmount) <= 0) return;
        writeContract({ address: PRESALE_ADDRESS as any, abi: PRESALE_ABI, functionName: 'buyWithPol', value: parseEther(polAmount) });
    };

    const isValidWallet = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

    const handleNowPaymentsBuy = async () => {
        const amount = Number(usdAmount);
        if (!amount || amount < 1) { setNpError('Minimum $1 USD'); return; }
        if (!buyerWallet || !isValidWallet(buyerWallet)) { setNpError('Geçerli bir Polygon cüzdan adresi girin (0x...)'); return; }
        setNpLoading(true); setNpError('');
        try {
            const res = await fetch('/api/nowpayments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    price_amount: amount,
                    pay_currency: selectedCoin.ticker,
                    buyer_wallet: buyerWallet,
                }),
            });
            const data = await res.json();
            if (data.invoice_url) {
                window.location.href = data.invoice_url;
            } else {
                setNpError(data.error || 'Invoice oluşturulamadı');
            }
        } catch (e: any) {
            setNpError(e.message || 'Bağlantı hatası');
        } finally {
            setNpLoading(false);
        }
    };

    const expectedZex = Number(polAmount || 0) * activeRate;
    const expectedZexFromUsd = Math.floor(Number(usdAmount || 0) / ZEX_PRICE_USD);
    const isNativePol = selectedCoin.isNative;

    return (
        <div className="bg-[#0A0A1F] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl w-full max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />

            {/* Payment Success Banner */}
            {npSuccess && (
                <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300 text-sm text-center font-medium animate-pulse">
                    {t('presale.paymentSuccess', { defaultValue: '✅ Payment successful! Your ZEX tokens will be sent to your wallet shortly.' })}
                </div>
            )}

            {!isConnected && isNativePol ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <Shield className="w-16 h-16 text-cyan-400 opacity-80" />
                    <div>
                        <h4 className="text-2xl font-bold text-white mb-2">{t('presale.portalTitle', { defaultValue: 'ZEX Presale Portal' })}</h4>
                        <p className="text-gray-400 text-sm max-w-sm mx-auto">
                            {t('presale.portalDesc', { defaultValue: 'Connect your wallet on the Polygon network to access the Presale panel, or select a different coin below.' })}
                        </p>
                    </div>
                    <ConnectButton />
                    <div className="w-full border-t border-white/10 pt-4">
                        <p className="text-xs text-gray-500 mb-3">{t('presale.orBuyWith', { defaultValue: 'Or buy with other coins without connecting a wallet:' })}</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {COINS.filter(c => !c.isNative).slice(0, 4).map(coin => (
                                <button key={coin.id} onClick={() => setSelectedCoin(coin)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ background: coin.color }} />
                                    {coin.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                            {isPresaleActive ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-300 rounded-full text-xs font-bold uppercase">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> {t('presale.active', { defaultValue: 'Active' })}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-300 rounded-full text-xs font-bold uppercase">{t('presale.paused', { defaultValue: 'Paused' })}</span>
                            )}
                            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-bold uppercase shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                1 ZEX = $0.0012
                            </span>
                        </div>
                        {isConnected && (
                            <div className="text-right text-xs text-gray-400">
                                <span className="text-white font-mono">{Number(ethBalance?.formatted || 0).toFixed(4)} POL</span>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap p-1 bg-white/5 rounded-xl border border-white/10 gap-1">
                        <button onClick={() => setActiveTab('buy')}
                            className={`flex-1 py-2.5 px-2 min-w-[80px] rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'buy' ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                            {t('presale.tabBuy', { defaultValue: 'BUY ZEX' })}
                        </button>
                        <button onClick={() => setActiveTab('referral')}
                            className={`flex-1 py-2.5 px-2 min-w-[80px] rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'referral' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                            {t('presale.tabReferral', { defaultValue: 'REFERRAL' })}
                        </button>
                        <button onClick={() => setActiveTab('refund')}
                            className={`flex-1 py-2.5 px-2 min-w-[80px] rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'refund' ? 'bg-red-500/20 border border-red-500/50 text-red-300 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                            {t('presale.tabRefund', { defaultValue: 'REFUND' })}
                        </button>
                    </div>

                    {activeTab === 'buy' && (
                        <div className="space-y-4">
                            {/* Coin Selector */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{t('presale.paymentMethod', { defaultValue: 'Payment Method' })}</label>
                                <div className="relative">
                                    <button onClick={() => setShowCoinMenu(!showCoinMenu)}
                                        className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: selectedCoin.color }}>
                                                {selectedCoin.name.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white font-bold text-sm">{selectedCoin.name}</div>
                                                <div className="text-gray-500 text-xs">{selectedCoin.network}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedCoin.isNative && <span className="text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded-full font-bold">ON-CHAIN</span>}
                                            {!selectedCoin.isNative && <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-bold">NOWPayments</span>}
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCoinMenu ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>

                                    {showCoinMenu && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#0D0D2B] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                                            {COINS.map(coin => (
                                                <button key={coin.id}
                                                    onClick={() => { setSelectedCoin(coin); setShowCoinMenu(false); setPolAmount(''); setUsdAmount(''); setNpError(''); }}
                                                    className={`w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-all ${selectedCoin.id === coin.id ? 'bg-white/5' : ''}`}>
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: coin.color }}>
                                                        {coin.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <span className="text-white font-semibold text-sm">{coin.name}</span>
                                                        <span className="text-gray-500 text-xs ml-2">{coin.network}</span>
                                                    </div>
                                                    {coin.isNative && <span className="text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded-full font-bold">ON-CHAIN</span>}
                                                    {selectedCoin.id === coin.id && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* === POL Native Flow === */}
                            {isNativePol && (
                                <>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{t('presale.amountToPay', { defaultValue: 'Amount to Pay (POL)' })}</label>
                                        <div className="flex items-center">
                                            <input type="number" value={polAmount} onChange={e => setPolAmount(e.target.value)} placeholder="0.0"
                                                className="w-full bg-transparent border-none text-3xl font-black text-white focus:outline-none" />
                                            <span className="text-lg font-bold text-cyan-400">POL</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center p-1"><ArrowRight className="text-gray-500 w-5 h-5 rotate-90" /></div>
                                    <div className="p-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-cyan-500/30 rounded-2xl">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{t('presale.expectedZex', { defaultValue: 'Expected ZEX (Max)' })}</label>
                                        <div className="flex items-center">
                                            <input type="text" value={expectedZex.toLocaleString()} readOnly className="w-full bg-transparent border-none text-3xl font-black text-white focus:outline-none" />
                                            <span className="text-lg font-bold text-teal-400">ZEX</span>
                                        </div>
                                        <div className="mt-2 text-xs text-cyan-300 font-medium">1 POL = {activeRate} ZEX</div>
                                    </div>
                                    {!isConnected ? (
                                        <div className="flex flex-col items-center gap-3"><p className="text-xs text-gray-400">{t('presale.connectToBuy', { defaultValue: 'Connect wallet to buy with POL.' })}</p><ConnectButton /></div>
                                    ) : (
                                        <button disabled={true}
                                            className="w-full py-4 bg-gray-800 text-gray-500 rounded-xl font-bold text-lg shadow-xl cursor-not-allowed transition-all flex justify-center items-center gap-2">
                                            {t('presale.comingSoonBtn', { defaultValue: 'Coming Soon' })}
                                        </button>
                                    )}
                                </>
                            )}

                            {/* === NOWPayments Flow === */}
                            {!isNativePol && (
                                <>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{t('presale.amountToSpendUsd', { defaultValue: 'Amount to Spend (USD)' })}</label>
                                        <div className="flex items-center">
                                            <span className="text-2xl font-black text-gray-500 mr-2">$</span>
                                            <input type="number" value={usdAmount} onChange={e => setUsdAmount(e.target.value)} placeholder="100"
                                                className="w-full bg-transparent border-none text-3xl font-black text-white focus:outline-none" min="1" />
                                            <span className="text-lg font-bold text-gray-400">USD</span>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            {[10, 50, 100, 250, 500].map(v => (
                                                <button key={v} onClick={() => setUsdAmount(v.toString())}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${Number(usdAmount) === v ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                                    ${v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center p-1"><ArrowRight className="text-gray-500 w-5 h-5 rotate-90" /></div>
                                    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-2xl">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{t('presale.expectedZexEst', { defaultValue: 'Expected ZEX (Est.)' })}</label>
                                        <div className="flex items-center">
                                            <input type="text" value={expectedZexFromUsd.toLocaleString()} readOnly className="w-full bg-transparent border-none text-3xl font-black text-white focus:outline-none" />
                                            <span className="text-lg font-bold text-teal-400">ZEX</span>
                                        </div>
                                        <div className="mt-2 text-xs text-purple-300 font-medium">
                                            1 ZEX = ${ZEX_PRICE_USD} • Pay with {selectedCoin.name} ({selectedCoin.network})
                                        </div>
                                    </div>
                                    {/* Buyer Wallet Address */}
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{t('presale.receivingAddress', { defaultValue: 'Receiving Polygon Wallet Address' })}</label>
                                        <input type="text" value={buyerWallet} onChange={e => setBuyerWallet(e.target.value.trim())}
                                            placeholder="0x..."
                                            className={`w-full bg-transparent border-none text-sm font-mono text-white focus:outline-none ${buyerWallet && !isValidWallet(buyerWallet) ? 'text-red-400' : ''}`} />
                                        {buyerWallet && !isValidWallet(buyerWallet) && (
                                            <p className="text-[10px] text-red-400 mt-1">{t('presale.invalidAddress', { defaultValue: 'Invalid address — Must start with 0x and be 42 characters' })}</p>
                                        )}
                                        {buyerWallet && isValidWallet(buyerWallet) && (
                                            <p className="text-[10px] text-green-400 mt-1">{t('presale.validAddress', { defaultValue: '✓ Valid Polygon address' })}</p>
                                        )}
                                    </div>
                                    <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-200 leading-relaxed">
                                        <Zap className="w-3.5 h-3.5 inline mr-1 text-purple-400" />
                                        {t('presale.afterPaymentDesc', { defaultValue: 'After payment confirmation, your ZEX tokens will be automatically sent to the wallet address above.' })}
                                    </div>
                                    {npError && <div className="p-2 bg-red-500/20 border border-red-500/50 rounded-lg text-xs text-red-300 text-center">{npError}</div>}
                                    <button disabled={true}
                                        className="w-full py-4 bg-gray-800 text-gray-500 rounded-xl font-bold text-lg shadow-xl cursor-not-allowed transition-all flex justify-center items-center gap-2">
                                        {t('presale.comingSoonBtn', { defaultValue: 'Coming Soon' })}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'refund' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                                <label className="text-xs font-bold text-red-300 uppercase tracking-widest block mb-2">{t('presale.refundAmount', { defaultValue: 'ZEX to Refund' })}</label>
                                <div className="flex items-center">
                                    <input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0.0"
                                        className="w-full bg-transparent border-none text-3xl font-black text-white focus:outline-none" />
                                    <span className="text-lg font-bold text-red-400">ZEX</span>
                                </div>
                            </div>
                            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl mb-4 text-xs text-red-200 leading-relaxed font-medium">
                                {t('presale.refundWarning', { defaultValue: '⚠️ 15% of the refunded ZEX will be Burned, the remaining value will be transferred to your POL wallet.' })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'referral' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="p-5 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 rounded-2xl relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 blur-[40px] rounded-full" />
                                <div className="flex items-center gap-3 mb-3 relative z-10">
                                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                                        <Users className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">{t('presale.referTitle', { defaultValue: 'Refer & Earn 5%' })}</h3>
                                </div>
                                <p className="text-xs text-gray-300 mb-5 leading-relaxed relative z-10">
                                    {t('presale.referDesc', { defaultValue: 'Invite friends and receive a 5% ZEX airdrop from their purchases! (Automated weekly distribution)' })}
                                </p>
                                
                                {isConnected && address ? (
                                    <div className="space-y-4 relative z-10">
                                        {/* Earnings Stats */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-3 text-center">
                                                <div className="text-xl font-black text-white">0</div>
                                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{t('presale.invited', { defaultValue: 'Invited' })}</div>
                                            </div>
                                            <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-3 text-center relative">
                                                <div className="absolute -top-2.5 -right-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap animate-pulse animate-duration-1000">+50 Bounty</div>
                                                <div className="text-xl font-black text-emerald-400">50</div>
                                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{t('presale.earned', { defaultValue: 'ZEX Earned' })}</div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('presale.referLink', { defaultValue: 'Your Referral Link' })}</label>
                                            <div className="flex items-center gap-2 bg-[#050510] border border-white/10 p-1.5 rounded-xl">
                                                <div className="flex-1 px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-300 font-mono truncate select-all">
                                                    https://zexai.io/?ref={address?.substring(0, 6)}...{address?.substring(address.length - 4)}
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`https://zexai.io/?ref=${address}`);
                                                        alert(t('presale.referLinkCopied', { defaultValue: 'Referral link copied!' }));
                                                    }}
                                                    className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30"
                                                    title="Copy"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-emerald-500/70 text-center font-medium">{t('presale.airdropSunday', { defaultValue: 'Earnings are automatically airdropped to your wallet every Sunday.' })}</p>
                                    </div>
                                ) : (
                                    <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-medium transition-colors flex items-center justify-center gap-2 text-sm relative z-10">
                                        <LinkIcon className="w-4 h-4" /> {t('presale.connectToRefer', { defaultValue: 'Connect wallet to view your link' })}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Token Info Footer */}
            <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">ZEX Smart Contract</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                        <div className="text-gray-500 text-[10px] mb-0.5">Network</div>
                        <div className="text-gray-300 font-semibold">Polygon</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                        <div className="text-gray-500 text-[10px] mb-0.5">Token</div>
                        <div className="text-gray-300 font-semibold">ZEX</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                        <div className="text-gray-500 text-[10px] mb-0.5">Decimals</div>
                        <div className="text-gray-300 font-semibold">18</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5 flex flex-col justify-center items-center cursor-pointer hover:bg-white/10 transition-colors"
                         onClick={() => { navigator.clipboard.writeText(TOKEN_ADDRESS); alert("Contract address copied!"); }}>
                        <div className="text-gray-500 text-[10px] mb-0.5 flex items-center gap-1"><Copy className="w-3 h-3" /> Contract</div>
                        <div className="text-gray-300 font-mono truncate w-full px-2" title={TOKEN_ADDRESS}>
                            {TOKEN_ADDRESS.substring(0, 6)}...{TOKEN_ADDRESS.substring(TOKEN_ADDRESS.length - 4)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PresaleForm;
