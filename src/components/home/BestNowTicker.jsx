"use client";

import { useEffect, useState } from "react";
import { useBestNow } from "@/hooks/useBestNow";

const ROTATE_MS = 3500;

function getCityName(c) {
  return c?.title || c?.cityName || c?.name || (c?.cityId || "").replace(/-/g, " ");
}

function getTierLabel(c) {
  return c?.tier || c?.tierLabel || null;
}

export default function BestNowTicker({ onCityClick, className = "", initialItems = null }) {
  const { items, loading } = useBestNow({ limit: 5, windowDays: 30, initialItems });
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!items || items.length <= 1) return;
    const id = setInterval(() => {
      setHighlight((h) => (h + 1) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [items]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center gap-3 text-sm text-gray-400 ${className}`}>
        <span className="font-medium">Best now:</span>
        <span className="inline-block h-4 w-64 animate-pulse rounded bg-gray-200/70" />
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm ${className}`}>
      <span className="font-semibold text-gray-700">Best now:</span>
      {items.map((c, i) => {
        const cityName = getCityName(c);
        const tier = getTierLabel(c);
        const isHi = i === highlight;
        return (
          <button
            key={c.cityId || c.id || cityName}
            type="button"
            onClick={() => onCityClick?.(c)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 capitalize transition-all ${
              isHi
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-700 hover:text-blue-600"
            }`}
          >
            <span className="font-medium">{cityName}</span>
            {tier && (
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isHi ? "text-blue-100" : "text-blue-600"}`}>
                {tier}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
