/**
 * Collect / apply sidebar overlay settings bundled in universal_style_config.overlays.
 */
import { applyFace, loadFace, saveFace, type CustomFace } from "../../lib/customFace";
import { loadBubbleShapeId, commitBubbleShape, type BubbleShapeId } from "./bubbleShapeService";
import { loadChaseLightSettings, commitChaseLightSettings, type ChaseLightSettings } from "./chaseLightBarService";
import {
  loadColumnCardStyleId,
  loadColumnCardTint,
  commitColumnCardStyle,
  type ColumnCardStyleId,
} from "./columnCardStyleService";
import {
  loadGlassFormState,
  commitGlassForm,
  type GlassFormId,
} from "./glassTransparencyService";
import { loadPmBubbleStyleId, commitPmBubbleStyle, type PmBubbleStyleId } from "./pmBubbleStyleService";
import {
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

function loadFx2026(): Record<string, boolean> {
  try {
    const s = localStorage.getItem("lamma_fx_on");
    return s ? (JSON.parse(s) as Record<string, boolean>) : {};
  } catch { return {}; }
}

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
    commitChaseLightSettings(bundle.chaseLight, skipSync);
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
    try { localStorage.setItem("lamma_fx_on", JSON.stringify(bundle.fx2026)); } catch {}
    Object.entries(bundle.fx2026).forEach(([id, on]) => {
      document.body.classList.toggle(`lamma-fx-${id}`, !!on);
    });
  }
}

export function attachOverlaysToConfig(
  config: UniversalStyleConfig,
): UniversalStyleConfig {
  return {
    ...normalizeUniversalStyleConfig(config),
    overlays: collectDesignOverlays(),
  };
}
