import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';

import { cookieStorage, createStorage } from 'wagmi';
import { mainnet, polygon, bsc, sepolia } from 'wagmi/chains';

// Get projectId from https://cloud.walletconnect.com
export const projectId = '7618ae03fb9e1bd4fcdaeb7f1ca5c165';

const metadata = {
    name: 'ZexAI Platform',
    description: 'ZexAI AI and Web3 Ecosystem',
    url: 'https://app.zexai.io',
    icons: ['https://zexai.io/logo192.png']
}

const chains = [polygon, mainnet, bsc, sepolia] as const;
export const config = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
    auth: {
        email: true,
        showWallets: true,
        walletFeatures: true
    },
    storage: createStorage({
        storage: cookieStorage
    }),
});

// Create Modal
createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: false,
    enableOnramp: true,
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#7C3AED',
        '--w3m-color-mix': '#060612',
        '--w3m-color-mix-strength': 20,
        '--w3m-border-radius-master': '16px',
        '--w3m-font-family': 'Inter, sans-serif'
    }
});
