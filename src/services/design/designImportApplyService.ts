import type { DesignImportPack } from "./designImportCatalog";
import type { DesignAssistantProposalId } from "../../lib/chatTypes";
import {
  previewGlassForm,
  commitGlassForm,
  cancelGlassPreview,
  type GlassFormId,
} from "./glassTransparencyService";
import {
  previewColumnCardStyle,
  commitColumnCardStyle,
  cancelColumnCardPreview,
  type ColumnCardStyleId,
} from "./columnCardStyleService";

const DEFAULT_TINT = "#6ee7b7";

export function getImportPackTint(pack: DesignImportPack): string {
  return pack.tintHex && /^#[0-9a-fA-F]{6}$/.test(pack.tintHex)
    ? pack.tintHex
    : DEFAULT_TINT;
}

/** Preview glass + column parts of an import pack (style prompt handled separately). */
export function previewImportPackVisuals(pack: DesignImportPack): void {
  const tint = getImportPackTint(pack);
  if (pack.glassFormId) {
    previewGlassForm(pack.glassFormId as GlassFormId, tint);
  }
  if (pack.columnCardStyleId) {
    previewColumnCardStyle(pack.columnCardStyleId as ColumnCardStyleId, tint);
  }
}

/** Commit glass + column parts after owner confirms. */
export function commitImportPackVisuals(pack: DesignImportPack): boolean {
  const tint = getImportPackTint(pack);
  let ok = true;
  if (pack.glassFormId) {
    ok = commitGlassForm(pack.glassFormId as GlassFormId, tint) && ok;
  }
  if (pack.columnCardStyleId) {
    ok =
      commitColumnCardStyle(
        pack.columnCardStyleId as ColumnCardStyleId,
        tint,
      ) && ok;
  }
  return ok;
}

export function cancelImportPackVisualPreview(): void {
  cancelGlassPreview();
  cancelColumnCardPreview();
}

export function describeImportPackLayers(pack: DesignImportPack): string {
  const bits: string[] = [pack.title];
  if (pack.glassFormId) bits.push("زجاج");
  if (pack.columnCardStyleId) bits.push("بطاقات");
  if (pack.templateId) bits.push("قالب");
  if (pack.stylePrompt) bits.push("ألوان");
  return bits.join(" + ");
}

export type ImportPackTemplatePreview = (
  id: DesignAssistantProposalId,
) => { id: DesignAssistantProposalId; summary: string } | null | undefined;

export type ImportPackTemplateCommit = (
  id: DesignAssistantProposalId,
) => string | null | undefined;
