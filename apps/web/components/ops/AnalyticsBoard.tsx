"use client";

/**
 * Live analytics for the Ops Command — every number here is derived from real API
 * responses (`GET /zones` + `GET /zones/:id` forecast), never invented.
 * Charts are hand-rolled SVG so we add zero dependencies.
 */
import { useEffect, useMemo, useState } from "react";
import type { ZoneDetail, ZoneSummary } from "@aquashield/types";
import { fetchZoneDetail } from "@/lib/api";
import { TIER_META } from "@/lib/tiers";
import { translate, type Lang, type TKey } from "@/lib/i18n";

const TIERS: ("SAFE" | "WATCH" | "HIGH" | "CRITICAL")[] = ["SAFE", "WATCH", "HIGH", "CRITICAL"];

function Donut({ counts, total }: { counts: Record<string, number>; total: number }) {
  const R = 44;
  const cxy = 60;
  let acc = 0;
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" role="img" aria-label="Risk distribution">
      <g transform={`rotate(-90 ${cxy} ${cxy})`}>
        {TIERS.map((t) => {
          const n = counts[t] ?? 0;
          const frac = total === 0 ? 0 : n / total;
          const sweep = frac * 360;
          if (sweep === 0) return null;
          const from = (acc * Math.PI) / 180;
          const to = ((acc + sweep) * Math.PI) / 180;
          const x1 = cxy + R * Math.cos(from);
          const y1 = cxy + R * Math.sin(from);
          const x2 = cxy + R * Math.cos(to);
          const y2 = cxy + R * Math.sin(to);
          const large = sweep > 180 ? 1 : 0;
          acc += sweep;
          const meta = TIER_META[t];
          return (
            <path
              key={t}
              d={`M ${cxy} ${cxy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={meta.color}
              opacity={t === "SAFE" ? 0.35 : 1}
              stroke="#020814"
              strokeWidth={1.5}
            />
          );
        })}
      </g>
      <text x={cxy} y={cxy + 3} textAnchor="middle" fill="#fff" fontSize={20} fontWeight={800} className="font-display">
        {total}
      </text>
      <text x={cxy} y={cxy + 19} textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize={6.5} fontWeight={700}>
        ZONES
      </text>
    </svg>
  );
}

function RiskBars({ zones }: { zones: ZoneSummary[] }) {
  const ranked = [...zones].sort((a, b) => b.risk - a.risk);
  return (
    <div className="space-y-3">
      {ranked.length === 0
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-3 w-28 rounded-full" />
              <div className="skeleton h-4 flex-1 rounded-full" />
              <div className="skeleton h-3 w-8 rounded-full" />
            </div>
          ))
        : ranked.map((z) => {
            const meta = TIER_META[z.tier];
            return (
              <div key={z.id} className="flex items-center gap-3">
                <span className="w-32 truncate text-[11px] font-semibold text-white/70" title={z.name}>
                  {z.name}
                </span>
                <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-white/5">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${z.risk}%`,
                      background: `linear-gradient(90deg, ${meta.color}55, ${meta.color})`,
                      boxShadow: z.risk >= 75 ? `0 0 12px ${meta.color}66` : undefined,
                    }}
                  />
                </div>
                <span
                  className="w-8 text-right font-display text-xs font-bold tabular-nums"
                  style={{ color: meta.color }}
                >
                  {z.risk}
                </span>
              </div>
            );
          })}
    </div>
  );
}

function Gauge({ avg }: { avg: number }) {
  const R = 54;
  const cx = 80;
  const cy = 74;
  const start = { x: cx - R, y: cy };
  const end = { x: cx + R, y: cy };
  const valueAngle = (avg / 100) * 180;
  const rad = (180 - valueAngle) * (Math.PI / 180);
  const px = cx + R * Math.cos(rad);
  const py = cy - R * Math.sin(rad);
  const meta = TIER_META[avg >= 75 ? "CRITICAL" : avg >= 55 ? "HIGH" : avg >= 30 ? "WATCH" : "SAFE"];

  return (
    <svg viewBox="0 0 160 100" className="h-24 w-full max-w-[240px]" role="img" aria-label="Average risk gauge">
      <path
        d={`M ${start.x} ${start.y} A ${R} ${R} 0 0 1 ${end.x} ${end.y}`}
        fill="none"
        stroke="rgba(255,255,255,.12)"
        strokeWidth={14}
        strokeLinecap="round"
      />
      {avg > 0 && (
        <path
          d={`M ${start.x} ${start.y} A ${R} ${R} 0 0 1 ${px} ${py}`}
          fill="none"
          stroke={meta.color}
          strokeWidth={14}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${meta.color}66)` }}
        />
      )}
      <text x={cx} y={cy - 2} textAnchor="middle" fill="#fff" fontSize={22} fontWeight={800} className="font-display">
        {avg}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize={6} fontWeight={700}>
        AVG FLOOD RISK INDEX
      </text>
      <text x={8} y={96} fill="rgba(255,255,255,.25)" fontSize={5}>
        0
      </text>
      <text x={152} y={96} textAnchor="end" fill="rgba(255,255,255,.25)" fontSize={5}>
        100
      </text>
    </svg>
  );
}

function ForecastChart({ zoneId, lang }: { zoneId: string | null; lang: Lang }) {
  const [data, setData] = useState<ZoneDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!zoneId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      setLoading(true);
      setError(null);
      return fetchZoneDetail(zoneId)
        .then((d) => {
          if (!cancelled) setData(d);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Network request failed");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [zoneId]);

  const pts = useMemo(() => {
    if (!data) return [];
    const f = data.forecast;
    if (f.length === 0) return [];
    const max = Math.max(0.1, ...f.map((p) => p.mmHr));
    const W = 100;
    const H = 40;
    const pad = 2;
    return f.map((p, i) => {
      const x = (i / Math.max(1, f.length - 1)) * (W - pad * 2) + pad;
      const y = H - pad - (p.mmHr / max) * (H - pad * 2) - pad;
      return { x, y, p };
    });
  }, [data]);

  const gradientId = `fg-${zoneId ?? "x"}`;

  return (
    <div>
      {!zoneId ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <p className="text-xs text-white/40">{translate(lang, "ops.analytics.forecast.empty")}</p>
        </div>
      ) : loading ? (
        <div className="space-y-2 py-2">
          <div className="skeleton h-3 w-1/3 rounded-full" />
          <div className="skeleton h-16 w-full rounded-xl" />
          <div className="skeleton h-3 w-1/2 rounded-full" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-5 text-center">
          <p className="text-[11px] text-red-300/80">{translate(lang, "ops.error")}</p>
          <p className="mt-1 break-all text-[9px] text-white/30">{error}</p>
        </div>
      ) : pts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <p className="text-xs text-white/40">{translate(lang, "ops.analytics.forecast.none")}</p>
        </div>
      ) : (
        <div>
          <svg viewBox="0 0 100 44" className="h-24 w-full" preserveAspectRatio="none" role="img" aria-label="Forecast">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M ${pts[0].x} 42 L ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${pts[pts.length - 1].x} 42 Z`}
              fill={`url(#${gradientId})`}
            />
            <polyline
              points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={1.4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={1.1} fill={p.p.mmHr >= 65 ? "#f87171" : "#38bdf8"} />
            ))}
          </svg>
          <div className="mt-1 flex items-center justify-between text-[9px] text-white/30">
            <span>{new Date(pts[0].p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="text-white/45">{translate(lang, "ops.analytics.forecast.next")}</span>
            <span>{new Date(pts[pts.length - 1].p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {data && data.rain && (
            <p className="mt-1.5 text-[10px] text-white/40">
              {translate(lang, "ops.analytics.forecast.now")}: {data.rain.nowMmHr.toFixed(1)} mm/h ·{" "}
              {translate(lang, "ops.analytics.forecast.24")}: {data.rain.last24hMm.toFixed(1)} mm
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AnalyticsBoard({
  zones,
  zoneId,
  lang,
}: {
  zones: ZoneSummary[];
  zoneId: string | null;
  lang: Lang;
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { SAFE: 0, WATCH: 0, HIGH: 0, CRITICAL: 0 };
    zones.forEach((z) => {
      c[z.tier] = (c[z.tier] ?? 0) + 1;
    });
    return c;
  }, [zones]);

  const avg = useMemo(() => {
    if (zones.length === 0) return 0;
    return Math.round(zones.reduce((s, z) => s + z.risk, 0) / zones.length);
  }, [zones]);

  const statItems: { key: TKey; value: string; color: string; icon: string }[] = [
    {
      key: "ops.analytics.avg",
      value: String(avg),
      color: avg >= 55 ? TIER_META.HIGH.color : TIER_META.WATCH.color,
      icon: "M12 3v3M12 12v3M4.9 6.5l2.1 2.1M17 11l2.1 2.1M4.9 17.5l2.1-2.1M17 23l2.1-2.1M12 3c3 0 5 2.5 5 5.5S15 14 12 14 7 11.5 7 8.5 9 3 12 3Z",
    },
    {
      key: "ops.analytics.max",
      value: zones.length ? String(Math.max(...zones.map((z) => z.risk))) : "0",
      color: TIER_META.CRITICAL.color,
      icon: "M3 7l6 10 5-7 3 5 4-12",
    },
    {
      key: "ops.analytics.underpass",
      value: String(zones.filter((z) => z.isUnderpass).length),
      color: "#38bdf8",
      icon: "M4 20h16M4 20l1-4M20 20l-1-4M6 16l2-6a4 4 0 0 1 8 0l2 6M8.5 16l1.5-4M15.5 16l-1.5-4",
    },
    {
      key: "ops.analytics.stale",
      value: String(zones.filter((z) => z.stale).length),
      color: "#fbbf24",
      icon: "M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
    },
  ];

  const total = counts.SAFE + counts.WATCH + counts.HIGH + counts.CRITICAL;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1 pt-1">
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
            {translate(lang, "ops.analytics.title")}
          </h2>
          <p className="mt-0.5 text-[11px] text-white/40">{translate(lang, "ops.analytics.sub")}</p>
        </div>
        <span className="chip">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          {translate(lang, "ops.analytics.live")}
        </span>
      </div>

      {/* real-world stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statItems.map((it) => (
          <div key={it.key} className="card relative overflow-hidden p-4">
            <div className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-xl border"
                style={{ borderColor: `${it.color}40`, background: `${it.color}1a`, color: it.color }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path d={it.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/50">
                {translate(lang, it.key)}
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tabular-nums" style={{ color: it.color }}>
                {it.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* charts row */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* distribution donut + legend */}
        <div className="card p-4">
          <h3 className="text-sm font-bold text-white">{translate(lang, "ops.analytics.distribution")}</h3>
          <div className="mt-3 flex items-center gap-4">
            <Donut counts={counts} total={total} />
            <div className="flex-1 space-y-2">
              {TIERS.map((t) => {
                const meta = TIER_META[t];
                const n = counts[t] ?? 0;
                return (
                  <div key={t} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: meta.color, opacity: t === "SAFE" ? 0.6 : 1 }}
                    />
                    <span className="flex-1 text-[11px] text-white/60">{lang === "hi" ? meta.labelHi : meta.label}</span>
                    <span className="font-display text-xs font-bold tabular-nums text-white">{n}</span>
                    <span className="w-10 text-right text-[10px] tabular-nums text-white/35">
                      {total === 0 ? "0%" : `${Math.round(((n || 0) / total) * 100)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* avg gauge */}
        <div className="card p-4">
          <h3 className="text-sm font-bold text-white">{translate(lang, "ops.analytics.gauge")}</h3>
          <div className="mt-3 flex items-end justify-between gap-3">
            <Gauge avg={avg} />
            <p className="max-w-[9rem] text-[11px] leading-relaxed text-white/40">
              {translate(lang, "ops.analytics.gauge.sub")}
            </p>
          </div>
        </div>
      </div>

      {/* risk bars */}
      <div className="card p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-white">{translate(lang, "ops.analytics.bars")}</h3>
          <span className="text-[10px] font-semibold text-white/35">
            {translate(lang, "ops.analytics.bars.sub")}
          </span>
        </div>
        <div className="mt-4">
          <RiskBars zones={zones} />
        </div>
      </div>

      {/* selected zone forecast */}
      <div className="card p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-white">{translate(lang, "ops.analytics.forecast.title")}</h3>
          <span className="text-[10.5px] font-semibold text-white/35">
            {translate(lang, "ops.analytics.forecast.tag")}
          </span>
        </div>
        <div className="mt-3">
          <ForecastChart zoneId={zoneId} lang={lang} />
        </div>
      </div>
    </section>
  );
}

