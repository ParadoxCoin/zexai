import React, { useState, useEffect } from 'react';
import {
    Mail, Save, RefreshCw, Send, Eye, Code, FileText, Check, X, Settings,
    Image, Palette, Link, Upload
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

interface EmailTemplate {
    id?: string;
    type: string;
    subject: string;
    body_html: string;
    body_text: string;
    variables: string[];
    is_active: boolean;
}

interface EmailConfig {
    provider: string;
    configured: boolean;
    from_email: string;
    app_name: string;
}

interface BrandingSetting {
    setting_key: string;
    setting_value: string | null;
    setting_type: string;
    description: string | null;
}

const TEMPLATE_LABELS: Record<string, string> = {
    'welcome': '🎉 Hoş Geldin',
    'password_reset': '🔐 Şifre Sıfırlama',
    'payment_success': '✅ Ödeme Başarılı',
    'credits_low': '⚠️ Kredi Düşük'
};

const SETTING_LABELS: Record<string, string> = {
    'logo_url': '🖼️ Logo URL',
    'banner_url': '🎨 Banner URL',
    'primary_color': '🎨 Ana Renk',
    'secondary_color': '🎨 İkincil Renk',
    'background_color': '🎨 Arka Plan',
    'footer_text': '📝 Footer Yazısı',
    'social_facebook': '📘 Facebook',
    'social_twitter': '🐦 Twitter/X',
    'social_instagram': '📷 Instagram',
    'social_linkedin': '💼 LinkedIn',
    'company_address': '📍 Şirket Adresi'
};

const EmailTemplatesPanel: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'templates' | 'branding'>('templates');
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [config, setConfig] = useState<EmailConfig | null>(null);
    const [branding, setBranding] = useState<BrandingSetting[]>([]);
    const [editMode, setEditMode] = useState<'html' | 'text'>('html');
    const [testEmail, setTestEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [templatesRes, configRes, brandingRes] = await Promise.all([
                api.get('/admin/email/templates'),
                api.get('/admin/email/config'),
                api.get('/admin/email/branding').catch(() => ({ data: [] }))
            ]);
            setTemplates(templatesRes.data);
            setConfig(configRes.data);
            setBranding(brandingRes.data || []);
            if (templatesRes.data.length > 0 && !selectedTemplate) {
                setSelectedTemplate(templatesRes.data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch email data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedTemplate) return;

        try {
            setSaving(true);
            await api.put(`/admin/email/templates/${selectedTemplate.type}`, {
                subject: selectedTemplate.subject,
                body_html: selectedTemplate.body_html,
                body_text: selectedTemplate.body_text
            });
            setMessage({ type: 'success', text: 'Şablon kaydedildi!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Kaydetme başarısız!' });
        } finally {
            setSaving(false);
        }
    };

    const handleBrandingSave = async (key: string, value: string) => {
        try {
            await api.put('/admin/email/branding', {
                setting_key: key,
                setting_value: value
            });
            setBranding(prev => prev.map(s =>
                s.setting_key === key ? { ...s, setting_value: value } : s
            ));
            setMessage({ type: 'success', text: 'Ayar kaydedildi!' });
            setTimeout(() => setMessage(null), 2000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Kaydetme başarısız!' });
        }
    };

    const handleSendTest = async () => {
        if (!selectedTemplate || !testEmail) return;

        try {
            setSending(true);
            const response = await api.post('/admin/email/test', {
                template_type: selectedTemplate.type,
                to_email: testEmail
            });

            if (response.data.success) {
                setMessage({ type: 'success', text: 'Test email gönderildi!' });
            } else {
                setMessage({ type: 'error', text: response.data.message });
            }
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Email gönderilemedi!' });
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <Mail className="h-6 w-6 text-purple-600 mr-3" />
                    <h2 className="text-xl font-semibold dark:text-white">Email Şablonları</h2>
                </div>
                <div className="flex items-center space-x-2">
                    {config && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.configured
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                            {config.configured ? '✓ Resend Aktif' : '✗ Resend Yapılandırılmamış'}
                        </span>
                    )}
                    <button
                        onClick={fetchData}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'templates'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Şablonlar
                </button>
                <button
                    onClick={() => setActiveTab('branding')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'branding'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Palette className="h-4 w-4 inline mr-2" />
                    Görsel Ayarlar
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center ${message.type === 'success'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                    {message.type === 'success' ? <Check className="h-5 w-5 mr-2" /> : <X className="h-5 w-5 mr-2" />}
                    {message.text}
                </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Template List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                            <h3 className="font-semibold mb-4 dark:text-white">Şablonlar</h3>
                            <div className="space-y-2">
                                {templates.map((template) => (
                                    <button
                                        key={template.type}
                                        onClick={() => setSelectedTemplate(template)}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${selectedTemplate?.type === template.type
                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <div className="font-medium">
                                            {TEMPLATE_LABELS[template.type] || template.type}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {template.subject}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="lg:col-span-3">
                        {selectedTemplate ? (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
                                {/* Editor Header */}
                                <div className="border-b dark:border-gray-700 p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold dark:text-white">
                                            {TEMPLATE_LABELS[selectedTemplate.type] || selectedTemplate.type}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Değişkenler: {selectedTemplate.variables.map(v => `{{${v}}}`).join(', ')}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setEditMode('html')}
                                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center ${editMode === 'html'
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <Code className="h-4 w-4 mr-1" />
                                            HTML
                                        </button>
                                        <button
                                            onClick={() => setEditMode('text')}
                                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center ${editMode === 'text'
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <FileText className="h-4 w-4 mr-1" />
                                            Text
                                        </button>
                                    </div>
                                </div>

                                {/* Subject */}
                                <div className="p-4 border-b dark:border-gray-700">
                                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                                        Konu
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedTemplate.subject}
                                        onChange={(e) => setSelectedTemplate({
                                            ...selectedTemplate,
                                            subject: e.target.value
                                        })}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>

                                {/* Body Editor */}
                                <div className="p-4">
                                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                                        {editMode === 'html' ? 'HTML İçerik' : 'Text İçerik'}
                                    </label>
                                    <textarea
                                        value={editMode === 'html' ? selectedTemplate.body_html : selectedTemplate.body_text}
                                        onChange={(e) => setSelectedTemplate({
                                            ...selectedTemplate,
                                            [editMode === 'html' ? 'body_html' : 'body_text']: e.target.value
                                        })}
                                        rows={15}
                                        className="w-full px-4 py-2 border rounded-lg font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="border-t dark:border-gray-700 p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="email"
                                            placeholder="test@example.com"
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                            className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <button
                                            onClick={handleSendTest}
                                            disabled={sending || !testEmail || !config?.configured}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                                        >
                                            {sending ? (
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4 mr-2" />
                                            )}
                                            Test Gönder
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
                                    >
                                        {saving ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        Kaydet
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-500">
                                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Düzenlemek için bir şablon seçin</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Branding Tab */}
            {activeTab === 'branding' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h3 className="font-semibold mb-6 dark:text-white flex items-center">
                        <Palette className="h-5 w-5 mr-2 text-purple-600" />
                        Email Görsel Ayarları
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {branding.map((setting) => (
                            <div key={setting.setting_key} className="space-y-2">
                                <label className="block text-sm font-medium dark:text-gray-300">
                                    {SETTING_LABELS[setting.setting_key] || setting.setting_key}
                                </label>
                                <p className="text-xs text-gray-500">{setting.description}</p>
                                <div className="flex space-x-2">
                                    {setting.setting_type === 'color' ? (
                                        <div className="flex items-center space-x-2 flex-1">
                                            <input
                                                type="color"
                                                value={setting.setting_value || '#6366f1'}
                                                onChange={(e) => handleBrandingSave(setting.setting_key, e.target.value)}
                                                className="w-12 h-10 border rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={setting.setting_value || ''}
                                                onChange={(e) => handleBrandingSave(setting.setting_key, e.target.value)}
                                                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                                placeholder="#000000"
                                            />
                                        </div>
                                    ) : setting.setting_type === 'image' ? (
                                        <div className="flex items-center space-x-2 flex-1">
                                            <input
                                                type="url"
                                                value={setting.setting_value || ''}
                                                onChange={(e) => setBranding(prev =>
                                                    prev.map(s => s.setting_key === setting.setting_key
                                                        ? { ...s, setting_value: e.target.value } : s
                                                    )
                                                )}
                                                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                                placeholder="https://example.com/logo.png"
                                            />
                                            <button
                                                onClick={() => handleBrandingSave(setting.setting_key,
                                                    branding.find(s => s.setting_key === setting.setting_key)?.setting_value || ''
                                                )}
                                                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                            >
                                                <Save className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2 flex-1">
                                            <input
                                                type="text"
                                                value={setting.setting_value || ''}
                                                onChange={(e) => setBranding(prev =>
                                                    prev.map(s => s.setting_key === setting.setting_key
                                                        ? { ...s, setting_value: e.target.value } : s
                                                    )
                                                )}
                                                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                            />
                                            <button
                                                onClick={() => handleBrandingSave(setting.setting_key,
                                                    branding.find(s => s.setting_key === setting.setting_key)?.setting_value || ''
                                                )}
                                                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                            >
                                                <Save className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {setting.setting_type === 'image' && setting.setting_value && (
                                    <div className="mt-2">
                                        <img
                                            src={setting.setting_value}
                                            alt={setting.setting_key}
                                            className="max-h-16 rounded border"
                                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {branding.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Branding ayarları yükleniyor veya mevcut değil.</p>
                            <p className="text-sm mt-2">Migration'ı çalıştırdığınızdan emin olun.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Config Info */}
            {config && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                    <div className="flex items-center mb-2">
                        <Settings className="h-5 w-5 text-gray-500 mr-2" />
                        <h3 className="font-semibold dark:text-white">Yapılandırma</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Provider:</span>
                            <span className="ml-2 font-medium dark:text-white">{config.provider}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Gönderen:</span>
                            <span className="ml-2 font-medium dark:text-white">{config.from_email}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">App:</span>
                            <span className="ml-2 font-medium dark:text-white">{config.app_name}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailTemplatesPanel;

