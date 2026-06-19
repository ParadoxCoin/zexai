import React from 'react';
import {
    Inbox, Search, FileX, Image, Video, Music, MessageCircle,
    ShoppingBag, Bell, Star, Users, Folder, AlertCircle, Zap,
    LucideIcon
} from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary';
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon = Inbox,
    title,
    description,
    action,
    secondaryAction,
    size = 'md',
    className = ''
}) => {
    const sizeClasses = {
        sm: {
            container: 'py-8 px-4',
            icon: 'w-12 h-12',
            title: 'text-lg',
            description: 'text-sm',
            button: 'px-4 py-2 text-sm'
        },
        md: {
            container: 'py-12 px-6',
            icon: 'w-16 h-16',
            title: 'text-xl',
            description: 'text-base',
            button: 'px-5 py-2.5 text-sm'
        },
        lg: {
            container: 'py-16 px-8',
            icon: 'w-20 h-20',
            title: 'text-2xl',
            description: 'text-lg',
            button: 'px-6 py-3 text-base'
        }
    };

    const sizes = sizeClasses[size];

    return (
        <div className={`flex flex-col items-center justify-center text-center ${sizes.container} ${className}`}>
            {/* Animated Icon Container */}
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-full p-4 shadow-inner">
                    <Icon
                        className={`${sizes.icon} text-gray-400 dark:text-gray-500`}
                        strokeWidth={1.5}
                    />
                </div>
            </div>

            {/* Title */}
            <h3 className={`font-semibold text-gray-900 dark:text-white mb-2 ${sizes.title}`}>
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className={`text-gray-500 dark:text-gray-400 max-w-md mb-6 ${sizes.description}`}>
                    {description}
                </p>
            )}

            {/* Actions */}
            {(action || secondaryAction) && (
                <div className="flex items-center gap-3">
                    {action && (
                        <button
                            onClick={action.onClick}
                            className={`
                ${sizes.button}
                ${action.variant === 'secondary'
                                    ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25'
                                }
                rounded-lg font-medium transition-all duration-200 transform hover:scale-105
              `}
                        >
                            {action.label}
                        </button>
                    )}
                    {secondaryAction && (
                        <button
                            onClick={secondaryAction.onClick}
                            className={`${sizes.button} text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors`}
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Preset Empty States
export const NoSearchResults: React.FC<{ searchTerm?: string; onClear?: () => void }> = ({
    searchTerm = '',
    onClear
}) => (
    <EmptyState
        icon={Search}
        title="Sonuç bulunamadı"
        description={searchTerm
            ? `"${searchTerm}" için sonuç bulunamadı. Farklı bir arama yapmayı deneyin.`
            : "Arama kriterlerinize uygun sonuç bulunamadı."
        }
        action={onClear ? { label: "Aramayı Temizle", onClick: onClear, variant: 'secondary' } : undefined}
    />
);

export const NoImages: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => (
    <EmptyState
        icon={Image}
        title="Henüz görsel yok"
        description="İlk görselinizi oluşturmak için aşağıdaki butona tıklayın."
        action={onCreate ? { label: "Görsel Oluştur", onClick: onCreate } : undefined}
    />
);

export const NoVideos: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => (
    <EmptyState
        icon={Video}
        title="Henüz video yok"
        description="AI ile video oluşturmak için başlayın."
        action={onCreate ? { label: "Video Oluştur", onClick: onCreate } : undefined}
    />
);

export const NoAudio: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => (
    <EmptyState
        icon={Music}
        title="Henüz ses dosyası yok"
        description="AI ile ses ve müzik oluşturun."
        action={onCreate ? { label: "Ses Oluştur", onClick: onCreate } : undefined}
    />
);

export const NoChats: React.FC<{ onStart?: () => void }> = ({ onStart }) => (
    <EmptyState
        icon={MessageCircle}
        title="Henüz sohbet yok"
        description="AI asistanıyla sohbete başlayın."
        action={onStart ? { label: "Sohbet Başlat", onClick: onStart } : undefined}
    />
);

export const NoNotifications: React.FC = () => (
    <EmptyState
        icon={Bell}
        title="Bildirim yok"
        description="Tüm bildirimleriniz burada görünecek."
        size="sm"
    />
);

export const NoFavorites: React.FC<{ onExplore?: () => void }> = ({ onExplore }) => (
    <EmptyState
        icon={Star}
        title="Favorileriniz boş"
        description="Beğendiğiniz içerikleri favorilere ekleyin."
        action={onExplore ? { label: "Keşfet", onClick: onExplore } : undefined}
    />
);

export const NoData: React.FC<{ title?: string; description?: string }> = ({
    title = "Veri bulunamadı",
    description = "Bu dönem için veri bulunmuyor."
}) => (
    <EmptyState
        icon={FileX}
        title={title}
        description={description}
        size="sm"
    />
);

export const ComingSoon: React.FC<{ feature?: string }> = ({ feature }) => (
    <EmptyState
        icon={Zap}
        title="Yakında!"
        description={feature
            ? `${feature} özelliği çok yakında kullanıma sunulacak.`
            : "Bu özellik çok yakında kullanıma sunulacak."
        }
    />
);

export const ErrorState: React.FC<{
    title?: string;
    description?: string;
    onRetry?: () => void
}> = ({
    title = "Bir hata oluştu",
    description = "Lütfen daha sonra tekrar deneyin.",
    onRetry
}) => (
        <EmptyState
            icon={AlertCircle}
            title={title}
            description={description}
            action={onRetry ? { label: "Tekrar Dene", onClick: onRetry } : undefined}
        />
    );

export default EmptyState;
