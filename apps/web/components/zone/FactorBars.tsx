"use client";

import { useEffect, useState } from "react";
import type { RiskBreakdown } from "@aquashield/types";
import { translate, type Lang } from "@/lib/i18n";
import { riskColor } from "@/lib/tiers";

const FACTOR_KEYS = [
  "rainNow",
  "antecedent24h",
  "depression",
  "drainageDeficit",
  "history",
  "liveEvidence",
] as const;

const WEIGHTS: Record<(typeof FACTOR_KEYS)[number], number> = {
  rainNow: 0.3,
  antecedent24h: 0.15,
  depression: 0.15,
  drainageDeficit: 0.15,
  history: 0.1,
  liveEvidence: 0.15,
};

export function FactorBars({ breakdown, lang }: { breakdown: RiskBreakdown; lang: Lang }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const rows = FACTOR_KEYS.map((k) => ({
    key: k,
    label: translate(lang, `factor.${k}`),
    value: breakdown.factors[k],
    contribution: breakdown.contributions[k],
    weight: WEIGHTS[k],
  })).sort((a, b) => b.contribution - a.contribution);

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const color = riskColor(r.value);
        return (
          <div key={r.key}>
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="flex-1 text-xs font-semibold text-white/80">{r.label}</span>
              <span className="text-[10px] font-medium tabular-nums text-white/35">
                ×{r.weight.toFixed(2)}
              </span>
              <span className="w-12 text-right text-xs font-bold tabular-nums" style={{ color }}>
                {Math.round(r.contribution)}
                <span className="font-medium text-white/30"> pts</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${Math.max(2, r.value)}%` : "0%",
                  background: `linear-gradient(90deg, ${color}cc, ${color})`,
                  boxShadow: `0 0 10px ${color}55`,
                  transition: "width .8s cubic-bezier(.22,1,.36,1)",
                }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between border-t border-white/8 pt-3">
        <span className="text-[11px] text-white/40">{translate(lang, "zone.factors")}</span>
        <span className="text-[11px] font-bold tabular-nums text-white/70">
          Σ {Math.round(FACTOR_KEYS.reduce((s, k) => s + breakdown.contributions[k], 0))} pts
          {breakdown.underpassMultiplier > 1 ? (
            <span className="ml-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-bold text-sky-300">
              ×{breakdown.underpassMultiplier} underpass
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
