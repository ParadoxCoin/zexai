import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import { useAccount, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';

// Contract Addresses (Polygon Mainnet - Deployed March 2026)
export const ZEX_TOKEN_ADDRESS = "0x63A489B9214b89606a12cAe3e7B9275c175f7268";
export const ZEXAI_NFT_ADDRESS = "0x7562Da91986B72453DC5aE6cc89d524ba03e38dA";
export const ZEX_STAKING_ADDRESS = "0x6cBF98411AFd652E6AC01E18F6158B519Fb59410";

// Polygon Mainnet read-only provider (Alchemy)
const POLYGON_RPC = "https://polygon-mainnet.g.alchemy.com/v2/4OECI-BgprApuDWzNqcNL";
const polygonProvider = new JsonRpcProvider(POLYGON_RPC);

// Minimal ABI for ERC20 ZEX
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

// Minimal ABI for ZexAI ERC1155 NFT
const NFT_ABI = [
    "function mintWithZex(string memory metadataURI, uint256 amount) external",
    "function mintFee() view returns (uint256)"
];

// Minimal ABI for ZexStaking V2
const STAKING_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function earned(address account) view returns (uint256)",
    "function stake(uint256 amount) external",
    "function withdraw(uint256 amount) external",
    "function claimReward() external",
    "function getReward() external",
    "function rewardRate() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function getStakerInfo(address account) external view returns (uint256 balance, uint256 currentEarned, uint256 lockupEnd, bool isLocked)"
];

interface Web3ContextType {
    account: string | undefined;
    zexBalance: string;
    isConnecting: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    provider: BrowserProvider | null;
    getContracts: () => Promise<{ zexContract: Contract; nftContract: Contract; stakingContract: Contract } | null>;
    checkAndApproveZex: (targetAddress: string, amountInEther: string) => Promise<boolean>;
    mintNFT: (metadataURI: string, amount: number) => Promise<boolean>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { address: account, isConnecting } = useAccount();
    const { disconnect } = useDisconnect();
    const { open } = useWeb3Modal();

    const [zexBalance, setZexBalance] = useState<string>("0");
    const [provider, setProvider] = useState<BrowserProvider | null>(null);

    useEffect(() => {
        const initProvider = async () => {
            if (window.ethereum) {
                const _provider = new ethers.BrowserProvider(window.ethereum as any);
                setProvider(_provider);
                if (account) {
                    updateBalance(account, _provider);
                } else {
                    setZexBalance("0");
                }
            }
        };
        initProvider();
    }, [account]);

    const updateBalance = async (address: string, _provider?: BrowserProvider) => {
        if (!ZEX_TOKEN_ADDRESS) return;
        try {
            // Use our dedicated Polygon Mainnet RPC provider (not MetaMask's provider)
            // This avoids the 0x empty response error caused by chain mismatch
            const zexContract = new ethers.Contract(ZEX_TOKEN_ADDRESS, ERC20_ABI, polygonProvider);
            const balance: bigint = await zexContract.balanceOf(address);

            // Format BigInt down to a readable string (18 decimals standard for ERC20)
            const formattedBalance = ethers.formatUnits(balance, 18);

            // Keep exactly 2 decimal places to prevent extreme lengths or NaN loops
            const roundedBalance = parseFloat(formattedBalance).toFixed(2);
            setZexBalance(roundedBalance);
            console.log("ZEX Balance updated:", roundedBalance);
        } catch (error) {
            console.error("Error fetching ZEX balance:", error);
            // Retry once after 3 seconds (network may not be ready yet)
            setTimeout(async () => {
                try {
                    const zexContract = new ethers.Contract(ZEX_TOKEN_ADDRESS, ERC20_ABI, polygonProvider);
                    const balance: bigint = await zexContract.balanceOf(address);
                    const formattedBalance = ethers.formatUnits(balance, 18);
                    const roundedBalance = parseFloat(formattedBalance).toFixed(2);
                    setZexBalance(roundedBalance);
                    console.log("ZEX Balance (retry) updated:", roundedBalance);
                } catch (retryErr) {
                    console.error("ZEX balance retry also failed:", retryErr);
                    setZexBalance("0");
                }
            }, 3000);
        }
    };

    const connectWallet = async () => {
        try {
            await open();
        } catch (error) {
            console.error("User closed the modal or failed to connect:", error);
        }
    };

    const disconnectWallet = () => {
        disconnect();
    };

    const getContracts = async () => {
        if (!provider || !account) return null;
        try {
            const signer = await provider.getSigner();
            const zexContract = new ethers.Contract(ZEX_TOKEN_ADDRESS, ERC20_ABI, signer);
            const nftContract = new ethers.Contract(ZEXAI_NFT_ADDRESS, NFT_ABI, signer);
            const stakingContract = new ethers.Contract(ZEX_STAKING_ADDRESS, STAKING_ABI, signer);
            return { zexContract, nftContract, stakingContract };
        } catch (error) {
            console.error("Error getting contracts:", error);
            return null;
        }
    };

    const checkAndApproveZex = async (targetAddress: string, amountInEther: string): Promise<boolean> => {
        const contracts = await getContracts();
        if (!contracts || !account) return false;

        try {
            const amountInWei = ethers.parseEther(amountInEther);

            // Check allowance
            const currentAllowance = await contracts.zexContract.allowance(account, targetAddress);

            if (currentAllowance < amountInWei) {
                // Need to approve
                const tx = await contracts.zexContract.approve(targetAddress, amountInWei);
                await tx.wait(); // Wait for confirmation
            }
            return true;
        } catch (error) {
            console.error("Approval failed:", error);
            return false;
        }
    };

    const mintNFT = async (metadataURI: string, amount: number = 1): Promise<boolean> => {
        const contracts = await getContracts();
        if (!contracts) return false;

        try {
            // 1. Get current mint fee dynamically from the deployed contract
            const mintFeeWei: bigint = await contracts.nftContract.mintFee();
            const totalFeeWei = mintFeeWei * BigInt(amount);
            const totalFeeEther = ethers.formatEther(totalFeeWei);

            // 2. Ensure allowance
            const approved = await checkAndApproveZex(ZEXAI_NFT_ADDRESS, totalFeeEther);
            if (!approved) return false;

            // 3. Mint
            const tx = await contracts.nftContract.mintWithZex(metadataURI, amount);
            await tx.wait();

            // Refresh balance
            if (account && provider) {
                updateBalance(account, provider);
            }

            return true;
        } catch (error) {
            console.error("Minting failed:", error);
            return false;
        }
    };

    return (
        <Web3Context.Provider value={{
            account, zexBalance, isConnecting, connectWallet, disconnectWallet,
            provider, getContracts, checkAndApproveZex, mintNFT
        }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => {
    const context = useContext(Web3Context);
    if (context === undefined) {
        throw new Error('useWeb3 must be used within a Web3Provider');
    }
    return context;
};

// Add typescript definition for window.ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}
