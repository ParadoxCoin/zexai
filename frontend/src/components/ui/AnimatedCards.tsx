import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number | React.ReactNode;
    subtitle?: string;
    icon?: LucideIcon;
    trend?: {
        value: number;
        label?: string;
    };
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    className?: string;
}

// Glassmorphism Stat Card with animations
export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = 'default',
    className = ''
}) => {
    const variantStyles = {
        default: {
            gradient: 'from-gray-500/10 to-gray-600/10',
            icon: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
            border: 'border-gray-200/50 dark:border-gray-700/50'
        },
        success: {
            gradient: 'from-emerald-500/10 to-green-600/10',
            icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-200/50 dark:border-emerald-700/50'
        },
        warning: {
            gradient: 'from-amber-500/10 to-orange-600/10',
            icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
            border: 'border-amber-200/50 dark:border-amber-700/50'
        },
        error: {
            gradient: 'from-red-500/10 to-rose-600/10',
            icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
            border: 'border-red-200/50 dark:border-red-700/50'
        },
        info: {
            gradient: 'from-blue-500/10 to-indigo-600/10',
            icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            border: 'border-blue-200/50 dark:border-blue-700/50'
        }
    };

    const styles = variantStyles[variant];

    const TrendIcon = trend
        ? trend.value > 0
            ? TrendingUp
            : trend.value < 0
                ? TrendingDown
                : Minus
        : null;

    const trendColor = trend
        ? trend.value > 0
            ? 'text-emerald-500'
            : trend.value < 0
                ? 'text-red-500'
                : 'text-gray-500'
        : '';

    return (
        <div
            className={`
        group relative overflow-hidden
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl
        rounded-2xl p-6 
        border ${styles.border}
        shadow-lg shadow-gray-200/20 dark:shadow-black/20
        hover:shadow-xl hover:shadow-gray-300/30 dark:hover:shadow-black/30
        transition-all duration-300 ease-out
        hover:-translate-y-1
        ${className}
      `}
        >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            {/* Content */}
            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    {Icon && (
                        <div className={`p-3 rounded-xl ${styles.icon} transition-transform duration-300 group-hover:scale-110`}>
                            <Icon className="w-6 h-6" />
                        </div>
                    )}
                    {trend && TrendIcon && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                            <TrendIcon className="w-4 h-4" />
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {title}
                </p>

                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1 transition-transform duration-300 group-hover:scale-105 origin-left">
                    {value}
                </p>

                {(subtitle || trend?.label) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {subtitle || trend?.label}
                    </p>
                )}
            </div>

            {/* Decorative Element */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" />
        </div>
    );
};

// Animated Feature Card
interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    onClick?: () => void;
    badge?: string;
    className?: string;
}

import playHapticFeedback from '@/utils/haptics';

export const FeatureCard: React.FC<FeatureCardProps> = ({
    icon: Icon,
    title,
    description,
    onClick,
    badge,
    className = ''
}) => (
    <div
        onClick={() => {
            playHapticFeedback('light');
            onClick?.();
        }}
        className={`
      group relative overflow-hidden
      bg-white dark:bg-gray-800 rounded-2xl p-6
      border border-gray-100 dark:border-gray-700
      shadow-lg hover:shadow-xl
      transition-all duration-300 ease-out
      hover:-translate-y-2
      ${onClick ? 'cursor-pointer' : ''}
      ${className}
    `}
    >
        {/* Animated gradient border */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
            <div className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl" />
        </div>

        <div className="relative z-10">
            {badge && (
                <span className="absolute -top-2 -right-2 px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full">
                    {badge}
                </span>
            )}

            <div className="mb-4 p-3 w-fit rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 group-hover:from-indigo-500/20 group-hover:to-purple-500/20 transition-colors">
                <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {title}
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {description}
            </p>
        </div>

        {/* Hover arrow */}
        {onClick && (
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
            </div>
        )}
    </div>
);

// Glass Panel
interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
    blur?: 'sm' | 'md' | 'lg' | 'xl';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
    children,
    className = '',
    blur = 'lg'
}) => {
    const blurClasses = {
        sm: 'backdrop-blur-sm',
        md: 'backdrop-blur-md',
        lg: 'backdrop-blur-lg',
        xl: 'backdrop-blur-xl'
    };

    return (
        <div
            className={`
        bg-white/70 dark:bg-gray-800/70 
        ${blurClasses[blur]}
        border border-white/20 dark:border-gray-700/50
        rounded-2xl shadow-xl
        ${className}
      `}
        >
            {children}
        </div>
    );
};

// Animated Counter
interface AnimatedCounterProps {
    value: number;
    prefix?: string;
    suffix?: string;
    duration?: number;
    className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    prefix = '',
    suffix = '',
    duration = 1000,
    className = ''
}) => {
    const [displayValue, setDisplayValue] = React.useState(0);

    React.useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(eased * value));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return (
        <span className={className}>
            {prefix}{displayValue.toLocaleString()}{suffix}
        </span>
    );
};

export default StatCard;
