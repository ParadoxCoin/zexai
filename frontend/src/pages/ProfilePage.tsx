import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { User, Lock, Save, CreditCard, Package, Check, Users, Copy, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import axios from 'axios';
import { apiService } from '@/services/api';
import { referralService } from '@/services/referralService';
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

  // Live credit balance from dashboard stats
  const { data: creditStats } = useQuery({
    queryKey: ['dashboardStats', 'profilePageCredits'],
    queryFn: () => apiService.get<any>('/dashboard/stats'),
    refetchInterval: 15000,
    staleTime: 10000,
  });
  const liveCredits = Math.round((creditStats as any)?.credits_balance ?? (creditStats as any)?.data?.credits_balance ?? user?.credits ?? 0);

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

  const [referralStats, setReferralStats] = useState<any>(null);
  const [loadingReferral, setLoadingReferral] = useState(true);
  const [isGeneratingReferral, setIsGeneratingReferral] = useState(false);

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const fetchReferralStats = async () => {
    try {
      const response = await referralService.getStats();
      if (response.data) {
        setReferralStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch referral stats:', error);
    } finally {
      setLoadingReferral(false);
    }
  };

  const handleActivateReferral = async () => {
    if (isGeneratingReferral) return;
    setIsGeneratingReferral(true);
    try {
      await referralService.createCode();
      await fetchReferralStats();
      toast.success(t('common.success', 'Success'), 'Your referral identity has been activated!');
    } catch (error: any) {
      toast.error(t('common.error', 'Error'), error.response?.data?.detail || 'Failed to activate referral code.');
    } finally {
      setIsGeneratingReferral(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    try {
      setPurchaseLoading(packageId);
      await api.post('/billing/purchase', { package_id: packageId });
      toast.success(t('common.success'), t('profile.purchaseSuccessDesc'));
    } catch (error: any) {
      toast.error(t('common.error'), error.response?.data?.detail || t('profile.purchaseErrorDesc'));
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

  const referralCode = user?.username || user?.email?.split('@')[0] || user?.id?.substring(0, 8) || 'user';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Page Header */}
      <div className="flex items-center space-x-4 pb-6 border-b border-white/5">
        <div className="p-3.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl shadow-purple-500/20 flex items-center justify-center">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 uppercase tracking-tight">
            {t('profile.title', 'Profile Settings')}
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            {t('profile.desc', 'Manage your account information and security settings.')}
          </p>
        </div>
      </div>

      {/* Billing & Credits Section */}
      <div>
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                <CreditCard className="h-4.5 w-4.5 text-purple-400" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.15em]">{t('profile.billingTitle', 'Kredi & Abonelik')}</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('profile.currentCredits', 'Mevcut Krediniz')}</p>
              <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 tracking-tight mt-0.5">{liveCredits}</p>
            </div>
          </div>

          {loadingPackages ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative border rounded-3xl p-6 transition-all duration-500 group overflow-hidden ${
                    pkg.popular
                      ? 'border-purple-500/40 bg-purple-500/[0.02] shadow-[0_0_30px_rgba(147,51,234,0.05)]'
                      : 'border-white/5 bg-white/[0.01] hover:border-white/10'
                  }`}
                >
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                  
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20">
                        {t('profile.mostPopular', 'En Popüler')}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Package className="h-5 w-5 text-purple-400" />
                      </div>
                      <h4 className="text-base font-black text-white uppercase tracking-wider">{pkg.name}</h4>
                      
                      <div className="mt-4 flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-black text-white italic">${pkg.price}</span>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-center gap-1.5">
                        <span className="text-2xl font-black text-purple-400 tracking-tight">
                          {pkg.credits.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('profile.credits', 'kredi')}</span>
                      </div>
                      
                      {pkg.discount > 0 && (
                        <div className="mt-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase tracking-wider">
                            %{pkg.discount} {t('profile.discount', 'İndirim')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={purchaseLoading === pkg.id}
                      className={`mt-6 w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-xs font-black uppercase tracking-widest rounded-2xl text-white transition-all duration-300 cursor-pointer ${
                        pkg.popular
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/10'
                          : 'bg-white/5 hover:bg-white/10 border border-white/5'
                      } disabled:opacity-50`}
                    >
                      {purchaseLoading === pkg.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                          {t('profile.processing', 'İşleniyor...')}
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 mr-2" />
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

      {/* Referral System */}
      <div>
        <div className="bg-gradient-to-br from-purple-950/20 via-slate-950/40 to-indigo-950/20 border border-purple-500/10 shadow-2xl rounded-3xl overflow-hidden relative p-6 sm:p-8">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-500/15 border border-purple-500/20 rounded-xl">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Refer & Earn %5</h3>
            </div>
            
            <p className="text-xs font-semibold text-slate-400 mb-6 max-w-2xl leading-relaxed">
              Invite your friends and earn <strong className="text-purple-400 font-bold">5% commission</strong> in ZEX tokens for every purchase they make!
            </p>

            <div className="space-y-3 max-w-xl">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Your Unique Referral Link</label>
              {loadingReferral ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 animate-pulse">
                  <div className="w-4 h-4 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                  Loading your referral link...
                </div>
              ) : !referralStats?.code ? (
                <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-6 text-center space-y-4">
                  <p className="text-slate-400 text-xs font-semibold">Your unique referral identity is not active yet.</p>
                  <button 
                    onClick={handleActivateReferral} 
                    disabled={isGeneratingReferral}
                    type="button"
                    className="inline-flex items-center justify-center px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingReferral ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                        Activating...
                      </>
                    ) : (
                      'Activate My Referral Link'
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-2 rounded-2xl shadow-inner">
                  <div className="flex-1 px-4 py-2.5 bg-black/20 rounded-xl text-xs text-purple-300 font-mono truncate select-all">
                    {`https://app.zexai.io/ref/${referralStats.code.replace('MANUS-', 'ZEXAI-')}`}
                  </div>
                  <button 
                    onClick={() => {
                        navigator.clipboard.writeText(`https://app.zexai.io/ref/${referralStats.code.replace('MANUS-', 'ZEXAI-')}`);
                        toast.success(t('common.success', 'Success'), 'Referral link copied to clipboard!');
                    }}
                    type="button"
                    className="p-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 hover:border-purple-500/30 rounded-xl transition-all duration-300 cursor-pointer"
                    title="Copy Link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Profile Information */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
              <User className="h-4 w-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.15em]">{t('profile.infoTitle', 'Profile Information')}</h3>
          </div>

          {profileSuccess && (
            <div className="mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="text-xs font-bold text-emerald-400">{profileSuccess}</div>
            </div>
          )}

          {profileError && (
            <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
              <div className="text-xs font-bold text-red-400">{profileError}</div>
            </div>
          )}

          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
            <div>
              <label htmlFor="full_name" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                {t('profile.fullName', 'Full Name')}
              </label>
              <input
                {...profileForm.register('full_name')}
                type="text"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 placeholder:text-slate-700 shadow-inner"
              />
              {profileForm.formState.errors.full_name && (
                <p className="mt-1.5 text-xs font-bold text-red-400">
                  {profileForm.formState.errors.full_name.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                {t('profile.email', 'Email Address')}
              </label>
              <input
                {...profileForm.register('email')}
                type="email"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 placeholder:text-slate-700 shadow-inner"
              />
              {profileForm.formState.errors.email && (
                <p className="mt-1.5 text-xs font-bold text-red-400">
                  {profileForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('profile.role', 'Role:')}</span>
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {user?.role}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('profile.package', 'Package:')}</span>
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {user?.package}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/10 text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-all duration-300 cursor-pointer"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? t('profile.saving', 'Saving...') : t('profile.save', 'Save Changes')}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
              <Lock className="h-4 w-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.15em]">{t('profile.changePassword', 'Change Password')}</h3>
          </div>

          {passwordSuccess && (
            <div className="mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="text-xs font-bold text-emerald-400">{passwordSuccess}</div>
            </div>
          )}

          {passwordError && (
            <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
              <div className="text-xs font-bold text-red-400">{passwordError}</div>
            </div>
          )}

          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
            <div>
              <label htmlFor="current_password" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                {t('profile.currentPassword', 'Current Password')}
              </label>
              <input
                {...passwordForm.register('current_password')}
                type="password"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 placeholder:text-slate-700 shadow-inner"
              />
              {passwordForm.formState.errors.current_password && (
                <p className="mt-1.5 text-xs font-bold text-red-400">
                  {passwordForm.formState.errors.current_password.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="new_password" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                {t('profile.newPassword', 'New Password')}
              </label>
              <input
                {...passwordForm.register('new_password')}
                type="password"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 placeholder:text-slate-700 shadow-inner"
              />
              {passwordForm.formState.errors.new_password && (
                <p className="mt-1.5 text-xs font-bold text-red-400">
                  {passwordForm.formState.errors.new_password.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                {t('profile.confirmPassword', 'Confirm New Password')}
              </label>
              <input
                {...passwordForm.register('confirm_password')}
                type="password"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 placeholder:text-slate-700 shadow-inner"
              />
              {passwordForm.formState.errors.confirm_password && (
                <p className="mt-1.5 text-xs font-bold text-red-400">
                  {passwordForm.formState.errors.confirm_password.message}
                </p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/10 text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-all duration-300 cursor-pointer"
              >
                <Lock className="h-4 w-4 mr-2" />
                {isLoading ? t('profile.changing', 'Changing...') : t('profile.changePassword', 'Change Password')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};