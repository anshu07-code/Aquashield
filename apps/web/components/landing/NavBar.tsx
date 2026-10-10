"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { LANGS, translate } from "@/lib/i18n";

export function NavBar() {
  const { lang, setLang, zones } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const criticalCount = zones.filter(z => z.tier === "CRITICAL").length;

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? "rgba(3,11,26,0.95)"
          : "transparent",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.06)"
          : "none",
        backdropFilter: scrolled ? "blur(20px)" : "none",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg width="38" height="38" viewBox="0 0 44 44" fill="none">
              <defs>
                <radialGradient id="nav-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0096c7" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0096c7" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="22" cy="20" r="18" fill="url(#nav-glow)" />
              <path d="M22 5C14 5 8 8 8 8v11c0 9 7 14 14 20 7-6 14-11 14-20V8s-6-3-14-3Z" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
              <path d="M22 10.5C26.4 16.8 29.5 21 29.5 24.8a7.5 7.5 0 0 1-15 0c0-3.8 3.1-8 7.5-14.3Z" fill="url(#aqua-grad)" />
              <defs>
                <linearGradient id="aqua-grad" x1="11" y1="10" x2="33" y2="25" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00e5ff" />
                  <stop offset="100%" stopColor="#005f7f" />
                </linearGradient>
              </defs>
              <path d="M22 17v6M19.5 21.5l2.5 2.5 2.5-2.5" stroke="#001a25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {criticalCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </span>
            )}
          </div>
          <div>
            <span className="font-display text-lg font-bold text-white">AquaShield</span>
            <span className="ml-2 hidden text-[10px] font-medium tracking-widest text-cyan-400 sm:inline">JALRAKSHAK</span>
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {[
            { label: "Home", id: "hero" },
            { label: "Features", id: "features" },
            { label: "How it Works", id: "how-it-works" },
            { label: "Live Map", id: "live-demo" },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{ color: activeSection === item.id ? "#00e5ff" : "rgba(255,255,255,0.6)" }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right: lang + CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  lang === l.code ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => scrollTo("live-demo")}
            className="hidden items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition-all hover:bg-cyan-400/20 sm:flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M3 15c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 4-3" strokeLinecap="round" />
              <path d="M3 20c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 4-3" strokeLinecap="round" opacity=".5" />
            </svg>
            Open Map
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 lg:hidden"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-5 w-5">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-5 w-5">
                <path d="M4 8h16M4 16h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="border-t border-white/6 px-5 py-4 lg:hidden"
          style={{ background: "rgba(3,11,26,0.98)" }}
        >
          {[
            { label: "Home", id: "hero" },
            { label: "Features", id: "features" },
            { label: "How it Works", id: "how-it-works" },
            { label: "Live Map", id: "live-demo" },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="block w-full py-3 text-left text-sm font-medium text-white/70"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => scrollTo("live-demo")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300"
          >
            Open Live Map
          </button>
        </div>
      )}
    </nav>
  );
}
