import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

const SynapsePage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center p-4 lg:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative w-full max-w-7xl h-full min-h-[70vh] flex items-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-8 lg:p-20 shadow-[0_0_80px_rgba(79,70,229,0.25)]">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 -mt-40 -mr-40 w-[40rem] h-[40rem] bg-indigo-500 rounded-full blur-[150px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-40 -ml-40 w-[40rem] h-[40rem] bg-blue-500 rounded-full blur-[150px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 w-full flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-24">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold tracking-wide">
              <Activity className="w-5 h-5 animate-pulse" />
              <span>{t('synapse.inDevelopment')}</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 leading-tight">
              Synapse Multi-Agent <br className="hidden lg:block" /> {t('synapse.ecosystem')}
            </h1>

            <p className="text-indigo-100/80 text-xl lg:text-2xl max-w-3xl leading-relaxed mx-auto lg:mx-0 font-light">
              {t('synapse.description')}
            </p>
          </div>

          <div className="relative flex items-center justify-center w-64 h-64 lg:w-96 lg:h-96 shrink-0 mt-8 lg:mt-0">
            {/* Glowing rings around the logo */}
            <div className="absolute w-full h-full border-[3px] border-indigo-500/20 rounded-full animate-[spin_15s_linear_infinite]"></div>
            <div className="absolute w-3/4 h-3/4 border-[3px] border-blue-500/30 rounded-full animate-[spin_10s_linear_infinite_reverse]"></div>
            <div className="absolute w-1/2 h-1/2 border-[3px] border-purple-500/40 rounded-full animate-[spin_8s_linear_infinite]"></div>

            <div className="relative w-32 h-32 lg:w-48 lg:h-48 rounded-full flex items-center justify-center bg-gray-900/50 backdrop-blur-3xl border border-indigo-400/40 shadow-[0_0_60px_rgba(99,102,241,0.6)] z-10 hover:scale-110 transition-transform duration-700 ease-out">
              <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-40 animate-pulse" />
              <img src="/logo192.png" alt="ZexAi Logo" className="relative w-20 h-20 lg:w-32 lg:h-32 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] z-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SynapsePage;