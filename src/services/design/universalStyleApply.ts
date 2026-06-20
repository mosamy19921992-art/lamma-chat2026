import { setDesignPreviewActive } from "./designPreviewDom";
import {
  cancelColumnCardPreview,
  commitColumnCardStyle,
  previewColumnCardStyle,
} from "./columnCardStyleService";
import type { StyleBackgroundLayer, UniversalStyleConfig } from "./universalStyleTypes";

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

export function applyUniversalStyleToDom(
  config: UniversalStyleConfig,
  options?: { preview?: boolean },
): void {
  const root = getRoot();
  if (!root) return;

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
  root.style.setProperty("--us-accent", config.palette.accent);
  root.style.setProperty("--us-accent-2", config.palette.accent2);
  root.style.setProperty("--us-text", config.palette.text);
  root.style.setProperty("--us-muted", config.palette.muted);

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

  const chase = config.effects?.sidebarCardChase;
  if (chase) {
    root.setAttribute("data-us-sidebar-chase", "true");
    delete root.dataset.columnCardStyle;
    delete root.dataset.columnCardPreview;
    root.style.removeProperty("--cc-radius");
    root.style.removeProperty("--cc-tint-rgb");
    if (config.effects.sidebarChaseOuterOnly) {
      root.setAttribute("data-us-chase-outer", "true");
    } else {
      root.removeAttribute("data-us-chase-outer");
    }
    root.style.setProperty(
      "--us-chase-speed",
      `${config.effects.sidebarChaseSpeedSec}s`,
    );
    root.style.setProperty("--us-chase-tint", config.effects.sidebarChaseTint);
    if (options?.preview) {
      previewColumnCardStyle("neon-ring", config.effects.sidebarChaseTint);
    } else {
      commitColumnCardStyle("neon-ring", config.effects.sidebarChaseTint);
    }
  } else {
    root.removeAttribute("data-us-sidebar-chase");
    root.removeAttribute("data-us-chase-outer");
    root.style.removeProperty("--us-chase-speed");
    root.style.removeProperty("--us-chase-tint");
    cancelColumnCardPreview();
  }

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
