import React, { useState, useEffect } from 'react';
import {
    Shield, Plus, Edit2, Trash2, RefreshCw, Save, X,
    Users, CheckCircle, Lock, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../ui/toast';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
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

interface Permission {
    id: string;
    name: string;
    category: string;
    description?: string;
}

interface Role {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    role_type: 'staff' | 'customer';
    is_system: boolean;
    permissions: string[];
    permission_count: number | string;
}

export const RoleManagementPanel: React.FC = () => {
    const toast = useToast();
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [permissionsByCategory, setPermissionsByCategory] = useState<Record<string, Permission[]>>({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [expandedRole, setExpandedRole] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'staff' | 'customer'>('staff');

    // Form state
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        display_name: '',
        description: '',
        role_type: 'customer' as 'staff' | 'customer',
        permissions: [] as string[]
    });

    useEffect(() => {
        fetchRoles();
        fetchPermissions();
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/roles');
            setRoles(response.data.roles || []);
        } catch (error: any) {
            console.error('Failed to fetch roles:', error);
            toast.error('Hata', 'Roller yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const response = await api.get('/admin/roles/permissions');
            setPermissions(response.data.permissions || []);
            setPermissionsByCategory(response.data.by_category || {});
        } catch (error: any) {
            console.error('Failed to fetch permissions:', error);
        }
    };

    const handleSaveRole = async () => {
        try {
            if (editingRole) {
                await api.put(`/admin/roles/${editingRole.id}`, {
                    display_name: formData.display_name,
                    description: formData.description,
                    permissions: formData.permissions
                });
                toast.success('Başarılı', 'Rol güncellendi');
            } else {
                await api.post('/admin/roles', formData);
                toast.success('Başarılı', 'Rol oluşturuldu');
            }
            setShowModal(false);
            resetForm();
            fetchRoles();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'İşlem başarısız');
        }
    };

    const handleDeleteRole = async (roleId: string, displayName: string) => {
        if (!confirm(`"${displayName}" rolünü silmek istediğinize emin misiniz?`)) return;

        try {
            await api.delete(`/admin/roles/${roleId}`);
            toast.success('Başarılı', 'Rol silindi');
            fetchRoles();
        } catch (error: any) {
            toast.error('Hata', error.response?.data?.detail || 'Silme başarısız');
        }
    };

    const openEditModal = (role: Role) => {
        setEditingRole(role);
        setFormData({
            id: role.id,
            name: role.name,
            display_name: role.display_name,
            description: role.description || '',
            role_type: role.role_type,
            permissions: role.permissions
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingRole(null);
        setFormData({
            id: '',
            name: '',
            display_name: '',
            description: '',
            role_type: 'customer',
            permissions: []
        });
    };

    const togglePermission = (permId: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId]
        }));
    };

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            'ai': 'AI Özellikleri',
            'profile': 'Profil',
            'admin': 'Yönetim',
            'super': 'Süper Admin'
        };
        return labels[category] || category;
    };

    const filteredRoles = roles.filter(r => r.role_type === activeTab);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold flex items-center">
                        <Shield className="h-6 w-6 mr-2 text-purple-600" />
                        Rol ve İzin Yönetimi
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Kullanıcı rollerini ve izinlerini yönetin
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchRoles}
                        className="flex items-center px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Yenile
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Rol
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-4">
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'staff'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Lock className="h-4 w-4 inline mr-1" />
                        Personel Rolleri
                    </button>
                    <button
                        onClick={() => setActiveTab('customer')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'customer'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Users className="h-4 w-4 inline mr-1" />
                        Müşteri Rolleri
                    </button>
                </nav>
            </div>

            {/* Role List */}
            <div className="space-y-3">
                {filteredRoles.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        Bu kategoride rol bulunamadı
                    </div>
                ) : (
                    filteredRoles.map((role) => (
                        <div
                            key={role.id}
                            className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
                        >
                            {/* Role Header */}
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                                onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${role.role_type === 'staff' ? 'bg-purple-100' : 'bg-blue-100'
                                        }`}>
                                        {role.role_type === 'staff' ? (
                                            <Lock className="h-5 w-5 text-purple-600" />
                                        ) : (
                                            <Users className="h-5 w-5 text-blue-600" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center">
                                            <span className="font-semibold text-gray-900">{role.display_name}</span>
                                            {role.is_system && (
                                                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                                    Sistem
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{role.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm text-gray-600">
                                        {role.permission_count} izin
                                    </span>
                                    {!role.is_system && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openEditModal(role); }}
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id, role.display_name); }}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                    {role.is_system && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditModal(role); }}
                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                                            title="İzinleri Düzenle"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                    )}
                                    {expandedRole === role.id ? (
                                        <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Permissions */}
                            {expandedRole === role.id && (
                                <div className="px-4 pb-4 border-t bg-gray-50">
                                    <div className="pt-3">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">İzinler:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {role.permissions.includes('*') ? (
                                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                                    Tüm Yetkiler
                                                </span>
                                            ) : (
                                                role.permissions.map((perm) => (
                                                    <span
                                                        key={perm}
                                                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                                                    >
                                                        {perm}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">
                                {editingRole ? 'Rol Düzenle' : 'Yeni Rol Oluştur'}
                            </h3>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
                            {!editingRole && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Rol ID (benzersiz)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.id}
                                            onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="custom_role"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Rol Tipi
                                        </label>
                                        <select
                                            value={formData.role_type}
                                            onChange={(e) => setFormData({ ...formData, role_type: e.target.value as 'staff' | 'customer' })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="customer">Müşteri</option>
                                            <option value="staff">Personel</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Görünen Ad
                                </label>
                                <input
                                    type="text"
                                    value={formData.display_name}
                                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Özel Rol"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Açıklama
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Bu rol hakkında açıklama..."
                                />
                            </div>

                            {/* Permissions by Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    İzinler
                                </label>
                                <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    {Object.entries(permissionsByCategory).map(([category, perms]) => (
                                        <div key={category}>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                                {getCategoryLabel(category)}
                                                <span className="ml-2 text-xs text-gray-500">
                                                    ({perms.filter(p => formData.permissions.includes(p.id)).length}/{perms.length})
                                                </span>
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {perms.map((perm) => (
                                                    <label
                                                        key={perm.id}
                                                        className={`flex items-start p-2 rounded border cursor-pointer transition-colors ${formData.permissions.includes(perm.id)
                                                            ? 'bg-purple-50 border-purple-300'
                                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.permissions.includes(perm.id)}
                                                            onChange={() => togglePermission(perm.id)}
                                                            className="h-4 w-4 text-purple-600 mt-0.5"
                                                        />
                                                        <div className="ml-2">
                                                            <span className="text-sm font-medium text-gray-900">{perm.name}</span>
                                                            {perm.description && (
                                                                <p className="text-xs text-gray-500">{perm.description}</p>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSaveRole}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {editingRole ? 'Güncelle' : 'Oluştur'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManagementPanel;
