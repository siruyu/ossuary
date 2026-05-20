import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ossuary: {
          black: "var(--bg-primary)",
          dark: "var(--bg-secondary)",
          panel: "#111111",
          border: "#2A2A2A",
          borderLight: "#3A3A3A",
          yellow: "var(--ossuary-yellow, #FFD700)",
          yellowDim: "var(--ossuary-yellow-dim, rgba(255, 215, 0, 0.15))",
          yellowMuted: "var(--ossuary-yellow-muted, rgba(255, 215, 0, 0.4))",
          white: "#FFFFFF",
          grey: "#888888",
          greyDark: "#555555",
          greyText: "#AAAAAA",
          scanline: "var(--ossuary-scanline, rgba(255, 215, 0, 0.03))",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "SF Mono",
          "Cascadia Code",
          "Consolas",
          "monospace",
        ],
      },
      backgroundImage: {
        grid: `linear-gradient(var(--grid-color) 1px, transparent 1px),
               linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
        scanlines: `repeating-linear-gradient(
          0deg,
          rgba(0,0,0,0.15),
          rgba(0,0,0,0.15) 1px,
          transparent 1px,
          transparent 2px
        )`,
      },
      animation: {
        scanline: "scanline 8s linear infinite",
        glitch: "glitch 0.3s ease-in-out",
        cursor: "cursor 1s step-end infinite",
        flicker: "flicker 4s infinite",
        "fade-in": "fadeIn 0.5s ease-out",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(2px, -2px)" },
          "60%": { transform: "translate(-1px, -1px)" },
          "80%": { transform: "translate(1px, 1px)" },
          "100%": { transform: "translate(0)" },
        },
        cursor: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.3" },
          "94%": { opacity: "1" },
          "96%": { opacity: "1" },
          "97%": { opacity: "0.5" },
          "98%": { opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;