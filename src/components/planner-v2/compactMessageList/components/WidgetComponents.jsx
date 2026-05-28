import React from 'react';
import { motion } from 'framer-motion';
import { CitySearchInput } from '../../../conversation/InputArea';
import { getFlagForCountry } from '@/utils/countryFlags';
import { getFirstEuropeRoutePresets } from '@/lib/planning/routePresets';

// ── Styled option cards ──────────────────────────────────────────
export function PlannerOptions({ options = [], onSelect }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 py-1">
      {options.map((option, i) => (
        <motion.button
          key={option.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(option)}
          className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#e5e0d8] bg-white hover:border-[#c9a227]/50 hover:bg-[#faf6eb] text-left transition-all"
        >
          {option.emoji && (
            <span className="text-base shrink-0 w-6 text-center">{option.emoji}</span>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-medium text-[#2a2520] group-hover:text-[#2a2520]">
              {option.label}
            </span>
            {option.description && (
              <span className="text-[11px] text-[#8a8578] ml-1.5">{option.description}</span>
            )}
          </div>
          <span className="text-[#c9a227] opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0">
            &rarr;
          </span>
        </motion.button>
      ))}
    </div>
  );
}

// ── Section divider ──────────────────────────────────────────────
export function StepDivider({ label }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex-1 h-px bg-[#e5e0d8]" />
      {label && <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#b5b0a8]">{label}</span>}
      <div className="flex-1 h-px bg-[#e5e0d8]" />
    </div>
  );
}

// ── Bouncing typing indicator ────────────────────────────────────
export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="status"
      aria-live="polite"
      aria-label="Trip planner is typing"
      className="py-2 max-w-[92%]"
    >
      <div className="rounded-2xl rounded-tl-md bg-[#faf8f5] border border-[#e5e0d8]/60 px-4 py-3 inline-flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-[#c9a227]"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function RoutePresetCards({ onSelect }) {
  const presets = getFirstEuropeRoutePresets();

  return (
    <div className="grid gap-2 py-1">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
        Pick a starter itinerary
      </p>
      {presets.map((preset, index) => (
        <motion.button
          key={preset.id}
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(preset)}
          className="group rounded-2xl border border-[#e5e0d8] bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#c9a227]/60 hover:bg-[#fffaf0] hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold text-[#2a2520]">
                {preset.title}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-[#6a6459]">
                {preset.cities.map((city) => `${getFlagForCountry(city.country)} ${city.name}`).join(' -> ')}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#f3ead8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a6a22]">
              {preset.nights}n
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-[#6a6459]">
            {preset.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {preset.bestFor.map((tag) => (
              <span key={tag} className="rounded-full bg-[#faf8f5] px-2 py-0.5 text-[10px] font-medium text-[#8a8578]">
                {tag}
              </span>
            ))}
          </div>
        </motion.button>
      ))}
    </div>
  );
}

export function PendingCityPicker({ pendingInput, onCitySelect }) {
  const suggestions = (pendingInput.data?.suggestions || [])
    .map((city) => (typeof city === 'string' ? { id: city, name: city } : city))
    .filter((city) => city?.name);
  const purpose = pendingInput.data?.purpose || 'stop';
  const regionLabels = [...new Set(suggestions.map((city) => city.regionFocus).filter(Boolean))];
  const suggestionLabel = regionLabels.length === 1
    ? `Good bases for ${regionLabels[0]}`
    : regionLabels.length > 1
      ? `Recommended bases for ${regionLabels.join(' + ')}`
      : 'Suggested stops';

  return (
    <div className="space-y-3 py-1">
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-[#e5e0d8] bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8578]">
            {suggestionLabel}
          </p>
          <div className="mt-2 grid gap-2">
            {suggestions.slice(0, 5).map((city) => (
              <button
                key={city.id || city.name}
                type="button"
                onClick={() => onCitySelect(city)}
                className="group rounded-2xl border border-[#e5e0d8] bg-[#faf8f5] p-3 text-left transition hover:border-[#c9a227] hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-semibold text-[#2a2520]">
                      {city.country ? `${getFlagForCountry(city.country)} ` : ''}
                      {city.name}
                      {city.country ? (
                        <span className="font-sans text-sm font-normal text-[#8a8578]">, {city.country}</span>
                      ) : null}
                    </p>
                    {city.reason && (
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#6a6459]">
                        {city.reason}
                      </p>
                    )}
                    {(city.regionFocus || city.routeRole || city.transportNote) && (
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8578]">
                        {[city.regionFocus, city.routeRole, city.transportNote].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-[#2a2520] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition group-hover:bg-[#c9a227]">
                    Add
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <CitySearchInput
        purpose={purpose}
        label={suggestions.length > 0 ? 'Search another city' : undefined}
        placeholder={suggestions.length > 0 ? 'Search another city to add...' : undefined}
        suggestions={[]}
        onSelect={onCitySelect}
      />
    </div>
  );
}
