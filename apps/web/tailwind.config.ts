import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04070f",
          900: "#060a14",
          850: "#080d1a",
          800: "#0b1222",
          700: "#101a2e",
          600: "#16233c",
        },
        aqua: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        safe: "#2dd4a7",
        watch: "#fbbf24",
        high: "#fb923c",
        critical: "#fb4d63",
      },
      opacity: {
        6: "0.06",
        8: "0.08",
        12: "0.12",
        15: "0.15",
        35: "0.35",
        45: "0.45",
        55: "0.55",
        85: "0.85",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,.08), 0 18px 50px -12px rgba(0,0,0,.75)",
        "glow-aqua": "0 0 24px -4px rgba(34,211,238,.45), 0 0 0 1px rgba(34,211,238,.18)",
        sheet: "0 -20px 60px -20px rgba(0,0,0,.8)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(.6)", opacity: "0.85" },
          "100%": { transform: "scale(2.1)", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "draw": {
          "0%": { strokeDashoffset: "var(--len, 200)" },
          "100%": { strokeDashoffset: "0" },
        },
        "pop": {
          "0%": { transform: "scale(.9)", opacity: "0" },
          "60%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "rain-fall": {
          "0%": { transform: "translateY(-12%)", opacity: "0" },
          "30%": { opacity: "1" },
          "100%": { transform: "translateY(120%)", opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.33,0,0.2,1) infinite",
        "fade-in": "fade-in .45s cubic-bezier(0.22,1,0.36,1) both",
        "sheet-up": "sheet-up .42s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 1.6s infinite",
        draw: "draw .9s ease forwards",
        pop: "pop .35s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
