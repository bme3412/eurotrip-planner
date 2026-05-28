'use client';

/**
 * Interactive freshness table for the dev-only admin page.
 *
 * Columns are the section keys registered in scripts/refresh/registry.mjs.
 * Each cell shows the per-section `updatedAt` (or "never") and a Refresh
 * button. Clicking POSTs to /api/admin/refresh which shells out to the
 * refresh CLI on the server.
 */
import { useMemo, useState } from 'react';

const SECTIONS = ['overview', 'connections'];

function formatAge(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (Number.isNaN(ms)) return 'invalid';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}

export default function FreshnessTable({ rows }) {
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState({}); // key: `${city}/${section}` -> boolean
  const [outcomes, setOutcomes] = useState({}); // key -> { ok, message }

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.citySlug.includes(q) || r.country.includes(q)
    );
  }, [filter, rows]);

  async function refresh(citySlug, section) {
    const key = `${citySlug}/${section}`;
    setBusy((s) => ({ ...s, [key]: true }));
    setOutcomes((s) => ({ ...s, [key]: null }));
    try {
      const res = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ city: citySlug, section }),
      });
      const body = await res.json();
      setOutcomes((s) => ({
        ...s,
        [key]: { ok: res.ok && body.ok, message: body.message || (res.ok ? 'done' : `HTTP ${res.status}`) },
      }));
    } catch (err) {
      setOutcomes((s) => ({ ...s, [key]: { ok: false, message: err.message } }));
    } finally {
      setBusy((s) => ({ ...s, [key]: false }));
    }
  }

  return (
    <div>
      <input
        className="mb-4 w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm"
        placeholder="Filter by city or country..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">City</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Country</th>
              {SECTIONS.map((s) => (
                <th key={s} className="px-3 py-2 text-left font-medium text-gray-700">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {visible.map((row) => (
              <tr key={row.citySlug}>
                <td className="px-3 py-2 font-mono text-xs">{row.citySlug}</td>
                <td className="px-3 py-2 text-gray-600">{row.country}</td>
                {SECTIONS.map((s) => {
                  const meta = row.sections[s];
                  const key = `${row.citySlug}/${s}`;
                  const isBusy = !!busy[key];
                  const outcome = outcomes[key];
                  return (
                    <td key={s} className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500">
                          {formatAge(meta?.updatedAt)}
                          {meta?.version ? ` · v${meta.version}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => refresh(row.citySlug, s)}
                          disabled={isBusy}
                          className="inline-flex w-fit items-center rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                        >
                          {isBusy ? 'Refreshing…' : 'Refresh'}
                        </button>
                        {outcome && (
                          <span className={outcome.ok ? 'text-xs text-green-700' : 'text-xs text-red-700'}>
                            {outcome.message}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
