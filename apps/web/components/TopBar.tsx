"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { LANGS, translate } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";

function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="jr-drop" x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" />
          <stop offset="0.55" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.14)" />
      <path
        d="M24 9.5c5.6 6.4 9.5 11.6 9.5 16.2A9.5 9.5 0 0 1 24 35.2a9.5 9.5 0 0 1-9.5-9.5c0-4.6 3.9-9.8 9.5-16.2Z"
        fill="url(#jr-drop)"
      />
      <path
        d="M24 16.6v12.4M19.4 24.3l4.6 4.6 4.6-4.6"
        stroke="#04222b"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".85"
      />
    </svg>
  );
}

export function TopBar() {
  const { lang, setLang, simActive, zones } = useApp();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, []);

  const critical = zones.filter((z) => z.tier === "CRITICAL").length;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="glass-strong pointer-events-auto flex w-full max-w-6xl items-center gap-3 rounded-3xl px-3 py-2.5 shadow-glow sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-bold leading-none tracking-tight text-white sm:text-lg">
                {translate(lang, "app.name")}
              </h1>
              <span className="hidden rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-aqua-300 sm:inline">
                {translate(lang, "app.tagline")}
              </span>
            </div>
            <p className="mt-1 hidden truncate text-[11px] text-white/45 sm:block">
              {translate(lang, "app.city")}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
          {critical > 0 ? (
            <div
              className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold sm:flex"
              style={{
                color: TIER_META.CRITICAL.color,
                borderColor: `${TIER_META.CRITICAL.color}40`,
                background: TIER_META.CRITICAL.soft,
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                  style={{ background: TIER_META.CRITICAL.color }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: TIER_META.CRITICAL.color }}
                />
              </span>
              {critical} critical
            </div>
          ) : null}

          {simActive ? (
            <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Simulation
            </span>
          ) : null}

          <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.05] p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                  lang === l.code
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/45 hover:text-white/80"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="hidden text-right tabular-nums text-white/45 sm:block">
            <div className="text-[10px] uppercase tracking-wider">Delhi</div>
            <div className="text-xs font-semibold text-white/70">{clock}</div>
          </div>

          <Link
            href="/ops"
            className="btn-ghost px-3 py-2 text-xs font-bold sm:px-3.5"
            aria-label="Ops dashboard"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
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
