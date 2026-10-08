# P1 — FRONTEND & UX LEAD (owns what judges SEE)
Folder: `apps/web/`. Judging impact: **Design & Usability + the demo video's visual quality.**

## Start every AI session with
> Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md and docs/roles/P1_FRONTEND.md. I am P1. Work only in apps/web. Use mocks first (NEXT_PUBLIC_USE_MOCKS=true), parse every API response with the zod schemas from @jalrakshak/types, and use @jalrakshak/risk-core for the rainfall simulator. Build step by step; after each step tell me how to verify.

## Build order
1. **Setup (Thu, 1h):** `npx create-next-app@latest apps/web` (TS, Tailwind, App Router). Add `transpilePackages: ["@jalrakshak/types","@jalrakshak/risk-core"]` in `next.config`. Add dependency `"@jalrakshak/types": "*"`, `"@jalrakshak/risk-core": "*"`, `maplibre-gl`. Create `lib/api.ts` with `USE_MOCKS` switch that imports `../../../mocks/*.json` or fetches `NEXT_PUBLIC_API_URL`.
2. **Design tokens:** SAFE green, WATCH yellow, HIGH orange, CRITICAL red; high contrast; large touch targets; readable on phone in sunlight.
3. **Risk map:** MapLibre full screen, zone markers coloured by tier, pulse on CRITICAL, legend, "stale data" badge.
4. **Zone detail sheet** (bottom sheet on mobile, side panel on desktop): risk %, tier, ETA ("Critical now" / "in ~28 min" / "no risk next 3h"), 6 factor bars with contribution, top reasons, active reports with verified badge.
5. **Rainfall simulator:** slider 0-100 mm/hr; recompute all zones client-side via risk-core (needs zone static attrs: ask P2/P4 to expose them in `/zones` or ship `data/zones.geojson` to the client). Show a clear **SIMULATION** badge + reset. This is a P0 demo moment.
6. **Report flow (3 taps):** type -> photo (camera/upload) -> submit. Presign -> PUT -> POST `/reports`. Result card: what AI saw, confidence, trust, verified badge, risk change old -> new (animate).
7. **Safe route:** origin (use my location / pick on map), destination search, 2-3 route cards (duration, hazards avoided, recommended badge), draw lines on map, summary sentence from API.
8. **Ops dashboard `/ops`** (passcode gate): ranked hotspots, "Ask JalRakshak" box, plan card (summary, why, actions, EN/HI alert drafts), buttons "Create work orders" and "Publish alert" (set `execute=true` only after click), work-order board.
9. **PWA:** manifest, icons, service worker caching last zones for offline, geolocation "risk near me".
10. **Polish:** skeleton loaders, error toasts, empty states, EN/HI toggle, subtle animations, favicon, page titles.

## Don'ts
No auth for citizens. No calling external APIs from the browser. No re-implementing the risk formula. No localStorage tricks for shared state.

## Done when
A stranger on a phone opens the URL, sees the map, reports a flood and gets a safe route without help. Demo path is flawless:
**map -> click -> simulate -> report -> route -> ask AI.**

## Also owns (shared tasks)
Demo video recording/editing/YouTube upload (script by P4, AWS clips by P2). Screenshots for README.
