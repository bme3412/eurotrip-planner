'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * DatePicker - Inline date range or month selector
 */
export default function DatePicker({
  mode = 'range', // 'range' | 'month' | 'flexible'
  suggestedStart,
  duration,
  onSelect,
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => {
    if (suggestedStart) {
      return new Date(suggestedStart);
    }
    return today;
  });

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  // Get days in month
  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty slots for days before first of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [viewDate]);

  // Navigate months
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Check if date is in range
  const isInRange = (date) => {
    if (!startDate || !date) return false;
    const end = endDate || hoverDate;
    if (!end) return false;
    return date > startDate && date < end;
  };

  // Check if date is selectable (not in past)
  const isSelectable = (date) => {
    if (!date) return false;
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date >= todayStart;
  };

  // Handle date click for range mode
  const handleDateClick = (date) => {
    if (!isSelectable(date)) return;

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(date);
      setEndDate(null);
    } else {
      // Complete selection
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  // Handle month selection
  const handleMonthClick = (monthIndex) => {
    const year = viewDate.getFullYear();
    const monthName = MONTHS[monthIndex];
    setSelectedMonth({ month: monthIndex, year, name: `${monthName} ${year}` });
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Confirm selection
  const handleConfirm = () => {
    if (mode === 'range' && startDate && endDate) {
      onSelect({
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      });
    } else if (mode === 'month' && selectedMonth) {
      onSelect({
        month: selectedMonth.name,
      });
    } else if (mode === 'flexible') {
      onSelect({
        flexible: true,
        duration: duration,
      });
    }
  };

  // Render month selector
  if (mode === 'month') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear() - 1, 0, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="font-semibold text-slate-800">{viewDate.getFullYear()}</span>
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear() + 1, 0, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, index) => {
            const isSelected = selectedMonth?.month === index && selectedMonth?.year === viewDate.getFullYear();
            const isPast = new Date(viewDate.getFullYear(), index + 1, 0) < today;

            return (
              <button
                key={month}
                onClick={() => !isPast && handleMonthClick(index)}
                disabled={isPast}
                className={`
                  py-3 px-2 rounded-lg text-sm font-medium transition-all
                  ${isSelected
                    ? 'bg-blue-500 text-white'
                    : isPast
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'hover:bg-blue-50 text-slate-700'
                  }
                `}
              >
                {month.slice(0, 3)}
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        {selectedMonth && (
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleConfirm}
            className="w-full mt-4 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
          >
            Travel in {selectedMonth.name}
          </motion.button>
        )}
      </div>
    );
  }

  // Render flexible mode
  if (mode === 'flexible') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-center py-4">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">Flexible dates</p>
          <p className="text-sm text-slate-500 mt-1">
            {duration ? `Looking for a ${duration}-day trip` : "I'll figure out dates later"}
          </p>
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
        >
          Continue with flexible dates
        </button>
      </div>
    );
  }

  // Render date range picker (default)
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <span className="font-semibold text-slate-800">
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-9" />;
          }

          const isStart = startDate && date.getTime() === startDate.getTime();
          const isEnd = endDate && date.getTime() === endDate.getTime();
          const inRange = isInRange(date);
          const selectable = isSelectable(date);
          const isToday = date.toDateString() === today.toDateString();

          return (
            <button
              key={date.getTime()}
              onClick={() => handleDateClick(date)}
              onMouseEnter={() => startDate && !endDate && setHoverDate(date)}
              onMouseLeave={() => setHoverDate(null)}
              disabled={!selectable}
              className={`
                h-9 rounded-lg text-sm font-medium transition-all relative
                ${isStart || isEnd
                  ? 'bg-blue-500 text-white'
                  : inRange
                    ? 'bg-blue-100 text-blue-700'
                    : selectable
                      ? 'hover:bg-slate-100 text-slate-700'
                      : 'text-slate-300 cursor-not-allowed'
                }
                ${isToday && !isStart && !isEnd ? 'ring-1 ring-blue-300' : ''}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Selection summary */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-slate-500">Start:</span>{' '}
            <span className="text-slate-800 font-medium">
              {startDate ? formatDate(startDate) : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">End:</span>{' '}
            <span className="text-slate-800 font-medium">
              {endDate ? formatDate(endDate) : '—'}
            </span>
          </div>
        </div>

        {startDate && endDate && (
          <div className="mt-2 text-center text-sm text-slate-600">
            {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1} days
          </div>
        )}
      </div>

      {/* Confirm button */}
      {startDate && endDate && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleConfirm}
          className="w-full mt-4 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
        >
          Confirm dates
        </motion.button>
      )}
    </div>
  );
}
