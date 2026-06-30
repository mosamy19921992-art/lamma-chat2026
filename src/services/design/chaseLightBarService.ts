import { loadGlassFormTint, DEFAULT_GLASS_TINT } from "./glassTransparencyService";
import { setDesignPreviewActive } from "./designPreviewDom";
import { scheduleDesignOverlaysSync } from "./designOverlaySync";

/** Legacy edge-chase ids — migrated to "none" on load. Neon frame uses neonBeamTargets. */
export type ChaseLightStyleId =
  | "none"
  | "neon-beam"
  | "soft-edge"
  | "aurora-flow"
  | "ambient-breathe"
  | "laser-scan"
  | "mono-glow";

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

/** Edge chase styles (Soft/Aurora/Laser…) removed — only none + neon-beam remain. */
function stripEdgeChaseStyle(id: unknown): ChaseLightStyleId {
  if (id === "neon-beam") return "neon-beam";
  return "none";
}

function buildNeonBeamTargetsAttr(settings: ChaseLightSettings): string {
  const set = new Set<NeonBeamTargetId>(settings.neonBeamTargets ?? []);
  if (settings.composer === "neon-beam") set.add("composer");
  if (settings.header === "neon-beam") set.add("header");
  return NEON_BEAM_ALL_TARGETS.filter((id) => set.has(id)).join(" ");
}

const UDS_CONTAINER_NEON_CLASSES = [
  "uds-container-neon-led",
  "uds-container-pulsing-glow",
  "uds-container-border-aura",
  "uds-container-static-cyber",
  "uds-container-rgb-wave",
] as const;

const NEON_BEAM_PANEL_GLASS_SELECTORS: Partial<Record<NeonBeamTargetId, string>> = {
  store: ".lamma-store-panel .lamma-glass",
  radio: ".lamma-radio-panel .lamma-glass",
  music: ".lamma-music-panel .lamma-glass",
  rooms: ".lamma-rooms-panel .lamma-glass",
  members: ".lamma-members-panel .lamma-glass",
};

/** UDS container neon uses the same ::before — strip it on chase neon-beam cards. */
function clearConflictingUdsNeonOnBeamTargets(settings: ChaseLightSettings): void {
  if (typeof document === "undefined") return;
  const targets = settings.neonBeamTargets ?? [];
  for (const id of targets) {
    const selector = NEON_BEAM_PANEL_GLASS_SELECTORS[id];
    if (!selector) continue;
    document.querySelectorAll(selector).forEach((node) => {
      const el = node as HTMLElement;
      UDS_CONTAINER_NEON_CLASSES.forEach((cls) => el.classList.remove(cls));
    });
  }
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
  return {
    ...settings,
    columns: "none",
    composer: targets.has("composer")
      ? "neon-beam"
      : settings.composer === "neon-beam"
        ? "none"
        : "none",
    header: targets.has("header")
      ? "neon-beam"
      : settings.header === "neon-beam"
        ? "none"
        : "none",
  };
}

/** Sync composer/header flags into neonBeamTargets — never auto-fill all column cards. */
function hydrateNeonBeamTargets(settings: ChaseLightSettings): ChaseLightSettings {
  const targets = new Set(settings.neonBeamTargets ?? []);
  if (settings.composer === "neon-beam") {
    targets.add("composer");
  } else {
    targets.delete("composer");
  }
  if (settings.header === "neon-beam") {
    targets.add("header");
  } else {
    targets.delete("header");
  }
  return {
    ...settings,
    columns: "none",
    neonBeamTargets: NEON_BEAM_ALL_TARGETS.filter((id) => targets.has(id)),
  };
}

function normalizeSettings(raw: Partial<ChaseLightSettings> | null): ChaseLightSettings {
  const base = { ...DEFAULT_SETTINGS };
  if (!raw) return base;
  const neonBeamTargets = normalizeNeonBeamTargets(raw.neonBeamTargets);
  const merged: ChaseLightSettings = {
    columns: "none",
    composer: stripEdgeChaseStyle(raw.composer),
    header: stripEdgeChaseStyle(raw.header),
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
  return syncNeonBeamChaseFlags(hydrateNeonBeamTargets(merged));
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

  root.setAttribute("data-chase-columns", "none");
  root.setAttribute(
    "data-chase-composer",
    settings.composer === "neon-beam" ? "neon-beam" : "none",
  );
  root.setAttribute(
    "data-chase-header",
    settings.header === "neon-beam" ? "neon-beam" : "none",
  );
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
  clearConflictingUdsNeonOnBeamTargets(settings);
  return true;
}

function persistSettings(settings: ChaseLightSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
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

export function commitChaseLightSettings(
  settings?: ChaseLightSettings,
  options?: { skipSync?: boolean },
): boolean {
  const final = normalizeSettings(settings ?? pendingPreview ?? loadChaseLightSettings());
  persistSettings(final);
  previewSnapshot = null;
  pendingPreview = null;
  const ok = applySettingsToDom(final, false);
  if (!ok) {
    ensureChaseLightApplied();
  }
  if (!options?.skipSync) scheduleDesignOverlaysSync();
  return ok || true;
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
    composer: set.has("composer") ? "neon-beam" : "none",
    header: set.has("header") ? "neon-beam" : "none",
    speedSec: options?.speedSec ?? base.speedSec,
  });
  return commitChaseLightSettings(next);
}

export function clearNeonBeamTargets(): boolean {
  const base = loadChaseLightSettings();
  const next = normalizeSettings({
    ...base,
    neonBeamTargets: [],
    composer: "none",
    header: "none",
  });
  return commitChaseLightSettings(next);
}
