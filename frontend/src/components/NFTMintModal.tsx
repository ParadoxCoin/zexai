import React, { useState } from 'react';
import { X, Diamond, Loader2, Link as LinkIcon, CheckCircle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';

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

        if (Number(zexBalance) < mintPrice) {
            setErrorMessage("Yetersiz ZEX bakiyesi.");
            setMintStatus('error');
            return;
        }

        setIsMinting(true);
        setMintStatus('approving');
        setErrorMessage('');

        try {
            // In a real scenario, we'd first upload metadata to IPFS here
            // const ipfsUri = await uploadMetadataToIPFS({ name: nftName, description: nftDescription, image: image.file_url });
            const mockUri = `ipfs://mock-metadata-uri-${image.id}`;

            setMintStatus('minting');
            const success = await mintNFT(mockUri, 1);

            if (success) {
                setMintStatus('success');
            } else {
                setMintStatus('error');
                setErrorMessage("İşlem kullanıcı tarafından reddedildi veya başarısız oldu.");
            }
        } catch (error: any) {
            console.error(error);
            setMintStatus('error');
            setErrorMessage(error.message || "Bir hata oluştu.");
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
                            <button
                                onClick={onClose}
                                className="mt-6 w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                            >
                                Kapat
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Image Preview */}
                            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden relative">
                                <img
                                    src={image.file_url || image.thumbnail_url}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                />
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
