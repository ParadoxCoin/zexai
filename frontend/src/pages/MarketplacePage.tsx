import React, { useState, useEffect } from 'react';
import {
    Search, Filter, Star, Heart, Zap, Clock, TrendingUp,
    Grid, List, ChevronDown, X, RefreshCw, Sparkles
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({
    baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1',
});

api.interceptors.request.use(async (config) => {
    let token = localStorage.getItem('auth_token') ||
        localStorage.getItem('sb-access-token') ||
        sessionStorage.getItem('sb-access-token');

    if (!token) {
        const supabaseKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        if (supabaseKey) {
            try {
                const session = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
                if (session.access_token) {
                    token = session.access_token;
                }
            } catch (e) { }
        }
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

interface MarketplaceModel {
    id: string;
    name: string;
    category: string;
    type: string;
    provider: string | null;
    provider_name: string | null;
    credits: number;
    cost_usd: number;
    quality: number | null;
    speed: string | null;
    badge: string | null;
    description: string | null;
    is_featured: boolean;
    is_active: boolean;
    avg_rating: number | null;
    rating_count: number;
    total_uses: number;
    is_favorite: boolean;
    user_rating: number | null;
}

interface CategoryInfo {
    id: string;
    name: string;
    count: number;
}

const CATEGORY_ICONS: Record<string, string> = {
    'image': '🖼️',
    'video': '🎬',
    'chat': '💬',
    'audio': '🎵',
    'other': '✨'
};

const SORT_OPTIONS = [
    { value: 'popular', label: '🔥 Popüler' },
    { value: 'rating', label: '⭐ En İyi Puan' },
    { value: 'newest', label: '🆕 En Yeni' },
    { value: 'price_low', label: '💰 Ucuzdan Pahalıya' },
    { value: 'price_high', label: '💎 Pahalıdan Ucuza' },
];

const MarketplacePage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [models, setModels] = useState<MarketplaceModel[]>([]);
    const [categories, setCategories] = useState<CategoryInfo[]>([]);
    const [providers, setProviders] = useState<string[]>([]);
    const [total, setTotal] = useState(0);

    // Filters
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState('popular');
    const [featuredOnly, setFeaturedOnly] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [page, setPage] = useState(1);

    // Modal
    const [selectedModel, setSelectedModel] = useState<MarketplaceModel | null>(null);

    useEffect(() => {
        fetchModels();
    }, [selectedCategory, selectedProvider, sortBy, featuredOnly, page]);

    const fetchModels = async () => {
        try {
            setLoading(true);
            const params: any = { page, page_size: 20, sort_by: sortBy };
            if (selectedCategory) params.category = selectedCategory;
            if (selectedProvider) params.provider = selectedProvider;
            if (featuredOnly) params.featured_only = true;
            if (search) params.search = search;

            const response = await api.get('/marketplace/models', { params });
            setModels(response.data.models);
            setCategories(response.data.categories);
            setProviders(response.data.providers);
            setTotal(response.data.total);
        } catch (err) {
            console.error('Failed to fetch models:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const response = await api.get('/marketplace/favorites');
            setModels(response.data);
            setTotal(response.data.length);
        } catch (err) {
            console.error('Failed to fetch favorites:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (showFavorites) {
            fetchFavorites();
        } else {
            fetchModels();
        }
    }, [showFavorites]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchModels();
    };

    const toggleFavorite = async (modelId: string) => {
        try {
            const response = await api.post(`/marketplace/models/${modelId}/favorite`);
            setModels(models.map(m =>
                m.id === modelId ? { ...m, is_favorite: response.data.is_favorite } : m
            ));
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    };

    const rateModel = async (modelId: string, rating: number) => {
        try {
            const response = await api.post(`/marketplace/models/${modelId}/rate`, { rating });
            setModels(models.map(m =>
                m.id === modelId ? {
                    ...m,
                    user_rating: rating,
                    avg_rating: response.data.avg_rating,
                    rating_count: response.data.rating_count
                } : m
            ));
            if (selectedModel?.id === modelId) {
                setSelectedModel({
                    ...selectedModel,
                    user_rating: rating,
                    avg_rating: response.data.avg_rating,
                    rating_count: response.data.rating_count
                });
            }
        } catch (err) {
            console.error('Failed to rate model:', err);
        }
    };

    const renderStars = (rating: number | null, interactive: boolean = false, modelId?: string) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        disabled={!interactive}
                        onClick={() => interactive && modelId && rateModel(modelId, star)}
                        className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
                    >
                        <Star
                            className={`h-4 w-4 ${(rating || 0) >= star
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                                }`}
                        />
                    </button>
                ))}
            </div>
        );
    };

    const ModelCard: React.FC<{ model: MarketplaceModel }> = ({ model }) => (
        <div
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-2 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer ${model.is_featured
                ? 'border-purple-400 ring-2 ring-purple-200'
                : 'border-transparent'
                }`}
            onClick={() => setSelectedModel(model)}
        >
            {/* Header */}
            <div className="relative p-4 bg-gradient-to-r from-purple-600 to-indigo-600">
                {model.is_featured && (
                    <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Öne Çıkan
                    </span>
                )}
                <div className="text-white">
                    <span className="text-2xl">{CATEGORY_ICONS[model.category] || '✨'}</span>
                    <h3 className="text-lg font-bold mt-2 truncate">{model.name}</h3>
                    <p className="text-purple-200 text-sm">{model.provider_name || 'Unknown'}</p>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
                {/* Badge */}
                {model.badge && (
                    <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 text-xs rounded-full">
                        {model.badge}
                    </span>
                )}

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                    {model.description || 'AI model for ' + model.type}
                </p>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                        {renderStars(model.avg_rating)}
                        <span className="text-gray-500 ml-1">({model.rating_count})</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                        <TrendingUp className="h-4 w-4" />
                        <span>{model.total_uses}</span>
                    </div>
                </div>

                {/* Speed & Quality */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    {model.speed && (
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {model.speed === 'fast' ? 'Hızlı' : model.speed === 'medium' ? 'Orta' : 'Yavaş'}
                        </span>
                    )}
                    {model.quality && (
                        <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Kalite: {model.quality}/5
                        </span>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-purple-600">{model.credits}</span>
                    <span className="text-sm text-gray-500">kredi</span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(model.id);
                    }}
                    className={`p-2 rounded-full transition-colors ${model.is_favorite
                        ? 'bg-red-100 text-red-500 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-600'
                        }`}
                >
                    <Heart className={`h-5 w-5 ${model.is_favorite ? 'fill-current' : ''}`} />
                </button>
            </div>
        </div>
    );

    const ModelDetailModal: React.FC = () => {
        if (!selectedModel) return null;

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="relative p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                        <button
                            onClick={() => setSelectedModel(null)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <span className="text-4xl">{CATEGORY_ICONS[selectedModel.category] || '✨'}</span>
                        <h2 className="text-2xl font-bold mt-3">{selectedModel.name}</h2>
                        <p className="text-purple-200">{selectedModel.provider_name}</p>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Description */}
                        <div>
                            <h3 className="font-semibold mb-2 dark:text-white">Açıklama</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {selectedModel.description || `${selectedModel.type} için AI model`}
                            </p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                                <div className="text-3xl font-bold text-purple-600">{selectedModel.credits}</div>
                                <div className="text-sm text-gray-500">Kredi</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                                <div className="text-3xl font-bold text-blue-600">{selectedModel.total_uses}</div>
                                <div className="text-sm text-gray-500">Kullanım</div>
                            </div>
                        </div>

                        {/* Properties */}
                        <div className="space-y-3">
                            <div className="flex justify-between py-2 border-b dark:border-gray-700">
                                <span className="text-gray-500">Kategori</span>
                                <span className="font-medium dark:text-white capitalize">{selectedModel.category}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b dark:border-gray-700">
                                <span className="text-gray-500">Tip</span>
                                <span className="font-medium dark:text-white">{selectedModel.type}</span>
                            </div>
                            {selectedModel.speed && (
                                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                                    <span className="text-gray-500">Hız</span>
                                    <span className="font-medium dark:text-white">
                                        {selectedModel.speed === 'fast' ? '⚡ Hızlı' : selectedModel.speed === 'medium' ? '🔄 Orta' : '🐢 Yavaş'}
                                    </span>
                                </div>
                            )}
                            {selectedModel.quality && (
                                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                                    <span className="text-gray-500">Kalite</span>
                                    <span className="font-medium dark:text-white">{selectedModel.quality}/5 ⭐</span>
                                </div>
                            )}
                        </div>

                        {/* Rating Section */}
                        <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold dark:text-white">Puanla</h4>
                                    <p className="text-sm text-gray-500">Bu modeli değerlendir</p>
                                </div>
                                {renderStars(selectedModel.user_rating, true, selectedModel.id)}
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                                Ortalama: {selectedModel.avg_rating?.toFixed(1) || '0.0'} ({selectedModel.rating_count} oy)
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => toggleFavorite(selectedModel.id)}
                                className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${selectedModel.is_favorite
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white'
                                    }`}
                            >
                                <Heart className={`h-5 w-5 ${selectedModel.is_favorite ? 'fill-current' : ''}`} />
                                {selectedModel.is_favorite ? 'Favorilerde' : 'Favorilere Ekle'}
                            </button>
                            <button
                                onClick={() => {
                                    // Navigate to use the model
                                    window.location.href = `/${selectedModel.category}`;
                                }}
                                className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                            >
                                Kullan →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold mb-2">Model Marketplace</h1>
                    <p className="text-purple-200 text-lg">
                        {total} AI modeli keşfedin, karşılaştırın ve hemen kullanmaya başlayın
                    </p>

                    {/* Search */}
                    <form onSubmit={handleSearch} className="mt-6 max-w-2xl">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Model ara..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 placeholder-gray-500"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-white text-purple-600 rounded-xl font-medium hover:bg-purple-50"
                            >
                                Ara
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Filters */}
                    <div className="lg:w-64 space-y-6">
                        {/* Categories */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                            <h3 className="font-semibold mb-3 dark:text-white flex items-center gap-2">
                                <Filter className="h-4 w-4" /> Kategoriler
                            </h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${!selectedCategory
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    Tümü ({total})
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${selectedCategory === cat.id
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <span>{CATEGORY_ICONS[cat.id] || '✨'} {cat.name}</span>
                                        <span className="text-sm text-gray-500">{cat.count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Filters */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow space-y-2">
                            <h3 className="font-semibold mb-3 dark:text-white">Hızlı Filtreler</h3>
                            <button
                                onClick={() => setShowFavorites(!showFavorites)}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${showFavorites
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                <Heart className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
                                Favorilerim
                            </button>
                            <button
                                onClick={() => setFeaturedOnly(!featuredOnly)}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${featuredOnly
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                <Sparkles className="h-4 w-4" />
                                Öne Çıkanlar
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg dark:text-white"
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => showFavorites ? fetchFavorites() : fetchModels()}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                >
                                    <Grid className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                >
                                    <List className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Model Grid */}
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                            </div>
                        ) : models.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold dark:text-white">Model bulunamadı</h3>
                                <p className="text-gray-500">Farklı filtreler deneyin</p>
                            </div>
                        ) : (
                            <div className={viewMode === 'grid'
                                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                                : 'space-y-4'
                            }>
                                {models.map((model) => (
                                    <ModelCard key={model.id} model={model} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Model Detail Modal */}
            <ModelDetailModal />
        </div>
    );
};

export default MarketplacePage;
