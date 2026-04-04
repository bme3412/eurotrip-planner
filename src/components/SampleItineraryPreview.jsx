"use client";

import { useEffect, useState, useMemo } from "react";
import { Modal, Badge, Button } from "./common/UILibrary";

function parseReportToSections(text) {
  if (!text) return { intro: "", sections: [] };
  const lines = text.split(/\r?\n/);
  const sections = [];
  let buffer = [];
  let introLines = [];
  let current = null;
  const flushBuffer = () => {
    if (!current) return;
    current.content = (current.content || []).concat(buffer);
    buffer = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (/^DAY\s+\d+\s+—/i.test(line)) {
      flushBuffer();
      if (current) sections.push(current);
      current = { title: line.replace(/^DAY\s+/i, "Day ") };
      continue;
    }
    if (!current) {
      // collect intro until the first day section
      if (line !== "") introLines.push(raw);
      continue;
    }
    // treat separators as paragraph breaks
    if (/^[-]{5,}$/.test(line)) {
      buffer.push("");
      continue;
    }
    buffer.push(raw);
  }
  flushBuffer();
  if (current) sections.push(current);
  return { intro: introLines.join("\n"), sections };
}

export default function SampleItineraryPreview({ isOpen, onClose, src = "/data/sample-itineraries/paris-3-day-08-11-25.txt" }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!isOpen) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(src, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load sample (${res.status})`);
        const txt = await res.text();
        if (!ignore) setText(txt);
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [isOpen, src]);

  const parsed = useMemo(() => parseReportToSections(text), [text]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sample Itinerary — Paris (3 Days)" size="xl" className="max-h-[85vh]">
      <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "65vh" }}>
        {loading && <div className="text-sm text-zinc-600">Loading sample…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && !error && (
          <>
            <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-6">
              {parsed.intro}
            </div>
            <div className="grid gap-4">
              {parsed.sections.map((s, idx) => (
                <section key={idx} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold">{s.title}</h3>
                    <Badge variant="primary" size="small">Day {idx + 1}</Badge>
                  </div>
                  <div className="text-sm text-zinc-800 whitespace-pre-wrap leading-6">
                    {(s.content || []).join("\n").trim()}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button as="a" href="#dates" onClick={onClose}>Start Planning</Button>
      </div>
    </Modal>
  );
}


