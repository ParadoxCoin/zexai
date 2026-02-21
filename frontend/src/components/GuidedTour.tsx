import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, Wand2, Rocket } from 'lucide-react';

interface TourStep {
    target: string;
    title: string;
    content: string;
    icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
    {
        target: 'gamification-widget',
        title: 'Ödül Merkezin',
        content: 'Buradan günlük hediyelerini toplayabilir, seviyeni ve başarılarını takip edebilirsin. Her gün gelmeyi unutma! 🔥',
        icon: <Sparkles className="w-6 h-6 text-amber-500" />
    },
    {
        target: 'magic-templates',
        title: 'Sihirli Şablonlar',
        content: 'Fikir bulmakta zorlanıyor musun? Bu hazır şablonlara tıklayarak saniyeler içinde sanat eserleri üretmeye başla.',
        icon: <Wand2 className="w-6 h-6 text-purple-500" />
    },
    {
        target: 'quick-actions',
        title: 'Hızlı Aksiyonlar',
        content: 'Görsel, video, ses veya chat... ZexAi\'nin tüm gücü burada parmaklarının ucunda.',
        icon: <Rocket className="w-6 h-6 text-indigo-500" />
    }
];

export const GuidedTour: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const isTourDone = localStorage.getItem('zexai_tour_completed');
        if (!isTourDone) {
            // Wait for elements to render
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        if (isVisible) {
            const step = TOUR_STEPS[currentStep];
            // Look for IDs or specific selectors
            let targetEl = document.getElementById(step.target);

            // Fallback: search by text or data-tour attribute if needed
            if (!targetEl) {
                targetEl = document.querySelector(`[data-tour="${step.target}"]`);
            }

            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTargetRect(targetEl.getBoundingClientRect());
            }
        }
    }, [isVisible, currentStep]);

    const handleExit = () => {
        setIsVisible(false);
        localStorage.setItem('zexai_tour_completed', 'true');
    };

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleExit();
        }
    };

    if (!isVisible || !targetRect) return null;

    const step = TOUR_STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none">
            {/* Backdrop with Hole */}
            <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={handleExit}>
                <div
                    className="absolute bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-3xl transition-all duration-500 ease-in-out"
                    style={{
                        top: targetRect.top - 10,
                        left: targetRect.left - 10,
                        width: targetRect.width + 20,
                        height: targetRect.height + 20,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.3)'
                    }}
                />
            </div>

            {/* Tour Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    top: targetRect.bottom + 20 > window.innerHeight - 300
                        ? targetRect.top - 280
                        : targetRect.bottom + 20,
                    left: Math.max(20, Math.min(window.innerWidth - 340, targetRect.left + targetRect.width / 2 - 150))
                }}
                className="absolute w-[300px] bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-2xl pointer-events-auto border border-white/10"
            >
                <button
                    onClick={handleExit}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        {step.icon}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        {step.title}
                    </h3>
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                    {step.content}
                </p>

                <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                        {TOUR_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-6 bg-indigo-500' : 'w-1.5 bg-gray-200 dark:bg-gray-700'}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                        {currentStep === TOUR_STEPS.length - 1 ? 'BAŞLA' : 'SONRAKİ'}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Arrow pointing to the target */}
                <div
                    className={`absolute left-1/2 -ml-3 w-6 h-6 bg-white dark:bg-gray-900 border-l border-t border-white/10 rotate-45 ${targetRect.bottom + 20 > window.innerHeight - 300 ? 'bottom-[-12px] rotate-[225deg]' : 'top-[-12px]'
                        }`}
                />
            </motion.div>
        </div>
    );
};

export default GuidedTour;
