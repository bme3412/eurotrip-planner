import React from 'react';
import Image from 'next/image';
import { Check, MapPin, Lightbulb, ArrowRight, Sparkles } from 'lucide-react';
import { getInsiderTips, getNearbyNeighborhoods } from '../lib/constants.js';
import { getNeighborhoodIcon } from '../lib/icons.js';
import { useNeighborhoodPhoto } from '../hooks/useNeighborhoodPhoto.js';

const OVERVIEW_CATEGORIES = [
  { key: 'dining', icon: '🍽️', label: 'Dining' },
  { key: 'shopping', icon: '🛍️', label: 'Shopping' },
  { key: 'nightlife', icon: '🌃', label: 'Nightlife' },
  { key: 'cultural', icon: '🎭', label: 'Cultural' },
];

/**
 * Neighborhood grid card — a scannable summary, not a full guide. The header
 * shows a real Google Places photo (gradient + icon while it loads / when
 * unavailable). The deep content (eat/see/tips/metro) lives in the detail modal
 * the title and "Full guide" button open. "nearby" is data-driven from
 * `location.borders` and can jump between neighborhoods.
 */
export default function NeighborhoodCard({
  neighborhood, cityName, isSelected, onToggleSelect, isCompareMode,
  onOpenDetail, onOpenByName, allNeighborhoods = [],
  isEditorsPick = false, pickReason,
}) {
  const insiderTips = getInsiderTips(neighborhood, Infinity);
  const atmospheres = neighborhood.appeal?.atmosphere || [];
  const bestFor = neighborhood.appeal?.best_for || [];
  const nearby = getNearbyNeighborhoods(neighborhood, allNeighborhoods);
  const { url: photoUrl, attribution } = useNeighborhoodPhoto(neighborhood, cityName);
  const open = () => onOpenDetail?.(neighborhood);

  return (
    <div
      className={`group bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 overflow-hidden ${
        isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:shadow-md hover:border-gray-300'
      }`}
    >
      {/* Header — real photo with gradient + icon fallback */}
      <div className="relative aspect-[3/2] bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 overflow-hidden">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={neighborhood.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-60">{getNeighborhoodIcon(neighborhood.name)}</span>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={open}
          aria-label={`View full guide for ${neighborhood.name}`}
          className="absolute inset-0 z-10"
        />

        {isCompareMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
            className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white/90 border-gray-300 hover:border-purple-400'
            }`}
            aria-label={isSelected ? 'Remove from comparison' : 'Add to comparison'}
          >
            {isSelected && <Check className="w-4 h-4" />}
          </button>
        )}

        {/* Top-left badge stack */}
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5">
          {isEditorsPick && (
            <span
              className="px-2 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
              title={pickReason}
            >
              <Sparkles className="w-3 h-3" />
              Editor&apos;s Pick
            </span>
          )}
          {neighborhood.location?.central && (
            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Central
            </span>
          )}
        </div>

        {photoUrl && attribution && (
          <span className="absolute bottom-1.5 right-2 z-20 text-[9px] text-white/80 drop-shadow-sm">
            © {attribution}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-bold text-gray-900 text-lg leading-snug">{neighborhood.name}</h3>
          {neighborhood.alternate_names && neighborhood.alternate_names.length > 0 && (
            <p className="text-xs text-gray-500">{neighborhood.alternate_names[0]}</p>
          )}
          {isEditorsPick && pickReason && (
            <p className="text-xs font-medium text-amber-700 mt-0.5">{pickReason}</p>
          )}
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{neighborhood.character}</p>
        </div>

        {atmospheres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {atmospheres.slice(0, 3).map((atm, i) => (
              <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{atm}</span>
            ))}
          </div>
        )}

        {/* Inline insider-tip teaser */}
        {insiderTips.length > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            <p className="text-xs leading-snug text-amber-900">
              <span className="line-clamp-2">{insiderTips[0]}</span>
              {insiderTips.length > 1 && (
                <button
                  type="button"
                  onClick={open}
                  aria-label={`View all ${insiderTips.length} tips in the full guide`}
                  className="mt-0.5 font-semibold text-amber-700 underline-offset-2 hover:underline"
                >
                  +{insiderTips.length - 1} more tip{insiderTips.length - 1 > 1 ? 's' : ''}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Category profile — quick-scan signal, always visible */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {OVERVIEW_CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-center gap-2">
              <span className="text-sm">{cat.icon}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${((neighborhood.categories?.[cat.key] || 0) / 5) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-500 w-6">{neighborhood.categories?.[cat.key] || 0}/5</span>
            </div>
          ))}
        </div>

        {bestFor.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-500 mb-1">Best for</div>
            <div className="flex flex-wrap gap-1">
              {bestFor.slice(0, 3).map((item, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{item}</span>
              ))}
            </div>
          </div>
        )}

        {/* Full-guide CTA */}
        <button
          type="button"
          onClick={open}
          className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
        >
          View full guide <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>

        {/* Nearby — data-driven from location.borders */}
        {nearby.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2">
              <MapPin className="w-3 h-3" />
              Bordering neighborhoods
            </div>
            <div className="flex flex-wrap gap-2">
              {nearby.slice(0, 3).map((b) => (
                b.resolved && onOpenByName ? (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => onOpenByName(b.resolved.name)}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-xs text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-700"
                  >
                    <span>{b.name}{b.walkTime ? ` · ${b.walkTime} min` : ''}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" aria-hidden />
                  </button>
                ) : (
                  <span
                    key={b.name}
                    title={`${b.name} — not covered in this guide`}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-xs text-gray-500"
                  >
                    {b.name}{b.walkTime ? ` · ${b.walkTime} min` : ''}
                  </span>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
