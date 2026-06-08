'use client';

import { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Plane } from 'lucide-react';
import { useGettingInData } from '@/components/city-guides/startHere/hooks/useGettingInData';
import { TransportOptionList } from '@/components/city-guides/TransportOptionCard';
import { ACCENT, FlightBanner, flightLabel } from '../shared';
import { matchArrivalAirport } from './airportMatch';

// Mapbox is client-only; keep it in its own chunk so it loads only on the arrival day.
const AirportRouteMap = dynamic(() => import('@/components/city-guides/AirportRouteMap'), {
  ssr: false,
  loading: () => <div className="h-60 w-full animate-pulse rounded-xl bg-zinc-100 sm:h-72" />,
});

const HAS_MAP = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

/**
 * "Getting to your stay" — the arrival-day logistics card. Loads the destination
 * city's curated getting-in data, matches the booked flight's arrival airport, and
 * shows transit options + a route map + a final-leg note to the user's lodging.
 *
 * Degrades to the plain <FlightBanner> when there's no curated data or no airport
 * match (e.g. train-station arrivals, cities without a getting-in.json) — zero regression.
 */
export default function ArrivalLogistics({ arrival, citySlug, cityName, accommodation, t }) {
  const {
    gettingInData,
    selectedAirport,
    selectedAirportData,
    selectedRouteId,
    handleSelectAirport,
    handleSelectRoute,
  } = useGettingInData(citySlug);

  const matched = useMemo(
    () => matchArrivalAirport(gettingInData, arrival),
    [gettingInData, arrival],
  );

  // The hook defaults to airports[0]; steer selection to the airport we actually land at.
  useEffect(() => {
    if (matched && selectedAirport && selectedAirport !== matched.code) {
      handleSelectAirport(matched.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, selectedAirport]);

  // No curated data / unmatched airport → fall back to the existing banner.
  if (!gettingInData || !matched) {
    return (
      <div className="mb-1">
        <FlightBanner kind="arrival" booking={arrival} accommodationName={accommodation?.name} />
      </div>
    );
  }

  const activeAirport = selectedAirportData || matched;
  const fl = flightLabel(arrival);
  const selectedRoute = activeAirport.routes?.find((r) => r.id === selectedRouteId);
  const finalLegFrom = selectedRoute?.destination || gettingInData.cityCenter?.name || 'the centre';

  return (
    <section className={`mb-4 rounded-2xl border ${t.panel} p-4 sm:p-5`}>
      <div className="flex items-start gap-2.5">
        <Plane className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
        <div className="min-w-0 flex-1">
          <h4 className={`text-sm font-semibold ${t.heading}`}>Getting to your stay</h4>
          <p className={`text-xs ${t.muted}`}>
            Arrive {cityName}{arrival.arrivalTime ? ` ${arrival.arrivalTime}` : ''}
            {fl ? ` · ${fl}` : ''}
            {accommodation?.name ? ` · Check in to ${accommodation.name}` : ''}
          </p>
        </div>
        {gettingInData.airports.length > 1 && (
          <div className="flex shrink-0 rounded-lg bg-zinc-100 p-1">
            {gettingInData.airports.map((ap) => (
              <button
                key={ap.code}
                type="button"
                onClick={() => handleSelectAirport(ap.code)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  selectedAirport === ap.code
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {ap.code}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeAirport.routes?.length > 0 && (
        <div className="mt-3">
          <TransportOptionList
            routes={activeAirport.routes.slice(0, 3)}
            selectedRouteId={selectedRouteId}
            onSelectRoute={handleSelectRoute}
            layout="row"
            compact
          />
        </div>
      )}

      {HAS_MAP && (
        <div className="mt-3 overflow-hidden rounded-xl">
          <AirportRouteMap
            data={gettingInData}
            selectedAirport={selectedAirport}
            selectedRouteId={selectedRouteId}
            onSelectAirport={handleSelectAirport}
            onSelectRoute={handleSelectRoute}
            className="h-60 sm:h-72"
          />
        </div>
      )}

      {accommodation?.address && (
        <p className={`mt-3 text-xs ${t.muted}`}>
          From {finalLegFrom}, your stay at{' '}
          <span className={t.body}>{accommodation.address}</span> is a short metro or taxi ride.
        </p>
      )}
    </section>
  );
}
