"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp } from "lucide-react";
import ScoreboardTable from "./ScoreboardTable";

const BUCKETS = [
  { key: "this-week", label: "This week" },
  { key: "may", label: "May" },
  { key: "summer", label: "Summer" },
];

/**
 * ScoreboardStrip - Container for scoreboard with bucket filters.
 */
export default function ScoreboardStrip() {
  const [activeBucket, setActiveBucket] = useState("this-week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch bucket data
  const fetchBucket = useCallback(async (bucket) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/data/_scoreboard/${bucket}.json`);

      if (!res.ok) {
        throw new Error(`Failed to load ${bucket} data`);
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Scoreboard fetch error:", err);
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on bucket change
  useEffect(() => {
    fetchBucket(activeBucket);
  }, [activeBucket, fetchBucket]);

  return (
    <div className="rounded-2xl border border-hero-line bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-hero-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-hero-accent-soft flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-hero-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-hero-ink">Top Cities Right Now</h2>
            <p className="text-sm text-hero-ink-muted">
              Ranked by our AI scoring engine
            </p>
          </div>
        </div>

        {/* Bucket filters */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
          {BUCKETS.map((bucket) => (
            <button
              key={bucket.key}
              onClick={() => setActiveBucket(bucket.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeBucket === bucket.key
                  ? "bg-hero-accent-soft text-hero-accent shadow-sm"
                  : "text-hero-ink-muted hover:text-hero-ink"
              }`}
            >
              {bucket.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-6 h-6 bg-gray-200 rounded" />
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-12" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-hero-ink-muted mb-2">{error}</p>
            <button
              onClick={() => fetchBucket(activeBucket)}
              className="text-sm text-hero-accent hover:text-hero-accent-hover"
            >
              Try again
            </button>
          </div>
        ) : (
          <ScoreboardTable
            cities={data?.cities || []}
            initialLimit={5}
          />
        )}
      </div>

      {/* Footer */}
      {data?.dateRange && (
        <div className="px-5 py-3 border-t border-hero-line bg-gray-50/50 text-xs text-hero-ink-muted">
          Data for {data.dateRange.start} to {data.dateRange.end}
        </div>
      )}
    </div>
  );
}
