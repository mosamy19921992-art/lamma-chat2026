import { loadGlassFormTint, DEFAULT_GLASS_TINT } from "./glassTransparencyService";
import { setDesignPreviewActive } from "./designPreviewDom";
import { scheduleDesignOverlaysSync } from "./designOverlaySync";

export type ChaseLightStyleId =
  | "none"
  | "neon-beam"
  | "soft-edge"
  | "aurora-flow"
  | "ambient-breathe"
  | "laser-scan"
  | "mono-glow"
  | "conic-spin"
  | "liquid-flow"
  | "pulse-glow"
  | "segment-dash"
  | "rainbow-wave"
  | "neon-double";

export type ChaseLightTarget = "columns" | "composer" | "header";

/** Per-card / per-edge targets for neon-beam (border line only). */
export type NeonBeamTargetId =
  | "store"
  | "radio"
  | "music"
  | "rooms"
  | "members"
  | "composer"
  | "header";

export const NEON_BEAM_TARGET_LABELS: Record<NeonBeamTargetId, string> = {
  store: "👑 VIP / المتجر",
  radio: "📻 الراديو",
  music: "🎵 DJ / موسيقى",
  rooms: "📚 الغرف",
  members: "👥 المتصلون",
  composer: "⌨️ شريط الكتابة",
  header: "📌 الهيدر",
};

export const NEON_BEAM_COLUMN_TARGETS: NeonBeamTargetId[] = [
  "store",
  "radio",
  "music",
  "rooms",
  "members",
];

export const NEON_BEAM_ALL_TARGETS: NeonBeamTargetId[] = [
  ...NEON_BEAM_COLUMN_TARGETS,
  "composer",
  "header",
];

const NEON_BEAM_TARGET_SET = new Set<string>(NEON_BEAM_ALL_TARGETS);

export interface ChaseLightPreset {
  id: ChaseLightStyleId;
  title: string;
  subtitle: string;
  emoji: string;
}

/** Primary 2026 presets — clean, single-accent, no rainbow by default. */
export const CHASE_LIGHT_PRESETS_2026: ChaseLightPreset[] = [
  { id: "none", title: "بدون", subtitle: "إيقاف — افتراضي نظيف", emoji: "⬜" },
  { id: "neon-beam", title: "شريط نيون", subtitle: "وردي → بنفسجي → سيان دوّار", emoji: "💠" },
  { id: "soft-edge", title: "Soft Edge", subtitle: "خط gradient رفيع", emoji: "✨" },
  { id: "aurora-flow", title: "Aurora", subtitle: "لونين accent + cyan", emoji: "🌌" },
  { id: "ambient-breathe", title: "Ambient", subtitle: "توهج ناعم نابض", emoji: "💫" },
  { id: "laser-scan", title: "Laser Scan", subtitle: "خط يتحرك على الحافة", emoji: "🔦" },
  { id: "mono-glow", title: "Mono Glow", subtitle: "لون واحد — بدون رينبو", emoji: "💡" },
];

/** Legacy presets — kept for saved settings; hidden from main UI. */
export const CHASE_LIGHT_PRESETS_LEGACY: ChaseLightPreset[] = [
  { id: "conic-spin", title: "Conic Spin", subtitle: "حلقة ملونة دوّارة", emoji: "🌈" },
  { id: "liquid-flow", title: "Liquid Flow", subtitle: "تدرج سائل متحرك", emoji: "💧" },
  { id: "pulse-glow", title: "Pulse Glow", subtitle: "توهج نابض", emoji: "💫" },
  { id: "segment-dash", title: "Segment Dash", subtitle: "شرط متقطع", emoji: "⚡" },
  { id: "rainbow-wave", title: "Rainbow Wave", subtitle: "موجة ألوان", emoji: "🎨" },
  { id: "neon-double", title: "Neon Double", subtitle: "حلقتان نيون", emoji: "💠" },
];

export const CHASE_LIGHT_PRESETS: ChaseLightPreset[] = [
  ...CHASE_LIGHT_PRESETS_2026,
  ...CHASE_LIGHT_PRESETS_LEGACY,
];

export interface ChaseLightSettings {
  columns: ChaseLightStyleId;
  composer: ChaseLightStyleId;
  header: ChaseLightStyleId;
  tintHex: string;
  speedSec: number;
  /** Selected cards/edges for neon-beam line (owner picks each one). */
  neonBeamTargets?: NeonBeamTargetId[];
}

const STORAGE_KEY = "lamma_chase_light_settings";
const ROOT_SELECTOR = ".lamma-neutral-glass";

const DEFAULT_SETTINGS: ChaseLightSettings = {
  // Default to no decorative lights — they were always-on and looked messy.
  // Owners can still enable any chase style from the design library.
  columns: "none",
  composer: "none",
  header: "none",
  tintHex: DEFAULT_GLASS_TINT,
  speedSec: 6,
};

let previewSnapshot: ChaseLightSettings | null = null;
let pendingPreview: Partial<ChaseLightSettings> | null = null;

function getRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(ROOT_SELECTOR) as HTMLElement | null;
}

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "110, 231, 183";
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}

function normalizeNeonBeamTargets(raw: unknown): NeonBeamTargetId[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (id): id is NeonBeamTargetId =>
      typeof id === "string" && NEON_BEAM_TARGET_SET.has(id),
  );
}

function buildNeonBeamTargetsAttr(settings: ChaseLightSettings): string {
  const set = new Set<NeonBeamTargetId>(settings.neonBeamTargets ?? []);
  if (settings.composer === "neon-beam") set.add("composer");
  if (settings.header === "neon-beam") set.add("header");
  return NEON_BEAM_ALL_TARGETS.filter((id) => set.has(id)).join(" ");
}

export function getActiveNeonBeamTargets(
  settings?: ChaseLightSettings,
): NeonBeamTargetId[] {
  const s = settings ?? loadChaseLightSettings();
  const attr = buildNeonBeamTargetsAttr(s);
  return attr ? (attr.split(" ") as NeonBeamTargetId[]) : [];
}

function syncNeonBeamChaseFlags(settings: ChaseLightSettings): ChaseLightSettings {
  const targets = new Set(settings.neonBeamTargets ?? []);
  const hasColumnNeon = NEON_BEAM_COLUMN_TARGETS.some((id) => targets.has(id));
  return {
    ...settings,
    ...(hasColumnNeon ? { columns: "neon-beam" as const } : {}),
    ...(targets.has("composer") ? { composer: "neon-beam" as const } : {}),
    ...(targets.has("header") ? { header: "neon-beam" as const } : {}),
  };
}

function normalizeSettings(raw: Partial<ChaseLightSettings> | null): ChaseLightSettings {
  const base = { ...DEFAULT_SETTINGS };
  if (!raw) return base;
  const valid = (id: unknown): id is ChaseLightStyleId =>
    CHASE_LIGHT_PRESETS.some((p) => p.id === id);
  const neonBeamTargets = normalizeNeonBeamTargets(raw.neonBeamTargets);
  const merged: ChaseLightSettings = {
    columns: valid(raw.columns) ? raw.columns : base.columns,
    composer: valid(raw.composer) ? raw.composer : base.composer,
    header: valid(raw.header) ? raw.header : base.header,
    tintHex:
      raw.tintHex && /^#[0-9a-fA-F]{6}$/.test(raw.tintHex)
        ? raw.tintHex
        : base.tintHex,
    speedSec:
      typeof raw.speedSec === "number"
        ? Math.max(2, Math.min(16, raw.speedSec))
        : base.speedSec,
    neonBeamTargets,
  };
  return syncNeonBeamChaseFlags(merged);
}

export function loadChaseLightSettings(): ChaseLightSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeSettings(JSON.parse(raw) as Partial<ChaseLightSettings>);
  } catch {
    // ignore
  }
  return {
    ...DEFAULT_SETTINGS,
    tintHex: loadGlassFormTint() || DEFAULT_SETTINGS.tintHex,
  };
}

function applySettingsToDom(settings: ChaseLightSettings, preview: boolean): boolean {
  const root = getRoot();
  if (!root) return false;

  root.setAttribute("data-chase-columns", settings.columns);
  root.setAttribute("data-chase-composer", settings.composer);
  root.setAttribute("data-chase-header", settings.header);
  const neonBeamAttr = buildNeonBeamTargetsAttr(settings);
  if (neonBeamAttr) {
    root.setAttribute("data-neon-beam-targets", neonBeamAttr);
  } else {
    root.removeAttribute("data-neon-beam-targets");
  }
  root.style.setProperty("--chase-tint", settings.tintHex);
  root.style.setProperty("--chase-tint-rgb", hexToRgbTriplet(settings.tintHex));
  root.style.setProperty("--chase-speed", `${settings.speedSec}s`);

  if (preview) {
    root.setAttribute("data-chase-light-preview", "true");
    setDesignPreviewActive(true);
  } else {
    root.removeAttribute("data-chase-light-preview");
  }
  return true;
}

function persistSettings(settings: ChaseLightSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function getChaseLightLabel(id: ChaseLightStyleId): string {
  return CHASE_LIGHT_PRESETS.find((p) => p.id === id)?.title ?? id;
}

export function previewChaseLightPatch(
  patch: Partial<ChaseLightSettings>,
): boolean {
  if (!previewSnapshot) {
    previewSnapshot = loadChaseLightSettings();
  }
  pendingPreview = { ...(pendingPreview ?? loadChaseLightSettings()), ...patch };
  return applySettingsToDom(normalizeSettings(pendingPreview), true);
}

export function previewChaseLightForTarget(
  target: ChaseLightTarget,
  styleId: ChaseLightStyleId,
): boolean {
  return previewChaseLightPatch({ [target]: styleId });
}

export function commitChaseLightSettings(
  settings?: ChaseLightSettings,
  options?: { skipSync?: boolean },
): boolean {
  const final = normalizeSettings(settings ?? pendingPreview ?? loadChaseLightSettings());
  const ok = applySettingsToDom(final, false);
  if (!ok) return false;
  persistSettings(final);
  previewSnapshot = null;
  pendingPreview = null;
  if (!options?.skipSync) scheduleDesignOverlaysSync();
  return true;
}

export function cancelChaseLightPreview(): boolean {
  const restore = previewSnapshot ?? loadChaseLightSettings();
  previewSnapshot = null;
  pendingPreview = null;
  return applySettingsToDom(restore, false);
}

export function ensureChaseLightApplied(attempt = 0): void {
  if (typeof window === "undefined") return;
  try {
    if (!localStorage.getItem(STORAGE_KEY)) return;
  } catch {
    return;
  }
  const ok = applySettingsToDom(loadChaseLightSettings(), false);
  if (!ok && attempt < 24) {
    window.requestAnimationFrame(() => ensureChaseLightApplied(attempt + 1));
  }
}

export function updateChaseLightTintPreview(tintHex: string): void {
  previewChaseLightPatch({ tintHex });
}

export function previewNeonBeamTargets(
  targets: NeonBeamTargetId[],
  speedSec?: number,
): boolean {
  const unique = NEON_BEAM_ALL_TARGETS.filter((id) => targets.includes(id));
  return previewChaseLightPatch({
    neonBeamTargets: unique,
    ...(typeof speedSec === "number" ? { speedSec } : {}),
  });
}

export function commitNeonBeamTargets(
  targets: NeonBeamTargetId[],
  options?: { speedSec?: number },
): boolean {
  const base = loadChaseLightSettings();
  const unique = NEON_BEAM_ALL_TARGETS.filter((id) => targets.includes(id));
  const set = new Set(unique);
  const next = normalizeSettings({
    ...base,
    neonBeamTargets: unique,
    composer: set.has("composer")
      ? "neon-beam"
      : base.composer === "neon-beam"
        ? "none"
        : base.composer,
    header: set.has("header")
      ? "neon-beam"
      : base.header === "neon-beam"
        ? "none"
        : base.header,
    columns: NEON_BEAM_COLUMN_TARGETS.some((id) => set.has(id))
      ? "neon-beam"
      : base.columns === "neon-beam"
        ? "none"
        : base.columns,
    speedSec: options?.speedSec ?? base.speedSec,
  });
  return commitChaseLightSettings(next);
}

export function clearNeonBeamTargets(): boolean {
  const base = loadChaseLightSettings();
  const next = normalizeSettings({
    ...base,
    neonBeamTargets: [],
    columns: base.columns === "neon-beam" ? "none" : base.columns,
    composer: base.composer === "neon-beam" ? "none" : base.composer,
    header: base.header === "neon-beam" ? "none" : base.header,
  });
  return commitChaseLightSettings(next);
}
