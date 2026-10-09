"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { translate } from "@/lib/i18n";
import { TIER_META } from "@/lib/tiers";
import {
  ApiError,
  createReport,
  presignUpload,
  uploadPhoto,
  USE_MOCKS,
  type CreateReportResponse,
} from "@/lib/api";
import type { ReportType, VisionAnalysis } from "@aquashield/types";

type Step = 1 | 2 | 3 | 4; // 4 = result

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

export function ReportFlow() {
  const { lang, reportOpen, reportZoneId, closeReport, zones, openRoute } = useApp();
  const toast = useToast();

  const [step, setStep] = useState<Step>(1);
  const [type, setType] = useState<ReportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateReportResponse | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  // reset state every time the modal opens
  useEffect(() => {
    if (reportOpen) {
      setStep(1);
      setType(null);
      setFile(null);
      setPreview(null);
      setNote("");
      setSubmitting(false);
      setError(null);
      setResult(null);
    }
  }, [reportOpen]);

  if (!reportOpen) return null;

  const zone = zones.find((z) => z.id === reportZoneId) ?? zones[0];

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
    setStep(3);
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
      setStep(4);
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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-md md:items-center">
      <div
        className="glass-strong relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[2rem] shadow-glow animate-sheet-up
                   md:max-h-[90vh] md:w-[520px] md:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-label={translate(lang, "report.title")}
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
            {zone ? (
              <p className="mt-0.5 text-[11px] text-white/40">
                {zone.name} · {translate(lang, "report.zone.auto")}
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
          {/* STEP 1 — type */}
          {step === 1 ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setType(t.id);
                    setStep(2);
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

          {/* STEP 2 — photo */}
          {step === 2 ? (
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
                  onClick={() => setStep(1)}
                  className="text-[11.5px] font-semibold text-white/45 transition hover:text-white/80"
                >
                  ← {translate(lang, "report.back")}
                </button>
              </div>
            </div>
          ) : null}

          {/* STEP 3 — review + note */}
          {step === 3 ? (
            <div className="space-y-4 pt-1">
              {preview ? (
                <div className="relative overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Report preview" className="max-h-56 w-full object-cover" />
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                      setStep(2);
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
                <button onClick={() => setStep(2)} className="btn-ghost">
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

          {/* STEP 4 — result */}
          {step === 4 && result ? (
            <ResultCard result={result} lang={lang} zoneName={zone?.name ?? ""} />
          ) : null}
        </div>

        {step === 4 && result ? (
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

function Stepper({ step, lang }: { step: Step; lang: "en" | "hi" }) {
  const labels =
    lang === "hi"
      ? ["प्रकार", "फ़ोटो", "भेजें", "परिणाम"]
      : ["Type", "Photo", "Submit", "Result"];
  return (
    <div className="flex shrink-0 items-center gap-2 px-5 py-2.5 md:px-6">
      {labels.map((l, i) => {
        const n = (i + 1) as Step;
        const done = step > n;
        const active = step === n;
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div
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
              className={`text-[10.5px] font-semibold transition ${
                active ? "text-white/80" : done ? "text-white/45" : "text-white/30"
              }`}
            >
              {l}
            </span>
            {i < labels.length - 1 ? <span className="h-px flex-1 bg-white/8" /> : null}
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
