import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

interface ConfettiPiece {
    id: number;
    x: number;
    delay: number;
    color: string;
    size: number;
    rotation: number;
}

interface CelebrationProps {
    show: boolean;
    type: 'confetti' | 'coins' | 'stars';
    onComplete?: () => void;
    message?: string;
    subMessage?: string;
}

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
const EMOJIS = {
    confetti: ['🎉', '🎊', '✨', '🌟', '⭐'],
    coins: ['💎', '💰', '🪙', '💵', '✨'],
    stars: ['⭐', '🌟', '✨', '💫', '🌠']
};

export const Celebration = ({ show, type, onComplete, message, subMessage }: CelebrationProps) => {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setVisible(true);
            // Generate celebration pieces
            const newPieces = Array.from({ length: 50 }, (_, i) => ({
                id: i,
                x: Math.random() * 100,
                delay: Math.random() * 0.5,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                size: Math.random() * 20 + 10,
                rotation: Math.random() * 360
            }));
            setPieces(newPieces);

            // Play celebration sound (subtle click/pop)
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            } catch (e) {
                // Audio not supported
            }

            // Auto hide after animation
            const timer = setTimeout(() => {
                setVisible(false);
                onComplete?.();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    if (!visible) return null;

    const emojis = EMOJIS[type];

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {/* Celebration pieces */}
            {pieces.map((piece) => (
                <div
                    key={piece.id}
                    className="absolute text-2xl animate-fall"
                    style={{
                        left: `${piece.x}%`,
                        animationDelay: `${piece.delay}s`,
                        fontSize: `${piece.size}px`,
                        transform: `rotate(${piece.rotation}deg)`,
                    }}
                >
                    {emojis[Math.floor(Math.random() * emojis.length)]}
                </div>
            ))}

            {/* Center message */}
            {message && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-bounce-in bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-white px-8 py-6 rounded-2xl shadow-2xl text-center">
                        <div className="text-4xl mb-2">🎉</div>
                        <h3 className="text-xl font-bold">{message}</h3>
                        {subMessage && <p className="text-sm opacity-90 mt-1">{subMessage}</p>}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fall {
                    0% {
                        transform: translateY(-100px) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                @keyframes bounce-in {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-fall {
                    animation: fall 3s ease-out forwards;
                }
                .animate-bounce-in {
                    animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
                }
            `}</style>
        </div>
    );
};

// Credit Earned Toast
interface CreditToastProps {
    amount: number;
    reason: string;
    show: boolean;
    onClose: () => void;
}

export const CreditToast = ({ amount, reason, show, onClose }: CreditToastProps) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onClose, 4000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[101] animate-slide-up">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
                <div className="text-3xl animate-pulse">💎</div>
                <div>
                    <p className="font-bold text-lg">+{amount} Kredi Kazandın!</p>
                    <p className="text-sm opacity-90">{reason}</p>
                </div>
            </div>
            <style>{`
                @keyframes slide-up {
                    0% { transform: translateY(100px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

// Level Up Celebration
interface LevelUpProps {
    show: boolean;
    newLevel: number;
    levelName: string;
    levelEmoji: string;
    bonusPercent: number;
    onClose: () => void;
}

export const LevelUpCelebration = ({ show, newLevel, levelName, levelEmoji, bonusPercent, onClose }: LevelUpProps) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onClose, 5000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <>
            <Celebration show={show} type="stars" />
            <div className="fixed inset-0 flex items-center justify-center z-[110] pointer-events-auto bg-black/50 backdrop-blur-md px-4" onClick={onClose}>
                <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-1.5 rounded-[2.5rem] shadow-2xl animate-bounce-in max-w-sm w-full">
                    <div className="bg-gray-900 rounded-[2.4rem] px-8 py-10 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400" />

                        <div className="text-7xl mb-6 inline-block animate-bounce">{levelEmoji}</div>
                        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">TEBRİKLER!</h2>
                        <div className="text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-4 leading-tight">
                            SEVİYE {newLevel}
                        </div>
                        <p className="text-purple-300 text-xl font-bold mb-6 italic">"{levelName}"</p>

                        {bonusPercent > 0 && (
                            <div className="mt-4 px-5 py-3 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-center gap-2">
                                <Zap className="w-5 h-5 text-green-400 fill-green-400" />
                                <p className="text-green-400 text-sm font-black">+{bonusPercent}% Kredi Kazanımı!</p>
                            </div>
                        )}

                        <button className="mt-8 w-full py-4 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 transition-colors shadow-lg">
                            DEVAM ET 🚀
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes bounce-in {
                    0% { transform: scale(0) rotate(-10deg); opacity: 0; }
                    50% { transform: scale(1.1) rotate(5deg); }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
                }
            `}</style>
        </>
    );
};

// Milestone Achievement Celebration
interface AchievementProps {
    show: boolean;
    name: string;
    description: string;
    emoji: string;
    xpReward: number;
    creditReward: number;
    onClose: () => void;
}

export const AchievementCelebration = ({ show, name, description, emoji, xpReward, creditReward, onClose }: AchievementProps) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onClose, 6000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <>
            <Celebration show={show} type="stars" />
            <div className="fixed inset-0 flex items-center justify-center z-[110] pointer-events-auto bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
                <div className="relative max-w-md w-full animate-badge-pop-in">
                    {/* Outer Glow Effect */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 rounded-[3rem] blur-2xl opacity-50 animate-pulse" />

                    <div className="relative bg-gray-900 border-2 border-amber-500/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        {/* Decorative Background Pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" />
                        </div>

                        <div className="relative px-8 py-10 text-center">
                            {/* Achievement Badge Circle */}
                            <div className="relative mb-6 mx-auto w-32 h-32">
                                <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" />
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center border-4 border-amber-300 shadow-xl">
                                    <span className="text-6xl drop-shadow-lg">{emoji}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-amber-500 font-black text-sm uppercase tracking-[0.2em]">Yeni Başarım Açıldı!</p>
                                <h2 className="text-3xl font-black text-white leading-tight">{name}</h2>
                                <p className="text-gray-400 text-base mb-6">{description}</p>
                            </div>

                            <div className="mt-8 flex justify-center gap-4">
                                {xpReward > 0 && (
                                    <div className="flex flex-col items-center bg-purple-500/10 border border-purple-500/30 px-5 py-3 rounded-2xl">
                                        <span className="text-purple-400 font-black text-xl">+{xpReward}</span>
                                        <span className="text-purple-400/80 text-[10px] font-bold uppercase">XP</span>
                                    </div>
                                )}
                                {creditReward > 0 && (
                                    <div className="flex flex-col items-center bg-emerald-500/10 border border-emerald-500/30 px-5 py-3 rounded-2xl">
                                        <span className="text-emerald-400 font-black text-xl">+{creditReward}</span>
                                        <span className="text-emerald-400/80 text-[10px] font-bold uppercase">KREDİ</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={onClose}
                                className="mt-8 w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider"
                            >
                                Muazzam! 🔥
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes badge-pop-in {
                    0% { transform: scale(0.5) translateY(50px); opacity: 0; }
                    80% { transform: scale(1.05) translateY(-10px); }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .animate-badge-pop-in {
                    animation: badge-pop-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>
        </>
    );
};

export default Celebration;
