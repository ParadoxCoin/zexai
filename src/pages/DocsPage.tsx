import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Terminal, Box, Shield, Zap, BookOpen, Bot, ArrowLeft } from 'lucide-react';

const DocsPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState('welcome');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sidebarNav = [
        { id: 'welcome', label: 'Welcome to ZexAI', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'quickstart', label: 'Quickstart', icon: <Zap className="w-4 h-4" /> },
        { id: 'auth', label: 'Authentication', icon: <Shield className="w-4 h-4" /> },
        { id: 'api', label: 'AI Generation API', icon: <Box className="w-4 h-4" /> },
        { id: 'robot', label: 'Robot Control SDK', icon: <Bot className="w-4 h-4" /> }
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'welcome':
                return (
                    <div className="space-y-6 text-gray-300 text-left">
                        <h1 className="text-4xl font-black text-white mb-6">ZexAI Developer Platform</h1>
                        <p className="text-lg leading-relaxed">
                            Welcome to the official ZexAI Server & SDK documentation. ZexAI provides the infrastructure to bridge state-of-the-art multi-model artificial intelligence with Web3 monetization and physical robotic agents.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-teal-500/50 transition-colors cursor-pointer group" onClick={() => setActiveSection('api')}>
                                <Box className="w-8 h-8 text-teal-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-xl font-bold text-white mb-2">Rest API</h3>
                                <p className="text-sm text-gray-400">Generate images, video, and audio through a unified API endpoint covering over 40+ models.</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-indigo-500/50 transition-colors cursor-pointer group" onClick={() => setActiveSection('robot')}>
                                <Bot className="w-8 h-8 text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-xl font-bold text-white mb-2">Robot SDK</h3>
                                <p className="text-sm text-gray-400">Connect to your humanoid robots and push autonomous AI behavior modules directly via our cloud.</p>
                            </div>
                        </div>
                    </div>
                );
            case 'quickstart':
                return (
                    <div className="space-y-8 text-gray-300 text-left">
                        <h1 className="text-4xl font-black text-white mb-2">Quickstart</h1>
                        <p className="text-lg mb-8">Get up and running with the ZexAI SDK in less than five minutes.</p>

                        <h3 className="text-2xl font-bold text-white mt-10 mb-4">1. Install the SDK</h3>
                        <p className="mb-4">Install the package via npm, yarn, or pnpm.</p>
                        <div className="bg-[#0A0A1F] border border-white/10 rounded-xl p-4 overflow-x-auto shadow-inner">
                            <code className="text-sm text-gray-300 font-mono">
                                <span className="text-cyan-400">npm</span> install @zexai/sdk
                            </code>
                        </div>

                        <h3 className="text-2xl font-bold text-white mt-10 mb-4">2. Initialize the Client</h3>
                        <p className="mb-4">Import the SDK and initialize it with your API key. You can create an API key in your ZexAI Web3 Dashboard.</p>
                        <div className="bg-[#0A0A1F] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                            <div className="px-4 py-2 border-b border-white/10 flex items-center bg-white/[0.02]">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                </div>
                                <span className="ml-4 text-xs font-mono text-gray-500">index.ts</span>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                <pre className="text-sm text-gray-300 font-mono leading-relaxed">
<span className="text-purple-400">import</span> {'{'} ZexClient {'}'} <span className="text-purple-400">from</span> <span className="text-green-300">'@zexai/sdk'</span>;{'\n\n'}
<span className="text-purple-400">const</span> client = <span className="text-purple-400">new</span> ZexClient({'{'}{'\n'}
{'  '}apiKey: process.env.ZEX_API_KEY,{'\n'}
{'  '}network: <span className="text-green-300">'polygon-mainnet'</span>{'\n'}
{'}'});{'\n\n'}
<span className="text-gray-500">// You're ready to go! Start generating.</span>
                                </pre>
                            </div>
                        </div>
                    </div>
                );
            case 'auth':
                return (
                    <div className="space-y-6 text-gray-300 text-left">
                        <h1 className="text-4xl font-black text-white mb-6">Authentication</h1>
                        <p className="text-lg leading-relaxed">
                            The ZexAI API utilizes Bearer token authentication. Your API keys carry many privileges spanning from digital Generation limits to physical hardware access, so be sure to keep them extraordinarily secure! Do not share your secret API keys in publicly accessible areas such as GitHub, client-side code, and so forth.
                        </p>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mt-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                            <span className="text-red-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Warning
                            </span>
                            <p className="text-sm text-red-200 mt-2 leading-relaxed">All API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail.</p>
                        </div>
                    </div>
                );
            case 'api':
               return (
                    <div className="space-y-6 text-gray-300 text-left">
                        <h1 className="text-4xl font-black text-white mb-6">AI Generation API</h1>
                        <p className="text-lg leading-relaxed">
                            The core element of ZexAI is the Unified Generation API, providing an abstraction layer over 40+ leading image, video, and audio models via a single standardized format.
                        </p>
                        
                        <div className="bg-[#0A0A1F] border border-white/10 rounded-xl overflow-hidden mt-6 shadow-2xl">
                            <div className="p-4 bg-white/[0.02] border-b border-white/10 flex items-center">
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-[10px] font-black mr-3 uppercase tracking-wider">POST</span>
                                <code className="text-sm font-mono text-gray-400">/v1/generate/image</code>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                <pre className="text-sm text-gray-300 font-mono leading-relaxed">
<span className="text-purple-400">const</span> response = <span className="text-purple-400">await</span> client.generate.image({'{'}{'\n'}
{'  '}model: <span className="text-green-300">'flux-pro'</span>,{'\n'}
{'  '}prompt: <span className="text-green-300">'A cinematic shot of a futuristic robot, neon lighting'</span>,{'\n'}
{'  '}resolution: <span className="text-green-300">'1024x1024'</span>,{'\n'}
{'  '}mintAsNft: <span className="text-orange-400">true</span> <span className="text-gray-500">// Automatically mints to your Web3 wallet</span>{'\n'}
{'}'});
                                </pre>
                            </div>
                        </div>
                    </div>
                );
            case 'robot':
               return (
                    <div className="space-y-6 text-gray-300 text-left">
                        <h1 className="text-4xl font-black text-white mb-6">Robot Control SDK</h1>
                        <p className="text-lg leading-relaxed">
                            ZexAI isn't just software. Use the Robot SDK to directly purchase and push AI behavior modules (Personalities) to physical hardware devices out in the field. 
                        </p>
                        
                        <div className="mt-8">
                            <h3 className="text-xl font-bold text-white mb-4">Deploying an AI Action Module</h3>
                            <div className="bg-[#0A0A1F] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                <div className="p-4 bg-indigo-500/10 border-b border-white/10 flex items-center">
                                    <Terminal className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div className="p-6 overflow-x-auto">
                                    <pre className="text-sm text-gray-300 font-mono leading-relaxed">
<span className="text-gray-500">// Connecting to Unitree G1 robot...</span>{'\n'}
<span className="text-purple-400">const</span> robot = <span className="text-purple-400">await</span> client.robot.connect(<span className="text-green-300">'unitree-g1-sn8241'</span>);{'\n\n'}
<span className="text-gray-500">// Upload a complex Synapse behavior routine</span>{'\n'}
<span className="text-purple-400">await</span> robot.deployModule({'{'}{'\n'}
{'  '}moduleId: <span className="text-green-300">'companion-ai-v2'</span>,{'\n'}
{'  '}payment: {'{'}{'\n'}
{'    '}token: <span className="text-green-300">'$ZEX'</span>,{'\n'}
{'    '}autoApprove: <span className="text-orange-400">true</span>{'\n'}
{'  '}{'}'}{'\n'}
{'}'});{'\n\n'}
<span className="text-gray-500">// Trigger an action immediately</span>{'\n'}
<span className="text-purple-400">await</span> robot.executeAction(<span className="text-green-300">'wave_hello'</span>);
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="min-h-screen bg-[#060612] text-white selection:bg-teal-500/30 flex flex-col font-sans">
            <div className="flex flex-1 border-t mt-16 border-white/10 max-w-[1600px] w-full mx-auto relative h-[calc(100vh-64px)] overflow-hidden">
                
                {/* Left Sidebar */}
                <aside className="w-72 border-r border-white/10 bg-[#050510] h-full overflow-y-auto hidden md:block shrink-0 z-20">
                    <div className="p-8">
                        <Link to="/" className="text-gray-400 hover:text-white flex items-center gap-2 mb-10 text-sm font-bold transition-colors uppercase tracking-widest">
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </Link>
                        
                        <div className="relative mb-8">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Search documentation..." 
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600 shadow-inner"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-black text-gray-600 uppercase tracking-widest mb-4 px-2">Getting Started</div>
                            {sidebarNav.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all text-left ${
                                        activeSection === item.id 
                                        ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-300 font-bold border border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.1)]' 
                                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent font-medium'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={activeSection === item.id ? 'opacity-100 text-indigo-400' : 'opacity-50'}>{item.icon}</span>
                                        {item.label}
                                    </div>
                                    {activeSection === item.id && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 bg-[#060612] h-full overflow-y-auto relative scroll-smooth p-6 lg:p-0">
                    {/* Background glows */}
                    <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-teal-900/10 blur-[150px] rounded-full pointer-events-none" />
                    <div className="fixed bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-900/10 blur-[150px] rounded-full pointer-events-none" />
                    
                    <div className="max-w-4xl mx-auto py-8 lg:px-16 lg:py-16 relative z-10">
                        {/* Mobile back button */}
                        <Link to="/" className="md:hidden text-gray-400 hover:text-white flex items-center gap-2 mb-8 text-sm font-medium">
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </Link>

                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="bg-[#0A0A1F]/50 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 lg:p-12 shadow-2xl"
                        >
                            {renderContent()}
                        </motion.div>

                        {/* Footer navigation */}
                        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <span className="text-sm text-gray-500 font-mono bg-white/5 px-3 py-1 rounded-md">ZexAI Developer Platform v1.2</span>
                            <div className="flex gap-6">
                                <a href="#" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors font-medium">GitHub Repo</a>
                                <a href="#" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors font-medium">Developer Discord</a>
                            </div>
                        </div>
                    </div>
                </main>

            </div>
        </div>
    );
};

export default DocsPage;
