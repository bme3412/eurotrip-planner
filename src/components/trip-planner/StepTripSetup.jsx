'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Calendar, Check, Plus, X, ChevronDown, ChevronLeft, ChevronRight, Plane, Train, Clock } from 'lucide-react';
import DateRangePopover from '@/components/common/DateRangePopover';
import { getAllCities } from '@/lib/planning/easeScoreCalculator';
import { getCountryFlag } from '@/utils/countryFlags';

/**
 * Format time for display (12-hour format)
 */
function formatTime(t) {
  if (!t) return null;
  try {
    const [hours, mins] = t.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${mins} ${ampm}`;
  } catch {
    return t;
  }
}

/**
 * CityCardCompact - Compact city card for the carousel
 */
function CityCardCompact({
  city,
  label,
  time,
  onChangeTime,
  timeLabel,
  selectedDays,
  onRemove,
  isFixed = false,
}) {
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [timeValue, setTimeValue] = useState(time || '');

  useEffect(() => {
    setTimeValue(time || '');
  }, [time]);

  const handleTimeSubmit = () => {
    onChangeTime?.(timeValue);
    setShowTimeInput(false);
  };

  const dayCount = selectedDays?.length || 0;

  return (
    <div className={`flex-shrink-0 w-[220px] p-4 rounded-2xl border shadow-sm ${
      isFixed ? 'bg-white border-[#e5e0d8]' : 'bg-[#faf8f5] border-[#e5e0d8]'
    }`}>
      {/* Header with label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-semibold text-[#8a8578] uppercase tracking-wider">
          {label}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[#a5a098] hover:text-[#991b1b] hover:bg-[#fef2f2] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* City name with flag */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{getCountryFlag(city.country)}</span>
        <span className="text-base font-semibold text-[#2a2520]">{city.name}</span>
      </div>

      {/* Time display/input */}
      <div className="mb-2">
        {showTimeInput ? (
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-white border border-[#e5e0d8] rounded-lg text-sm focus:outline-none focus:border-[#c9a227]"
              autoFocus
              onBlur={handleTimeSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTimeSubmit()}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowTimeInput(true)}
            className="flex items-center gap-1.5 text-sm text-[#6a6459] hover:text-[#2a2520]"
          >
            <Clock className="w-3.5 h-3.5 text-[#a08545]" />
            {time ? (
              <span className="font-medium">{formatTime(time)}</span>
            ) : (
              <span className="text-[#a5a098] text-xs">{timeLabel || 'Add time'}</span>
            )}
          </button>
        )}
      </div>

      {/* Day count */}
      {dayCount > 0 && (
        <div className="text-xs text-[#8a8578]">
          {dayCount} day{dayCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

/**
 * CityCarousel - Horizontal scrolling carousel for intermediate cities
 */
function CityCarousel({ children, className = '' }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [children]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const cardWidth = 230; // card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -cardWidth : cardWidth,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full bg-white border border-[#e5e0d8] shadow-lg flex items-center justify-center text-[#6a6459] hover:text-[#2a2520] hover:border-[#c9a227] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full bg-white border border-[#e5e0d8] shadow-lg flex items-center justify-center text-[#6a6459] hover:text-[#2a2520] hover:border-[#c9a227] transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

/**
 * CompactDaySelector - Smaller day selector for city cards
 */
function CompactDaySelector({ city, tripDates, selectedDays, onChange, otherCityDays, isStartCity, isEndCity }) {
  const days = useMemo(() => {
    if (!tripDates?.start || !tripDates?.end) return [];
    const result = [];
    const start = new Date(tripDates.start + 'T12:00:00');
    const end = new Date(tripDates.end + 'T12:00:00');
    let current = new Date(start);
    while (current <= end) {
      result.push({
        date: current.toISOString().split('T')[0],
        dayOfWeek: current.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: current.getDate(),
        month: current.toLocaleDateString('en-US', { month: 'short' }),
      });
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [tripDates?.start, tripDates?.end]);

  const handleDayClick = (clickedIndex) => {
    if (isStartCity) {
      const newSelected = [];
      for (let i = 0; i <= clickedIndex; i++) {
        if (otherCityDays?.includes(days[i].date)) break;
        newSelected.push(days[i].date);
      }
      onChange(newSelected);
    } else if (isEndCity) {
      const newSelected = [];
      for (let i = clickedIndex; i < days.length; i++) {
        if (otherCityDays?.includes(days[i].date)) continue;
        newSelected.push(days[i].date);
      }
      onChange(newSelected);
    }
  };

  const selectedCount = selectedDays?.length || 0;

  return (
    <div className="p-2 bg-[#faf8f5] rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-[#6a6459]">Days in {city.name}</span>
        {selectedCount > 0 && (
          <span className="text-[10px] text-[#a08545] font-medium">{selectedCount}d</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {days.map((day, i) => {
          const isSelected = selectedDays?.includes(day.date);
          const isOtherCity = otherCityDays?.includes(day.date);
          const showMonth = i === 0 || days[i - 1]?.month !== day.month;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => handleDayClick(i)}
              disabled={isOtherCity}
              className={`
                flex flex-col items-center justify-center w-8 h-10 rounded text-[10px] transition-all
                ${isSelected
                  ? 'bg-[#a08545] text-white'
                  : isOtherCity
                    ? 'bg-[#e5e0d8] text-[#a5a098] cursor-not-allowed opacity-40'
                    : 'bg-white border border-[#e5e0d8] text-[#6a6459] hover:border-[#c9a227]'
                }
              `}
            >
              {showMonth && <span className="text-[7px] uppercase opacity-70">{day.month}</span>}
              <span className="font-medium">{day.dayNum}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CitySelector({ label, placeholder, value, onChange, cities }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = cities.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.country.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  const handleSelect = (city) => {
    onChange(city);
    setQuery(`${getCountryFlag(city.country)} ${city.name}`);
    setIsOpen(false);
  };

  useEffect(() => {
    if (value) {
      setQuery(`${getCountryFlag(value.country)} ${value.name}`);
    }
  }, [value]);

  return (
    <div className="relative">
      <div className="text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a08545] shrink-0" />
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
          className="w-full h-14 pl-12 pr-4 bg-[#faf8f5] border border-[#e5e0d8] rounded-xl text-base text-[#2a2520] placeholder:text-[#a5a098] focus:outline-none focus:border-[#c9a227]/50 focus:bg-[#faf6eb] transition-colors"
        />
      </div>
      {isOpen && query && !value && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e5e0d8] rounded-xl overflow-hidden z-20 shadow-xl shadow-[#2a2520]/10">
          {filtered.map((city) => (
            <button
              key={city.id}
              onClick={() => handleSelect(city)}
              className="w-full px-4 py-3 text-left hover:bg-[#faf8f5] transition-colors flex items-center gap-3 border-b border-[#e5e0d8] last:border-0"
            >
              <span className="text-lg">{getCountryFlag(city.country)}</span>
              <span className="text-base text-[#2a2520]">{city.name}</span>
              <span className="text-sm text-[#8a8578]">{city.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * TripCalendar - shows all trip days with city assignments
 * Allows selecting unassigned days and adding cities via modal
 */
function TripCalendar({
  tripDates,
  startCity,
  endCity,
  startCityDays,
  endCityDays,
  intermediateStops,
  onChangeStartCityDays,
  onChangeEndCityDays,
  onAddStop,
  onUpdateStop,
  onRemoveStop,
  cities,
}) {
  const [selectedRange, setSelectedRange] = useState(null); // { startIndex, endIndex }
  const [showModal, setShowModal] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [selectedCities, setSelectedCities] = useState([]); // For multi-city selection

  // Generate all days
  const days = useMemo(() => {
    if (!tripDates?.start || !tripDates?.end) return [];

    const result = [];
    const start = new Date(tripDates.start + 'T12:00:00');
    const end = new Date(tripDates.end + 'T12:00:00');

    let current = new Date(start);
    while (current <= end) {
      result.push({
        date: current.toISOString().split('T')[0],
        dayOfWeek: current.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: current.getDate(),
        month: current.toLocaleDateString('en-US', { month: 'short' }),
      });
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [tripDates?.start, tripDates?.end]);

  // Build a map of date -> city assignment
  const dayAssignments = useMemo(() => {
    const assignments = {};

    // Start city days
    startCityDays?.forEach(date => {
      assignments[date] = { city: startCity, type: 'start' };
    });

    // End city days
    endCityDays?.forEach(date => {
      assignments[date] = { city: endCity, type: 'end' };
    });

    // Intermediate stops
    intermediateStops?.forEach(stop => {
      stop.days?.forEach(date => {
        assignments[date] = { city: stop.city, type: 'stop', stopId: stop.id };
      });
    });

    return assignments;
  }, [startCity, endCity, startCityDays, endCityDays, intermediateStops]);

  const handleDayClick = (index) => {
    const day = days[index];
    const assignment = dayAssignments[day.date];

    // Only allow selecting unassigned days
    if (assignment) return;

    if (!selectedRange) {
      // Start new selection
      setSelectedRange({ startIndex: index, endIndex: index });
    } else {
      // Extend selection - ensure it's contiguous and all unassigned
      const newStart = Math.min(selectedRange.startIndex, index);
      const newEnd = Math.max(selectedRange.endIndex, index);

      // Check if all days in range are unassigned
      let allUnassigned = true;
      for (let i = newStart; i <= newEnd; i++) {
        if (dayAssignments[days[i].date]) {
          allUnassigned = false;
          break;
        }
      }

      if (allUnassigned) {
        setSelectedRange({ startIndex: newStart, endIndex: newEnd });
      } else {
        // Start fresh selection
        setSelectedRange({ startIndex: index, endIndex: index });
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedRange(null);
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setCityQuery('');
    setSelectedCities([]);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCityQuery('');
    setSelectedCities([]);
  };

  const handleToggleCity = (city) => {
    setSelectedCities(prev => {
      const exists = prev.find(c => c.id === city.id);
      if (exists) {
        return prev.filter(c => c.id !== city.id);
      } else {
        return [...prev, city];
      }
    });
  };

  const handleConfirmCities = () => {
    if (!selectedRange || !onAddStop || selectedCities.length === 0) return;

    const totalDays = selectedRange.endIndex - selectedRange.startIndex + 1;
    const daysPerCity = Math.floor(totalDays / selectedCities.length);
    const extraDays = totalDays % selectedCities.length;

    let dayIndex = selectedRange.startIndex;

    selectedCities.forEach((city, cityIndex) => {
      const cityDayCount = daysPerCity + (cityIndex < extraDays ? 1 : 0);
      const daysForStop = [];

      for (let i = 0; i < cityDayCount; i++) {
        daysForStop.push(days[dayIndex].date);
        dayIndex++;
      }

      onAddStop({
        id: `stop-${Date.now()}-${cityIndex}`,
        city,
        days: daysForStop,
      });
    });

    setSelectedRange(null);
    handleCloseModal();
  };

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(cityQuery.toLowerCase()) ||
    c.country.toLowerCase().includes(cityQuery.toLowerCase())
  ).slice(0, 8);

  if (!tripDates?.start || !tripDates?.end || !startCity) return null;

  const hasUnassignedDays = days.some(d => !dayAssignments[d.date]);
  const selectedDayCount = selectedRange ? selectedRange.endIndex - selectedRange.startIndex + 1 : 0;

  return (
    <div className="p-5 bg-white rounded-2xl border border-[#e5e0d8] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#a08545]" />
          <span className="text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider">
            Trip Schedule
          </span>
        </div>
        <span className="text-xs text-[#6a6459]">
          {days.length} days total
        </span>
      </div>

      {/* Days grid */}
      <div className="flex flex-wrap gap-2">
        {days.map((day, i) => {
          const assignment = dayAssignments[day.date];
          const isSelected = selectedRange &&
            i >= selectedRange.startIndex &&
            i <= selectedRange.endIndex;
          const showMonth = i === 0 || days[i - 1]?.month !== day.month;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => handleDayClick(i)}
              disabled={!!assignment}
              className={`
                relative flex flex-col items-center justify-center min-w-[52px] px-2 py-2 rounded-lg text-xs transition-all
                ${assignment
                  ? assignment.type === 'start'
                    ? 'bg-[#a08545] text-white cursor-default'
                    : assignment.type === 'end'
                      ? 'bg-[#2a2520] text-white cursor-default'
                      : 'bg-[#c9a227] text-white cursor-default'
                  : isSelected
                    ? 'bg-[#c9a227] text-white ring-2 ring-[#c9a227] ring-offset-1'
                    : 'bg-[#faf8f5] border border-[#e5e0d8] text-[#6a6459] hover:border-[#c9a227] hover:bg-[#faf6eb] cursor-pointer'
                }
              `}
            >
              {showMonth && (
                <span className="text-[8px] uppercase tracking-wider opacity-70">{day.month}</span>
              )}
              <span className="font-semibold text-sm">{day.dayNum}</span>
              <span className="text-[8px] uppercase opacity-70">{day.dayOfWeek}</span>
              {assignment?.city && (
                <span className="text-[9px] mt-0.5 font-medium truncate max-w-full">
                  {assignment.city.name?.slice(0, 6)}{assignment.city.name?.length > 6 ? '…' : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection actions */}
      {selectedRange && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-[#6a6459]">
            {selectedDayCount} day{selectedDayCount > 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#2a2520] hover:bg-[#3a3530] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add City
          </button>
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-sm text-[#8a8578] hover:text-[#6a6459]"
          >
            Clear
          </button>
        </div>
      )}

      {/* Hint when no selection */}
      {!selectedRange && hasUnassignedDays && (
        <p className="mt-3 text-xs text-[#8a8578]">
          Click on unassigned days to select them, then add a city
        </p>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-[#8a8578]">
        {startCity && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#a08545]" />
            <span>{startCity.name}</span>
          </div>
        )}
        {intermediateStops?.filter(s => s.city).map(stop => (
          <div key={stop.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#c9a227]" />
            <span>{stop.city.name}</span>
            <button
              type="button"
              onClick={() => onRemoveStop?.(stop.id)}
              className="ml-1 text-[#a5a098] hover:text-[#991b1b]"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {endCity && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#2a2520]" />
            <span>{endCity.name}</span>
          </div>
        )}
      </div>

      {/* Add City Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-[#e5e0d8] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[#2a2520]">Add Cities</h3>
                <p className="text-sm text-[#6a6459]">
                  {selectedDayCount} day{selectedDayCount > 1 ? 's' : ''} selected
                  {selectedCities.length > 0 && ` • ${selectedCities.length} cit${selectedCities.length > 1 ? 'ies' : 'y'} chosen`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#8a8578] hover:bg-[#faf8f5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-[#e5e0d8]">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a08545]" />
                <input
                  type="text"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder="Search cities..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-[#faf8f5] border border-[#e5e0d8] rounded-xl text-sm text-[#2a2520] placeholder:text-[#a5a098] focus:outline-none focus:border-[#c9a227]"
                />
              </div>
            </div>

            {/* Selected cities */}
            {selectedCities.length > 0 && (
              <div className="px-4 py-3 border-b border-[#e5e0d8] flex flex-wrap gap-2">
                {selectedCities.map(city => (
                  <span
                    key={city.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a227] text-white text-sm rounded-full"
                  >
                    {city.name}
                    <button
                      type="button"
                      onClick={() => handleToggleCity(city)}
                      className="hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* City list */}
            <div className="max-h-64 overflow-y-auto">
              {filteredCities.map(city => {
                const isSelected = selectedCities.some(c => c.id === city.id);
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleToggleCity(city)}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 border-b border-[#e5e0d8] last:border-0 transition-colors ${
                      isSelected ? 'bg-[#faf6eb]' : 'hover:bg-[#faf8f5]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected ? 'bg-[#c9a227] border-[#c9a227]' : 'border-[#e5e0d8]'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-lg">{getCountryFlag(city.country)}</span>
                    <span className="text-sm text-[#2a2520]">{city.name}</span>
                    <span className="text-xs text-[#8a8578]">{city.country}</span>
                  </button>
                );
              })}
              {cityQuery && filteredCities.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-[#8a8578]">
                  No cities found
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-[#e5e0d8] bg-[#faf8f5] flex items-center justify-between">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm text-[#6a6459] hover:text-[#2a2520]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCities}
                disabled={selectedCities.length === 0}
                className="px-5 py-2.5 bg-[#2a2520] hover:bg-[#3a3530] disabled:bg-[#e5e0d8] disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                Add {selectedCities.length > 0 ? `${selectedCities.length} Cit${selectedCities.length > 1 ? 'ies' : 'y'}` : 'Cities'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Day selector - shows trip days and lets user select contiguous ranges
 *
 * For start city: always begins at index 0, user clicks to set the end index
 * For end city: always ends at last index, user clicks to set the start index
 */
function DaySelector({ city, tripDates, selectedDays, onChange, otherCityDays, label, isStartCity = true }) {
  // Generate array of dates between start and end
  // NOTE: useMemo must be called unconditionally (before any early returns)
  const days = useMemo(() => {
    if (!tripDates?.start || !tripDates?.end) return [];

    const result = [];
    const start = new Date(tripDates.start + 'T12:00:00');
    const end = new Date(tripDates.end + 'T12:00:00');

    let current = new Date(start);
    while (current <= end) {
      result.push({
        date: current.toISOString().split('T')[0],
        dayOfWeek: current.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: current.getDate(),
        month: current.toLocaleDateString('en-US', { month: 'short' }),
      });
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [tripDates?.start, tripDates?.end]);

  // Early return after hooks
  if (!city || !tripDates?.start || !tripDates?.end) return null;

  // Handle click - selects contiguous range
  const handleDayClick = (clickedIndex) => {
    if (isStartCity) {
      // Start city: select from index 0 to clicked index (inclusive)
      // Check if any days in this range are taken by other city
      const newSelected = [];
      for (let i = 0; i <= clickedIndex; i++) {
        if (otherCityDays?.includes(days[i].date)) {
          // Can't extend past other city's days
          break;
        }
        newSelected.push(days[i].date);
      }
      onChange(newSelected);
    } else {
      // End city: select from clicked index to last index (inclusive)
      // Check if any days in this range are taken by other city
      const newSelected = [];
      for (let i = clickedIndex; i < days.length; i++) {
        if (otherCityDays?.includes(days[i].date)) {
          // Can't include other city's days
          continue;
        }
        newSelected.push(days[i].date);
      }
      onChange(newSelected);
    }
  };

  const selectedCount = selectedDays?.length || 0;

  // Find the boundary index for highlighting
  const firstSelectedIndex = selectedDays?.length > 0
    ? days.findIndex(d => selectedDays.includes(d.date))
    : -1;
  const lastSelectedIndex = selectedDays?.length > 0
    ? days.length - 1 - [...days].reverse().findIndex(d => selectedDays.includes(d.date))
    : -1;

  return (
    <div className="mt-3 p-3 bg-[#faf8f5] rounded-lg border border-[#e5e0d8]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#a08545]" />
          <span className="text-xs font-medium text-[#6a6459]">
            {label || `Days in ${city.name}`}
          </span>
        </div>
        {selectedCount > 0 && (
          <span className="text-xs text-[#a08545] font-medium">
            {selectedCount} {selectedCount === 1 ? 'day' : 'days'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {days.map((day, i) => {
          const isSelected = selectedDays?.includes(day.date);
          const isOtherCity = otherCityDays?.includes(day.date);
          const showMonth = i === 0 || days[i - 1]?.month !== day.month;

          // Determine if this is the boundary day (first or last of selection)
          const isBoundary = isStartCity
            ? (i === lastSelectedIndex) // For start city, boundary is the last selected day
            : (i === firstSelectedIndex); // For end city, boundary is the first selected day

          return (
            <button
              key={day.date}
              onClick={() => handleDayClick(i)}
              disabled={isOtherCity}
              className={`
                relative flex flex-col items-center justify-center w-10 h-12 rounded-lg text-xs transition-all
                ${isSelected
                  ? isBoundary
                    ? 'bg-[#a08545] text-white shadow-sm ring-2 ring-[#c9a227] ring-offset-1'
                    : 'bg-[#a08545] text-white shadow-sm'
                  : isOtherCity
                    ? 'bg-[#e5e0d8] text-[#a5a098] cursor-not-allowed opacity-50'
                    : 'bg-white border border-[#e5e0d8] text-[#6a6459] hover:border-[#c9a227] hover:bg-[#faf6eb]'
                }
              `}
              title={isOtherCity ? 'Already selected for other city' : `${isStartCity ? 'Select days 1-' + (i + 1) : 'Select days ' + (i + 1) + '-' + days.length}`}
            >
              {showMonth && (
                <span className="text-[8px] uppercase tracking-wider opacity-70">{day.month}</span>
              )}
              <span className={`font-medium ${showMonth ? 'text-xs' : 'text-sm'}`}>{day.dayNum}</span>
              <span className="text-[8px] uppercase opacity-70">{day.dayOfWeek}</span>
              {isBoundary && isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#2a2520] rounded-full flex items-center justify-center">
                  <Check className="w-2 h-2 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedCount === 0 && (
        <p className="text-[10px] text-[#8a8578] mt-2 text-center">
          {isStartCity
            ? `Click a day to select how long you'll stay in ${city.name} (starting from day 1)`
            : `Click a day to select when you'll arrive in ${city.name} (through the last day)`
          }
        </p>
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
  startCityDays,
  endCityDays,
  onChangeStartCityDays,
  onChangeEndCityDays,
  intermediateStops = [],
  onAddStop,
  onRemoveStop,
  onUpdateStop,
  departureTransport,
  returnTransport,
  onChangeDepartureTransport,
  onChangeReturnTransport,
  startCityArrivalTime,
  endCityDepartureTime,
  onChangeStartCityArrivalTime,
  onChangeEndCityDepartureTime,
}) {
  const [cities, setCities] = useState([]);

  useEffect(() => {
    getAllCities().then(setCities);
  }, []);

  // Compute all days assigned to intermediate stops
  const intermediateStopDays = useMemo(() => {
    return intermediateStops.flatMap(stop => stop.days || []);
  }, [intermediateStops]);

  // Check if we should show the trip calendar
  const showTripCalendar = tripDates?.start && tripDates?.end && startCity && startCityDays?.length > 0;

  // Check if we have cities selected to show the carousel
  const hasStartCity = !!startCity;
  const hasEndCity = !!endCity;

  return (
    <div className="space-y-5">
      {/* Main row: Dates, Start City, End City - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Dates */}
        <div className="p-5 bg-white rounded-2xl border border-[#e5e0d8] shadow-sm">
          <DateRangePopover
            value={tripDates}
            onChange={onChangeDates}
            showSearchLabelOnSelection={false}
            vertical
            departureTransport={departureTransport}
            returnTransport={returnTransport}
            onChangeDepartureTransport={onChangeDepartureTransport}
            onChangeReturnTransport={onChangeReturnTransport}
          />
        </div>

        {/* Start City */}
        <div className="p-5 bg-white rounded-2xl border border-[#e5e0d8] shadow-sm">
          <CitySelector
            label="Start City"
            placeholder="Where do you start?"
            value={startCity}
            onChange={onChangeStartCity}
            cities={cities}
          />
          {startCity && tripDates?.start && tripDates?.end && onChangeStartCityDays && (
            <DaySelector
              city={startCity}
              tripDates={tripDates}
              selectedDays={startCityDays}
              onChange={onChangeStartCityDays}
              otherCityDays={[...(endCityDays || []), ...intermediateStopDays]}
              label={`Days in ${startCity.name}`}
              isStartCity={true}
            />
          )}
        </div>

        {/* End City */}
        <div className="p-5 bg-white rounded-2xl border border-[#e5e0d8] shadow-sm">
          <CitySelector
            label="End City"
            placeholder="Where do you end?"
            value={endCity}
            onChange={onChangeEndCity}
            cities={cities}
          />
          {endCity && tripDates?.start && tripDates?.end && onChangeEndCityDays && (
            <DaySelector
              city={endCity}
              tripDates={tripDates}
              selectedDays={endCityDays}
              onChange={onChangeEndCityDays}
              otherCityDays={[...(startCityDays || []), ...intermediateStopDays]}
              label={`Days in ${endCity.name}`}
              isStartCity={false}
            />
          )}
        </div>
      </div>

      {/* City cards carousel (when cities are selected) */}
      {hasStartCity && hasEndCity && intermediateStops.length > 0 && (
        <div className="p-5 bg-[#faf8f5] rounded-2xl border border-[#e5e0d8]">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-[#a08545]" />
            <span className="text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider">
              Your Route
            </span>
            <span className="text-xs text-[#6a6459]">
              • {intermediateStops.length + 2} cities
            </span>
          </div>

          <CityCarousel>
            {/* Start City Card */}
            <CityCardCompact
              city={startCity}
              label="Start"
              time={startCityArrivalTime}
              onChangeTime={onChangeStartCityArrivalTime}
              timeLabel="Arrival time"
              selectedDays={startCityDays}
              isFixed
            />

            {/* Intermediate City Cards */}
            {intermediateStops.map((stop, idx) => (
              <CityCardCompact
                key={stop.id}
                city={stop.city}
                label={`Stop ${idx + 1}`}
                time={stop.arrivalTime}
                onChangeTime={(time) => onUpdateStop?.(stop.id, { arrivalTime: time })}
                timeLabel="Arrival time"
                selectedDays={stop.days}
                onRemove={() => onRemoveStop?.(stop.id)}
              />
            ))}

            {/* End City Card */}
            <CityCardCompact
              city={endCity}
              label="End"
              time={endCityDepartureTime}
              onChangeTime={onChangeEndCityDepartureTime}
              timeLabel="Departure time"
              selectedDays={endCityDays}
              isFixed
            />
          </CityCarousel>
        </div>
      )}

      {/* Trip Calendar - shows all days with city assignments */}
      {showTripCalendar && (
        <TripCalendar
          tripDates={tripDates}
          startCity={startCity}
          endCity={endCity}
          startCityDays={startCityDays}
          endCityDays={endCityDays}
          intermediateStops={intermediateStops}
          onChangeStartCityDays={onChangeStartCityDays}
          onChangeEndCityDays={onChangeEndCityDays}
          onAddStop={onAddStop}
          onUpdateStop={onUpdateStop}
          onRemoveStop={onRemoveStop}
          cities={cities}
        />
      )}
    </div>
  );
}
