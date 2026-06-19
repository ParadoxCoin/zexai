import React, { useState } from 'react';
import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Wallet, LogOut, ChevronDown, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatUnits } from 'viem';
import { useTranslation } from 'react-i18next';

const ConnectButton: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { open } = useAppKit();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const toggleDropdown = () => setIsOpen(!isOpen);
  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
    // SECURITY HARDENING: Clear wallet session cache keys to prevent session hijack / state leaks
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('wagmi') || key.startsWith('appkit') || key.startsWith('wc@2')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch (e) {
      console.error("Failed to clear wallet session:", e);
    }
  };

  const formatAddress = (addr?: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (val?: string) => {
    if (!val) return '0.000';
    const num = parseFloat(val);
    return num.toFixed(3);
  };

  // Hybrid Mode: When disconnected, show a button that triggers Reown's multi-wallet modal
  if (!isConnected) {
    return (
      <button
        onClick={() => open()}
        className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:scale-105"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    );
  }

  // Hybrid Mode: When connected, show our beautiful custom Wagmi/MetaMask style UI
  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"
      >
        {/* Balance Badge */}
        <div className="hidden sm:flex items-center px-3 py-1 bg-[#1A1A2E] rounded-lg border border-white/5 shadow-inner">
          <span className="font-mono text-sm font-medium text-white">
             {balance ? formatBalance(formatUnits(balance.value, balance.decimals)) : '0.000'} <span className="text-gray-400 text-xs ml-1">{balance?.symbol || 'POL'}</span>
          </span>
        </div>

        {/* Address Badge with gradient orb */}
        <div className="flex items-center gap-2 pl-1 sm:pl-0">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-500 shadow-md flex-shrink-0" />
          <span className="font-mono text-sm font-medium text-gray-200">
             {formatAddress(address)}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-full min-w-[240px] bg-white border border-gray-100/50 rounded-2xl shadow-xl overflow-hidden z-50 origin-top-right text-gray-900"
          >
            {/* Header / App Info */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-500 p-0.5 shadow-sm">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <img src="/logo192.png" alt="ZexAI" className="w-6 h-6 object-contain" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">ZexAI</div>
                  <a href="https://zexai.io" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors">
                    zexai.io <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
            
            {/* Disconnect Button */}
            <div className="p-2">
              <button
                onClick={handleDisconnect}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center justify-between rounded-xl font-bold"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  {t('nav.disconnect', { defaultValue: 'Disconnect' })}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectButton;
