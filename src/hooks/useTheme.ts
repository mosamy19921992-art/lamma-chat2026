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
    const parsed = JSON.parse(raw) as { id: string; palette?: ThemePalette };
    if (parsed.id === CUSTOM_THEME_ID && parsed.palette) {
      return buildCustomTheme(parsed.palette);
    }
    const found = PRESETS.find((t) => t.id === parsed.id);
    return found ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const p = theme.palette;
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: theme.id,
        palette: theme.palette,
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
    setTheme((prev) =>
      prev.id === CUSTOM_THEME_ID
        ? buildCustomTheme({ ...prev.palette, ...palette })
        : buildCustomTheme({ ...prev.palette, ...palette }),
    );
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
