import React, { useMemo } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Eye, Info, Layers } from 'lucide-react';

const NFT_IMAGES = [
  '/nfts/h1.png',
  '/nfts/h2.png',
  '/nfts/h3.png',
  '/nfts/h4.png',
  '/nfts/h5.png',
];

interface NFTData {
  id: number;
  img: string;
  title: string;
  rarity: string;
}

const HologramCard = ({ nft }: { nft: NFTData }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [30, -30]);
  const rotateY = useTransform(x, [-100, 100], [-30, 30]);

  const springConfig = { damping: 20, stiffness: 300 };
  const springX = useSpring(rotateX, springConfig);
  const springY = useSpring(rotateY, springConfig);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{
        perspective: 1000,
        rotateX: springX,
        rotateY: springY,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden group border border-white/10 bg-white/5 cursor-pointer shadow-2xl"
    >
      <img src={nft.img} alt={nft.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
      
      {/* Hologram Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 via-transparent to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-4 group-hover:translate-y-0 transition-transform">
        <div className="flex justify-between items-center mb-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
            nft.rarity === 'Efsanevi' || nft.rarity === 'Legendary' ? 'bg-orange-500/20 text-orange-400' : 
            nft.rarity === 'Mistik' || nft.rarity === 'Mythic' ? 'bg-purple-500/20 text-purple-400' :
            'bg-teal-500/20 text-teal-400'
          }`}>
            {nft.rarity}
          </span>
          <div className="flex gap-1">
            <Layers className="w-3 h-3 text-white/50" />
            <span className="text-[10px] text-white/50">ER-721</span>
          </div>
        </div>
        <h3 className="text-white font-bold text-lg mb-1 uppercase tracking-tight">{nft.title}</h3>
      </div>
      
      {/* Visual Effects */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-teal-500 transition-colors">
            <Eye size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-teal-500 transition-colors">
            <Info size={18} />
          </button>
      </div>
    </motion.div>
  );
};

const NFTGallery: React.FC = () => {
  const { t } = useTranslation();
  
  const rawItems = t('galleryItems', { returnObjects: true });
  const galleryItems = Array.isArray(rawItems) ? rawItems : [];
  
  const NFTS = useMemo(() => {
    if (!Array.isArray(galleryItems)) return [];
    return galleryItems.slice(0, 5).map((item, index) => ({
      id: index + 1,
      img: NFT_IMAGES[index] || NFT_IMAGES[0],
      title: item?.title || `NFT #${index + 1}`,
      rarity: item?.rarity || 'Common'
    })) as NFTData[];
  }, [galleryItems]);

  return (
    <section className="py-24 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8 relative z-10 overflow-hidden">
      <div className="absolute right-0 top-0 w-[40%] h-full bg-teal-500/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16 relative"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
          <Layers className="w-3 h-3" />
          {t('gallery.badge')}
        </div>
        <h2 className="text-4xl md:text-5xl font-black mb-6">
          {t('gallery.title')}
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          {t('gallery.subtitle')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {NFTS.map((nft, index) => (
          <motion.div
            key={nft.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <HologramCard nft={nft} />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default NFTGallery;
