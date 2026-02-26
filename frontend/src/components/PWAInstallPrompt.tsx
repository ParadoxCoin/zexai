// Bu dosya artık export edilse de, eski pop-up gibi değil "InstallButton" olarak kullanılabilir.
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, Plus, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);

    const [isForceHidden, setIsForceHidden] = useState(() => {
        return localStorage.getItem('pwa-installed') === 'true';
    });

    useEffect(() => {
        // Check if already installed
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
        setIsStandalone(isInstalled);

        // Check if iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(iOS);

        // If it's already installed or we are on iOS it technically can be "installed" manually but let's handle that
        if (iOS && !isInstalled) {
            setIsInstallable(true);
        }

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
            setIsForceHidden(false);
            localStorage.removeItem('pwa-installed');
        };

        // If the event fired before React mounted, we can get it from the global window object
        if ((window as any).deferredPWAEvent) {
            handleBeforeInstall((window as any).deferredPWAEvent);
            (window as any).deferredPWAEvent = null; // Consume it
        }

        const handleAppInstalled = () => {
            setIsStandalone(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
            setIsForceHidden(true);
            localStorage.setItem('pwa-installed', 'true');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstallable(false);
                setIsStandalone(true); // Kesin gizle
                setIsForceHidden(true);
                localStorage.setItem('pwa-installed', 'true');
            }
            setDeferredPrompt(null);
        } else {
            // Firefox veya Safari gibi `beforeinstallprompt` desteklemeyen tarayıcılarda 
            // ya da hazırda prompt yoksa (masaüstünde) modal göster
            setShowIOSInstructions(true);
        }
    };

    // Eğer uygulama çoktan kuruluysa gösterme. 
    if (isStandalone || isForceHidden) return null;

    return (
        <>
            <button
                onClick={handleInstall}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-blue-500/20"
                title="Masaüstü Uygulaması Olarak Yükle"
            >
                <Download className="h-4 w-4" />
                <span className="text-xs font-semibold">Uygulamayı İndir</span>
            </button>

            {/* iOS Instructions Modal rendered via Portal to escape Header's backdrop-blur stacking context */}
            {showIOSInstructions && createPortal(
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-end justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {isIOS ? "iOS'ta Yükleme" : "Tarayıcıdan Yükleme"}
                            </h3>
                            <button
                                onClick={() => setShowIOSInstructions(false)}
                                className="p-2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {isIOS ? (
                                <>
                                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">1</div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">Safari'de paylaş butonuna tıklayın</p>
                                            <Share className="w-5 h-5 text-blue-500 mt-1" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">2</div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">"Ana Ekrana Ekle" seçin</p>
                                            <div className="flex items-center gap-1 mt-1 text-gray-500">
                                                <Plus className="w-4 h-4" />
                                                <span className="text-sm">Ana Ekrana Ekle</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white">3</div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">"Ekle" butonuna dokunun</p>
                                            <p className="text-sm text-gray-500">Uygulama ana ekrana eklenecek!</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xl">ℹ️</div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">Otomatik Yükleme Desteklenmiyor</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Tarayıcınız (örn. Firefox veya Safari) doğrudan bilgisayara kısayol oluşturmayı desteklemiyor.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xl">💡</div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">Nasıl Yüklerim?</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Lütfen <b>Chrome</b> veya <b>Edge</b> tarayıcılarını kullanın. O tarayıcılarda yukarıdaki butona bastığınız an tek tıkla cihazınıza uygulama olarak yüklenecektir.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setShowIOSInstructions(false)}
                            className="w-full mt-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all"
                        >
                            Anladım
                        </button>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                @keyframes slide-up {
                    0% { transform: translateY(100%); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out forwards;
                }
            `}</style>
        </>
    );
};

export default PWAInstallPrompt;
