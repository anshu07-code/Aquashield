/** Small formatting helpers shared across the UI. */

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** "just now" / "12m ago" / "2h ago" */
export function relTime(iso: string, now: number = Date.now()): string {
  const ms = now - Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const sec = Math.round(ms / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

/** Clock time from ISO, e.g. "10:05" (uses the browser's local timezone). */
export function clockTime(iso: string): string {
  const d = new Date(Date.parse(iso));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function etaText(etaMin: number | null, lang: "en" | "hi" = "en"): string {
  if (etaMin === null) return lang === "hi" ? "अगले 3 घंटे में गंभीर नहीं" : "Not critical in next 3h";
  if (etaMin === 0) return lang === "hi" ? "अभी गंभीर" : "Critical now";
  return lang === "hi" ? `लगभग ${etaMin} मिनट में गंभीर` : `Critical in ~${etaMin} min`;
}

export function pct(v: number): string {
  return `${Math.round(v)}%`;
}

/** Haversine distance in metres between two lat/lng points. */
export function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatMm(v: number): string {
  return `${v % 1 === 0 ? v : v.toFixed(1)} mm`;
}
