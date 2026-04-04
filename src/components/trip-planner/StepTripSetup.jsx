'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, Plane, Calendar } from 'lucide-react';
import DateRangePopover from '@/components/common/DateRangePopover';
import { getAllCities } from '@/lib/planning/easeScoreCalculator';

function CitySelector({ label, icon: Icon, placeholder, value, onChange, cities }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = cities.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.country.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  const handleSelect = (city) => {
    onChange(city);
    setQuery(city.name);
    setIsOpen(false);
  };

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    }
  }, [value]);

  return (
    <div className="relative">
      <label className="block text-[10px] font-medium uppercase tracking-[0.15em] text-[#6a6459] mb-2">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8578]" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e0d8] rounded-lg text-[#2a2520] placeholder:text-[#a5a098] focus:outline-none focus:border-[#c9a227]/50 transition-colors"
        />
      </div>
      {isOpen && query && !value && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e5e0d8] rounded-lg overflow-hidden z-20 shadow-xl shadow-[#2a2520]/10">
          {filtered.map((city) => (
            <button
              key={city.id}
              onClick={() => handleSelect(city)}
              className="w-full px-4 py-2.5 text-left hover:bg-[#faf8f5] transition-colors flex items-center gap-3 border-b border-[#e5e0d8] last:border-0"
            >
              <MapPin className="w-3.5 h-3.5 text-[#8a8578]" />
              <span className="text-sm text-[#2a2520]">{city.name}</span>
              <span className="text-xs text-[#8a8578]">{city.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StepTripSetup({
  tripDates,
  onChangeDates,
  startCity,
  endCity,
  onChangeStartCity,
  onChangeEndCity,
}) {
  const [cities, setCities] = useState([]);

  useEffect(() => {
    getAllCities().then(setCities);
  }, []);

  const tripLength = useMemo(() => {
    if (!tripDates.start || !tripDates.end) return null;
    const s = new Date(tripDates.start + 'T12:00:00');
    const e = new Date(tripDates.end + 'T12:00:00');
    return Math.round((e - s) / (1000 * 60 * 60 * 24));
  }, [tripDates.start, tripDates.end]);

  return (
    <div className="space-y-6">
      {/* Dates */}
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-[0.15em] text-[#6a6459] mb-2">
          Travel Dates
        </label>
        <DateRangePopover
          value={tripDates}
          onChange={onChangeDates}
          showSearchLabelOnSelection={false}
        />
      </div>

      {/* Start/End cities - side by side */}
      <div className="grid grid-cols-2 gap-4">
        <CitySelector
          label="Flying into"
          icon={Plane}
          placeholder="Start city..."
          value={startCity}
          onChange={onChangeStartCity}
          cities={cities}
        />
        <CitySelector
          label="Flying out of"
          icon={Plane}
          placeholder="End city..."
          value={endCity}
          onChange={onChangeEndCity}
          cities={cities}
        />
      </div>

      {/* Summary badge */}
      {tripLength && startCity && endCity && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#faf6eb] border border-[#e5e0d8] text-sm">
            <span className="text-[#2a2520]">{startCity.name}</span>
            <span className="text-[#c9a227]">→</span>
            <span className="font-medium text-[#a08545]">{tripLength} days</span>
            <span className="text-[#c9a227]">→</span>
            <span className="text-[#2a2520]">{endCity.name}</span>
          </div>
        </div>
      )}

      {/* Help text */}
      {(!startCity || !endCity) && (
        <p className="text-center text-xs text-[#8a8578] italic pt-2">
          We&apos;ll help you discover cities to visit between your start and end points.
        </p>
      )}
    </div>
  );
}
