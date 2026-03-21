import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';

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
    const { data: walletClient } = useWalletClient();
    const { disconnect } = useDisconnect();
    const { open } = useAppKit();

    const [zexBalance, setZexBalance] = useState<string>("0");
    const [provider, setProvider] = useState<BrowserProvider | null>(null);

    useEffect(() => {
        const initProvider = async () => {
            if (walletClient) {
                try {
                    const { chain, transport } = walletClient;
                    const network = {
                        chainId: chain?.id || 137,
                        name: chain?.name || 'polygon'
                    };
                    const _provider = new ethers.BrowserProvider(transport, network);
                    setProvider(_provider);
                    if (account) updateBalance(account, _provider);
                    else setZexBalance("0");
                } catch (e) {
                    console.error("WalletClient conversion error:", e);
                    if (account) updateBalance(account);
                }
            } else if (window.ethereum) {
                const _provider = new ethers.BrowserProvider(window.ethereum as any);
                setProvider(_provider);
                if (account) {
                    updateBalance(account, _provider);
                } else {
                    setZexBalance("0");
                }
            } else {
                // Ultimate fallback for mobile read-only where we just need the balance
                if (account) {
                    updateBalance(account);
                } else {
                    setZexBalance("0");
                }
            }
        };
        initProvider();
    }, [account, walletClient]);

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
        if (!account) return null;
        let signer;

        try {
            if (walletClient) {
                // Check if connected to Polygon Mainnet (137)
                if (walletClient.chain?.id !== 137) {
                    throw new Error("Lütfen cüzdanınızdan Polygon Mainnet ağını seçin.");
                }
                const network = {
                    chainId: walletClient.chain.id,
                    name: walletClient.chain.name
                };
                const _provider = new ethers.BrowserProvider(walletClient.transport, network);
                // Note: getSigner(account) requires exactly 1 arg in ethers v6
                signer = await _provider.getSigner(account);
            } else if (provider) {
                const network = await provider.getNetwork();
                if (network.chainId !== 137n && window.ethereum) {
                    try {
                        console.log("Requesting network switch to Polygon Mainnet");
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: '0x89' }], // 137 in hex
                        });
                        const newProvider = new ethers.BrowserProvider(window.ethereum as any);
                        signer = await newProvider.getSigner();
                    } catch (switchError: any) {
                        if (switchError.code === 4902) {
                            throw new Error("Lütfen MetaMask'a Polygon Mainnet ağını ekleyin.");
                        }
                        throw new Error("Lütfen işlemi Polygon Mainnet ağında gerçekleştirin.");
                    }
                } else {
                    signer = await provider.getSigner();
                }
            } else {
                throw new Error("Cüzdan bağlantısı bulunamadı veya ağ desteklenmiyor.");
            }

            const zexContract = new ethers.Contract(ZEX_TOKEN_ADDRESS, ERC20_ABI, signer);
            const nftContract = new ethers.Contract(ZEXAI_NFT_ADDRESS, NFT_ABI, signer);
            const stakingContract = new ethers.Contract(ZEX_STAKING_ADDRESS, STAKING_ABI, signer);
            return { zexContract, nftContract, stakingContract };
        } catch (error) {
            console.error("Error getting contracts:", error);
            throw error; // Re-throw so caller can display error message instead of failing silently
        }
    };

    const checkAndApproveZex = async (targetAddress: string, amountInEther: string): Promise<boolean> => {
        let contracts;
        try {
            contracts = await getContracts();
            if (!contracts || !account) return false;
        } catch (error) {
            console.error("Failed to get contracts (network issue?):", error);
            throw error;
        }

        try {
            const amountInWei = ethers.parseEther(amountInEther);

            // Check allowance
            const currentAllowance = await contracts.zexContract.allowance(account, targetAddress);

            if (currentAllowance < amountInWei) {
                // Need to approve
                // Add explicit gas limit to prevent MetaMask -32603 "Unexpected Error" on Polygon during estimation
                const tx = await contracts.zexContract.approve(targetAddress, amountInWei, {
                    gasLimit: 100000n // Standard ERC20 approve usually takes ~45k gas. 100k is a safe buffer.
                });
                await tx.wait(); // Wait for confirmation
            }
            return true;
        } catch (error: any) {
            console.error("Approval failed:", error);
            // Re-throw the error so the UI can catch and display the exact MetaMask error message
            throw error;
        }
    };

    const mintNFT = async (metadataURI: string, amount: number = 1): Promise<boolean> => {
        const contracts = await getContracts();
        if (!contracts) return false;

        try {
            // 1. Get current mint fee dynamically from the deployed contract 
            // USING THE DIRECT POLYGON RPC. If we use `contracts.nftContract` (which uses the wallet signer), 
            // it will throw a 0x empty error if the user's wallet is connected to the wrong network.
            const nftReadOnly = new ethers.Contract(ZEXAI_NFT_ADDRESS, NFT_ABI, polygonProvider);
            const mintFeeWei: bigint = await nftReadOnly.mintFee();
            const totalFeeWei = mintFeeWei * BigInt(amount);
            const totalFeeEther = ethers.formatEther(totalFeeWei);

            // 2. Ensure allowance
            const approved = await checkAndApproveZex(ZEXAI_NFT_ADDRESS, totalFeeEther);
            if (!approved) return false;

            // 3. Mint
            // Add explicit gas limit to prevent MetaMask -32603 "Unexpected Error" on Polygon during estimation
            const tx = await contracts.nftContract.mintWithZex(metadataURI, amount, {
                gasLimit: 300000n // Safe buffer for 1155 minting
            });
            await tx.wait();

            // Refresh balance
            if (account && provider) {
                updateBalance(account, provider);
            }

            return true;
        } catch (error: any) {
            console.error("Minting failed:", error);
            // Re-throw so the UI can catch and display the exact MetaMask error message (e.g., user rejected)
            throw error;
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
