"use client";
import { useState } from "react";
import Image from "next/image";
import DateSelector from "../../../components/DateSelector";

export default function EditorialPreview() {
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
    <div className="min-h-screen bg-[#fafaf8] text-zinc-900">
      <header className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-serif text-5xl md:text-6xl tracking-tight">
            Tell us <span className="underline decoration-4 decoration-amber-400 underline-offset-8">when</span>, we’ll tell you <span className="underline decoration-4 decoration-sky-400 underline-offset-8">where</span>
          </h1>
          <p className="mt-4 text-zinc-700">
            Enter your window; we’ll surface seasonal standouts and city picks—ranked with a transparent score.
          </p>

          <div className="mt-8 rounded-xl bg-white p-6 ring-1 ring-zinc-200">
            <DateSelector onChange={setDates} />
            <div className="mt-6 flex gap-3">
              <button onClick={find} disabled={!dates || loading}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition
                 ${!dates ? "bg-zinc-200 text-zinc-600" : "bg-amber-600 text-white hover:bg-amber-700"}`}>
                {loading ? "Finding…" : "Find My Experiences"}
              </button>
              <a href="/preview/glass" className="rounded-lg px-5 py-2.5 text-sm font-semibold ring-1 ring-zinc-300 bg-white hover:bg-zinc-50">
                Try Glass
              </a>
            </div>
          </div>
        </div>
      </header>

      {!!results.length && (
        <main className="px-6 pb-16">
          <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2">
            {results.map((it, i) => (
              <article key={it.id} className="rounded-xl bg-white ring-1 ring-zinc-200 hover:-translate-y-0.5 transition shadow-sm">
                <Image src={it.image} alt={it.title} width={1200} height={600} className="h-56 w-full object-cover" />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-2xl">{it.title}</h3>
                    <span className="text-sm text-zinc-600">#{i + 1} • {it.score.toFixed(1)}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700">{it.subtitle}</p>
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
