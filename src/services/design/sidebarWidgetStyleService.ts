import { setDesignPreviewActive } from "./designPreviewDom";
import { scheduleDesignOverlaysSync } from "./designOverlaySync";

export type RadioPanelStyleId =
  | "classic"
  | "vinyl"
  | "wave"
  | "minimal"
  | "neon-studio";

export type MusicPanelStyleId =
  | "classic"
  | "spectrum"
  | "stream-deck"
  | "cassette"
  | "glass-deck";

export type ColumnDividerStyleId =
  | "classic"
  | "hairline"
  | "glow-dot"
  | "glass-notch"
  | "wave"
  | "accent-dash";

export interface StylePreset<T extends string> {
  id: T;
  title: string;
  subtitle: string;
  emoji: string;
}

export const RADIO_PANEL_PRESETS: StylePreset<RadioPanelStyleId>[] = [
  { id: "classic", title: "كلاسيك", subtitle: "الشكل الافتراضي", emoji: "📻" },
  { id: "vinyl", title: "Vinyl 2026", subtitle: "قرص + موجات صوت", emoji: "💿" },
  { id: "wave", title: "Wave Bar", subtitle: "شريط موجات متحرك", emoji: "〰️" },
  { id: "minimal", title: "Minimal FM", subtitle: "flat نظيف", emoji: "▬" },
  { id: "neon-studio", title: "Neon Studio", subtitle: "توهج أخضر خفيف", emoji: "🟢" },
];

export const MUSIC_PANEL_PRESETS: StylePreset<MusicPanelStyleId>[] = [
  { id: "classic", title: "كلاسيك", subtitle: "الشكل الافتراضي", emoji: "🎵" },
  { id: "spectrum", title: "Spectrum", subtitle: "أعمدة equalizer", emoji: "📊" },
  { id: "stream-deck", title: "Stream Deck", subtitle: "أزرار pill حديثة", emoji: "🎛️" },
  { id: "cassette", title: "Cassette", subtitle: "دافئ retro", emoji: "📼" },
  { id: "glass-deck", title: "Glass Deck", subtitle: "DJ deck زجاجي", emoji: "🫧" },
];

export const COLUMN_DIVIDER_PRESETS: StylePreset<ColumnDividerStyleId>[] = [
  { id: "classic", title: "كلاسيك", subtitle: "خط ذهبي + نقطة", emoji: "✨" },
  { id: "hairline", title: "Hairline", subtitle: "خط رفيع minimal", emoji: "─" },
  { id: "glow-dot", title: "Glow Dot", subtitle: "نقطة + gradient", emoji: "●" },
  { id: "glass-notch", title: "Glass Notch", subtitle: "pill زجاجي للسحب", emoji: "💊" },
  { id: "wave", title: "Wave", subtitle: "موجة SVG ناعمة", emoji: "🌊" },
  { id: "accent-dash", title: "Accent Dash", subtitle: "خط متقطع", emoji: "⚡" },
];

export interface SidebarWidgetSettings {
  radio: RadioPanelStyleId;
  music: MusicPanelStyleId;
  divider: ColumnDividerStyleId;
  /** Text color for VIP/store card */
  storeText: string;
  /** Text color for radio card */
  radioText: string;
  /** Text color for music/DJ card */
  musicText: string;
}

const STORAGE_KEY = "lamma_sidebar_widget_styles";
const ROOT_SELECTOR = ".lamma-neutral-glass";

const DEFAULT_TEXT = "#f8fafc";

const DEFAULT_SETTINGS: SidebarWidgetSettings = {
  radio: "classic",
  music: "classic",
  divider: "classic",
  storeText: DEFAULT_TEXT,
  radioText: DEFAULT_TEXT,
  musicText: DEFAULT_TEXT,
};

let previewSnapshot: SidebarWidgetSettings | null = null;

function getRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(ROOT_SELECTOR) as HTMLElement | null;
}

function validRadio(id: unknown): id is RadioPanelStyleId {
  return RADIO_PANEL_PRESETS.some((p) => p.id === id);
}

function validMusic(id: unknown): id is MusicPanelStyleId {
  return MUSIC_PANEL_PRESETS.some((p) => p.id === id);
}

function validDivider(id: unknown): id is ColumnDividerStyleId {
  return COLUMN_DIVIDER_PRESETS.some((p) => p.id === id);
}

function validHex(hex: unknown, fallback: string): string {
  if (typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  return fallback;
}

function normalize(raw: Partial<SidebarWidgetSettings> | null): SidebarWidgetSettings {
  const base = { ...DEFAULT_SETTINGS };
  if (!raw) return base;
  return {
    radio: validRadio(raw.radio) ? raw.radio : base.radio,
    music: validMusic(raw.music) ? raw.music : base.music,
    divider: validDivider(raw.divider) ? raw.divider : base.divider,
    storeText: validHex(raw.storeText, base.storeText),
    radioText: validHex(raw.radioText, base.radioText),
    musicText: validHex(raw.musicText, base.musicText),
  };
}

function applyToDom(settings: SidebarWidgetSettings, preview: boolean): boolean {
  const root = getRoot();
  if (!root) return false;

  root.setAttribute("data-radio-style", settings.radio);
  root.setAttribute("data-music-style", settings.music);
  root.setAttribute("data-column-divider", settings.divider);
  root.style.setProperty("--lamma-sidebar-store-text", settings.storeText);
  root.style.setProperty("--lamma-sidebar-radio-text", settings.radioText);
  root.style.setProperty("--lamma-sidebar-music-text", settings.musicText);

  if (preview) {
    root.setAttribute("data-sidebar-widget-preview", "true");
    setDesignPreviewActive(true);
  } else {
    root.removeAttribute("data-sidebar-widget-preview");
  }
  return true;
}

export function loadSidebarWidgetSettings(): SidebarWidgetSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw) as Partial<SidebarWidgetSettings>);
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function getRadioPanelLabel(id: RadioPanelStyleId): string {
  return RADIO_PANEL_PRESETS.find((p) => p.id === id)?.title ?? id;
}

export function getMusicPanelLabel(id: MusicPanelStyleId): string {
  return MUSIC_PANEL_PRESETS.find((p) => p.id === id)?.title ?? id;
}

export function getColumnDividerLabel(id: ColumnDividerStyleId): string {
  return COLUMN_DIVIDER_PRESETS.find((p) => p.id === id)?.title ?? id;
}

export function previewSidebarWidgetPatch(
  patch: Partial<SidebarWidgetSettings>,
): boolean {
  if (!previewSnapshot) {
    previewSnapshot = loadSidebarWidgetSettings();
  }
  const merged = normalize({ ...loadSidebarWidgetSettings(), ...patch });
  return applyToDom(merged, true);
}

export function commitSidebarWidgetSettings(
  settings?: SidebarWidgetSettings,
  options?: { skipSync?: boolean },
): boolean {
  const final = normalize(settings ?? loadSidebarWidgetSettings());
  const ok = applyToDom(final, false);
  if (!ok) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
  } catch {
    // ignore
  }
  previewSnapshot = null;
  if (!options?.skipSync) scheduleDesignOverlaysSync();
  return true;
}

export function cancelSidebarWidgetPreview(): boolean {
  const restore = previewSnapshot ?? loadSidebarWidgetSettings();
  previewSnapshot = null;
  return applyToDom(restore, false);
}

export function ensureSidebarWidgetStylesApplied(attempt = 0): void {
  if (typeof window === "undefined") return;
  const ok = applyToDom(loadSidebarWidgetSettings(), false);
  if (!ok && attempt < 24) {
    window.requestAnimationFrame(() => ensureSidebarWidgetStylesApplied(attempt + 1));
  }
}
