"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { translate } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";
import { distanceM } from "@/lib/format";
import { TopBar } from "@/components/TopBar";
import { Legend } from "@/components/Legend";
import { RainSimulator } from "@/components/RainSimulator";
import { ZoneSheet } from "@/components/ZoneSheet";
import { RoutePanel } from "@/components/RoutePanel";
import { ReportFlow } from "@/components/ReportFlow";
import { useEffect, useMemo } from "react";

const RiskMap = dynamic(() => import("@/components/map/RiskMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-ink-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <span className="absolute inset-0 animate-ping rounded-full bg-aqua-500/20" />
          <span className="absolute inset-3 rounded-full border-2 border-aqua-400/50" />
          <span className="absolute inset-0 grid place-items-center text-aqua-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-7 w-7">
              <path d="M3 15c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 4-3" strokeLinecap="round" />
              <path d="M3 20c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 4-3" strokeLinecap="round" opacity=".5" />
            </svg>
          </span>
        </div>
        <p className="text-sm font-medium text-white/50">Loading risk map…</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const {
    lang,
    effectiveZones,
    zonesLoading,
    zonesError,
    reloadZones,
    selectedId,
    selectZone,
    closeZone,
    simActive,
    routes,
    selectedRouteId,
    userLocation,
    locate,
    locationDenied,
    openReport,
  } = useApp();
  const toast = useToast();

  const nearest = useMemo(() => {
    if (!userLocation || effectiveZones.length === 0) return null;
    return [...effectiveZones]
      .map((z) => ({ zone: z, d: distanceM(userLocation, { lat: z.lat, lng: z.lng }) }))
      .sort((a, b) => a.d - b.d)[0];
  }, [userLocation, effectiveZones]);

  // map markers call this with a zone id; background clicks call it with null
  const handleSelect = useMemo(
    () => (id: string | null) => {
      if (id) selectZone(id);
      else closeZone();
    },
    [selectZone, closeZone],
  );

  // close the open sheet with Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedId) closeZone();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, closeZone]);

  const onLocate = () => {
    locate();
    if (locationDenied) toast.error(translate(lang, "map.locate.denied"));
  };

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-ink-900">
      <RiskMap
        zones={effectiveZones}
        selectedId={selectedId}
        onSelect={handleSelect}
        routes={routes}
        selectedRouteId={selectedRouteId}
        userLocation={userLocation}
        simActive={simActive}
      />

      <TopBar />

      {/* legend (desktop) */}
      <div className="fixed left-3 top-[74px] z-40 hidden sm:block lg:left-5">
        <Legend />
      </div>

      {/* nearest zone chip */}
      {nearest ? (
        <div className="fixed left-1/2 top-[70px] z-40 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 sm:hidden">
          <div className="glass flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 shadow-glow">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: TIER_META[nearest.zone.tier].color }}
            />
            <p className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-white/80">
              {nearest.zone.name}
            </p>
            <span
              className="shrink-0 text-[11px] font-bold"
              style={{ color: TIER_META[nearest.zone.tier].color }}
            >
              {nearest.zone.risk} · {lang === "hi" ? TIER_META[nearest.zone.tier].labelHi : TIER_META[nearest.zone.tier].label}
            </span>
          </div>
        </div>
      ) : null}

      {/* rainfall simulator dock */}
      <div className="fixed inset-x-3 bottom-4 z-40 sm:inset-x-auto sm:bottom-6 sm:left-4 lg:left-6">
        <RainSimulator />
      </div>

      {/* action cluster */}
      <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2.5 sm:bottom-6 sm:right-6">
        {nearest ? (
          <div className="hidden glass rounded-2xl px-3.5 py-2 shadow-glow sm:block">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Nearest zone</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-white">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: TIER_META[nearest.zone.tier].color }}
              />
              {nearest.zone.name} · {nearest.zone.risk}
            </p>
          </div>
        ) : null}
        <button
          onClick={onLocate}
          aria-label={translate(lang, "map.locate")}
          title={translate(lang, "map.locate")}
          className="glass-strong grid h-12 w-12 place-items-center rounded-2xl text-white/80 shadow-glow transition hover:scale-105 hover:text-white active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-5 w-5">
            <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
        </button>
        <button
          onClick={() => openReport(null)}
          className="btn-primary h-14 gap-2.5 rounded-2xl px-5 shadow-glow-aqua"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-5 w-5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-bold">{translate(lang, "nav.report")}</span>
        </button>
      </div>

      {/* full-map loading / error veil */}
      {zonesLoading && effectiveZones.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-ink-900/40">
          <div className="glass-strong flex items-center gap-3 rounded-2xl px-5 py-3.5">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-aqua-400" />
            <span className="text-sm font-medium text-white/70">{translate(lang, "map.loading")}</span>
          </div>
        </div>
      ) : null}
      {zonesError ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-ink-900/70 p-6">
          <div className="glass-strong w-full max-w-sm rounded-3xl p-6 text-center">
            <p className="text-sm font-bold text-white">{translate(lang, "map.empty")}</p>
            <p className="mt-1.5 text-xs text-white/50">{zonesError}</p>
            <button onClick={reloadZones} className="btn-primary mt-4">
              {translate(lang, "map.retry")}
            </button>
          </div>
        </div>
      ) : null}

      <ZoneSheet />
      <RoutePanel />
      <ReportFlow />
    </main>
  );
}
