# P1 — FRONTEND & UX LEAD

**Owner:** P1  
**Path:** `apps/web/`  
**Judging impact:** Design & Usability + demo video visual quality

## Session start
```
Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md, docs/SYNCHRONIZATION.md, and this file first.
You are P1. Work ONLY in apps/web/. Use mocks first (NEXT_PUBLIC_USE_MOCKS=true).
```

## What you're building
- Next.js PWA with MapLibre GL JS
- Risk map → zone detail → rainfall simulator → report flow → safe route → ops dashboard

## Critical rules

### NEVER do these
- ❌ Don't call Overpass, Open-Meteo, or OSRM directly from the browser
- ❌ Don't re-implement the risk formula — import from `@aquashield/risk-core`
- ❌ Don't change `packages/types/src/index.ts` (contract is P2's domain)
- ❌ Don't commit `.env.local` or any file with secrets
- ❌ Don't build against real AWS from the browser — use mocks or `NEXT_PUBLIC_API_URL`

### ALWAYS do these
- ✅ Parse every API response with the matching zod schema from `@aquashield/types`
- ✅ Use `@aquashield/risk-core` for the rainfall simulator (same math as backend)
- ✅ Show "SIMULATION" badge when using the slider
- ✅ Add loading skeletons, error toasts, and empty states for every async path
- ✅ Test on mobile viewport (375px wide) before pushing

## How to build without the real backend
```bash
# Terminal 1: start mock API
npm run mock:api

# Terminal 2: run Next.js dev
cd apps/web && npm run dev
```

In `apps/web/.env.local`:
```
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Switch to real API: set `NEXT_PUBLIC_USE_MOCKS=false` and point to P2's deployed URL.

## Build order (do this first)
1. `npx create-next-app@latest apps/web --typescript --tailwind --app` (or use existing scaffold)
2. Add to `next.config`: `transpilePackages: ["@aquashield/types", "@aquashield/risk-core"]`
3. Add workspace deps: `"@aquashield/types": "*"`, `"@aquashield/risk-core": "*"`, `"maplibre-gl": "^4.0.0"`
4. Design tokens (CSS variables): `--tier-safe` green, `--tier-watch` yellow, `--tier-high` orange, `--tier-critical` red
5. Risk map (MapLibre, full screen, zones as coloured circles/markers)
6. Zone detail panel (bottom sheet mobile / side panel desktop)
7. Rainfall simulator slider (calls `@aquashield/risk-core` in browser, SIMULATION badge)
8. 3-tap report flow (presign → PUT photo → POST report → result card)
9. Safe route screen (origin/destination, route cards, map polylines)
10. Ops dashboard at `/ops` (passcode gate, ranked hotspots, Ask Aquashield, work-order board)
11. PWA manifest, service worker, geolocation

## Demo path (must be flawless)
`map → click zone → simulator slider → report → route → ask AI`

## Verify before push
```bash
cd apps/web && npx tsc --noEmit && npm run build   # this is the real check
npm test                                            # repo-wide (risk-core + mocks)
```
Note: the root `npm run verify:p1` runs `tsc -p tsconfig.base.json`, which only covers `packages/` and
`scripts/` — **not** `apps/web`. It is currently red from pre-existing strict errors in P2's `scripts/*.ts`,
so don't treat that as a frontend failure. Verify the frontend with the commands above.

## Windows + OneDrive gotcha
If the repo lives inside an OneDrive-synced folder, OneDrive turns `.next/` into cloud reparse points and
`next dev`/`next build` die with `EINVAL: ... readlink '.next/package.json'`. `npm run dev` / `npm run build`
here already run `scripts/clear-next.mjs` first, which deletes `.next` without tripping on reparse points.
If you hit it anywhere else, run `node ./scripts/clear-next.mjs` manually.

## If you're blocked
- No API URL yet? Use `npm run mock:api` → builds against `mocks/*.json`
- No zone data yet? Use `mocks/zones.json` → shows 4 sample zones
- Need static zone attrs for simulator? Ask P2 to expose them in `/zones` response
- Contract unclear? Check `packages/types/src/index.ts` or ask P2 in chat

## Shared tasks (with other P1 tasks)
- Demo video recording + editing + YouTube upload (script from P4, AWS clips from P2)
- Screenshots for README