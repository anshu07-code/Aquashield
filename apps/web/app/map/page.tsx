"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { translate } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";
import { TopBar } from "@/components/TopBar";
import { Legend } from "@/components/Legend";
import { RainSimulator } from "@/components/RainSimulator";
import { ZoneSheet } from "@/components/ZoneSheet";
import { RoutePanel } from "@/components/RoutePanel";
import { ReportFlow } from "@/components/ReportFlow";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAlerts } from "@/lib/api";

const RiskMap = dynamic(() => import("@/components/map/RiskMap"), {
  ssr: false,
  loading: () => (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{ background: "var(--bg, #030b1a)" }}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-20 w-20 animate-float">
          <div
            className="absolute inset-0 rounded-full opacity-20"
            style={{ background: "var(--accent, #00b4d8)", filter: "blur(20px)" }}
          />
          <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
            <path
              d="M24 6C15.2 16.8 10 23.4 10 30a14 14 0 0 0 28 0c0-6.6-5.2-13.2-14-24Z"
              fill="var(--accent, #00b4d8)"
              opacity="0.8"
            />
            <path
              d="M24 14v12M19 21l5 5 5-5"
              stroke="#001a25"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
          Loading risk map…
        </p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{
                background: "var(--accent, #00b4d8)",
                animationDelay: `${i * 180}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const {
    lang,
    effectiveZones,
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
      .map((z) => ({
        zone: z,
        d: Math.hypot(z.lat - userLocation.lat, z.lng - userLocation.lng),
      }))
      .sort((a, b) => a.d - b.d)[0];
  }, [userLocation, effectiveZones]);

  const handleSelect = useMemo(
    () => (id: string | null) => {
      if (id) selectZone(id);
      else closeZone();
    },
    [selectZone, closeZone],
  );

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

  // Underpass risk-card carousel: left/right arrow buttons scroll by one card width.
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollCards = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>(":scope > *");
    const step = first ? first.offsetWidth + 10 : 250;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const criticalZones = effectiveZones.filter((z) => z.tier === "CRITICAL");
  const hasCritical = criticalZones.length > 0;

  // live count of published public alerts (shown as a badge under the top bar)
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  useEffect(() => {
    let on = true;
    fetchAlerts({ status: "published" })
      .then((list) => { if (on) setPublishedCount(list.filter((a) => a.status === "published").length); })
      .catch(() => { if (on) setPublishedCount(0); });
    return () => { on = false; };
  }, []);

  return (
    <main
      className="relative h-[100dvh] w-screen overflow-hidden"
      style={{ background: "var(--bg, #030b1a)" }}
    >
      {/* Atmospheric overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(0,100,160,0.12) 0%, transparent 70%)",
        }}
      />

      <RiskMap
        zones={effectiveZones}
        selectedId={selectedId}
        onSelect={handleSelect}
        routes={routes}
        selectedRouteId={selectedRouteId}
        userLocation={userLocation}
        simActive={simActive}
      />

      <div className="pointer-events-none absolute inset-0 z-0 map-overlay-scan" />

      <TopBar />

      {/* Left column: Risk legend + Rain simulator stacked under the top bar (large screens) */}
      <div
        className="fixed left-3 z-40 hidden flex-col gap-3 lg:flex"
        style={{ top: "calc(var(--topbar-h, 76px) + 6px)" }}
      >
        <Legend />
      </div>

      {/* Critical alert strip */}
      {hasCritical ? (
        <div
          className="fixed left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 lg:hidden"
          style={{ top: "calc(var(--topbar-h, 76px) + 6px)" }}
        >
          <div
            className="flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 animate-fade-in"
            style={{
              background: `linear-gradient(135deg, ${TIER_META.CRITICAL.color}18, ${TIER_META.CRITICAL.color}0a)`,
              borderColor: `${TIER_META.CRITICAL.color}50`,
              boxShadow: `0 4px 24px -6px ${TIER_META.CRITICAL.glow}`,
            }}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: TIER_META.CRITICAL.color }}
              />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{ background: TIER_META.CRITICAL.color }}
              />
            </span>
            <p className="flex-1 text-[11.5px] font-bold" style={{ color: TIER_META.CRITICAL.color }}>
              {criticalZones.length} critical zone{criticalZones.length > 1 ? "s" : ""} — avoid these areas
              {publishedCount != null && publishedCount > 0 ? (
                <span className="ml-1.5 text-amber-300">{publishedCount} alert{publishedCount > 1 ? "s" : ""}</span>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      {/* Active public alerts badge (when no critical zones to avoid overlap) */}
      {!hasCritical && publishedCount != null && publishedCount > 0 ? (
        <div
          className="fixed left-1/2 z-40 flex w-max -translate-x-1/2 items-center gap-2 rounded-2xl border border-amber-400/40 bg-[#150f06]/90 px-4 py-2 backdrop-blur-xl animate-fade-in"
          style={{ top: "calc(var(--topbar-h, 76px) + 6px)" }}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          <span className="text-[11.5px] font-bold text-amber-200">
            {publishedCount} active public alert{publishedCount > 1 ? "s" : ""}
          </span>
        </div>
      ) : null}

      {/* Zone quick-bar — bottom carousel bridging the rain simulator on the left; locate + report on the same row */}
      {effectiveZones.length > 0 && !selectedId ? (
        <div className="fixed bottom-4 left-[17.5rem] right-4 z-40 flex sm:bottom-6 sm:right-6">
          <div className="flex w-full items-center justify-end gap-2">
            <button
              onClick={() => scrollCards(-1)}
              aria-label="Previous underpass risk card"
              title="Previous"
              className="glass hidden lg:grid h-11 w-11 shrink-0 place-items-center rounded-full border text-white/70 transition-all duration-200 hover:scale-105 hover:text-white active:scale-95"
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div
              ref={carouselRef}
              className="no-scrollbar hidden lg:flex min-w-0 flex-1 items-stretch gap-2.5 overflow-x-auto rounded-2xl py-1"
            >
            {effectiveZones.map((z) => {
              const meta = TIER_META[z.tier];
              return (
                <button
                  key={z.id}
                  onClick={() => selectZone(z.id)}
                  className="glass shrink-0 flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-left transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                  style={{ borderColor: `${meta.color}40` }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-xs font-bold tabular-nums"
                    style={{
                      color: meta.color,
                      borderColor: `${meta.color}50`,
                      background: `${meta.color}15`,
                      boxShadow: z.risk >= 75 ? `0 0 14px -2px ${meta.color}60` : undefined,
                    }}
                  >
                    {z.risk}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] font-bold text-white leading-tight">
                      {z.name}
                    </p>
                    <p className="text-[9px] font-semibold" style={{ color: meta.color }}>
                      {meta.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => scrollCards(1)}
            aria-label="Next underpass risk card"
            title="Next"
            className="glass hidden lg:grid h-11 w-11 shrink-0 place-items-center rounded-full border text-white/70 transition-all duration-200 hover:scale-105 hover:text-white active:scale-95"
            style={{ borderColor: "rgba(255,255,255,0.12)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            </button>

            {/* report — to the right of the carousel, with breathing room */}
            <button
              onClick={() => openReport(null)}
              className="btn-static ml-3 flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                className="h-5 w-5"
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              <span className="hidden text-sm font-bold sm:inline">
                {translate(lang, "nav.report")}
              </span>
            </button>

            {/* locate — to the right of the report button */}
            <button
              onClick={onLocate}
              aria-label={translate(lang, "map.locate")}
              title="Show my location"
              className="glass grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent, #00b4d8)"
                strokeWidth="2.2"
                className="h-5 w-5"
              >
                <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {/* Rain simulator — bottom-left panel; left-aligned exactly with the legend column */}
      <div className="fixed bottom-4 left-3 z-40 sm:bottom-6 sm:left-3">
        <RainSimulator />
      </div>

      {/* Error state */}
      {zonesError ? (
        <div
          className="absolute inset-0 z-30 grid place-items-center p-6"
          style={{ background: "rgba(3,11,26,0.7)" }}
        >
          <div className="glass-strong w-full max-w-sm rounded-3xl p-6 text-center">
            <div
              className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl border border-red-400/30 bg-red-400/10"
              style={{ color: "#ef476f" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
                <path
                  d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm font-bold text-white">{translate(lang, "map.empty")}</p>
            <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              {zonesError}
            </p>
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
