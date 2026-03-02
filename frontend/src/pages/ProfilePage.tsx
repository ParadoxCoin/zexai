import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { User, Lock, Save, CreditCard, Package, Check } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, changePassword, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const toast = useToast();
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await api.get('/billing/packages');
      setPackages(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      setPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    try {
      setPurchaseLoading(packageId);
      await api.post('/billing/purchase', { package_id: packageId });
      toast.success('Başarılı', 'Satın alma işlemi başlatıldı!');
    } catch (error: any) {
      toast.error('Hata', error.response?.data?.detail || 'Satın alma başarısız');
    } finally {
      setPurchaseLoading(null);
    }
  };

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      setProfileError(null);
      setProfileSuccess(null);
      await updateProfile(data);
      setProfileSuccess('Profile updated successfully!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      setPasswordError(null);
      setPasswordSuccess(null);
      await changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      setPasswordSuccess('Password changed successfully!');
      passwordForm.reset();
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t('profile.title', 'Profile Settings')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('profile.desc', 'Manage your account information and security settings.')}
          </p>
        </div>
      </div>

      {/* Billing & Credits Section */}
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">{t('profile.billingTitle', 'Kredi & Abonelik')}</h3>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{t('profile.currentCredits', 'Mevcut Krediniz')}</p>
                <p className="text-2xl font-bold text-primary-600">{user?.credits || 0}</p>
              </div>
            </div>

            {loadingPackages ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative border-2 rounded-lg p-6 ${pkg.popular
                        ? 'border-primary-500 shadow-lg'
                        : 'border-gray-200'
                      }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          {t('profile.mostPopular', 'En Popüler')}
                        </span>
                      </div>
                    )}
                    <div className="text-center">
                      <Package className="h-8 w-8 mx-auto text-primary-600 mb-2" />
                      <h4 className="text-lg font-semibold text-gray-900">{pkg.name}</h4>
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-gray-900">${pkg.price}</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-2xl font-semibold text-primary-600">
                          {pkg.credits.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">{t('profile.credits', 'kredi')}</span>
                      </div>
                      {pkg.discount > 0 && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            %{pkg.discount} {t('profile.discount', 'İndirim')}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => handlePurchase(pkg.id)}
                        disabled={purchaseLoading === pkg.id}
                        className={`mt-6 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${pkg.popular
                            ? 'bg-primary-600 hover:bg-primary-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50`}
                      >
                        {purchaseLoading === pkg.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {t('profile.processing', 'İşleniyor...')}
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            {t('profile.buy', 'Satın Al')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Profile Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">{t('profile.infoTitle', 'Profile Information')}</h3>
            </div>

            {profileSuccess && (
              <div className="mb-4 rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{profileSuccess}</div>
              </div>
            )}

            {profileError && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{profileError}</div>
              </div>
            )}

            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  {t('profile.fullName', 'Full Name')}
                </label>
                <input
                  {...profileForm.register('full_name')}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {profileForm.formState.errors.full_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {profileForm.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t('profile.email', 'Email Address')}
                </label>
                <input
                  {...profileForm.register('email')}
                  type="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {profileForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('profile.role', 'Role:')}</span>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {user?.role}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('profile.package', 'Package:')}</span>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                    {user?.package}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? t('profile.saving', 'Saving...') : t('profile.save', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <Lock className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">{t('profile.changePassword', 'Change Password')}</h3>
            </div>

            {passwordSuccess && (
              <div className="mb-4 rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{passwordSuccess}</div>
              </div>
            )}

            {passwordError && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{passwordError}</div>
              </div>
            )}

            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div>
                <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                  {t('profile.currentPassword', 'Current Password')}
                </label>
                <input
                  {...passwordForm.register('current_password')}
                  type="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {passwordForm.formState.errors.current_password && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.current_password.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                  {t('profile.newPassword', 'New Password')}
                </label>
                <input
                  {...passwordForm.register('new_password')}
                  type="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                  {t('profile.confirmPassword', 'Confirm New Password')}
                </label>
                <input
                  {...passwordForm.register('confirm_password')}
                  type="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {isLoading ? t('profile.changing', 'Changing...') : t('profile.changePassword', 'Change Password')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};