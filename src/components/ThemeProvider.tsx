"use client";

import { useEffect, useState } from "react";
import { createContext, useContext, ReactNode } from "react";

type Theme = "void" | "slate" | "ash";
type FontFamily = "JETBRAINS_MONO" | "FIRA_CODE" | "CONSOLAS" | "SF_MONO";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const themeColors = {
  void: "#000000",
  slate: "#1a1a2e",
  ash: "#2a2a2a",
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "255, 215, 0";
}

function adjustColorBrightness(hex: string, percent: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, parseInt(result[1], 16) + amt));
  const G = Math.min(255, Math.max(0, parseInt(result[2], 16) + amt));
  const B = Math.min(255, Math.max(0, parseInt(result[3], 16) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function applyAccentColor(accentColor: string) {
  const accentRgb = hexToRgb(accentColor);
  const lighterColor = adjustColorBrightness(accentColor, 10);
  
  const root = document.documentElement;
  root.style.setProperty("--accent-color", accentColor);
  root.style.setProperty("--accent-light", lighterColor);
  root.style.setProperty("--accent-rgb", accentRgb);
  
  // Also set ossuary colors for Tailwind compatibility
  root.style.setProperty("--ossuary-yellow", accentColor);
  root.style.setProperty("--ossuary-yellow-dim", `rgba(${accentRgb}, 0.15)`);
  root.style.setProperty("--ossuary-yellow-muted", `rgba(${accentRgb}, 0.4)`);
  root.style.setProperty("--ossuary-scanline", `rgba(${accentRgb}, 0.03)`);
  
  // Inject dynamic styles
  let styleEl = document.getElementById('accent-dynamic-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'accent-dynamic-styles';
    document.head.appendChild(styleEl);
  }
  
  styleEl.textContent = `
    .text-ossuary-yellow { color: ${accentColor} !important; }
    .bg-ossuary-yellow { background-color: ${accentColor} !important; }
    .border-ossuary-yellow { border-color: ${accentColor} !important; }
    .hover\\:text-ossuary-yellow:hover { color: ${accentColor} !important; }
    .hover\\:bg-ossuary-yellow:hover { background-color: ${accentColor} !important; }
    .hover\\:border-ossuary-yellow:hover { border-color: ${accentColor} !important; }
    .bg-ossuary-yellow\\/10 { background-color: rgba(${accentRgb}, 0.1) !important; }
    .bg-ossuary-yellow\\/20 { background-color: rgba(${accentRgb}, 0.2) !important; }
    .bg-ossuary-yellow\\/30 { background-color: rgba(${accentRgb}, 0.3) !important; }
    .text-ossuary-yellow\\/50 { color: rgba(${accentRgb}, 0.5) !important; }
    .border-ossuary-yellow\\/30 { border-color: rgba(${accentRgb}, 0.3) !important; }
    .border-ossuary-yellow\\/20 { border-color: rgba(${accentRgb}, 0.2) !important; }
    .border-l-ossuary-yellow\\/30 { border-left-color: rgba(${accentRgb}, 0.3) !important; }
    .decoration-ossuary-yellow\\/40 { text-decoration-color: rgba(${accentRgb}, 0.4) !important; }
    .from-ossuary-yellow { --tw-gradient-from: ${accentColor} !important; }
    .to-ossuary-yellow { --tw-gradient-to: ${accentColor} !important; }
  `;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("void");
  const [fontFamily, setFontFamilyState] = useState<FontFamily>("JETBRAINS_MONO");
  const [accentColor, setAccentColorState] = useState("#ffd700");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedFont = localStorage.getItem("fontFamily") as FontFamily | null;
    const savedAccent = localStorage.getItem("accentColor") as string | null;
    if (savedTheme && ["void", "slate", "ash"].includes(savedTheme)) {
      setThemeState(savedTheme);
    }
    if (savedFont && ["JETBRAINS_MONO", "FIRA_CODE", "CONSOLAS", "SF_MONO"].includes(savedFont)) {
      setFontFamilyState(savedFont);
    }
    if (savedAccent) {
      setAccentColorState(savedAccent);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.body.style.backgroundColor = themeColors[theme];
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-font", fontFamily);
    localStorage.setItem("fontFamily", fontFamily);
  }, [fontFamily, mounted]);

  useEffect(() => {
    if (!mounted) return;
    applyAccentColor(accentColor);
    localStorage.setItem("accentColor", accentColor);
  }, [accentColor, mounted]);

  useEffect(() => {
    if (mounted) {
      applyAccentColor(accentColor);
    }
  }, []);

  // Restore accent color on mount
  useEffect(() => {
    if (mounted && accentColor) {
      applyAccentColor(accentColor);
    }
  }, [mounted]);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);
  const setFontFamily = (newFont: FontFamily) => setFontFamilyState(newFont);
  const setAccentColor = (color: string) => setAccentColorState(color);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fontFamily, setFontFamily, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}