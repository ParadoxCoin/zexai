import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { polygon } from 'wagmi/chains'

// Get projectId from https://cloud.walletconnect.com
export const projectId = '42e0fa2294608f4479aecb7f5798fd90';

const metadata = {
    name: 'ZexAI Platform',
    description: 'ZexAI AI and Web3 Ecosystem',
    url: 'https://app.zexai.io',
    icons: ['https://zexai.io/logo192.png']
}

const networks = [polygon]

export const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks
})

// Create Modal with MetaMask & Trust Wallet featured
createAppKit({
    adapters: [wagmiAdapter],
    networks,
    defaultNetwork: polygon,
    projectId,
    metadata,
    featuredWalletIds: [
        // MetaMask
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
        // Trust Wallet
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    ],
    features: {
        analytics: false,
        email: false,
        socials: false,
        emailShowWallets: true,
    },
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#7C3AED',
        '--w3m-color-mix': '#060612',
        '--w3m-color-mix-strength': 20,
        '--w3m-border-radius-master': '16px',
        '--w3m-font-family': 'Inter, sans-serif'
    }
})

export const config = wagmiAdapter.wagmiConfig
