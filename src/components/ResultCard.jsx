'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const scoreColor = (score) => {
  if (score >= 4) return 'bg-emerald-100 text-emerald-800';
  if (score >= 3) return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
};

export default function ResultCard({ item, index }) {
  const href = item.cityId ? `/city-guides/${item.cityId}` : '#';
  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError || !item.image ? '/images/city-placeholder.svg' : item.image;

  return (
    <Link href={href} className="block group">
      <article className="card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative h-48">
          <Image
            src={imageSrc}
            alt={item.title}
            fill
            style={{ objectFit: 'cover' }}
            className="transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImgError(true)}
            unoptimized={imageSrc.endsWith('.svg')}
          />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="badge bg-white/90 backdrop-blur font-semibold">
              #{index + 1}
            </span>
            {typeof item.score === 'number' && (
              <span className={`badge ${scoreColor(item.score)} font-semibold`}>
                {item.score.toFixed(1)}/5
              </span>
            )}
          </div>
          {item.crowdLevel && (
            <div className="absolute right-3 top-3">
              <span className="badge bg-white/90 backdrop-blur text-xs">
                {item.crowdLevel} crowds
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
          <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{item.subtitle}</p>
          {item.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span key={t} className="badge text-xs">{t}</span>
              ))}
            </div>
          )}
          {item.why && (
            <p className="mt-3 text-sm text-zinc-700">
              <span className="font-medium">Why now:</span> {item.why}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
