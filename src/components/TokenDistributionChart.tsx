import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const TOKEN_DATA = [
    {
        key: 'presale',
        percent: 35,
        color: '#ec4899',
        gradient: ['#ec4899', '#f472b6'],
    },
    {
        key: 'ecosystem',
        percent: 25,
        color: '#8b5cf6',
        gradient: ['#8b5cf6', '#a78bfa'],
    },
    {
        key: 'liquidity',
        percent: 15,
        color: '#06b6d4',
        gradient: ['#06b6d4', '#22d3ee'],
    },
    {
        key: 'team',
        percent: 10,
        color: '#f59e0b',
        gradient: ['#f59e0b', '#fbbf24'],
    },
    {
        key: 'marketing',
        percent: 10,
        color: '#10b981',
        gradient: ['#10b981', '#34d399'],
    },
    {
        key: 'advisors',
        percent: 5,
        color: '#6366f1',
        gradient: ['#6366f1', '#818cf8'],
    },
];

const LABELS: Record<string, Record<string, { name: string; vesting: string }>> = {
    en: {
        presale: { name: 'Presale / ICO', vesting: '50% unlocked at listing, remaining 50% — 6 month linear vesting' },
        ecosystem: { name: 'Ecosystem & Staking', vesting: 'Gradual unlock based on platform usage' },
        liquidity: { name: 'Liquidity', vesting: 'Locked for DEX/CEX liquidity pools' },
        team: { name: 'Team & Founders', vesting: '1 year full cliff, then 24-month linear unlock' },
        marketing: { name: 'Marketing & Partnerships', vesting: 'Gradual usage based on campaigns' },
        advisors: { name: 'Advisors', vesting: '6 months fully locked, then 6-month linear unlock' },
    },
    tr: {
        presale: { name: 'Ön Satış / ICO', vesting: 'Listeleme anında %50 açık, kalan %50 — 6 ay lineer vesting' },
        ecosystem: { name: 'Ekosistem & Staking', vesting: 'Kullanıma göre kademeli açılım' },
        liquidity: { name: 'Likidite', vesting: 'DEX/CEX listeleme havuzları için kilitli' },
        team: { name: 'Takım & Kurucular', vesting: '1 yıl tamamen kilitli (Cliff), sonra 24 ay lineer açılım' },
        marketing: { name: 'Pazarlama & Ortaklıklar', vesting: 'Kampanya ihtiyaçlarına göre kademeli' },
        advisors: { name: 'Danışmanlar', vesting: '6 ay kilitli, sonra 6 ay lineer açılım' },
    },
    de: {
        presale: { name: 'Vorverkauf / ICO', vesting: '50% bei Listing freigeschaltet, Rest — 6 Monate lineares Vesting' },
        ecosystem: { name: 'Ökosystem & Staking', vesting: 'Schrittweise Freischaltung basierend auf Plattformnutzung' },
        liquidity: { name: 'Liquidität', vesting: 'Gesperrt für DEX/CEX-Liquiditätspools' },
        team: { name: 'Team & Gründer', vesting: '1 Jahr vollständige Sperre, dann 24-monatige lineare Freischaltung' },
        marketing: { name: 'Marketing & Partnerschaften', vesting: 'Nutzung basierend auf Kampagnen' },
        advisors: { name: 'Berater', vesting: '6 Monate vollständig gesperrt, dann 6-monatige lineare Freischaltung' },
    },
    es: {
        presale: { name: 'Preventa / ICO', vesting: '50% desbloqueado al listar, resto — 6 meses de vesting lineal' },
        ecosystem: { name: 'Ecosistema & Staking', vesting: 'Desbloqueo gradual según uso de la plataforma' },
        liquidity: { name: 'Liquidez', vesting: 'Bloqueado para pools de liquidez DEX/CEX' },
        team: { name: 'Equipo & Fundadores', vesting: '1 año de bloqueo completo, luego 24 meses de desbloqueo lineal' },
        marketing: { name: 'Marketing & Alianzas', vesting: 'Uso gradual según campañas' },
        advisors: { name: 'Asesores', vesting: '6 meses bloqueados, luego 6 meses de desbloqueo lineal' },
    },
    fr: {
        presale: { name: 'Prévente / ICO', vesting: '50% débloqué à la cotation, reste — 6 mois de vesting linéaire' },
        ecosystem: { name: 'Écosystème & Staking', vesting: 'Déblocage progressif selon l\'utilisation' },
        liquidity: { name: 'Liquidité', vesting: 'Verrouillé pour les pools de liquidité DEX/CEX' },
        team: { name: 'Équipe & Fondateurs', vesting: '1 an de verrouillage complet, puis 24 mois de déblocage linéaire' },
        marketing: { name: 'Marketing & Partenariats', vesting: 'Utilisation progressive selon les campagnes' },
        advisors: { name: 'Conseillers', vesting: '6 mois verrouillés, puis 6 mois de déblocage linéaire' },
    },
    zh: {
        presale: { name: '预售 / ICO', vesting: '上市时解锁50%，剩余50% — 6个月线性释放' },
        ecosystem: { name: '生态系统 & 质押', vesting: '根据平台使用逐步解锁' },
        liquidity: { name: '流动性', vesting: '锁定用于DEX/CEX流动性池' },
        team: { name: '团队 & 创始人', vesting: '1年完全锁定，之后24个月线性解锁' },
        marketing: { name: '营销 & 合作', vesting: '根据活动需求逐步使用' },
        advisors: { name: '顾问', vesting: '6个月完全锁定，之后6个月线性解锁' },
    },
    su: {
        presale: { name: 'Presale / ICO', vesting: '50% unlocked at listing, remaining 50% — 6 month linear vesting' },
        ecosystem: { name: 'Ecosystem & Staking', vesting: 'Gradual unlock based on platform usage' },
        liquidity: { name: 'Liquidity', vesting: 'Locked for DEX/CEX liquidity pools' },
        team: { name: 'Team & Founders', vesting: '1 year full cliff, then 24-month linear unlock' },
        marketing: { name: 'Marketing & Partnerships', vesting: 'Gradual usage based on campaigns' },
        advisors: { name: 'Advisors', vesting: '6 months fully locked, then 6-month linear unlock' },
    },
};

const CHART_TITLES: Record<string, { title: string; supply: string; tokens: string }> = {
    en: { title: 'Token Distribution', supply: 'Total Supply', tokens: 'tokens' },
    tr: { title: 'Token Dağılımı', supply: 'Toplam Arz', tokens: 'token' },
    de: { title: 'Token-Verteilung', supply: 'Gesamtangebot', tokens: 'Token' },
    es: { title: 'Distribución de Tokens', supply: 'Suministro Total', tokens: 'tokens' },
    fr: { title: 'Distribution des Tokens', supply: 'Offre Totale', tokens: 'jetons' },
    zh: { title: '代币分配', supply: '总供应量', tokens: '代币' },
    su: { title: 'Token Distribution', supply: 'Total Supply', tokens: 'tokens' },
};

// Custom active shape renderer for the interactive pie
const renderActiveShape = (props: any) => {
    const {
        cx, cy, innerRadius, outerRadius, startAngle, endAngle,
        fill, payload, percent,
    } = props;

    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius - 4}
                outerRadius={outerRadius + 12}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                opacity={1}
                style={{ filter: `drop-shadow(0 0 20px ${fill}80)` }}
            />
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius - 2}
                outerRadius={innerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                opacity={0.4}
            />
            <text x={cx} y={cy - 14} textAnchor="middle" fill="#fff" fontSize={28} fontWeight="900">
                {`${payload.value}%`}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#9ca3af" fontSize={13} fontWeight="500">
                {payload.name}
            </text>
        </g>
    );
};

const TokenDistributionChart: React.FC = () => {
    const { i18n } = useTranslation();
    const lang = i18n.language || 'en';
    const labels = LABELS[lang] || LABELS['en'];
    const titles = CHART_TITLES[lang] || CHART_TITLES['en'];

    const [activeIndex, setActiveIndex] = useState(0);

    const chartData = TOKEN_DATA.map((item) => ({
        ...item,
        name: labels[item.key]?.name || item.key,
        vesting: labels[item.key]?.vesting || '',
        value: item.percent,
    }));

    const activeItem = chartData[activeIndex];

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="my-16"
        >
            {/* Section Title */}
            <div className="text-center mb-10">
                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                    📊 {titles.title}
                </h3>
                <p className="text-gray-500 text-sm">
                    {titles.supply}: <span className="text-white font-bold">1,000,000,000</span> $ZEX {titles.tokens}
                </p>
            </div>

            <div className="bg-gradient-to-br from-[#0f0f2e]/80 to-[#0a0a1f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
                {/* Glow effects */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] opacity-20 transition-colors duration-700"
                        style={{ backgroundColor: activeItem?.color || '#8b5cf6' }}
                    />
                </div>

                <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
                    {/* Pie Chart */}
                    <div className="w-full lg:w-1/2 h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    activeIndex={activeIndex}
                                    activeShape={renderActiveShape}
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={130}
                                    dataKey="value"
                                    onMouseEnter={(_, index) => setActiveIndex(index)}
                                    stroke="none"
                                    animationBegin={0}
                                    animationDuration={1200}
                                    animationEasing="ease-out"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                            opacity={index === activeIndex ? 1 : 0.6}
                                            style={{ cursor: 'pointer', transition: 'opacity 0.3s' }}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="w-full lg:w-1/2 space-y-3">
                        {chartData.map((item, index) => (
                            <motion.div
                                key={item.key}
                                className={`flex items-start gap-4 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                    index === activeIndex
                                        ? 'bg-white/10 border border-white/20 shadow-lg'
                                        : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06]'
                                }`}
                                onMouseEnter={() => setActiveIndex(index)}
                                whileHover={{ x: 4 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            >
                                <div
                                    className="w-4 h-4 rounded-full mt-1 flex-shrink-0 ring-2 ring-offset-1 ring-offset-transparent"
                                    style={{
                                        backgroundColor: item.color,
                                        boxShadow: index === activeIndex ? `0 0 12px ${item.color}80` : 'none',
                                        ringColor: item.color,
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`font-semibold text-sm ${index === activeIndex ? 'text-white' : 'text-gray-300'}`}>
                                            {item.name}
                                        </span>
                                        <span
                                            className="font-black text-sm flex-shrink-0"
                                            style={{ color: item.color }}
                                        >
                                            {item.percent}%
                                        </span>
                                    </div>
                                    <p className={`text-xs mt-1 leading-relaxed transition-all duration-300 ${
                                        index === activeIndex ? 'text-gray-400 max-h-20 opacity-100' : 'text-gray-600 max-h-0 opacity-0 overflow-hidden'
                                    }`}>
                                        🔒 {item.vesting}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default TokenDistributionChart;
