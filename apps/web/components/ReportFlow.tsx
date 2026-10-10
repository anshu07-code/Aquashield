"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { translate, type Lang, type TKey } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";
import { distanceM } from "@/lib/format";
import { EmptyState, SkeletonRows } from "@/components/ui/Feedback";
import {
  ApiError,
  createReport,
  presignUpload,
  uploadPhoto,
  USE_MOCKS,
  type CreateReportResponse,
} from "@/lib/api";
import type { ReportType, VisionAnalysis } from "@aquashield/types";

/** 1 = zone, 2 = type, 3 = photo, 4 = submit, 5 = result */
type Step = 1 | 2 | 3 | 4 | 5;

/** how the initial zone preselection was made */
type ZoneOrigin = "context" | "nearest" | "picked" | null;

const STEP_LABELS: { n: Step; key: TKey }[] = [
  { n: 1, key: "report.step.zone" },
  { n: 2, key: "report.step.type" },
  { n: 3, key: "report.step.photo" },
  { n: 4, key: "report.step.submit" },
  { n: 5, key: "report.step.result" },
];

const TYPES = [
  { id: "flooding", key: "report.type.flooding", emoji: "🌊", hint: "Water on the road" },
  { id: "blocked_drain", key: "report.type.blocked_drain", emoji: "🧹", hint: "Inlet choked" },
  { id: "overflow", key: "report.type.overflow", emoji: "🚱", hint: "Drain overflowing" },
  { id: "leak", key: "report.type.leak", emoji: "💧", hint: "Pipe or tap leak" },
] as const;

const DEPTH_KEYS: Record<
  VisionAnalysis["waterDepthTier"],
  "depth.none" | "depth.ankle" | "depth.knee" | "depth.waist" | "depth.vehicle_submerged"
> = {
  none: "depth.none",
  ankle: "depth.ankle",
  knee: "depth.knee",
  waist: "depth.waist",
  vehicle_submerged: "depth.vehicle_submerged",
};

/** compact distance for the zone picker rows: "450 m" / "1.2 km" */
function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function ReportFlow() {
  const {
    lang,
    reportOpen,
    reportZoneId,
    closeReport,
    zones,
    zonesLoading,
    zonesError,
    reloadZones,
    openRoute,
    userLocation,
    locationDenied,
    locate,
  } = useApp();
  const toast = useToast();

  const [step, setStep] = useState<Step>(1);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [zoneOrigin, setZoneOrigin] = useState<ZoneOrigin>(null);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [type, setType] = useState<ReportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateReportResponse | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  /** ref mirror of zoneOrigin — effects that run in the same pass as the open
   *  effect must see the value it just wrote, not the previous session's. */
  const originRef = useRef<ZoneOrigin>(null);
  const askedLocationRef = useRef(false);

  const zone = zoneId ? (zones.find((z) => z.id === zoneId) ?? null) : null;

  /** zone nearest to the user, from the already-loaded zones list (no new API call) */
  const nearestId = useMemo(() => {
    if (!userLocation || zones.length === 0) return null;
    let best: string | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const z of zones) {
      const d = distanceM(userLocation, z);
      if (d < bestD) {
        bestD = d;
        best = z.id;
      }
    }
    return best;
  }, [userLocation, zones]);

  const query2 = query.trim().toLowerCase();
  const rows = useMemo(() => {
    const filtered = query2 ? zones.filter((z) => z.name.toLowerCase().includes(query2)) : [...zones];
    const mapped = filtered.map((z) => ({
      zone: z,
      dist: userLocation ? distanceM(userLocation, z) : null,
    }));
    if (userLocation) mapped.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    return mapped;
  }, [zones, query2, userLocation]);

  // reset state every time the modal opens
  useEffect(() => {
    if (!reportOpen) return;
    setStep(1);
    setType(null);
    setFile(null);
    setPreview(null);
    setNote("");
    setSubmitting(false);
    setError(null);
    setResult(null);
    setQuery("");
    setActiveIdx(0);
    setKeyboardInset(0);
    askedLocationRef.current = false;

    // preselect: zone from the sheet/map tap → nearest zone → nothing
    if (reportZoneId && zones.some((z) => z.id === reportZoneId)) {
      originRef.current = "context";
      setZoneOrigin("context");
      setZoneId(reportZoneId);
    } else if (userLocation && nearestId) {
      originRef.current = "nearest";
      setZoneOrigin("nearest");
      setZoneId(nearestId);
    } else {
      originRef.current = null;
      setZoneOrigin(null);
      setZoneId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportOpen]);

  // resolve the preselection if zones or the geolocation fix arrive after opening
  useEffect(() => {
    if (!reportOpen || step !== 1) return;
    const origin = originRef.current;
    if (origin === "context" || origin === "picked") return;
    if (origin === "nearest" && zoneId) return;

    if (reportZoneId && zoneId !== reportZoneId && zones.some((z) => z.id === reportZoneId)) {
      originRef.current = "context";
      setZoneOrigin("context");
      setZoneId(reportZoneId);
      return;
    }
    if (userLocation && nearestId) {
      originRef.current = "nearest";
      setZoneOrigin("nearest");
      setZoneId(nearestId);
      return;
    }
    if (!userLocation && !locationDenied && !askedLocationRef.current) {
      askedLocationRef.current = true;
      locate();
    }
  }, [
    reportOpen,
    step,
    reportZoneId,
    zoneId,
    zones,
    userLocation,
    nearestId,
    locationDenied,
    locate,
  ]);

  // keep the keyboard cursor index inside the (filtered) list
  useEffect(() => {
    setActiveIdx((i) => (rows.length === 0 ? 0 : Math.min(i, rows.length - 1)));
  }, [rows.length]);

  // focus the search box whenever step 1 is on screen
  useEffect(() => {
    if (!reportOpen || step !== 1) return;
    const t = setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(t);
  }, [reportOpen, step]);

  // lock body scroll behind the modal (and restore it on close)
  useEffect(() => {
    if (!reportOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [reportOpen]);

  // lift the sheet above the on-screen keyboard so the list stays reachable
  useEffect(() => {
    if (!reportOpen || typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(overlap > 80 ? overlap : 0);
    };
    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, [reportOpen]);

  if (!reportOpen) return null;

  const pick = (id: string) => {
    setZoneId(id);
    originRef.current = "picked";
    setZoneOrigin("picked");
  };

  const scrollRowIntoView = (i: number) => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${i}"]`);
    if (!el) return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (rows.length === 0) return;
      e.preventDefault();
      setActiveIdx((prev) => {
        const next =
          e.key === "ArrowDown"
            ? (prev + 1) % rows.length
            : (prev - 1 + rows.length) % rows.length;
        scrollRowIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = rows[activeIdx];
      if (item) pick(item.zone.id);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setActiveIdx(0);
    searchRef.current?.focus();
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("JPEG, PNG or WebP only.");
      toast.error("Unsupported file type", "Use JPEG, PNG or WebP.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Max photo size is 5 MB.");
      toast.error("Photo too large", "Max 5 MB.");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep(4);
  };

  const submit = async () => {
    if (!type || !file || !zone) return;
    setSubmitting(true);
    setError(null);
    try {
      const contentType = file.type as "image/jpeg" | "image/png" | "image/webp";
      const presign = await presignUpload(contentType);
      const uploaded = await uploadPhoto(presign.uploadUrl, file, contentType);
      if (!uploaded && !USE_MOCKS) {
        throw new ApiError("UPLOAD_FAILED", "Photo upload failed. Please try again.", 0);
      }
      if (!uploaded && USE_MOCKS) {
        toast.info("Photo upload simulated", "The mock backend has no bucket.");
      }
      const res = await createReport({
        zoneId: zone.id,
        lat: zone.lat,
        lng: zone.lng,
        type,
        imageKey: presign.key,
        note: note.trim() || undefined,
      });
      setResult(res);
      setStep(5);
      toast.success(translate(lang, "report.done"), res.report.status === "verified" ? translate(lang, "zone.verified") : undefined);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Network error";
      setError(msg);
      toast.error(translate(lang, "report.error"), msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-md md:items-center"
      style={{ paddingBottom: keyboardInset }}
    >
      <div
        className="glass-strong relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] shadow-glow animate-sheet-up
                   md:max-h-[88dvh] md:w-[520px] md:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-label={translate(lang, "report.title")}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            closeReport();
          }
        }}
      >
        <div className="flex shrink-0 justify-center pt-2.5 md:pt-0">
          <span className="h-1.5 w-12 rounded-full bg-white/20" />
        </div>

        {/* header */}
        <div className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-3 md:px-6 md:pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold leading-tight tracking-tight text-white md:text-xl">
              {translate(lang, "report.title")}
            </h2>
            {step > 1 && step < 5 && zone ? (
              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-white/40">
                <span className="truncate">{zone.name}</span>
                {zoneOrigin === "nearest" ? (
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-px text-[9.5px] font-semibold text-white/45">
                    {translate(lang, "report.zone.auto")}
                  </span>
                ) : null}
                <button
                  onClick={() => setStep(1)}
                  className="shrink-0 font-semibold text-aqua-300 underline-offset-2 transition hover:text-aqua-200 hover:underline"
                  aria-label={`${translate(lang, "report.zone.change")} — ${zone.name}`}
                >
                  {translate(lang, "report.zone.change")}
                </button>
              </p>
            ) : null}
          </div>
          <button
            onClick={closeReport}
            aria-label={translate(lang, "report.cancel")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/55 transition hover:bg-white/12 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <Stepper step={step} lang={lang} />

        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6 md:px-6">
          {/* STEP 1 — zone picker */}
          {step === 1 ? (
            <div className="pt-1">
              <h3 className="font-display text-base font-bold text-white">
                {translate(lang, "report.zone.title")}
              </h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
                {translate(lang, "report.zone.sub")}
              </p>

              <div className="relative mt-3">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-expanded={rows.length > 0}
                  aria-controls="report-zone-list"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    rows[activeIdx] ? `report-zone-opt-${rows[activeIdx].zone.id}` : undefined
                  }
                  aria-label={translate(lang, "report.zone.search.label")}
                  placeholder={translate(lang, "report.zone.search")}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIdx(0);
                  }}
                  onKeyDown={onSearchKeyDown}
                  autoComplete="off"
                  spellCheck={false}
                  className="input py-3 pl-11 pr-10"
                />
                {query ? (
                  <button
                    onClick={clearSearch}
                    aria-label={translate(lang, "report.zone.clear")}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3.5 w-3.5">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : null}
              </div>

              {zonesLoading && zones.length === 0 ? (
                <div className="mt-3" aria-busy="true">
                  <p className="sr-only">{translate(lang, "report.zone.loading")}</p>
                  <SkeletonRows rows={4} />
                </div>
              ) : zonesError && zones.length === 0 ? (
                <div className="card mt-3 p-4 text-center">
                  <p className="text-xs font-semibold text-rose-300">
                    {translate(lang, "report.zone.error")}
                  </p>
                  <p className="mt-1 text-[11px] text-white/45">{zonesError}</p>
                  <button onClick={reloadZones} className="btn-ghost mt-3 text-xs">
                    {translate(lang, "report.zone.retry")}
                  </button>
                </div>
              ) : rows.length === 0 ? (
                <div className="mt-1">
                  <EmptyState
                    title={translate(lang, "report.zone.empty")}
                    sub={translate(lang, "report.zone.empty.sub")}
                    action={
                      <button onClick={clearSearch} className="btn-ghost text-xs">
                        {translate(lang, "report.zone.clear")}
                      </button>
                    }
                  />
                </div>
              ) : (
                <ul
                  ref={listRef}
                  id="report-zone-list"
                  role="listbox"
                  aria-label={translate(lang, "report.zone.list")}
                  className="no-scrollbar mt-3 max-h-[40vh] space-y-1.5 overflow-y-auto overscroll-contain pr-1"
                >
                  {rows.map((r, i) => {
                    const z = r.zone;
                    const meta = TIER_META[z.tier];
                    const selected = z.id === zoneId;
                    const isActive = i === activeIdx;
                    return (
                      <li
                        key={z.id}
                        id={`report-zone-opt-${z.id}`}
                        data-idx={i}
                        role="option"
                        aria-selected={selected}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => pick(z.id)}
                        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors duration-150 ${
                          selected
                            ? "border-aqua-400/60 bg-aqua-400/[0.10]"
                            : isActive
                              ? "border-white/25 bg-white/[0.07]"
                              : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                        }`}
                      >
                        {/* selection marker — a check, not colour alone */}
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                            selected
                              ? "border-aqua-300 bg-aqua-400 text-slate-950"
                              : "border-white/25 bg-white/[0.04]"
                          }`}
                        >
                          {selected ? (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={3.6}
                              className="h-3 w-3"
                            >
                              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : null}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p
                              className={`truncate text-[12.5px] font-bold ${
                                selected ? "text-white" : "text-white/85"
                              }`}
                            >
                              {z.name}
                            </p>
                            {z.id === nearestId ? (
                              <span className="shrink-0 rounded-full border border-aqua-400/35 bg-aqua-400/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-aqua-200">
                                {translate(lang, "report.zone.nearest")}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: meta.color }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                              {lang === "hi" ? meta.labelHi : meta.label}
                            </span>
                            {r.dist !== null ? (
                              <span className="text-[10px] font-medium tabular-nums text-white/35">
                                {formatDist(r.dist)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <span
                          className="grid h-8 min-w-[2rem] shrink-0 place-items-center rounded-lg border px-1.5 text-[12px] font-bold tabular-nums"
                          style={{
                            color: meta.color,
                            borderColor: `${meta.color}50`,
                            background: `${meta.color}15`,
                          }}
                          aria-label={`${z.risk}`}
                        >
                          {z.risk}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {/* STEP 2 — type */}
          {step === 2 ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setType(t.id);
                    setStep(3);
                  }}
                  className="card group flex flex-col items-start gap-2 p-4 text-left transition-all duration-200 hover:border-aqua-400/40 hover:bg-aqua-400/[0.06] active:scale-[0.97]"
                >
                  <span className="text-3xl transition-transform duration-200 group-hover:scale-110">
                    {t.emoji}
                  </span>
                  <span className="text-sm font-bold text-white">{translate(lang, t.key)}</span>
                  <span className="text-[10.5px] text-white/40">{t.hint}</span>
                </button>
              ))}
            </div>
          ) : null}

          {/* STEP 3 — photo */}
          {step === 3 ? (
            <div className="space-y-4 pt-1">
              <p className="text-[11.5px] leading-relaxed text-white/45">
                {translate(lang, "report.photo.hint")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="btn-primary flex-1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
                    <path d="M3 8.5A2 2 0 0 1 5 6.5h1.6l1-2h4.8l1 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="3.4" />
                  </svg>
                  {translate(lang, "report.photo.take")}
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn-ghost flex-1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} className="h-4 w-4">
                    <path d="M4 16.5V7a2 2 0 0 1 2-2h2l1.5-2h5L16 5h2a2 2 0 0 1 2 2v9.5" strokeLinejoin="round" />
                    <path d="m4 16.5 5-5 4 4 2-2 5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {translate(lang, "report.photo.choose")}
                </button>
              </div>
              {error ? <p className="text-[11.5px] font-medium text-rose-300">{error}</p> : null}
              <div className="pt-1">
                <button
                  onClick={() => setStep(2)}
                  className="text-[11.5px] font-semibold text-white/45 transition hover:text-white/80"
                >
                  ← {translate(lang, "report.back")}
                </button>
              </div>
            </div>
          ) : null}

          {/* STEP 4 — review + note */}
          {step === 4 ? (
            <div className="space-y-4 pt-1">
              {preview ? (
                <div className="relative overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Report preview" className="max-h-56 w-full object-cover" />
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                      setStep(3);
                    }}
                    className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur transition hover:bg-black/80"
                  >
                    {translate(lang, "report.photo.retaket")}
                  </button>
                </div>
              ) : null}
              <div>
                <span className="label">{translate(lang, "report.note")}</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 280))}
                  placeholder={translate(lang, "report.note.ph")}
                  rows={3}
                  className="input mt-1.5 resize-none"
                />
                <p className="mt-1 text-right text-[10px] tabular-nums text-white/30">{note.length}/280</p>
              </div>
              {error ? <p className="text-[11.5px] font-medium text-rose-300">{error}</p> : null}
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(3)} className="btn-ghost">
                  {translate(lang, "report.back")}
                </button>
                <button
                  onClick={submit}
                  disabled={submitting || !file}
                  className="btn-primary flex-1"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                      {translate(lang, "report.submitting")}
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                        <path d="m4 12.5 5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {translate(lang, "report.submit")}
                    </>
                  )}
                </button>
              </div>
              {USE_MOCKS ? (
                <p className="text-center text-[10.5px] text-white/30">{translate(lang, "report.simulated")}</p>
              ) : null}
            </div>
          ) : null}

          {/* STEP 5 — result */}
          {step === 5 && result ? (
            <ResultCard result={result} lang={lang} zoneName={zone?.name ?? ""} />
          ) : null}
        </div>

        {/* STEP 1 footer — Continue (disabled until a zone is chosen) */}
        {step === 1 ? (
          <div
            className="shrink-0 border-t border-white/8 bg-black/25 px-5 py-3.5 md:px-6"
            style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
          >
            <button
              onClick={() => setStep(2)}
              disabled={!zone}
              className="btn-primary w-full"
            >
              {translate(lang, "report.zone.continue")}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-4 w-4">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {!zone ? (
              <p className="mt-2 text-center text-[10.5px] font-medium text-white/40">
                {translate(lang, "report.zone.hint")}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 5 && result ? (
          <div className="shrink-0 border-t border-white/8 bg-black/25 px-5 py-3.5 md:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  closeReport();
                  if (zone) openRoute({ lat: zone.lat, lng: zone.lng });
                }}
                className="btn-ghost flex-1"
              >
                {translate(lang, "zone.route")}
              </button>
              <button onClick={closeReport} className="btn-primary flex-1">
                {translate(lang, "report.another")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function Stepper({ step, lang }: { step: Step; lang: Lang }) {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 px-5 py-2.5 md:gap-2.5 md:px-6"
      role="group"
      aria-label={`${translate(lang, "report.step")} ${step} ${translate(lang, "report.of")} ${STEP_LABELS.length}`}
    >
      {STEP_LABELS.map((l, i) => {
        const n = l.n;
        const done = step > n;
        const active = step === n;
        return (
          <div key={l.key} className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
            <div
              aria-current={active ? "step" : undefined}
              title={translate(lang, l.key)}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-all duration-300 ${
                done
                  ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                  : active
                    ? "border-aqua-400/60 bg-aqua-400/15 text-aqua-200"
                    : "border-white/10 bg-white/[0.04] text-white/35"
              }`}
            >
              {done ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} className="h-3.5 w-3.5">
                  <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                n
              )}
            </div>
            <span
              className={`sr-only text-[10px] font-semibold transition sm:not-sr-only md:text-[10.5px] ${
                active ? "text-white/80" : done ? "text-white/45" : "text-white/30"
              }`}
            >
              {translate(lang, l.key)}
            </span>
            {i < STEP_LABELS.length - 1 ? <span className="h-px min-w-1.5 flex-1 bg-white/8" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function ResultCard({
  result,
  lang,
  zoneName,
}: {
  result: CreateReportResponse;
  lang: "en" | "hi";
  zoneName: string;
}) {
  const report = result.report;
  const vision = report.vision;
  const [oldRisk, setOldRisk] = useState(result.previousRisk);

  // animate the risk number old → new
  useEffect(() => {
    const from = result.previousRisk;
    const to = result.updated.risk;
    if (from === to) return;
    const start = performance.now();
    const dur = 1100;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setOldRisk(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result.previousRisk, result.updated.risk]);

  const meta = TIER_META[result.updated.tier];
  const flags: string[] = [];
  if (vision.blockedDrain) flags.push(translate(lang, "report.flags.blockedDrain"));
  if (vision.debrisOrWasteObstruction) flags.push(translate(lang, "report.flags.debris"));
  if (vision.vehiclesStranded) flags.push(translate(lang, "report.flags.stranded"));
  if (!vision.isRoadScene) flags.push(translate(lang, "report.flags.notroad"));

  return (
    <div className="space-y-4 pt-1">
      {/* success header */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] p-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-400/35 bg-emerald-400/15 text-emerald-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} className="h-6 w-6 animate-pop">
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white">{translate(lang, "report.done")}</p>
          <p className="text-[11px] text-white/50">{translate(lang, "report.done.sub")}</p>
        </div>
        <span
          className={`ml-auto shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            report.status === "verified"
              ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
              : "border-amber-400/40 bg-amber-400/15 text-amber-300"
          }`}
        >
          {translate(lang, report.status === "verified" ? "zone.verified" : report.status === "rejected" ? "zone.rejected" : report.status === "needs_review" ? "zone.needsReview" : "zone.unverified")}
        </span>
      </div>

      {/* AI analysis */}
      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-aqua-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-4 w-4">
              <path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" />
              <path d="M10 18h4M10.5 21h3" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-sm font-bold text-white">Bedrock vision</span>
          <span className="ml-auto rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold text-white/45">
            Amazon Bedrock
          </span>
        </div>

        {vision.waterDepthTier !== "none" ? (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
              {translate(lang, "report.depth")}
            </span>
            <span className="font-display text-lg font-bold text-sky-300">
              {translate(lang, DEPTH_KEYS[vision.waterDepthTier])}
            </span>
          </div>
        ) : null}

        <div className="space-y-2.5">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/55">{translate(lang, "report.confidence")}</span>
              <span className="text-[11px] font-bold tabular-nums text-aqua-300">
                {Math.round(vision.confidence * 100)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-aqua-300"
                style={{ width: `${Math.round(vision.confidence * 100)}%`, transition: "width .8s cubic-bezier(.22,1,.36,1)" }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/55">{translate(lang, "zone.trust")}</span>
              <span className="text-[11px] font-bold tabular-nums text-emerald-300">
                {Math.round(report.trust * 100)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                style={{ width: `${Math.round(report.trust * 100)}%`, transition: "width .9s cubic-bezier(.22,1,.36,1)" }}
              />
            </div>
          </div>
        </div>

        {flags.length > 0 ? (
          <div className="mt-3.5">
            <span className="label">{translate(lang, "report.flags")}</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {flags.map((f, i) => (
                <span key={i} className="chip">
                  {f}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {vision.explanation ? (
          <p className="mt-3.5 border-l-2 border-aqua-400/40 pl-3 text-[11.5px] italic leading-relaxed text-white/55">
            “{vision.explanation}”
          </p>
        ) : null}
      </div>

      {/* risk change */}
      <div className="card p-4">
        <span className="label">{translate(lang, "report.riskChange")}</span>
        <div className="mt-3 flex items-center gap-3">
          <div className="text-center">
            <p className="font-display text-3xl font-bold tabular-nums text-white/40">{result.previousRisk}</p>
            <p className="text-[9px] uppercase tracking-wider text-white/30">Before</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth={2.4} className="h-6 w-6 shrink-0">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-center">
            <p className="font-display text-4xl font-bold tabular-nums" style={{ color: meta.color }}>
              {oldRisk}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-white/30">{zoneName}</p>
          </div>
          <div className="ml-auto text-right">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: meta.color, borderColor: `${meta.color}45`, background: meta.soft }}
            >
              {lang === "hi" ? meta.labelHi : meta.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
