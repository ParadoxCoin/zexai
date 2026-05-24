import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { useAuthStore } from '@/store/authStore';
import { ToastProvider } from './components/ui/toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { WagmiProvider } from 'wagmi';
import { config } from './web3config';
import { Web3Provider } from '@/contexts/Web3Context';
import './index.css';

// Route-level lazy loading (dynamic imports) to minimize initial bundle size
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const ImageGenerationPage = lazy(() => import('@/pages/ImageGenerationPage'));
const MediaLibraryPage = lazy(() => import('@/pages/MediaLibraryPage'));
const SynapsePage = lazy(() => import('@/pages/SynapsePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const CreditPurchasePage = lazy(() => import('@/pages/CreditPurchasePage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const VideoPage = lazy(() => import('@/pages/VideoPage'));
const AudioPage = lazy(() => import('@/pages/AudioPage'));
const AvatarPage = lazy(() => import('@/pages/AvatarPage'));
const ShowcasePage = lazy(() => import('@/pages/ShowcasePage'));
const ComparisonChatPage = lazy(() => import('@/pages/ComparisonChatPage').then(module => ({ default: module.ComparisonChatPage })));
const AdminDashboardEnhanced = lazy(() => import('@/pages/AdminDashboardEnhanced').then(module => ({ default: module.AdminDashboardEnhanced })));
const ApiKeysPage = lazy(() => import('@/pages/ApiKeysPage').then(module => ({ default: module.ApiKeysPage })));
const ReferralPage = lazy(() => import('@/pages/ReferralPage'));
const MarketplacePage = lazy(() => import('@/pages/MarketplacePage'));
const StakingPage = lazy(() => import('@/pages/StakingPage'));
const MyCollectionsPage = lazy(() => import('@/pages/MyCollectionsPage'));
const CollectionBuilderPage = lazy(() => import('@/pages/CollectionBuilderPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const RefundPolicyPage = lazy(() => import('@/pages/RefundPolicyPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin' && user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

// Premium HSL-glow styled loading screen for lazy route transition
const RouteLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#070913] text-slate-100 font-sans relative overflow-hidden">
    {/* Ambient Glow matching layout theme */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] pointer-events-none bg-violet-500/10 z-0 animate-pulse" />
    <div className="relative flex flex-col items-center gap-4 z-10">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-white/5 border-t-violet-500 animate-spin" />
        <div className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 blur-md opacity-50" />
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-slate-300 via-white to-slate-500 bg-clip-text text-transparent animate-pulse">
        ZexAi Yükleniyor...
      </div>
    </div>
  </div>
);

function AppContent() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route element={<Layout />}>
            {/* Public routes */}
            <Route path="/login" element={<PublicRoute><PageTransition><LoginPage /></PageTransition></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><PageTransition><RegisterPage /></PageTransition></PublicRoute>} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            {/* Legal Pages - Public, no auth required */}
            <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
            <Route path="/privacy" element={<PageTransition><PrivacyPage /></PageTransition>} />
            <Route path="/refund-policy" element={<PageTransition><RefundPolicyPage /></PageTransition>} />
            <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><PageTransition><ProfilePage /></PageTransition></ProtectedRoute>} />
            <Route path="/staking" element={<ProtectedRoute><PageTransition><StakingPage /></PageTransition></ProtectedRoute>} /> {/* Added StakingPage route */}
            <Route path="/images" element={<ProtectedRoute><PageTransition><ImageGenerationPage /></PageTransition></ProtectedRoute>} />
            <Route path="/media" element={<ProtectedRoute><PageTransition><MediaLibraryPage /></PageTransition></ProtectedRoute>} />
            <Route path="/synapse" element={<ProtectedRoute><PageTransition><SynapsePage /></PageTransition></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><PageTransition><ChatPage /></PageTransition></ProtectedRoute>} />
            <Route path="/videos" element={<ProtectedRoute><PageTransition><VideoPage /></PageTransition></ProtectedRoute>} />
            <Route path="/audio" element={<ProtectedRoute><PageTransition><AudioPage /></PageTransition></ProtectedRoute>} />
            <Route path="/avatar" element={<ProtectedRoute><PageTransition><AvatarPage /></PageTransition></ProtectedRoute>} />
            <Route path="/showcase" element={<ProtectedRoute><PageTransition><ShowcasePage /></PageTransition></ProtectedRoute>} />
            
            {/* AI NFT Collection Builder Routes */}
            <Route path="/collections/my" element={<ProtectedRoute><PageTransition><MyCollectionsPage /></PageTransition></ProtectedRoute>} />
            <Route path="/collections/create" element={<ProtectedRoute><PageTransition><CollectionBuilderPage /></PageTransition></ProtectedRoute>} />
            <Route path="/collections/builder/:id" element={<ProtectedRoute><PageTransition><CollectionBuilderPage /></PageTransition></ProtectedRoute>} />
            <Route path="/compare" element={<ProtectedRoute><PageTransition><ComparisonChatPage /></PageTransition></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><PageTransition><CreditPurchasePage /></PageTransition></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><PageTransition><MarketplacePage /></PageTransition></ProtectedRoute>} />
            <Route path="/credits" element={<ProtectedRoute><PageTransition><CreditPurchasePage /></PageTransition></ProtectedRoute>} />

            <Route path="/admin" element={<AdminRoute><PageTransition><AdminDashboardEnhanced /></PageTransition></AdminRoute>} />
            <Route path="/admin/basic" element={<AdminRoute><PageTransition><AdminDashboardEnhanced /></PageTransition></AdminRoute>} />

            <Route path="/api-keys" element={<ProtectedRoute><PageTransition><ApiKeysPage /></PageTransition></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><PageTransition><ReferralPage /></PageTransition></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <Web3Provider>
              <ToastProvider>
                <Router>
                  <AppContent />
                </Router>
              </ToastProvider>
            </Web3Provider>
          </QueryClientProvider>
        </ThemeProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;