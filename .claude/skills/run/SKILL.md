---
name: run
description: Launch and drive the eurotrip-planner Next.js app — start the dev server, smoke-test itinerary generation, and verify changes end-to-end. Use when asked to run/start the app, screenshot it, or confirm a change works in the real app.
---

# Run the eurotrip-planner app

Next.js 15 (App Router) web app. Secrets (incl. `ANTHROPIC_API_KEY`) live in
`.env.local`, which `next dev` loads automatically. Itinerary data is read from
`public/data/<Country>/<City>/sections/*.json` and `monthly/*.json` server-side.

## Prerequisites

- `npm install` (first run only).
- `.env.local` must exist. The optional LLM "polish" pass on generated
  itineraries only runs when `ANTHROPIC_API_KEY` is set; set
  `ITINERARY_LLM_ENRICH=false` to force the fast deterministic path.

## Fast path — verify generation logic WITHOUT a server

The itinerary engine and city-data loader are plain ESM and run under the test
loader (which resolves the `@/…` alias). This is the quickest way to confirm a
generation change and needs no server or API key:

```bash
npm test                                   # full suite (Node test runner)
node --import ./tests/_support/register.mjs --test tests/seasonalItinerary.test.mjs tests/itineraryDataRegression.test.mjs
```

`tests/itineraryDataRegression.test.mjs` guards the bug class where generation
"succeeds" but produces empty days (city data must load from `sections/`, days
must contain real attraction blocks, dates must not drift).

## Run — start the dev server (background) + smoke test

Use the smoke script in this skill directory. It launches the server, waits for
readiness, POSTs two real itinerary requests (July vs January Paris) to
`/api/trips/generate`, and prints the day-by-day result:

```bash
bash .claude/skills/run/smoke.sh
```

What "healthy" looks like: both requests return `HTTP 200`, each day lists real
attractions (not just "Lunch break"), January shows a cold/short-daylight
weather note, and a dated event (Bastille Day) anchors on July 14.

### Manual equivalent

```bash
npm run dev > /tmp/nextdev.log 2>&1 &        # port 3000, falls back to 3001 if busy
for i in $(seq 1 40); do grep -q "Ready in" /tmp/nextdev.log && break; sleep 1; done
PORT=$(grep -oE "localhost:[0-9]+" /tmp/nextdev.log | head -1 | grep -oE "[0-9]+")

curl -s -X POST "http://localhost:$PORT/api/trips/generate" \
  -H 'Content-Type: application/json' \
  -d '{"cities":[{"id":"paris","name":"Paris","country":"France"}],
       "start_date":"2026-07-12","end_date":"2026-07-15",
       "pace":"balanced","interests":["Culture & History"],
       "day_allocation":{"paris":4}}' | npx --yes json5 2>/dev/null || true
```

With an API key set, each request takes ~5–8s (the LLM polish pass);
add `"... ITINERARY_LLM_ENRICH=false"` in the env to get a sub-second response.

## Drive the UI in a browser (optional)

```bash
# Ranked results page with date-specific city modals:
open "http://localhost:$PORT/results?mode=dates&start=2026-07-01&end=2026-07-08"
# Conversational planner (inline itinerary preview renders here):
open "http://localhost:$PORT/plan?city=paris&cityName=Paris&startDate=2026-07-12&endDate=2026-07-15"
```

The fully-rendered saved-itinerary page (`/itineraries/<tripId>`) requires a
Supabase-persisted trip; for visual checks of generated days, the planner's
inline preview is the no-auth path.

## Stop

```bash
pkill -f "next dev"; pkill -f "next-server"
lsof -nP -iTCP:3000 -sTCP:LISTEN || echo "port 3000 free"
```

## Gotchas

- **Dev server caches city data in memory** (`getCityData`, ~TTL). After editing
  files under `public/data/**`, restart the server to pick them up.
- **Port 3000 may be taken** — always read the actual port from the log line
  `- Local: http://localhost:PORT`.
- **`npm run build` is heavy** — it regenerates city/score/content data first
  (`generate-cities`, `build:scores`, etc.). For a quick code-compile sanity
  check prefer `npm test` + the smoke script over a full build.
