"use client";

/**
 * Shared per-report card used by BOTH the citizen ZoneSheet "Live reports" and
 * the ops ZoneReportMenu drill-down, so verified citizen submissions look
 * identical in the two surfaces. Visual-only — the ops "Resolve" button is
 * wired in only where an `onResolve` handler is supplied.
 */
import type { Report } from "@aquashield/types";
import { translate, type Lang } from "@/lib/i18n";
import { clockTime } from "@/lib/format";

const STATUS_STYLE: Record<Report["status"], string> = {
  verified: "border-emerald-400/35 bg-emerald-400/12 text-emerald-300",
  unverified: "border-amber-400/35 bg-amber-400/12 text-amber-300",
  rejected: "border-rose-400/35 bg-rose-400/12 text-rose-300",
  needs_review: "border-sky-400/35 bg-sky-400/12 text-sky-300",
  resolved: "border-white/20 bg-white/5 text-white/40",
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
    case "resolved":
      return "zone.resolved";
  }
}

export function ReportCard({
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
