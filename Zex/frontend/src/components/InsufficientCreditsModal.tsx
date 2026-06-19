import { AlertTriangle, CreditCard, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
  currentCredits: number;
}

export const InsufficientCreditsModal = ({
  isOpen,
  onClose,
  requiredCredits,
  currentCredits,
}: InsufficientCreditsModalProps) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-md overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-black border border-red-500/30 rounded-3xl p-8 shadow-2xl"
          >
            {/* Ambient Red Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-600/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon & Title */}
            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/10">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                {t('credits.insufficientTitle', 'YETERSİZ BAKİYE')}
              </h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                {t('credits.insufficientSubtitle', 'INSUFFICIENT BALANCE')}
              </p>
            </div>

            {/* Details */}
            <div className="mt-8 p-5 bg-black/40 border border-white/5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-black uppercase tracking-wider">{t('credits.requiredCost', 'GEREKLİ GÜÇ')}</span>
                <span className="font-black text-red-400">{requiredCredits} {t('common.credits', 'Credits')}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-black uppercase tracking-wider">{t('credits.availableBalance', 'MEVCUT GÜÇ')}</span>
                <span className="font-black text-slate-300">{currentCredits} {t('common.credits', 'Credits')}</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/credits';
                }}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98] border-t border-white/10 flex items-center justify-center gap-3"
              >
                <CreditCard className="w-4 h-4" />
                {t('credits.rechargeNowBtn', 'KREDİ YÜKLE / RECHARGE NOW')}
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all"
              >
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
