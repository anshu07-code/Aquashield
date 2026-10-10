"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { translate } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";
import { KpiStrip } from "@/components/ops/KpiStrip";
import { AnalyticsBoard } from "@/components/ops/AnalyticsBoard";
import { Hotspots } from "@/components/ops/Hotspots";
import { AskAgent } from "@/components/ops/AskAgent";
import { WorkOrderBoard } from "@/components/ops/WorkOrderBoard";
import { ApiError, fetchWorkOrders, fetchZoneReports, patchWorkOrder } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import type { AgentPlan, Report, WorkOrder } from "@aquashield/types";

/** Real-time polling cadence for the ops dashboard (work orders + reports). */
const OPS_POLL_MS = 30_000;

type WorkOrderStatus = WorkOrder["status"];

export default function OpsPage() {
  const { zones, reloadZones, lang } = useApp();
  const toast = useToast();
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [pending, setPending] = useState<WorkOrder[]>([]);
  const [clock, setClock] = useState("");

  // real server state, polled
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const syncInFlight = useRef(false);

  const loadOrders = useCallback(async () => {
    try {
      const list = await fetchWorkOrders(passcode);
      setOrders(list);
      setOrdersError(null);
    } catch (e) {
      setOrdersError(e instanceof ApiError ? e.message : "Failed to load work orders");
    } finally {
      setOrdersLoading(false);
    }
  }, [passcode]);

  const loadReports = useCallback(async () => {
    // Reports are fetched per-zone, so if zones aren't ready yet we must NOT
    // "succeed" with an empty list — that would render a false 0 in the KPI.
    // Keep reportsLoading=true; the zones-arrival effect re-syncs instead.
    if (zones.length === 0) return;
    try {
      const lists = await Promise.all(
        zones.map((z) => fetchZoneReports(z.id).catch(() => [] as Report[])),
      );
      setReports(lists.flat());
      setReportsError(null);
    } catch (e) {
      setReportsError(e instanceof ApiError ? e.message : "Failed to load reports");
    } finally {
      setReportsLoading(false);
    }
  }, [zones]);

  const syncAll = useCallback(async () => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    try {
      await Promise.all([loadOrders(), loadReports()]);
      setLastSyncedAt(Date.now());
    } finally {
      syncInFlight.current = false;
    }
  }, [loadOrders, loadReports]);

  const syncRef = useRef(syncAll);
  syncRef.current = syncAll;

  // auto-refresh zone KPIs so the dashboard reflects live ingest data

  const onCreateWorkOrders = (plan: AgentPlan, focusZone: string | null) => {
    const base: WorkOrder[] =
      plan.workOrderIds.length > 0
        ? plan.workOrderIds.map((id, i) => ({
            id,
            zoneId: focusZone ?? zones[0]?.id ?? "—",
            type: plan.actions[i]?.type ?? "monitor",
            priority: plan.actions[i]?.priority ?? "P3",
            status: "open",
            note: plan.actions[i]?.reason ?? plan.summary,
            createdAt: new Date().toISOString(),
          }))
        : plan.actions.map((a, i) => ({
            id: `wo-${Date.now()}-${i}`,
            zoneId: focusZone ?? zones[0]?.id ?? "—",
            type: a.type,
            priority: a.priority,
            status: "open",
            note: a.reason,
            createdAt: new Date().toISOString(),
          }));
    setPending((prev) => [...base, ...prev]);
  };

  // pick up ?zone= from the URL (set by the "Ask JalRakshak" link in the zone sheet)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("zone");
    if (q) setZoneId(q);
  }, []);

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, []);

  // kick off a sync as soon as the passcode gate is passed, then poll in the background
  // (also refresh zone KPIs so the dashboard reflects live ingest data)
  useEffect(() => {
    if (!authed) return;
    syncRef.current();
    reloadZones();
    const id = setInterval(() => {
      syncRef.current();
      reloadZones();
    }, OPS_POLL_MS);
    return () => clearInterval(id);
  }, [authed, reloadZones]);

  // If zones weren't loaded when the first sync ran (zones empty → loadReports
  // skipped reports), re-sync once they arrive so the Active-reports KPI gets
  // the real count immediately instead of waiting up to one poll cycle.
  const zonesEverSynced = useRef(false);
  useEffect(() => {
    if (!authed || zonesEverSynced.current) return;
    if (zones.length > 0) {
      zonesEverSynced.current = true;
      syncRef.current();
    }
  }, [authed, zones]);

  const advanceOrder = async (o: WorkOrder) => {
    const next: WorkOrderStatus = o.status === "open" ? "dispatched" : o.status === "dispatched" ? "resolved" : "resolved";
    // optimistic update
    setOrders((prev) => prev.map((w) => (w.id === o.id ? { ...w, status: next } : w)));
    try {
      await patchWorkOrder(o.id, next, passcode);
      toast.success(translate(lang, "ops.board.updated"));
    } catch (e) {
      // revert on failure
      setOrders((prev) => prev.map((w) => (w.id === o.id ? { ...w, status: o.status } : w)));
      const msg = e instanceof ApiError ? e.message : "Update failed";
      toast.error(translate(lang, "ops.error"), msg);
    }
  };

  // merged list: server orders first, then anything the agent created this session
  const allOrders = [...orders, ...pending.filter((p) => !orders.some((o) => o.id === p.id))];

  if (!authed) {
    return (
      <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden p-5">
        <div className="w-full max-w-md animate-fade-in">
          <div className="glass-strong overflow-hidden rounded-4xl shadow-glow">
            <div className="border-b border-white/8 bg-gradient-to-b from-aqua-500/[0.09] to-transparent px-6 py-7 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-3xl border border-white/12 bg-white/[0.05]">
                <svg viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth={1.9} className="h-7 w-7">
                  <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
                  <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">
                {translate(lang, "ops.title")}
              </h1>
              <p className="mt-1.5 text-xs text-white/45">{translate(lang, "ops.sub")}</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (passcode.trim()) {
                  sessionStorage.setItem("aq_ops_passcode", passcode.trim());
                  setAuthed(true);
                }
              }}
              className="space-y-4 p-6"
            >
              <div>
                <label htmlFor="passcode" className="label">
                  {translate(lang, "ops.passcode")}
                </label>
                <input
                  id="passcode"
                  type="password"
                  autoFocus
                  suppressHydrationWarning
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="input mt-1.5 tracking-[0.3em]"
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={!passcode.trim()}>
                {translate(lang, "ops.enter")}
              </button>
              <p className="text-center text-[10.5px] text-white/35">{translate(lang, "ops.passcode.hint")}</p>
            </form>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/45 transition hover:text-white/80"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {translate(lang, "ops.back")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const critical = zones.filter((z) => z.tier === "CRITICAL").length;

  return (
    <main className="min-h-[100dvh] overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        {/* header */}
        <header className="mb-5 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {translate(lang, "ops.title")}
              </h1>
              {critical > 0 ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    color: TIER_META.CRITICAL.color,
                    borderColor: `${TIER_META.CRITICAL.color}45`,
                    background: TIER_META.CRITICAL.soft,
                  }}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                      style={{ background: TIER_META.CRITICAL.color }}
                    />
                    <span
                      className="relative inline-flex h-1.5 w-1.5 rounded-full"
                      style={{ background: TIER_META.CRITICAL.color }}
                    />
                  </span>
                  {critical} critical
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] text-white/40">
              {translate(lang, "ops.sub")} · {clock}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/map" className="btn-ghost px-3.5 text-xs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                <path d="M9 20 3 12l6-8M15 4l6 8-6 8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {translate(lang, "ops.back")}
            </Link>
            <button
              onClick={() => {
                setAuthed(false);
                setPasscode("");
                setPending([]);
              }}
              className="btn-outline px-3.5 text-xs"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
                <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
                <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </svg>
              {translate(lang, "ops.logout")}
            </button>
          </div>
        </header>

        <div className="space-y-5">
          <KpiStrip zones={zones} workOrders={allOrders} reports={reports} reportsLoading={reportsLoading} lang={lang} lastSyncedAt={lastSyncedAt} />

          <AnalyticsBoard zones={zones} zoneId={zoneId} lang={lang} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <Hotspots zones={zones} lang={lang} selectedId={zoneId} onSelect={setZoneId} />
            <AskAgent
              passcode={passcode}
              zones={zones}
              lang={lang}
              zoneId={zoneId}
              onZoneChange={setZoneId}
              onCreateWorkOrders={onCreateWorkOrders}
            />
          </div>

          <WorkOrderBoard
            lang={lang}
            pending={pending}
            orders={orders}
            loading={ordersLoading}
            error={ordersError}
            onAdvance={advanceOrder}
          />
        </div>

        <footer className="mt-8 border-t border-white/8 pt-5 text-center text-[10.5px] text-white/30">
          {translate(lang, "app.name")} · {translate(lang, "app.city")} · AWS · data labelled on screen
        </footer>
      </div>
    </main>
  );
}
