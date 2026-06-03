#!/usr/bin/env bash
# Launch the eurotrip-planner dev server, smoke-test itinerary generation
# (July vs January Paris), print the result, and shut the server down.
#
# Healthy run: both POSTs return HTTP 200, each day has real attractions
# (not just "Lunch break"), January carries a cold/short-daylight weather note,
# and Bastille Day anchors on July 14.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

LOG=/tmp/eurotrip-smoke-dev.log
rm -f "$LOG"
echo "▶ starting dev server…"
npm run dev > "$LOG" 2>&1 &
DEV_PID=$!

cleanup() {
  echo "▶ stopping dev server (pid $DEV_PID)…"
  kill "$DEV_PID" 2>/dev/null
  pkill -f "next dev" 2>/dev/null
  pkill -f "next-server" 2>/dev/null
}
trap cleanup EXIT

# Wait for readiness (up to 60s)
for _ in $(seq 1 60); do
  grep -q "Ready in" "$LOG" 2>/dev/null && break
  sleep 1
done
PORT=$(grep -oE "localhost:[0-9]+" "$LOG" | head -1 | grep -oE "[0-9]+")
if [ -z "${PORT:-}" ]; then
  echo "✗ server did not become ready. Log:"; cat "$LOG"; exit 1
fi
echo "▶ server ready on port $PORT"

req() { # label start end allocation
  local label="$1" start="$2" end="$3" alloc="$4"
  echo ""
  echo "══════════════ $label ══════════════"
  curl -s -X POST "http://localhost:$PORT/api/trips/generate" \
    -H 'Content-Type: application/json' \
    -d "{\"cities\":[{\"id\":\"paris\",\"name\":\"Paris\",\"country\":\"France\"}],\"start_date\":\"$start\",\"end_date\":\"$end\",\"pace\":\"balanced\",\"interests\":[\"Culture & History\"],\"day_allocation\":{\"paris\":$alloc}}" \
    -o /tmp/eurotrip-smoke-resp.json -w "HTTP %{http_code}  %{time_total}s"
  echo ""
  node -e '
    const it = JSON.parse(require("fs").readFileSync("/tmp/eurotrip-smoke-resp.json")).itinerary;
    if (it.intro) console.log("INTRO:", it.intro);
    for (const d of it.days) {
      console.log(`  Day ${d.dayNumber} [${d.date}] — ${d.theme || ""}`);
      if (d.weatherNote) console.log("    ☁ ", d.weatherNote);
      for (const tb of (d.timeBlocks||[])) {
        const a = tb.activity || {};
        console.log(`      ${a.isEvent?"★":" "} ${(tb.time||"").padEnd(12)} ${a.name||""}`);
      }
    }
  '
}

req "JULY 12–15 (warm, Bastille Day)" 2026-07-12 2026-07-15 4
req "JANUARY 12–15 (cold, short days)" 2026-01-12 2026-01-15 4

echo ""
echo "✔ smoke test complete"
