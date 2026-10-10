"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { translate } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { askAgent, ApiError } from "@/lib/api";
import type { AgentPlan, LatLng, RouteOption, ZoneSummary } from "@aquashield/types";

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

  const [tab, setTab] = useState<"route" | "ask">("route");
  const [origin, setOrigin] = useState<LatLng>(userLocation ?? DEFAULT_ORIGIN);
  const [usingMyLocation, setUsingMyLocation] = useState(!!userLocation);
  const [dest, setDest] = useState<LatLng | null>(routeDestination);
  const [originText, setOriginText] = useState(usingMyLocation ? translate(lang, "route.fromMe") : translate(lang, "route.fromCentral"));
  const [originDropdown, setOriginDropdown] = useState(false);
  const originRef = useRef<HTMLInputElement>(null);

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

  // reset tab when panel opens
  useEffect(() => {
    if (routeOpen) setTab("route");
  }, [routeOpen]);

  const destName = useMemo(() => {
    const z = zones.find((x) => x.lat === dest?.lat && x.lng === dest?.lng);
    return z?.name ?? translate(lang, "route.selectZone");
  }, [zones, dest, lang]);

  const selectOrigin = (zone: ZoneSummary) => {
    setOrigin({ lat: zone.lat, lng: zone.lng });
    setOriginText(zone.name);
    setUsingMyLocation(false);
    setOriginDropdown(false);
  };

  const useMyLocationOrigin = () => {
    if (userLocation) {
      setOrigin(userLocation);
      setOriginText(translate(lang, "route.fromMe"));
      setUsingMyLocation(true);
    }
    setOriginDropdown(false);
  };

  const onFind = () => {
    if (!dest) return;
    findRoutes(origin, dest);
  };

  if (!routeOpen) return null;

  return (
    <div
      className="glass-strong fixed inset-x-0 bottom-0 z-[70] flex max-h-[86vh] flex-col overflow-hidden rounded-t-[2rem] shadow-sheet animate-sheet-up
                 md:inset-y-0 md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[440px] md:animate-fade-in md:rounded-l-3xl md:rounded-tr-none md:shadow-glow"
      role="dialog"
      aria-modal="true"
      aria-label={translate(lang, "route.title")}
    >
      <div className="shrink-0">
        <div className="flex justify-center pt-2.5 md:pt-0">
          <span className="h-1.5 w-12 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center gap-2 px-4 pb-2 md:px-6 md:pt-4">
          <button
            onClick={closeRoute}
            aria-label="Go back"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/55 transition hover:bg-white/12 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} className="h-4 w-4">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <h2 className="font-display text-lg font-bold leading-tight tracking-tight text-white md:text-xl">
            {tab === "route" ? translate(lang, "route.title") : translate(lang, "route.askTab")}
          </h2>

          <div className="ml-auto flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] p-0.5">
            <button
              onClick={() => setTab("route")}
              className={"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition " + (tab === "route" ? "bg-[var(--surface-3)] text-white shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text-2)]")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path d="M6 3v12a3 3 0 0 0 3 3h6m3 3 3-3-3-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {translate(lang, "route.title")}
            </button>
            <button
              onClick={() => setTab("ask")}
              className={"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition " + (tab === "ask" ? "bg-[var(--surface-3)] text-white shadow-sm" : "text-[var(--text-3)] hover:text-[var(--text-2)]")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" />
                <path d="M10 18h4M10.5 21h3" strokeLinecap="round" />
              </svg>
              {translate(lang, "route.askTab")}
            </button>
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
      </div>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 pb-6 md:px-6">
        {tab === "route" ? (
          <>
            <div className="card space-y-3 p-4">
              {/* editable FROM */}
              <div>
                <span className="label">{translate(lang, "route.from")}</span>
                <div className="mt-1.5 relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sky-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
                      <circle cx="12" cy="10" r="3" />
                      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
                    </svg>
                  </span>
                  <input
                    ref={originRef}
                    value={originText}
                    onChange={(e) => { setOriginText(e.target.value); setOriginDropdown(true); setUsingMyLocation(false); }}
                    onFocus={() => setOriginDropdown(true)}
                    onBlur={() => setTimeout(() => setOriginDropdown(false), 200)}
                    className="input pl-9 pr-9"
                    aria-label={translate(lang, "route.from")}
                    placeholder={translate(lang, "route.fromHint")}
                  />
                  <button
                    onClick={useMyLocationOrigin}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-300 transition"
                    aria-label={translate(lang, "route.fromMe")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" strokeLinecap="round" />
                    </svg>
                  </button>
                  {originDropdown && (
                    <div className="absolute left-0 right-0 z-50 mt-1 rounded-2xl border border-white/12 bg-[var(--surface)] py-1.5 shadow-glow max-h-52 overflow-y-auto">
                      <button
                        onMouseDown={useMyLocationOrigin}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-sky-300 hover:bg-white/[0.07] transition"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4 shrink-0">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" strokeLinecap="round" />
                        </svg>
                        {translate(lang, "route.fromMe")}
                      </button>
                      {zones.map((z) => (
                        <button
                          key={z.id}
                          onMouseDown={() => selectOrigin(z)}
                          className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-white/75 hover:bg-white/[0.07] transition"
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TIER_META[z.tier].color }} />
                          <span className="truncate">{z.name}</span>
                          <span className="ml-auto text-[10px] text-white/35">{z.risk}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* TO (read-only) */}
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
                      className={"shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition " + (active ? "border-aqua-400/60 bg-aqua-400/15 text-aqua-200" : "border-white/10 bg-white/[0.05] text-white/60 hover:text-white")}
                    >
                      {z.name}
                    </button>
                  );
                })}
              </div>

              <button onClick={onFind} disabled={!dest || routeLoading} className="btn-primary w-full">
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
          </>
        ) : (
          <AskWidget destName={destName} dest={dest} zones={zones} lang={lang} />
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

      {selected && route.steps && route.steps.length > 0 ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2.5 text-left">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3 w-3">
              <path d="M4 5h11m0 0-3-3m3 3-3 3M4 12h7m0 0-3-3m3 3-3 3M4 19h11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {translate(lang, "route.directions")}
          </p>
          <ol className="space-y-2">
            {route.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <StepIcon maneuver={s.maneuver} modifier={s.instruction} />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line text-[12px] leading-snug text-white/85">{s.instruction}</p>
                  <p className="mt-0.5 text-[10px] tabular-nums text-white/35">
                    {s.distance >= 1000
                      ? `${(s.distance / 1000).toFixed(1)} ${translate(lang, "route.km")}`
                      : `${s.distance} ${translate(lang, "route.metres")}`}
                  </p>
                </div>
                {i === 0 ? (
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-emerald-300/80">
                    {translate(lang, "route.start")}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

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

function StepIcon({ maneuver, modifier }: { maneuver: string; modifier: string }) {
  const m = maneuver.toLowerCase();
  const mod = modifier.toLowerCase();
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.3, className: "mt-0.5 h-4 w-4 shrink-0 text-white/55" } as const;

  if (m === "depart") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M6 5h12M6 5l4-3m-4 3 4 3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 12v7M12 19l-2.5-2.5M12 19l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (m === "arrive") return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M19 17a8 8 0 0 0-8-8c-1 0-2 .2-2.8.5L4 6l-1 6 5 1.5-.2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 21a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" strokeLinejoin="round" />
    </svg>
  );
  if (m === "roundabout" || m === "rotary") return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M12 3a5 5 0 1 0 5 5" strokeLinecap="round" />
      <path d="M22 8h-5m5 0-5-4m5 4-5 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (m === "continue" || m === "end of road") return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M12 3v18M12 3l-4 4M12 3l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (mod.includes("left") && mod.includes("slight")) return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M20 18c0-4-3-6-7-6H4" strokeLinecap="round" />
      <path d="M4 12l4-3m-4 3 4 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (mod.includes("right") && mod.includes("slight")) return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M4 18c0-4 3-6 7-6h9" strokeLinecap="round" />
      <path d="M20 12l-4-3m4 3-4 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (mod.includes("left")) return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M20 19c0-6-4-9-9-9H4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 10l4-4M4 10l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (mod.includes("right")) return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M4 19c0-6 4-9 9-9h7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 10l-4-4m4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (m === "merge") return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M4 19c0-4 5-5 6-8M4 19c11 0 7-7 8-11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3v5" strokeLinecap="round" />
    </svg>
  );

  return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M12 3v18M12 3l-3 3M12 3l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- inline Ask widget (ask-only; execute in /ops) ----------
function AskWidget({ destName, dest, zones, lang }: { destName: string; dest: LatLng | null; zones: ZoneSummary[]; lang: "en" | "hi"; }) {
  const toast = useToast();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const destZone = zones.find((z) => z.lat === dest?.lat && z.lng === dest?.lng);

  const SUGGESTIONS = destZone
    ? [
        "What is the flood risk at " + destZone.name + " right now?",
        "Show me the forecast for " + destZone.name + " in the next 3 hours.",
        "What actions should we take for " + destZone.name + "?",
      ]
    : [
        "What is the worst hotspot in Delhi right now?",
        "Which zones will go critical in the next hour?",
        "Show me a summary of all flood zones.",
      ];

  const ask = async () => {
    const q = question.trim() || SUGGESTIONS[0];
    setLoading(true); setError(null);
    try {
      const result = await askAgent({ question: q, zoneId: destZone?.id, lang, execute: false });
      setPlan(result);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Agent request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {destZone && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <span className="chip" style={{ color: TIER_META[destZone.tier].color, borderColor: TIER_META[destZone.tier].color + "40", background: TIER_META[destZone.tier].soft }}>
            {destZone.tier}
          </span>
          <span className="text-sm font-semibold text-white">{destZone.name}</span>
          <span className="text-xs text-white/40">risk {destZone.risk}/100</span>
        </div>
      )}

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
        placeholder={translate(lang, "route.askTabPh")}
        rows={3}
        className="input resize-none"
      />

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setQuestion(s)}
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10.5px] font-medium text-white/55 transition hover:border-aqua-400/40 hover:text-aqua-200"
          >
            {s.length > 45 ? s.slice(0, 45) + "..." : s}
          </button>
        ))}
      </div>

      <button onClick={ask} disabled={loading} className="btn-primary w-full">
        {loading ? (
          <><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />Thinking…</>
        ) : (
          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" /></svg>{translate(lang, "route.askTab")}</>
        )}
      </button>

      {error && <p className="text-[11.5px] font-medium text-rose-300">{error}</p>}

      {loading && !plan && (
        <div className="flex flex-col items-center gap-3 py-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2.5 w-2.5 animate-bounce rounded-full bg-aqua-400" style={{ animationDelay: i * 160 + "ms" }} />
            ))}
          </div>
          <p className="text-[11px] font-medium text-white/45">Analysing zones, forecast and reports…</p>
        </div>
      )}

      {plan && (
        <div className="animate-fade-in space-y-3 rounded-2xl border border-aqua-400/25 bg-aqua-400/[0.06] p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-aqua-400/35 bg-aqua-400/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-aqua-200">
              AI Summary
            </span>
            <span className="text-[10px] text-white/40">{plan.toolsUsed.length} tools used</span>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-white/90">{plan.summary}</p>
          {plan.actions.length > 0 && (
            <div className="space-y-1.5">
              {plan.actions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-[11.5px] text-white/65">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-400" />
                  <span><span className="font-bold text-white/85">{a.type.replace(/_/g, " ")}</span>: {a.reason}</span>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <span className="label">Draft alert (EN)</span>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/70">{plan.alertDraft.en}</p>
          </div>
          <p className="text-center text-[10px] text-white/30">{translate(lang, "route.askResult")}</p>
        </div>
      )}
    </div>
  );
}
