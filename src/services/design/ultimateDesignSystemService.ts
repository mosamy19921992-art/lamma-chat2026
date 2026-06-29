/**
 * Ultimate Design System Service
 * Manages the application of neon borders, glassmorphic textures, and futuristic palette
 */

import { scheduleDesignOverlaysSync } from "./designOverlaySync";

export type UDSNeonBorderStyle = 
  | "none"
  | "led-strip"
  | "pulsing-glow"
  | "border-aura"
  | "rgb-wave"
  | "static-cyber";

export type UDSGlassTextureStyle = 
  | "none"
  | "ios-ultra-blur"
  | "crystal-glow"
  | "soft-frosted"
  | "dark-mirror"
  | "velvet-blur";

export type UDSPaletteColor = 
  | "cyberpunk-pink"
  | "neon-cyan"
  | "aurora-green"
  | "electric-violet"
  | "gold-eclipse"
  | "carbon-dark"
  | "minimalist-white"
  | "deep-space-blue";

export interface UDSSettings {
  neonBorder: UDSNeonBorderStyle;
  neonBorderColor: UDSPaletteColor;
  glassTexture: UDSGlassTextureStyle;
  glassTint: UDSPaletteColor | "none";
  palette: UDSPaletteColor;
  applyToBody: boolean;
  applyToContainers: boolean;
}

const UDS_STORAGE_KEY = "uds_settings";
const CHAT_ROOT_SELECTOR = ".lamma-neutral-glass";

const UDS_CLASSES = [
  "uds-neon-led-strip",
  "uds-pulsing-glow",
  "uds-border-aura",
  "uds-rgb-wave",
  "uds-static-cyber",
  "uds-ios-ultra-blur",
  "uds-crystal-glow",
  "uds-soft-frosted",
  "uds-dark-mirror",
  "uds-velvet-blur",
  "uds-body-neon-led",
  "uds-container-ios-blur",
  "uds-container-crystal",
  "uds-container-soft-frosted",
  "uds-container-dark-mirror",
  "uds-container-velvet",
];

const DEFAULT_SETTINGS: UDSSettings = {
  neonBorder: "none",
  neonBorderColor: "cyberpunk-pink",
  glassTexture: "none",
  glassTint: "none",
  palette: "cyberpunk-pink",
  applyToBody: false,
  applyToContainers: false,
};

/**
 * Load UDS settings from localStorage
 */
export function loadUDSSettings(): UDSSettings {
  try {
    const stored = localStorage.getItem(UDS_STORAGE_KEY);
    if (stored) {
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } as UDSSettings;
      // rgb-wave removed — migrated to chase-light 2026 neon-beam picker
      if (parsed.neonBorder === "rgb-wave") {
        parsed.neonBorder = "none";
        parsed.applyToBody = false;
      }
      return parsed;
    }
  } catch (error) {
    console.error("Failed to load UDS settings:", error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save UDS settings to localStorage
 */
export function saveUDSSettings(settings: UDSSettings): void {
  try {
    localStorage.setItem(UDS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save UDS settings:", error);
  }
}

/**
 * Get CSS class name for neon border style
 */
function getNeonBorderClass(style: UDSNeonBorderStyle): string {
  switch (style) {
    case "led-strip":
      return "uds-neon-led-strip";
    case "pulsing-glow":
      return "uds-pulsing-glow";
    case "border-aura":
      return "uds-border-aura";
    case "rgb-wave":
      return "uds-rgb-wave";
    case "static-cyber":
      return "uds-static-cyber";
    default:
      return "";
  }
}

/**
 * Get CSS class name for glass texture style
 */
function getGlassTextureClass(style: UDSGlassTextureStyle): string {
  switch (style) {
    case "ios-ultra-blur":
      return "uds-ios-ultra-blur";
    case "crystal-glow":
      return "uds-crystal-glow";
    case "soft-frosted":
      return "uds-soft-frosted";
    case "dark-mirror":
      return "uds-dark-mirror";
    case "velvet-blur":
      return "uds-velvet-blur";
    default:
      return "";
  }
}

/**
 * Get data attribute value for color — CSS expects short tokens on data-color / data-tint.
 */
function paletteToNeonColor(color: UDSPaletteColor): string {
  switch (color) {
    case "neon-cyan":
      return "cyan";
    case "aurora-green":
      return "green";
    case "electric-violet":
      return "violet";
    case "gold-eclipse":
      return "gold";
    case "cyberpunk-pink":
    default:
      return "pink";
  }
}

function paletteToGlassTint(color: UDSPaletteColor | "none"): string | null {
  if (color === "none") return null;
  switch (color) {
    case "neon-cyan":
      return "cyan";
    case "electric-violet":
      return "violet";
    case "gold-eclipse":
      return "gold";
    case "carbon-dark":
    case "minimalist-white":
    case "deep-space-blue":
      return "dark";
    case "aurora-green":
      return "cyan";
    case "cyberpunk-pink":
    default:
      return "pink";
  }
}


export function applyUDSSettings(settings: UDSSettings): void {
  const body = document.body;
  const chatRoot = document.querySelector(CHAT_ROOT_SELECTOR);
  
  // Remove all UDS classes first. If the chat shell has not mounted yet,
  // stop here so design effects do not leak into the login/loading screens.
  UDS_CLASSES.forEach(cls => body.classList.remove(cls));
  
  // Remove UDS data attributes (legacy + current)
  body.removeAttribute("data-uds-neon-color");
  body.removeAttribute("data-uds-glass-tint");
  body.removeAttribute("data-uds-palette");
  body.removeAttribute("data-color");
  body.removeAttribute("data-tint");
  body.style.removeProperty("--uds-active-accent");

  if (!chatRoot) return;
  
  const neonCssColor = paletteToNeonColor(settings.neonBorderColor);
  const glassCssTint = paletteToGlassTint(settings.glassTint);
  
  // Apply to body
  if (settings.applyToBody && settings.neonBorder === "led-strip") {
    body.classList.add("uds-body-neon-led");
  }
  
  if (settings.neonBorder !== "none") {
    const neonClass = getNeonBorderClass(settings.neonBorder);
    if (neonClass) {
      body.classList.add(neonClass);
      body.setAttribute("data-color", neonCssColor);
    }
  }
  
  if (settings.glassTexture !== "none") {
    const glassClass = getGlassTextureClass(settings.glassTexture);
    if (glassClass) {
      body.classList.add(glassClass);
      if (glassCssTint) {
        body.setAttribute("data-tint", glassCssTint);
      }
    }
  }
  
  // Palette drives global accent variable for chat chrome
  body.setAttribute("data-uds-palette", settings.palette);
  body.style.setProperty("--uds-active-accent", getPaletteHex(settings.palette));
  
  // Apply to main containers
  if (settings.applyToContainers) {
    const containers = document.querySelectorAll(
      ".lamma-glass, .lamma-section-card, .lamma-panel-shell, .lamma-list-panel"
    );
    
    containers.forEach(container => {
      const el = container as HTMLElement;
      // Remove all container-specific UDS classes
      const containerClasses = [
        "uds-container-ios-blur",
        "uds-container-crystal",
        "uds-container-soft-frosted",
        "uds-container-dark-mirror",
        "uds-container-velvet",
        "uds-container-neon-led",
        "uds-container-pulsing-glow",
        "uds-container-border-aura",
        "uds-container-rgb-wave",
        "uds-container-static-cyber",
      ];
      containerClasses.forEach(cls => el.classList.remove(cls));
      el.removeAttribute("data-color");
      el.removeAttribute("data-tint");
      
      // Apply glass texture to containers
      if (settings.glassTexture !== "none") {
        const containerClass = getContainerGlassClass(settings.glassTexture);
        if (containerClass) {
          el.classList.add(containerClass);
          if (glassCssTint) {
            el.setAttribute("data-tint", glassCssTint);
          }
        }
      }
      
      // Apply neon effects to containers
      if (settings.neonBorder !== "none") {
        const neonClass = getContainerNeonClass(settings.neonBorder);
        if (neonClass) {
          el.classList.add(neonClass);
          el.setAttribute("data-color", neonCssColor);
        }
      }
    });
  }
}

/**
 * Get container-specific glass class
 */
function getContainerGlassClass(style: UDSGlassTextureStyle): string {
  switch (style) {
    case "ios-ultra-blur":
      return "uds-container-ios-blur";
    case "crystal-glow":
      return "uds-container-crystal";
    case "soft-frosted":
      return "uds-container-soft-frosted";
    case "dark-mirror":
      return "uds-container-dark-mirror";
    case "velvet-blur":
      return "uds-container-velvet";
    default:
      return "";
  }
}

/**
 * Get container-specific neon class
 */
function getContainerNeonClass(style: UDSNeonBorderStyle): string {
  switch (style) {
    case "led-strip":
      return "uds-container-neon-led";
    case "pulsing-glow":
      return "uds-container-pulsing-glow";
    case "border-aura":
      return "uds-container-border-aura";
    case "rgb-wave":
      return "uds-container-rgb-wave";
    case "static-cyber":
      return "uds-container-static-cyber";
    default:
      return "";
  }
}

/**
 * Preview UDS settings without saving
 */
export function previewUDSSettings(settings: UDSSettings): void {
  applyUDSSettings(settings);
}

/**
 * Commit UDS settings (save and apply)
 */
export function commitUDSSettings(settings: UDSSettings): void {
  saveUDSSettings(settings);
  applyUDSSettings(settings);
  scheduleDesignOverlaysSync();
}

/**
 * Reset UDS settings to default
 */
export function resetUDSSettings(): void {
  const defaultSettings = { ...DEFAULT_SETTINGS };
  saveUDSSettings(defaultSettings);
  applyUDSSettings(defaultSettings);
  scheduleDesignOverlaysSync();
}

export function ensureUDSSettingsApplied(): void {
  if (typeof document === "undefined") return;
  applyUDSSettings(loadUDSSettings());
}

/**
 * Get label for neon border style
 */
export function getNeonBorderLabel(style: UDSNeonBorderStyle): string {
  const labels: Record<UDSNeonBorderStyle, string> = {
    "none": "بدون",
    "led-strip": "شريط LED متحرك",
    "pulsing-glow": "نبض إضاءة",
    "border-aura": "هالة ضوئية",
    "rgb-wave": "موجة RGB",
    "static-cyber": "خط سيبر ثابت",
  };
  return labels[style];
}

/**
 * Get label for glass texture style
 */
export function getGlassTextureLabel(style: UDSGlassTextureStyle): string {
  const labels: Record<UDSGlassTextureStyle, string> = {
    "none": "بدون",
    "ios-ultra-blur": "iOS Ultra Blur",
    "crystal-glow": "زجاج كريستالي",
    "soft-frosted": "زجاج مطفأ",
    "dark-mirror": "مرآة داكنة",
    "velvet-blur": "زجاج مخملي",
  };
  return labels[style];
}

/**
 * Get label for palette color
 */
export function getPaletteLabel(color: UDSPaletteColor): string {
  const labels: Record<UDSPaletteColor, string> = {
    "cyberpunk-pink": "سيبربانك وردي",
    "neon-cyan": "نيون سماوي",
    "aurora-green": "أورورا أخضر",
    "electric-violet": "بنفسجي كهربائي",
    "gold-eclipse": "ذهبي كسوف",
    "carbon-dark": "كربون داكن",
    "minimalist-white": "أبيض مينيمال",
    "deep-space-blue": "أزرق فضائي",
  };
  return labels[color];
}

/**
 * Get hex color for palette
 */
export function getPaletteHex(color: UDSPaletteColor): string {
  const hexColors: Record<UDSPaletteColor, string> = {
    "cyberpunk-pink": "#ff006e",
    "neon-cyan": "#00f5d4",
    "aurora-green": "#06d6a0",
    "electric-violet": "#7209b7",
    "gold-eclipse": "#ffd60a",
    "carbon-dark": "#0a0a0a",
    "minimalist-white": "#ffffff",
    "deep-space-blue": "#03045e",
  };
  return hexColors[color];
}

/**
 * Get RGB values for palette
 */
export function getPaletteRGB(color: UDSPaletteColor): string {
  const rgbColors: Record<UDSPaletteColor, string> = {
    "cyberpunk-pink": "255, 0, 110",
    "neon-cyan": "0, 245, 212",
    "aurora-green": "6, 214, 160",
    "electric-violet": "114, 9, 183",
    "gold-eclipse": "255, 214, 10",
    "carbon-dark": "10, 10, 10",
    "minimalist-white": "255, 255, 255",
    "deep-space-blue": "3, 4, 94",
  };
  return rgbColors[color];
}
