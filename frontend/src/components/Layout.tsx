import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  Home, Image, Video, Volume2, MessageCircle, Bot, FolderOpen,
  User, Settings, LogOut, Menu, X, Shield, Key, Moon, Sun, Globe,
  Wallet, Gift, Star, Sparkles, ChevronDown, Award, Zap, Diamond, Layers
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import NotificationDropdown from './NotificationDropdown';
import AchievementPopup from './AchievementPopup';
import PWAInstallPrompt from './PWAInstallPrompt';
import LanguageSwitcher from './LanguageSwitcher';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { i18n, t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const { data: statsData } = useQuery({
    queryKey: ['dashboardStats', new Date().getHours()], // Cache bust every hour
    queryFn: () => apiService.get<any>('/dashboard/stats?v=1.0.5'),
    refetchInterval: 10000, 
    staleTime: 5000,
    enabled: isAuthenticated
  });

  const currentCredits = (statsData as any)?.credits_balance ?? (statsData as any)?.data?.credits_balance ?? 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: t('nav.dashboard', 'Dashboard'), href: '/dashboard', icon: Home, color: 'from-blue-500 to-cyan-500' },
    { name: t('nav.images', 'Images'), href: '/images', icon: Image, color: 'from-pink-500 to-rose-500' },
    { name: t('nav.videos', 'Videos'), href: '/videos', icon: Video, color: 'from-purple-500 to-violet-500' },
    { name: t('nav.audio', 'Audio'), href: '/audio', icon: Volume2, color: 'from-rose-500 to-pink-500' },
    { name: t('nav.chat', 'Chat'), href: '/chat', icon: MessageCircle, color: 'from-emerald-500 to-teal-500' },
    { name: t('nav.synapse', 'Synapse'), href: '/synapse', icon: Bot, color: 'from-amber-500 to-orange-500' },
  ];

  const adminNavigation = [
    { name: t('nav.admin', 'Admin'), href: '/admin', icon: Shield, color: 'from-red-500 to-rose-500' },
  ];

  const isAdminUser = user?.role === 'admin' || user?.role === 'super_admin';
  const allNavigation = isAdminUser ? [...navigation, ...adminNavigation] : navigation;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-2">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3 group flex-shrink-0">
              <div className="relative flex items-center justify-center w-10 h-10">
                <div className="absolute inset-1 bg-purple-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <img src="/logo192.png" alt="ZexAi" className="relative w-10 h-10 object-contain drop-shadow-md transform group-hover:scale-105 transition-all duration-300" />
              </div>
              <div className="hidden sm:flex flex-col items-center justify-center -ml-1">
                <h1 className="text-xl font-black tracking-tighter bg-gradient-to-br from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-gray-400 bg-clip-text text-transparent leading-none">
                  ZexAi
                </h1>
                <p className="text-[8px] font-bold text-gray-500 dark:text-gray-400 tracking-[0.3em] mt-0.5 uppercase leading-none text-center">
                  Studio
                </p>
              </div>
            </Link>

            {/* Desktop Navigation - centered */}
            <nav className="hidden lg:flex items-center justify-center gap-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-1 flex-1 min-w-0 overflow-x-auto scrollbar-hide" aria-label="Ana navigasyon">
              {allNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${isActive
                      ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700'
                      }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-1.5 flex-shrink-0">

              <LanguageSwitcher />

              {/* Wallet Connect */}
              <div className="mr-1 hidden sm:flex">
                <w3m-button />
              </div>

              {/* Dynamic Credits Display */}
              <div className="flex items-center gap-1.5">
                <Link
                  to="/credits"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 rounded-xl transition-all"
                >
                  <Diamond className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {Math.round(currentCredits)}
                  </span>
                </Link>
                <div className="hidden sm:flex items-center gap-1 px-1.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg" title={t('layout.noExpirationInfo', 'Kredileriniz ay sonunda silinmez')}>
                  <Zap className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                    {t('layout.noExpiration', 'NO EXPIRY')}
                  </span>
                </div>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                title={theme === 'light' ? 'Koyu Tema' : 'Açık Tema'}
                aria-label={theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç'}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
              </button>

              {/* Install App Button */}
              <PWAInstallPrompt />

              {/* Notifications */}
              <NotificationDropdown />

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  aria-label={`Kullanıcı menüsü — ${user?.email ?? ''}`}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 max-w-[120px]">
                      {user?.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {isAdminUser ? 'Admin' : 'User'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/5 overflow-hidden z-50 transition-all duration-300 transform scale-100 origin-top-right animate-in fade-in slide-in-from-top-3">
                    {/* User Info Mesh Header */}
                    <div className="p-5 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border-b border-gray-100/10 dark:border-white/5 relative overflow-hidden">
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
                      
                      <div className="flex items-center gap-3.5 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-lg font-black tracking-tighter border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                          {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="font-bold text-white text-sm truncate leading-snug">{user?.email}</p>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full text-[8px] font-black tracking-widest uppercase shadow-md shadow-purple-500/20">
                            {isAdminUser ? '🛡️ Admin' : '💎 Premium'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 space-y-3.5 max-h-[480px] overflow-y-auto scrollbar-hide">
                      {/* Section: Identity */}
                      <div>
                        <div className="px-3.5 pt-1 pb-1.5 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">{t('layout.accountSection', 'ACCOUNT')}</div>
                        <div className="space-y-0.5">
                          <Link
                            to="/profile"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all duration-300 transform hover:translate-x-1"
                          >
                            <User className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors transform group-hover:scale-110 duration-300" />
                            <span>{t('layout.profile', 'Profil')}</span>
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all duration-300 transform hover:translate-x-1"
                          >
                            <Settings className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors transform group-hover:scale-110 duration-300" />
                            <span>{t('layout.settings', 'Ayarlar')}</span>
                          </Link>
                        </div>
                      </div>

                      {/* Section: Passive Earn & Staking */}
                      <div>
                        <div className="px-3.5 pt-1 pb-1.5 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">{t('layout.earnSection', 'EARNINGS')}</div>
                        <div className="space-y-0.5">
                          <Link
                            to="/staking"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all duration-300 transform hover:translate-x-1"
                          >
                            <Diamond className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors transform group-hover:scale-110 duration-300" />
                            <span>{t('layout.staking', 'ZEX Staking')}</span>
                            <span className="ml-auto text-[8px] font-black bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30 px-2 py-0.5 rounded-full">% APY</span>
                          </Link>
                          <Link
                            to="/referral"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:text-pink-600 dark:hover:text-pink-400 rounded-2xl hover:bg-pink-50 dark:hover:bg-pink-950/20 transition-all duration-300 transform hover:translate-x-1"
                          >
                            <Gift className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors transform group-hover:scale-110 duration-300" />
                            <span>{t('layout.invite', 'Davet Et')}</span>
                            <span className="ml-auto text-[8px] font-black bg-pink-500/20 text-pink-500 dark:text-pink-400 border border-pink-500/20 dark:border-pink-500/30 px-2 py-0.5 rounded-full">%5 EARN</span>
                          </Link>
                        </div>
                      </div>

                      {/* Section: Exploration */}
                      <div>
                        <div className="px-3.5 pt-1 pb-1.5 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">{t('layout.exploreSection', 'EXPLORE')}</div>
                        <div className="space-y-0.5">
                          <Link
                            to="/credits"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all duration-300 transform hover:translate-x-1"
                          >
                            <Wallet className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors transform group-hover:scale-110 duration-300" />
                            <span>{t('layout.creditsSub', 'Kredi & Abonelik')}</span>
                            <span className="ml-auto text-[8px] font-black bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">{Math.round(currentCredits)}</span>
                          </Link>
                          <Link
                            to="/marketplace"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-300 transform hover:translate-x-1"
                          >
                            <Star className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors transform group-hover:scale-110 duration-300" />
                            <span>{t('layout.marketplace', 'Marketplace')}</span>
                            <span className="ml-auto text-[8px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">40+</span>
                          </Link>
                        </div>
                      </div>

                      {/* Section: Customizations & Actions */}
                      <div>
                        <div className="px-3.5 pt-1 pb-1.5 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">{t('layout.preferencesSection', 'PREFERENCES')}</div>
                        <div className="space-y-0.5">
                          <button
                            onClick={() => { toggleTheme(); }}
                            className="group flex items-center gap-3 w-full px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:text-orange-600 dark:hover:text-orange-400 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all duration-300 transform hover:translate-x-1"
                          >
                            {theme === 'light' ? (
                              <Moon className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors transform group-hover:rotate-45 duration-300" />
                            ) : (
                              <Sun className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors transform group-hover:rotate-45 duration-300" />
                            )}
                            <span className="text-left">{t('layout.theme', 'Tema')}</span>
                            <span className="ml-auto text-[8px] font-black bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 dark:border-orange-500/30 px-2 py-0.5 rounded-full uppercase">
                              {theme === 'light' ? t('layout.themeLight', 'Açık') : t('layout.themeDark', 'Koyu')}
                            </span>
                          </button>

                          <div className="h-px bg-gray-100 dark:bg-white/5 my-2" />

                          <button
                            onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                            className="group flex items-center gap-3 w-full px-3.5 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-all duration-300 transform hover:translate-x-1"
                          >
                            <LogOut className="h-4 w-4 text-red-400 dark:text-red-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors transform group-hover:scale-110 duration-300" />
                            <span>{t('layout.logout', 'Çıkış Yap')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-nav"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Overlay for dropdown */}
        {isUserMenuOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
        )}

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div id="mobile-nav" className="lg:hidden border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900" role="navigation" aria-label="Mobil navigasyon">
            <div className="p-4 grid grid-cols-4 gap-2">
              {allNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all ${isActive
                      ? `bg-gradient-to-r ${item.color} text-white`
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content - Full width with better proportions */}
      <main className="w-full overflow-x-hidden pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 safe-area-bottom" aria-label="Alt navigasyon">
        <div className="flex items-stretch justify-around h-16 px-1">
          {[
            { name: t('nav.dashboard', 'Dashboard'), href: '/dashboard', icon: Home, color: 'from-blue-500 to-cyan-500' },
            { name: t('nav.images', 'Images'), href: '/images', icon: Image, color: 'from-pink-500 to-rose-500' },
            { name: t('nav.chat', 'Chat'), href: '/chat', icon: MessageCircle, color: 'from-emerald-500 to-teal-500' },
            { name: t('nav.videos', 'Videos'), href: '/videos', icon: Video, color: 'from-purple-500 to-violet-500' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-all ${
                  isActive
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-purple-100 dark:bg-purple-900/30' : ''}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                </div>
                <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
          {/* More button to reveal full menu */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-all ${
              isMobileMenuOpen
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300'
            }`}
            aria-label={isMobileMenuOpen ? 'Menüyü kapat' : 'Daha fazla menü öğesi'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
          >
            <div className={`p-1.5 rounded-xl transition-all ${isMobileMenuOpen ? 'bg-purple-100 dark:bg-purple-900/30' : ''}`}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </div>
            <span className={`text-[10px] font-semibold leading-none ${isMobileMenuOpen ? 'text-purple-600 dark:text-purple-400' : ''}`}>
              {t('nav.more', 'More')}
            </span>
          </button>
        </div>
      </nav>

      {/* Global Achievement Popup */}
      <AchievementPopup />
    </div>
  );
};

export default Layout;