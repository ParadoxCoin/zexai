import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useTranslation } from 'react-i18next';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

interface WalletConnectProps {
    className?: string;
    showBalance?: boolean;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ className = '', showBalance = true }) => {
    const { account, zexBalance, polBalance, isConnecting, connectWallet, disconnectWallet } = useWeb3();
    const { t } = useTranslation();

    // Shorten address format: 0x1234...5678
    const shortenAddress = (address: string) => {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    if (account) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                {showBalance && (
                    <div className="hidden sm:flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium border border-purple-100 dark:border-purple-800/50">
                            <span>{Number(zexBalance).toFixed(2)}</span>
                            <span className="text-xs uppercase tracking-wider font-bold">ZEX</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium border border-blue-100 dark:border-blue-800/50">
                            <span>{Number(polBalance).toFixed(3)}</span>
                            <span className="text-xs uppercase tracking-wider font-bold">POL</span>
                        </div>
                    </div>
                )}
                <div className="relative group">
                    <button className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl shadow-md transition-all duration-300 transform hover:scale-[1.02] text-sm font-medium">
                        <Wallet className="w-4 h-4" />
                        <span className="hidden sm:inline">{shortenAddress(account)}</span>
                        <span className="sm:hidden">{account.substring(0, 4)}...</span>
                    </button>

                    {/* Dropdown for Disconnect */}
                    <div className="absolute right-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden py-1">
                            <button
                                onClick={disconnectWallet}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                {t('dashboard.walletBtnDisconnect', 'Cüzdanı Eşleşmeyi Kes')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={connectWallet}
            disabled={isConnecting}
            className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl shadow-md transition-all duration-300 transform hover:scale-[1.02] text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
        >
            {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Wallet className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{t('dashboard.walletBtnConnect', 'Cüzdan Bağla')}</span>
            <span className="sm:hidden">{t('common.connect', 'Bağla')}</span>
        </button>
    );
};

export default WalletConnect;
