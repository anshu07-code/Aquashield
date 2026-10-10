"use client";

import { useEffect, useRef } from "react";

/**
 * Realistic animated water waves using layered SVG paths.
 * Each layer has a different amplitude, frequency, speed, and opacity
 * creating a deep ocean water effect.
 */
export function WaterWave({ className = "" }: { className?: string }) {
  const animRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    let running = true;
    const W = 1440;

    function getWavePath(
      phase: number,
      amplitude: number,
      frequency: number,
      yOffset: number,
      segments = 12
    ): string {
      const points: [number, number][] = [];
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * W;
        const y = yOffset + Math.sin((i / segments) * frequency * Math.PI * 2 + phase) * amplitude;
        points.push([x, y]);
      }
      // Build smooth bezier path
      let d = `M ${points[0][0]},${points[0][1]}`;
      for (let i = 0; i < points.length - 1; i++) {
        const cx = (points[i][0] + points[i + 1][0]) / 2;
        const cy = (points[i][1] + points[i + 1][1]) / 2;
        d += ` Q ${points[i][0]},${points[i][1]} ${cx},${cy}`;
      }
      const last = points[points.length - 1];
      d += ` L ${last[0]},${last[1]} L ${W},${yOffset + 200} L 0,${yOffset + 200} Z`;
      return d;
    }

    const layer1 = document.getElementById("wave-layer-1") as SVGPathElement | null;
    const layer2 = document.getElementById("wave-layer-2") as SVGPathElement | null;
    const layer3 = document.getElementById("wave-layer-3") as SVGPathElement | null;
    const layer4 = document.getElementById("wave-layer-4") as SVGPathElement | null;

    function tick() {
      if (!running) return;
      phaseRef.current += 0.008;
      const p = phaseRef.current;
      if (layer1) layer1.setAttribute("d", getWavePath(p * 1.1, 28, 2.2, 55));
      if (layer2) layer2.setAttribute("d", getWavePath(p * 0.9, 22, 1.8, 68));
      if (layer3) layer3.setAttribute("d", getWavePath(p * 1.3, 16, 3.0, 78));
      if (layer4) layer4.setAttribute("d", getWavePath(p * 0.7, 12, 2.5, 85));
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <svg
      className={className}
      viewBox="0 0 1440 160"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Water gradients — darker = deeper */}
        <linearGradient id="wave-grad-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#005f7f" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#00253d" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="wave-grad-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#007a9a" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#003050" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="wave-grad-3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0096b8" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#004060" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="wave-grad-4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#00557a" stopOpacity="0.95" />
        </linearGradient>

        {/* Foam highlight */}
        <linearGradient id="wave-foam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,229,255,0.3)" stopOpacity="0" />
          <stop offset="40%" stopColor="rgba(0,229,255,0.15)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="rgba(0,229,255,0.05)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 4 wave layers — back to front */}
      <path id="wave-layer-1" fill="url(#wave-grad-1)" />
      <path id="wave-layer-2" fill="url(#wave-grad-2)" />
      <path id="wave-layer-3" fill="url(#wave-grad-3)" />
      <path id="wave-layer-4" fill="url(#wave-grad-4)" />

      {/* Surface foam highlights */}
      <path
        id="wave-foam-path"
        fill="url(#wave-foam)"
        opacity="0.5"
      />
    </svg>
  );
}
