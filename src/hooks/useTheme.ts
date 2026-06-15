// useTheme — manages the active theme, persists it to localStorage,
// and applies it to the document via CSS variables so every component
// picks up the change in real time.

import { useCallback, useEffect, useState } from "react";
import {
  PRESETS,
  DEFAULT_THEME,
  CUSTOM_THEME_ID,
  buildCustomTheme,
  type Theme,
  type ThemePalette,
} from "../lib/themes";

const STORAGE_KEY = "lamma_user_theme";
type StoredThemeRecord = { id: string; palette?: ThemePalette };

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizePalette(value: unknown): Partial<ThemePalette> | null {
  if (!isObjectRecord(value)) return null;

  const next: Partial<ThemePalette> = {};
  const fields: Array<keyof ThemePalette> = [
    "primary",
    "accent",
    "bg1",
    "bg2",
    "bg3",
    "text",
    "textMuted",
    "primaryRgb",
    "accentRgb",
  ];

  for (const field of fields) {
    const raw = value[field];
    if (typeof raw === "string" && raw.trim()) {
      next[field] = raw;
    }
  }

  return Object.keys(next).length > 0 ? next : null;
}

function resolveTheme(input: unknown): Theme {
  if (!isObjectRecord(input) || typeof input.id !== "string") {
    return DEFAULT_THEME;
  }

  if (input.id === CUSTOM_THEME_ID) {
    const palette = sanitizePalette(input.palette);
    return buildCustomTheme(palette ?? DEFAULT_THEME.palette);
  }

  const found = PRESETS.find((t) => t.id === input.id);
  return found ?? DEFAULT_THEME;
}

interface UseThemeResult {
  theme: Theme;
  setThemeById: (id: string) => void;
  applyCustomPalette: (palette: Partial<ThemePalette>) => void;
  resetTheme: () => void;
  presets: Theme[];
}

function readSavedTheme(): Theme {
  if (typeof localStorage === "undefined") return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as StoredThemeRecord;
    return resolveTheme(parsed);
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const safeTheme = resolveTheme(theme);
  const p = safeTheme.palette;
  const [primaryR = "209", primaryG = "213", primaryB = "219"] = p.primaryRgb
    .split(",")
    .map((part) => part.trim());
  root.dataset.appTheme = safeTheme.id;
  // Keep a dedicated "app theme" channel so chat-specific skins can read the
  // live palette without fighting their own CSS overrides.
  root.style.setProperty("--app-theme-primary", p.primary);
  root.style.setProperty("--app-theme-accent", p.accent);
  root.style.setProperty("--app-theme-bg-1", p.bg1);
  root.style.setProperty("--app-theme-bg-2", p.bg2);
  root.style.setProperty("--app-theme-bg-3", p.bg3);
  root.style.setProperty("--app-theme-text", p.text);
  root.style.setProperty("--app-theme-text-muted", p.textMuted);
  root.style.setProperty("--app-theme-primary-rgb", p.primaryRgb);
  root.style.setProperty("--app-theme-accent-rgb", p.accentRgb);
  root.style.setProperty("--app-theme-primary-r", primaryR);
  root.style.setProperty("--app-theme-primary-g", primaryG);
  root.style.setProperty("--app-theme-primary-b", primaryB);
  root.style.setProperty("--theme-primary", p.primary);
  root.style.setProperty("--theme-accent", p.accent);
  root.style.setProperty("--theme-bg-1", p.bg1);
  root.style.setProperty("--theme-bg-2", p.bg2);
  root.style.setProperty("--theme-bg-3", p.bg3);
  root.style.setProperty("--theme-text", p.text);
  root.style.setProperty("--theme-text-muted", p.textMuted);
  root.style.setProperty("--theme-primary-rgb", p.primaryRgb);
  root.style.setProperty("--theme-accent-rgb", p.accentRgb);
  // Also update the meta theme-color so the OS chrome matches.
  let meta = document.querySelector(
    'meta[name="theme-color"]',
  ) as HTMLMetaElement | null;
  if (meta) meta.setAttribute("content", p.primary);
}

function saveTheme(theme: Theme): void {
  try {
    const safeTheme = resolveTheme(theme);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: safeTheme.id,
        palette: safeTheme.palette,
      }),
    );
  } catch (err) {
    console.warn("[theme] Failed to persist:", err);
  }
}

export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<Theme>(() => readSavedTheme());

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const setThemeById = useCallback((id: string) => {
    if (id === CUSTOM_THEME_ID) return; // need palette
    const found = PRESETS.find((t) => t.id === id);
    if (found) setTheme(found);
  }, []);

  const applyCustomPalette = useCallback((palette: Partial<ThemePalette>) => {
    setTheme((prev) => buildCustomTheme({ ...prev.palette, ...palette }));
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
  }, []);

  return {
    theme,
    setThemeById,
    applyCustomPalette,
    resetTheme,
    presets: PRESETS,
  };
}

export default useTheme;
