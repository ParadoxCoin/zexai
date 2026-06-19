import { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ErrorBoundary from './components/ErrorBoundary';
import { Twitter, Mail, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GrokAssistant } from './components/GrokAssistant';
import TickerBar from './components/TickerBar';
import ParticleNetwork from './components/ParticleNetwork';
import NFTGallery from './components/NFTGallery';

// Route-level lazy loading (dynamic imports) to minimize initial bundle size
const WhitepaperPage = lazy(() => import('./pages/WhitepaperPage'));
const MarkdownPage = lazy(() => import('./pages/MarkdownPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const SEOPage = lazy(() => import('./pages/SEOPage'));

// Web3 Imports
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './web3config';

const queryClient = new QueryClient();

// Premium HSL-glow styled loading screen for lazy route transition
const RouteLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#070913] text-slate-100 font-sans relative overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] pointer-events-none bg-cyan-500/10 z-0 animate-pulse" />
    <div className="relative flex flex-col items-center gap-4 z-10">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-white/5 border-t-cyan-500 animate-spin" />
        <div className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 blur-md opacity-50" />
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-slate-300 via-white to-slate-500 bg-clip-text text-transparent animate-pulse">
        ZexAi Yükleniyor...
      </div>
    </div>
  </div>
);

function Home() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
    { question: t('faq.q5'), answer: t('faq.a5') },
    { question: t('faq.q6'), answer: t('faq.a6') },
    { question: t('faq.q7'), answer: t('faq.a7') },
    { question: t('faq.q8'), answer: t('faq.a8') },
    { question: t('faq.q9'), answer: t('faq.a9') },
    { question: t('faq.q10'), answer: t('faq.a10') }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <>
      <main>
        <Hero />
        <NFTGallery />
      </main>

      {/* FAQ Section */}
      <section className="py-24 px-4 mx-auto max-w-4xl sm:px-6 lg:px-8 relative z-10">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-full bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="text-center mb-16 relative">
          <h2 className="text-4xl md:text-5xl font-black mb-4">{t('faq.title')}</h2>
          <p className="text-gray-400">{t('faq.subtitle')}</p>
        </div>

        <div className="space-y-4 relative">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all hover:bg-white/[0.07]"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="font-semibold text-lg text-white pr-8">{faq.question}</span>
                <motion.div
                  animate={{ rotate: openFaq === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-6 pb-5 pt-2 text-gray-400 leading-relaxed border-t border-white/5 mt-2">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050510] py-12 mt-10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img src="/logo192.png" alt="ZexAi" className="w-8 h-8" />
                <span className="text-2xl font-black tracking-tighter">ZexAI</span>
              </div>
              <p className="text-gray-400 max-w-sm leading-relaxed">
                The world's first all-in-one AI intelligence ecosystem bridging Web3, 40+ AI models, and physical robotics.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link to="/whitepaper" className="hover:text-teal-400 transition-colors">Whitepaper</Link></li>
                <li><Link to="/docs" className="hover:text-teal-400 transition-colors">Documentation</Link></li>
                <li><Link to="/alternatives/chatgpt" className="hover:text-teal-400 transition-colors">ChatGPT Alternative</Link></li>
                <li><Link to="/solutions/crypto-trading" className="hover:text-teal-400 transition-colors">AI Crypto Trading</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link to="/terms" className="hover:text-teal-400 transition-colors">{t('footer.terms')}</Link></li>
                <li><Link to="/privacy" className="hover:text-teal-400 transition-colors">{t('footer.privacy')}</Link></li>
                <li><Link to="/blog/top-ai-tools-2026" className="hover:text-teal-400 transition-colors">Top AI Tools 2026</Link></li>
                <li><a href="https://x.com/ZexAi_io" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">Twitter (X)</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-gray-500 text-sm font-medium">{t('footer.copyright')}</span>
            <div className="flex gap-6">
              <a href="https://discord.gg/zexai" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <img src="/logo192.png" alt="Discord" className="w-5 h-5 grayscale opacity-50 hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && /^0x[a-fA-F0-9]{40}$/.test(ref)) {
      localStorage.setItem('zexai_presale_ref', ref);
    }
  }, []);

  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <Router>
            <div className="min-h-screen text-white selection:bg-teal-500/30 font-sans relative pt-8">
              <TickerBar />
              <ParticleNetwork />
              <div className="premium-bg" />
              <GrokAssistant />
              <Navbar />

              {/* Floating Social Media & Contact Icons */}
              <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
                <a href="https://x.com/ZexAi_io" target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-[#1DA1F2] hover:bg-white/10 hover:scale-110 transition-all shadow-lg backdrop-blur-sm group animate-pulse hover:animate-none">
                  <Twitter className="w-6 h-6 group-hover:-rotate-12 transition-transform" />
                </a>
                <a href="mailto:info@zexai.io" className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-white/10 hover:scale-110 transition-all shadow-lg backdrop-blur-sm group animate-pulse hover:animate-none" style={{ animationDelay: '0.5s' }}>
                  <Mail className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                </a>
              </div>

              <Suspense fallback={<RouteLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/whitepaper" element={<WhitepaperPage />} />
                <Route path="/terms" element={<MarkdownPage fileUrlTemplate="/ZEX_TERMS_{LANG}.md" titleKey="markdown.termsTitle" />} />
                <Route path="/privacy" element={<MarkdownPage fileUrlTemplate="/ZEX_PRIVACY_{LANG}.md" titleKey="markdown.privacyTitle" />} />
                
                {/* Critical Competitor Hijack Pages */}
                <Route path="/alternatives/chatgpt" element={
                  <SEOPage 
                    title="Best ChatGPT Plus Alternative: Save 40% with ZexAI"
                    subtitle="Why pay $20/month for just one model? Get GPT-4o, Claude 3.5, and Grok 1.5 in one place for much less."
                    content="ChatGPT Plus is the gold standard, but ZexAI is the future of efficiency. By unifying the world's most powerful AI models into a single subscription, we enable you to switch between GPT, Claude, and Gemini instantly. Stop the 'subscription creep' and save 20-40% on your monthly AI costs while gaining superior flexibility. Access 40+ models without the overhead."
                    benefits={[
                      "Access GPT-4o, Claude 3.5 & Grok 1.5",
                      "20-40% Cheaper than Multiple Subscriptions",
                      "No Message Caps on High-End Models",
                      "Integrated Web3 Rewards & Staking"
                    ]}
                    ctaText="Start Saving on AI"
                    targetKeywords={["chatgpt plus alternative", "cheap gpt-4 access", "all in one ai subscription"]}
                  />
                } />

                <Route path="/alternatives/midjourney" element={
                  <SEOPage 
                    title="Midjourney Alternative: Pro Generation + NFT Minting"
                    subtitle="Stunning AI art without the Discord hassle. High-fidelity models plus 1-click monetization."
                    content="Midjourney is powerful but complex to manage. ZexAI offers a premium web-based interface with high-fidelity image generation models that rival the best in the industry. Plus, we integrate the monetization layer directly—mint your creations as NFTs and sell them on OpenSea/Zora instantly. More power, less cost, and direct ownership."
                    benefits={[
                      "Professional Grade Image Generation",
                      "No Discord Required - Pure Web Interface",
                      "Direct NFT Minting & Sales Integration",
                      "Save 30% vs Pro Art Subscriptions"
                    ]}
                    ctaText="Create & Monetize Now"
                    targetKeywords={["midjourney alternative", "best ai art generator 2026", "monetize ai art"]}
                  />
                } />

                <Route path="/solutions/save-on-ai" element={
                  <SEOPage 
                    title="How to Save 40% on Your Monthly AI Subscriptions"
                    subtitle="The era of paying for 5 different AI tools is over. Welcome to the era of Unified Intelligence."
                    content="The average AI power user spends over $60/month on various subscriptions. ZexAI cuts that cost by up to 40% by providing a single gateway to every major model. Whether you need writing, coding, or image generation, we've bundled it all into one premium ecosystem. Optimization isn't just about the models; it's about the wallet."
                    benefits={[
                      "Single Subscription for All Major Models",
                      "Transparent & Fair Credit System",
                      "Volume Discounts for Power Users",
                      "Earn Credits through Referrals & Socials"
                    ]}
                    ctaText="Optimize Your AI Costs"
                    targetKeywords={["save money on ai", "cheapest ai subscription", "ai cost comparison"]}
                  />
                } />

                <Route path="/solutions/crypto-trading" element={
                  <SEOPage 
                    title="AI Trading Assistant for Crypto: Maximize Your Gains"
                    subtitle="Harness the power of neural networks to analyze markets, generate signals, and automate your crypto trading strategy with ZexAI."
                    content="ZexAI's crypto intelligence suite is designed for the modern Web3 investor. By combining multi-model AI analysis with real-time blockchain data, we provide an unfair advantage in the volatile crypto markets. From sentiment analysis to automated signal generation, ZexAI is your 24/7 quant partner."
                    benefits={[
                      "Real-time Market Sentiment Analysis",
                      "Automated Trading Signal Generation",
                      "$ZEX Token Ecosystem Benefits",
                      "Secure Web3 Wallet Integration"
                    ]}
                    ctaText="Boost Your Trading with AI"
                    targetKeywords={["ai trading assistant crypto", "crypto ai signals", "automated crypto trading"]}
                  />
                } />
                
                <Route path="/blog/top-ai-tools-2026" element={
                  <SEOPage 
                    title="50 Best AI Tools in 2026 (The Ultimate Categorized List)"
                    subtitle="Stop searching, start building. We've curated the most impactful AI tools across productivity, design, coding, and crypto."
                    content="The AI explosion has created thousands of tools, but only a few deliver real value. At ZexAI, we analyze the entire ecosystem to bring you the best of the best. This list covers everything from enterprise automation to creative AI, with a special focus on how ZexAI integrates the top models into a single workflow."
                    benefits={[
                      "Categorized for Efficiency",
                      "Updated for 2026 Trends",
                      "Expert Reviews & Comparisons",
                      "Direct Links to Top Platforms"
                    ]}
                    ctaText="Explore the AI Ecosystem"
                    targetKeywords={["best ai tools", "ai tool list 2026", "ai tools for business"]}
                  />
                } />

                {/* Competitor Hijack Pages */}
                <Route path="/alternatives/poe" element={
                  <SEOPage 
                    title="Best Poe.com Alternative for Advanced AI Users"
                    subtitle="Tired of message limits and limited model variety? ZexAI provides a more robust ecosystem for power users."
                    content="While Poe is a great entry point, ZexAI is built for the next generation of AI power users. We provide access to the same high-end models (Claude 3, GPT-4, Grok) but integrate them with a Web3 economy that rewards your participation. No more arbitrary limits—just pure intelligence at your fingertips."
                    benefits={[
                      "Higher Message Limits for Pro Models",
                      "Integrated Web3 Rewards & Staking",
                      "40+ Models vs Poe's Limited Selection",
                      "Customizable AI Workflow Engine"
                    ]}
                    ctaText="Switch to ZexAI Today"
                    targetKeywords={["poe alternative", "best ai chatbot 2026", "claude 3 access platform"]}
                  />
                } />

                <Route path="/alternatives/perplexity" element={
                  <SEOPage 
                    title="ZexAI vs Perplexity: AI Search Reimagined for Web3"
                    subtitle="Why just search when you can research, analyze, and trade? The ultimate intelligence tool for crypto investors."
                    content="Perplexity is excellent for general search, but ZexAI is specialized for the Web3 and Robotics era. Our platform combines deep research capabilities with real-time blockchain data analysis and automated trading signals. Get the answers you need and execute your strategy in one place."
                    benefits={[
                      "Deep Web3 & Crypto Market Research",
                      "Real-time Blockchain Data Analysis",
                      "Automated Signal Execution",
                      "Institutional Grade Intelligence"
                    ]}
                    ctaText="Upgrade Your Research"
                    targetKeywords={["perplexity alternative", "ai search for crypto", "web3 research tools"]}
                  />
                } />

                <Route path="/alternatives/krea" element={
                  <SEOPage 
                    title="The Best Krea.ai Alternative for NFT Artists"
                    subtitle="Generate stunning AI art and mint it instantly as an NFT on OpenSea and Zora."
                    content="Krea.ai offers beautiful generations, but what's next? ZexAI closes the loop between creation and monetization. Use our high-fidelity generation models and turn your masterpieces into digital assets with a single click. Own your art, monetize your vision, and build your brand on the blockchain."
                    benefits={[
                      "Higher Fidelity Generation Models",
                      "1-Click NFT Minting (OpenSea/Zora)",
                      "Creator Economy & Royalty Support",
                      "Direct Social Sharing & Verification"
                    ]}
                    ctaText="Start Minting Your Art"
                    targetKeywords={["krea ai alternative", "best ai art generator 2026", "mint ai art as nft"]}
                  />
                } />

                <Route path="/alternatives/pollo" element={
                  <SEOPage 
                    title="Pollo.ai Alternative: Multi-Model AI Video & Image Engine"
                    subtitle="Go beyond simple generations. Access 40+ models and monetize your creative output on the blockchain."
                    content="Pollo.ai focuses on generation, but ZexAI focuses on the entire lifecycle of a creator. Access the world's most advanced video and image models in one place, compare results, and instantly transform them into valuable digital assets. With ZexAI, you are not just a user; you are an owner in a decentralized creative economy."
                    benefits={[
                      "Cinema-Grade Video Generation Models",
                      "Multi-Model Comparison Engine",
                      "Direct Web3 Monetization Layer",
                      "20-40% Better Pricing vs Standalone Tools"
                    ]}
                    ctaText="Enter the Creative Future"
                    targetKeywords={["pollo ai alternative", "ai video generator 2026", "multi model ai creative"]}
                  />
                } />

                <Route path="/alternatives/abacus" element={
                  <SEOPage 
                    title="Abacus.ai Alternative: Agile Enterprise Intelligence"
                    subtitle="Complex enterprise AI simplified. The most powerful AI agents meet the Web3 and Robotics revolution."
                    content="Abacus.ai is built for large enterprises, but ZexAI is built for the agile pioneers of the future. We provide the same high-level model access and agentic capabilities but with the added power of Web3 integration and a physical robotics layer. Build, deploy, and scale your intelligence with a platform that moves as fast as you do."
                    benefits={[
                      "Agentic AI Workflows for Startups",
                      "Integrated Robotic Intelligence Layer",
                      "Native $ZEX Token Governance",
                      "Simpler, More Intuitive User Experience"
                    ]}
                    ctaText="Deploy Your Intelligence"
                    targetKeywords={["abacus ai alternative", "ai agent platform 2026", "enterprise ai for startups"]}
                  />
                } />
              </Routes>
            </Suspense>
          </div>
          </Router>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;
