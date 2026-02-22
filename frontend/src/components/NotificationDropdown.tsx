import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface Notification {
    id: string;
    title: string;
    message: string;
    category: string;
    type: string;
    action_url?: string;
    is_read: boolean;
    created_at: string;
}

const NotificationDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch notifications on mount and periodically
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000); // Every 60 seconds
        return () => clearInterval(interval);
    }, []);

    const getAuthHeaders = async () => {
        try {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.access_token) {
                return { Authorization: `Bearer ${data.session.access_token}` };
            }
        } catch (e) {
            console.warn('Failed to get session for notifications:', e);
        }
        // Fallback
        const token = localStorage.getItem('auth_token');
        if (token && token !== 'null' && token !== 'undefined') {
            return { Authorization: `Bearer ${token}` };
        }
        return {};
    };

    const fetchUnreadCount = async () => {
        try {
            const headers = await getAuthHeaders();
            if (!headers.Authorization) return; // Skip if not authenticated
            const response = await axios.get(`${API_URL}/notifications/unread-count`, {
                headers
            });
            setUnreadCount(response.data.count);
        } catch (error) {
            // Silently ignore auth errors for notification count
            if (axios.isAxiosError(error) && error.response?.status !== 401) {
                console.error('Failed to fetch unread count:', error);
            }
        }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_URL}/notifications`, {
                params: { limit: 10 },
                headers
            });
            setNotifications(response.data.notifications || []);
            setUnreadCount(response.data.unread_count);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = () => {
        if (!isOpen) {
            fetchNotifications();
        }
        setIsOpen(!isOpen);
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            const headers = await getAuthHeaders();
            await axios.post(
                `${API_URL}/notifications/mark-read`,
                { notification_ids: [notificationId] },
                { headers }
            );
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const headers = await getAuthHeaders();
            await axios.post(
                `${API_URL}/notifications/mark-read`,
                { notification_ids: null },
                { headers }
            );
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDelete = async (notificationId: string) => {
        try {
            const headers = await getAuthHeaders();
            await axios.delete(`${API_URL}/notifications/${notificationId}`, {
                headers
            });
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            handleMarkAsRead(notification.id);
        }
        if (notification.action_url) {
            setIsOpen(false);
            navigate(notification.action_url);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success': return 'text-green-500 bg-green-100 dark:bg-green-900/30';
            case 'warning': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30';
            case 'error': return 'text-red-500 bg-red-100 dark:bg-red-900/30';
            default: return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Şimdi';
        if (minutes < 60) return `${minutes} dk önce`;
        if (hours < 24) return `${hours} saat önce`;
        if (days < 7) return `${days} gün önce`;
        return date.toLocaleDateString('tr-TR');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={handleOpen}
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            Bildirimler
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Tümünü oku
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">
                                Yükleniyor...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">Bildiriminiz yok</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`relative group px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                                        }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex gap-3">
                                        {/* Type indicator */}
                                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${notification.type === 'success' ? 'bg-green-500' :
                                            notification.type === 'warning' ? 'bg-yellow-500' :
                                                notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                            }`} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-medium ${!notification.is_read
                                                    ? 'text-gray-900 dark:text-white'
                                                    : 'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                                    {formatTime(notification.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            {notification.action_url && (
                                                <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                                    <ExternalLink className="w-3 h-3" />
                                                    Görüntüle
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hover actions */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                        {!notification.is_read && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                                                className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                                                title="Okundu işaretle"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                            title="Sil"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <button
                                onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                                className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                Tüm bildirimleri gör
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
