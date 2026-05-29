'use client';

import { useState, useCallback } from 'react';

// Full Barcelona visit calendar data derived from barcelona-visit-calendar.json
const BARCELONA_DATA = {
  january:   { ranges: [{ days: [1,2,3,4,5,6], score: 3, special: true, event: "Three Kings' Day" }, { days: range(7,31), score: 4 }] },
  february:  { ranges: [{ days: range(1,11), score: 4 }, { days: range(12,28), score: 4, special: true, event: "Barcelona Carnival" }] },
  march:     { ranges: [{ days: range(1,14), score: 4 }, { days: range(15,19), score: 5, special: true, event: "Saint Joseph's Day" }, { days: range(20,31), score: 5 }] },
  april:     { ranges: [{ days: range(1,9), score: 5, special: true, event: "Easter Week" }, { days: range(10,22), score: 5 }, { days: [23], score: 5, special: true, event: "Sant Jordi Day" }, { days: range(24,30), score: 5 }] },
  may:       { ranges: [{ days: [1], score: 4, special: true, event: "Labor Day" }, { days: range(2,14), score: 5 }, { days: range(15,31), score: 5, special: true, event: "Primavera Sound" }] },
  june:      { ranges: [{ days: range(1,22), score: 5 }, { days: [23,24], score: 5, special: true, event: "Sant Joan Festival" }, { days: range(25,30), score: 4 }] },
  july:      { ranges: [{ days: range(1,24), score: 4 }, { days: range(25,31), score: 4, special: true, event: "Gràcia Festival Prep" }] },
  august:    { ranges: [{ days: range(1,14), score: 3 }, { days: [15], score: 3, special: true, event: "Assumption Day" }, { days: range(16,21), score: 4, special: true, event: "Festa Major de Gràcia" }, { days: range(22,31), score: 3 }] },
  september: { ranges: [{ days: range(1,10), score: 4 }, { days: [11], score: 5, special: true, event: "La Diada" }, { days: range(12,23), score: 5, special: true, event: "La Mercè Festival" }, { days: range(24,30), score: 5 }] },
  october:   { ranges: [{ days: range(1,11), score: 5 }, { days: [12], score: 4, special: true, event: "Spanish National Day" }, { days: range(13,31), score: 5, special: true, event: "Barcelona Jazz Festival" }] },
  november:  { ranges: [{ days: [1], score: 3, special: true, event: "All Saints' Day" }, { days: range(2,30), score: 4 }] },
  december:  { ranges: [{ days: range(1,7), score: 4, special: true, event: "Constitution Day" }, { days: range(8,23), score: 4, special: true, event: "Christmas Markets" }, { days: range(24,26), score: 3, special: true, event: "Christmas" }, { days: range(27,30), score: 4 }, { days: [31], score: 4, special: true, event: "New Year's Eve" }] },
};

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => i + start);
}

function buildDayMap(ranges) {
  const map = {};
  for (const r of ranges) {
    for (const d of r.days) {
      map[d] = { score: r.score, special: !!r.special, event: r.event || null };
    }
  }
  return map;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_KEYS  = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const DAY_HEADERS = ['S','M','T','W','T','F','S'];

const SCORE_COLORS = {
  5: { bg: 'bg-emerald-400', dot: 'bg-emerald-700' },
  4: { bg: 'bg-emerald-200', dot: 'bg-emerald-600' },
  3: { bg: 'bg-yellow-200',  dot: 'bg-yellow-600'  },
  2: { bg: 'bg-orange-300',  dot: 'bg-orange-600'  },
  1: { bg: 'bg-red-400',     dot: 'bg-red-700'     },
};

const LEGEND = [
  { label: 'Excellent', color: 'bg-emerald-400' },
  { label: 'Good',      color: 'bg-emerald-200' },
  { label: 'Average',   color: 'bg-yellow-200'  },
  { label: 'Below Avg', color: 'bg-orange-300'  },
  { label: 'Avoid',     color: 'bg-red-400'     },
];

const SCORE_LABEL = {
  5: 'Excellent',
  4: 'Good',
  3: 'Average',
  2: 'Below average',
  1: 'Avoid',
};

function getDaysInMonth(month0, year) {
  return new Date(year, month0 + 1, 0).getDate();
}

function getFirstDayOfWeek(month0, year) {
  return new Date(year, month0, 1).getDay(); // 0=Sun
}

function MonthCalendar({ monthIdx, year, dayMap, currentMonthIdx, onHoverDay, activeKey }) {
  const isCurrent = monthIdx === currentMonthIdx;
  const daysInMonth = getDaysInMonth(monthIdx, year);
  const firstDow = getFirstDayOfWeek(monthIdx, year);
  const cells = [];

  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={`rounded-xl p-3 border ${isCurrent ? 'border-blue-400 ring-2 ring-blue-400/50' : 'border-gray-700'} bg-gray-800/60`}>
      <div className={`text-center text-xs font-bold mb-2 ${isCurrent ? 'text-blue-300' : 'text-gray-300'}`}>
        {MONTH_NAMES[monthIdx]}
        {isCurrent && <span className="ml-1.5 px-1.5 py-0.5 bg-blue-500 text-white rounded text-[9px] uppercase tracking-wider">Now</span>}
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {DAY_HEADERS.map((h, i) => (
          <div key={i} className="text-center text-[8px] text-gray-500 font-medium pb-0.5">{h}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} />;
          const info = dayMap[day];
          const scoreKey = info?.score ?? 0;
          const colors = SCORE_COLORS[scoreKey] || { bg: 'bg-gray-700', dot: '' };
          const key = `${monthIdx}-${day}`;
          const isActive = key === activeKey;
          const payload = { monthIdx, day, score: scoreKey, event: info?.event || null };
          return (
            <button
              key={day}
              type="button"
              onMouseEnter={() => onHoverDay(payload)}
              onFocus={() => onHoverDay(payload)}
              onClick={() => onHoverDay(payload)}
              className={`relative aspect-square flex items-center justify-center rounded-sm text-[8px] font-medium ${colors.bg} text-gray-900 transition-transform hover:scale-125 hover:z-10 focus:outline-none focus:scale-125 ${isActive ? 'ring-2 ring-white scale-125 z-10' : ''}`}
            >
              {day}
              {info?.special && (
                <span className={`absolute bottom-0 right-0 w-1 h-1 rounded-full ${colors.dot}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ScoringDemoSection({ onScrollToDatePicker }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  const dayMaps = MONTH_KEYS.map(k => buildDayMap(BARCELONA_DATA[k].ranges));

  const [hovered, setHovered] = useState(null);
  const onHoverDay = useCallback((payload) => setHovered(payload), []);
  const activeKey = hovered ? `${hovered.monthIdx}-${hovered.day}` : null;
  const hoveredColors = hovered ? SCORE_COLORS[hovered.score] : null;

  return (
    <section className="px-6 py-20 bg-gray-950 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-10">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-3">
            <span className="w-8 h-px bg-blue-400"></span>
            The Right Time Changes Everything
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            Same city. Completely different trip.
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Here&apos;s Barcelona&apos;s visit score, day by day, across the full year. Every one of our 220 cities has a chart like this — enter your dates to see your ranked list.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-8 text-xs text-gray-300">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm ${l.color}`} />
              {l.label}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="relative w-3 h-3 rounded-sm bg-emerald-400">
              <span className="absolute bottom-0 right-0 w-1 h-1 rounded-full bg-emerald-700" />
            </span>
            • = Special Event
          </div>
        </div>

        {/* City label + interactive day readout */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6 min-h-[2rem]">
          <span className="text-base">🇪🇸</span>
          <span className="font-bold text-white">Barcelona, Spain</span>
          {hovered ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-800 border border-gray-700 pl-2 pr-3 py-1 text-sm">
              <span className={`w-3 h-3 rounded-sm ${hoveredColors?.bg || 'bg-gray-600'}`} />
              <span className="font-semibold text-white">
                {MONTH_NAMES[hovered.monthIdx]} {hovered.day}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-300">{SCORE_LABEL[hovered.score] || '—'}</span>
              {hovered.event && (
                <>
                  <span className="text-gray-500">·</span>
                  <span className="text-amber-300 font-medium">{hovered.event}</span>
                </>
              )}
            </span>
          ) : (
            <span className="text-gray-500 text-sm">— {currentYear} visit calendar · hover any day to see its score</span>
          )}
        </div>

        {/* 12-month calendar grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {MONTH_KEYS.map((key, idx) => (
            <MonthCalendar
              key={key}
              monthIdx={idx}
              year={currentYear}
              dayMap={dayMaps[idx]}
              currentMonthIdx={currentMonthIdx}
              onHoverDay={onHoverDay}
              activeKey={activeKey}
            />
          ))}
        </div>

        {/* Callout cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-2xl p-5">
            <div className="text-emerald-400 font-bold text-sm mb-1">Apr, May, Sep, Oct — Excellent</div>
            <p className="text-gray-400 text-sm leading-relaxed">Perfect weather, festivals in full swing, shoulder-season prices. The sweet spots most tourists miss.</p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-2xl p-5">
            <div className="text-yellow-400 font-bold text-sm mb-1">Jul & Aug — Average to Below Avg</div>
            <p className="text-gray-400 text-sm leading-relaxed">Scorching heat (28–29°C), extreme crowds, and peak hotel prices. Great beach weather, poor city weather.</p>
          </div>
          <div className="bg-blue-900/20 border border-blue-800/40 rounded-2xl p-5">
            <div className="text-blue-400 font-bold text-sm mb-1">Feb–Mar — Hidden Gems</div>
            <p className="text-gray-400 text-sm leading-relaxed">Carnival in February, spring beginning in March. Low crowds, good prices, still warm enough to enjoy the city.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={onScrollToDatePicker}
            className="group px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
          >
            See how your dates score across all 220 cities
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <span className="text-gray-500 text-sm">Every city has a calendar like this. Enter your dates to see your ranking.</span>
        </div>
      </div>
    </section>
  );
}
