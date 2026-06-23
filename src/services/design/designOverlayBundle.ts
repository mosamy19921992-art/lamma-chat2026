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
}

const skipSync = { skipSync: true as const };

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
}

export function attachOverlaysToConfig(
  config: UniversalStyleConfig,
): UniversalStyleConfig {
  return {
    ...normalizeUniversalStyleConfig(config),
    overlays: collectDesignOverlays(),
  };
}
