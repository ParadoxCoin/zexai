import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, ExternalLink, RefreshCw, BarChart2 } from 'lucide-react';
import { apiService } from '../services/api';

interface Collection {
    id: string;
    name: string;
    symbol: string;
    description: string;
    max_supply: number;
    mint_price: number;
    royalty_bps: number;
    cover_url: string;
    status: 'draft' | 'publishing' | 'published';
    contract_address: string;
    items_count: number;
    created_at: string;
}

const MyCollectionsPage: React.FC = () => {
    const navigate = useNavigate();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await apiService.get('/collections/my');
            setCollections(res as any);
        } catch (err: any) {
            console.error("Failed to fetch collections", err);
            setError('Koleksiyonlar yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16 pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#2081E2] to-[#E42575]">
                        AI NFT Koleksiyonlarım
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Kendi AI üretimi NFT koleksiyonlarınızı oluşturun ve yönetin.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/collections/create')}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-indigo-500/25"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Koleksiyon Oluştur
                </button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : collections.length === 0 ? (
                <div className="bg-white dark:bg-[#1a1c23] rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Layers className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Henüz Koleksiyonunuz Yok</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                        AI yeteneklerini kullanarak 10K, 5K veya benzersiz sanatsal koleksiyonlar oluşturabilir, 
                        Rarible, OpenSea ve Magic Eden'da yayınlayabilirsiniz.
                    </p>
                    <button
                        onClick={() => navigate('/collections/create')}
                        className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:opacity-90 transition inline-flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Hemen İlk Koleksiyonunu Başlat
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map(col => (
                        <div key={col.id} className="bg-white dark:bg-[#1a1c23] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:border-indigo-500/30 transition-all group">
                            <div className="h-40 bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                                {col.cover_url ? (
                                    <img src={col.cover_url} alt={col.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Layers className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 space-y-2">
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                        col.status === 'published' ? 'bg-green-500 text-white' : 
                                        col.status === 'publishing' ? 'bg-yellow-500 text-white' : 
                                        'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}>
                                        {col.status === 'published' ? 'YAYINLANDI' : col.status === 'publishing' ? 'YAYINLANLANMIYOR...' : 'TASLAK'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{col.name}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                                    {col.description || "Koleksiyon açıklaması yok."}
                                </p>
                                
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Üretilen / Hedef</p>
                                        <p className="font-bold text-gray-900 dark:text-white">
                                            {col.items_count} <span className="text-sm font-normal text-gray-500">/ {col.max_supply}</span>
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Mint Fiyatı & Royalty</p>
                                        <p className="font-bold text-gray-900 dark:text-white">
                                            {col.mint_price} POL <span className="text-sm font-normal text-gray-500">/ %{col.royalty_bps / 100}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {col.status === 'published' ? (
                                        <a
                                            href={`https://opensea.io/assets/polygon/${col.contract_address}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 py-2.5 bg-[#2081E2] hover:bg-[#1868B7] text-white rounded-xl font-medium transition text-center text-sm flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            OpenSea'de Gör
                                        </a>
                                    ) : (
                                        <button
                                            onClick={() => navigate(`/collections/builder/${col.id}`)}
                                            className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-medium transition text-sm flex items-center justify-center gap-2"
                                        >
                                            <BarChart2 className="w-4 h-4" />
                                            İnşaya Devam Et
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyCollectionsPage;
