import { useEffect, useMemo, useState } from 'react';
import { getCitySection } from '@/lib/city-data';

/**
 * Fetch getting-in.json for a city and manage airport / route selection state.
 * Returns null gettingInData if the city has no file yet.
 *
 * Phase A: `country` is accepted for backwards compatibility and ignored —
 * the loader resolves it from the city slug.
 */
export function useGettingInData(cityKey, _country) {
  const [gettingInData, setGettingInData] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  useEffect(() => {
    if (!cityKey) return;
    let cancelled = false;
    getCitySection(cityKey, 'prose.gettingIn')
      .then((data) => {
        if (cancelled || !data) return;
        setGettingInData(data);
        if (data.airports?.length > 0) {
          setSelectedAirport(data.airports[0].code);
        }
      })
      .catch(() => {
        // Silently fail - city doesn't have getting-in.json yet
      });
    return () => { cancelled = true; };
  }, [cityKey]);

  const selectedAirportData = useMemo(() => {
    if (!gettingInData || !selectedAirport) return null;
    return gettingInData.airports?.find((a) => a.code === selectedAirport);
  }, [gettingInData, selectedAirport]);

  const handleSelectAirport = (code) => {
    setSelectedAirport(code);
    setSelectedRouteId(null);
  };

  const handleSelectRoute = (routeId) => {
    setSelectedRouteId((prev) => (prev === routeId ? null : routeId));
  };

  return {
    gettingInData,
    selectedAirport,
    selectedAirportData,
    selectedRouteId,
    handleSelectAirport,
    handleSelectRoute,
  };
}
