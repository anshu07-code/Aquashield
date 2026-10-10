"use client";

/**
 * Per-zone drill-down added to the "Risk per zone" bar chart.
 * Clicking a zone bar opens a small menu: Reports · Alerts.
 * Reports splits into Active (live citizen submissions, AI-verified,
 * with the uploaded photo) and Past (resolved).
 *
 * Honest note: the backend has no "resolve report" endpoint, so resolution
 * is tracked client-side in localStorage — it's real UI state on real data,
 * not faked numbers. Alerts have no list endpoint yet, so that pane is a
 * labelled placeholder (per team decision).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Report, ZoneSummary } from "@aquashield/types";
import { fetchZoneReports } from "@/lib/api";
import { translate, type Lang } from "@/lib/i18n";
import { clockTime } from "@/lib/format";

const LS_KEY = (zoneId: string) => `aq.ops.resolved.${zoneId}`;

type View = "root" | "reports" | "alerts" | "active" | "past";

function readResolved(zoneId: string): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY(zoneId));
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

function writeResolved(zoneId: string, ids: string[]) {
  try {
    localStorage.setItem(LS_KEY(zoneId), JSON.stringify(ids));
  } catch {
    // storage full / private mode — resolution stays in-memory for the session
  }
}

const STATUS_STYLE: Record<Report["status"], string> = {
  verified: "border-emerald-400/35 bg-emerald-400/12 text-emerald-300",
  unverified: "border-amber-400/35 bg-amber-400/12 text-amber-300",
  rejected: "border-rose-400/35 bg-rose-400/12 text-rose-300",
  needs_review: "border-sky-400/35 bg-sky-400/12 text-sky-300",
};

function statusKey(s: Report["status"]) {
  switch (s) {
    case "verified":
      return "zone.verified";
    case "unverified":
      return "zone.unverified";
    case "rejected":
      return "zone.rejected";
    case "needs_review":
      return "zone.needsReview";
  }
}

function BackButton({ lang, onClick }: { lang: Lang; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white/45 transition hover:text-white/80"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5">
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {translate(lang, "ops.zone.back")}
    </button>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left text-[12.5px] font-semibold text-white/80 transition hover:bg-white/[0.07] hover:text-white"
      style={accent ? { borderColor: `${accent}40`, color: accent } : undefined}
    >
      {icon}
      <span className="flex-1">{label}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5 opacity-50">
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2.5 py-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton h-14 w-20 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2 py-1.5">
            <div className="skeleton h-3 w-2/3 rounded-full" />
            <div className="skeleton h-3 w-1/3 rounded-full" />
            <div className="skeleton h-4 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportCard({
  report,
  resolved,
  onResolve,
  lang,
}: {
  report: Report;
  resolved: boolean;
  onResolve?: (r: Report) => void;
  lang: Lang;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
      <div className="flex gap-3">
        {report.imageUrl ? (
          <a href={report.imageUrl} target="_blank" rel="noreferrer" className="block shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.imageUrl}
              alt={translate(lang, `report.type.${report.type}`)}
              className="h-16 w-24 rounded-xl object-cover ring-1 ring-white/10 transition hover:ring-white/25"
            />
          </a>
        ) : (
          <div className="grid h-16 w-24 shrink-0 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 text-white/25">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="1.8" />
              <path d="M3 17l5-5 4 4 2-2 4 5" strokeLinecap="round" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[report.status]}`}
            >
              {translate(lang, statusKey(report.status))}
            </span>
            <span className="text-[10px] font-semibold text-white/45">
              {translate(lang, `report.type.${report.type}`)}
            </span>
            <span className="ml-auto text-[10px] tabular-nums text-white/35">{clockTime(report.ts)}</span>
          </div>
          {report.vision.waterDepthTier !== "none" ? (
            <p className="mt-1 text-[11.5px] font-medium text-white/80">
              {translate(lang, "report.depth")}:{" "}
              {translate(lang, `depth.${report.vision.waterDepthTier}`)}
              {report.vision.confidence ? ` · ${Math.round(report.vision.confidence * 100)}%` : ""}
            </p>
          ) : null}
          {report.note ? (
            <p className="truncate text-[11px] text-white/50" title={report.note}>
              {report.note}
            </p>
          ) : (
            <p className="truncate text-[11px] italic text-white/35">{report.vision.explanation}</p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Trust</span>
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300"
                style={{ width: `${Math.round(report.trust * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold tabular-nums text-emerald-300">
              {Math.round(report.trust * 100)}%
            </span>
            {!resolved && onResolve ? (
              <button
                onClick={() => onResolve(report)}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-aqua-400/40 bg-aqua-400/10 px-2.5 py-1 text-[10px] font-bold text-aqua-300 transition hover:bg-aqua-400/20"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3 w-3">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {translate(lang, "ops.zone.resolve")}
              </button>
            ) : resolved ? (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3 w-3">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {translate(lang, "ops.zone.resolved")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ZoneReportMenu({ zone, lang }: { zone: ZoneSummary; lang: Lang }) {
  const [view, setView] = useState<View>("root");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<string[]>(() => readResolved(zone.id));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchZoneReports(zone.id);
      setReports(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [zone.id]);

  // fetch live reports lazily the first time the Reports pane is opened
  useEffect(() => {
    if ((view === "active" || view === "past") && !reports && !loading) load();
  }, [view, reports, loading, load]);

  const active = useMemo(
    () => (reports ?? []).filter((r) => !resolvedIds.includes(r.id) && r.status !== "rejected"),
    [reports, resolvedIds],
  );
  const resolved = useMemo(
    () => (reports ?? []).filter((r) => resolvedIds.includes(r.id)),
    [reports, resolvedIds],
  );

  const handleResolve = (r: Report) => {
    setResolvedIds((prev) => {
      const next = prev.includes(r.id) ? prev : [...prev, r.id];
      writeResolved(zone.id, next);
      return next;
    });
  };

  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3">
      {view === "root" && (
        <div className="space-y-2">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/45">{zone.name}</p>
          <MenuButton
            label={translate(lang, "ops.zone.reports")}
            accent="#67e8f9"
            onClick={() => setView("reports")}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6M4 21h16M9 8h6M9 12h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <MenuButton
            label={translate(lang, "ops.zone.alerts")}
            accent="#fbbf24"
            onClick={() => setView("alerts")}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" />
                <path d="M10 18h4M10.5 21h3" strokeLinecap="round" />
              </svg>
            }
          />
        </div>
      )}

      {view === "reports" && (
        <div>
          <BackButton lang={lang} onClick={() => setView("root")} />
          <p className="mb-1 text-[10.5px] text-white/40">{translate(lang, "ops.zone.reports.help")}</p>
          <div className="mt-2 space-y-2">
            <MenuButton
              label={translate(lang, "ops.zone.active")}
              accent="#2dd4a7"
              onClick={() => setView("active")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <MenuButton
              label={translate(lang, "ops.zone.past")}
              accent="#94a3b8"
              onClick={() => setView("past")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 4v4h4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        </div>
      )}

      {view === "active" && (
        <div>
          <BackButton lang={lang} onClick={() => setView("reports")} />
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/50">
              {translate(lang, "ops.zone.active")}
            </p>
            {!loading && reports ? (
              <button
                onClick={load}
                className="text-[10px] font-semibold text-aqua-300 transition hover:text-aqua-200"
              >
                ↻
              </button>
            ) : null}
          </div>
          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-500/5 px-3 py-3 text-center">
              <p className="text-[11px] text-red-300/80">{translate(lang, "ops.error")}</p>
              <p className="mt-1 break-all text-[9px] text-white/30">{error}</p>
            </div>
          ) : active.length === 0 ? (
            <p className="py-3 text-center text-[11.5px] text-white/40">
              {translate(lang, "ops.zone.noActive")}
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {active.map((r) => (
                <ReportCard key={r.id} report={r} resolved={false} onResolve={handleResolve} lang={lang} />
              ))}
            </div>
          )}
        </div>
      )}

      {view === "past" && (
        <div>
          <BackButton lang={lang} onClick={() => setView("reports")} />
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/50">
              {translate(lang, "ops.zone.past")}
            </p>
          </div>
          {resolved.length === 0 ? (
            <p className="py-3 text-center text-[11.5px] text-white/40">
              {translate(lang, "ops.zone.noPast")}
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {resolved.map((r) => (
                <ReportCard key={r.id} report={r} resolved onResolve={undefined} lang={lang} />
              ))}
            </div>
          )}
        </div>
      )}

      {view === "alerts" && (
        <div>
          <BackButton lang={lang} onClick={() => setView("root")} />
          <div className="grid place-items-center gap-1.5 py-4 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6 text-white/20">
              <path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" />
              <path d="M10 18h4M10.5 21h3" strokeLinecap="round" />
            </svg>
            <p className="text-xs font-semibold text-white/60">{translate(lang, "ops.zone.alerts.coming")}</p>
            <p className="max-w-[16rem] text-[10.5px] text-white/35">{translate(lang, "ops.zone.alerts.coming.sub")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
