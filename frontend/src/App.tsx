import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';

import ImageGenerationPage from '@/pages/ImageGenerationPage';
import MediaLibraryPage from '@/pages/MediaLibraryPage';
import SynapsePage from '@/pages/SynapsePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { BillingPage } from '@/pages/BillingPage';
import CreditPurchasePage from '@/pages/CreditPurchasePage';
import ChatPage from '@/pages/ChatPage';
import VideoPage from '@/pages/VideoPage';
import AudioPage from '@/pages/AudioPage';
import AvatarPage from '@/pages/AvatarPage';
import ShowcasePage from '@/pages/ShowcasePage';
import { ComparisonChatPage } from '@/pages/ComparisonChatPage';
import { AdminDashboardEnhanced } from '@/pages/AdminDashboardEnhanced';
import { ApiKeysPage } from '@/pages/ApiKeysPage';
import ReferralPage from '@/pages/ReferralPage';
import MarketplacePage from '@/pages/MarketplacePage';
import StakingPage from '@/pages/StakingPage'; // Added StakingPage import
import { useAuthStore } from '@/store/authStore';
import { ToastProvider } from './components/ui/toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { WagmiProvider } from 'wagmi';
import { config } from './web3config';
import { Web3Provider } from '@/contexts/Web3Context';
import './index.css';

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

function AppContent() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route element={<Layout />}>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><PageTransition><LoginPage /></PageTransition></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><PageTransition><RegisterPage /></PageTransition></PublicRoute>} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

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
          <Route path="/compare" element={<ProtectedRoute><PageTransition><ComparisonChatPage /></PageTransition></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><PageTransition><BillingPage /></PageTransition></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute><PageTransition><MarketplacePage /></PageTransition></ProtectedRoute>} />
          <Route path="/credits" element={<ProtectedRoute><PageTransition><CreditPurchasePage /></PageTransition></ProtectedRoute>} />

          <Route path="/admin" element={<AdminRoute><PageTransition><AdminDashboardEnhanced /></PageTransition></AdminRoute>} />
          <Route path="/admin/basic" element={<AdminRoute><PageTransition><AdminDashboardEnhanced /></PageTransition></AdminRoute>} />

          <Route path="/api-keys" element={<ProtectedRoute><PageTransition><ApiKeysPage /></PageTransition></ProtectedRoute>} />
          <Route path="/referral" element={<ProtectedRoute><PageTransition><ReferralPage /></PageTransition></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
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