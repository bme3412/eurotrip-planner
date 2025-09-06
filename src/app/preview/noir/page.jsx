"use client";
import { useState } from "react";
import Image from "next/image";
import DateSelector from "../../../components/DateSelector";

export default function NoirPreview() {
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
    <div className="min-h-screen text-zinc-100 bg-gradient-to-b from-zinc-950 to-black">
      <header className="px-6 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">
            Tell us <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400">when</span>, we’ll tell you <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">where</span>
          </h1>
          <p className="mt-4 text-zinc-400">Minimal inputs. Serious results.</p>

          <div className="mt-8 rounded-3xl bg-zinc-900/70 ring-1 ring-zinc-800 p-6 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
            <DateSelector onChange={setDates} />
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={find} disabled={!dates || loading}
                className={`rounded-full px-6 py-3 text-sm font-semibold text-black transition
                 ${!dates ? "bg-zinc-600" : "bg-fuchsia-400 hover:bg-fuchsia-300"}`}>
                {loading ? "Finding…" : "Find My Experiences"}
              </button>
              <a href="/preview/editorial" className="rounded-full px-6 py-3 text-sm font-semibold bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-800">
                Try Editorial
              </a>
            </div>
          </div>
        </div>
      </header>

      {!!results.length && (
        <main className="px-6 pb-16">
          <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((it, i) => (
              <article key={it.id} className="relative overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 hover:ring-fuchsia-400/40 transition shadow">
                <Image src={it.image} alt={it.title} width={1200} height={600} className="h-48 w-full object-cover opacity-90" />
                <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-fuchsia-300 ring-1 ring-fuchsia-400/40">
                  #{i + 1} • {it.score.toFixed(1)}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{it.title}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{it.subtitle}</p>
                  <p className="mt-3 text-sm text-zinc-200"><span className="font-medium">Why now:</span> {it.why}</p>
                </div>
              </article>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
