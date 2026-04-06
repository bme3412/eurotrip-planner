'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MapPin, Clock, Check, Loader2, ArrowRight } from 'lucide-react';

/**
 * AIRouteCard - Displays a single AI-suggested route option
 */
function AIRouteCard({ route, onAccept, isAccepting }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#e5e0d8] bg-white overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#faf8f5] border-b border-[#e5e0d8]">
        <div className="flex items-center justify-between">
          <h4
            className="text-sm font-light text-[#2a2520]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {route.name}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-[#6a6459]">
            <Clock className="w-3 h-3" />
            {route.totalTravelTime} travel
          </div>
        </div>
      </div>

      {/* Route visualization */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {route.cities.map((city, idx) => (
            <div key={city.cityId || idx} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f5f3f0]">
                <MapPin className="w-3 h-3 text-[#a08545]" />
                <span className="text-sm text-[#2a2520]">{city.cityName}</span>
                <span className="text-xs text-[#8a8578]">{city.days}d</span>
              </div>
              {idx < route.cities.length - 1 && (
                <ArrowRight className="w-3 h-3 text-[#c9a227]" />
              )}
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="mt-3 text-xs text-[#6a6459] leading-relaxed">
          {route.description}
        </p>

        {/* Highlights */}
        {route.highlights?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {route.highlights.slice(0, 3).map((highlight, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-[10px] rounded-full bg-[#faf6eb] text-[#a08545]"
              >
                {highlight}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#e5e0d8] bg-[#faf8f5]">
        <button
          onClick={() => onAccept(route)}
          disabled={isAccepting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2a2520] hover:bg-[#3a3530] text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAccepting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Use This Route
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

/**
 * AIRouteSuggester - Panel for AI-generated route suggestions
 *
 * Props:
 * - startCity: { id, name }
 * - endCity: { id, name }
 * - gapDays: number
 * - gapStart: string (date)
 * - gapEnd: string (date)
 * - preferences: { interests, paceId, budget }
 * - onAcceptRoute: (route) => void
 * - onBack: () => void - Return to browse mode
 */
export default function AIRouteSuggester({
  startCity,
  endCity,
  gapDays,
  gapStart,
  gapEnd,
  preferences,
  onAcceptRoute,
  onBack,
}) {
  const [constraints, setConstraints] = useState('');
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const generateRoutes = async () => {
    setIsLoading(true);
    setError(null);
    setRoutes([]);

    try {
      const response = await fetch('/api/route-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCity: startCity,
          toCity: endCity,
          gapStart,
          gapEnd,
          gapDays,
          preferences,
          constraints,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate routes');
      }

      const data = await response.json();
      setRoutes(data.routes || []);
    } catch (err) {
      console.error('Route suggestion error:', err);
      setError('Failed to generate route suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (route) => {
    setIsAccepting(true);
    try {
      await onAcceptRoute(route);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a227] to-[#a08545] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3
            className="text-lg font-light text-[#2a2520]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            AI Route Suggester
          </h3>
          <p className="text-xs text-[#6a6459]">
            Let AI find the best route for your {gapDays} days
          </p>
        </div>
      </div>

      {/* Constraints input */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-[#6a6459] uppercase tracking-wider">
          Any specific requests? (optional)
        </label>
        <input
          type="text"
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          placeholder="e.g., I want to see the Alps, avoid flying..."
          className="w-full px-4 py-3 bg-white border border-[#e5e0d8] rounded-lg text-sm text-[#2a2520] placeholder:text-[#a5a098] focus:outline-none focus:border-[#c9a227]/50 transition-colors"
        />
      </div>

      {/* Generate button */}
      <button
        onClick={generateRoutes}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#c9a227] hover:bg-[#d4af37] text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating routes...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Route Options
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-sm text-[#991b1b]">
          {error}
        </div>
      )}

      {/* Route results */}
      <AnimatePresence>
        {routes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <p className="text-xs text-[#8a8578]">
              {routes.length} route option{routes.length > 1 ? 's' : ''} generated
            </p>
            {routes.map((route) => (
              <AIRouteCard
                key={route.id}
                route={route}
                onAccept={handleAccept}
                isAccepting={isAccepting}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to browse link */}
      <div className="text-center pt-2">
        <button
          onClick={onBack}
          className="text-xs text-[#a08545] hover:text-[#c9a227] transition-colors"
        >
          ← Back to browse cities
        </button>
      </div>
    </div>
  );
}
