'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { getImageUrl } from '@/utils/cdnUtils';
import { getCountryFlag } from '@/utils/countryFlags';

const POPULAR_IDS = ['berlin', 'vienna', 'copenhagen', 'amsterdam', 'athens', 'london'];

export default function SuggestedCityGrid({ citiesData, onSelect, label = 'Final city' }) {
  const popularCities = useMemo(() => {
    if (!citiesData) return [];
    return POPULAR_IDS
      .map(id => citiesData.find(c => c.id === id))
      .filter(Boolean);
  }, [citiesData]);

  if (popularCities.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#8a8578]">{label}</span>
        <span className="text-[11px] text-[#8a8578]">{popularCities.length} popular picks</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {popularCities.map((city, i) => (
          <motion.button
            key={city.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(city)}
            className="relative rounded-xl overflow-hidden aspect-[4/3] group text-left"
          >
            <Image
              src={getImageUrl(city.thumbnail)}
              alt={city.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 200px"
              priority={i < 2}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 p-2.5">
              <p className="text-white font-semibold text-sm leading-tight">{city.name}</p>
              <p className="text-white/70 text-[10px] mt-0.5">
                {city.country}
              </p>
              <span className="inline-block mt-1 text-[8px] text-white/50 uppercase tracking-wider">
                {getCountryFlag(city.country)} &middot; Capital
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
