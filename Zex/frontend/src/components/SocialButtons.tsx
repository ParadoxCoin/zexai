import { useState, useEffect } from 'react';
import { Award, Share2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import ShareModal from './ShareModal';
import playHapticFeedback from '@/utils/haptics';
import { useToast } from '@/components/ui/toast';

interface SocialButtonsProps {
    contentType: 'image' | 'video' | 'audio' | 'avatar';
    contentId: string;
    contentUrl?: string;
    contentTitle?: string;
    size?: 'sm' | 'md';
    className?: string;
}

export const SocialButtons = ({
    contentType,
    contentId,
    contentUrl,
    contentTitle = 'AI ile oluşturdum!',
    size = 'md',
    className = ''
}: SocialButtonsProps) => {
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [inShowcase, setInShowcase] = useState(false);
    const toast = useToast();

    // Get stats
    const { data: stats } = useQuery({
        queryKey: ['social-stats', contentType, contentId],
        queryFn: () => apiService.get<any>(`/social/stats?content_type=${contentType}&content_id=${contentId}`),
        staleTime: 30000
    });

    // Update from stats on load
    useEffect(() => {
        if (stats) {
            const statsData = stats as any;
            setInShowcase(statsData.in_showcase);
        }
    }, [stats]);

    // Showcase mutation
    const showcaseMutation = useMutation({
        mutationFn: () => apiService.post('/social/showcase', { content_type: contentType, content_id: contentId, file_url: contentUrl }),
        onSuccess: (data: any) => {
            const showcaseState = Boolean(data?.data?.in_showcase ?? data?.in_showcase);
            setInShowcase(showcaseState);
            if (showcaseState) {
                toast.success('Vitrin', 'Zex Vitrinine Eklendi 🏆');
            } else {
                toast.info('Vitrin', 'Vitrinden Kaldırıldı');
            }
        },
        onError: (err: any) => {
            toast.error('Hata', err?.response?.data?.detail || err?.message || 'Vitrine eklenirken bir hata oluştu.');
        }
    });

    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    const btnClass = size === 'sm' ? 'p-1.5' : 'p-2';

    return (
        <>
            <div className={`flex items-center gap-1 ${className}`}>
                {/* Showcase Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); playHapticFeedback('medium'); showcaseMutation.mutate(); }}
                    disabled={showcaseMutation.isPending}
                    className={`${btnClass} rounded-lg transition-all ${inShowcase
                        ? 'text-yellow-500 bg-yellow-500/20'
                        : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'
                        }`}
                    title="Vitrine Ekle"
                >
                    <Award className={`${iconSize} ${inShowcase ? 'fill-yellow-500' : ''}`} />
                </button>

                {/* Share Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); playHapticFeedback('light'); setIsShareOpen(true); }}
                    className={`${btnClass} rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all`}
                    title="Paylaş"
                >
                    <Share2 className={iconSize} />
                </button>
            </div>

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                contentType={contentType}
                contentId={contentId}
                contentUrl={contentUrl}
                contentTitle={contentTitle}
            />
        </>
    );
};

export default SocialButtons;
