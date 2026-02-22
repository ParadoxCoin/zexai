import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  Home, Image, Video, Volume2, MessageCircle, Bot, FolderOpen,
  User, Settings, LogOut, Menu, X, Shield, Key, Moon, Sun, Globe,
  Wallet, Gift, Star, Sparkles, ChevronDown, Award, Zap, Diamond
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import NotificationDropdown from './NotificationDropdown';
import AchievementPopup from './AchievementPopup';
import PWAInstallPrompt from './PWAInstallPrompt';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const { data: statsData } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => apiService.get<any>('/dashboard/stats'),
    refetchInterval: 5000, // Poll to keep dynamic credit update
    staleTime: 5000,
    enabled: isAuthenticated
  });

  const currentCredits = (statsData as any)?.credits_balance ?? (statsData as any)?.data?.credits_balance ?? 0;

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'tr' : 'en');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, color: 'from-blue-500 to-cyan-500' },
    { name: 'Images', href: '/images', icon: Image, color: 'from-pink-500 to-rose-500' },
    { name: 'Videos', href: '/videos', icon: Video, color: 'from-purple-500 to-violet-500' },
    { name: 'Audio', href: '/audio', icon: Volume2, color: 'from-rose-500 to-pink-500' },
    { name: 'Avatar', href: '/avatar', icon: User, color: 'from-fuchsia-500 to-purple-500' },
    { name: 'Chat', href: '/chat', icon: MessageCircle, color: 'from-emerald-500 to-teal-500' },
    { name: 'Synapse', href: '/synapse', icon: Bot, color: 'from-amber-500 to-orange-500' },
    { name: 'Showcase', href: '/showcase', icon: Award, color: 'from-yellow-500 to-orange-500' },
  ];

  const adminNavigation = [
    { name: 'Admin', href: '/admin', icon: Shield, color: 'from-red-500 to-rose-500' },
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
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center w-12 h-12">
                <div className="absolute inset-2 bg-purple-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <img src="/logo192.png" alt="ZexAi" className="relative w-12 h-12 object-contain drop-shadow-md transform group-hover:scale-105 transition-all duration-300" />
              </div>
              <div className="hidden sm:flex flex-col items-center justify-center -ml-1">
                <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-br from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-gray-400 bg-clip-text text-transparent leading-none">
                  ZexAi
                </h1>
                <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 tracking-[0.3em] mt-1 uppercase leading-none text-center">
                  Studio
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-1.5 max-w-[calc(100vw-400px)] overflow-x-auto scrollbar-hide">
              {allNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${isActive
                      ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700'
                      }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden xl:inline">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">

              {/* Dynamic Credits Display */}
              <Link
                to="/credits"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 rounded-xl transition-all mr-1"
              >
                <Diamond className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {Math.round(currentCredits)}
                </span>
              </Link>

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="hidden sm:flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <Globe className="h-4 w-4" />
                <span className="text-xs font-medium">{i18n.language.toUpperCase()}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
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
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                    {/* User Info Header */}
                    <div className="p-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                          {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="text-white">
                          <p className="font-semibold line-clamp-1">{user?.email}</p>
                          <p className="text-xs text-white/80">{isAdminUser ? '🛡️ Admin' : '👤 User'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                      >
                        <User className="h-4 w-4" />Profil
                      </Link>
                      <Link
                        to="/api-keys"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                      >
                        <Key className="h-4 w-4" />API Anahtarları
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                      >
                        <Settings className="h-4 w-4" />Ayarlar
                      </Link>

                      <div className="my-2 border-t border-gray-100 dark:border-gray-700" />
                      <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Keşfet</p>

                      <Link
                        to="/credits"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl"
                      >
                        <Wallet className="h-4 w-4" />
                        Kredi & Abonelik
                        <span className="ml-auto text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">Pro</span>
                      </Link>
                      <Link
                        to="/marketplace"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl"
                      >
                        <Star className="h-4 w-4" />
                        Marketplace
                        <span className="ml-auto text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">40+</span>
                      </Link>
                      <Link
                        to="/referral"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl"
                      >
                        <Gift className="h-4 w-4" />
                        Davet Et
                        <span className="ml-auto text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">%1</span>
                      </Link>

                      <div className="my-2 border-t border-gray-100 dark:border-gray-700" />

                      <button
                        onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                      >
                        <LogOut className="h-4 w-4" />Çıkış Yap
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
          <div className="lg:hidden border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
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
      <main className="w-full overflow-x-hidden">
        <Outlet />
      </main>

      {/* Global Achievement Popup */}
      <AchievementPopup />
    </div>
  );
};

export default Layout;