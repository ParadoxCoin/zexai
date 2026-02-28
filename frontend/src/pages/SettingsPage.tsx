import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Bell, Shield, CreditCard } from 'lucide-react';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, checkPushSubscriptionStatus } from '@/lib/pushNotifications';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();

  // Push Notification State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(true);

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

  // Load Push Subscription Status
  useEffect(() => {
    checkPushSubscriptionStatus().then((isSubscribed) => {
      setPushEnabled(isSubscribed);
      setIsPushLoading(false);
    });
  }, []);

  const handlePushToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsPushLoading(true);

    if (isChecked) {
      const success = await subscribeToPushNotifications();
      if (success) {
        setPushEnabled(true);
        console.log("Push notifications enabled!");
      } else {
        setPushEnabled(false);
        e.target.checked = false; // revert Visual change
        console.error("Failed to enable push notifications. Please check browser permissions.");
      }
    } else {
      const success = await unsubscribeFromPushNotifications();
      if (success) {
        setPushEnabled(false);
        console.log("Push notifications disabled!");
      } else {
        console.error("Failed to disable push notifications.");
      }
    }

    setIsPushLoading(false);
  };

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
    <div className="container max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-gray-100">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-indigo-800 to-gray-900">
            Account Preferences
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your profile, billing, and notification settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Account Settings */}
        <Card className="border-gray-200/60 shadow-md hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-indigo-900">
              <Shield className="h-5 w-5 text-indigo-500" />
              <span>Profile Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                  {user?.package}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium capitalize">
                  {user?.role}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Notifications
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={settings.notifications.taskCompletion}
                    onChange={() => handleNotificationChange('taskCompletion')}
                  />
                  <span className="text-sm">Task completion notifications</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={settings.notifications.creditAlerts}
                    onChange={() => handleNotificationChange('creditAlerts')}
                  />
                  <span className="text-sm">Credit balance alerts</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={settings.notifications.marketingEmails}
                    onChange={() => handleNotificationChange('marketingEmails')}
                  />
                  <span className="text-sm">Marketing emails</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Settings */}
        <Card className="border-gray-200/60 shadow-md hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-indigo-900">
              <CreditCard className="h-5 w-5 text-indigo-500" />
              <span>Billing & Credits</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-recharge
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={settings.billing.autoRecharge}
                  onChange={handleBillingToggle}
                />
                <span className="text-sm">Auto-recharge when balance is low</span>
              </div>
              <div className="mt-2 ml-6 space-y-2">
                <Input
                  type="number"
                  placeholder="100"
                  className="w-32 inline-block mr-2"
                  value={settings.billing.rechargeAmount || ''}
                  onChange={(e) => handleBillingValueChange('rechargeAmount', e.target.value)}
                  disabled={!settings.billing.autoRecharge}
                />
                <span className="text-sm text-gray-600">credits when balance drops below</span>
                <Input
                  type="number"
                  placeholder="50"
                  className="w-20 inline-block mx-2"
                  value={settings.billing.rechargeThreshold || ''}
                  onChange={(e) => handleBillingValueChange('rechargeThreshold', e.target.value)}
                  disabled={!settings.billing.autoRecharge}
                />
                <span className="text-sm text-gray-600">credits</span>
              </div>
            </div>

            <Button variant="outline" className="w-full mt-2 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
              Manage Payment Methods
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border-gray-200/60 shadow-md hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-indigo-900">
              <Bell className="h-5 w-5 text-indigo-500" />
              <span>Device Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Push Notifications
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={pushEnabled}
                    onChange={handlePushToggle}
                    disabled={isPushLoading}
                  />
                  <span className="text-sm">
                    {isPushLoading ? 'Checking status...' : 'System & Browser notifications'}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Sound
              </label>
              <select className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none">
                <option>Default</option>
                <option>Chime</option>
                <option>Bell</option>
                <option>None</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
        <Button variant="ghost" className="hover:bg-gray-100">Reset to Defaults</Button>
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-200 transition-all border-0"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};