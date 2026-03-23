import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';

// Contract Addresses (Polygon Mainnet - Deployed V3 Architecture 1B Supply)
export const ZEX_TOKEN_ADDRESS = "0x28De651aCA0f8584FA2E072cE7c1F4EE774a8B4a";
export const ZEX_STAKING_ADDRESS = "0xbee8cb1f28Dfd0713311f3b46bFf3F24eAc72733";
export const ZEX_VESTING_ADDRESS = "0x93467b1eBd6215Bc1810488C98eCad787B59101c";
export const ZEX_PRESALE_ADDRESS = "0x37CAd7cf190059c6716967CB429cD4CD13c390fC";
export const ZEXAI_NFT_ADDRESS = "0x5938F1a7038997642a4446c20Df72224acba9A60";
export const ZEXAI_FACTORY_ADDRESS = "0xf0917c8450Fb5aEB2B3a471BCc2E98D2312dfD92";

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

// Minimal ABI for ZexCollectionFactory
const FACTORY_ABI = [
    "function baseFee() view returns (uint256)",
    "function perNftFee() view returns (uint256)",
    "function createCollection(string memory name, string memory symbol, uint256 maxSupply, uint96 royaltyBasisPoints) external returns (address)",
    "event CollectionCreated(address indexed owner, address collectionAddress, string name, string symbol, uint256 maxSupply, uint96 royaltyBps)"
];

// Minimal ABI for ZexAICollection
const COLLECTION_ABI = [
    "function setBaseURI(string calldata newBaseURI) external",
    "function mintBatch(address to, uint256 quantity) external",
    "function totalSupply() view returns (uint256)"
];

interface Web3ContextType {
    account: string | undefined;
    zexBalance: string;
    isConnecting: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    provider: BrowserProvider | null;
    getContracts: () => Promise<any>;
    checkAndApproveZex: (targetAddress: string, amountInEther: string) => Promise<boolean>;
    mintNFT: (metadataURI: string, amount: number) => Promise<boolean>;
    createCollectionContract: (name: string, symbol: string, maxSupply: number, royaltyBps: number) => Promise<string | null>;
    setupAndMintCollection: (collectionAddress: string, baseUri: string, quantity: number) => Promise<boolean>;
    tokenBalance: number | null;
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
                // Check current chain ID
                let chainId;
                if (window.ethereum) {
                    const hexChainId = await window.ethereum.request({ method: 'eth_chainId' });
                    chainId = parseInt(hexChainId, 16);
                } else {
                    chainId = walletClient.chain?.id;
                }

                if (chainId !== 137) {
                    try {
                        console.log(`Current chain ${chainId} != 137. Requesting switch...`);
                        if (window.ethereum) {
                            await window.ethereum.request({
                                method: 'wallet_switchEthereumChain',
                                params: [{ chainId: '0x89' }],
                            });
                            
                            // Actively poll until MetaMask's internal state updates to 137
                            for (let i = 0; i < 15; i++) {
                                const newChainHex = await window.ethereum.request({ method: 'eth_chainId' });
                                if (parseInt(newChainHex, 16) === 137) break;
                                await new Promise(resolve => setTimeout(resolve, 400));
                            }
                        } else {
                            await (walletClient as any).switchChain({ id: 137 });
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    } catch (switchError: any) {
                        console.error("Switch chain failed:", switchError);
                        if (switchError.code === 4902) {
                            throw new Error("Lütfen MetaMask'a Polygon Mainnet ağını ekleyin.");
                        }
                        throw new Error("Lütfen cüzdanınızdan Polygon Mainnet ağını seçin.");
                    }
                }

                // Initialize provider using the live window.ethereum to capture the fresh network switch
                let _provider;
                if (window.ethereum) {
                    _provider = new ethers.BrowserProvider(window.ethereum as any, { chainId: 137, name: 'polygon' });
                } else {
                    _provider = new ethers.BrowserProvider(walletClient.transport, { chainId: 137, name: 'polygon' });
                }
                signer = await _provider.getSigner(account);
            } else if (provider) {
                const network = await provider.getNetwork();
                if (network.chainId !== 137n && window.ethereum) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: '0x89' }],
                        });
                        await new Promise(resolve => setTimeout(resolve, 800));
                        const newProvider = new ethers.BrowserProvider(window.ethereum as any);
                        signer = await newProvider.getSigner();
                    } catch (err) {
                        throw new Error("Lütfen cüzdanınızdan Polygon Mainnet ağını seçin.");
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
            const factoryContract = new ethers.Contract(ZEXAI_FACTORY_ADDRESS, FACTORY_ABI, signer);
            return { zexContract, nftContract, stakingContract, factoryContract };
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

    const createCollectionContract = async (name: string, symbol: string, maxSupply: number, royaltyBps: number) => {
        const contracts = await getContracts();
        if (!contracts) return null;

        try {
            // 1. Calculate the required ZEX fee for the Factory
            const factoryReadOnly = new ethers.Contract(ZEXAI_FACTORY_ADDRESS, FACTORY_ABI, polygonProvider);
            const baseFeeWei: bigint = await factoryReadOnly.baseFee();
            const perNftFeeWei: bigint = await factoryReadOnly.perNftFee();
            const totalFeeWei = baseFeeWei + (perNftFeeWei * BigInt(maxSupply));
            const totalFeeEther = ethers.formatEther(totalFeeWei);

            // 2. Ensure allowance for Factory
            const approved = await checkAndApproveZex(ZEXAI_FACTORY_ADDRESS, totalFeeEther);
            if (!approved) return null;

            // 3. Deploy new collection clone via Factory
            const tx = await contracts.factoryContract.createCollection(
                name,
                symbol,
                maxSupply,
                royaltyBps,
                { gasLimit: 3000000n } // Contract deployment uses more gas
            );
            
            const receipt = await tx.wait();

            // 4. Extract the contract address from the CollectionCreated event
            const event = receipt.logs.find((log: any) => {
                try {
                    const parsed = contracts.factoryContract.interface.parseLog({ topics: [...log.topics], data: log.data });
                    return parsed?.name === 'CollectionCreated';
                } catch {
                    return false;
                }
            });

            if (event) {
                const parsedLog = contracts.factoryContract.interface.parseLog({ topics: [...event.topics], data: event.data });
                return parsedLog?.args[1]; // collectionAddress
            }

            return null;
        } catch (error: any) {
            console.error("Collection deployment failed:", error);
            throw error;
        }
    };

    const setupAndMintCollection = async (collectionAddress: string, baseUri: string, quantity: number) => {
        if (!signer || !account) return false;
        try {
            const collectionContract = new ethers.Contract(collectionAddress, COLLECTION_ABI, signer);
            
            // 1. Set Base URI
            const tx1 = await collectionContract.setBaseURI(baseUri);
            await tx1.wait();

            // 2. Mint Batch
            const tx2 = await collectionContract.mintBatch(account, quantity);
            await tx2.wait();

            return true;
        } catch (error) {
            console.error("Setup & Mint failed:", error);
            throw error;
        }
    };

    return (
        <Web3Context.Provider value={{
            account, zexBalance, isConnecting, connectWallet, disconnectWallet,
            provider, getContracts, checkAndApproveZex, mintNFT, createCollectionContract, setupAndMintCollection, tokenBalance: null
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
