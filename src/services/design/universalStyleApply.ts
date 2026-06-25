import { setDesignPreviewActive } from "./designPreviewDom";
import { ensureAllDesignOverlaysApplied } from "./designOverlayBundle";
import {
  cancelColumnCardPreview,
} from "./columnCardStyleService";
import {
  ensureReadablePalette,
  type StyleBackgroundLayer,
  type UniversalStyleConfig,
} from "./universalStyleTypes";

const ROOT_SELECTOR = ".lamma-neutral-glass";

function getRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(ROOT_SELECTOR) as HTMLElement | null;
}

function layerToCss(layer: StyleBackgroundLayer): string {
  if (layer.kind === "color") return layer.value;
  if (layer.kind === "image") return `url("${layer.value}")`;
  return "transparent";
}

function applyBackgroundTarget(
  root: HTMLElement,
  prefix: "global" | "feed" | "sidebar",
  layer: StyleBackgroundLayer,
): void {
  const media = layer.kind !== "color";
  root.setAttribute(`data-us-${prefix}-media`, media ? "true" : "false");
  root.style.setProperty(`--us-${prefix}-bg`, layerToCss(layer));
  root.style.setProperty(
    `--us-${prefix}-overlay`,
    String(clampOverlay(layer.overlayOpacity)),
  );
  root.style.setProperty(`--us-${prefix}-blur`, `${layer.blurPx}px`);
  if (layer.kind === "video") {
    root.setAttribute(`data-us-${prefix}-video`, layer.value);
  } else {
    root.removeAttribute(`data-us-${prefix}-video`);
  }
}

function clampOverlay(v: number): number {
  return Math.max(0, Math.min(0.75, v));
}

/** Sync text tokens across Universal Style, Custom Face, and ui-polish layers. */
export function syncPaletteTextTokens(
  root: HTMLElement,
  palette: {
    text: string;
    accent: string;
    accent2?: string;
    muted?: string;
  },
): void {
  root.style.setProperty("--us-text", palette.text);
  root.style.setProperty("--us-accent", palette.accent);
  if (palette.accent2) {
    root.style.setProperty("--us-accent-2", palette.accent2);
  }
  if (palette.muted) {
    root.style.setProperty("--us-muted", palette.muted);
  }
  root.style.setProperty("--face-text", palette.text);
  root.style.setProperty("--face-accent", palette.accent);
  root.style.setProperty("--ui-bubble-other-text", palette.text);
  root.style.setProperty("--ui-text-meta", palette.muted || palette.accent);
  // Side columns (store/radio/music + rooms/m members) read these tokens
  root.style.setProperty("--text-primary", palette.text);
  root.style.setProperty(
    "--text-secondary",
    palette.muted || palette.accent2 || palette.accent,
  );
  root.style.setProperty("--accent-primary", palette.accent);
  root.style.setProperty("--accent-secondary", palette.accent2 || palette.accent);
  root.style.setProperty("--lamma-sidebar-store-text", palette.text);
  root.style.setProperty("--lamma-sidebar-radio-text", palette.text);
  root.style.setProperty("--lamma-sidebar-music-text", palette.text);
}

export function applyUniversalStyleToDom(
  config: UniversalStyleConfig,
  options?: { preview?: boolean },
): boolean {
  const root = getRoot();
  if (!root) return false;

  root.setAttribute("data-universal-style", "active");
  if (options?.preview) {
    root.setAttribute("data-universal-style-preview", "true");
    setDesignPreviewActive(true);
  } else {
    root.removeAttribute("data-universal-style-preview");
    setDesignPreviewActive(false);
  }

  root.style.setProperty("--us-bg", config.palette.bg);
  root.style.setProperty("--us-surface", config.palette.surface);
  syncPaletteTextTokens(root, config.palette);

  root.style.setProperty("--us-glass-blur", `${config.glass.blurPx}px`);
  root.style.setProperty("--us-glass-opacity", String(config.glass.opacity));
  root.style.setProperty(
    "--us-glass-border",
    String(config.glass.borderOpacity),
  );

  root.style.setProperty("--us-btn-radius", `${config.buttons.radiusPx}px`);
  root.style.setProperty("--us-input-radius", `${config.inputs.radiusPx}px`);
  root.setAttribute("data-us-neon", config.buttons.neon ? "true" : "false");
  root.setAttribute("data-us-glow", config.buttons.glow ? "true" : "false");

  applyBackgroundTarget(root, "global", config.backgrounds.global);
  applyBackgroundTarget(root, "feed", config.backgrounds.feed);
  applyBackgroundTarget(root, "sidebar", config.backgrounds.sidebar);

  root.setAttribute("data-us-theme", config.themeId);

  /* Legacy rainbow sidebar chase removed — use chaseLightBarService (2026) instead. */
  root.removeAttribute("data-us-sidebar-chase");
  root.removeAttribute("data-us-chase-outer");
  root.style.removeProperty("--us-chase-speed");
  root.style.removeProperty("--us-chase-tint");
  cancelColumnCardPreview();

  const headerStyle = config.effects?.chatHeaderStyle ?? "none";
  if (headerStyle !== "none") {
    root.setAttribute("data-us-chat-header", headerStyle);
    root.style.setProperty(
      "--us-header-blur",
      `${config.effects.chatHeaderBlurPx}px`,
    );
  } else {
    root.removeAttribute("data-us-chat-header");
    root.style.removeProperty("--us-header-blur");
  }

  const globalMedia = config.backgrounds.global.kind !== "color";
  root.setAttribute("data-clear-bg", globalMedia ? "false" : "true");

  applyChatRegionsToDom(root, config);
  return true;
}

/** Retry until ChatScreen shell mounts (fixes silent preview before paint). */
export function ensureUniversalStyleApplied(
  config: UniversalStyleConfig,
  options?: { preview?: boolean },
  attempt = 0,
): boolean {
  const ok = applyUniversalStyleToDom(config, options);
  if (ok) {
    ensureAllDesignOverlaysApplied();
    return true;
  }
  if (attempt >= 24 || typeof window === "undefined") return false;
  window.requestAnimationFrame(() =>
    ensureUniversalStyleApplied(config, options, attempt + 1),
  );
  return false;
}

/** Apply saved quick text preset once the chat shell is mounted. */
export function ensureTextColorPresetApplied(attempt = 0): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
  const root = getRoot();
  if (!root) {
    if (attempt < 24) {
      window.requestAnimationFrame(() => ensureTextColorPresetApplied(attempt + 1));
    }
    return false;
  }
  try {
    const raw = localStorage.getItem("lamma_text_color_preset");
    if (!raw) return false;
    const preset = JSON.parse(raw) as { text?: string; accent?: string; accent2?: string };
    if (!preset.text || !preset.accent) return false;
    const bg =
      getComputedStyle(root).getPropertyValue("--us-bg").trim() || "#060a12";
    const readable = ensureReadablePalette({
      bg,
      surface: "rgba(18, 24, 32, 0.72)",
      text: preset.text,
      accent: preset.accent,
      accent2: preset.accent2 ?? preset.accent,
      muted: preset.accent2 ?? preset.accent,
    });
    if (readable.text !== preset.text) {
      try {
        localStorage.setItem(
          "lamma_text_color_preset",
          JSON.stringify({
            text: readable.text,
            accent: preset.accent,
            accent2: preset.accent2 ?? preset.accent,
          }),
        );
      } catch {
        /* non-fatal */
      }
    }
    syncPaletteTextTokens(root, readable);
    root.setAttribute("data-universal-style", "active");
    return true;
  } catch {
    return false;
  }
}

function applyChatRegionsToDom(
  root: HTMLElement,
  config: UniversalStyleConfig,
): void {
  const regions = config.regions;
  if (!regions) return;

  const roomStrip = regions["room-header-strip"];
  if (roomStrip.flowStrip) {
    root.setAttribute("data-us-room-header-strip", "flow");
  } else if (roomStrip.hidden) {
    root.setAttribute("data-us-room-header-strip", "hidden");
  } else {
    root.removeAttribute("data-us-room-header-strip");
  }

  const wallpaper = regions["chat-wallpaper"];
  if (wallpaper.clean || wallpaper.removeColors) {
    root.setAttribute("data-us-wallpaper-clean", "true");
  } else {
    root.removeAttribute("data-us-wallpaper-clean");
  }

  if (regions["message-bubbles"].removeColors) {
    root.setAttribute("data-us-bubbles-neutral", "true");
  } else {
    root.removeAttribute("data-us-bubbles-neutral");
  }

  if (regions.composer.darken > 0.08) {
    root.setAttribute("data-us-composer-dark", "true");
  } else {
    root.removeAttribute("data-us-composer-dark");
  }

  if (regions["chat-feed"].darken > 0.08) {
    root.style.setProperty(
      "--us-feed-dim",
      String(clampOverlay(regions["chat-feed"].darken)),
    );
  } else {
    root.style.removeProperty("--us-feed-dim");
  }
}

/** Strip preview flag only — use after applyUniversalStyleToDom restore. */
export function clearUniversalStylePreviewDomOnly(): void {
  const root = getRoot();
  if (!root) return;
  root.removeAttribute("data-universal-style-preview");
  setDesignPreviewActive(false);
}

export function clearUniversalStylePreview(): void {
  clearUniversalStylePreviewDomOnly();
  cancelColumnCardPreview();
}

export function removeUniversalStyleFromDom(): void {
  const root = getRoot();
  if (!root) return;
  root.removeAttribute("data-universal-style");
  root.removeAttribute("data-universal-style-preview");
  root.removeAttribute("data-us-neon");
  root.removeAttribute("data-us-glow");
  root.removeAttribute("data-us-theme");
  root.removeAttribute("data-us-global-media");
  root.removeAttribute("data-us-feed-media");
  root.removeAttribute("data-us-sidebar-media");
  [
    "--us-bg",
    "--us-surface",
    "--us-accent",
    "--us-accent-2",
    "--us-text",
    "--us-muted",
    "--us-glass-blur",
    "--us-glass-opacity",
    "--us-glass-border",
    "--us-btn-radius",
    "--us-input-radius",
    "--us-global-bg",
    "--us-feed-bg",
    "--us-sidebar-bg",
    "--us-global-overlay",
    "--us-feed-overlay",
    "--us-sidebar-overlay",
  ].forEach((prop) => root.style.removeProperty(prop));
  setDesignPreviewActive(false);
}

export function getGlobalBackgroundForShell(
  config: UniversalStyleConfig,
  fallback: string,
): string | null {
  const g = config.backgrounds.global;
  if (g.kind === "color") {
    return g.value === "#060a12" || g.value === "transparent" ? fallback : g.value;
  }
  return g.value;
}
