"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plane, Train, Plus, X, ChevronDown } from "lucide-react";
import DateRangePicker from "./DateRangePicker";

function formatDisplay(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatFullDate(iso) {
  if (!iso) return "";
  try {
    const date = new Date(iso + "T00:00:00");
    const day = date.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
      : day === 2 || day === 22 ? 'nd'
      : day === 3 || day === 23 ? 'rd' : 'th';

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).replace(/(\d+)/, `$1${suffix}`);
  } catch {
    return iso;
  }
}

function TransportModal({ isOpen, onClose, onSave, initialData, dateLabel, defaultDate }) {
  const [type, setType] = useState(initialData?.type || 'flight');
  const [date, setDate] = useState(initialData?.date || defaultDate || '');
  const [departureTime, setDepartureTime] = useState(initialData?.departureTime || initialData?.time || '');
  const [arrivalTime, setArrivalTime] = useState(initialData?.arrivalTime || '');
  const [details, setDetails] = useState(initialData?.details || '');
  const [confirmationCode, setConfirmationCode] = useState(initialData?.confirmationCode || '');

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setType(initialData?.type || 'flight');
      setDate(initialData?.date || defaultDate || '');
      setDepartureTime(initialData?.departureTime || initialData?.time || '');
      setArrivalTime(initialData?.arrivalTime || '');
      setDetails(initialData?.details || '');
      setConfirmationCode(initialData?.confirmationCode || '');
    }
  }, [isOpen, initialData, defaultDate]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      type,
      date,
      departureTime,
      arrivalTime,
      time: departureTime, // Keep backwards compatibility
      details,
      confirmationCode,
    });
    onClose();
  };

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e5e0d8] flex items-center justify-between">
          <h3 className="text-lg font-medium text-[#2a2520]">
            {dateLabel} Transportation
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8a8578] hover:bg-[#faf8f5]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Transport Type */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">
              Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('flight')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  type === 'flight'
                    ? 'bg-[#2a2520] text-white border-[#2a2520]'
                    : 'bg-[#faf8f5] text-[#6a6459] border-[#e5e0d8] hover:border-[#c9a227]'
                }`}
              >
                <Plane className="w-4 h-4" />
                Flight
              </button>
              <button
                type="button"
                onClick={() => setType('train')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  type === 'train'
                    ? 'bg-[#2a2520] text-white border-[#2a2520]'
                    : 'bg-[#faf8f5] text-[#6a6459] border-[#e5e0d8] hover:border-[#c9a227]'
                }`}
              >
                <Train className="w-4 h-4" />
                Train
              </button>
            </div>
          </div>

          {/* Date - Improved */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e5e0d8] rounded-xl text-sm text-[#2a2520] focus:outline-none focus:border-[#c9a227] cursor-pointer"
              />
              {date && (
                <div className="absolute inset-0 flex items-center px-4 pointer-events-none bg-[#faf8f5] rounded-xl border border-transparent">
                  <svg className="w-4 h-4 text-[#a08545] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <span className="text-sm text-[#2a2520]">{formatDateDisplay(date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Departure & Arrival Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">
                Departure Time
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e5e0d8] rounded-xl text-sm text-[#2a2520] focus:outline-none focus:border-[#c9a227]"
                />
                {!departureTime && (
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="text-sm text-[#a5a098]">--:--</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">
                Arrival Time
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e5e0d8] rounded-xl text-sm text-[#2a2520] focus:outline-none focus:border-[#c9a227]"
                />
                {!arrivalTime && (
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="text-sm text-[#a5a098]">--:--</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Time summary */}
          {departureTime && arrivalTime && (
            <div className="flex items-center justify-center gap-3 py-2 px-4 bg-[#faf6eb] rounded-lg text-sm">
              <span className="font-medium text-[#2a2520]">{departureTime}</span>
              <span className="text-[#c9a227]">→</span>
              <span className="font-medium text-[#2a2520]">{arrivalTime}</span>
              {(() => {
                const [depH, depM] = departureTime.split(':').map(Number);
                const [arrH, arrM] = arrivalTime.split(':').map(Number);
                let duration = (arrH * 60 + arrM) - (depH * 60 + depM);
                if (duration < 0) duration += 24 * 60; // Next day arrival
                const hours = Math.floor(duration / 60);
                const mins = duration % 60;
                return (
                  <span className="text-[#8a8578] text-xs">
                    ({hours > 0 ? `${hours}h ` : ''}{mins > 0 ? `${mins}m` : ''}{hours === 0 && mins === 0 ? '0m' : ''})
                  </span>
                );
              })()}
            </div>
          )}

          {/* Details */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">
              {type === 'flight' ? 'Flight Number / Route' : 'Train / Route'}
            </label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={type === 'flight' ? 'e.g., AA 123 JFK → CDG' : 'e.g., Eurostar 9014 London → Paris'}
              className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e5e0d8] rounded-xl text-sm text-[#2a2520] placeholder:text-[#a5a098] focus:outline-none focus:border-[#c9a227]"
            />
          </div>

          {/* Confirmation Code */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">
              Confirmation / Ticket #
            </label>
            <input
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              placeholder="e.g., ABC123"
              className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e5e0d8] rounded-xl text-sm text-[#2a2520] placeholder:text-[#a5a098] focus:outline-none focus:border-[#c9a227]"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#e5e0d8] bg-[#faf8f5] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#6a6459] hover:text-[#2a2520]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#2a2520] hover:bg-[#3a3530] text-white text-sm font-medium rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function DateRangePopover({
  value,
  onChange,
  showSearchLabelOnSelection = true,
  vertical = false,
  inline = false,
  departureTransport,
  returnTransport,
  onChangeDepartureTransport,
  onChangeReturnTransport,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [temp, setTemp] = useState(value || { start: "", end: "" });
  const [mounted, setMounted] = useState(false);
  const [transportModalOpen, setTransportModalOpen] = useState(null); // 'departure' | 'return' | null

  // createPortal requires browser DOM — only mount after hydration
  useEffect(() => { setMounted(true); }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKey);
    // Prevent body scroll while open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const display = useMemo(
    () => ({ start: formatDisplay(value?.start), end: formatDisplay(value?.end) }),
    [value?.start, value?.end]
  );

  const fullDisplay = useMemo(
    () => ({ start: formatFullDate(value?.start), end: formatFullDate(value?.end) }),
    [value?.start, value?.end]
  );

  const close = () => setIsOpen(false);

  const handlePickerChange = (next) => {
    setTemp(next);
    if (next.start && next.end) {
      onChange?.(next);
      close();
    }
  };

  const overlay = mounted && isOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="relative w-full max-w-[620px] rounded-[2.5rem] border border-gray-100 bg-white shadow-[0_30px_70px_rgba(0,0,0,0.3)] p-2">
            {/* Close button - positioned outside the calendar area */}
            <button
              type="button"
              onClick={close}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-all z-20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <DateRangePicker
              value={temp}
              onChange={handlePickerChange}
            />

            <div className="mt-4 flex items-center justify-center pb-4">
              <button
                type="button"
                className="px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                onClick={() => setTemp({ start: "", end: "" })}
              >
                Clear
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  // Vertical layout for compact column display
  if (vertical) {
    return (
      <>
        <div className="w-full flex flex-col gap-4">
          {/* Start Date */}
          <div>
            <div className="text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">Start Date</div>
            <button
              type="button"
              onClick={() => {
                setTemp(value || { start: "", end: "" });
                setIsOpen(true);
              }}
              className="w-full flex items-center gap-3 h-14 px-4 bg-[#faf8f5] border border-[#e5e0d8] hover:border-[#c9a227]/50 hover:bg-[#faf6eb] rounded-xl transition-all text-left"
            >
              <svg className="w-5 h-5 text-[#a08545] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span className={`text-sm ${value?.start ? 'text-[#2a2520]' : 'text-[#a5a098]'}`}>
                {fullDisplay.start || "Select date"}
              </span>
            </button>
            {/* Departure Transport */}
            {value?.start && onChangeDepartureTransport && (
              <div className="mt-2">
                {departureTransport?.type ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-[#faf6eb] border border-[#e5e0d8] rounded-lg">
                    {departureTransport.type === 'flight' ? (
                      <Plane className="w-4 h-4 text-[#a08545] shrink-0" />
                    ) : (
                      <Train className="w-4 h-4 text-[#a08545] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#2a2520] truncate">
                        {departureTransport.details || (departureTransport.type === 'flight' ? 'Flight' : 'Train')}
                      </div>
                      <div className="text-[10px] text-[#8a8578] flex items-center gap-1">
                        {departureTransport.departureTime && (
                          <span>{departureTransport.departureTime}</span>
                        )}
                        {departureTransport.departureTime && departureTransport.arrivalTime && (
                          <>
                            <span className="text-[#c9a227]">→</span>
                            <span>{departureTransport.arrivalTime}</span>
                          </>
                        )}
                        {departureTransport.confirmationCode && (
                          <span className="ml-1 text-[#a08545]">• {departureTransport.confirmationCode}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTransportModalOpen('departure')}
                      className="text-[10px] text-[#a08545] hover:text-[#c9a227] shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTransportModalOpen('departure')}
                    className="flex items-center gap-1.5 text-xs text-[#a08545] hover:text-[#c9a227]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add flight or train
                  </button>
                )}
              </div>
            )}
          </div>

          {/* End Date */}
          <div>
            <div className="text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">End Date</div>
            <button
              type="button"
              onClick={() => {
                setTemp(value || { start: "", end: "" });
                setIsOpen(true);
              }}
              className="w-full flex items-center gap-3 h-14 px-4 bg-[#faf8f5] border border-[#e5e0d8] hover:border-[#c9a227]/50 hover:bg-[#faf6eb] rounded-xl transition-all text-left"
            >
              <svg className="w-5 h-5 text-[#a08545] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span className={`text-sm ${value?.end ? 'text-[#2a2520]' : 'text-[#a5a098]'}`}>
                {fullDisplay.end || "Select date"}
              </span>
            </button>
            {/* Return Transport */}
            {value?.end && onChangeReturnTransport && (
              <div className="mt-2">
                {returnTransport?.type ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-[#faf6eb] border border-[#e5e0d8] rounded-lg">
                    {returnTransport.type === 'flight' ? (
                      <Plane className="w-4 h-4 text-[#a08545] shrink-0" />
                    ) : (
                      <Train className="w-4 h-4 text-[#a08545] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#2a2520] truncate">
                        {returnTransport.details || (returnTransport.type === 'flight' ? 'Flight' : 'Train')}
                      </div>
                      <div className="text-[10px] text-[#8a8578] flex items-center gap-1">
                        {returnTransport.departureTime && (
                          <span>{returnTransport.departureTime}</span>
                        )}
                        {returnTransport.departureTime && returnTransport.arrivalTime && (
                          <>
                            <span className="text-[#c9a227]">→</span>
                            <span>{returnTransport.arrivalTime}</span>
                          </>
                        )}
                        {returnTransport.confirmationCode && (
                          <span className="ml-1 text-[#a08545]">• {returnTransport.confirmationCode}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTransportModalOpen('return')}
                      className="text-[10px] text-[#a08545] hover:text-[#c9a227] shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTransportModalOpen('return')}
                    className="flex items-center gap-1.5 text-xs text-[#a08545] hover:text-[#c9a227]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add flight or train
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {overlay}

        {/* Transport Modal */}
        {mounted && (
          <TransportModal
            isOpen={transportModalOpen !== null}
            onClose={() => setTransportModalOpen(null)}
            onSave={(data) => {
              if (transportModalOpen === 'departure' && onChangeDepartureTransport) {
                onChangeDepartureTransport(data);
              } else if (transportModalOpen === 'return' && onChangeReturnTransport) {
                onChangeReturnTransport(data);
              }
            }}
            initialData={transportModalOpen === 'departure' ? departureTransport : returnTransport}
            dateLabel={transportModalOpen === 'departure' ? 'Departure' : 'Return'}
            defaultDate={transportModalOpen === 'departure' ? value?.start : value?.end}
          />
        )}
      </>
    );
  }

  // Inline layout - compact single row for search bar style
  if (inline) {
    return (
      <>
        <div className="text-[11px] font-semibold text-[#8a8578] uppercase tracking-wider mb-2">Dates</div>
        <button
          type="button"
          onClick={() => {
            setTemp(value || { start: "", end: "" });
            setIsOpen(true);
          }}
          className="w-full flex items-center gap-3 h-14 px-4 bg-[#faf8f5] border border-[#e5e0d8] hover:border-[#c9a227]/50 hover:bg-[#faf6eb] rounded-xl transition-all cursor-pointer text-left"
        >
          <svg className="w-5 h-5 text-[#a08545] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span className="text-base text-[#2a2520]">
            {display.start && display.end
              ? `${display.start} – ${display.end}`
              : "Select dates"
            }
          </span>
        </button>
        {overlay}
      </>
    );
  }

  return (
    <>
      {/* Trigger row */}
      <div className="flex flex-col sm:flex-row items-stretch justify-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={() => {
            setTemp(value || { start: "", end: "" });
            setIsOpen(true);
          }}
          className="flex flex-[2] items-center gap-2 md:gap-3 cursor-pointer border-none bg-transparent p-0 focus:outline-none min-w-0"
        >
          <div className="flex flex-1 items-center justify-between h-14 md:h-16 px-4 md:px-5 bg-gray-50/50 border border-gray-100 hover:border-blue-300 hover:bg-white rounded-2xl transition-all duration-200 group min-w-0">
            <span className="text-left overflow-hidden">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 truncate">Check‑in</span>
              <span className="block text-sm md:text-base font-bold text-gray-900 truncate">{display.start || "Add date"}</span>
            </span>
            <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <div className="flex flex-1 items-center justify-between h-14 md:h-16 px-4 md:px-5 bg-gray-50/50 border border-gray-100 hover:border-blue-300 hover:bg-white rounded-2xl transition-all duration-200 group min-w-0">
            <span className="text-left overflow-hidden">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 truncate">Check‑out</span>
              <span className="block text-sm md:text-base font-bold text-zinc-900 truncate">{display.end || "Add date"}</span>
            </span>
            <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
        </button>

        {/* Search / submit button */}
        <button
          type="button"
          onClick={() => {
            if (value?.start && value?.end) {
              // Propagate to page submit via custom event
              window.dispatchEvent(new CustomEvent("trip-dates-submit"));
            } else {
              setIsOpen(true);
            }
          }}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all duration-300 shadow-lg shadow-blue-200 hover:shadow-xl active:scale-95 flex-none ${
            value?.start && value?.end
              ? "h-14 md:h-16 px-5 md:px-8 rounded-2xl flex items-center gap-2 md:gap-3"
              : "w-14 md:w-16 h-14 md:h-16 rounded-2xl flex items-center justify-center"
          }`}
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          {value?.start && value?.end && showSearchLabelOnSelection && (
            <span className="text-[10px] md:text-xs uppercase tracking-widest font-black whitespace-nowrap">Plan Trip</span>
          )}
        </button>
      </div>

      {overlay}
    </>
  );
}
