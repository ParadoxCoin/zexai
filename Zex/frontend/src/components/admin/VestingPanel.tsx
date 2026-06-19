import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Shield, Clock, Ban, CheckCircle, Activity, Search, AlertTriangle, Key } from 'lucide-react';
import { ZEX_VESTING_ADDRESS, ZEX_TOKEN_ADDRESS } from '../../contexts/Web3Context';

const VESTING_ABI = [
  { "inputs": [{ "internalType": "address", "name": "_beneficiary", "type": "address" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "internalType": "uint256", "name": "_cliffDuration", "type": "uint256" }, { "internalType": "uint256", "name": "_duration", "type": "uint256" }, { "internalType": "bool", "name": "_revocable", "type": "bool" }], "name": "createVestingSchedule", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_beneficiary", "type": "address" }], "name": "revoke", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "vestingSchedules", "outputs": [{ "internalType": "bool", "name": "initialized", "type": "bool" }, { "internalType": "uint256", "name": "totalAmount", "type": "uint256" }, { "internalType": "uint256", "name": "releasedAmount", "type": "uint256" }, { "internalType": "uint256", "name": "startTime", "type": "uint256" }, { "internalType": "uint256", "name": "cliffTime", "type": "uint256" }, { "internalType": "uint256", "name": "endTime", "type": "uint256" }, { "internalType": "bool", "name": "revocable", "type": "bool" }, { "internalType": "bool", "name": "revoked", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }
];

export const VestingPanel: React.FC = () => {
    const { address, isConnected } = useAccount();

    const [beneficiary, setBeneficiary] = useState('');
    const [amount, setAmount] = useState('');
    const [cliffMonths, setCliffMonths] = useState('6');
    const [durationMonths, setDurationMonths] = useState('24');
    const [revocable, setRevocable] = useState(true);

    const [searchAddress, setSearchAddress] = useState('');
    const [searchedBeneficiary, setSearchedBeneficiary] = useState('');

    const { data: ownerData } = useReadContract({
        address: ZEX_VESTING_ADDRESS as any,
        abi: VESTING_ABI,
        functionName: 'owner',
    });

    const isOwner = isConnected && ownerData && (ownerData as string).toLowerCase() === address?.toLowerCase();

    const { data: scheduleData, refetch: refetchSchedule } = useReadContract({
        address: ZEX_VESTING_ADDRESS as any,
        abi: VESTING_ABI,
        functionName: 'vestingSchedules',
        args: [searchedBeneficiary],
        query: { enabled: !!searchedBeneficiary }
    });

    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    useEffect(() => {
        if (isTxSuccess) {
            setBeneficiary('');
            setAmount('');
            if (searchedBeneficiary) refetchSchedule();
            alert("İşlem Başarıyla Onaylandı!");
        }
    }, [isTxSuccess, searchedBeneficiary, refetchSchedule]);

    const handleCreate = async () => {
        if (!beneficiary || !amount || !cliffMonths || !durationMonths) return;
        
        const amountWei = parseEther(amount);
        const cliffSecs = BigInt(Math.floor(Number(cliffMonths) * 30 * 24 * 60 * 60)); // Approximate month
        const durationSecs = BigInt(Math.floor(Number(durationMonths) * 30 * 24 * 60 * 60));

        writeContract({
            address: ZEX_VESTING_ADDRESS as any,
            abi: VESTING_ABI,
            functionName: 'createVestingSchedule',
            args: [beneficiary, amountWei, cliffSecs, durationSecs, revocable]
        });
    };

    const handleRevoke = async () => {
        if (!searchedBeneficiary) return;
        if (!window.confirm("Bu vesting programını iptal etmek istediğinize emin misiniz? İptal edildikten sonra henüz açılmamış tüm tokenlar geri alınacaktır.")) return;

        writeContract({
            address: ZEX_VESTING_ADDRESS as any,
            abi: VESTING_ABI,
            functionName: 'revoke',
            args: [searchedBeneficiary]
        });
    };

    const handleSearch = () => {
        if (searchAddress.length === 42) {
            setSearchedBeneficiary(searchAddress);
        }
    };

    if (!isOwner) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-4">
                <Key className="w-12 h-12 text-red-500" />
                <h3 className="text-lg font-bold text-red-700">Yetkisiz Erişim (Owner Değilsiniz)</h3>
                <p className="text-red-600 max-w-md">
                    Bu paneli sadece Kontrat Sahibi (Deployer) cüzdanı yönetebilir. Lütfen MetaMask üzerinde doğru kurucu cüzdanına (Owner) geçtiğinizden emin olun ve sayfayı yenileyin.
                </p>
                <p className="text-sm text-gray-500 font-mono break-all">Mevcut Bağlı Cüzdan: {address || "Bağlı Değil"}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
                <Shield className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold text-blue-900">ZEX Kilit Kasası (Vesting Vault)</h4>
                    <p className="text-sm text-blue-800">Ekip, Danışmanlar ve Özel Yatırımcılar için zaman kilitli (Time-locked) token dağıtım kontratı yöneticisi. Oluşturduğunuz kasalar Blockchain üzerinde değiştirilemez şekilde kazınır.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create Schedule Form */}
                <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-primary-600" /> Yeni Kasa Oluştur</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Alıcı Cüzdan Adresi (Beneficiary)</label>
                            <input
                                type="text"
                                value={beneficiary}
                                onChange={(e) => setBeneficiary(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kilitlenecek ZEX Miktarı</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Örn: 10000000"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 pr-12"
                                />
                                <span className="absolute right-3 top-2 text-gray-500 font-bold">ZEX</span>
                            </div>
                            <p className="text-xs text-orange-600 mt-1">ÖNEMLİ: Bu işlemi yapmadan önce Vesting kontratına ({ZEX_VESTING_ADDRESS.slice(0,6)}...{ZEX_VESTING_ADDRESS.slice(-4)}) yeterli miktarda ZEX transfer etmiş olmanız (fonlamış olmanız) gerekir!</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cliff Süresi (Ay)</label>
                                <input
                                    type="number"
                                    value={cliffMonths}
                                    onChange={(e) => setCliffMonths(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Toplam Serbest Kalma Süresi (Ay)</label>
                                <input
                                    type="number"
                                    value={durationMonths}
                                    onChange={(e) => setDurationMonths(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <input
                                type="checkbox"
                                id="revocable"
                                checked={revocable}
                                onChange={(e) => setRevocable(e.target.checked)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="revocable" className="text-sm font-medium text-gray-700">İptal Edilebilir (Revocable) Olsun mu?</label>
                        </div>
                        <p className="text-xs text-gray-500">Eğer iptal edilebilir yaparsanız, kasayı ileride iptal edip açılmamış tokenları geri çekebilirsiniz. Edilemez yaparsanız hiçbir kuvvet tokenları geri alamaz.</p>

                        <button
                            onClick={handleCreate}
                            disabled={isPending || isTxConfirming || !beneficiary || !amount}
                            className="w-full flex justify-center py-3 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                        >
                            {(isPending || isTxConfirming) ? <Activity className="w-5 h-5 animate-spin" /> : 'Kilit Kasasını (Vesting) Oluştur'}
                        </button>
                    </div>
                </div>

                {/* Manage Existing Schedules */}
                <div className="bg-white rounded-lg shadow border border-gray-100 p-6 flex flex-col">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-primary-600" /> Kasa Yönetimi Kontrolü</h3>
                    
                    <div className="flex space-x-2 mb-6">
                        <input
                            type="text"
                            value={searchAddress}
                            onChange={(e) => setSearchAddress(e.target.value)}
                            placeholder="Sorgulanacak Cüzdan (0x...)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                        />
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm"
                        >
                            Sorgula
                        </button>
                    </div>

                    {searchedBeneficiary && scheduleData && (scheduleData as any)[0] ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 flex-1 relative overflow-hidden">
                            {(scheduleData as any)[7] && (
                                <div className="absolute inset-0 bg-red-100/50 backdrop-blur-sm flex items-center justify-center z-10">
                                    <div className="bg-white px-6 py-3 rounded-xl shadow-lg border border-red-200 text-red-600 font-bold flex items-center gap-2 flex-col">
                                        <Ban className="w-8 h-8" />
                                        BU KASA İPTAL EDİLMİŞTİR
                                    </div>
                                </div>
                            )}

                            <h4 className="font-bold text-gray-900 border-b pb-2 mb-4">Kasa Detayları</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Cüzdan:</span>
                                    <span className="font-mono font-medium">{searchedBeneficiary.slice(0,8)}...{searchedBeneficiary.slice(-6)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Toplam Kilitlenen:</span>
                                    <span className="font-bold text-primary-600">{Number(formatEther((scheduleData as any)[1])).toLocaleString()} ZEX</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Şu Ana Kadar Açılan:</span>
                                    <span className="font-bold text-green-600">{Number(formatEther((scheduleData as any)[2])).toLocaleString()} ZEX</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Cliff (Duvar) Bitiş:</span>
                                    <span className="font-medium">{new Date(Number((scheduleData as any)[4]) * 1000).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tamamen Bitiş (Final):</span>
                                    <span className="font-medium">{new Date(Number((scheduleData as any)[5]) * 1000).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">İptal Edilebilirlik:</span>
                                    <span className={`font-bold ${(scheduleData as any)[6] ? 'text-green-600' : 'text-red-600'}`}>
                                        {(scheduleData as any)[6] ? 'Evet' : 'HAYIR (Dokunulamaz)'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleRevoke}
                                    disabled={!(scheduleData as any)[6] || (scheduleData as any)[7] || isPending || isTxConfirming}
                                    className="w-full flex justify-center items-center gap-2 py-2 border border-red-300 rounded-md shadow-sm text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                                >
                                    {(isPending || isTxConfirming) ? <Activity className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4"/> Kasayı ve Kilitli Tokenları İptal Et (Revoke)</>}
                                </button>
                                {!(scheduleData as any)[6] && (
                                    <p className="text-xs text-center text-gray-500 mt-2">Bu kasa iptal edilemez (Irrevocable) olarak oluşturulmuş.</p>
                                )}
                            </div>
                        </div>
                    ) : searchedBeneficiary ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-center flex-1">
                            <AlertTriangle className="w-10 h-10 text-gray-400 mb-2" />
                            <p className="text-gray-500 font-medium">Bu cüzdan adresi için aktif bir kasa (Vesting Schedule) bulunamadı veya sistem henüz işlenmedi.</p>
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center flex-1 text-gray-400 p-8">
                            <Search className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">Bir cüzdanın kilit durumunu görmek için yukarıdan arama yapın.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VestingPanel;
