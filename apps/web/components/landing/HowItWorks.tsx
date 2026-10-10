"use client";

import { useApp } from "@/lib/store";
import { translate, type TKey } from "@/lib/i18n";

const STEPS: {
  num: string;
  color: string;
  icon: React.ReactNode;
  titleKey: TKey;
  descKey: TKey;
  tagKey: TKey;
}[] = [
  {
    num: "01",
    color: "#00b4d8",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
        <path d="M3 15c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 4-3" strokeLinecap="round" />
        <path d="M3 20c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 4-3" strokeLinecap="round" opacity=".5" />
        <circle cx="17" cy="5" r="2" />
        <circle cx="7" cy="12" r="1.5" fill="currentColor" opacity=".6" />
      </svg>
    ),
    titleKey: "landing.how.s1.title",
    descKey: "landing.how.s1.desc",
    tagKey: "landing.how.s1.tag",
  },
  {
    num: "02",
    color: "#06d6a0",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
        <path d="M12 2L2 7l10 5 10-5-10-5Z" strokeLinejoin="round" />
        <path d="m2 17 10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    titleKey: "landing.how.s2.title",
    descKey: "landing.how.s2.desc",
    tagKey: "landing.how.s2.tag",
  },
  {
    num: "03",
    color: "#ffd166",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
        <rect x="3" y="3" width="7" height="7" rx="1.6" />
        <rect x="14" y="3" width="7" height="7" rx="1.6" />
        <rect x="3" y="14" width="7" height="7" rx="1.6" />
        <rect x="14" y="14" width="7" height="7" rx="1.6" />
      </svg>
    ),
    titleKey: "landing.how.s3.title",
    descKey: "landing.how.s3.desc",
    tagKey: "landing.how.s3.tag",
  },
  {
    num: "04",
    color: "#f4a261",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
        <path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" />
        <path d="M10 18h4M10.5 21h3" strokeLinecap="round" />
        <path d="M9 9h6" strokeLinecap="round" opacity=".5" />
      </svg>
    ),
    titleKey: "landing.how.s4.title",
    descKey: "landing.how.s4.desc",
    tagKey: "landing.how.s4.tag",
  },
  {
    num: "05",
    color: "#ef476f",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
        <path d="m4 12.5 16-8-6 16-2.5-6L4 12.5Z" strokeLinejoin="round" />
        <path d="M3 12h18" strokeLinecap="round" opacity=".4" />
      </svg>
    ),
    titleKey: "landing.how.s5.title",
    descKey: "landing.how.s5.desc",
    tagKey: "landing.how.s5.tag",
  },
];

export function HowItWorks() {
  const { lang } = useApp();

  return (
    <section
      id="how-it-works"
      className="relative py-28"
      style={{ background: "#030b1a" }}
    >
      {/* Left-right decorative lines */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-1/2 h-px w-32 bg-gradient-to-r from-transparent to-cyan-400/20" />
        <div className="absolute right-0 top-1/2 h-px w-32 bg-gradient-to-l from-transparent to-cyan-400/20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {/* Header */}
        <div className="mb-20 text-center">
          <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
            {translate(lang, "landing.how.eyebrow")}
          </span>
          <h2 className="mb-5 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {translate(lang, "landing.how.title")}
          </h2>
          <p className="mx-auto max-w-xl text-lg text-white/45">
            {translate(lang, "landing.how.sub")}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-8 top-0 bottom-0 w-px hidden md:block"
            style={{
              background: "linear-gradient(180deg, transparent 0%, rgba(0,180,216,0.3) 10%, rgba(0,180,216,0.3) 90%, transparent 100%)",
            }}
          />

          <div className="space-y-8">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="relative flex flex-col gap-6 md:flex-row md:items-start md:gap-10"
              >
                {/* Left: number + icon */}
                <div className="relative z-10 flex shrink-0 flex-col items-center md:items-start">
                  <div
                    className="mb-3 grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 md:mb-4"
                    style={{
                      borderColor: `${step.color}60`,
                      background: `${step.color}10`,
                      color: step.color,
                    }}
                  >
                    {step.icon}
                  </div>
                  <span
                    className="font-display text-3xl font-black tabular-nums leading-none"
                    style={{ color: `${step.color}30` }}
                  >
                    {step.num}
                  </span>
                </div>

                {/* Right: content */}
                <div className="flex-1 pt-1 md:pt-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{translate(lang, step.titleKey)}</h3>
                    <span
                      className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        color: step.color,
                        borderColor: `${step.color}50`,
                        background: `${step.color}10`,
                      }}
                    >
                      {translate(lang, step.tagKey)}
                    </span>
                  </div>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/45">{translate(lang, step.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
