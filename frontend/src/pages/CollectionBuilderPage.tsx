import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layers, Image as ImageIcon, Settings, CheckCircle, Zap, Shield, ArrowRight, Upload, Loader2, Sparkles } from 'lucide-react';
import { apiService } from '../services/api';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';

const CollectionBuilderPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // URL'den id gelirse mevcut koleksiyonu yükleriz
    const { account, createCollectionContract, tokenBalance } = useWeb3();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [collectionId, setCollectionId] = useState<string | null>(id || null);

    // Step 1 State
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [description, setDescription] = useState('');
    const [maxSupply, setMaxSupply] = useState(10);
    const [mintPrice, setMintPrice] = useState(1.0);
    const [royaltyBps, setRoyaltyBps] = useState(500); // 5%

    // Step 2 & 3 State
    const [items, setItems] = useState<any[]>([]);
    const [imageUrl, setImageUrl] = useState('');
    const [traitType, setTraitType] = useState('Background');
    const [traitValue, setTraitValue] = useState('');
    const [currentTraits, setCurrentTraits] = useState<{trait_type: string, value: string}[]>([]);

    // Calculation (Base Fee: 250, Per Item: 25)
    const totalZexCost = 250 + (25 * maxSupply);

    const handleCreateDraft = async () => {
        if (!name || !symbol) return alert("İsim ve sembol zorunludur.");
        setLoading(true);
        try {
            const req = {
                name, symbol, description, max_supply: maxSupply, 
                mint_price: mintPrice, royalty_bps: royaltyBps
            };
            const res = await apiService.post('/api/v1/collections', req);
            setCollectionId(res.id);
            setStep(2);
        } catch (e: any) {
            alert(e.response?.data?.detail || "Hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    const handleAddTrait = () => {
        if (!traitType || !traitValue) return;
        setCurrentTraits([...currentTraits, { trait_type: traitType, value: traitValue }]);
        setTraitType('');
        setTraitValue('');
    };

    const handleAddItem = async () => {
        if (!imageUrl || !collectionId) return alert("Lütfen bir görsel ekleyin");
        setLoading(true);
        try {
            const req = { image_url: imageUrl, attributes: currentTraits };
            const res = await apiService.post(`/api/v1/collections/${collectionId}/items`, req);
            setItems([...items, res]);
            setImageUrl('');
            setCurrentTraits([]);
        } catch (e: any) {
            alert(e.response?.data?.detail || "Item eklenemedi");
        } finally {
            setLoading(false);
        }
    };

    const handleCalculateRarity = async () => {
        if (!collectionId) return;
        setLoading(true);
        try {
            await apiService.post(`/api/v1/collections/${collectionId}/rarity`);
            // Yükle
            const res = await apiService.get(`/api/v1/collections/${collectionId}/items`);
            setItems(res);
            setStep(4);
        } catch (e) {
            alert("Rarity hesaplanırken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!account) return alert("Lütfen cüzdan bağlayın!");
        setLoading(true);
        try {
            // 1. Pay ZEX and Deploy Contract via Factory
            const contractAddress = await createCollectionContract(name, symbol, maxSupply, royaltyBps);
            if (!contractAddress) throw new Error("Contract deploy iptal edildi veya başarısız.");

            // 2. Publish metadata to IPFS via Backend
            await apiService.post(`/api/v1/collections/${collectionId}/publish`, {
                contract_address: contractAddress
            });

            setStep(5); // Success!
        } catch (e: any) {
            console.error(e);
            alert("Yayınlama başarısız: " + (e.message || "Bilinmeyen hata"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 mt-16 pb-24">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-pink-500">
                    Koleksiyon Fabrikası
                </h1>
                <p className="text-gray-500 mt-2">Kendi akıllı kontratın, kendi kuralların.</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center mb-12">
                {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                            step >= s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                        }`}>
                            {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                        </div>
                        {s < 5 && <div className={`w-16 h-1 mx-2 rounded ${step > s ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'}`} />}
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-[#1a1c23] rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-2xl shadow-gray-900/5">
                
                {/* STEP 1: INITIALIZE */}
                {step === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Settings className="text-indigo-500"/> Koleksiyon Ayarları</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Koleksiyon Adı</label>
                                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Örn: CyberPunks" className="w-full bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sembol</label>
                                <input type="text" value={symbol} onChange={e=>setSymbol(e.target.value)} placeholder="Örn: CPUNK" className="w-full bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Açıklama</label>
                            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div>
                                <label className="text-sm font-medium text-gray-500">Maksimum Supply</label>
                                <select value={maxSupply} onChange={e=>setMaxSupply(Number(e.target.value))} className="w-full mt-2 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 p-3 rounded-xl dark:text-white">
                                    <option value={10}>10 Adet</option>
                                    <option value={100}>100 Adet</option>
                                    <option value={1000}>1,000 Adet</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Satış Fiyatı (POL)</label>
                                <input type="number" step="0.1" value={mintPrice} onChange={e=>setMintPrice(Number(e.target.value))} className="w-full mt-2 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 p-3 rounded-xl dark:text-white" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Royalty (Komisyon %)</label>
                                <select value={royaltyBps} onChange={e=>setRoyaltyBps(Number(e.target.value))} className="w-full mt-2 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 p-3 rounded-xl dark:text-white">
                                    <option value={250}>%2.5</option>
                                    <option value={500}>%5.0 (Önerilen)</option>
                                    <option value={750}>%7.5</option>
                                    <option value={1000}>%10.0</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl flex items-center justify-between mt-6">
                            <div>
                                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">ZEX Fabrika Ücreti</p>
                                <p className="text-xs text-gray-500">{250} Taban Fiyat + ({maxSupply} x 25) Kapasite</p>
                            </div>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalZexCost} ZEX</p>
                        </div>

                        <button onClick={handleCreateDraft} disabled={loading} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-lg hover:opacity-90 transition mt-6 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Taslağı Oluştur ve Devam Et"}
                        </button>
                    </div>
                )}

                {/* STEP 2: ITEMS & TRAITS */}
                {step === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><ImageIcon className="text-pink-500"/> NFT Ekle (Örnek)</h2>
                        <p className="text-sm text-gray-500">Ürettiğin görselin URL'sini ve özelliklerini gir. (Normalde bu adım kullanıcının AI galerisinden çoklu seçim yapmasıyla sağlanır)</p>
                        
                        <div className="bg-gray-50 dark:bg-[#0f1115] p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                            <input type="text" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://app.zexai.io/images/...png" className="w-full bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none dark:text-white mb-4" />
                            
                            <div className="flex gap-2 mb-4">
                                <input type="text" value={traitType} onChange={e=>setTraitType(e.target.value)} placeholder="Trait Type (Örn: Background)" className="flex-1 bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none dark:text-white" />
                                <input type="text" value={traitValue} onChange={e=>setTraitValue(e.target.value)} placeholder="Value (Örn: Red)" className="flex-1 bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-gray-700 p-3 rounded-xl outline-none dark:text-white" />
                                <button onClick={handleAddTrait} className="px-4 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600">Ekle</button>
                            </div>
                            
                            {currentTraits.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {currentTraits.map((t, i) => (
                                        <div key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
                                            <span className="opacity-70">{t.trait_type}:</span> <span className="font-bold">{t.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button onClick={handleAddItem} disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5"/> Koleksiyona Kaydet</>}
                            </button>
                        </div>

                        <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
                            <h3 className="font-bold text-lg dark:text-white mb-4">Eklenenler ({items.length} / {maxSupply})</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {items.map((it, i) => (
                                    <div key={i} className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative group">
                                        <img src={it.image_url} alt="NFT" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium p-2 text-center">
                                            {it.attributes?.length} traits
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end mt-8">
                            <button onClick={()=>setStep(3)} className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold flex items-center gap-2 hover:opacity-90">
                                Devam Et <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: RARITY */}
                {step === 3 && (
                    <div className="space-y-6 animate-fadeIn text-center py-8">
                        <Sparkles className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold dark:text-white">Rarity Algoritması</h2>
                        <p className="text-gray-500 max-w-md mx-auto">
                            ZexAI'nin Rarity Motoru, koleksiyonunuzdaki tüm özellikleri analiz ederek 
                            nadir rastlanan parçalara otomatik olarak yüksek skorlar ve <b>Legendary/Epic</b> gibi tier'ler atar.
                        </p>
                        
                        <div className="bg-gray-50 dark:bg-[#0f1115] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 text-left my-8 max-w-lg mx-auto">
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> <span className="text-gray-300">Legendary</span> <span className="ml-auto text-gray-500">&lt; %1 İhtimal</span></li>
                                <li className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-purple-500"></div> <span className="text-gray-300">Epic</span> <span className="ml-auto text-gray-500">%1 - %5</span></li>
                                <li className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-blue-500"></div> <span className="text-gray-300">Rare</span> <span className="ml-auto text-gray-500">%5 - %20</span></li>
                            </ul>
                        </div>

                        <button onClick={handleCalculateRarity} disabled={loading} className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-orange-500/30 flex items-center justify-center gap-2 mx-auto">
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Nadirliği Hesapla ve Uygula"}
                        </button>
                    </div>
                )}

                {/* STEP 4: PUBLISH */}
                {step === 4 && (
                    <div className="space-y-6 animate-fadeIn">
                        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Upload className="text-green-500"/> Yayınlama (Deploy)</h2>
                        <div className="bg-green-50 dark:bg-green-500/10 p-6 rounded-2xl border border-green-200 dark:border-green-500/20">
                            <h3 className="text-green-800 dark:text-green-400 font-bold text-lg mb-2">Her şey hazır!</h3>
                            <p className="text-green-700 dark:text-green-300/80 mb-6">
                                Rarity skorları atandı ve kontrat şablonunuz oluşturuldu. Yayınla butonuna bastığınızda:
                            </p>
                            <ul className="space-y-3 text-sm text-green-800 dark:text-green-200">
                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> <b>{totalZexCost} ZEX</b> cüzdanınızdan tahsil edilecek.</li>
                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Tamamen size ait bir <b>ERC721A</b> akıllı kontratı Polygon ağına yüklenecek.</li>
                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Tüm görseller + metadata <b>IPFS</b> ağına kalıcı olarak yüklenecek.</li>
                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> İkincil piyasa gelirleri doğrudan sizin cüzdanınıza bağlanacak (%{royaltyBps/100}).</li>
                            </ul>
                        </div>

                        <button onClick={handlePublish} disabled={loading || !account} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-lg hover:opacity-90 transition mt-6 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Shield className="w-6 h-6"/> Onayla ve Blockchain'e Yükle</>}
                        </button>
                        {!account && <p className="text-center text-red-500 mt-2">Lütfen devam etmek için cüzdanınızı bağlayın.</p>}
                    </div>
                )}

                {/* STEP 5: SUCCESS */}
                {step === 5 && (
                    <div className="space-y-6 animate-fadeIn text-center py-12">
                        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-12 h-12 text-green-500" />
                        </div>
                        <h2 className="text-3xl font-bold dark:text-white">Koleksiyon Canlıda!</h2>
                        <p className="text-gray-500 text-lg max-w-md mx-auto mb-8">
                            Akıllı kontratınız ve tüm dosyalarınız başarıyla Polygon ağına yüklendi. Artık NFT'lerinizi satmaya başlayabilirsiniz!
                        </p>
                        
                        <div className="flex flex-col gap-3 max-w-sm mx-auto">
                            <button onClick={()=>navigate('/collections/my')} className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                                Kontrol Paneline Git
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default CollectionBuilderPage;
