"use client";

import { useState } from "react";
import { MessageSquare, CalendarRange } from "lucide-react";
import TripSearchBar from "@/components/common/TripSearchBar";
import DescribeTripInput from "./DescribeTripInput";

const TABS = [
  { id: "describe", label: "Describe your trip", Icon: MessageSquare },
  { id: "structured", label: "Pick dates & route", Icon: CalendarRange },
];

export default function HeroWidget({ dates, onChangeDates, onSubmitStructured }) {
  const [mode, setMode] = useState("describe");

  return (
    <div className="bg-white rounded-3xl p-4 md:p-5 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100">
      {/* Tab control */}
      <div
        role="tablist"
        aria-label="How would you like to start?"
        className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-2xl mb-4"
      >
        {TABS.map((tab) => {
          const active = mode === tab.id;
          const { Icon } = tab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              aria-controls={`hero-pane-${tab.id}`}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-gray-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active pane */}
      <div
        id={`hero-pane-${mode}`}
        role="tabpanel"
        aria-labelledby={`hero-tab-${mode}`}
        className="px-1"
      >
        {mode === "describe" ? (
          <DescribeTripInput value={dates} onChange={onChangeDates} />
        ) : (
          <TripSearchBar
            value={dates}
            onChange={onChangeDates}
            onSubmit={onSubmitStructured}
            embedded
          />
        )}
      </div>
    </div>
  );
}
