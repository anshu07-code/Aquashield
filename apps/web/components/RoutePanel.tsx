"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useApp } from "@/lib/store";
import { translate } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/Feedback";
import type { LatLng, RouteOption } from "@aquashield/types";

const DEFAULT_ORIGIN: LatLng = { lat: 28.61, lng: 77.2 }; // Central Delhi

export function RoutePanel() {
  const {
    lang,
    routeOpen,
    closeRoute,
    routes,
    routeLoading,
    routeError,
    selectedRouteId,
    setSelectedRouteId,
    routeDestination,
    findRoutes,
    userLocation,
    zones,
  } = useApp();

  const [origin, setOrigin] = useState<LatLng>(userLocation ?? DEFAULT_ORIGIN);
  const [usingMyLocation, setUsingMyLocation] = useState(!!userLocation);
  const [dest, setDest] = useState<LatLng | null>(routeDestination);

  // sync from the zone sheet
  useEffect(() => {
    if (routeDestination) setDest(routeDestination);
  }, [routeDestination]);

  useEffect(() => {
    if (userLocation && usingMyLocation) setOrigin(userLocation);
  }, [userLocation, usingMyLocation]);

  // auto-run when opened from the zone sheet
  useEffect(() => {
    if (routeOpen && dest && !routes && !routeLoading && !routeError) {
      findRoutes(origin, dest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOpen, dest]);

  const destName = useMemo(() => {
    const z = zones.find((x) => x.lat === dest?.lat && x.lng === dest?.lng);
    return z?.name ?? translate(lang, "route.selectZone");
  }, [zones, dest, lang]);

  if (!routeOpen) return null;

  const onFind = () => {
    if (!dest) return;
    findRoutes(origin, dest);
  };

  return (
    <div
      className="glass-strong fixed inset-x-0 bottom-0 z-[70] flex max-h-[86vh] flex-col overflow-hidden rounded-t-[2rem] shadow-sheet animate-sheet-up
                 md:inset-y-0 md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[440px] md:animate-fade-in md:rounded-l-3xl md:rounded-tr-none md:shadow-glow"
      role="dialog"
      aria-modal="true"
      aria-label={translate(lang, "route.title")}
    >
      <div className="flex shrink-0 justify-center pt-2.5 md:pt-0">
        <span className="h-1.5 w-12 rounded-full bg-white/20" />
      </div>

      {/* header */}
      <div className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-3 md:px-6 md:pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold leading-tight tracking-tight text-white md:text-2xl">
            {translate(lang, "route.title")}
          </h2>
          <p className="mt-1 text-[11px] text-white/40">
            {translate(lang, "app.city")}
          </p>
        </div>
        <button
          onClick={closeRoute}
          aria-label="Close"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/55 transition hover:bg-white/12 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} className="h-4 w-4">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 pb-6 md:px-6">
        {/* origin / destination */}
        <div className="card space-y-3 p-4">
          <div>
            <span className="label">{translate(lang, "route.from")}</span>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sky-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
                    <circle cx="12" cy="10" r="3" />
                    <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
                  </svg>
                </span>
                <input
                  readOnly
                  value={usingMyLocation ? translate(lang, "route.fromMe") : "Central Delhi"}
                  className="input pl-9"
                  aria-label={translate(lang, "route.from")}
                />
              </div>
              <button
                onClick={() => {
                  if (userLocation) {
                    setOrigin(userLocation);
                    setUsingMyLocation(true);
                  }
                }}
                className={`btn-ghost shrink-0 px-3 text-xs ${!userLocation ? "opacity-50" : ""}`}
                disabled={!userLocation}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">{translate(lang, "route.fromMe")}</span>
              </button>
            </div>
          </div>

          <div>
            <span className="label">{translate(lang, "route.to")}</span>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rose-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
                    <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
                  </svg>
                </span>
                <input
                  readOnly
                  value={dest ? destName : translate(lang, "route.toPh")}
                  className="input pl-9"
                  aria-label={translate(lang, "route.to")}
                />
              </div>
            </div>
          </div>

          {/* destination chips */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {zones.map((z) => {
              const active = dest?.lat === z.lat && dest?.lng === z.lng;
              return (
                <button
                  key={z.id}
                  onClick={() => setDest({ lat: z.lat, lng: z.lng })}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                    active
                      ? "border-aqua-400/60 bg-aqua-400/15 text-aqua-200"
                      : "border-white/10 bg-white/[0.05] text-white/60 hover:text-white"
                  }`}
                >
                  {z.name}
                </button>
              );
            })}
          </div>

          <button
            onClick={onFind}
            disabled={!dest || routeLoading}
            className="btn-primary w-full"
          >
            {routeLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                {translate(lang, "route.finding")}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.6-3.6" strokeLinecap="round" />
                </svg>
                {translate(lang, "route.find")}
              </>
            )}
          </button>
        </div>

        {/* results */}
        {routeError ? (
          <ErrorState message={routeError} onRetry={onFind} />
        ) : routeLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : routes && routes.length > 0 ? (
          <div className="space-y-3">
            {routes.map((r) => (
              <RouteCard
                key={r.id}
                route={r}
                selected={r.id === selectedRouteId}
                onSelect={() => setSelectedRouteId(r.id)}
                lang={lang}
              />
            ))}
          </div>
        ) : (
          <EmptyState title={translate(lang, "route.empty")} />
        )}
      </div>
    </div>
  );
}

function RouteCard({
  route,
  selected,
  onSelect,
  lang,
}: {
  route: RouteOption;
  selected: boolean;
  onSelect: () => void;
  lang: "en" | "hi";
}) {
  const rec = route.recommended;
  const unsafe = route.unsafe;
  const accent = unsafe ? TIER_META.CRITICAL.color : rec ? "#22d3ee" : "#8ea3c4";

  const openInMaps = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const a = route.geometry[0];
    const b = route.geometry[route.geometry.length - 1];
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${a[1]},${a[0]}&destination=${b[1]},${b[0]}&travelmode=driving`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <button
      onClick={onSelect}
      className={`card relative w-full overflow-hidden p-4 text-left transition-all duration-300 ${
        selected ? "border-aqua-400/50 bg-aqua-400/[0.07]" : "hover:border-white/20"
      }`}
      style={selected ? { boxShadow: `0 0 0 1px ${accent}55, 0 10px 30px -12px ${accent}40` } : undefined}
    >
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: accent, opacity: selected ? 1 : 0.45 }}
      />
      <div className="flex items-center gap-2.5">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border"
          style={{ borderColor: `${accent}45`, background: `${accent}1c`, color: accent }}
        >
          {unsafe ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
              <path d="M12 9v4m0 4h.01" strokeLinecap="round" />
              <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ borderColor: `${accent}45`, background: `${accent}1c`, color: accent }}
            >
              {unsafe ? translate(lang, "route.unsafe") : rec ? translate(lang, "route.recommended") : "Alternative"}
            </span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/60">{route.summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-2xl font-bold leading-none" style={{ color: accent }}>
            {Math.round(route.durationMin)}
            <span className="ml-0.5 text-[10px] font-semibold text-white/40">
              {translate(lang, "route.min")}
            </span>
          </p>
          <p className="mt-1 text-[10px] tabular-nums text-white/40">
            {route.distanceKm.toFixed(1)} {translate(lang, "route.km")}
          </p>
        </div>
      </div>

      {route.hazards.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {route.hazards.map((h, i) => {
            const meta = TIER_META[h.tier];
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{ borderColor: `${meta.color}40`, background: meta.soft, color: meta.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                {h.name}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3 w-3">
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {translate(lang, "route.avoids")}
        </div>
      )}

      {selected ? (
        <div
          onClick={openInMaps}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") openInMaps(e);
          }}
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-aqua-300 transition hover:text-aqua-200"
        >
          {translate(lang, "route.open")}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} className="h-3 w-3">
            <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : null}
    </button>
  );
}
