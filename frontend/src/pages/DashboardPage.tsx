import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  CreditCard,
  Image,
  Video,
  Music,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Clock,
  Zap,
  Bot,
  FolderOpen,
  Rocket,
  Target,
  Gift,
  Star
} from 'lucide-react';
import { StatCard, FeatureCard, AnimatedCounter } from '@/components/ui/AnimatedCards';
import { CardSkeleton, ListItemSkeleton } from '@/components/ui/skeleton';
import { NoData } from '@/components/ui/EmptyState';
import GamificationWidget from '@/components/GamificationWidget';
import LeaderboardWidget from '@/components/LeaderboardWidget';
import GuidedTour from '@/components/GuidedTour';
import { motion } from 'framer-motion';
import { apiService } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { useWeb3, ZEX_TOKEN_ADDRESS, ZEXAI_NFT_ADDRESS } from '@/contexts/Web3Context';

interface Activity {
  id: string;
  type: string;
  title: string;
  thumbnail_url?: string;
  credits_charged: number;
  created_at: string;
}

interface UsageSummary {
  service_type: string;
  count: number;
  total_credits: number;
  percentage: number;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { account, zexBalance, isConnecting, connectWallet, disconnectWallet, mintNFT } = useWeb3();
  const [loading, setLoading] = useState(true);
  const [mintUri, setMintUri] = useState('ipfs://');
  const [mintAmount, setMintAmount] = useState(1);
  const [isMinting, setIsMinting] = useState(false);
  const [stats, setStats] = useState({
    credits: 0,
    images: 0,
    videos: 0,
    audio: 0,
    chats: 0,
    totalGenerations: 0,
    generationsToday: 0,
    generationsWeek: 0,
    generationsMonth: 0,
    creditsSpentToday: 0,
    creditsSpentWeek: 0,
    creditsSpentMonth: 0,
    favoriteModel: null as string | null
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [dailyTip, setDailyTip] = useState({ title: '', content: '' });

  useEffect(() => {
    fetchDashboardData();
    setRandomTip();
  }, []);

  const tips = [
    { title: t('dashboard.tip1Header', '💡 Günün İpucu'), content: t('dashboard.tip1Content', 'Synapse ile farklı AI modellerini karşılaştırarak en iyi sonucu alın!') },
    { title: t('dashboard.tip2Header', '🎯 Bilgi'), content: t('dashboard.tip2Content', 'Referans programıyla arkadaşlarınızı davet edin, hem siz hem onlar kredi kazansın!') },
    { title: t('dashboard.tip3Header', '✨ Öneri'), content: t('dashboard.tip3Content', 'Video oluştururken detaylı prompt yazarak daha kaliteli sonuçlar elde edin.') },
    { title: t('dashboard.tip4Header', '🚀 Yenilik'), content: t('dashboard.tip4Content', "Marketplace'te 40+ farklı AI modeli arasından seçim yapabilirsiniz!") },
  ];

  const setRandomTip = () => {
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setDailyTip(randomTip);
  };

  const handleMint = async () => {
    if (!mintUri || mintAmount < 1) return;
    setIsMinting(true);
    try {
      await mintNFT(mintUri.trim(), mintAmount);
    } finally {
      setIsMinting(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all dashboard data in parallel from real API endpoints
      const [statsRes, activityRes, usageRes] = await Promise.allSettled([
        apiService.get<any>('/dashboard/stats'),
        apiService.get<any>('/dashboard/recent-activity'),
        apiService.get<any>('/dashboard/usage-summary'),
      ]);

      // Process stats
      const dashStats = statsRes.status === 'fulfilled' ? (statsRes.value as any) : null;

      // Process usage summary to get per-type counts
      const usageData: UsageSummary[] = usageRes.status === 'fulfilled'
        ? (Array.isArray((usageRes.value as any)) ? (usageRes.value as any) : (usageRes.value as any)?.data || [])
        : [];

      const getTypeCount = (type: string) => {
        const found = usageData.find((u: UsageSummary) => u.service_type === type);
        return found ? found.count : 0;
      };

      const imageCount = getTypeCount('image');
      const videoCount = getTypeCount('video');
      const audioCount = getTypeCount('audio');
      const chatCount = getTypeCount('chat');

      setStats({
        credits: dashStats?.credits_balance || dashStats?.data?.credits_balance || 0,
        images: imageCount,
        videos: videoCount,
        audio: audioCount,
        chats: chatCount,
        totalGenerations: dashStats?.total_generations || dashStats?.data?.total_generations || 0,
        generationsToday: dashStats?.generations_today || dashStats?.data?.generations_today || 0,
        generationsWeek: dashStats?.generations_week || dashStats?.data?.generations_week || 0,
        generationsMonth: dashStats?.generations_month || dashStats?.data?.generations_month || 0,
        creditsSpentToday: dashStats?.credits_spent_today || dashStats?.data?.credits_spent_today || 0,
        creditsSpentWeek: dashStats?.credits_spent_week || dashStats?.data?.credits_spent_week || 0,
        creditsSpentMonth: dashStats?.credits_spent_month || dashStats?.data?.credits_spent_month || 0,
        favoriteModel: dashStats?.favorite_model || dashStats?.data?.favorite_model || null
      });

      // Process recent activity
      const activityData = activityRes.status === 'fulfilled'
        ? (Array.isArray((activityRes.value as any)) ? (activityRes.value as any) : (activityRes.value as any)?.data || [])
        : [];

      setRecentActivity(activityData.slice(0, 6));
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: format relative time
  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return t('dashboard.justNow', 'Az önce');
      if (diffMins < 60) return t('dashboard.minsAgo', '{{mins}} dakika önce', { mins: diffMins });
      if (diffHours < 24) return t('dashboard.hoursAgo', '{{hours}} saat önce', { hours: diffHours });
      if (diffDays < 7) return t('dashboard.daysAgo', '{{days}} gün önce', { days: diffDays });
      return date.toLocaleDateString('tr-TR');
    } catch {
      return dateStr;
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, { icon: React.ReactNode; color: string }> = {
      image: { icon: <Image className="w-5 h-5" />, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
      video: { icon: <Video className="w-5 h-5" />, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
      audio: { icon: <Music className="w-5 h-5" />, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
      chat: { icon: <MessageSquare className="w-5 h-5" />, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' },
    };
    return icons[type] || { icon: <Zap className="w-5 h-5" />, color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' };
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greetingMorning', 'Günaydın');
    if (hour < 18) return t('dashboard.greetingAfternoon', 'İyi günler');
    return t('dashboard.greetingEvening', 'İyi akşamlar');
  };

  // Monthly generation target progress
  const creditUsagePercent = Math.min(100, (stats.generationsMonth / 100) * 100);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Skeleton */}
        <div className="animate-pulse">
          <div className="h-8 w-72 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </div>
        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        {/* Template Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-[2rem] bg-gray-200 dark:bg-gray-700 animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          ))}
        </div>
        {/* Activity Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
        <style>{`
          @keyframes shimmer {
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <GuidedTour />
      {/* Welcome Header with Tip Banner */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="relative flex items-center justify-center w-14 h-14">
                <div className="absolute inset-2 bg-purple-500 rounded-full blur-xl opacity-20" />
                <img src="/logo192.png" alt="ZexAi Logo" className="relative w-14 h-14 object-contain drop-shadow-lg" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {greeting()}, {user?.full_name || user?.email?.split('@')[0]}!
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 ml-[72px] text-base">
              {t('dashboard.summarySubtitle', 'AI hizmetlerinizin bugünkü özeti')}
            </p>
          </div>

          {/* Daily Tip Banner */}
          <div className="lg:max-w-md">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {dailyTip.title}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                {dailyTip.content}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={t('dashboard.creditBalance', 'Kredi Bakiyesi')}
          value={<AnimatedCounter value={Math.round(stats.credits)} />}
          subtitle={stats.creditsSpentToday > 0 ? t('dashboard.spentToday', 'Bugün {{count}} kredi harcandı', { count: Math.round(stats.creditsSpentToday) }) : t('dashboard.noSpendToday', 'Bugün harcama yok')}
          icon={CreditCard}
          variant="info"
        />
        <StatCard
          title={t('dashboard.generatedImages', 'Oluşturulan Görseller')}
          value={<AnimatedCounter value={stats.images} />}
          subtitle={t('dashboard.monthTotalGen', 'Bu ay toplam {{count}} üretim', { count: stats.generationsMonth })}
          icon={Image}
          variant="success"
        />
        <StatCard
          title={t('dashboard.generatedVideos', 'Oluşturulan Videolar')}
          value={<AnimatedCounter value={stats.videos} />}
          subtitle={stats.favoriteModel ? t('dashboard.favModel', 'Favori model: {{model}}', { model: stats.favoriteModel }) : t('dashboard.noVideoGen', 'Bu ay video üretimi yok')}
          icon={Video}
          variant="default"
        />
        <StatCard
          title={t('dashboard.audioAndChat', 'Ses & Chat')}
          value={<AnimatedCounter value={stats.audio + stats.chats} />}
          subtitle={t('dashboard.audioChatSubtitle', '{{audio}} ses, {{chats}} sohbet', { audio: stats.audio, chats: stats.chats })}
          icon={Music}
          variant="success"
        />
      </div>

      {/* Web3 Panel */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{t('dashboard.web3Title', 'Web3 Cüzdan')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.web3Subtitle', 'Geçerli Ethereum / BSC ağları üzerinden bağlanıldı.')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {account ? (
                <>
                  <button
                    onClick={disconnectWallet}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('dashboard.walletBtnDisconnect', 'Cüzdanı Ayır')}
                  </button>
                </>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition-colors"
                >
                  {isConnecting ? t('dashboard.walletBtnConnecting', 'Bağlanıyor…') : t('dashboard.walletBtnConnect', 'Cüzdan Bağla')}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('dashboard.walletInfoLabel', 'Cüzdan')}</p>
              <p className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                {account || t('dashboard.walletNotConnected', 'Bağlı değil')}
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {t('dashboard.walletBalance', 'ZEX bakiyesi')}: <span className="font-semibold">{zexBalance}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('dashboard.contractsLabel', 'Kontratlar')}</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                ZEX: <span className="font-mono text-xs break-all">{ZEX_TOKEN_ADDRESS}</span>
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                NFT: <span className="font-mono text-xs break-all">{ZEXAI_NFT_ADDRESS}</span>
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Gamification & Leaderboard Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <GamificationWidget
            imagesCount={stats.images}
            videosCount={stats.videos}
            audioCount={stats.audio}
            chatsCount={stats.chats}
          />
        </div>
        <div className="lg:col-span-1">
          <LeaderboardWidget />
        </div>
      </div>

      {/* Progress Row */}
      <div className="mb-12">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm">{t('dashboard.monthlyTargetTitle', 'Aylık Üretim Hedefi')}</h3>
            </div>
            <span className="text-sm font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">{stats.generationsMonth} / 100</span>
          </div>
          <div className="relative h-4 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden p-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${creditUsagePercent}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            />
          </div>
          <div className="flex justify-between mt-3 text-xs text-gray-400">
            <span>{t('dashboard.todayGen', 'Bugün: {{count}} üretim', { count: stats.generationsToday })}</span>
            <span>{t('dashboard.weekGen', 'Bu hafta: {{count}} üretim', { count: stats.generationsWeek })}</span>
          </div>
        </div>
      </div>

      {/* Magic Templates Section - Phase 3 */}
      <div id="magic-templates" className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-amber-500 fill-amber-500 animate-pulse" />
            {t('dashboard.magicTemplatesTitle', 'Sihirli Şablonlar')}
          </h2>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase">{t('dashboard.oneClickGen', 'Tek Tıkla Üret')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: t('dashboard.cyberpunkTemplateTitle', 'Cyberpunk Şehir'),
              image: "/templates/cyberpunk_city.png",
              prompt: "A stunning, hyper-realistic cyberpunk city at night with neon signs, flying cars, cinematic lighting",
              color: "from-blue-600/80 to-purple-600/80"
            },
            {
              title: t('dashboard.portraitTemplateTitle', 'Sinematik Portre'),
              image: "/templates/cinematic_portrait.png",
              prompt: "Breathtaking cinematic portrait of a futuristic warrior, intricate armor, dramatic rim lighting",
              color: "from-amber-600/80 to-orange-600/80"
            },
            {
              title: t('dashboard.landscapeTemplateTitle', 'Rüya Manzarası'),
              image: "/templates/dreamy_landscape.png",
              prompt: "Magical dreamy floating island landscape with waterfalls, exotic purple trees, bioluminescent plants",
              color: "from-emerald-600/80 to-teal-600/80"
            },
            {
              title: t('dashboard.characterTemplateTitle', '3D Karakter'),
              image: "/templates/3d_character.png",
              prompt: "Cute 3D character render of a small robot explorer, Pixar style, soft subsurface scattering",
              color: "from-pink-600/80 to-rose-600/80"
            }
          ].map((template, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative aspect-[4/5] rounded-[2rem] overflow-hidden group cursor-pointer shadow-xl isolate"
              onClick={() => navigate(`/images?prompt=${encodeURIComponent(template.prompt)}`)}
            >
              <img
                src={template.image}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt={template.title}
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${template.color} opacity-40 group-hover:opacity-60 transition-opacity`} />
              <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end h-1/2 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent">
                <p className="text-white font-black text-xl mb-1">{template.title}</p>
                <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                  {t('dashboard.useTemplate', 'Şablonu Kullan')} <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions - 6 items including Synapse and Kütüphane */}
      <div id="quick-actions" className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Rocket className="w-5 h-5 text-indigo-500" />
          {t('dashboard.quickActionsTitle', 'Hızlı Aksiyonlar')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <FeatureCard
            icon={Image}
            title={t('dashboard.genImage', 'Görsel Oluştur')}
            description={t('dashboard.genImageDesc', 'AI ile görseller')}
            onClick={() => navigate('/images')}
          />
          <FeatureCard
            icon={Video}
            title={t('dashboard.genVideo', 'Video Oluştur')}
            description={t('dashboard.genVideoDesc', "Metin'den video")}
            onClick={() => navigate('/videos')}
            badge={t('dashboard.popularBadge', 'Popüler')}
          />
          <FeatureCard
            icon={Music}
            title={t('dashboard.audioTools', 'Ses Araçları')}
            description={t('dashboard.audioToolsDesc', 'TTS & Müzik')}
            onClick={() => navigate('/audio')}
          />
          <FeatureCard
            icon={MessageSquare}
            title={t('dashboard.aiChat', 'AI Sohbet')}
            description={t('dashboard.aiChatDesc', 'Akıllı asistan')}
            onClick={() => navigate('/chat')}
          />
          <FeatureCard
            icon={Bot}
            title="Synapse"
            description={t('dashboard.synapseDesc', 'Model karşılaştır')}
            onClick={() => navigate('/synapse')}
            badge={t('dashboard.newBadge', 'Yeni')}
          />
          <FeatureCard
            icon={FolderOpen}
            title={t('dashboard.library', 'Kütüphane')}
            description={t('dashboard.libraryDesc', 'Tüm içerikler')}
            onClick={() => navigate('/media')}
          />
        </div>
      </div>

      {/* Bottom Row: Recent Activity + Marketplace Promo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('dashboard.recentActivitiesTitle', 'Son Aktiviteler')}
              </h2>
            </div>
            <button
              onClick={() => navigate('/media')}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
            >
              {t('dashboard.seeAll', 'Tümünü Gör')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <NoData title={t('dashboard.noActivityTitle', 'Henüz aktivite yok')} description={t('dashboard.noActivityDesc', 'Bir AI hizmeti kullandığınızda aktiviteleriniz burada görünür.')} />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentActivity.map((activity) => {
                const { icon, color } = getActivityIcon(activity.type);
                return (
                  <div
                    key={activity.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {activity.thumbnail_url ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={activity.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={`p-2 rounded-xl ${color}`}>
                          {icon}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
                          {activity.title || t('dashboard.aiGeneration', 'AI Üretimi')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(activity.created_at)}
                        </p>
                      </div>
                    </div>
                    {activity.credits_charged > 0 && (
                      <span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-sm font-medium flex-shrink-0">
                        {t('dashboard.creditsSpentRow', '-{{count}} kredi', { count: Math.round(activity.credits_charged) })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Marketplace Promo Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/25 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-6 h-6" />
              <h3 className="font-semibold">{t('dashboard.marketplacePromoTitle', 'Model Marketplace')}</h3>
            </div>
            <p className="text-emerald-100 text-sm mb-2">
              {t('dashboard.marketplacePromoDesc', '40+ AI modeli arasından seçim yapın')}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs">FLUX</span>
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs">Kling</span>
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs">GPT-4</span>
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs">+37</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/marketplace')}
            className="w-full py-2.5 bg-white text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {t('dashboard.discoverBtn', 'Keşfet')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Referral Promo Card - Animated */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-6 text-white shadow-xl shadow-purple-500/30">
        {/* Animated Background Particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-32 h-32 bg-white/10 rounded-full -top-16 -right-16 animate-pulse" />
          <div className="absolute w-24 h-24 bg-white/5 rounded-full bottom-8 -left-12 animate-bounce" style={{ animationDuration: '3s' }} />
          <div className="absolute w-4 h-4 bg-yellow-400 rounded-full top-8 right-12 animate-ping" />
        </div>

        <div className="relative z-10">
          {/* Floating Coin Icon */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-50" />
              <div className="relative p-2.5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full shadow-lg">
                <span className="text-lg">💰</span>
              </div>
            </div>
            <div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                {t('dashboard.passiveIncomeBadge', '✨ Pasif Gelir')}
              </span>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-1">
            {t('dashboard.lifetimeEarnTitle', '%1 Ömür Boyu Kazanç')}
          </h3>
          <p className="text-purple-100 text-sm mb-4">
            {t('dashboard.lifetimeEarnDesc', 'Davet ettiğin kişilerin tüm alışverişlerinden')}
          </p>

          <button
            onClick={() => navigate('/referral')}
            className="w-full py-2.5 bg-white text-purple-600 hover:bg-purple-50 rounded-xl text-sm font-bold transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            {t('dashboard.startNowBtn', '🚀 Hemen Başla')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;