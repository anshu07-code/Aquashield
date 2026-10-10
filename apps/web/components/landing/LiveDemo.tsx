"use client";

import dynamic from "next/dynamic";
import { WaterWave } from "./WaterWave";
import { useApp } from "@/lib/store";
import { translate } from "@/lib/i18n";

const RiskMap = dynamic(() => import("@/components/map/RiskMap"), { ssr: false });

export function LiveDemo() {
  const { lang, effectiveZones } = useApp();

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
            {translate(lang, "landing.live.eyebrow")}
          </span>
          <h2 className="mb-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {translate(lang, "landing.live.title")}
          </h2>
          <p className="text-lg text-white/45">
            {translate(lang, "landing.live.sub")}
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
              <span className="text-xs font-bold tracking-widest text-cyan-300">{translate(lang, "landing.live.status")}</span>
            </div>
            <span className="text-xs text-cyan-400/60">{translate(lang, "landing.live.updated")}</span>
          </div>

          {/* Map */}
          <div className="relative h-[460px] w-full sm:h-[560px]">
            <RiskMap
              zones={effectiveZones}
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


      </div>

      {/* Bottom decorative wave */}
      <div className="absolute bottom-0 left-0 right-0 rotate-180">
        <WaterWave className="w-full" />
      </div>
    </section>
  );
}
