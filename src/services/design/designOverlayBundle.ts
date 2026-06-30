/**
 * Collect / apply sidebar overlay settings bundled in universal_style_config.overlays.
 */
import { applyFace, loadFace, saveFace, type CustomFace } from "../../lib/customFace";
import { ensureBubbleShapeApplied, loadBubbleShapeId, commitBubbleShape, type BubbleShapeId } from "./bubbleShapeService";
import {
  ensureChaseLightApplied,
  loadChaseLightSettings,
  commitChaseLightSettings,
  resolveChaseLightForRemoteApply,
  type ChaseLightSettings,
} from "./chaseLightBarService";
import {
  ensureColumnCardStyleApplied,
  loadColumnCardStyleId,
  loadColumnCardTint,
  commitColumnCardStyle,
  type ColumnCardStyleId,
} from "./columnCardStyleService";
import {
  ensureGlassFormApplied,
  loadGlassFormState,
  commitGlassForm,
  type GlassFormId,
} from "./glassTransparencyService";
import { ensurePmBubbleStyleApplied, loadPmBubbleStyleId, commitPmBubbleStyle, type PmBubbleStyleId } from "./pmBubbleStyleService";
import {
  ensureSidebarWidgetStylesApplied,
  loadSidebarWidgetSettings,
  commitSidebarWidgetSettings,
  type SidebarWidgetSettings,
} from "./sidebarWidgetStyleService";
import {
  normalizeUniversalStyleConfig,
  type UniversalStyleConfig,
} from "./universalStyleTypes";
import {
  loadUDSSettings,
  saveUDSSettings,
  applyUDSSettings,
  type UDSSettings,
} from "./ultimateDesignSystemService";

export interface DesignOverlaysBundle {
  version: 1;
  sidebarWidgets: SidebarWidgetSettings;
  chaseLight: ChaseLightSettings;
  columnCard: {
    styleId: ColumnCardStyleId | null;
    tintHex: string;
  };
  glassForm: {
    formId: GlassFormId | null;
    tintHex: string;
  };
  bubbleShape: BubbleShapeId;
  pmBubble: PmBubbleStyleId;
  customFace: CustomFace;
  /** UDS neon/glass settings — synced so all visitors see owner's effects */
  uds?: UDSSettings;
  /** Magic 2026 FX body-class toggles — synced so all visitors see owner's effects */
  fx2026?: Record<string, boolean>;
}

const skipSync = { skipSync: true as const };
const CHAT_ROOT_SELECTOR = ".lamma-neutral-glass";
/** Ignore stale remote fx2026 overlays briefly after a local owner edit. */
let fxLocalEditEpoch = 0;
const FX_LOCAL_GUARD_MS = 8000;

export function markFx2026LocalEdit(): void {
  fxLocalEditEpoch = Date.now();
}

export function shouldPreferLocalFx2026(): boolean {
  return Date.now() - fxLocalEditEpoch < FX_LOCAL_GUARD_MS;
}

function loadFx2026(): Record<string, boolean> {
  try {
    const s = localStorage.getItem("lamma_fx_on");
    return s ? (JSON.parse(s) as Record<string, boolean>) : {};
  } catch { return {}; }
}

const FX2026_IDS = [
  "holo",
  "aurora",
  "shimmer",
  "float",
  "neon",
  "rainbow",
  "crystal",
  "liquid",
] as const;

export function collectDesignOverlays(): DesignOverlaysBundle {
  const glass = loadGlassFormState();
  return {
    version: 1,
    sidebarWidgets: loadSidebarWidgetSettings(),
    chaseLight: loadChaseLightSettings(),
    columnCard: {
      styleId: loadColumnCardStyleId(),
      tintHex: loadColumnCardTint(),
    },
    glassForm: {
      formId: glass.formId,
      tintHex: glass.tintHex,
    },
    bubbleShape: loadBubbleShapeId(),
    pmBubble: loadPmBubbleStyleId(),
    customFace: loadFace(),
    uds: loadUDSSettings(),
    fx2026: loadFx2026(),
  };
}

/** Apply remote overlay bundle to DOM + localStorage (all visitors). */
export function applyDesignOverlays(bundle: Partial<DesignOverlaysBundle> | undefined): void {
  if (!bundle || bundle.version !== 1) return;

  if (bundle.sidebarWidgets) {
    commitSidebarWidgetSettings(bundle.sidebarWidgets, skipSync);
  }
  if (bundle.chaseLight) {
    commitChaseLightSettings(
      resolveChaseLightForRemoteApply(bundle.chaseLight),
      skipSync,
    );
  }
  if (bundle.columnCard) {
    const id = bundle.columnCard.styleId ?? "neon-ring";
    commitColumnCardStyle(id, bundle.columnCard.tintHex, skipSync);
  }
  if (bundle.glassForm?.formId) {
    commitGlassForm(bundle.glassForm.formId, bundle.glassForm.tintHex, skipSync);
  }
  if (bundle.bubbleShape) {
    commitBubbleShape(bundle.bubbleShape, skipSync);
  }
  if (bundle.pmBubble) {
    commitPmBubbleStyle(bundle.pmBubble, skipSync);
  }
  if (bundle.customFace) {
    saveFace(bundle.customFace);
    applyFace(bundle.customFace);
  }
  if (bundle.uds) {
    saveUDSSettings(bundle.uds);
    applyUDSSettings(bundle.uds);
  }
  if (bundle.fx2026) {
    applyFx2026ToBody(
      shouldPreferLocalFx2026() ? loadFx2026() : bundle.fx2026,
    );
  }
}

/** Apply FX 2026 toggles to body classes + localStorage. */
export function applyFx2026ToBody(fx: Record<string, boolean>): void {
  if (typeof document === "undefined") return;
  try {
    localStorage.setItem("lamma_fx_on", JSON.stringify(fx));
  } catch {
    // non-fatal
  }
  FX2026_IDS.forEach((id) => {
    document.body.classList.toggle(`lamma-fx-${id}`, !!fx[id]);
  });
}

export function attachOverlaysToConfig(
  config: UniversalStyleConfig,
): UniversalStyleConfig {
  return {
    ...normalizeUniversalStyleConfig(config),
    overlays: collectDesignOverlays(),
  };
}

/** Restore Magic 2026 FX body classes from localStorage (survives refresh). */
export function applyFx2026FromLocalStorage(): void {
  if (typeof document === "undefined") return;
  if (!document.querySelector(CHAT_ROOT_SELECTOR)) return;
  applyFx2026ToBody(loadFx2026());
}

/** Re-apply every shape/glass/chase overlay from live localStorage keys. */
export function ensureAllDesignOverlaysApplied(attempt = 0): void {
  if (typeof window === "undefined") return;
  applyDesignOverlays(collectDesignOverlays());
  applyFx2026FromLocalStorage();
  applyUDSSettings(loadUDSSettings());

  const root = document.querySelector(".lamma-neutral-glass");
  if (!root) {
    if (attempt < 24) {
      window.requestAnimationFrame(() => ensureAllDesignOverlaysApplied(attempt + 1));
    }
    return;
  }

  ensureChaseLightApplied();
  ensureGlassFormApplied();
  ensureBubbleShapeApplied();
  ensureColumnCardStyleApplied();
  ensureSidebarWidgetStylesApplied();
  ensurePmBubbleStyleApplied();
}
