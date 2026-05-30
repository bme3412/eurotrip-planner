#!/bin/bash
# Nightly wrapper for the Open-Meteo weather backfill (run by launchd).
# Resumable + quota-aware: scripts/backfillWeather.mjs skips finished cities and
# stops itself when Open-Meteo rate-limits, so re-running each night completes
# the dataset over a few nights, then becomes a harmless no-op. Does NOT commit —
# it only writes index.json + monthlyScores.json for you to review.

set -u
export PATH="/Users/brendan/.reflex/.nvm/versions/node/v22.20.0/bin:$PATH"
REPO="/Users/brendan/Desktop-2026/eurotrip-planner-main"
LOG="$REPO/scripts/.weather-backfill.log"

cd "$REPO" || exit 1
{
  echo "===== $(date) — nightly weather backfill start ====="
  node scripts/backfillWeather.mjs
  node scripts/generateMonthlyScores.mjs >/dev/null 2>&1 && echo "monthlyScores.json rebuilt"
  echo "===== $(date) — done ====="
  echo ""
} >> "$LOG" 2>&1
