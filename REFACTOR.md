## Refactor plan (ranked by expected output gains)

1) Server-first rendering and component boundaries
- Impact: Very High (lower JS shipped, faster LCP/TTI)
- Actions:
  - Move non-interactive UI to server components; keep tabs/filters/maps client-side only
  - Reduce “use client” surface area across `components/`
  - Stream above-the-fold content; isolate interactive sections behind Suspense

2) Consolidate data and CDN caching
- Impact: Very High (fewer requests, lower latency, better cache hit-rate)
- Actions:
  - Use consolidated `monthly/index.json` (done) and add a per-city `index.json` for overview/attractions/etc.
  - Serve `/data/**` via CDN with immutable caching (done); brotli/gzip enabled
  - Centralize fetches with consistent cache policy (`force-cache`/`revalidate`) and ETags for dynamic merges

3) Strict map code-splitting and main-thread offload
- Impact: High (large JS reduction; smoother interactions)
- Actions:
  - Keep `mapbox-gl` behind a dynamic client-only boundary (`ssr: false`); load only on map tab
  - Cluster markers + filtering in a Web Worker; throttle/debounce interactions
  - Load map CSS only when rendering map

4) Image optimization with `next/image`
- Impact: High (improved LCP and bandwidth)
- Actions:
  - Replace `<img>` in preview pages and cards with `next/image`
  - Ensure remotePatterns are configured (done) and add priority to hero images

5) Intent-driven data loading and Suspense
- Impact: Medium-High (less blocking work; smaller initial payload)
- Actions:
  - Seed client hooks with SSR `initialData`; fetch full data only on tab open/hover (monthly done)
  - Keep expensive sections (maps, monthly detail) behind Suspense boundaries

6) Build-time validation and performance budgets (CI)
- Impact: Medium (quality + consistent perf)
- Actions:
  - Validate JSON against schemas (Ajv/Zod) during build
  - Add Lighthouse CI (mobile/slow 4G) and bundle analyzer budgets per route

7) Virtualization and pagination for long lists
- Impact: Medium (CPU/render savings on low-end devices)
- Actions:
  - Virtualize attractions lists and map popups
  - Paginate or lazy-render sections below the fold

8) Prefetch/preconnect/preload hints
- Impact: Medium-Low (micro-latency improvements)
- Actions:
  - Keep CDN preconnect/DNS-prefetch (done)
  - Prefetch next-likely tab and city assets based on user behavior

9) Edge runtime + 304s where appropriate
- Impact: Low-Medium (TTFB improvements on light endpoints)
- Actions:
  - Keep lightweight endpoints at edge (cities, suggestions done)
  - Add ETags/If-None-Match on any server-side JSON aggregation endpoints

10) Domain/data layer clean-up and structure
- Impact: Medium (maintainability; fewer regressions)
- Actions:
  - Centralize city/monthly access in a small data layer (fetch/FS) with uniform caching and errors
  - Organize by responsibility: routes (app), UI (components server/client), domain (logic), data (I/O), services, utils

Notes on current progress
- Implemented: monthly index generation; CDN-aware data URLs; long-cache headers for `/data/**`; preconnect; intent-driven monthly fetching; edge runtime for suggestions; City page seeds initial monthly data.

Suggested execution order
1) Boundary audit (server-first) and `next/image` migration
2) Per-city `index.json` + CDN sync for `/data/**`
3) Map isolation + worker clustering
4) CI budgets and data schema validation
5) Virtualization, prefetch hints, and hook dependency cleanups


