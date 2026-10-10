"use client";

import { useEffect, useRef } from "react";
import { useState } from "react";
import { TIER_META, TIER_ORDER } from "@/lib/tiers";
import { useApp } from "@/lib/store";
import { translate } from "@/lib/i18n";

export function Legend() {
  const { lang, effectiveZones, staleCount } = useApp();
  const [open, setOpen] = useState(true);

  // Expose the legend's rendered height as --legend-h so the rain-sim popup can
  // cap itself below it (never overlaps the legend).
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const apply = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--legend-h", `${h}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const counts = TIER_ORDER.map((t) => ({
    tier: t,
    n: effectiveZones.filter((z) => z.tier === t).length,
  }));

  return (
    <div ref={rootRef} className="glass-strong w-64 overflow-hidden rounded-3xl shadow-glow">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-aqua-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
            <path d="M12 3v3M4.2 7.2l2.1 2.1M3 15h3M21 15h-3M19.8 7.2l-2.1 2.1" strokeLinecap="round" />
            <circle cx="12" cy="15" r="4" />
          </svg>
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-white">{translate(lang, "map.legend")}</span>
          <span className="block text-[10px] text-white/40">{translate(lang, "map.legend.sub")}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          className={`h-4 w-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="space-y-1.5 px-3 pb-3">
          {counts.map(({ tier, n }) => {
            const meta = TIER_META[tier];
            return (
              <div key={tier} className="flex items-center gap-2.5 rounded-2xl px-2 py-1.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}90` }}
                />
                <span className="flex-1 text-xs font-semibold text-white/80">
                  {lang === "hi" ? meta.labelHi : meta.label}
                </span>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: meta.color }}>
                  {n}
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-white/8 px-2 pt-2 text-[10px] text-white/40">
            <span>
              {effectiveZones.length} {translate(lang, "map.zones")}
            </span>
            {staleCount > 0 ? (
              <span className="flex items-center gap-1 font-semibold text-amber-300/80">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" strokeLinecap="round" />
                </svg>
                {translate(lang, "map.stale")}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
