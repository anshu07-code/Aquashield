"use client";

import { useState } from "react";
import type { WorkOrder } from "@aquashield/types";
import { translate, type Lang, type TKey } from "@/lib/i18n";
import { clockTime } from "@/lib/format";

const COLUMNS: { status: WorkOrder["status"]; key: TKey; accent: string }[] = [
  { status: "open", key: "ops.board.open", accent: "#fb4d63" },
  { status: "dispatched", key: "ops.board.dispatched", accent: "#fbbf24" },
  { status: "resolved", key: "ops.board.resolved", accent: "#2dd4a7" },
];

const ACTION_LABELS: Record<string, string> = {
  pump_dispatch: "Pump dispatch",
  drain_cleaning: "Drain cleaning",
  barricade: "Barricade",
  traffic_diversion: "Traffic diversion",
  public_alert: "Public alert",
  monitor: "Monitor",
};

const PRIORITY_STYLE: Record<string, string> = {
  P1: "border-rose-400/40 bg-rose-400/12 text-rose-300",
  P2: "border-amber-400/40 bg-amber-400/12 text-amber-300",
  P3: "border-white/15 bg-white/[0.06] text-white/60",
};

export function WorkOrderBoard({
  lang,
  pending,
  orders,
  loading,
  error,
  onAdvance,
}: {
  lang: Lang;
  /** orders the agent created this session (not yet confirmed by a server round-trip) */
  pending: WorkOrder[];
  /** orders fetched from `GET /workorders` */
  orders: WorkOrder[];
  loading: boolean;
  error: string | null;
  /** advance a work order's status (optimistic update happens in the page) */
  onAdvance: (o: WorkOrder) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  // merge anything the agent created locally this session with server orders
  const all = [...orders, ...pending.filter((p) => !orders.some((o) => o.id === p.id))];

  const advance = (o: WorkOrder) => {
    setBusy(o.id);
    onAdvance(o);
    setTimeout(() => setBusy(null), 800);
  };

  if (loading) {
    return (
      <div className="card p-4">
        <div className="skeleton mb-3 h-5 w-40 rounded-full" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && all.length === 0) {
    return (
      <div className="card p-4">
        <div className="skeleton mb-3 h-5 w-40 rounded-full" />
        <p className="py-6 text-center text-xs text-rose-300/80">{error}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-white/8 px-4 py-3.5">
        <h3 className="text-sm font-bold text-white">{translate(lang, "ops.board")}</h3>
        <span className="text-[10.5px] font-semibold text-white/35">{all.length}</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = all.filter((o) => o.status === col.status);
          return (
            <div
              key={col.status}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-3"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/55">
                  {translate(lang, col.key)}
                </span>
                <span className="ml-auto text-[10px] font-bold tabular-nums text-white/35">
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="py-6 text-center text-[10.5px] text-white/30">
                  {translate(lang, "ops.board.empty")}
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((o) => (
                    <div
                      key={o.id}
                      className="animate-fade-in rounded-2xl border border-white/8 bg-white/[0.04] p-3"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${PRIORITY_STYLE[o.priority] ?? PRIORITY_STYLE.P3}`}
                        >
                          {o.priority}
                        </span>
                        <span className="ml-auto text-[9.5px] tabular-nums text-white/30">
                          {clockTime(o.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-white/85">
                        {ACTION_LABELS[o.type] ?? o.type}
                      </p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-white/45">{o.note}</p>
                      <p className="mt-1 text-[9.5px] font-medium text-white/30">{o.zoneId}</p>
                      {col.status !== "resolved" ? (
                        <button
                          onClick={() => advance(o)}
                          disabled={busy === o.id}
                          className="btn-outline mt-2.5 w-full py-1.5 text-[10.5px]"
                        >
                          {busy === o.id ? "…" : translate(lang, "ops.board.advance")}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
