"use client";

import { useEffect, useState } from "react";
import { TIER_META } from "@/lib/tiers";
import type { Tier } from "@aquashield/types";

const R = 52;
const CIRC = 2 * Math.PI * R;

export function RiskGauge({
  risk,
  tier,
  size = 132,
  sim = false,
}: {
  risk: number;
  tier: Tier;
  size?: number;
  sim?: boolean;
}) {
  const meta = TIER_META[tier];
  const [offset, setOffset] = useState(CIRC);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(CIRC * (1 - risk / 100)));
    return () => cancelAnimationFrame(id);
  }, [risk]);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="11" />
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke={meta.color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset .95s cubic-bezier(.22,1,.36,1), stroke .4s ease", filter: `drop-shadow(0 0 8px ${meta.color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display text-4xl font-bold leading-none tabular-nums"
          style={{ color: meta.color }}
        >
          {risk}
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
          {sim ? "Simulated" : "Risk index"}
        </span>
      </div>
    </div>
  );
}
