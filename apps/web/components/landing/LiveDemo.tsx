"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { WaterWave } from "./WaterWave";

const RiskMap = dynamic(() => import("@/components/map/RiskMap"), { ssr: false });

const DEMO_ZONES = [
  { id: "z_minto",     name: "Minto Bridge",     lat: 28.6328, lng: 77.2197, isUnderpass: true,  risk: 78, tier: "CRITICAL" as const, etaMin: null, updatedAt: new Date().toISOString(), stale: false },
  { id: "z_zakhira",  name: "Zakhira Underpass", lat: 28.6657, lng: 77.1535, isUnderpass: true,  risk: 31, tier: "WATCH"    as const, etaMin: null, updatedAt: new Date().toISOString(), stale: false },
  { id: "z_ito",      name: "ITO Intersection",  lat: 28.6289, lng: 77.2405, isUnderpass: false, risk: 62, tier: "HIGH"      as const, etaMin: null, updatedAt: new Date().toISOString(), stale: false },
  { id: "z_prahladpur",name: "Prahladpur",        lat: 28.6519, lng: 77.1770, isUnderpass: true,  risk: 55, tier: "HIGH"      as const, etaMin: null, updatedAt: new Date().toISOString(), stale: false },
];

export function LiveDemo() {
  return (
    <section
      id="live-demo"
      className="relative overflow-hidden py-28"
      style={{ background: "linear-gradient(180deg, #030b1a 0%, #061825 100%)" }}
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
            See it Live
          </span>
          <h2 className="mb-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Real Zones. Real Risk.
          </h2>
          <p className="text-lg text-white/45">
            Live data from AWS Lambda + DynamoDB · Refreshes every 15 min
          </p>
        </div>

        {/* Map card */}
        <div
          className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-cyan-400/20"
          style={{ boxShadow: "0 0 80px -12px rgba(0,180,216,0.25)" }}
        >
          {/* Status bar */}
          <div
            className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-cyan-400/15 bg-cyan-950/80 px-5 py-3 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
              </span>
              <span className="text-xs font-bold tracking-widest text-cyan-300">LIVE DATA</span>
            </div>
            <span className="text-xs text-cyan-400/60">Updated just now</span>
          </div>

          {/* Map */}
          <div className="relative h-[460px] w-full sm:h-[560px]">
            <RiskMap
              zones={DEMO_ZONES}
              selectedId={null}
              onSelect={() => {}}
              routes={null}
              selectedRouteId={null}
              userLocation={null}
              simActive={false}
            />
            <div className="pointer-events-none absolute inset-0 map-overlay-scan" />
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/map"
            className="flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold text-slate-950 transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #00e5ff 0%, #0096c7 100%)",
              boxShadow: "0 8px 32px -4px rgba(0,180,216,0.45)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
              <path d="M3 15c3.5 0 3.5-3 7-3s3.5 3 7-3 3.5-3 4-3" strokeLinecap="round" />
              <path d="M3 20c3.5 0 3.5-3 7-3s3.5 3 7-3 3.5-3 4-3" strokeLinecap="round" opacity=".5" />
            </svg>
            Open Full App
          </Link>
          <Link
            href="/ops"
            className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-base font-bold text-white transition-all hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <rect x="3" y="3" width="7" height="7" rx="1.6" />
              <rect x="14" y="3" width="7" height="7" rx="1.6" />
              <rect x="3" y="14" width="7" height="7" rx="1.6" />
              <rect x="14" y="14" width="7" height="7" rx="1.6" />
            </svg>
            Ops Dashboard
          </Link>
        </div>
      </div>

      {/* Bottom decorative wave */}
      <div className="absolute bottom-0 left-0 right-0 rotate-180">
        <WaterWave className="w-full" />
      </div>
    </section>
  );
}
