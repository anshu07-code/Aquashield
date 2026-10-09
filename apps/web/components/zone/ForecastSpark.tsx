"use client";

import type { ForecastPoint } from "@aquashield/types";
import { clockTime } from "@/lib/format";

export function ForecastSpark({ points }: { points: ForecastPoint[] }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.mmHr), 1);
  const W = 100;
  const H = 42;
  const step = W / points.length;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="flex items-end gap-1.5" style={{ height: H }}>
        {points.map((p, i) => {
          const h = Math.max(6, (p.mmHr / max) * (H - 4));
          const intensity = Math.min(1, p.mmHr / 60);
          const color =
            intensity > 0.75 ? "#fb4d63" : intensity > 0.5 ? "#fb923c" : intensity > 0.25 ? "#fbbf24" : "#22d3ee";
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5" style={{ height: H }}>
              <span className="text-[9px] font-bold tabular-nums text-white/55">{Math.round(p.mmHr)}</span>
              <div
                className="w-full max-w-[26px] rounded-t-md"
                style={{
                  height: h,
                  background: `linear-gradient(180deg, ${color}, ${color}55)`,
                  transition: "height .6s cubic-bezier(.22,1,.36,1)",
                }}
                title={`${clockTime(p.ts)} · ${p.mmHr} mm/hr`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] font-medium text-white/35">
        <span>{clockTime(points[0].ts)}</span>
        <span>+3h</span>
      </div>
    </div>
  );
}
