"use client";

import { useState } from "react";
import type { AgentPlan, ZoneSummary } from "@aquashield/types";
import { askAgent, createAlert, publishAlert, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { translate, type Lang } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";

const PRIORITY_STYLE: Record<"P1" | "P2" | "P3", string> = {
  P1: "border-rose-400/40 bg-rose-400/12 text-rose-300",
  P2: "border-amber-400/40 bg-amber-400/12 text-amber-300",
  P3: "border-white/15 bg-white/[0.06] text-white/60",
};

const ACTION_LABELS: Record<string, string> = {
  pump_dispatch: "Pump dispatch",
  drain_cleaning: "Drain cleaning",
  barricade: "Barricade",
  traffic_diversion: "Traffic diversion",
  public_alert: "Public alert",
  monitor: "Monitor",
};

const SUGGESTIONS = [
  "What should we do at the worst hotspot right now?",
  "Which zones will go critical in the next hour?",
  "Draft a public alert for the top hotspot.",
];

type WorkOrderCreator = (plan: AgentPlan, zoneId: string | null) => void;

export function AskAgent({
  passcode,
  zones,
  lang,
  zoneId,
  onZoneChange,
  onCreateWorkOrders,
}: {
  passcode: string;
  zones: ZoneSummary[];
  lang: Lang;
  zoneId: string | null;
  onZoneChange: (id: string | null) => void;
  onCreateWorkOrders: WorkOrderCreator;
}) {
  const toast = useToast();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [executed, setExecuted] = useState(false);

  const ask = async (execute = false) => {
    const q = question.trim() || SUGGESTIONS[0];
    setLoading(true);
    setError(null);
    if (execute) setExecuting(true);
    try {
      const result = await askAgent({
        question: q,
        zoneId: zoneId ?? undefined,
        lang,
        execute,
        passcode,
      });
      setPlan(result);
      if (execute) {
        setExecuted(true);
        onCreateWorkOrders(result, zoneId);
        toast.success(translate(lang, "ops.plan.executed"));
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Agent request failed";
      setError(msg);
      toast.error(translate(lang, "ops.error"), msg);
    } finally {
      setLoading(false);
      setExecuting(false);
    }
  };

  const onPublish = async () => {
    if (!plan) return;
    const zone = zoneId ?? zones[0]?.id ?? "unknown";
    try {
      // Backend only publishes alerts that exist as drafts — create, then publish.
      await Promise.all(
        (["en", "hi"] as const).map(async (l) => {
          const alert = await createAlert({ zoneId: zone, lang: l, text: plan.alertDraft[l] }, passcode);
          await publishAlert(alert.id, passcode);
        }),
      );
      setPublished(true);
      toast.success(translate(lang, "ops.plan.published"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Publish failed";
      toast.error(translate(lang, "ops.error"), msg);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(translate(lang, "ops.plan.copied"));
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/8 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl border border-aqua-400/35 bg-aqua-400/12 text-aqua-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-5 w-5">
              <path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" />
              <path d="M10 18h4M10.5 21h3" strokeLinecap="round" />
            </svg>
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">{translate(lang, "ops.ask")}</h3>
            <p className="mt-0.5 text-[10.5px] text-white/40">
              Strands agent · Amazon Bedrock · tools-only facts
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <select
          value={zoneId ?? ""}
          onChange={(e) => onZoneChange(e.target.value || null)}
          className="input appearance-none"
          aria-label={translate(lang, "ops.ask.zone")}
        >
          <option value="">{translate(lang, "ops.ask.all")}</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id} className="bg-ink-800">
              {z.name} · {z.tier}
            </option>
          ))}
        </select>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
          placeholder={translate(lang, "ops.ask.ph")}
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
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={() => ask(false)}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading && !executing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
              {translate(lang, "ops.ask.thinking")}
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                <path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" />
              </svg>
              {translate(lang, "ops.ask.button")}
            </>
          )}
        </button>

        {error ? <p className="text-[11.5px] font-medium text-rose-300">{error}</p> : null}
      </div>

      {loading && !plan ? (
        <div className="border-t border-white/8 px-4 py-5">
          <Thinking lang={lang} />
        </div>
      ) : null}

      {plan ? (
        <div className="border-t border-white/8 p-4">
          <PlanCard
            plan={plan}
            lang={lang}
            published={published}
            executed={executed}
            executing={executing && loading}
            onPublish={onPublish}
            onExecute={() => ask(true)}
            onCopy={copyText}
          />
        </div>
      ) : null}
    </div>
  );
}

function Thinking({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 animate-bounce rounded-full bg-aqua-400"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium text-white/45">{translate(lang, "ops.ask.thinking")}</p>
      <p className="text-[10px] text-white/25">get_zone_risk · get_forecast · get_nearby_reports</p>
    </div>
  );
}

function PlanCard({
  plan,
  lang,
  published,
  executed,
  executing,
  onPublish,
  onExecute,
  onCopy,
}: {
  plan: AgentPlan;
  lang: Lang;
  published: boolean;
  executed: boolean;
  executing: boolean;
  onPublish: () => void;
  onExecute: () => void;
  onCopy: (t: string) => void;
}) {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-aqua-400/35 bg-aqua-400/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-aqua-200">
          {translate(lang, "ops.plan")}
        </span>
        <span className="label">{translate(lang, "ops.plan.confidence")}</span>
        <span className="ml-auto text-[10px] font-semibold text-white/40">{plan.toolsUsed.length} tools</span>
      </div>

      <p className="text-sm font-semibold leading-relaxed text-white/90">{plan.summary}</p>

      <div>
        <span className="label">{translate(lang, "ops.plan.why")}</span>
        <ul className="mt-2 space-y-1.5">
          {plan.why.map((w, i) => (
            <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-white/60">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-aqua-400" />
              {w}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <span className="label">{translate(lang, "ops.plan.actions")}</span>
        <div className="mt-2 space-y-2">
          {plan.actions.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-3"
            >
              <span
                className={`mt-0.5 shrink-0 rounded-lg border px-1.5 py-0.5 text-[9px] font-bold ${PRIORITY_STYLE[a.priority]}`}
              >
                {a.priority}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white/85">{ACTION_LABELS[a.type] ?? a.type}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">{a.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="label">{translate(lang, "ops.plan.alert")}</span>
        <div className="mt-2 space-y-2">
          {(["en", "hi"] as const).map((l) => (
            <div key={l} className="group rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="rounded-md border border-white/12 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white/50">
                  {l === "en" ? "EN" : "हिंदी"}
                </span>
                {published ? (
                  <span className="rounded-full border border-emerald-400/35 bg-emerald-400/12 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                    {translate(lang, "ops.plan.published")}
                  </span>
                ) : null}
                <button
                  onClick={() => onCopy(plan.alertDraft[l])}
                  className="ml-auto rounded-lg p-1 text-white/35 transition hover:bg-white/10 hover:text-white"
                  aria-label={translate(lang, "ops.plan.copy")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-3.5 w-3.5">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <p className="text-[11.5px] leading-relaxed text-white/70">{plan.alertDraft[l]}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[10px] leading-relaxed text-white/35">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5m0-8.5h.01" strokeLinecap="round" />
        </svg>
        {translate(lang, "ops.plan.human")}
      </p>

      <div className="flex flex-wrap gap-2">
        {plan.toolsUsed.map((t) => (
          <span key={t} className="chip text-[9.5px]">
            {t}
          </span>
        ))}
      </div>

      {plan.confidenceNote ? (
        <p className="text-[10.5px] italic leading-relaxed text-white/40">{plan.confidenceNote}</p>
      ) : null}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          onClick={onExecute}
          disabled={executing || executed}
          className="btn-primary flex-1"
        >
          {executing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
              {translate(lang, "ops.plan.executing")}
            </>
          ) : executed ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} className="h-4 w-4">
                <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {translate(lang, "ops.plan.executed")}
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              {translate(lang, "ops.plan.execute")}
            </>
          )}
        </button>
        <button
          onClick={onPublish}
          disabled={published}
          className="btn-ghost flex-1"
        >
          {published ? (
            translate(lang, "ops.plan.published")
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
                <path d="m4 12 16-8-6 16-2.5-6L4 12Z" strokeLinejoin="round" />
              </svg>
              {translate(lang, "ops.plan.publish")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
