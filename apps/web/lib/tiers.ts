import type { Tier } from "@aquashield/types";

export type TierMeta = {
  label: string;
  labelHi: string;
  /** primary colour */
  color: string;
  /** soft translucent background */
  soft: string;
  /** css box-shadow glow */
  glow: string;
  /** short call-to-action line */
  advice: string;
  adviceHi: string;
};

export const TIER_META: Record<Tier, TierMeta> = {
  SAFE: {
    label: "Safe",
    labelHi: "सुरक्षित",
    color: "#2dd4a7",
    soft: "rgba(45, 212, 167, 0.13)",
    glow: "0 0 18px -2px rgba(45,212,167,.55)",
    advice: "No waterlogging expected right now.",
    adviceHi: "अभी जलभराव की संभावना नहीं।",
  },
  WATCH: {
    label: "Watch",
    labelHi: "सावधान",
    color: "#fbbf24",
    soft: "rgba(251, 191, 36, 0.13)",
    glow: "0 0 18px -2px rgba(251,191,36,.55)",
    advice: "Water may accumulate if rain continues. Stay alert.",
    adviceHi: "बारिश जारी रही तो पानी भर सकता है। सावधान रहें।",
  },
  HIGH: {
    label: "High",
    labelHi: "उच्च",
    color: "#fb923c",
    soft: "rgba(251, 146, 60, 0.14)",
    glow: "0 0 20px -2px rgba(251,146,60,.6)",
    advice: "Waterlogging likely. Consider an alternate route.",
    adviceHi: "जलभराव हो सकता है। वैकल्पिक मार्ग चुनें।",
  },
  CRITICAL: {
    label: "Critical",
    labelHi: "गंभीर",
    color: "#fb4d63",
    soft: "rgba(251, 77, 99, 0.15)",
    glow: "0 0 22px -2px rgba(251,77,99,.65)",
    advice: "Do not enter. Turn around and use a safe route.",
    adviceHi: "अंदर मत जाइए। घूमें और सुरक्षित मार्ग अपनाइए।",
  },
};

export const TIER_ORDER: Tier[] = ["CRITICAL", "HIGH", "WATCH", "SAFE"];

export function tierColor(tier: Tier): string {
  return TIER_META[tier].color;
}

/** Risk number colour (matches tier thresholds, same logic as risk-core tierFor). */
export function riskColor(risk: number): string {
  if (risk >= 75) return TIER_META.CRITICAL.color;
  if (risk >= 55) return TIER_META.HIGH.color;
  if (risk >= 30) return TIER_META.WATCH.color;
  return TIER_META.SAFE.color;
}
