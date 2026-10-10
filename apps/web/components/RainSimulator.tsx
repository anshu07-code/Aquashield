"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { translate } from "@/lib/i18n";
import { TIER_META, TIER_ORDER } from "@/lib/tiers";

export function RainSimulator() {
  const { lang, simRain, simActive, setSimRain, startSim, resetSim, effectiveZones } = useApp();
  const [open, setOpen] = useState(false);

  const distribution = TIER_ORDER.map((t) => ({
    tier: t,
    n: effectiveZones.filter((z) => z.tier === t).length,
  }));
  const total = effectiveZones.length || 1;

  // Shared panel markup (inline panel + popup)
  const panel = !simActive ? (
    <div className="glass-strong w-72 overflow-hidden rounded-3xl p-4 shadow-glow">
      <div className="flex items-start gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-sky-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
            <path d="M8 19h1M12 21h1M16 19h1M5 16h1M19 16h1" strokeLinecap="round" />
            <path d="M7 13a4 4 0 0 1 1.4-7.8A5.5 5.5 0 0 1 19 7.6 3.5 3.5 0 0 1 18 13H7Z" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white">{translate(lang, "sim.title")}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-white/45">{translate(lang, "sim.sub")}</p>
        </div>
      </div>
      <button onClick={startSim} className="btn-primary mt-3.5 w-full">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
          <path d="M12 3v3M4.2 7.2l2.1 2.1M3 15h3M21 15h-3M19.8 7.2l-2.1 2.1" strokeLinecap="round" />
          <circle cx="12" cy="15" r="4" />
        </svg>
        {translate(lang, "sim.start")}
      </button>
    </div>
  ) : (
    <div className="glass-strong w-72 overflow-hidden rounded-3xl shadow-glow">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
        </span>
        <h3 className="flex-1 text-sm font-bold text-white">{translate(lang, "sim.title")}</h3>
        <span className="rounded-full border border-amber-400/40 bg-amber-400/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          {translate(lang, "map.simulation.on")}
        </span>
        <button
          onClick={resetSim}
          className="rounded-xl p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
          aria-label={translate(lang, "sim.reset")}
          title={translate(lang, "sim.reset")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-end justify-between">
          <span className="label">{translate(lang, "sim.slider")}</span>
          <span className="font-display text-3xl font-bold leading-none text-white">
            {simRain}
            <span className="ml-1 text-sm font-semibold text-white/45">{translate(lang, "sim.mmhr")}</span>
          </span>
        </div>

        <input
          className="sim-range mt-2.5"
          type="range"
          min={0}
          max={100}
          step={1}
          value={simRain ?? 0}
          onChange={(e) => setSimRain(Number(e.target.value))}
          aria-label={translate(lang, "sim.slider")}
        />
        <div className="mt-0.5 flex justify-between text-[10px] font-medium text-white/35">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>

        <div className="mt-3.5 flex h-2.5 overflow-hidden rounded-full bg-white/8">
          {distribution.map(({ tier, n }) => {
            const meta = TIER_META[tier];
            const w = (n / total) * 100;
            if (w === 0) return null;
            return (
              <div
                key={tier}
                style={{ width: `${w}%`, background: meta.color }}
                className="h-full transition-all duration-500"
                title={`${lang === "hi" ? meta.labelHi : meta.label}: ${n}`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {distribution.map(({ tier, n }) => {
            const meta = TIER_META[tier];
            return (
              <span key={tier} className="flex items-center gap-1.5 text-[10px] font-semibold text-white/55">
                <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                {lang === "hi" ? meta.labelHi : meta.label} {n}
              </span>
            );
          })}
        </div>

        <p className="mt-3.5 text-[10.5px] leading-relaxed text-white/35">{translate(lang, "sim.note")}</p>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Panel opens upward from the bottom-anchored launcher, capped below the legend */}
      {open ? (
        <div
          className="absolute bottom-full left-0 z-50 mb-3 w-72 overflow-y-auto overscroll-contain"
          style={{ maxHeight: "calc(100dvh - var(--topbar-h, 76px) - var(--legend-h, 0px) - 7.5rem)" }}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={translate(lang, "zone.close")}
              className="absolute -right-2 -top-2 z-10 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-[var(--surface-3)] text-white/70 shadow-lg transition hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {panel}
          </div>
        </div>
      ) : null}

      {/* Launcher — same height as the bottom scroll-bar row buttons (h-11) so it aligns */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={translate(lang, "sim.title")}
        aria-expanded={open}
        title={translate(lang, "sim.title")}
        className="glass relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          borderColor: simActive ? "rgba(251,191,36,0.45)" : "rgba(255,255,255,0.12)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-5 w-5"
          style={{ color: simActive ? "#fbbf24" : "var(--accent, #00b4d8)" }}
        >
          <path d="M8 19h1M12 21h1M16 19h1M5 16h1M19 16h1" strokeLinecap="round" />
          <path d="M7 13a4 4 0 0 1 1.4-7.8A5.5 5.5 0 0 1 19 7.6 3.5 3.5 0 0 1 18 13H7Z" strokeLinejoin="round" />
        </svg>
        {simActive ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
          </span>
        ) : null}
      </button>
    </div>
  );
}
