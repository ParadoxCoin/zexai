import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';

// Contract Addresses (Replace with real ones once deployed)
export const ZEX_TOKEN_ADDRESS = "0x5566234b86d4e0ee49bacf1DbCB3B914456511B3";
export const ZEXAI_NFT_ADDRESS = "0xACC8bEba660AeFA386D405d7Ff27bcB3bf624Ab3";
export const POLYGON_AMOY_CHAIN_ID = "0x13882"; // 80002 in hex

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

interface Web3ContextType {
    account: string | null;
    zexBalance: string;
    isConnecting: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    provider: BrowserProvider | null;
    getContracts: () => Promise<{ zexContract: Contract; nftContract: Contract } | null>;
    checkAndApproveZex: (amountInEther: string) => Promise<boolean>;
    mintNFT: (metadataURI: string, amount: number) => Promise<boolean>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [account, setAccount] = useState<string | null>(null);
    const [zexBalance, setZexBalance] = useState<string>("0");
    const [isConnecting, setIsConnecting] = useState(false);
    const [provider, setProvider] = useState<BrowserProvider | null>(null);

    useEffect(() => {
        // Check if wallet is already connected
        const checkConnection = async () => {
            if (window.ethereum) {
                const _provider = new ethers.BrowserProvider(window.ethereum);
                setProvider(_provider);
                try {
                    const network = await _provider.getNetwork();
                    if (network.chainId !== 80002n) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_switchEthereumChain',
                                params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
                            });
                        } catch (switchError) {
                            console.error("Please switch your wallet to Polygon Amoy Testnet manually.");
                        }
                    }

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
                    setZexBalance("0");
                }
            });

            // Ethers.js strongly recommends reloading the page on chain changes 
            // to avoid state corruption or NETWORK_ERROR crashes
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }

        return () => {
            if (window.ethereum && window.ethereum.removeListener) {
                window.ethereum.removeListener('accountsChanged', () => { });
                window.ethereum.removeListener('chainChanged', () => { });
            }
        };
    }, []);

    const updateBalance = async (address: string, _provider: BrowserProvider) => {
        if (!ZEX_TOKEN_ADDRESS || ZEX_TOKEN_ADDRESS === "0x5566234b86d4e0ee49bacf1DbCB3B914456511B3" === false) return;
        try {
            const network = await _provider.getNetwork();
            if (network.chainId !== 80002n) {
                console.warn("Wrong network for balance update. Expected 80002, got:", network.chainId);
                setZexBalance("0");
                return;
            }

            const zexContract = new ethers.Contract(ZEX_TOKEN_ADDRESS, ERC20_ABI, _provider);
            const balance: bigint = await zexContract.balanceOf(address);

            // Format BigInt down to a readable string (18 decimals standard for ERC20)
            const formattedBalance = ethers.formatUnits(balance, 18);

            // Keep exactly 2 decimal places to prevent extreme lengths or NaN loops
            const roundedBalance = parseFloat(formattedBalance).toFixed(2);
            setZexBalance(roundedBalance);
            console.log("ZEX Balance updated via RPC:", roundedBalance);
        } catch (error) {
            console.error("Error fetching ZEX balance:", error);
            setZexBalance("0");
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

            // Switch network
            const network = await _provider.getNetwork();
            if (network.chainId !== 80002n) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
                    });
                } catch (switchError: any) {
                    // This error code indicates that the chain has not been added to MetaMask.
                    if (switchError.code === 4902) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [
                                    {
                                        chainId: POLYGON_AMOY_CHAIN_ID,
                                        chainName: 'Polygon Amoy Testnet',
                                        rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                                        nativeCurrency: {
                                            name: 'MATIC',
                                            symbol: 'MATIC',
                                            decimals: 18
                                        },
                                        blockExplorerUrls: ['https://amoy.polygonscan.com/']
                                    }
                                ],
                            });
                        } catch (addError) {
                            console.error("Failed to add Polygon Amoy Network:", addError);
                        }
                    }
                }
                // Do not re-initialize on the fly if the network switch was successful
                // The 'chainChanged' listener will catch it and reload the page automatically,
                // which is the safest way to prevent ethers v6 NETWORK_ERRORs
                return;
            }

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
        setZexBalance("0");
    };

    const getContracts = async () => {
        if (!provider || !account) return null;
        try {
            const signer = await provider.getSigner();
            const zexContract = new ethers.Contract(ZEX_TOKEN_ADDRESS, ERC20_ABI, signer);
            const nftContract = new ethers.Contract(ZEXAI_NFT_ADDRESS, NFT_ABI, signer);
            return { zexContract, nftContract };
        } catch (error) {
            console.error("Error getting contracts:", error);
            return null;
        }
    };

    const checkAndApproveZex = async (amountInEther: string): Promise<boolean> => {
        const contracts = await getContracts();
        if (!contracts || !account) return false;

        try {
            const amountInWei = ethers.parseEther(amountInEther);

            // Check allowance
            const currentAllowance = await contracts.zexContract.allowance(account, ZEXAI_NFT_ADDRESS);

            if (currentAllowance < amountInWei) {
                // Need to approve
                const tx = await contracts.zexContract.approve(ZEXAI_NFT_ADDRESS, amountInWei);
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
            const approved = await checkAndApproveZex(totalFeeEther);
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
