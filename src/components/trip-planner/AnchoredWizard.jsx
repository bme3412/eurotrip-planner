'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, FolderOpen, Save, Trash2, X } from 'lucide-react';
import StepTripSetup from './StepTripSetup';
import StepGaps from './StepGaps';
import StepPreferences from './StepPreferences';
import StepReview from './StepReview';
import TripTimeline from './TripTimeline';
import TripMap from './TripMap';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders';
import citiesData from '@/generated/cities.json';
import {
  getLocalTripDraft,
  upsertLocalTripDraft,
  readLocalTripDrafts,
  removeLocalTripDraft,
  migrateLegacyWizardItineraries,
} from '@/lib/trips/localTripDrafts';
import { normalizeTripState } from '@/lib/trips/tripLifecycle';
import { getTripBriefCompleteness } from '@/lib/trips/tripBriefCompleteness';

const STEPS = [
  { id: 'setup', label: 'Your Trip', description: 'Where and when are you traveling?' },
  { id: 'stops', label: 'Add Stops', description: 'Discover cities along your route' },
  { id: 'preferences', label: 'Preferences', description: 'How do you like to travel?' },
  { id: 'review', label: 'Review', description: 'Finalize your trip' },
];

function parseIsoDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value, count) {
  const date = parseIsoDate(value);
  if (!date) return null;
  date.setDate(date.getDate() + count);
  return toIsoDate(date);
}

function buildCityDayList(city) {
  if (!city?.arrivalDate) return [];
  const nights = Number.isFinite(city.nights) ? city.nights : null;
  if (nights != null && nights > 0) {
    return Array.from({ length: nights }, (_, index) => addDays(city.arrivalDate, index)).filter(Boolean);
  }
  const start = parseIsoDate(city.arrivalDate);
  const end = parseIsoDate(city.departureDate);
  if (!start || !end || end <= start) return [city.arrivalDate];
  const days = [];
  const cursor = new Date(start);
  while (cursor < end) {
    days.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function findWizardCity(city) {
  if (!city) return null;
  const id = city.id || city.name?.toLowerCase?.();
  const matched = citiesData.find((item) =>
    item.id === id ||
    item.name?.toLowerCase() === city.name?.toLowerCase()
  );
  return matched || {
    id,
    name: city.name,
    country: city.country,
    lat: city.latitude,
    lng: city.longitude,
  };
}

function hydrateWizardDraft(tripState) {
  const normalized = normalizeTripState(tripState);
  const orderedCities = [...(normalized.route?.cities || [])]
    .filter((city) => city?.name)
    .sort((a, b) => (Number.isFinite(a.order) ? a.order : 999) - (Number.isFinite(b.order) ? b.order : 999));
  const first = orderedCities[0] || null;
  const last = orderedCities.length > 1 ? orderedCities[orderedCities.length - 1] : null;
  const middle = orderedCities.length > 2 ? orderedCities.slice(1, -1) : [];
  const paceId = normalized.preferences?.pace || 'balanced';
  const paceValue = paceId === 'relaxed' ? 15 : paceId === 'active' ? 85 : 50;
  const inbound = normalized.transport?.bookings?.find((booking) => booking.direction === 'inbound') || null;
  const outbound = normalized.transport?.bookings?.find((booking) => booking.direction === 'outbound') || null;

  return {
    tripDates: {
      start: normalized.dates?.startDate || '',
      end: normalized.dates?.endDate || '',
    },
    startCity: findWizardCity(first),
    endCity: findWizardCity(last),
    startCityDays: buildCityDayList(first),
    endCityDays: buildCityDayList(last),
    intermediateStops: middle.map((city) => ({
      id: city.id || city.name?.toLowerCase(),
      city: findWizardCity(city),
      cityName: city.name,
      days: buildCityDayList(city),
    })),
    preferences: {
      pace: paceValue,
      paceId,
      interests: normalized.preferences?.interests || [],
      budget: normalized.budget?.style || 'moderate',
      accommodationStyle: normalized.preferences?.accommodationStyle || '',
      transportPreference: normalized.transport?.preferredMode || '',
      groupType: normalized.travelers?.groupType || '',
      travelerCount: normalized.travelers?.count || '',
      constraints: normalized.brief?.hardConstraints?.[0] || '',
    },
    departureTransport: inbound ? {
      type: inbound.type || 'flight',
      date: inbound.departureDate || '',
      arrivalDate: inbound.arrivalDate || '',
      departureTime: inbound.departureTime || '',
      arrivalTime: inbound.arrivalTime || '',
      details: inbound.raw || inbound.flightNumber || '',
      confirmationCode: inbound.reference || '',
    } : null,
    returnTransport: outbound ? {
      type: outbound.type || 'flight',
      date: outbound.departureDate || '',
      arrivalDate: outbound.arrivalDate || '',
      departureTime: outbound.departureTime || '',
      arrivalTime: outbound.arrivalTime || '',
      details: outbound.raw || outbound.flightNumber || '',
      confirmationCode: outbound.reference || '',
    } : null,
    startCityArrivalTime: first?.arrivalTime || inbound?.arrivalTime || '',
    endCityDepartureTime: last?.departureTime || outbound?.departureTime || '',
    currentStep: orderedCities.length >= 2 && normalized.dates?.startDate && normalized.dates?.endDate ? 3 : 0,
  };
}

function wizardCityToTripStateCity(city, { role, order, nights } = {}) {
  if (!city) return null;
  return {
    id: city.id || city.name?.toLowerCase?.() || null,
    name: city.name || city.id || null,
    country: city.country || null,
    latitude: city.lat || city.latitude || null,
    longitude: city.lng || city.longitude || null,
    role,
    order,
    nights: Number.isFinite(Number(nights)) ? Number(nights) : null,
  };
}

function transportToBooking(transport, { direction, fromCity, toCity } = {}) {
  if (!transport) return null;
  const hasDetails = transport.date || transport.departureTime || transport.arrivalTime || transport.time || transport.details || transport.confirmationCode;
  if (!hasDetails) return null;
  const departureDate = transport.departureDate || transport.date || null;
  const arrivalDate = transport.arrivalDate || departureDate;
  return {
    id: `${direction}_${departureDate || 'date'}_${transport.type || 'transport'}`,
    direction,
    type: transport.type || 'flight',
    provider: null,
    reference: transport.confirmationCode || null,
    flightNumber: transport.type === 'flight' ? transport.details || null : null,
    fromCity: fromCity?.name || fromCity?.id || null,
    toCity: toCity?.name || toCity?.id || null,
    departureDate,
    departureTime: transport.departureTime || transport.time || null,
    arrivalDate,
    arrivalTime: transport.arrivalTime || null,
    raw: transport.details || null,
  };
}

function buildWizardTripState({
  tripDates,
  startCity,
  endCity,
  startCityDays,
  endCityDays,
  intermediateStops,
  stopSelections,
  departureTransport,
  returnTransport,
  startCityArrivalTime,
  endCityDepartureTime,
  preferences,
}) {
  const stops = [
    ...intermediateStops,
    ...Object.values(stopSelections || {}).map((selection) => ({
      id: `selection-${selection.city}`,
      city: {
        id: selection.city,
        name: selection.cityName,
        country: selection.country,
      },
      days: Array.isArray(selection.days)
        ? selection.days
        : Array.from({ length: Number(selection.days) || 0 }),
      transportType: selection.transportType,
      transportTime: selection.transportTime,
    })),
  ];
  const cities = [
    wizardCityToTripStateCity(startCity, {
      role: 'start',
      order: 0,
      nights: startCityDays.length || null,
    }),
    ...stops.map((stop, index) => ({
      ...wizardCityToTripStateCity(stop.city, {
        role: 'stop',
        order: index + 1,
        nights: Array.isArray(stop.days) ? stop.days.length : Number(stop.days) || null,
      }),
      arrivalTime: stop.arrivalTime || null,
      transportType: stop.transportType || null,
      transportTime: stop.transportTime || null,
    })),
    wizardCityToTripStateCity(endCity, {
      role: 'end',
      order: stops.length + 1,
      nights: endCityDays.length || null,
    }),
  ].filter(Boolean);

  const transportBookings = [
    transportToBooking(departureTransport, { direction: 'inbound', toCity: startCity }),
    transportToBooking(returnTransport, { direction: 'outbound', fromCity: endCity }),
  ].filter(Boolean);

  if (startCityArrivalTime && cities[0]) {
    cities[0].arrivalTime = startCityArrivalTime;
    cities[0].notes = `Arrive around ${startCityArrivalTime}.`;
  }
  if (endCityDepartureTime && cities[cities.length - 1]) {
    cities[cities.length - 1].departureTime = endCityDepartureTime;
    cities[cities.length - 1].notes = `Depart around ${endCityDepartureTime}.`;
  }

  return normalizeTripState({
    route: {
      cities,
      routeShape: cities.length > 1 ? 'one-way' : null,
    },
    dates: {
      startDate: tripDates.start || null,
      endDate: tripDates.end || null,
      totalNights: cities.reduce((sum, city) => sum + (Number(city.nights) || 0), 0) || null,
      flexibility: tripDates.start && tripDates.end ? 'fixed' : null,
    },
    transport: {
      preferredMode: preferences.transportPreference || null,
      bookings: transportBookings,
    },
    preferences: {
      pace: preferences.paceId || null,
      interests: preferences.interests || [],
      accommodationStyle: preferences.accommodationStyle || null,
    },
    budget: {
      style: preferences.budget || null,
    },
    travelers: {
      groupType: preferences.groupType || null,
      count: Number(preferences.travelerCount) || null,
    },
    brief: {
      hardConstraints: preferences.constraints ? [preferences.constraints] : [],
      notes: [
        departureTransport?.details ? `Inbound travel: ${departureTransport.details}` : null,
        returnTransport?.details ? `Outbound travel: ${returnTransport.details}` : null,
      ].filter(Boolean),
    },
  });
}

export default function AnchoredWizard({
  initialStartCityId,
  initialEndCityId,
  initialStartDate,
  initialEndDate,
  initialTripId = null,
  initialLocalTripId = null,
  initialTripState = null,
  onTripStateChange = null,
  isAuditMode = false,
  auditCityIds = [],
}) {
  const { session, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const lastHydratedRef = useRef(null);
  const lastEmittedRef = useRef(null);

  // Trip state - simplified model
  const [tripDates, setTripDates] = useState({ start: '', end: '' });
  const [startCity, setStartCity] = useState(null);
  const [endCity, setEndCity] = useState(null);
  const [startCityDays, setStartCityDays] = useState([]); // Array of date strings
  const [endCityDays, setEndCityDays] = useState([]); // Array of date strings
  const [intermediateStops, setIntermediateStops] = useState([]); // Planned stops from setup
  const [stopSelections, setStopSelections] = useState({}); // intermediate cities from discovery
  const [departureTransport, setDepartureTransport] = useState(null); // { type, date, time, details, confirmationCode }
  const [returnTransport, setReturnTransport] = useState(null);
  const [startCityArrivalTime, setStartCityArrivalTime] = useState(''); // Arrival time at start city
  const [endCityDepartureTime, setEndCityDepartureTime] = useState(''); // Departure time from end city
  const [preferences, setPreferences] = useState({
    pace: 50,
    paceId: 'balanced',
    interests: [],
    budget: 'moderate',
    accommodationStyle: '',
    transportPreference: '',
    groupType: '',
    travelerCount: '',
    constraints: '',
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [generatedItinerary, setGeneratedItinerary] = useState(null);

  // Suggestions state for unified map
  const [currentSuggestions, setCurrentSuggestions] = useState([]);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);

  // Save/Load state
  const [savedItineraries, setSavedItineraries] = useState([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [itineraryName, setItineraryName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Load saved drafts from the canonical local-drafts store (migrates legacy key on first run)
  useEffect(() => {
    migrateLegacyWizardItineraries();
    setSavedItineraries(readLocalTripDrafts());
  }, []);

  const applyHydratedDraft = useCallback((tripState) => {
    const hydrated = hydrateWizardDraft(tripState);
    setTripDates(hydrated.tripDates);
    setStartCity(hydrated.startCity);
    setEndCity(hydrated.endCity);
    setStartCityDays(hydrated.startCityDays);
    setEndCityDays(hydrated.endCityDays);
    setIntermediateStops(hydrated.intermediateStops);
    setPreferences(hydrated.preferences);
    setDepartureTransport(hydrated.departureTransport);
    setReturnTransport(hydrated.returnTransport);
    setStartCityArrivalTime(hydrated.startCityArrivalTime);
    setEndCityDepartureTime(hydrated.endCityDepartureTime);
    setCurrentStep(hydrated.currentStep);
  }, []);

  // Re-hydrate when parent supplies a new initialTripState reference (e.g., after mode toggle)
  useEffect(() => {
    if (!initialized) return;
    if (!initialTripState?.route?.cities?.length) return;
    if (initialTripState === lastHydratedRef.current) return;
    if (initialTripState === lastEmittedRef.current) return;
    lastHydratedRef.current = initialTripState;
    applyHydratedDraft(initialTripState);
  }, [initialized, initialTripState, applyHydratedDraft]);

  // Initialize from URL params (runs once)
  useEffect(() => {
    if (initialized) return;
    if (initialTripId && authLoading) return;

    if (initialTripState?.route?.cities?.length) {
      lastHydratedRef.current = initialTripState;
      applyHydratedDraft(initialTripState);
      setInitialized(true);
      return;
    }

    if (initialLocalTripId && !initialTripId) {
      const draft = getLocalTripDraft(initialLocalTripId);
      if (draft?.trip_state) {
        applyHydratedDraft(draft.trip_state);
        setInitialized(true);
        return;
      }
    }

    if (initialTripId) {
      let cancelled = false;
      fetch(`/api/trips/${initialTripId}`, {
        headers: getSupabaseAuthHeaders(session),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        })
        .then((trip) => {
          if (cancelled) return;
          if (trip?.trip_state) applyHydratedDraft(trip.trip_state);
          setInitialized(true);
        })
        .catch((error) => {
          console.warn('[AnchoredWizard] Failed to load trip draft:', error);
          setInitialized(true);
        });
      return () => {
        cancelled = true;
      };
    }

    // Helper to find city by ID
    const findCity = (id) => citiesData.find(c => c.id === id) || null;

    // Set dates if provided
    if (initialStartDate || initialEndDate) {
      setTripDates({
        start: initialStartDate || '',
        end: initialEndDate || '',
      });
    }

    // Set start city if provided
    if (initialStartCityId) {
      const city = findCity(initialStartCityId);
      if (city) setStartCity(city);
    }

    // Set end city if provided
    if (initialEndCityId) {
      const city = findCity(initialEndCityId);
      if (city) setEndCity(city);
    }

    // Handle audit mode - populate intermediate stops from city IDs
    if (isAuditMode && auditCityIds.length > 0) {
      const cities = auditCityIds.map(findCity).filter(Boolean);
      if (cities.length >= 2) {
        // First city is start, last is end
        setStartCity(cities[0]);
        setEndCity(cities[cities.length - 1]);
        // Middle cities are intermediate stops
        if (cities.length > 2) {
          const intermediates = cities.slice(1, -1).map(city => ({
            city,
            cityName: city.name,
            days: [],
          }));
          setIntermediateStops(intermediates);
        }
      }
      // Jump to step 2 (Add Stops) to show route validation
      setCurrentStep(1);
    }

    setInitialized(true);
  }, [initialized, initialLocalTripId, initialTripId, initialTripState, initialStartCityId, initialEndCityId, initialStartDate, initialEndDate, isAuditMode, auditCityIds, session, authLoading, applyHydratedDraft]);

  // Save current trip to the canonical local-drafts store
  const handleSaveItinerary = useCallback(() => {
    const name = itineraryName.trim() || `Trip ${new Date().toLocaleDateString()}`;
    const canonicalTripState = buildWizardTripState({
      tripDates,
      startCity,
      endCity,
      startCityDays,
      endCityDays,
      intermediateStops,
      stopSelections,
      departureTransport,
      returnTransport,
      startCityArrivalTime,
      endCityDepartureTime,
      preferences,
    });
    const draft = upsertLocalTripDraft({
      id: `wizard_${Date.now().toString(36)}`,
      tripState: canonicalTripState,
      title: name,
      generatedItinerary,
      itineraryGeneratedAt: generatedItinerary ? new Date().toISOString() : null,
    });
    setSavedItineraries((prev) => [draft, ...prev.filter((d) => d.id !== draft.id)]);
    setShowSaveInput(false);
    setItineraryName('');
  }, [
    itineraryName, tripDates, startCity, endCity, startCityDays, endCityDays,
    intermediateStops, stopSelections, departureTransport, returnTransport,
    startCityArrivalTime, endCityDepartureTime, preferences, generatedItinerary,
  ]);

  // Load a saved draft (canonical shape with `trip_state`)
  const handleLoadItinerary = useCallback((saved) => {
    if (saved?.trip_state) {
      applyHydratedDraft(saved.trip_state);
      if (saved.generated_itinerary) setGeneratedItinerary(saved.generated_itinerary);
    }
    setShowSavedModal(false);
  }, [applyHydratedDraft]);

  // Delete a saved draft from the canonical store
  const handleDeleteItinerary = useCallback((id) => {
    removeLocalTripDraft(id);
    setSavedItineraries((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // Auto-select first day for start city (start city always begins at index 0)
  useEffect(() => {
    if (startCity && tripDates?.start && startCityDays.length === 0) {
      setStartCityDays([tripDates.start]);
    }
  }, [startCity, tripDates?.start, startCityDays.length]);

  // Auto-select last day for end city (end city always ends at the last day)
  useEffect(() => {
    if (endCity && tripDates?.end && endCityDays.length === 0) {
      setEndCityDays([tripDates.end]);
    }
  }, [endCity, tripDates?.end, endCityDays.length]);

  // === CASCADING UPDATES: When Step 1 changes, update Step 2 data ===

  // Effect 1: Watch trip dates - filter intermediate stops to valid range
  useEffect(() => {
    if (!tripDates.start || !tripDates.end) return;

    const start = new Date(tripDates.start + 'T00:00:00');
    const end = new Date(tripDates.end + 'T23:59:59');

    setIntermediateStops(prev => {
      const filtered = prev.map(stop => ({
        ...stop,
        days: (stop.days || []).filter(d => {
          const date = new Date(d + 'T12:00:00');
          return date >= start && date <= end;
        })
      })).filter(stop => stop.days.length > 0);

      // Only update if something changed
      if (JSON.stringify(filtered) !== JSON.stringify(prev)) {
        return filtered;
      }
      return prev;
    });

    // Clear gap selections for regeneration
    setStopSelections({});
  }, [tripDates.start, tripDates.end]);

  // Effect 2: Watch anchor city changes - clear selections when route changes
  useEffect(() => {
    if (startCity?.id || endCity?.id) {
      setStopSelections({});
    }
  }, [startCity?.id, endCity?.id]);

  // Effect 3: Watch anchor day changes - remove overlapping intermediate days
  useEffect(() => {
    if (!startCityDays.length && !endCityDays.length) return;

    const anchorDays = new Set([...startCityDays, ...endCityDays]);

    setIntermediateStops(prev => {
      const filtered = prev.map(stop => ({
        ...stop,
        days: (stop.days || []).filter(d => !anchorDays.has(d))
      })).filter(stop => stop.days.length > 0);

      // Only update if something changed
      if (JSON.stringify(filtered) !== JSON.stringify(prev)) {
        return filtered;
      }
      return prev;
    });

    setStopSelections({});
  }, [startCityDays, endCityDays]);

  // Build anchors from start/end cities for compatibility with existing gap logic
  const anchors = useMemo(() => {
    const result = [];
    if (startCity && startCityDays.length > 0) {
      const sortedDays = [...startCityDays].sort();
      result.push({
        id: 'start',
        city: startCity.id,
        cityName: startCity.name,
        country: startCity.country,
        startDate: sortedDays[0],
        endDate: sortedDays[sortedDays.length - 1],
        days: startCityDays.length,
        isStart: true,
      });
    }
    if (endCity && endCityDays.length > 0) {
      const sortedDays = [...endCityDays].sort();
      result.push({
        id: 'end',
        city: endCity.id,
        cityName: endCity.name,
        country: endCity.country,
        startDate: sortedDays[0],
        endDate: sortedDays[sortedDays.length - 1],
        days: endCityDays.length,
        isEnd: true,
      });
    }
    return result;
  }, [startCity, endCity, startCityDays, endCityDays]);

  // Calculate the gap between start and end cities (accounting for intermediate stops)
  const gaps = useMemo(() => {
    if (!startCity || !endCity || startCityDays.length === 0 || endCityDays.length === 0) {
      return [];
    }

    const sortedStartDays = [...startCityDays].sort();
    const sortedEndDays = [...endCityDays].sort();

    // Gap starts after last day in start city
    const lastStartDay = new Date(sortedStartDays[sortedStartDays.length - 1] + 'T12:00:00');
    lastStartDay.setDate(lastStartDay.getDate() + 1);
    const gapStart = lastStartDay.toISOString().split('T')[0];

    // Gap ends before first day in end city
    const firstEndDay = new Date(sortedEndDays[0] + 'T12:00:00');
    firstEndDay.setDate(firstEndDay.getDate() - 1);
    const gapEnd = firstEndDay.toISOString().split('T')[0];

    const gapStartDate = new Date(gapStart + 'T12:00:00');
    const gapEndDate = new Date(gapEnd + 'T12:00:00');
    const totalGapDays = Math.round((gapEndDate - gapStartDate) / (1000 * 60 * 60 * 24)) + 1;

    if (totalGapDays <= 0) return [];

    // Subtract days already filled by intermediate stops
    const filledDays = new Set();
    intermediateStops.forEach(stop => {
      (stop.days || []).forEach(d => filledDays.add(d));
    });

    // Calculate remaining unfilled gap days
    const gapDays = totalGapDays - filledDays.size;

    if (gapDays <= 0) return [];

    return [{
      id: 'main-gap',
      startDate: gapStart,
      endDate: gapEnd,
      days: gapDays,
      totalDays: totalGapDays,
      filledDays: filledDays.size,
      previousCity: startCity.id,
      previousCityName: startCity.name,
      nextCity: endCity.id,
      nextCityName: endCity.name,
    }];
  }, [startCity, endCity, startCityDays, endCityDays, intermediateStops]);

  // Build the full itinerary for timeline/map display
  const itinerary = useMemo(() => {
    const items = [];

    if (anchors.length > 0) {
      // Add start city
      const start = anchors.find(a => a.isStart);
      if (start) {
        items.push({ type: 'anchor', ...start });
      }

      // Add intermediate stops from Step 1 (sorted by first day)
      const sortedIntermediateStops = [...intermediateStops].sort((a, b) => {
        const aDate = a.days?.[0] || '';
        const bDate = b.days?.[0] || '';
        return aDate.localeCompare(bDate);
      });

      sortedIntermediateStops.forEach(stop => {
        if (stop.city) {
          items.push({
            type: 'intermediate',
            id: stop.id,
            city: stop.city.id,
            cityName: stop.city.name,
            country: stop.city.country,
            days: stop.days?.length || 0,
            startDate: stop.days?.[0],
            endDate: stop.days?.[stop.days.length - 1],
            lat: stop.city.lat,
            lng: stop.city.lng,
          });
        }
      });

      // Add gap selections from Step 2
      if (Object.keys(stopSelections).length > 0) {
        Object.values(stopSelections).forEach(stop => {
          items.push({
            type: 'gap-filled',
            ...stop,
            gapId: 'main-gap',
          });
        });
      } else if (gaps.length > 0 && intermediateStops.length === 0) {
        // Show empty gap only if no intermediate stops
        const gap = gaps[0];
        items.push({ type: 'gap', ...gap });
      }

      // Add end city
      const end = anchors.find(a => a.isEnd);
      if (end) {
        items.push({ type: 'anchor', ...end });
      }
    }

    return items;
  }, [anchors, gaps, stopSelections, intermediateStops]);

  const canonicalTripState = useMemo(() => buildWizardTripState({
    tripDates,
    startCity,
    endCity,
    startCityDays,
    endCityDays,
    intermediateStops,
    stopSelections,
    departureTransport,
    returnTransport,
    startCityArrivalTime,
    endCityDepartureTime,
    preferences,
  }), [
    tripDates,
    startCity,
    endCity,
    startCityDays,
    endCityDays,
    intermediateStops,
    stopSelections,
    departureTransport,
    returnTransport,
    startCityArrivalTime,
    endCityDepartureTime,
    preferences,
  ]);
  const briefCompleteness = useMemo(
    () => getTripBriefCompleteness(canonicalTripState),
    [canonicalTripState]
  );

  useEffect(() => {
    if (!initialized || !onTripStateChange) return;
    lastEmittedRef.current = canonicalTripState;
    onTripStateChange(canonicalTripState);
  }, [canonicalTripState, initialized, onTripStateChange]);

  const validateStep = () => {
    setError(null);

    switch (STEPS[currentStep].id) {
      case 'setup':
        if (!tripDates.start || !tripDates.end) {
          setError('Please select your travel dates.');
          return false;
        }
        if (!startCity) {
          setError('Please select your start city.');
          return false;
        }
        if (startCityDays.length === 0) {
          setError('Please select which days you\'ll be in ' + startCity.name + '.');
          return false;
        }
        if (!endCity) {
          setError('Please select your end city.');
          return false;
        }
        if (endCityDays.length === 0) {
          setError('Please select which days you\'ll be in ' + endCity.name + '.');
          return false;
        }
        break;
      case 'stops':
        // Optional - user can skip
        break;
      case 'preferences':
        // Has defaults
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    if (STEPS[currentStep].id === 'stops') {
      setCurrentSuggestions([]);
      setHoveredSuggestion(null);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 0));
    if (STEPS[currentStep].id === 'stops') {
      setCurrentSuggestions([]);
      setHoveredSuggestion(null);
    }
  };

  const handleFillGap = (gapId, selection) => {
    setStopSelections(prev => ({
      ...prev,
      [selection.city]: selection,
    }));
  };

  const handleClearGap = (gapId) => {
    // Clear all stops for now (single gap model)
    setStopSelections({});
  };

  const handleClearStop = (cityId) => {
    setStopSelections(prev => {
      const next = { ...prev };
      delete next[cityId];
      return next;
    });
  };

  // Handlers for intermediate stops (from setup step)
  const handleAddIntermediateStop = (stop) => {
    setIntermediateStops(prev => [...prev, stop]);
  };

  const handleRemoveIntermediateStop = (stopId) => {
    setIntermediateStops(prev => prev.filter(s => s.id !== stopId));
  };

  const handleUpdateIntermediateStop = (stopId, updates) => {
    setIntermediateStops(prev => prev.map(s =>
      s.id === stopId ? { ...s, ...updates } : s
    ));
  };

  const handleUpdateSelection = (cityId, updates) => {
    setStopSelections(prev => ({
      ...prev,
      [cityId]: {
        ...prev[cityId],
        ...updates,
      },
    }));
  };

  // Reorder intermediate stops based on optimized route from RouteValidationPanel
  const handleOptimizeRoute = useCallback((optimizedStops) => {
    // Map optimized stops back to our intermediate stop format
    const optimizedIds = optimizedStops.map(s => s.cityId || s.city?.id || s.city);

    // Reorder intermediate stops to match optimized order
    const reorderedIntermediateStops = optimizedIds
      .map(cityId => intermediateStops.find(stop =>
        (stop.city?.id || stop.id) === cityId
      ))
      .filter(Boolean);

    // Handle stops that weren't in intermediateStops (from gap selections)
    const reorderedGapSelections = {};
    const gapSelectionValues = Object.values(stopSelections);

    optimizedIds.forEach(cityId => {
      const gapSelection = gapSelectionValues.find(sel => sel.city === cityId);
      if (gapSelection) {
        reorderedGapSelections[cityId] = gapSelection;
      }
    });

    // Update state
    if (reorderedIntermediateStops.length > 0) {
      setIntermediateStops(reorderedIntermediateStops);
    }
    if (Object.keys(reorderedGapSelections).length > 0) {
      setStopSelections(reorderedGapSelections);
    }
  }, [intermediateStops, stopSelections]);

  const handleSelectSuggestion = (suggestion) => {
    handleFillGap('main-gap', {
      city: suggestion.id,
      cityName: suggestion.name,
      country: suggestion.country,
      days: suggestion.recommendedDays,
      transportTime: suggestion.transportTime,
      transportType: suggestion.transportType,
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const orderedCities = [...(canonicalTripState.route?.cities || [])]
        .sort((a, b) => (Number.isFinite(a.order) ? a.order : 999) - (Number.isFinite(b.order) ? b.order : 999));
      const cities = orderedCities.map((city) => ({
        id: city.id,
        name: city.name,
        country: city.country,
      }));
      const dayAllocation = Object.fromEntries(
        orderedCities
          .filter((city) => city.id && Number.isFinite(Number(city.nights)))
          .map((city) => [city.id, Number(city.nights)])
      );

      const payload = {
        cities,
        start_date: tripDates.start,
        end_date: tripDates.end,
        interests: preferences.interests || [],
        pace: preferences.paceId || 'balanced',
        budget: preferences.budget || 'moderate',
        accommodation_style: preferences.accommodationStyle || null,
        transport_preference: preferences.transportPreference || null,
        transport_bookings: canonicalTripState.transport?.bookings || [],
        travelers: canonicalTripState.travelers,
        constraints: canonicalTripState.brief?.hardConstraints || [],
        trip_state: canonicalTripState,
        day_allocation: Object.keys(dayAllocation).length > 0 ? dayAllocation : null,
        city_order: cities.map(c => c.id),
      };

      const res = await fetch('/api/trips/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGeneratedItinerary(data.itinerary);
    } catch (e) {
      console.error('[AnchoredWizard] Generate failed:', e);
      setGenerateError('Failed to generate itinerary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const showMap = currentStep >= 1 && startCity && endCity && startCityDays.length > 0 && endCityDays.length > 0;
  const isStopsStep = step.id === 'stops';

  return (
    <div className={`flex flex-col ${showMap ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-4' : ''}`}>
      {/* Left: Map + Timeline (sticky on desktop) */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:sticky lg:top-4 lg:self-start space-y-3 mb-6 lg:mb-0"
          >
            <TripMap
              itinerary={itinerary}
              suggestions={isStopsStep ? currentSuggestions : []}
              hoveredSuggestion={hoveredSuggestion}
              onSelectSuggestion={handleSelectSuggestion}
              onHoverSuggestion={setHoveredSuggestion}
              className="h-64 overflow-hidden rounded-3xl border border-[#e5e0d8] lg:h-[calc(100vh-180px)] lg:min-h-[500px]"
            />

            <TripTimeline
              tripDates={tripDates}
              items={itinerary}
              onClearGap={handleClearStop}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right: Main content */}
      <div className={showMap ? '' : step.id === 'setup' ? 'w-full' : 'max-w-lg mx-auto w-full'}>
        <div className="mb-4 rounded-3xl border border-[#e5e0d8] bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8578]">
                Step by step brief
              </p>
              <h1 className="mt-1 font-display text-lg font-semibold text-[#2a2520]">
                {briefCompleteness.next ? briefCompleteness.next.label : 'Ready to build'}
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-[#6a6459]">
                {briefCompleteness.next
                  ? briefCompleteness.next.prompt
                  : 'Review the route, compare transport if needed, then build the itinerary.'}
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-[#faf8f5] px-3 py-1 text-xs font-semibold text-[#6a6459]">
              {briefCompleteness.completed.length}/{briefCompleteness.groups.length}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {briefCompleteness.groups.slice(0, 5).map((item) => (
              <span
                key={item.id}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${
                  item.complete
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-[#eadfc8] bg-[#fffaf0] text-[#7a6240]'
                }`}
              >
                {item.complete ? (
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Circle className="h-3 w-3" aria-hidden="true" />
                )}
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Progress bar + Save/Load buttons */}
        <div className="flex items-center gap-2 mb-4 rounded-2xl border border-[#e5e0d8] bg-white px-3 py-2 shadow-sm">
          {/* Step indicators (clickable) */}
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                // Allow going back to any completed step, or forward only if current validates
                if (i < currentStep) {
                  setCurrentStep(i);
                } else if (i === currentStep + 1 && validateStep()) {
                  setCurrentStep(i);
                }
              }}
              className="flex-1 group"
              title={s.label}
            >
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                  i <= currentStep ? 'bg-[#a08545]' : 'bg-[#e5e0d8] group-hover:bg-[#d5d0c8]'
                }`}
              />
            </button>
          ))}
          <span className="text-xs text-[#8a8578] tabular-nums ml-2">
            {currentStep + 1}/{STEPS.length}
          </span>

          {/* Save/Load buttons */}
          <div className="flex items-center gap-1 ml-2 border-l border-[#e5e0d8] pl-3">
            <button
              type="button"
              onClick={() => setShowSaveInput(true)}
              className="p-2 rounded-lg text-[#6a6459] hover:text-[#a08545] hover:bg-[#faf8f5] transition-colors"
              title="Save itinerary"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowSavedModal(true)}
              className="p-2 rounded-lg text-[#6a6459] hover:text-[#a08545] hover:bg-[#faf8f5] transition-colors relative"
              title="Load saved itinerary"
            >
              <FolderOpen className="w-4 h-4" />
              {savedItineraries.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#a08545] text-white text-[9px] font-medium rounded-full flex items-center justify-center">
                  {savedItineraries.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Save input popup */}
        {showSaveInput && (
          <div className="mb-4 p-4 bg-white rounded-xl border border-[#e5e0d8] shadow-lg">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={itineraryName}
                onChange={(e) => setItineraryName(e.target.value)}
                placeholder="Name your trip (optional)"
                className="flex-1 px-3 py-2 bg-[#faf8f5] border border-[#e5e0d8] rounded-lg text-sm focus:outline-none focus:border-[#c9a227]"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveItinerary()}
              />
              <button
                type="button"
                onClick={handleSaveItinerary}
                className="px-4 py-2 bg-[#a08545] hover:bg-[#8a7339] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setShowSaveInput(false); setItineraryName(''); }}
                className="p-2 text-[#8a8578] hover:text-[#2a2520]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Saved itineraries modal */}
        {showSavedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e5e0d8] flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#2a2520]">Saved Itineraries</h3>
                <button
                  type="button"
                  onClick={() => setShowSavedModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#8a8578] hover:bg-[#faf8f5]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {savedItineraries.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[#8a8578]">
                    No saved itineraries yet
                  </div>
                ) : (
                  savedItineraries.map((saved) => (
                    <div
                      key={saved.id}
                      className="px-5 py-4 border-b border-[#e5e0d8] last:border-0 hover:bg-[#faf8f5] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleLoadItinerary(saved)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium text-[#2a2520]">{saved.title || 'Untitled trip'}</div>
                          <div className="text-xs text-[#8a8578] mt-1">
                            {saved.cities?.length >= 2 ? (
                              <span>{saved.cities[0]?.name} → {saved.cities[saved.cities.length - 1]?.name}</span>
                            ) : saved.cities?.[0]?.name ? (
                              <span>{saved.cities[0].name}</span>
                            ) : (
                              <span>Draft</span>
                            )}
                            {saved.time_range?.startDate && (
                              <span className="ml-2">• {new Date(saved.time_range.startDate).toLocaleDateString()}</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#a5a098] mt-1">
                            Saved {new Date(saved.updated_at || saved.created_at).toLocaleDateString()}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItinerary(saved.id)}
                          className="p-2 text-[#a5a098] hover:text-[#991b1b] hover:bg-[#fef2f2] rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-5 py-3 border-t border-[#e5e0d8] bg-[#faf8f5]">
                <button
                  type="button"
                  onClick={() => setShowSavedModal(false)}
                  className="w-full px-4 py-2 text-sm text-[#6a6459] hover:text-[#2a2520]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Setup step - 3 containers side by side, no wrapper */}
        {step.id === 'setup' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {error && (
                <div className="mb-4 rounded-lg border border-[#d4a5a5] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
                  {error}
                </div>
              )}
              <StepTripSetup
                tripDates={tripDates}
                onChangeDates={setTripDates}
                startCity={startCity}
                endCity={endCity}
                onChangeStartCity={setStartCity}
                onChangeEndCity={setEndCity}
                startCityDays={startCityDays}
                endCityDays={endCityDays}
                onChangeStartCityDays={setStartCityDays}
                onChangeEndCityDays={setEndCityDays}
                intermediateStops={intermediateStops}
                onAddStop={handleAddIntermediateStop}
                onRemoveStop={handleRemoveIntermediateStop}
                onUpdateStop={handleUpdateIntermediateStop}
                departureTransport={departureTransport}
                returnTransport={returnTransport}
                onChangeDepartureTransport={setDepartureTransport}
                onChangeReturnTransport={setReturnTransport}
                startCityArrivalTime={startCityArrivalTime}
                endCityDepartureTime={endCityDepartureTime}
                onChangeStartCityArrivalTime={setStartCityArrivalTime}
                onChangeEndCityDepartureTime={setEndCityDepartureTime}
              />
              {/* Footer for setup */}
              <div className="mt-5 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="group px-6 py-2.5 bg-[#2a2520] hover:bg-[#3a3530] text-white text-sm font-medium rounded-lg transition-all"
                >
                  Continue
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Other steps - wrapped in card */}
        {step.id !== 'setup' && (
          <div className="rounded-2xl border border-[#e5e0d8] bg-white overflow-hidden shadow-xl shadow-[#2a2520]/5">
            {/* Step header (hidden for stops step) */}
            {step.id !== 'stops' && (
              <div className="px-5 py-4 border-b border-[#e5e0d8]">
                <h2
                  className="text-lg font-light text-[#2a2520] tracking-tight"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {step.label}
                </h2>
                <p className="text-sm text-[#6a6459] mt-0.5 font-light">{step.description}</p>
              </div>
            )}

            {/* Step content */}
            <div className="p-5">
              {error && (
                <div className="mb-4 rounded-lg border border-[#d4a5a5] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step.id === 'stops' && (
                    <StepGaps
                      gaps={gaps}
                      gapSelections={stopSelections}
                      anchors={anchors}
                      preferences={preferences}
                      startCity={startCity}
                      endCity={endCity}
                      intermediateStops={intermediateStops}
                      startCityDays={startCityDays}
                      endCityDays={endCityDays}
                      tripDates={tripDates}
                      onFillGap={handleFillGap}
                      onClearGap={handleClearGap}
                      onUpdateSelection={handleUpdateSelection}
                      onRemoveStop={handleRemoveIntermediateStop}
                      onOptimizeRoute={handleOptimizeRoute}
                      onSuggestionsLoaded={setCurrentSuggestions}
                      hoveredSuggestion={hoveredSuggestion}
                      onHoverSuggestion={setHoveredSuggestion}
                    />
                  )}
                  {step.id === 'preferences' && (
                    <StepPreferences
                      preferences={preferences}
                      onChangePreferences={setPreferences}
                    />
                  )}
                  {step.id === 'review' && (
                    <StepReview
                      tripDates={tripDates}
                      itinerary={itinerary}
                      preferences={preferences}
                      tripState={canonicalTripState}
                      onGenerate={handleGenerate}
                      isGenerating={isGenerating}
                      generateError={generateError}
                      generatedItinerary={generatedItinerary}
                      onRetry={handleGenerate}
                      onStartOver={() => {
                        setGeneratedItinerary(null);
                        setGenerateError(null);
                        setCurrentStep(0);
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#e5e0d8] flex items-center justify-between bg-[#faf8f5]">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="px-4 py-2 text-sm text-[#6a6459] hover:text-[#2a2520] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                &larr; Back
              </button>

              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !!generatedItinerary}
                  className="group px-6 py-2.5 bg-[#c9a227] hover:bg-[#d4af37] text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-[#c9a227]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : generatedItinerary ? (
                    'Itinerary Ready'
                  ) : (
                    <>
                      Generate Itinerary
                      <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="group px-6 py-2.5 bg-[#2a2520] hover:bg-[#3a3530] text-white text-sm font-medium rounded-lg transition-all"
                >
                  Continue
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
