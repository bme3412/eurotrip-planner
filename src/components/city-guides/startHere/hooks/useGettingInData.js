import { useEffect, useMemo, useState } from 'react';
import { getCountryFolder } from '@/lib/city-data';

/**
 * Fetch /data/<country>/<city>/getting-in.json and manage airport / route
 * selection state. Returns null gettingInData if the city has no file yet.
 */
export function useGettingInData(cityKey, country) {
  const [gettingInData, setGettingInData] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!country || !cityKey) return;
      try {
        const countryFolder = getCountryFolder(country);
        const response = await fetch(
          `/data/${countryFolder}/${cityKey}/getting-in.json`,
        );
        if (response.ok) {
          const data = await response.json();
          setGettingInData(data);
          if (data.airports?.length > 0) {
            setSelectedAirport(data.airports[0].code);
          }
        }
      } catch {
        // Silently fail - city doesn't have getting-in.json yet
      }
    };
    fetchData();
  }, [cityKey, country]);

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
