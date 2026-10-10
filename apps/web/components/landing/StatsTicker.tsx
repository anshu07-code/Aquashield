"use client";

import { useEffect, useRef } from "react";

const STATS = [
  { value: "15", unit: " zones", label: "Monitored underpasses across Delhi" },
  { value: "15", unit: " min", label: "Live data refresh interval" },
  { value: "100", unit: "%", label: "AI-verified flood reports" },
  { value: "0.0", unit: "s", label: "Detection to alert time" },
];

function CountUp({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dur = 1600;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(1);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);

  return <span ref={ref}>0</span>;
}

export function StatsTicker() {
  return (
    <section
      className="relative overflow-hidden py-20"
      style={{ background: "#020814" }}
    >
      {/* Top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((s, i) => {
            const num = parseFloat(s.value);
            return (
              <div key={i} className="text-center">
                <div
                  className="mb-3 font-display text-5xl font-black tabular-nums leading-none sm:text-6xl"
                  style={{ color: "#00e5ff" }}
                >
                  <CountUp target={num} />
                  <span className="text-2xl font-bold" style={{ color: "#00b4d8", opacity: 0.6 }}>
                    {s.unit}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-white/40">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
    </section>
  );
}
