import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]} ${className}`} />
  );
};

interface SkeletonProps {
  className?: string;
  lines?: number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  lines = 1,
  variant = 'rectangular',
  width,
  height
}) => {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
    rounded: 'rounded-lg'
  };

  const style: React.CSSProperties = {
    width: width || undefined,
    height: height || undefined
  };

  return (
    <div className="animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 dark:bg-gray-700 ${variantClasses[variant]} ${className} ${i > 0 ? 'mt-2' : ''}`}
          style={style}
        />
      ))}
    </div>
  );
};

// Card Skeleton - Dashboard kartları için
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 animate-pulse ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
    <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
    <div className="w-40 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <tr className="border-b dark:border-gray-700 animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: `${50 + Math.random() * 50}%` }} />
      </td>
    ))}
  </tr>
);

// List Item Skeleton
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 animate-pulse">
    <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    <div className="flex-1">
      <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
  </div>
);

// Chart Skeleton - Analytics için
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 250 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 animate-pulse">
    <div className="flex items-center justify-between mb-6">
      <div className="w-36 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="flex gap-2">
        <div className="w-16 h-7 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-16 h-7 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
    <div className="flex items-end gap-3" style={{ height }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-gradient-to-t from-indigo-200/50 to-indigo-100/30 dark:from-indigo-800/50 dark:to-indigo-900/30 rounded-t"
          style={{ height: `${25 + Math.random() * 75}%` }}
        />
      ))}
    </div>
  </div>
);

// Grid Skeleton - Görsel/Video grid için
export const GridSkeleton: React.FC<{ items?: number; columns?: number }> = ({
  items = 6,
  columns = 3
}) => (
  <div
    className="grid gap-4"
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
  >
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 animate-pulse">
        <div className="h-44 bg-gray-200 dark:bg-gray-700" />
        <div className="p-4">
          <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    ))}
  </div>
);

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 animate-pulse">
    <div className="flex flex-col items-center mb-6">
      <div className="w-28 h-28 bg-gray-200 dark:bg-gray-700 rounded-full mb-4" />
      <div className="w-48 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-3 border-b dark:border-gray-700">
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-36 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  </div>
);

// Page Loading - Tam sayfa
export const PageSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between animate-pulse">
      <div>
        <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="w-72 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="w-28 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>

    {/* Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <ChartSkeleton />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export default Skeleton;