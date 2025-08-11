"use client";
import { useState } from "react";
import DateSelector from "../../../components/DateSelector";

export default function AuroraPreview() {
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
    <div className="min-h-screen text-white bg-[radial-gradient(1000px_500px_at_50%_-200px,rgba(56,189,248,0.35),transparent),radial-gradient(1000px_500px_at_20%_-300px,rgba(168,85,247,0.35),transparent),#0a0a0b]">
      <header className="px-6 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">
            Find the glow in your dates
          </h1>
          <p className="mt-3 text-zinc-300">Vivid gradients, crisp cards — effortless choices.</p>

          <div className="mt-8 rounded-3xl bg-white/5 backdrop-blur ring-1 ring-white/10 p-6">
            <DateSelector onChange={setDates} />
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={find}
                disabled={!dates || loading}
                className={`rounded-full px-6 py-3 text-sm font-semibold text-black transition
                ${!dates ? "bg-zinc-600" : "bg-cyan-300 hover:bg-cyan-200"}`}
              >
                {loading ? "Finding…" : "Find My Experiences"}
              </button>
              <a
                href="/preview/metro"
                className="rounded-full px-6 py-3 text-sm font-semibold bg-white/10 text-white ring-1 ring-white/10 hover:bg-white/15"
              >
                Try Metro
              </a>
            </div>
          </div>
        </div>
      </header>

      {!!results.length && (
        <main className="px-6 pb-16">
          <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((it, i) => (
              <article
                key={it.id}
                className="relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/10 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition"
              >
                <img src={it.image} alt={it.title} className="h-48 w-full object-cover opacity-95" />
                <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-200/30">
                  #{i + 1} • {it.score.toFixed(1)}
                </div>
                <div className="p-4 text-white">
                  <h3 className="text-lg font-semibold">{it.title}</h3>
                  <p className="mt-1 text-sm text-zinc-300">{it.subtitle}</p>
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


