"use client";
import { WaterWave } from "./WaterWave";
import { useApp } from "@/lib/store";
import { translate } from "@/lib/i18n";

export function CTASection() {
  const { lang } = useApp();

  return (
    <section
      className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden py-28"
      style={{ background: "linear-gradient(180deg, #020814 0%, #030b1a 100%)" }}
    >
      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
            {translate(lang, "landing.cta.eyebrow")}
          </span>
        </div>

        <h2 className="mb-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {translate(lang, "landing.cta.title1")}
          <br />
          <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            {translate(lang, "landing.cta.title2")}
          </span>
        </h2>

        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/50">
          {translate(lang, "landing.cta.sub")}
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="/map"
            className="btn-hero flex items-center gap-3"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
              <path d="M3 15c3.5 0 3.5-3 7-3s3.5 3 7-3 3.5-3 4-3" strokeLinecap="round" />
              <path d="M3 20c3.5 0 3.5-3 7-3s3.5 3 7-3 3.5-3 4-3" strokeLinecap="round" opacity=".5" />
            </svg>
            {translate(lang, "landing.cta.map")}
          </a>
          <a
            href="/ops"
            className="btn-hero-ghost flex items-center gap-3"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <rect x="3" y="3" width="7" height="7" rx="1.6" />
              <rect x="14" y="3" width="7" height="7" rx="1.6" />
              <rect x="3" y="14" width="7" height="7" rx="1.6" />
              <rect x="14" y="14" width="7" height="7" rx="1.6" />
            </svg>
            {translate(lang, "landing.cta.ops")}
          </a>
        </div>

        <p className="mt-8 text-xs text-white/25">
          {translate(lang, "landing.cta.tech")}
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <WaterWave className="w-full" />
      </div>
    </section>
  );
}
