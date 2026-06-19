/**
 * LazyWeb3Shell
 *
 * This component is the ONLY place where wagmi, viem, ethers, and @reown/appkit
 * are imported. Because it is lazy-loaded (React.lazy) from App.tsx, the entire
 * Web3 bundle is only downloaded by the browser when a user navigates to a
 * Web3-requiring route (/staking, /billing, /credits, /collections/*).
 *
 * Users who only use AI features (chat, images, video, audio) will never see
 * these large libraries in their network tab.
 */
import React, { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { config } from '@/web3config';
import { Web3Provider } from '@/contexts/Web3Context';

interface LazyWeb3ShellProps {
  children: ReactNode;
}

/**
 * Wraps children with WagmiProvider + Web3Provider.
 * Only rendered when a Web3-requiring route is accessed.
 */
const LazyWeb3Shell: React.FC<LazyWeb3ShellProps> = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <Web3Provider>
        {children}
      </Web3Provider>
    </WagmiProvider>
  );
};

export default LazyWeb3Shell;
