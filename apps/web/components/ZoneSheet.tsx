"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { translate, type Lang } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";
import { clockTime, etaText, relTime } from "@/lib/format";
import { RiskGauge } from "@/components/zone/RiskGauge";
import { FactorBars } from "@/components/zone/FactorBars";
import { ForecastSpark } from "@/components/zone/ForecastSpark";
import { Skeleton, ErrorState } from "@/components/ui/Feedback";
import { fetchAlerts } from "@/lib/api";
import type { Alert } from "@aquashield/types";
import type { ReportStatus } from "@/lib/api";

const STATUS_STYLE: Record<ReportStatus, string> = {
  verified: "border-emerald-400/35 bg-emerald-400/12 text-emerald-300",
  unverified: "border-amber-400/35 bg-amber-400/12 text-amber-300",
  rejected: "border-rose-400/35 bg-rose-400/12 text-rose-300",
  needs_review: "border-sky-400/35 bg-sky-400/12 text-sky-300",
  resolved: "border-white/20 bg-white/5 text-white/40",
};

function statusKey(s: ReportStatus) {
  switch (s) {
    case "verified":
      return "zone.verified";
    case "unverified":
      return "zone.unverified";
    case "rejected":
      return "zone.rejected";
    case "needs_review":
      return "zone.needsReview";
    case "resolved":
      return "zone.resolved";
  }
}

/** Read-only "public alert" feed for the selected zone. Reads real alerts from the backend. */
function ZoneAlertCard({ zoneId, lang }: { zoneId: string; lang: Lang }) {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAlerts(null);
    setFailed(false);
    fetchAlerts({ zoneId })
      .then((a) => {
        if (!cancelled) setAlerts(a);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [zoneId]);

  // Most recent published alert wins; otherwise the most recent resolved alert (context).
  const active =
    alerts?.find((a) => a.status === "published") ??
    alerts?.find((a) => a.status === "resolved");

  if (alerts === null && !failed) {
    return <Skeleton className="h-[76px] w-full rounded-2xl" />;
  }
  if (failed) {
    return (
      <div className="card border-white/8 p-3.5">
        <span className="label">{translate(lang, "zone.alert")}</span>
        <p className="mt-1 text-[11px] text-white/40">{translate(lang, "ops.error")}</p>
      </div>
    );
  }
  if (!active) {
    return (
      <div className="card border-white/8 p-3.5">
        <span className="label">{translate(lang, "zone.alert")}</span>
        <p className="mt-1 text-[11.5px] text-white/40">{translate(lang, "zone.alert.none")}</p>
      </div>
    );
  }

  const resolved = active.status === "resolved";
  return (
    <div className={resolved ? "card border-emerald-400/25 p-4" : "card border-amber-400/40 p-4"}>
      <div className="flex items-center justify-between gap-2">
        <span className="label">{translate(lang, "zone.alert")}</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            resolved
              ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-300"
              : "border-amber-400/35 bg-amber-400/12 text-amber-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${resolved ? "bg-emerald-400" : "bg-amber-400"}`} />
          {translate(lang, resolved ? "zone.alert.resolved" : "zone.alert.published")}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold leading-snug text-white/90">
        {active.lang === "hi" || lang === "hi" ? active.text : active.text}
      </p>
      <p className="mt-1.5 text-[10.5px] text-white/40">
        {translate(lang, "zone.alert.publishedAt")}: {clockTime(active.publishedAt ?? active.createdAt)}
      </p>
    </div>
  );
}

export function ZoneSheet() {
  const {
    lang,
    selectedId,
    detail,
    detailLoading,
    detailError,
    closeZone,
    effectiveZones,
    breakdownFor,
    simActive,
    openReport,
    openRoute,
    reloadZones,
  } = useApp();

  if (!selectedId) return null;

  const zone = effectiveZones.find((z) => z.id === selectedId);
  const breakdown = breakdownFor(selectedId);
  const meta = zone ? TIER_META[zone.tier] : null;

  return (
    <div
      className="glass-strong fixed inset-x-0 bottom-0 z-[60] mt-5 mb-2 flex max-h-[83vh] flex-col overflow-hidden rounded-t-[2rem] shadow-sheet animate-sheet-up
                 md:inset-y-0 md:left-auto md:right-0 md:bottom-0 md:top-auto md:h-[83vh] md:max-h-[83vh] md:w-[430px] md:animate-fade-in md:rounded-l-3xl md:rounded-tr-none md:shadow-glow"
      role="dialog"
      aria-modal="true"
      aria-label={zone?.name ?? "Zone detail"}
    >
      {/* drag handle (mobile) */}
      <div className="flex shrink-0 justify-center pt-2.5 md:pt-0">
        <span className="h-1.5 w-12 rounded-full bg-white/20" />
      </div>

      {/* header */}
      <div className="flex shrink-0 items-start gap-3 px-5 pb-2 pt-2 md:px-4 md:pt-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {zone ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: meta!.color, borderColor: `${meta!.color}45`, background: meta!.soft }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta!.color }} />
                {lang === "hi" ? meta!.labelHi : meta!.label}
              </span>
            ) : null}
            {zone?.isUnderpass ? (
              <span className="chip">{translate(lang, "zone.underpass")}</span>
            ) : (
              <span className="chip">{translate(lang, "zone.intersection")}</span>
            )}
            {zone?.stale ? (
              <span className="chip border-amber-400/35 text-amber-300/90">{translate(lang, "map.stale")}</span>
            ) : null}
          </div>
          <h2 className="mt-2 font-display text-xl font-bold leading-tight tracking-tight text-white md:text-2xl">
            {zone?.name ?? "Zone"}
          </h2>
          {zone ? (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3 w-3">
                <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.4" />
              </svg>
              {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
              <span className="text-white/25">·</span>
              {translate(lang, "zone.updated")} {relTime(zone.updatedAt)}
            </p>
          ) : null}
        </div>
        <button
          onClick={closeZone}
          aria-label={translate(lang, "zone.close")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/55 transition hover:bg-white/12 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} className="h-4 w-4">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* body */}
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 pb-6 md:px-6">
        {detailError ? (
          <ErrorState message={detailError} onRetry={() => selectedId && reloadZones()} />
        ) : (
          <>
            {/* gauge + eta */}
            <div className="card flex items-center gap-4 p-4">
              {zone && breakdown ? (
                <RiskGauge risk={zone.risk} tier={zone.tier} sim={simActive} />
              ) : (
                <Skeleton className="h-[132px] w-[132px] rounded-full" />
              )}
              <div className="min-w-0 flex-1">
                <span className="label">{translate(lang, "zone.eta")}</span>
                {zone ? (
                  <p
                    className="font-display mt-1 text-lg font-bold leading-snug"
                    style={{ color: zone.etaMin === 0 ? TIER_META.CRITICAL.color : "#e9eff9" }}
                  >
                    {simActive && breakdown && breakdown.risk >= 75
                      ? translate(lang, "zone.simulated") + " · " + etaText(0, lang)
                      : etaText(zone.etaMin, lang)}
                  </p>
                ) : null}
                {meta ? (
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/55">
                    {lang === "hi" ? meta.adviceHi : meta.advice}
                  </p>
                ) : null}
                {simActive ? (
                  <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    {translate(lang, "map.simulation.on")}
                  </span>
                ) : null}
              </div>
            </div>

            {/* public alert (real backend) */}
            {zone ? <ZoneAlertCard zoneId={zone.id} lang={lang} /> : null}

            {/* rain stats */}
            {detail ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-3.5">
                  <span className="label">{translate(lang, "zone.rain")}</span>
                  <p className="font-display mt-1.5 text-2xl font-bold text-sky-300">
                    {detail.rain.nowMmHr}
                    <span className="ml-1 text-xs font-semibold text-white/40">mm/hr</span>
                  </p>
                </div>
                <div className="card p-3.5">
                  <span className="label">{translate(lang, "zone.rain24")}</span>
                  <p className="font-display mt-1.5 text-2xl font-bold text-white">
                    {detail.rain.last24hMm}
                    <span className="ml-1 text-xs font-semibold text-white/40">mm</span>
                  </p>
                </div>
              </div>
            ) : null}

            {/* factors */}
            <div className="card p-4">
              <div className="mb-3.5 flex items-center justify-between">
                <span className="label">{translate(lang, "zone.factors")}</span>
                {simActive ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                    {translate(lang, "zone.simulated")}
                  </span>
                ) : null}
              </div>
              {detailLoading || !breakdown ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-full" />
                  ))}
                </div>
              ) : (
                <FactorBars breakdown={breakdown} lang={lang} />
              )}
            </div>

            {/* top reasons */}
            {breakdown && breakdown.topReasons.length > 0 ? (
              <div className="card p-4">
                <span className="label">{translate(lang, "zone.reasons")}</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {breakdown.topReasons.map((r, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11.5px] font-medium text-white/75"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-aqua-400" />
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* forecast */}
            {detail && detail.forecast.length > 0 ? (
              <div className="card p-4">
                <span className="label">{translate(lang, "zone.forecast")}</span>
                <div className="mt-3">
                  <ForecastSpark points={detail.forecast} />
                </div>
              </div>
            ) : null}

            {/* reports */}
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="label">{translate(lang, "zone.reports")}</span>
                {detail ? (
                  <span className="text-[11px] font-semibold text-white/40">{detail.reports.length}</span>
                ) : null}
              </div>
              {detailLoading ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : detail && detail.reports.length > 0 ? (
                <div className="space-y-2.5">
                  {detail.reports.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[r.status]}`}
                        >
                          {translate(lang, statusKey(r.status))}
                        </span>
                        <span className="ml-auto text-[10px] tabular-nums text-white/35">
                          {clockTime(r.ts)}
                        </span>
                      </div>
                      {r.vision.waterDepthTier !== "none" ? (
                        <p className="mt-2 text-xs font-semibold text-white/85">
                          {translate(lang, "zone.risk")}: {translate(lang, `depth.${r.vision.waterDepthTier}`)}
                        </p>
                      ) : null}
                      {r.note ? <p className="mt-1 text-[11.5px] text-white/55">{r.note}</p> : null}
                      {r.vision.explanation ? (
                        <p className="mt-1 text-[11.5px] italic leading-relaxed text-white/45">
                          “{r.vision.explanation}”
                        </p>
                      ) : null}
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="label">{translate(lang, "zone.trust")}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300"
                            style={{ width: `${Math.round(r.trust * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold tabular-nums text-emerald-300">
                          {Math.round(r.trust * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-center text-[11.5px] text-white/40">
                  {translate(lang, "zone.reports.none")}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* actions */}
      <div className="shrink-0 border-t border-white/8 bg-black/25 px-5 py-3.5 md:px-6">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openReport(selectedId)}
            className="btn-primary flex-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            {translate(lang, "zone.report")}
          </button>
          <button
            onClick={() => zone && openRoute({ lat: zone.lat, lng: zone.lng })}
            className="btn-ghost flex-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
              <path d="M6 3v12a3 3 0 0 0 3 3h6m3 3 3-3-3-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {translate(lang, "zone.route")}
          </button>
          <Link
            href={{ pathname: "/ops", query: zone ? { zone: zone.id } : {} }}
            className="btn-outline"
            aria-label={translate(lang, "zone.ask")}
            title={translate(lang, "zone.ask")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
              <path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" />
              <path d="M10 18h4M10.5 21h3" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
