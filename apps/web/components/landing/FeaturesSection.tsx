"use client";

import { useApp } from "@/lib/store";
import { translate, type TKey } from "@/lib/i18n";

const FEATURES: {
  titleKey: TKey;
  descKey: TKey;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
        <path d="M12 2L2 7l10 5 10-5-10-5Z" strokeLinejoin="round" />
        <path d="m2 17 10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "#00b4d8",
    titleKey: "landing.features.f1.title",
    descKey: "landing.features.f1.desc",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
        <path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" />
        <path d="M10 18h4M10.5 21h3" strokeLinecap="round" />
        <path d="M8 8h8M8 12h5" strokeLinecap="round" opacity=".5" />
      </svg>
    ),
    color: "#06d6a0",
    titleKey: "landing.features.f2.title",
    descKey: "landing.features.f2.desc",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
        <path d="M3 15c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 4-3" strokeLinecap="round" />
        <path d="M3 20c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 4-3" strokeLinecap="round" opacity=".5" />
        <circle cx="18" cy="5" r="3" fill="currentColor" opacity=".4" />
        <circle cx="6" cy="12" r="2" fill="currentColor" opacity=".4" />
      </svg>
    ),
    color: "#ffd166",
    titleKey: "landing.features.f3.title",
    descKey: "landing.features.f3.desc",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
        <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.6" />
        <path d="M12 13v3" strokeLinecap="round" />
      </svg>
    ),
    color: "#f4a261",
    titleKey: "landing.features.f4.title",
    descKey: "landing.features.f4.desc",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
        <rect x="3" y="3" width="7" height="7" rx="1.6" />
        <rect x="14" y="3" width="7" height="7" rx="1.6" />
        <rect x="3" y="14" width="7" height="7" rx="1.6" />
        <rect x="14" y="14" width="7" height="7" rx="1.6" />
        <path d="M10 7.5h4M7.5 10v4" strokeLinecap="round" opacity=".5" />
      </svg>
    ),
    color: "#ef476f",
    titleKey: "landing.features.f5.title",
    descKey: "landing.features.f5.desc",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
        <path d="M12 22s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "#a78bfa",
    titleKey: "landing.features.f6.title",
    descKey: "landing.features.f6.desc",
  },
];

export function FeaturesSection() {
  const { lang } = useApp();

  return (
    <section
      id="features"
      className="relative py-28"
      style={{
        background: "linear-gradient(180deg, #001830 0%, #030b1a 100%)",
      }}
    >
      {/* Section header */}
      <div className="mx-auto mb-20 max-w-7xl px-5 text-center lg:px-8">
        <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
          {translate(lang, "landing.features.eyebrow")}
        </span>
        <h2 className="mb-5 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {translate(lang, "landing.features.title1")}
          <br />
          <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            {translate(lang, "landing.features.title2")}
          </span>
        </h2>
        <p className="mx-auto max-w-xl text-lg text-white/45">
          {translate(lang, "landing.features.sub")}
        </p>
      </div>

      {/* Features grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 sm:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl border border-white/8 p-7 transition-all duration-300 hover:border-white/16 hover:-translate-y-1"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
              animationDelay: `${i * 0.08}s`,
            }}
          >
            {/* Top accent line */}
            <div
              className="absolute left-0 right-0 top-0 h-px transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: `linear-gradient(90deg, transparent, ${f.color}80, transparent)` }}
            />

            {/* Icon */}
            <div
              className="mb-5 grid h-14 w-14 place-items-center rounded-xl border"
              style={{
                borderColor: `${f.color}40`,
                background: `${f.color}12`,
                color: f.color,
              }}
            >
              {f.icon}
            </div>

            {/* Content */}
            <h3 className="mb-3 text-lg font-bold text-white">{translate(lang, f.titleKey)}</h3>
            <p className="text-sm leading-relaxed text-white/45">{translate(lang, f.descKey)}</p>

            {/* Corner glow on hover */}
            <div
              className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-20"
              style={{
                background: `radial-gradient(circle, ${f.color}, transparent 70%)`,
                filter: "blur(20px)",
                transform: "translate(30%, 30%)",
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
