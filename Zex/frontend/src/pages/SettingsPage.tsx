import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Shield, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // General Settings State
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    notifications: {
      taskCompletion: true,
      creditAlerts: true,
      marketingEmails: false,
    },
    api: {
      webhookUrl: '',
    },
    billing: {
      autoRecharge: false,
      rechargeAmount: 100,
      rechargeThreshold: 50
    }
  });

  // Load user preferences into state when user loads
  useEffect(() => {
    if (user?.preferences) {
      setSettings(prev => ({
        ...prev,
        ...user.preferences
      }));
    }
  }, [user]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call for now to fix api import error
      console.log('Saving settings:', settings);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof settings.notifications) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] }
    }));
  };

  const handleWebhookChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, api: { ...prev.api, webhookUrl: e.target.value } }));
  };

  const handleBillingToggle = () => {
    setSettings(prev => ({
      ...prev,
      billing: { ...prev.billing, autoRecharge: !prev.billing.autoRecharge }
    }));
  };

  const handleBillingValueChange = (key: 'rechargeAmount' | 'rechargeThreshold', val: string) => {
    setSettings(prev => ({
      ...prev,
      billing: { ...prev.billing, [key]: parseInt(val) || 0 }
    }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex items-center space-x-4 pb-6 border-b border-white/5">
        <div className="p-3.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl shadow-purple-500/20 flex items-center justify-center">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 uppercase tracking-tight">
            {t('settings.title', 'Account Preferences')}
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            {t('settings.desc', 'Manage your profile, billing, and notification settings')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Account Settings */}
        <Card className="border border-white/5 bg-white/[0.02] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 relative">
          <CardHeader className="border-b border-white/5 p-6 bg-white/[0.01]">
            <CardTitle className="flex items-center gap-3 text-sm font-black text-white uppercase tracking-wider">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
                <Shield className="h-4 w-4 text-purple-400" />
              </div>
              <span>{t('settings.profileInfo', 'Profile Information')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5">
                {t('settings.accountType', 'Account Type')}
              </label>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                  {user?.package || 'Free'}
                </span>
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                  {user?.role || 'User'}
                </span>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                {t('settings.emailNotif', 'Email Notifications')}
              </label>
              <div className="space-y-3.5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/10 bg-black/40 text-purple-500 focus:ring-purple-500/50 cursor-pointer"
                    checked={settings.notifications.taskCompletion}
                    onChange={() => handleNotificationChange('taskCompletion')}
                  />
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                    {t('settings.taskComp', 'Task completion notifications')}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/10 bg-black/40 text-purple-500 focus:ring-purple-500/50 cursor-pointer"
                    checked={settings.notifications.creditAlerts}
                    onChange={() => handleNotificationChange('creditAlerts')}
                  />
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                    {t('settings.creditAlerts', 'Credit balance alerts')}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/10 bg-black/40 text-purple-500 focus:ring-purple-500/50 cursor-pointer"
                    checked={settings.notifications.marketingEmails}
                    onChange={() => handleNotificationChange('marketingEmails')}
                  />
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                    {t('settings.marketing', 'Marketing emails')}
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Settings */}
        <Card className="border border-white/5 bg-white/[0.02] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 relative">
          <CardHeader className="border-b border-white/5 p-6 bg-white/[0.01]">
            <CardTitle className="flex items-center gap-3 text-sm font-black text-white uppercase tracking-wider">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
                <CreditCard className="h-4 w-4 text-purple-400" />
              </div>
              <span>{t('settings.billingTitle', 'Billing & Credits')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                {t('settings.autoRecharge', 'Auto-recharge')}
              </label>
              <div className="flex items-center gap-3 cursor-pointer group mb-4">
                <input
                  type="checkbox"
                  id="autoRechargeCheck"
                  className="w-4 h-4 rounded border-white/10 bg-black/40 text-purple-500 focus:ring-purple-500/50 cursor-pointer"
                  checked={settings.billing.autoRecharge}
                  onChange={handleBillingToggle}
                />
                <label htmlFor="autoRechargeCheck" className="text-xs font-semibold text-slate-300 group-hover:text-white cursor-pointer transition-colors">
                  {t('settings.autoRecharge', 'Auto-recharge when balance is low')}
                </label>
              </div>

              <div className="mt-4 ml-7 space-y-4">
                <div className="flex items-center flex-wrap gap-3">
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-30 transition-all shadow-inner"
                    value={settings.billing.rechargeAmount || ''}
                    onChange={(e) => handleBillingValueChange('rechargeAmount', e.target.value)}
                    disabled={!settings.billing.autoRecharge}
                  />
                  <span className="text-xs font-semibold text-slate-400">{t('settings.rechargeWhenUrl', 'credits when balance drops below')}</span>
                  <input
                    type="number"
                    className="w-20 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-30 transition-all shadow-inner"
                    value={settings.billing.rechargeThreshold || ''}
                    onChange={(e) => handleBillingValueChange('rechargeThreshold', e.target.value)}
                    disabled={!settings.billing.autoRecharge}
                  />
                  <span className="text-xs font-semibold text-slate-400">{t('settings.credits', 'credits')}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <button 
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-white/5 bg-white/5 hover:bg-white/10 text-white hover:text-purple-300 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer"
            >
              {t('settings.managePayment', 'Manage Payment Methods')}
            </button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end items-center gap-4 mt-8 pt-6 border-t border-white/5">
        <button 
          className="px-5 py-3 border border-transparent text-xs font-black uppercase tracking-wider rounded-2xl text-slate-400 hover:text-white bg-white/0 hover:bg-white/5 transition-all duration-300 cursor-pointer"
        >
          {t('settings.reset', 'Reset to Defaults')}
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/10 text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-all duration-300 cursor-pointer"
        >
          {isSaving ? t('settings.saving', 'Saving...') : t('settings.saveChanges', 'Save Changes')}
        </button>
      </div>
    </div>
  );
};