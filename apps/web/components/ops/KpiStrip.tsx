"use client";

import type { Report, WorkOrder, ZoneSummary } from "@aquashield/types";
import { TIER_META } from "@/lib/tiers";
import { translate, type Lang, type TKey } from "@/lib/i18n";

export function KpiStrip({
  zones,
  workOrders,
  reports,
  reportsLoading,
  lang,
  lastSyncedAt,
}: {
  zones: ZoneSummary[];
  workOrders: WorkOrder[];
  reports: Report[];
  reportsLoading: boolean;
  lang: Lang;
  lastSyncedAt: number | null;
}) {
  const critical = zones.filter((z) => z.tier === "CRITICAL").length;
  const high = zones.filter((z) => z.tier === "HIGH").length;
  const open = workOrders.filter((w) => w.status === "open").length;
  const activeReports = reports.filter((r) => r.status !== "rejected" && r.status !== "resolved").length;

  const items: {
    key: TKey;
    value: number;
    color: string;
    soft: string;
    icon: string;
    pulse: boolean;
  }[] = [
    {
      key: "ops.kpi.critical",
      value: critical,
      color: TIER_META.CRITICAL.color,
      soft: TIER_META.CRITICAL.soft,
      icon: "M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
      pulse: critical > 0,
    },
    {
      key: "ops.kpi.high",
      value: high,
      color: TIER_META.HIGH.color,
      soft: TIER_META.HIGH.soft,
      icon: "M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3ZM10 18h4",
      pulse: false,
    },
    {
      key: "ops.kpi.open",
      value: open,
      color: "#38bdf8",
      soft: "rgba(56,189,248,.13)",
      icon: "M8 4h9a3 3 0 0 1 3 3v13H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 9h8M8 13h5",
      pulse: open > 0,
    },
    {
      key: "ops.kpi.reports",
      value: activeReports,
      color: TIER_META.WATCH.color,
      soft: TIER_META.WATCH.soft,
      icon: "M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z",
      pulse: activeReports > 0,
    },
  ];

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-white/60">
          <span className="relative flex h-1.5 w-1.5">
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          {translate(lang, "ops.kpi.live")}
          {lastSyncedAt ? (
            <span className="text-white/35 tabular-nums">· {new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          ) : null}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((it) => (
          <div
            key={it.key}
            className="card relative overflow-hidden p-4"
            style={{ background: `linear-gradient(180deg, ${it.soft}, rgba(255,255,255,.03))` }}
          >
            <div className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-xl border"
                style={{ borderColor: `${it.color}40`, background: `${it.color}1a`, color: it.color }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path d={it.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/50">
                {translate(lang, it.key)}
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              {it.key === "ops.kpi.reports" && reportsLoading ? (
                <div className="skeleton mb-0.5 h-7 w-10 rounded-lg" />
              ) : (
                <span className="font-display text-3xl font-bold tabular-nums" style={{ color: it.color }}>
                  {it.value}
                </span>
              )}
              {it.pulse ? (
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                    style={{ background: it.color }}
                  />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: it.color }} />
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
