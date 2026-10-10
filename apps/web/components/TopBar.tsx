"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { LANGS, translate } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden>
      <defs>
        <radialGradient id="jr-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00b4d8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="jr-drop" x1="11" y1="6" x2="33" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="55%" stopColor="#0096c7" />
          <stop offset="100%" stopColor="#005577" />
        </linearGradient>
      </defs>

      {/* Ambient glow */}
      <circle cx="22" cy="20" r="18" fill="url(#jr-glow)" />

      {/* Shield outline */}
      <path
        d="M22 5C14 5 8 8 8 8v11c0 9 7 14 14 20 7-6 14-11 14-20V8s-6-3-14-3Z"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Water drop */}
      <path
        d="M22 10.5C26.4 16.8 29.5 21 29.5 24.8a7.5 7.5 0 0 1-15 0c0-3.8 3.1-8 7.5-14.3Z"
        fill="url(#jr-drop)"
      />

      {/* Alert chevron inside drop */}
      <path
        d="M22 17v6M19.5 21.5l2.5 2.5 2.5-2.5"
        stroke="#001a25"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TopBar() {
  const { lang, setLang, simActive, zones, staleCount } = useApp();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const critical = zones.filter((z) => z.tier === "CRITICAL").length;
  const high = zones.filter((z) => z.tier === "HIGH").length;
  const watch = zones.filter((z) => z.tier === "WATCH").length;
  const alertLevel = critical > 0 ? "CRITICAL" : high > 0 ? "HIGH" : watch > 0 ? "WATCH" : "SAFE";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="glass-strong pointer-events-auto flex w-full max-w-7xl items-center gap-4 rounded-3xl px-4 py-3">

        {/* Left: logo + wordmark */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <LogoMark />
            {critical > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--critical)] opacity-70" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full" style={{ background: "var(--critical)" }} />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-bold leading-none tracking-tight text-white sm:text-lg">
                {translate(lang, "app.name")}
              </h1>

              {/* Status chip */}
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
                style={{
                  color: TIER_META[alertLevel].color,
                  borderColor: `${TIER_META[alertLevel].color}50`,
                  background: `${TIER_META[alertLevel].color}14`,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: TIER_META[alertLevel].color,
                    boxShadow: `0 0 6px ${TIER_META[alertLevel].color}`,
                  }}
                />
                {alertLevel}
              </span>
            </div>
            <p className="hidden truncate text-[10.5px] text-[var(--text-3)] sm:block">
              Delhi · Flood Risk System
            </p>
          </div>
        </div>

        {/* Centre: zone quick-summary */}
        <div className="hidden flex-1 justify-center lg:flex">
          <div className="flex items-center gap-1">
            {(["SAFE","WATCH","HIGH","CRITICAL"] as const).map((tier) => {
              const count = zones.filter((z) => z.tier === tier).length;
              if (count === 0) return null;
              return (
                <div key={tier} className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5" style={{
                  borderColor: `${TIER_META[tier].color}35`,
                  background: `${TIER_META[tier].color}10`,
                }}>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: TIER_META[tier].color, boxShadow: `0 0 6px ${TIER_META[tier].color}80` }}
                  />
                  <span className="text-[10.5px] font-bold" style={{ color: TIER_META[tier].color }}>
                    {count}
                  </span>
                  <span className="text-[10px] text-[var(--text-3)]">{TIER_META[tier].label}</span>
                </div>
              );
            })}

            {staleCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ffd166" strokeWidth="2" className="h-3.5 w-3.5">
                  <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" />
                </svg>
                <span className="text-[10.5px] font-bold text-amber-300">{staleCount} stale</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: time, lang, ops */}
        <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
          {simActive && (
            <span className="hidden items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 sm:flex">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 animate-spin-slow">
                <path d="M12 3v3M4.2 7.2l2.1 2.1M3 15h3M21 15h-3M19.8 7.2l-2.1 2.1" strokeLinecap="round" />
                <circle cx="12" cy="15" r="4" />
              </svg>
              Simulation
            </span>
          )}

          {/* Live clock */}
          <div className="hidden text-right sm:block">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-4)]">Delhi</div>
            <div className="font-display text-sm font-bold tabular-nums leading-tight text-[var(--text-2)]">{clock}</div>
          </div>

          {/* Language switcher */}
          <div className="flex items-center rounded-xl border border-[var(--border-2)] bg-[var(--surface)] p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  lang === l.code
                    ? "bg-[var(--surface-3)] text-white shadow-sm"
                    : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Ops link */}
          <Link
            href="/ops"
            className="btn-ghost px-3 py-2 text-xs"
            aria-label="Ops dashboard"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <rect x="3" y="3" width="7" height="7" rx="1.6" />
              <rect x="14" y="3" width="7" height="7" rx="1.6" />
              <rect x="3" y="14" width="7" height="7" rx="1.6" />
              <rect x="14" y="14" width="7" height="7" rx="1.6" />
            </svg>
            <span className="hidden sm:inline">{translate(lang, "nav.ops")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}