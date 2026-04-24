import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { Award, Image, Video, Music, User, Heart, Share2, Filter, Loader2, Wand2 } from 'lucide-react';
import SocialButtons from '@/components/SocialButtons';
import { useTranslation } from 'react-i18next';

const contentTypes = [
    { id: 'all', name: 'showcase.all', icon: Award },
    { id: 'image', name: 'showcase.images', icon: Image },
    { id: 'video', name: 'showcase.videos', icon: Video },
    { id: 'audio', name: 'showcase.audioTab', icon: Music },
    { id: 'avatar', name: 'showcase.avatars', icon: User }
];

export const ShowcasePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');

    const { data, isLoading } = useQuery({
        queryKey: ['showcase', filter],
        queryFn: () => apiService.get(`/social/showcase${filter !== 'all' ? `?content_type=${filter}` : ''}`),
        staleTime: 30000
    });

    const items = data?.items || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full mb-4">
                        <Award className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-300 text-sm font-medium">{t('showcase.badge')}</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Showcase</span>
                    </h1>
                    <p className="text-gray-400 max-w-xl mx-auto">
                        {t('showcase.subtitle')}
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {contentTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setFilter(type.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${filter === type.id
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            <type.icon className="w-4 h-4" />
                            {t(type.name)}
                        </button>
                    ))}
                </div>

                {/* Content Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden animate-pulse">
                                <div className="aspect-square bg-gradient-to-br from-gray-700/50 to-gray-800/50 relative overflow-hidden">
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-gray-700/50 rounded-full w-3/4" />
                                    <div className="h-3 bg-gray-700/30 rounded-full w-1/2" />
                                    <div className="flex gap-2 pt-2">
                                        <div className="h-6 w-12 bg-gray-700/30 rounded-full" />
                                        <div className="h-6 w-12 bg-gray-700/30 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <style>{`
                            @keyframes shimmer {
                                100% { transform: translateX(200%); }
                            }
                        `}</style>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16">
                        <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">{t('showcase.noContentYet')}</h3>
                        <p className="text-gray-400">{t('showcase.beFirst')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {items.map((item: any) => (
                            <div
                                key={item.id}
                                className="group bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden hover:border-yellow-500/50 transition-all hover:shadow-lg hover:shadow-yellow-500/10"
                            >
                                {/* Content Preview - Now shows actual media */}
                                <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 relative overflow-hidden">
                                    {(item.service_type === 'image' || item.content_type === 'image') && (
                                        item.file_url || item.thumbnail_url ? (
                                            <img
                                                src={item.file_url || item.thumbnail_url}
                                                alt={item.prompt || 'AI Generated'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Image className="w-12 h-12 text-purple-400" />
                                            </div>
                                        )
                                    )}
                                    {(item.service_type === 'video' || item.content_type === 'video') && (
                                        item.file_url ? (
                                            <video
                                                src={item.file_url}
                                                className="w-full h-full object-cover"
                                                controls
                                                muted
                                            />
                                        ) : item.thumbnail_url ? (
                                            <img
                                                src={item.thumbnail_url}
                                                alt={item.prompt || 'AI Generated Video'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Video className="w-12 h-12 text-blue-400" />
                                            </div>
                                        )
                                    )}
                                    {(item.service_type === 'audio' || item.content_type === 'audio') && (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                            <Music className="w-12 h-12 text-pink-400 mb-2" />
                                            {item.file_url && (
                                                <audio src={item.file_url} controls className="w-full" />
                                            )}
                                        </div>
                                    )}
                                    {(item.service_type === 'avatar' || item.content_type === 'avatar') && (
                                        item.file_url || item.thumbnail_url ? (
                                            <img
                                                src={item.file_url || item.thumbnail_url}
                                                alt="AI Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User className="w-12 h-12 text-green-400" />
                                            </div>
                                        )
                                    )}

                                    {/* Hover Overlay for Remix */}
                                    <div className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 backdrop-blur-sm z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const service = item.service_type || item.content_type;
                                                const route = service === 'image' ? '/images' : service === 'video' ? '/videos' : service === 'audio' ? '/audio' : '/dashboard';
                                                navigate(route, { state: { remixPrompt: item.prompt } });
                                            }}
                                            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                        >
                                            <Wand2 className="w-4 h-4" />
                                            {t('showcase.copyAndGenerate')}
                                        </button>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                                        {item.prompt || 'AI Generated Content'}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="px-2 py-1 bg-gray-700 rounded-lg text-xs text-gray-300 capitalize">
                                            {item.service_type || item.content_type || 'content'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {item.created_at && new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShowcasePage;
