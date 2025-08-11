"use client";
import { useState } from "react";
import DateSelector from "../../../components/DateSelector";

export default function MetroPreview() {
  const [dates, setDates] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const find = async () => {
    if (!dates) return;
    setLoading(true);
    const r = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dates }),
    });
    const data = await r.json();
    setResults(data.items || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Plan, Book, Go.
          </h1>
          <p className="mt-2 text-zinc-600">Fast picks. Bold choices. Built for momentum.</p>

          <div className="mt-8 grid md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <div className="rounded-2xl border-2 border-zinc-900 p-5">
                <DateSelector onChange={setDates} />
              </div>
            </div>
            <div className="flex gap-3 md:justify-end">
              <button
                onClick={find}
                disabled={!dates || loading}
                className={`uppercase tracking-wide rounded-xl px-6 py-3 text-sm font-bold text-white transition shadow-md
                ${!dates ? "bg-zinc-300" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {loading ? "Finding…" : "Find Cities"}
              </button>
              <a
                href="/preview/aurora"
                className="uppercase tracking-wide rounded-xl px-6 py-3 text-sm font-bold bg-white text-zinc-900 border-2 border-zinc-900 hover:bg-zinc-50"
              >
                Try Aurora
              </a>
            </div>
          </div>
        </div>
      </header>

      {!!results.length && (
        <main className="px-6 pb-16">
          <div className="mx-auto max-w-6xl grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((it, i) => (
              <article
                key={it.id}
                className="group relative overflow-hidden rounded-2xl border-2 border-zinc-900 bg-white hover:-translate-y-0.5 transition"
              >
                <img src={it.image} alt={it.title} className="h-48 w-full object-cover" />
                <div className="absolute left-4 top-4 bg-blue-600 text-white text-xs font-black tracking-widest px-2 py-1 rounded">
                  #{i + 1} • {it.score.toFixed(1)}
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-extrabold">{it.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600 uppercase tracking-wide">{it.subtitle}</p>
                  <p className="mt-3 text-sm">
                    <span className="font-bold">Why now:</span> {it.why}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}


