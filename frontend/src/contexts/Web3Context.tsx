import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';

// Contract Addresses (Replace with real ones once deployed)
export const MANUS_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZEXAI_NFT_ADDRESS = "0x0000000000000000000000000000000000000000";

// Minimal ABI for ERC20 MANUS
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

// Minimal ABI for ZexAI ERC1155 NFT
const NFT_ABI = [
    "function mintWithManus(string memory metadataURI, uint256 amount) external",
    "function mintFee() view returns (uint256)"
];

interface Web3ContextType {
    account: string | null;
    manusBalance: string;
    isConnecting: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    provider: BrowserProvider | null;
    getContracts: () => Promise<{ manusContract: Contract; nftContract: Contract } | null>;
    checkAndApproveManus: (amountInEther: string) => Promise<boolean>;
    mintNFT: (metadataURI: string, amount: number) => Promise<boolean>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [account, setAccount] = useState<string | null>(null);
    const [manusBalance, setManusBalance] = useState<string>("0");
    const [isConnecting, setIsConnecting] = useState(false);
    const [provider, setProvider] = useState<BrowserProvider | null>(null);

    useEffect(() => {
        // Check if wallet is already connected
        const checkConnection = async () => {
            if (window.ethereum) {
                const _provider = new ethers.BrowserProvider(window.ethereum);
                setProvider(_provider);
                try {
                    const accounts = await _provider.listAccounts();
                    if (accounts.length > 0) {
                        setAccount(accounts[0].address);
                        updateBalance(accounts[0].address, _provider);
                    }
                } catch (error) {
                    console.error("Error checking wallet connection:", error);
                }
            }
        };

        checkConnection();

        // Listeners for Metamask account/chain changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    if (provider) updateBalance(accounts[0], provider);
                } else {
                    setAccount(null);
                    setManusBalance("0");
                }
            });
        }

        return () => {
            if (window.ethereum && window.ethereum.removeListener) {
                window.ethereum.removeListener('accountsChanged', () => { });
            }
        };
    }, []);

    const updateBalance = async (address: string, _provider: BrowserProvider) => {
        if (!MANUS_TOKEN_ADDRESS || MANUS_TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") return;
        try {
            const manusContract = new ethers.Contract(MANUS_TOKEN_ADDRESS, ERC20_ABI, _provider);
            const balance = await manusContract.balanceOf(address);
            setManusBalance(ethers.formatEther(balance));
        } catch (error) {
            console.error("Error fetching MANUS balance:", error);
        }
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            alert("Please install MetaMask to use this feature!");
            return;
        }

        setIsConnecting(true);
        try {
            const _provider = new ethers.BrowserProvider(window.ethereum);
            setProvider(_provider);

            // Request account access
            const accounts = await _provider.send("eth_requestAccounts", []);
            if (accounts.length > 0) {
                setAccount(accounts[0]);
                await updateBalance(accounts[0], _provider);
            }
        } catch (error) {
            console.error("Failed to connect wallet:", error);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setManusBalance("0");
    };

    const getContracts = async () => {
        if (!provider || !account) return null;
        try {
            const signer = await provider.getSigner();
            const manusContract = new ethers.Contract(MANUS_TOKEN_ADDRESS, ERC20_ABI, signer);
            const nftContract = new ethers.Contract(ZEXAI_NFT_ADDRESS, NFT_ABI, signer);
            return { manusContract, nftContract };
        } catch (error) {
            console.error("Error getting contracts:", error);
            return null;
        }
    };

    const checkAndApproveManus = async (amountInEther: string): Promise<boolean> => {
        const contracts = await getContracts();
        if (!contracts || !account) return false;

        try {
            const amountInWei = ethers.parseEther(amountInEther);

            // Check allowance
            const currentAllowance = await contracts.manusContract.allowance(account, ZEXAI_NFT_ADDRESS);

            if (currentAllowance < amountInWei) {
                // Need to approve
                const tx = await contracts.manusContract.approve(ZEXAI_NFT_ADDRESS, amountInWei);
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
            // 1. Get current mint fee
            // const mintFee = await contracts.nftContract.mintFee();
            // const totalFee = mintFee * BigInt(amount);

            // Hardcode for Phase 1 simulation (10 MANUS per mint)
            const totalFeeEther = (10 * amount).toString();

            // 2. Ensure allowance
            const approved = await checkAndApproveManus(totalFeeEther);
            if (!approved) return false;

            // 3. Mint
            const tx = await contracts.nftContract.mintWithManus(metadataURI, amount);
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
            account, manusBalance, isConnecting, connectWallet, disconnectWallet,
            provider, getContracts, checkAndApproveManus, mintNFT
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
