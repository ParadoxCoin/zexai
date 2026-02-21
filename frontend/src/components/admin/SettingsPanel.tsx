import React, { useState, useEffect } from 'react';
import {
    Settings, Save, RefreshCw, Globe, CreditCard, Bell, Key, Shield, Database,
    AlertCircle, DollarSign, Users, Clock
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../ui/toast';
import PricingManagementPanel from './PricingManagementPanel';
import RoleManagementPanel from './RoleManagementPanel';
import RateLimitPanel from './RateLimitPanel';
import SchedulerPanel from './SchedulerPanel';
import KeyVaultPanel from './KeyVaultPanel';
import ABTestingPanel from './ABTestingPanel';
import AnalyticsDashboardPanel from './AnalyticsDashboardPanel';
import EmailTemplatesPanel from './EmailTemplatesPanel';
import AdvancedReportsPanel from './AdvancedReportsPanel';
import PackageManagementPanel from './PackageManagementPanel';
import VideoModelsPanel from './VideoModelsPanel';
import ProviderKeysPanel from './ProviderKeysPanel';
import { FlaskConical, BarChart3, Mail, FileBarChart, Package, Video } from 'lucide-react';

const api = axios.create({
    baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
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

type SettingsTab = 'general' | 'credits' | 'notifications' | 'api' | 'security' | 'backup' | 'pricing' | 'packages' | 'roles' | 'ratelimit' | 'scheduler' | 'vault' | 'abtesting' | 'analytics' | 'email' | 'reports' | 'videomodels' | 'providerkeys';

interface GeneralSettings {
    site_name: string;
    site_description: string;
    maintenance_mode: boolean;
    registration_enabled: boolean;
    default_language: string;
}

interface CreditSettings {
    default_credits: number;
    credit_price_usd: number;
    min_purchase: number;
    max_purchase: number;
    free_tier_enabled: boolean;
    free_tier_credits: number;
}

interface NotificationSettings {
    email_notifications: boolean;
    low_credit_warning: boolean;
    low_credit_threshold: number;
    weekly_report: boolean;
    system_alerts: boolean;
}

interface APISettings {
    rate_limit_enabled: boolean;
    rate_limit_per_minute: number;
    api_key_expiry_days: number;
    webhook_enabled: boolean;
    webhook_url: string;
}

interface SecuritySettings {
    two_factor_required: boolean;
    session_timeout_hours: number;
    max_login_attempts: number;
    ip_whitelist_enabled: boolean;
    ip_whitelist: string;
}

export const SettingsPanel: React.FC = () => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Settings state
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
        site_name: 'ZexAi',
        site_description: 'Professional AI content generation platform',
        maintenance_mode: false,
        registration_enabled: true,
        default_language: 'tr'
    });

    const [creditSettings, setCreditSettings] = useState<CreditSettings>({
        default_credits: 100,
        credit_price_usd: 0.01,
        min_purchase: 10,
        max_purchase: 10000,
        free_tier_enabled: true,
        free_tier_credits: 50
    });

    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        email_notifications: true,
        low_credit_warning: true,
        low_credit_threshold: 10,
        weekly_report: false,
        system_alerts: true
    });

    const [apiSettings, setAPISettings] = useState<APISettings>({
        rate_limit_enabled: true,
        rate_limit_per_minute: 60,
        api_key_expiry_days: 365,
        webhook_enabled: false,
        webhook_url: ''
    });

    const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
        two_factor_required: false,
        session_timeout_hours: 24,
        max_login_attempts: 5,
        ip_whitelist_enabled: false,
        ip_whitelist: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/settings');
            if (response.data) {
                if (response.data.general) setGeneralSettings(response.data.general);
                if (response.data.credits) setCreditSettings(response.data.credits);
                if (response.data.notifications) setNotificationSettings(response.data.notifications);
                if (response.data.api) setAPISettings(response.data.api);
                if (response.data.security) setSecuritySettings(response.data.security);
            }
        } catch (error) {
            console.log('Using default settings (API not available yet)');
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            await api.put('/admin/settings', {
                general: generalSettings,
                credits: creditSettings,
                notifications: notificationSettings,
                api: apiSettings,
                security: securitySettings
            });
            toast.success('Başarılı', 'Ayarlar kaydedildi');
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Ayarlar kaydedilemedi');
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'Genel', icon: Globe },
        { id: 'credits', label: 'Kredi & Fiyat', icon: CreditCard },
        { id: 'notifications', label: 'Bildirimler', icon: Bell },
        { id: 'api', label: 'API', icon: Key },
        { id: 'security', label: 'Güvenlik', icon: Shield },
        { id: 'backup', label: 'Yedekleme', icon: Database },
        { id: 'pricing', label: 'Fiyatlandırma', icon: DollarSign },
        { id: 'packages', label: 'Efekt Paketleri', icon: Package },
        { id: 'roles', label: 'Roller', icon: Users },
        { id: 'ratelimit', label: 'Rate Limit', icon: Shield },
        { id: 'scheduler', label: 'Zamanlayıcı', icon: Clock },
        { id: 'vault', label: 'Key Vault', icon: Key },
        { id: 'videomodels', label: 'Video Modelleri', icon: Video },
        { id: 'providerkeys', label: 'API Keys', icon: Key },
        { id: 'abtesting', label: 'A/B Testing', icon: FlaskConical },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'email', label: 'Email', icon: Mail },
        { id: 'reports', label: 'Raporlar', icon: FileBarChart },
    ];

    const renderToggle = (value: boolean, onChange: (v: boolean) => void, label: string) => (
        <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            <button
                onClick={() => onChange(!value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-green-500' : 'bg-gray-300'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );

    const renderInput = (value: string | number, onChange: (v: string) => void, label: string, type: string = 'text', placeholder?: string) => (
        <div className="py-3 border-b dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                <div className="flex items-center">
                    <Settings className="h-6 w-6 text-purple-600 mr-3" />
                    <h2 className="text-xl font-semibold dark:text-white">Sistem Ayarları</h2>
                </div>
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Kaydet
                </button>
            </div>

            <div className="flex">
                {/* Sidebar Tabs */}
                <div className="w-48 border-r dark:border-gray-700 p-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as SettingsTab)}
                            className={`w-full flex items-center px-3 py-2 rounded-lg mb-1 text-left text-sm transition-colors ${activeTab === tab.id
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                                }`}
                        >
                            <tab.icon className="h-4 w-4 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-6">
                    {/* General Settings */}
                    {activeTab === 'general' && (
                        <div className="space-y-1">
                            <h3 className="text-lg font-medium mb-4 dark:text-white">Genel Ayarlar</h3>
                            {renderInput(generalSettings.site_name, (v) => setGeneralSettings({ ...generalSettings, site_name: v }), 'Site Adı')}
                            {renderInput(generalSettings.site_description, (v) => setGeneralSettings({ ...generalSettings, site_description: v }), 'Site Açıklaması')}
                            <div className="py-3 border-b dark:border-gray-700">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Varsayılan Dil</label>
                                <select
                                    value={generalSettings.default_language}
                                    onChange={(e) => setGeneralSettings({ ...generalSettings, default_language: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="tr">Türkçe</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                            {renderToggle(generalSettings.maintenance_mode, (v) => setGeneralSettings({ ...generalSettings, maintenance_mode: v }), 'Bakım Modu')}
                            {renderToggle(generalSettings.registration_enabled, (v) => setGeneralSettings({ ...generalSettings, registration_enabled: v }), 'Yeni Kayıt Açık')}

                            {generalSettings.maintenance_mode && (
                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                                    <p className="text-sm text-yellow-700">
                                        Bakım modu aktif! Kullanıcılar sisteme erişemeyecek.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Credit Settings */}
                    {activeTab === 'credits' && (
                        <div className="space-y-1">
                            <h3 className="text-lg font-medium mb-4 dark:text-white">Kredi & Fiyatlandırma</h3>
                            {renderInput(creditSettings.default_credits, (v) => setCreditSettings({ ...creditSettings, default_credits: parseInt(v) || 0 }), 'Yeni Kullanıcı Kredisi', 'number')}
                            {renderInput(creditSettings.credit_price_usd, (v) => setCreditSettings({ ...creditSettings, credit_price_usd: parseFloat(v) || 0 }), 'Kredi Fiyatı (USD)', 'number')}
                            {renderInput(creditSettings.min_purchase, (v) => setCreditSettings({ ...creditSettings, min_purchase: parseInt(v) || 0 }), 'Minimum Satın Alma', 'number')}
                            {renderInput(creditSettings.max_purchase, (v) => setCreditSettings({ ...creditSettings, max_purchase: parseInt(v) || 0 }), 'Maksimum Satın Alma', 'number')}
                            {renderToggle(creditSettings.free_tier_enabled, (v) => setCreditSettings({ ...creditSettings, free_tier_enabled: v }), 'Ücretsiz Katman Aktif')}
                            {creditSettings.free_tier_enabled &&
                                renderInput(creditSettings.free_tier_credits, (v) => setCreditSettings({ ...creditSettings, free_tier_credits: parseInt(v) || 0 }), 'Ücretsiz Kredi Miktarı', 'number')
                            }
                        </div>
                    )}

                    {/* Notification Settings */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-1">
                            <h3 className="text-lg font-medium mb-4 dark:text-white">Bildirim Ayarları</h3>
                            {renderToggle(notificationSettings.email_notifications, (v) => setNotificationSettings({ ...notificationSettings, email_notifications: v }), 'E-posta Bildirimleri')}
                            {renderToggle(notificationSettings.low_credit_warning, (v) => setNotificationSettings({ ...notificationSettings, low_credit_warning: v }), 'Düşük Kredi Uyarısı')}
                            {notificationSettings.low_credit_warning &&
                                renderInput(notificationSettings.low_credit_threshold, (v) => setNotificationSettings({ ...notificationSettings, low_credit_threshold: parseInt(v) || 0 }), 'Uyarı Eşiği (Kredi)', 'number')
                            }
                            {renderToggle(notificationSettings.weekly_report, (v) => setNotificationSettings({ ...notificationSettings, weekly_report: v }), 'Haftalık Rapor')}
                            {renderToggle(notificationSettings.system_alerts, (v) => setNotificationSettings({ ...notificationSettings, system_alerts: v }), 'Sistem Uyarıları')}
                        </div>
                    )}

                    {/* API Settings */}
                    {activeTab === 'api' && (
                        <div className="space-y-1">
                            <h3 className="text-lg font-medium mb-4 dark:text-white">API Ayarları</h3>
                            {renderToggle(apiSettings.rate_limit_enabled, (v) => setAPISettings({ ...apiSettings, rate_limit_enabled: v }), 'Rate Limiting Aktif')}
                            {apiSettings.rate_limit_enabled &&
                                renderInput(apiSettings.rate_limit_per_minute, (v) => setAPISettings({ ...apiSettings, rate_limit_per_minute: parseInt(v) || 0 }), 'İstek/Dakika', 'number')
                            }
                            {renderInput(apiSettings.api_key_expiry_days, (v) => setAPISettings({ ...apiSettings, api_key_expiry_days: parseInt(v) || 0 }), 'API Key Geçerlilik (Gün)', 'number')}
                            {renderToggle(apiSettings.webhook_enabled, (v) => setAPISettings({ ...apiSettings, webhook_enabled: v }), 'Webhook Aktif')}
                            {apiSettings.webhook_enabled &&
                                renderInput(apiSettings.webhook_url, (v) => setAPISettings({ ...apiSettings, webhook_url: v }), 'Webhook URL', 'url', 'https://...')
                            }
                        </div>
                    )}

                    {/* Security Settings */}
                    {activeTab === 'security' && (
                        <div className="space-y-1">
                            <h3 className="text-lg font-medium mb-4 dark:text-white">Güvenlik Ayarları</h3>
                            {renderToggle(securitySettings.two_factor_required, (v) => setSecuritySettings({ ...securitySettings, two_factor_required: v }), '2FA Zorunlu')}
                            {renderInput(securitySettings.session_timeout_hours, (v) => setSecuritySettings({ ...securitySettings, session_timeout_hours: parseInt(v) || 0 }), 'Oturum Zaman Aşımı (Saat)', 'number')}
                            {renderInput(securitySettings.max_login_attempts, (v) => setSecuritySettings({ ...securitySettings, max_login_attempts: parseInt(v) || 0 }), 'Maks. Giriş Denemesi', 'number')}
                            {renderToggle(securitySettings.ip_whitelist_enabled, (v) => setSecuritySettings({ ...securitySettings, ip_whitelist_enabled: v }), 'IP Whitelist Aktif')}
                            {securitySettings.ip_whitelist_enabled && (
                                <div className="py-3">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IP Adresleri (Her satıra bir IP)</label>
                                    <textarea
                                        value={securitySettings.ip_whitelist}
                                        onChange={(e) => setSecuritySettings({ ...securitySettings, ip_whitelist: e.target.value })}
                                        rows={4}
                                        placeholder="192.168.1.1&#10;10.0.0.1"
                                        className="w-full px-3 py-2 border rounded-lg font-mono text-sm dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Backup Settings */}
                    {activeTab === 'backup' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium mb-4 dark:text-white">Yedekleme & Geri Yükleme</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border rounded-lg dark:border-gray-700">
                                    <h4 className="font-medium mb-2 dark:text-white">Ayarları Dışa Aktar</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        Tüm sistem ayarlarını JSON olarak indir
                                    </p>
                                    <button
                                        onClick={() => {
                                            const settings = {
                                                general: generalSettings,
                                                credits: creditSettings,
                                                notifications: notificationSettings,
                                                api: apiSettings,
                                                security: securitySettings,
                                                exported_at: new Date().toISOString()
                                            };
                                            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
                                            a.click();
                                            toast.success('Başarılı', 'Ayarlar indirildi');
                                        }}
                                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        <Database className="h-4 w-4 mr-2" />
                                        Dışa Aktar
                                    </button>
                                </div>

                                <div className="p-4 border rounded-lg dark:border-gray-700">
                                    <h4 className="font-medium mb-2 dark:text-white">Ayarları İçe Aktar</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        Daha önce dışa aktarılan ayarları yükle
                                    </p>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    try {
                                                        const settings = JSON.parse(event.target?.result as string);
                                                        if (settings.general) setGeneralSettings(settings.general);
                                                        if (settings.credits) setCreditSettings(settings.credits);
                                                        if (settings.notifications) setNotificationSettings(settings.notifications);
                                                        if (settings.api) setAPISettings(settings.api);
                                                        if (settings.security) setSecuritySettings(settings.security);
                                                        toast.success('Başarılı', 'Ayarlar yüklendi. Kaydetmeyi unutmayın!');
                                                    } catch {
                                                        toast.error('Hata', 'Geçersiz dosya formatı');
                                                    }
                                                };
                                                reader.readAsText(file);
                                            }
                                        }}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <h4 className="font-medium mb-2 dark:text-white">Son Yedeklemeler</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Otomatik yedekleme henüz yapılandırılmamış.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Pricing Management Tab */}
                    {activeTab === 'pricing' && (
                        <div>
                            <PricingManagementPanel />
                        </div>
                    )}

                    {/* Package Management Tab */}
                    {activeTab === 'packages' && (
                        <div>
                            <PackageManagementPanel />
                        </div>
                    )}

                    {/* Role Management Tab */}
                    {activeTab === 'roles' && (
                        <div>
                            <RoleManagementPanel />
                        </div>
                    )}

                    {/* Rate Limit Tab */}
                    {activeTab === 'ratelimit' && (
                        <div>
                            <RateLimitPanel />
                        </div>
                    )}

                    {/* Scheduler Tab */}
                    {activeTab === 'scheduler' && (
                        <div>
                            <SchedulerPanel />
                        </div>
                    )}

                    {/* Key Vault Tab */}
                    {activeTab === 'vault' && (
                        <div>
                            <KeyVaultPanel />
                        </div>
                    )}

                    {/* A/B Testing Tab */}
                    {activeTab === 'abtesting' && (
                        <div>
                            <ABTestingPanel />
                        </div>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === 'analytics' && (
                        <div>
                            <AnalyticsDashboardPanel />
                        </div>
                    )}

                    {/* Email Tab */}
                    {activeTab === 'email' && (
                        <div>
                            <EmailTemplatesPanel />
                        </div>
                    )}

                    {/* Reports Tab */}
                    {activeTab === 'reports' && (
                        <div>
                            <AdvancedReportsPanel />
                        </div>
                    )}

                    {/* Video Models Tab */}
                    {activeTab === 'videomodels' && (
                        <div>
                            <VideoModelsPanel />
                        </div>
                    )}

                    {/* Provider Keys Tab */}
                    {activeTab === 'providerkeys' && (
                        <div>
                            <ProviderKeysPanel />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
