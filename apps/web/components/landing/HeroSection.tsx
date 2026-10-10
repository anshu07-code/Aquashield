"use client";

import { useEffect, useRef } from "react";
import { WaterWave } from "./WaterWave";

function WaterParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];

    class Particle {
      x: number;
      y: number;
      radius: number;
      speedY: number;
      speedX: number;
      opacity: number;
      wobble: number;
      wobbleSpeed: number;

      constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = h + Math.random() * 60;
        this.radius = Math.random() * 2.5 + 0.8;
        this.speedY = -(Math.random() * 0.4 + 0.15);
        this.speedX = (Math.random() - 0.5) * 0.15;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.02 + 0.008;
      }

      update(w: number, h: number) {
        this.y += this.speedY;
        this.wobble += this.wobbleSpeed;
        this.x += this.speedX + Math.sin(this.wobble) * 0.15;
        if (this.y < -20) {
          this.y = h + Math.random() * 30;
          this.x = Math.random() * w;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        const grad = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.radius
        );
        grad.addColorStop(0, "#00e5ff");
        grad.addColorStop(0.5, "#0096c7");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    // spawn particles
    for (let i = 0; i < 60; i++) {
      particles.push(new Particle(canvas.width, canvas.height));
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      });
      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: "none" }}
    />
  );
}

export function HeroSection() {
  const scrollToDemo = () => {
    document.getElementById("live-demo")?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #030b1a 0%, #040e1f 40%, #061525 70%, #001830 100%)",
      }}
    >
      {/* Animated particles behind hero text */}
      <WaterParticles />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(0,150,199,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-5 text-center sm:px-8">
        {/* Badge */}
        <div
          className="mx-auto mb-8 inline-flex animate-fade-in items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          <span className="text-xs font-bold tracking-widest text-cyan-300">DELHI FLOOD RISK SYSTEM</span>
        </div>

        {/* Main headline */}
        <h1
          className="mx-auto mb-6 max-w-4xl font-display text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
          style={{ animationDelay: "0.2s" }}
        >
          Hyperlocal Flood
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Early Warning System
          </span>
        </h1>

        {/* Sub headline */}
        <p
          className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-white/50 sm:text-xl"
          style={{ animationDelay: "0.3s" }}
        >
          AI-powered real-time monitoring of Delhi&apos;s flood-prone underpasses.
          Predict. Verify. Protect.
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          style={{ animationDelay: "0.4s" }}
        >
          <button
            onClick={scrollToDemo}
            className="group flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold text-slate-950 transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #00e5ff 0%, #0096c7 50%, #005577 100%)",
              boxShadow: "0 8px 32px -4px rgba(0,180,216,0.5), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
              <path d="M3 15c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 4-3" strokeLinecap="round" />
              <path d="M3 20c3.5 0 3.5-3 7-3s3.5 3 7 3 3.5-3 4-3" strokeLinecap="round" opacity=".5" />
            </svg>
            Explore Live Map
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 transition-transform group-hover:translate-x-1">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={scrollToFeatures}
            className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-base font-bold text-white transition-all hover:bg-white/10 hover:border-white/30"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M12 3a5 5 0 0 0-3.2 8.8c.5.5.8 1.1.9 1.7h4.6c.1-.6.4-1.2.9-1.7A5 5 0 0 0 12 3Z" strokeLinejoin="round" />
              <path d="M10 18h4M10.5 21h3" strokeLinecap="round" />
            </svg>
            View Features
          </button>
        </div>

        {/* Tech badge strip */}
        <div
          className="mt-16 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "0.5s" }}
        >
          {[
            { name: "AWS Lambda", icon: "◇" },
            { name: "Amazon Bedrock", icon: "◆" },
            { name: "DynamoDB", icon: "◈" },
            { name: "MapLibre", icon: "▲" },
            { name: "Open-Meteo", icon: "●" },
            { name: "Next.js PWA", icon: "■" },
          ].map(tech => (
            <span
              key={tech.name}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/40"
            >
              <span style={{ color: "#00b4d8" }}>{tech.icon}</span>
              {tech.name}
            </span>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ animationDelay: "0.6s" }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Scroll</span>
        <div className="relative h-10 w-6 rounded-full border border-white/20">
          <div
            className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan-400"
            style={{ animation: "scroll-dot 1.5s ease-in-out infinite" }}
          />
        </div>
      </div>

      {/* Water waves at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <WaterWave className="w-full" />
      </div>

      <style>{`
        @keyframes scroll-dot {
          0% { top: 6px; opacity: 1; }
          60% { top: 22px; opacity: 0.3; }
          100% { top: 6px; opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease both; }
      `}</style>
    </section>
  );
}
