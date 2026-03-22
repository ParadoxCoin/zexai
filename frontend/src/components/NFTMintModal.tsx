import React, { useState } from 'react';
import { X, Diamond, Loader2, Link as LinkIcon, CheckCircle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import api from '../services/api';
interface NFTMintModalProps {
    isOpen: boolean;
    onClose: () => void;
    image: any;
}

const NFTMintModal: React.FC<NFTMintModalProps> = ({ isOpen, onClose, image }) => {
    const { account, zexBalance, mintNFT, connectWallet } = useWeb3();
    const [nftName, setNftName] = useState(image?.prompt?.substring(0, 30) || 'ZexAI Creation');
    const [nftDescription, setNftDescription] = useState(image?.prompt || 'Generated with ZexAI');
    const [isMinting, setIsMinting] = useState(false);
    const [mintStatus, setMintStatus] = useState<'idle' | 'approving' | 'minting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const mintPrice = 100; // 100 ZEX Token per Mint

    if (!isOpen || !image) return null;

    const handleMint = async () => {
        if (!account) {
            connectWallet();
            return;
        }

        // Note: We let the smart contract itself validate the ZEX balance to avoid race conditions
        // where zexBalance may not have loaded yet from the blockchain.
        // The contract will revert with an error if funds are insufficient.

        setIsMinting(true);
        setMintStatus('approving');
        setErrorMessage('');

        try {
            // 1. Prepare Metadata via Backend (Upload to Pinata IPFS)
            setMintStatus('approving');

            const prepareRes = await api.post('/nft/prepare-metadata', {
                asset_id: image.id,
                asset_url: image.file_url || image.thumbnail_url,
                thumbnail_url: image.thumbnail_url || image.file_url,
                service_type: image.service_type || image.content_type || 'image',
                prompt: nftDescription,
                model: image.model_name || 'ZexAI Model'
            });

            if (!prepareRes?.success || !prepareRes?.metadata_uri) {
                console.error("Prepare metadata failed:", prepareRes);
                throw new Error("IPFS metadata yüklenemedi. Lütfen tekrar deneyin.");
            }

            const metadataUri = prepareRes.metadata_uri;

            // 2. Mint via Web3 Smart Contract
            setMintStatus('minting');
            // This will throw if it fails (e.g., user rejected, no gas, etc.)
            await mintNFT(metadataUri, 1);

            // 3. Confirm in Backend (non-blocking - NFT is already minted on-chain)
            try {
                await api.post('/nft/confirm-mint', {
                    asset_id: image.id,
                    tx_hash: "0xConfirmedByProvider",
                    token_id: null
                });
            } catch (confirmErr) {
                console.warn("DB confirmation failed, but NFT was minted successfully:", confirmErr);
            }

            setMintStatus('success');

        } catch (error: any) {
            console.error(error);
            setMintStatus('error');

            // Try to extract a clean error message from MetaMask's verbose JSON RPC errors
            let cleanMsg = "İşlem başarısız oldu.";
            const errMsg = error?.message || error?.reason || "";

            if (errMsg.includes("user rejected") || error?.code === 4001 || error?.info?.error?.code === 4001) {
                cleanMsg = "İşlem cüzdanda reddedildi.";
            } else if (errMsg.includes("insufficient funds") || errMsg.includes("gas required exceeds allowance")) {
                cleanMsg = "Ağ ücreti (MATIC) veya ZEX bakiyesi yetersiz.";
            } else if (errMsg.includes("-32603") || errMsg.includes("Unexpected error")) {
                cleanMsg = "Polygon ağı yoğun veya MetaMask gaz tahmini başarısız. Lütfen tekrar deneyin.";
            } else if (error?.response?.data?.detail) {
                cleanMsg = error.response.data.detail; // Backend API config errors
            } else if (typeof error === 'string') {
                cleanMsg = error;
            } else if (errMsg) {
                // Return up to 60 chars of the actual message to avoid massive JSON blobs on screen
                cleanMsg = (errMsg.length > 60 && errMsg.includes("{")) ? "Ağ veya sözleşme hatası oluştu." : errMsg;
            }

            setErrorMessage(cleanMsg);
        } finally {
            setIsMinting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200 relative"
                onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
            >

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Diamond className="w-5 h-5 text-purple-500" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500">
                            NFT Olarak Bas (Mint)
                        </span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {mintStatus === 'success' ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Tebrikler!</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Görseliniz başarıyla NFT'ye dönüştürüldü ve cüzdanınıza gönderildi.
                            </p>

                            <div className="flex flex-col gap-3 mt-6">
                                {/* OpenSea - Polygon */}
                                <a
                                    href={`https://opensea.io/${account}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-3 bg-[#2081E2] hover:bg-[#1868B7] text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 90 90" fill="white"><path d="M45 0C20.15 0 0 20.15 0 45s20.15 45 45 45 45-20.15 45-45S69.85 0 45 0ZM22.2 46.51l.22-.35 11.72-18.33c.17-.27.58-.24.71.05 1.96 4.38 3.65 9.83 2.86 13.22-.34 1.39-1.26 3.28-2.3 5.01-.13.25-.28.49-.44.72-.08.12-.2.18-.34.18H22.55c-.31-.01-.49-.35-.35-.5ZM74.38 52.6c0 .2-.12.37-.31.44-1.12.48-4.94 2.24-6.53 4.45-4.05 5.64-7.15 13.72-14.08 13.72H32.59c-10.23 0-18.51-8.32-18.51-18.59v-.33c0-.24.19-.43.43-.43h13.83c.28 0 .48.26.45.53-.12 1.16.1 2.34.66 3.42a6.37 6.37 0 0 0 5.65 3.44h8.86V53.6h-8.76c-.31 0-.5-.36-.33-.62.07-.1.14-.2.22-.32.6-.87 1.45-2.24 2.3-3.78.58-1.05 1.14-2.17 1.58-3.3.09-.2.16-.41.23-.61.12-.36.24-.69.33-1.03.09-.29.16-.59.22-.87.18-.89.25-1.83.25-2.81 0-.38-.02-.79-.05-1.17-.02-.42-.07-.84-.14-1.26-.05-.38-.14-.76-.23-1.15-.12-.53-.27-1.06-.44-1.56l-.06-.21c-.12-.39-.23-.76-.38-1.15-1-2.76-2.15-5.44-3.34-7.97l-.52-1.1-.56-1.08c-.18-.35-.36-.67-.53-1-.2-.38-.41-.74-.58-1.07l-.29-.5c-.09-.16-.19-.32-.29-.47 0 0-.61-1.06-.84-1.45l-.42-.73c-.04-.08.02-.17.1-.14l6.76 1.64h.02l.02.01.91.26.99.27V21.5c0-1.72 1.37-3.12 3.07-3.12 .85 0 1.62.35 2.17.92.56.56.9 1.34.9 2.2v7.81l.73.2s.05.02.08.04c.08.06.2.15.36.27.12.1.26.22.42.36.33.28.73.65 1.18 1.08.12.11.24.23.35.35.49.49 1.04 1.07 1.58 1.73.15.18.3.37.45.56.15.19.31.39.45.59.18.26.38.53.55.82.08.14.18.28.26.42.23.38.43.78.63 1.18.08.18.17.38.24.57.2.53.36 1.08.46 1.64.04.14.07.29.1.42v.03c.07.3.12.61.14.93.02.18.03.37.03.56 0 .28-.02.57-.05.87-.04.3-.1.59-.17.89-.09.29-.18.59-.3.87-.11.28-.23.57-.37.84-.19.39-.4.78-.64 1.14-.08.14-.18.28-.27.42-.1.15-.21.29-.31.43-.14.19-.29.39-.45.56-.14.19-.3.37-.46.53-.22.24-.43.47-.66.68-.13.14-.27.28-.42.41-.13.14-.28.26-.4.38-.21.19-.39.34-.55.47l-.36.3c-.05.04-.11.06-.17.06h-5.45v5.66h6.85c1.54 0 3-.49 4.19-1.42.42-.33 2.24-1.94 4.39-4.18.08-.08.17-.13.28-.15l15.21-4.4c.34-.1.68.17.68.52v3.63Z"/></svg>
                                    OpenSea'de Görüntüle
                                </a>
                                {/* Rarible - Polygon */}
                                <a
                                    href={`https://rarible.com/user/${account}/owned`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-3 bg-[#FEDA03] hover:bg-[#E5C600] text-black rounded-xl font-medium transition flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 0h15A4.5 4.5 0 0 1 24 4.5v15a4.5 4.5 0 0 1-4.5 4.5h-15A4.5 4.5 0 0 1 0 19.5v-15A4.5 4.5 0 0 1 4.5 0Zm1.47 7.636v8.728h2.588v-3.223h1.588c2.726 0 4.42-1.42 4.42-3.8 0-2.455-1.58-3.705-4.35-3.705H5.97Zm2.588 2.09h1.27c1.28 0 1.95.54 1.95 1.6 0 1.02-.67 1.58-1.95 1.58h-1.27V9.726Zm8.09 6.638h2.588v-3.74h.26l2.5 3.74h3.093l-2.93-4.14c1.44-.57 2.28-1.77 2.28-3.3 0-2.3-1.58-3.56-4.35-3.56h-3.44v10.999Zm2.588-5.747V9.21h1.12c1.18 0 1.82.49 1.82 1.42 0 .93-.64 1.39-1.82 1.39h-1.12v.597Z"/></svg>
                                    Rarible'da Görüntüle
                                </a>
                                {/* Magic Eden - Polygon */}
                                <a
                                    href={`https://magiceden.io/u/${account}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-3 bg-[#E42575] hover:bg-[#C91F65] text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0Zm5.568 8.16a.72.72 0 0 1-.18.48L14.4 12l2.988 3.36a.72.72 0 0 1-.54 1.2h-3.6a.72.72 0 0 1-.54-.24L10.8 14.16l-1.908 2.16a.72.72 0 0 1-.54.24h-3.6a.72.72 0 0 1-.54-1.2L7.2 12 4.212 8.64a.72.72 0 0 1 .54-1.2h3.6c.204 0 .396.084.54.24L10.8 9.84l1.908-2.16a.72.72 0 0 1 .54-.24h3.6a.72.72 0 0 1 .72.72Z"/></svg>
                                    Magic Eden'da Görüntüle
                                </a>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition mt-2"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Media Preview */}
                            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden relative flex items-center justify-center">
                                {(image.service_type || image.content_type || 'image').toLowerCase() === 'video' ? (
                                    <video
                                        src={image.file_url || image.thumbnail_url}
                                        className="w-full h-full object-cover"
                                        controls
                                    />
                                ) : (image.service_type || image.content_type || 'image').toLowerCase() === 'audio' ? (
                                    <div className="w-full p-4 flex flex-col items-center gap-4">
                                        {image.thumbnail_url && image.thumbnail_url !== image.file_url ? (
                                            <img src={image.thumbnail_url} alt="Cover" className="h-32 w-32 object-cover rounded-lg shadow-md" />
                                        ) : (
                                            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center">
                                                <span className="text-4xl">🎵</span>
                                            </div>
                                        )}
                                        <audio
                                            src={image.file_url}
                                            controls
                                            className="w-full"
                                        />
                                    </div>
                                ) : (
                                    <img
                                        src={image.file_url || image.thumbnail_url}
                                        alt="Preview"
                                        className="w-full h-full object-contain"
                                    />
                                )}
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NFT Adı</label>
                                    <input
                                        type="text"
                                        value={nftName}
                                        onChange={(e) => setNftName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                        disabled={isMinting}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
                                    <textarea
                                        value={nftDescription}
                                        onChange={(e) => setNftDescription(e.target.value)}
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                                        disabled={isMinting}
                                    />
                                </div>
                            </div>

                            {/* Payment Summary */}
                            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-100 dark:border-purple-800/20 flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400 text-sm">Mint Ücreti</span>
                                <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white text-lg">
                                    {mintPrice}
                                    <span className="text-purple-600 text-sm ml-1">ZEX</span>
                                </div>
                            </div>

                            {/* Error Message */}
                            {mintStatus === 'error' && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                                    {errorMessage}
                                </div>
                            )}

                            {/* Action Button */}
                            {account ? (
                                <button
                                    onClick={handleMint}
                                    disabled={isMinting}
                                    className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex justify-center items-center gap-2"
                                >
                                    {isMinting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {mintStatus === 'approving' ? 'Sözleşme Onaylanıyor...' : 'NFT Basılıyor...'}
                                        </>
                                    ) : (
                                        <>
                                            <Diamond className="w-5 h-5" />
                                            {mintPrice} ZEX ile Mint Et
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={connectWallet}
                                    className="w-full py-4 rounded-xl font-bold text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 shadow-lg transition-all flex justify-center items-center gap-2"
                                >
                                    <LinkIcon className="w-5 h-5" />
                                    Önce Cüzdan Bağla
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NFTMintModal;
