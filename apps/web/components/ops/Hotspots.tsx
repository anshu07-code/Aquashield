"use client";

import type { ZoneSummary } from "@aquashield/types";
import { TIER_META } from "@/lib/tiers";
import { translate, type Lang } from "@/lib/i18n";
import { etaText, relTime } from "@/lib/format";

export function Hotspots({
  zones,
  lang,
  selectedId,
  onSelect,
}: {
  zones: ZoneSummary[];
  lang: Lang;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const ranked = [...zones].sort((a, b) => b.risk - a.risk);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-white/8 px-4 py-3.5">
        <div>
          <h3 className="text-sm font-bold text-white">{translate(lang, "ops.hotspots")}</h3>
          <p className="mt-0.5 text-[10.5px] text-white/40">{translate(lang, "ops.hotspots.sub")}</p>
        </div>
        <span className="text-[10.5px] font-semibold text-white/35">{ranked.length}</span>
      </div>
      <div className="divide-y divide-white/6">
        {ranked.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="skeleton h-10 w-10 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-1/2 rounded-full" />
                  <div className="skeleton h-2.5 w-1/3 rounded-full" />
                </div>
              </div>
            ))
          : ranked.map((z, i) => {
              const meta = TIER_META[z.tier];
              const active = z.id === selectedId;
              return (
                <button
                  key={z.id}
                  onClick={() => onSelect(z.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                    active ? "bg-aqua-400/[0.07]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="font-display w-6 shrink-0 text-center text-sm font-bold text-white/30">
                    {i + 1}
                  </span>
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border font-display text-sm font-bold tabular-nums"
                    style={{
                      color: meta.color,
                      borderColor: `${meta.color}45`,
                      background: meta.soft,
                      boxShadow: z.risk >= 75 ? meta.glow : undefined,
                    }}
                  >
                    {z.risk}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white/90">{z.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-white/40">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold"
                        style={{ color: meta.color, background: meta.soft }}
                      >
                        {lang === "hi" ? meta.labelHi : meta.label}
                      </span>
                      {z.etaMin !== null ? (
                        <span className="truncate" style={{ color: z.etaMin === 0 ? meta.color : undefined }}>
                          {etaText(z.etaMin, lang)}
                        </span>
                      ) : (
                        <span className="truncate">{relTime(z.updatedAt)}</span>
                      )}
                    </span>
                  </span>
                  <span
                    className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/8 sm:block"
                    title="Flood Risk Index"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${z.risk}%`, background: meta.color, transition: "width .6s ease" }}
                    />
                  </span>
                </button>
              );
            })}
      </div>
    </div>
  );
}
