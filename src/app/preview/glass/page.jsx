"use client";
import { useState } from "react";
import DateSelector from "../../../components/DateSelector";

export default function GlassPreview() {
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
    <div className="min-h-screen text-zinc-900 bg-[radial-gradient(1200px_600px_at_50%_-100px,rgba(124,181,255,.35),transparent),linear-gradient(to_bottom,#f7fbff,white)]">
      {/* Hero */}
      <header className="px-6 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Tell us <span className="bg-gradient-to-r from-violet-500 to-sky-500 bg-clip-text text-transparent">when</span>, we’ll tell you <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">where</span>
          </h1>
          <p className="mt-4 text-zinc-600 max-w-2xl mx-auto">
            Exact dates, a range, or just a month. We’ll rank Europe’s best for that moment.
          </p>

          <div className="mt-8 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 rounded-3xl shadow-soft ring-1 ring-black/5 p-6">
            <DateSelector onChange={setDates} />
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={find} disabled={!dates || loading}
                className={`rounded-full px-6 py-3 text-sm font-semibold text-white shadow transition
                 ${!dates ? "bg-zinc-300" : "bg-zinc-900 hover:bg-zinc-800"}`}>
                {loading ? "Finding…" : "Find My Experiences"}
              </button>
              <a href="/preview/noir" className="rounded-full px-6 py-3 text-sm font-semibold bg-white text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50">
                Try Noir
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Results */}
      {!!results.length && (
        <main className="px-6 pb-16">
          <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((it, i) => (
              <article key={it.id} className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur ring-1 ring-zinc-200 shadow-sm hover:shadow-md transition">
                <img src={it.image} alt={it.title} className="h-48 w-full object-cover" />
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium">
                  #{i + 1} • {it.score.toFixed(1)}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{it.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600">{it.subtitle}</p>
                  <p className="mt-3 text-sm"><span className="font-medium">Why now:</span> {it.why}</p>
                </div>
              </article>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
