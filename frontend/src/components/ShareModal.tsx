import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
    X, Heart, Share2, Award, Copy, Check, ExternalLink,
    Twitter, Send, Linkedin, MessageCircle, Image as ImageIcon
} from 'lucide-react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentType: 'image' | 'video' | 'audio' | 'avatar' | 'text' | 'referral';
    contentId: string;
    contentUrl?: string;
    contentTitle?: string;
    onLikeChange?: (liked: boolean) => void;
}

interface SharePlatform {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    getUrl?: (title: string, url: string) => string;
}

const sharePlatforms: SharePlatform[] = [
    {
        id: 'twitter',
        name: 'Twitter/X',
        icon: <Twitter className="w-5 h-5" />,
        color: 'bg-black hover:bg-gray-800',
        getUrl: (title, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        icon: <MessageCircle className="w-5 h-5" />,
        color: 'bg-green-500 hover:bg-green-600',
        getUrl: (title, url) => `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`
    },
    {
        id: 'telegram',
        name: 'Telegram',
        icon: <Send className="w-5 h-5" />,
        color: 'bg-blue-500 hover:bg-blue-600',
        getUrl: (title, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        icon: <Linkedin className="w-5 h-5" />,
        color: 'bg-blue-700 hover:bg-blue-800',
        getUrl: (title, url) => `https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    },
    {
        id: 'pinterest',
        name: 'Pinterest',
        icon: <ImageIcon className="w-5 h-5" />,
        color: 'bg-red-600 hover:bg-red-700',
        getUrl: (title, url) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}`
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        icon: <span className="text-lg font-bold">T</span>,
        color: 'bg-gradient-to-r from-pink-500 to-cyan-400 hover:from-pink-600 hover:to-cyan-500'
    },
    {
        id: 'instagram',
        name: 'Instagram',
        icon: <span className="text-lg font-bold">I</span>,
        color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600'
    },
    {
        id: 'youtube',
        name: 'YouTube',
        icon: <span className="text-lg font-bold">▶</span>,
        color: 'bg-red-600 hover:bg-red-700'
    }
];

export const ShareModal = ({
    isOpen,
    onClose,
    contentType,
    contentId,
    contentUrl = window.location.href,
    contentTitle = 'ZexAi ile oluşturdum!',
    onLikeChange
}: ShareModalProps) => {
    const [isLiked, setIsLiked] = useState(false);
    const [inShowcase, setInShowcase] = useState(false);
    const [copied, setCopied] = useState(false);
    const queryClient = useQueryClient();

    // Like mutation
    const likeMutation = useMutation({
        mutationFn: () => apiService.post('/social/like', { content_type: contentType, content_id: contentId }),
        onSuccess: (data: any) => {
            setIsLiked(data.liked);
            onLikeChange?.(data.liked);
        }
    });

    // Showcase mutation
    const showcaseMutation = useMutation({
        mutationFn: () => apiService.post('/social/showcase', { content_type: contentType, content_id: contentId }),
        onSuccess: (data: any) => {
            const showcaseState = Boolean(data?.data?.in_showcase ?? data?.in_showcase);
            setInShowcase(showcaseState);
        }
    });

    // Share mutation
    const shareMutation = useMutation({
        mutationFn: (platform: string) => apiService.post('/social/share', {
            content_type: contentType,
            content_id: contentId,
            platform
        }),
        onSuccess: (response: any) => {
            const data = response?.data || response;
            if (data?.reward_granted) {
                queryClient.invalidateQueries({ queryKey: ["userCredits"] });
                alert("🎉 Harika! X (Twitter) paylaşımınız için hesabınıza 5 AI Kredisi eklendi!");
            }
        }
    });

    const handleShare = (platform: SharePlatform) => {
        // Record share
        shareMutation.mutate(platform.id);

        // Open share URL or copy
        if (platform.getUrl) {
            window.open(platform.getUrl(contentTitle, contentUrl), '_blank', 'width=600,height=400');
        } else {
            // For platforms without direct share, copy URL
            handleCopy();
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(`${contentTitle}\n${contentUrl}`);
            setCopied(true);
            shareMutation.mutate('copy');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Share2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Paylaş</h3>
                            <p className="text-sm text-gray-400">İçeriğini dünyayla paylaş</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Action Buttons */}
                    <div className="flex gap-3 mb-6">
                        {/* Like Button */}
                        <button
                            onClick={() => likeMutation.mutate()}
                            disabled={likeMutation.isPending}
                            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${isLiked
                                ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                                : 'bg-gray-800 border-2 border-gray-700 text-gray-300 hover:border-red-500/50'
                                }`}
                        >
                            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500' : ''}`} />
                            {isLiked ? 'Beğenildi' : 'Beğen'}
                        </button>

                        {/* Showcase Button */}
                        <button
                            onClick={() => showcaseMutation.mutate()}
                            disabled={showcaseMutation.isPending}
                            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${inShowcase
                                ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400'
                                : 'bg-gray-800 border-2 border-gray-700 text-gray-300 hover:border-yellow-500/50'
                                }`}
                        >
                            <Award className={`w-5 h-5 ${inShowcase ? 'fill-yellow-500' : ''}`} />
                            {inShowcase ? 'Showcase\'de' : 'Showcase\'e Ekle'}
                        </button>
                    </div>

                    {/* Share Platforms */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-400">Platformda Paylaş</h4>
                            <span className="text-xs font-bold bg-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-full border border-yellow-500/30 animate-pulse">
                                +5 Kredi Kazan!
                            </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {sharePlatforms.map((platform) => (
                                <button
                                    key={platform.id}
                                    onClick={() => handleShare(platform)}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl text-white transition-all ${platform.color}`}
                                    title={platform.id === 'twitter' ? "Hemen paylaş ve kredisini kap!" : ""}
                                >
                                    {platform.icon}
                                    <span className="text-xs">{platform.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Copy Link */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">veya Linki Kopyala</h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={contentUrl}
                                readOnly
                                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 text-sm"
                            />
                            <button
                                onClick={handleCopy}
                                className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${copied
                                    ? 'bg-green-500 text-white'
                                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                                    }`}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Kopyalandı!' : 'Kopyala'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ShareModal;
