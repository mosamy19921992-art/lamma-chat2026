import React, { useEffect, useRef, useState } from 'react';
import { DesignShapesPanel } from './DesignShapesPanel';
import { applyFace, loadFace, saveFace, cancelFacePreview } from '../../lib/customFace';
import { setDesignPreviewActive } from '../../services/design/designPreviewDom';
import {
  applyGlassForm,
  cancelGlassPreview,
  commitGlassForm,
  loadGlassFormId,
  loadGlassFormTint,
  GLASS_FORM_PRESETS,
  GLASS_TINT_SWATCHES,
  type GlassFormId,
} from '../../services/design/glassTransparencyService';
import {
  cancelColumnCardPreview,
  commitColumnCardStyle,
  type ColumnCardStyleId,
} from '../../services/design/columnCardStyleService';
import { commitBubbleShape, type BubbleShapeId } from '../../services/design/bubbleShapeService';
import {
  commitChaseLightSettings,
  cancelChaseLightPreview,
  ensureChaseLightApplied,
  loadChaseLightSettings,
  commitNeonBeamTargets,
  clearNeonBeamTargets,
  getActiveNeonBeamTargets,
  NEON_BEAM_ALL_TARGETS,
  NEON_BEAM_TARGET_LABELS,
  type ChaseLightSettings,
  type NeonBeamTargetId,
} from '../../services/design/chaseLightBarService';

import {
  applyDesignAiPatch,
  askDesignAi,
} from '../../services/design/designAiService';
import {
  applyUiverseCssToTarget,
  fetchUiverseCssFromUrl,
  getActiveUiverseScopedApplies,
  resetUiverseScopedStyle,
  type UiverseFetchResult,
} from '../../services/design/uiverseScopedImportService';
import {
  createDefaultUniversalStyle,
  ensureReadablePalette,
  normalizeUniversalStyleConfig,
  type UniversalStyleConfig,
} from '../../services/design/universalStyleTypes';
import { syncPaletteTextTokens } from '../../services/design/universalStyleApply';
import { hexToRgba } from '../../lib/chatHelpers';

import {
  commitSidebarWidgetSettings,
} from '../../services/design/sidebarWidgetStyleService';
import { commitPmBubbleStyle } from '../../services/design/pmBubbleStyleService';
import {
  applyUDSSettings,
  loadUDSSettings,
  commitUDSSettings,
  resetUDSSettings,
  getPaletteLabel,
  type UDSSettings,
} from '../../services/design/ultimateDesignSystemService';
import { flushDesignOverlaysSync, scheduleDesignOverlaysSync } from '../../services/design/designOverlaySync';
import {
  applyFx2026FromLocalStorage,
  applyFx2026ToBody,
  markFx2026LocalEdit,
} from '../../services/design/designOverlayBundle';

type DesignSection = "colors" | "shapes" | "uploads" | "ultimate" | "mega" | "uiverse";

type DesignCommitResult = {
  ok: boolean;
  message: string;
  localOnly?: boolean;
  previewApplied?: boolean;
};

type DesignPreviewVerifyResult = {
  ok: boolean;
  message: string;
  previewApplied?: boolean;
};

type DesignPreviewConfigResult = {
  summary: string;
  config: UniversalStyleConfig;
  previewApplied: boolean;
};

interface DesignCenterModalProps {
  isOwnerRole: boolean;
  brandLogoUrl: string | null;
  designLogoUploadRef: React.RefObject<HTMLInputElement | null>;
  handleDesignLogoUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void | Promise<void>;
  designLogoInput: string;
  setDesignLogoInput: React.Dispatch<React.SetStateAction<string>>;
  setBrandLogoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  activeRoomId: string;
  openRooms: Array<{ id: string; name: string }>;
  designRoomBgUploadRef: React.RefObject<HTMLInputElement | null>;
  handleDesignRoomBgUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void | Promise<void>;
  designRoomBgInput: string;
  setDesignRoomBgInput: React.Dispatch<React.SetStateAction<string>>;
  roomBgMap: Record<string, string>;
  setRoomBgMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  designOwnerBgUploadRef: React.RefObject<HTMLInputElement | null>;
  handleDesignOwnerBgUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void | Promise<void>;
  designOwnerBgInput: string;
  setDesignOwnerBgInput: React.Dispatch<React.SetStateAction<string>>;
  setOwnerBgImage: React.Dispatch<React.SetStateAction<string | null>>;
  onResetDefaultChatBackground?: () => void | Promise<void>;
  uploadDesignImage: (file: File, folder: string) => Promise<string | null>;
  onStartInspectMode: () => void | Promise<void>;
  previewDesignConfig?: (
    config: UniversalStyleConfig,
  ) => DesignPreviewConfigResult | null;
  committedConfig: UniversalStyleConfig | null;
  getEditableDesignConfig?: () => UniversalStyleConfig;
  cancelPendingDesignPreview?: () => void;
  commitPendingDesignPreview?: () =>
    | DesignCommitResult
    | Promise<DesignCommitResult>;
  flushAllDesignPersistence?: () =>
    | DesignCommitResult
    | Promise<DesignCommitResult>;
  verifyDesignPreviewDom?: () => DesignPreviewVerifyResult;
  hasPendingDesignPreview: boolean;
  isApplyingStyle: boolean;
  ownerWriteAccessOk: boolean | null;
}

/** ثيمات Mega 2026 — كل ثيم يضبط الألوان + الزجاج + الأعمدة + الأنوار + التأثيرات + UDS دفعة واحدة. */
const MEGA_THEMES_2026: {
  id: string;
  name: string;
  emoji: string;
  hint: string;
  preview: string;
  colors: { name: string; bg: string; surface: string; text: string; accent: string; accent2: string };
  glass: { id: GlassFormId; tint: string };
  column: { id: ColumnCardStyleId; tint: string };
  chase: ChaseLightSettings;
  fx: Record<string, boolean>;
  uds: UDSSettings;
}[] = [
  {
    id: "violet-night",
    name: "ليل بنفسجي",
    emoji: "💜",
    hint: "نيون بنفسجي + زجاج كريستالي",
    preview: "linear-gradient(135deg, #0b0813 0%, #1c1628 60%, rgba(167,139,250,0.25) 100%)",
    colors: { name: "ليل بنفسجي", bg: "#0b0813", surface: "rgba(19,15,29,0.75)", text: "#f0e6ff", accent: "#a78bfa", accent2: "#7c3aed" },
    glass: { id: "crystal", tint: "#a78bfa" },
    column: { id: "neon-ring", tint: "#a78bfa" },
    chase: { columns: "none", composer: "none", header: "none", tintHex: "#a78bfa", speedSec: 5 },
    fx: { holo: false, aurora: true, shimmer: true, float: false, neon: true, rainbow: false, crystal: true, liquid: false },
    uds: { neonBorder: "none", neonBorderColor: "electric-violet", glassTexture: "crystal-glow", glassTint: "electric-violet", palette: "electric-violet", applyToBody: false, applyToContainers: true },
  },
  {
    id: "cyberpunk-fire",
    name: "سيبربانك ناري",
    emoji: "🔥",
    hint: "ماجنتا + سيان + LED دوار",
    preview: "linear-gradient(135deg, #0a0014 0%, #1a0028 50%, rgba(255,0,255,0.2) 75%, rgba(0,255,255,0.1) 100%)",
    colors: { name: "سيبربانك ناري", bg: "#0a0014", surface: "rgba(20,5,35,0.78)", text: "#f0e6ff", accent: "#ff00ff", accent2: "#00ffff" },
    glass: { id: "smoke-dark", tint: "#ff00ff" },
    column: { id: "neon-ring", tint: "#ff00ff" },
    chase: {
      columns: "none",
      composer: "neon-beam",
      header: "none",
      tintHex: "#ff00ff",
      speedSec: 3,
      neonBeamTargets: ["store", "radio", "music", "rooms", "members", "composer"],
    },
    fx: { holo: true, aurora: false, shimmer: false, float: false, neon: true, rainbow: true, crystal: false, liquid: true },
    uds: { neonBorder: "none", neonBorderColor: "cyberpunk-pink", glassTexture: "crystal-glow", glassTint: "cyberpunk-pink", palette: "cyberpunk-pink", applyToBody: false, applyToContainers: true },
  },
  {
    id: "ocean-deep",
    name: "أعماق المحيط",
    emoji: "🌊",
    hint: "أزرق سماوي + زجاج سائل",
    preview: "linear-gradient(135deg, #030a14 0%, #071828 60%, rgba(6,182,212,0.2) 100%)",
    colors: { name: "أعماق المحيط", bg: "#030a14", surface: "rgba(7,24,40,0.72)", text: "#e0f4ff", accent: "#06b6d4", accent2: "#0ea5e9" },
    glass: { id: "ios-liquid", tint: "#06b6d4" },
    column: { id: "ios-sheet", tint: "#06b6d4" },
    chase: { columns: "none", composer: "none", header: "none", tintHex: "#06b6d4", speedSec: 6 },
    fx: { holo: false, aurora: true, shimmer: true, float: true, neon: false, rainbow: false, crystal: false, liquid: false },
    uds: { neonBorder: "pulsing-glow", neonBorderColor: "neon-cyan", glassTexture: "ios-ultra-blur", glassTint: "neon-cyan", palette: "neon-cyan", applyToBody: false, applyToContainers: true },
  },
  {
    id: "emerald-forest",
    name: "غابة زمردية",
    emoji: "🌿",
    hint: "أخضر + بطاقات طائرة",
    preview: "linear-gradient(135deg, #020f08 0%, #0a2016 60%, rgba(16,185,129,0.2) 100%)",
    colors: { name: "غابة زمردية", bg: "#020f08", surface: "rgba(10,32,22,0.78)", text: "#ecfdf5", accent: "#10b981", accent2: "#34d399" },
    glass: { id: "ghost", tint: "#10b981" },
    column: { id: "liquid-ring", tint: "#10b981" },
    chase: { columns: "none", composer: "none", header: "none", tintHex: "#10b981", speedSec: 7 },
    fx: { holo: true, aurora: true, shimmer: false, float: true, neon: false, rainbow: false, crystal: false, liquid: false },
    uds: { neonBorder: "border-aura", neonBorderColor: "aurora-green", glassTexture: "velvet-blur", glassTint: "aurora-green", palette: "aurora-green", applyToBody: false, applyToContainers: true },
  },
  {
    id: "gold-luxe",
    name: "ذهبي فاخر",
    emoji: "✨",
    hint: "ذهب ملكي + كريستال LED",
    preview: "linear-gradient(135deg, #0f0b00 0%, #1e1500 60%, rgba(251,191,36,0.25) 100%)",
    colors: { name: "ذهبي فاخر", bg: "#0f0b00", surface: "rgba(26,20,0,0.8)", text: "#fef9e7", accent: "#fbbf24", accent2: "#f59e0b" },
    glass: { id: "mirror", tint: "#fbbf24" },
    column: { id: "crystal", tint: "#fbbf24" },
    chase: { columns: "none", composer: "none", header: "none", tintHex: "#fbbf24", speedSec: 5 },
    fx: { holo: false, aurora: false, shimmer: true, float: false, neon: false, rainbow: false, crystal: true, liquid: true },
    uds: { neonBorder: "led-strip", neonBorderColor: "gold-eclipse", glassTexture: "dark-mirror", glassTint: "gold-eclipse", palette: "gold-eclipse", applyToBody: false, applyToContainers: true },
  },
  {
    id: "ice-crystal",
    name: "جليد كريستالي",
    emoji: "❄️",
    hint: "أبيض جليدي + قوس قزح",
    preview: "linear-gradient(135deg, #030810 0%, #0a1428 60%, rgba(186,230,253,0.2) 100%)",
    colors: { name: "جليد كريستالي", bg: "#030810", surface: "rgba(10,20,40,0.65)", text: "#f0f8ff", accent: "#bae6fd", accent2: "#7dd3fc" },
    glass: { id: "ios-vibrancy", tint: "#caf0f8" },
    column: { id: "ios-inset", tint: "#caf0f8" },
    chase: { columns: "none", composer: "none", header: "none", tintHex: "#caf0f8", speedSec: 8 },
    fx: { holo: false, aurora: false, shimmer: true, float: false, neon: false, rainbow: true, crystal: true, liquid: false },
    uds: { neonBorder: "static-cyber", neonBorderColor: "minimalist-white", glassTexture: "ios-ultra-blur", glassTint: "minimalist-white", palette: "minimalist-white", applyToBody: false, applyToContainers: true },
  },
  {
    id: "deep-space",
    name: "الفضاء العميق",
    emoji: "🌌",
    hint: "أورورا فضائية + طائرة",
    preview: "linear-gradient(135deg, #010208 0%, #020510 50%, rgba(99,102,241,0.2) 75%, rgba(124,58,237,0.1) 100%)",
    colors: { name: "الفضاء العميق", bg: "#010208", surface: "rgba(5,8,20,0.82)", text: "#e2e8f0", accent: "#6366f1", accent2: "#8b5cf6" },
    glass: { id: "ios-widget", tint: "#6366f1" },
    column: { id: "frosted", tint: "#6366f1" },
    chase: { columns: "none", composer: "none", header: "none", tintHex: "#6366f1", speedSec: 5 },
    fx: { holo: false, aurora: true, shimmer: false, float: true, neon: true, rainbow: false, crystal: false, liquid: false },
    uds: { neonBorder: "pulsing-glow", neonBorderColor: "electric-violet", glassTexture: "dark-mirror", glassTint: "electric-violet", palette: "deep-space-blue", applyToBody: false, applyToContainers: true },
  },
  {
    id: "dark-minimal",
    name: "داكن نظيف",
    emoji: "🌑",
    hint: "بسيط وسريع — بلا تأثيرات",
    preview: "linear-gradient(135deg, #060a12 0%, #0f1318 100%)",
    colors: { name: "داكن نظيف", bg: "#060a12", surface: "rgba(15,19,24,0.8)", text: "#f1f5f9", accent: "#6366f1", accent2: "#818cf8" },
    glass: { id: "classic", tint: "#6366f1" },
    column: { id: "soft-round", tint: "#6366f1" },
    chase: { columns: "none", composer: "none", header: "none", tintHex: "#6366f1", speedSec: 6 },
    fx: { holo: false, aurora: false, shimmer: false, float: false, neon: false, rainbow: false, crystal: false, liquid: false },
    uds: { neonBorder: "none", neonBorderColor: "deep-space-blue", glassTexture: "soft-frosted", glassTint: "none", palette: "deep-space-blue", applyToBody: false, applyToContainers: true },
  },
];

/** ثيمات ألوان 2026 — ضبط ألوان + زجاج/عمود/فقاعة بدون مسح الـ FX. */
const MODERN_THEME_PRESETS: {
  name: string;
  bg: string;
  surface: string;
  text: string;
  accent: string;
  accent2: string;
  glass?: GlassFormId;
  column?: ColumnCardStyleId;
  bubble?: BubbleShapeId;
}[] = [
  { name: "ميدنايت أزرق", bg: "#060a12", surface: "rgba(18,24,32,0.72)", text: "#f1f5f9", accent: "#3b82f6", accent2: "#06b6d4", glass: "crystal", column: "neon-ring", bubble: "default" },
  { name: "فحمي بنفسجي", bg: "#0a0710", surface: "rgba(26,18,38,0.72)", text: "#f5f3ff", accent: "#a855f7", accent2: "#6366f1", glass: "smoke-dark", column: "neon-ring", bubble: "whatsapp" },
  { name: "أسود زمردي", bg: "#05080a", surface: "rgba(12,22,18,0.72)", text: "#ecfdf5", accent: "#10b981", accent2: "#34d399", glass: "ghost", column: "liquid-ring", bubble: "ios" },
  { name: "جرافيت ذهبي", bg: "#0a0a0a", surface: "rgba(24,22,16,0.75)", text: "#fafaf9", accent: "#f59e0b", accent2: "#fbbf24", glass: "mirror", column: "crystal", bubble: "default" },
  { name: "نبيذي وردي", bg: "#100509", surface: "rgba(34,12,20,0.72)", text: "#fdf2f8", accent: "#ec4899", accent2: "#f472b6", glass: "smoke-dark", column: "soft-round", bubble: "facebook" },
  { name: "نيلي عميق", bg: "#070815", surface: "rgba(16,18,40,0.72)", text: "#eef2ff", accent: "#6366f1", accent2: "#818cf8", glass: "ios-vibrancy", column: "ios-inset", bubble: "ios" },
  { name: "تركواز ليلي", bg: "#04100f", surface: "rgba(10,28,26,0.72)", text: "#f0fdfa", accent: "#14b8a6", accent2: "#2dd4bf", glass: "ios-liquid", column: "ios-sheet", bubble: "ios" },
  { name: "رمادي حديث", bg: "#0b0d10", surface: "rgba(22,26,32,0.74)", text: "#f8fafc", accent: "#64748b", accent2: "#94a3b8", glass: "classic", column: "soft-round", bubble: "default" },
  { name: "أحمر فحمي", bg: "#0e0507", surface: "rgba(32,12,14,0.72)", text: "#fef2f2", accent: "#ef4444", accent2: "#fb7185", glass: "smoke-dark", column: "neon-ring", bubble: "whatsapp" },
  { name: "برتقالي غروب", bg: "#100a05", surface: "rgba(34,22,12,0.72)", text: "#fff7ed", accent: "#f97316", accent2: "#fb923c", glass: "mirror", column: "crystal", bubble: "facebook" },
  { name: "سماوي جليدي", bg: "#050d12", surface: "rgba(12,26,34,0.72)", text: "#ecfeff", accent: "#06b6d4", accent2: "#22d3ee", glass: "ios-vibrancy", column: "ios-inset", bubble: "ios" },
  { name: "ماجنتا ليلي", bg: "#0c0510", surface: "rgba(28,12,34,0.72)", text: "#fdf4ff", accent: "#d946ef", accent2: "#e879f9", glass: "smoke-dark", column: "neon-ring", bubble: "telegram" },
];

const FX_LIST_2026 = [
  { id: "holo", emoji: "🌈", label: "نص هولوجرافيك", hint: "عناوين البطاقات بألوان قوس قزح" },
  { id: "aurora", emoji: "🌌", label: "خلفية أورورا", hint: "شفق قطبي خلف البطاقات" },
  { id: "shimmer", emoji: "💎", label: "شيمر زجاجي", hint: "شريط لمعة يمر على البطاقات" },
  { id: "float", emoji: "🌿", label: "بطاقات طائرة", hint: "أعمدة الشات تطفو بنعومة" },
  { id: "neon", emoji: "💜", label: "نيون ينبض", hint: "الأزرار الأساسية تضيء" },
  { id: "rainbow", emoji: "🎨", label: "حدود قوس قزح", hint: "إطار ملون حول البطاقات" },
  { id: "crystal", emoji: "✦", label: "بريق كريستال", hint: "نجوم لمعة على زوايا البطاقات" },
  { id: "liquid", emoji: "💧", label: "أزرار سائلة", hint: "الأزرار تملأ بمائع نيوني" },
] as const;

type FxId = typeof FX_LIST_2026[number]["id"];

type ThemeColorPreset = {
  name: string;
  bg: string;
  surface: string;
  text: string;
  accent: string;
  accent2: string;
  glass?: GlassFormId;
  column?: ColumnCardStyleId;
  bubble?: BubbleShapeId;
};

function surfaceToPickerHex(surface: string, fallback = "#121820"): string {
  if (surface.startsWith("#")) return surface.slice(0, 7);
  const match = surface.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return fallback;
  return (
    "#" +
    [match[1], match[2], match[3]]
      .map((part) => parseInt(part ?? "0", 10).toString(16).padStart(2, "0"))
      .join("")
  );
}

export const DesignCenterModal = ({
  isOwnerRole,
  brandLogoUrl,
  designLogoUploadRef,
  handleDesignLogoUpload,
  designLogoInput,
  setDesignLogoInput,
  setBrandLogoUrl,
  activeRoomId,
  openRooms,
  designRoomBgUploadRef,
  handleDesignRoomBgUpload,
  designRoomBgInput,
  setDesignRoomBgInput,
  roomBgMap,
  setRoomBgMap,
  designOwnerBgUploadRef,
  handleDesignOwnerBgUpload,
  designOwnerBgInput,
  setDesignOwnerBgInput,
  setOwnerBgImage,
  onResetDefaultChatBackground,
  uploadDesignImage,
  onStartInspectMode,
  previewDesignConfig,
  committedConfig,
  getEditableDesignConfig,
  cancelPendingDesignPreview,
  commitPendingDesignPreview,
  flushAllDesignPersistence,
  verifyDesignPreviewDom,
  hasPendingDesignPreview,
  isApplyingStyle,
  ownerWriteAccessOk,
}: DesignCenterModalProps) => {
  type PreviewKind = "glass" | "chase" | null;
  type SaveStatus = "idle" | "preview" | "saving" | "saved" | "local-only" | "error";

  const [section, setSection] = useState<DesignSection>("mega");
  const [previewKind, setPreviewKind] = useState<PreviewKind>(null);
  const [activeGlassFormId, setActiveGlassFormId] = useState<GlassFormId | null>(
    () => loadGlassFormId(),
  );
  const [pendingGlassFormId, setPendingGlassFormId] = useState<GlassFormId | null>(null);
  const [isGlassPreviewing, setIsGlassPreviewing] = useState(false);
  const [glassTintColor, setGlassTintColor] = useState(() => loadGlassFormTint());
  const [columnUploading, setColumnUploading] = useState<string | null>(null);
  const [, setChaseSettings] = useState<ChaseLightSettings>(() =>
    loadChaseLightSettings(),
  );
  const [neonBeamPicks, setNeonBeamPicks] = useState<NeonBeamTargetId[]>(() =>
    getActiveNeonBeamTargets(),
  );
  const rightColUploadRef = useRef<HTMLInputElement>(null);
  const centerColUploadRef = useRef<HTMLInputElement>(null);
  const leftColUploadRef = useRef<HTMLInputElement>(null);
  const designScrollAnchorRef = useRef<HTMLDivElement>(null);

  const scrollDesignPanelToTop = () => {
    const anchor = designScrollAnchorRef.current;
    if (!anchor) return;
    const modalShell = anchor.closest(".lamma-modal-shell");
    if (!modalShell) return;
    let parent: HTMLElement | null = anchor.parentElement;
    while (parent && modalShell.contains(parent)) {
      const style = getComputedStyle(parent);
      if (
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        parent.scrollHeight > parent.clientHeight + 8
      ) {
        const parentRect = parent.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        parent.scrollTop += anchorRect.top - parentRect.top - 8;
        return;
      }
      parent = parent.parentElement;
    }
  };

  useEffect(() => {
    queueMicrotask(scrollDesignPanelToTop);
  }, []);

  /* ── Ultimate Design System state ── */
  const [udsSettings, setUdsSettings] = useState<UDSSettings>(() => loadUDSSettings());
  const [udsPreviewActive, setUdsPreviewActive] = useState(false);

  /* ── Sliders + Gemini AI state ── */
  const getBase = (): UniversalStyleConfig => {
    if (getEditableDesignConfig) return getEditableDesignConfig();
    const cfg = (committedConfig ?? null) as UniversalStyleConfig | null;
    return normalizeUniversalStyleConfig(cfg ?? createDefaultUniversalStyle());
  };

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingDesignRef = useRef(false);
  const commitRef = useRef(commitPendingDesignPreview);
  const hasPendingRef = useRef(hasPendingDesignPreview);
  useEffect(() => {
  commitRef.current = commitPendingDesignPreview;
  hasPendingRef.current = hasPendingDesignPreview;
  }, [commitPendingDesignPreview, hasPendingDesignPreview]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const reportPreview = (result: { previewApplied?: boolean } | null) => {
    window.requestAnimationFrame(() => {
      const verify = verifyDesignPreviewDom?.();
      if (verify?.ok && verify.previewApplied) {
        setSaveStatus("preview");
        setSaveMessage(verify.message);
      } else if (result?.previewApplied === false || verify?.ok === false) {
        setSaveStatus("error");
        setSaveMessage(verify?.message ?? "⚠️ المعاينة لم تصل للشات.");
      }
    });
  };

  const flushSave = async (): Promise<void> => {
    const saver = flushAllDesignPersistence ?? commitPendingDesignPreview;
    if (!saver) return;
    if (isSavingDesignRef.current) return;

    isSavingDesignRef.current = true;
    try {
    setSaveStatus("saving");
    const result = await saver();
    if (result.ok) {
      setSaveStatus("saved");
      setSaveMessage(result.message);
    } else if (result.localOnly) {
      setSaveStatus("local-only");
      setSaveMessage(`${result.message}\n(محفوظ على جهازك فقط)`);
    } else {
      setSaveStatus("error");
      setSaveMessage(result.message);
      }
    } catch (err) {
      console.warn("[DesignCenter] Save failed:", err);
      setSaveStatus("error");
      setSaveMessage("⚠️ تعذر حفظ التصميم حالياً. جرّب مرة أخرى بعد لحظات.");
    } finally {
      isSavingDesignRef.current = false;
    }
  };

  const scheduleAutoSave = () => {
    if (!isOwnerRole) return;
    if (!flushAllDesignPersistence && !commitPendingDesignPreview) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      void flushSave();
    }, 400);
  };

  const previewAndTrack = (config: UniversalStyleConfig) => {
    const result = previewDesignConfig?.(config);
    reportPreview(result);
    scheduleAutoSave();
  };

  const defaultBase = createDefaultUniversalStyle();
  const [sliderGlassBlur, setSliderGlassBlur] = useState<number>(defaultBase.glass.blurPx);
  const [sliderGlassOpacity, setSliderGlassOpacity] = useState<number>(defaultBase.glass.opacity);
  const [sliderGlassBorder, setSliderGlassBorder] = useState<number>(defaultBase.glass.borderOpacity);
  const [sliderBtnRadius, setSliderBtnRadius] = useState<number>(defaultBase.buttons.radiusPx);
  const [sliderBtnGlow, setSliderBtnGlow] = useState<boolean>(defaultBase.buttons.glow);
  const [sliderAccent, setSliderAccent] = useState<string>(defaultBase.palette.accent);
  const [sliderAccent2, setSliderAccent2] = useState<string>(defaultBase.palette.accent2);
  const [sliderBg, setSliderBg] = useState<string>(defaultBase.palette.bg);
  const [sliderText, setSliderText] = useState<string>(defaultBase.palette.text);
  const [sliderSurface, setSliderSurface] = useState<string>(
    surfaceToPickerHex(defaultBase.palette.surface),
  );

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [aiLastSummary, setAiLastSummary] = useState("");
  const [uiverseUrl, setUiverseUrl] = useState("");
  const [uiverseTarget, setUiverseTarget] = useState("الأزرار");
  const [uiverseStatus, setUiverseStatus] = useState<"idle" | "loading" | "ready" | "applied" | "error">("idle");
  const [uiverseMessage, setUiverseMessage] = useState("");
  const [uiverseResult, setUiverseResult] = useState<UiverseFetchResult | null>(null);
  const [activeUiverseApplies, setActiveUiverseApplies] = useState(() =>
    getActiveUiverseScopedApplies(),
  );

  const applyAiResultToPreview = (
    base: UniversalStyleConfig,
    result: Awaited<ReturnType<typeof askDesignAi>>,
  ) => {
    if (result.hasChanges && previewDesignConfig) {
      const patched = applyDesignAiPatch(base, result.patch);
      previewAndTrack(patched);
      setSliderGlassBlur(patched.glass.blurPx);
      setSliderGlassOpacity(patched.glass.opacity);
      setSliderGlassBorder(patched.glass.borderOpacity);
      setSliderBtnRadius(patched.buttons.radiusPx);
      setSliderBtnGlow(patched.buttons.glow);
      setSliderAccent(patched.palette.accent);
      setSliderAccent2(patched.palette.accent2);
      setAiLastSummary(result.summary);
      setAiStatus("ok");
      return;
    }

    setAiLastSummary(result.summary || result.error || "لم أفهم الأمر");
    setAiStatus("error");
  };

  const runDesignAiPrompt = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiStatus === "loading") return;
    if (!isOwnerRole) {
      setAiStatus("error");
      setAiLastSummary("👑 أوامر Gemini متاحة للمالك فقط.");
      return;
    }

    setAiStatus("loading");
    setAiLastSummary("جاري تجهيز اقتراح التصميم...");
    const base = getBase();
    const result = await askDesignAi(prompt, base);
    applyAiResultToPreview(base, result);
  };

  const refreshActiveUiverseApplies = () => {
    setActiveUiverseApplies(getActiveUiverseScopedApplies());
  };

  const handleFetchUiverse = async () => {
    const url = uiverseUrl.trim();
    if (!url || uiverseStatus === "loading") return;
    if (!isOwnerRole) {
      setUiverseStatus("error");
      setUiverseMessage("👑 استيراد UIverse متاح للمالك فقط.");
      return;
    }

    setUiverseStatus("loading");
    setUiverseMessage("جاري جلب CSS من الرابط...");
    setUiverseResult(null);
    const { result, error } = await fetchUiverseCssFromUrl(url);
    if (!result) {
      setUiverseStatus("error");
      setUiverseMessage(error ?? "تعذر جلب CSS من الرابط.");
      return;
    }

    setUiverseResult(result);
    if (result.suggestedTargetAr) {
      setUiverseTarget(result.suggestedTargetAr);
    }
    setUiverseStatus("ready");
    setUiverseMessage(
      `تم جلب CSS من ${result.source}${result.title ? ` — ${result.title}` : ""}. راجع الهدف ثم اضغط تطبيق.`,
    );
  };

  const handleApplyUiverse = () => {
    if (!uiverseResult) return;
    const target = uiverseTarget.trim() || uiverseResult.suggestedTargetAr || "الأزرار";
    const applied = applyUiverseCssToTarget(
      uiverseResult.css,
      target,
      uiverseUrl.trim(),
      { allowDefault: true },
    );
    if (!applied.ok) {
      setUiverseStatus("error");
      setUiverseMessage(applied.error ?? "تعذر تطبيق CSS على الشات.");
      return;
    }

    scheduleDesignOverlaysSync();
    refreshActiveUiverseApplies();
    setUiverseStatus("applied");
    setUiverseMessage(`تم تطبيق UIverse على ${applied.target?.labelAr ?? target}.`);
  };

  const handleClearUiverse = () => {
    resetUiverseScopedStyle();
    refreshActiveUiverseApplies();
    scheduleDesignOverlaysSync();
    setUiverseStatus("idle");
    setUiverseMessage("تم إزالة تطبيقات UIverse من الشات الحالي.");
  };

  const syncSlidersFromBase = (base?: UniversalStyleConfig) => {
    const cfg = normalizeUniversalStyleConfig(base ?? getBase());
    setSliderGlassBlur(cfg.glass.blurPx);
    setSliderGlassOpacity(cfg.glass.opacity);
    setSliderGlassBorder(cfg.glass.borderOpacity);
    setSliderBtnRadius(cfg.buttons.radiusPx);
    setSliderBtnGlow(cfg.buttons.glow);
    setSliderAccent(cfg.palette.accent);
    setSliderAccent2(cfg.palette.accent2);
    setSliderBg(cfg.palette.bg);
    setSliderText(cfg.palette.text);
    setSliderSurface(surfaceToPickerHex(cfg.palette.surface));
  };

  useEffect(() => {
    if (!committedConfig) return;
    syncSlidersFromBase(committedConfig);
  }, [committedConfig]);

  // Load saved text color preset from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lamma_text_color_preset');
      if (saved) {
        const preset = JSON.parse(saved);
        if (preset.text && preset.accent && preset.accent2) {
          const base = normalizeUniversalStyleConfig(null);
          const readable = ensureReadablePalette({
            ...base.palette,
            text: preset.text,
            accent: preset.accent,
            accent2: preset.accent2,
          });
          if (readable.text !== preset.text) {
            try {
              localStorage.setItem(
                'lamma_text_color_preset',
                JSON.stringify({
                  text: readable.text,
                  accent: preset.accent,
                  accent2: preset.accent2,
                }),
              );
            } catch { /* non-fatal */ }
          }
          const root = (document.querySelector('.lamma-neutral-glass') || document.body) as HTMLElement;
          syncPaletteTextTokens(root, readable);
          root.setAttribute('data-universal-style', 'active');
          setSliderText(readable.text);
          setSliderAccent(readable.accent);
          setSliderAccent2(readable.accent2);
        }
      }
    } catch {
      /* ignore malformed saved preset */
    }
  }, []);

  const applySliderGlassPatch = (glassPatch: Partial<UniversalStyleConfig["glass"]>) => {
    if (!previewDesignConfig || !isOwnerRole) return;
    const base = getBase();
    previewAndTrack({ ...base, glass: { ...base.glass, ...glassPatch } });
  };

  const applyThemePreset = (
    preset: ThemeColorPreset,
    options?: { resetOverlays?: boolean },
  ) => {
    if (!previewDesignConfig || !isOwnerRole) return;
    const resetOverlays = options?.resetOverlays ?? true;

    setSliderAccent(preset.accent);
    setSliderAccent2(preset.accent2);
    setSliderBg(preset.bg);
    setSliderText(preset.text);
    setSliderSurface(surfaceToPickerHex(preset.surface));

    const root = document.querySelector(".lamma-neutral-glass") as HTMLElement | null;
    if (root) {
      syncPaletteTextTokens(root, {
        text: preset.text,
        accent: preset.accent,
        accent2: preset.accent2,
      });
      root.setAttribute("data-universal-style", "active");
    }

    if (resetOverlays) {
      // Reset conflicting overlay systems before a full theme swap
      try {
        const f = { ...loadFace(), enabled: false };
        saveFace(f);
        applyFace(f);
      } catch { /* ignore */ }

      const tint = loadChaseLightSettings().tintHex || "#6ee7b7";
      commitChaseLightSettings({
        columns: "none",
        composer: "none",
        header: "none",
        neonBeamTargets: [],
        tintHex: tint,
        speedSec: 6,
      });
      setNeonBeamPicks([]);

      commitSidebarWidgetSettings({
        radio: "classic",
        music: "classic",
        divider: "classic",
        storeText: "#f8fafc",
        radioText: "#f8fafc",
        musicText: "#f8fafc",
      });
      commitPmBubbleStyle("classic");
      applyGlassForm(null);
      setActiveGlassFormId(null);
    }

    const base = getBase();
    previewAndTrack({
      ...base,
      label: preset.name,
      palette: {
        ...base.palette,
        bg: preset.bg,
        surface: preset.surface,
        text: preset.text,
        accent: preset.accent,
        accent2: preset.accent2,
      },
      backgrounds: {
        ...base.backgrounds,
        global: { kind: "color", value: preset.bg, overlayOpacity: 0, blurPx: 0 },
      },
    });

    if (preset.glass) {
      commitGlassForm(preset.glass, preset.accent);
      setActiveGlassFormId(preset.glass);
    }
    if (preset.column) {
      commitColumnCardStyle(preset.column, preset.accent);
    }
    if (preset.bubble) {
      commitBubbleShape(preset.bubble);
    }

    scheduleDesignOverlaysSync();
  };

  const applyPalettePatch = (patch: Partial<UniversalStyleConfig["palette"]>) => {
    if (!previewDesignConfig || !isOwnerRole) return;
    const base = getBase();
    const palette = ensureReadablePalette({ ...base.palette, ...patch });
    previewAndTrack({ ...base, palette });
  };

  /** إطفاء الأنوار/الرينبو فقط — بدون مسح الألوان أو الزجاج. */
  const handleTurnOffLightEffects = () => {
    if (!previewDesignConfig || !isOwnerRole) return;
    clearNeonBeamTargets();
    commitChaseLightSettings({
      columns: "none",
      composer: "none",
      header: "none",
      neonBeamTargets: [],
      tintHex: loadChaseLightSettings().tintHex,
      speedSec: 6,
    });
    setChaseSettings(loadChaseLightSettings());
    setNeonBeamPicks([]);
    const offFx = FX_LIST_2026.reduce(
      (acc, fx) => ({ ...acc, [fx.id]: false }),
      {} as Record<FxId, boolean>,
    );
    setFxOn(offFx);
    try { localStorage.setItem("lamma_fx_on", JSON.stringify(offFx)); } catch { /* non-fatal */ }
    applyFx2026FromLocalStorage();
    const udsOff: UDSSettings = {
      ...loadUDSSettings(),
      neonBorder: "none",
      applyToBody: false,
    };
    commitUDSSettings(udsOff);
    setUdsSettings(udsOff);
    const base = getBase();
    const fresh = createDefaultUniversalStyle();
    previewAndTrack({ ...base, effects: { ...fresh.effects }, regions: fresh.regions });
    scheduleDesignOverlaysSync();
  };

  // تصفية شاملة — تصفّر كل أنظمة التنسيق المتداخلة دفعة واحدة (مصدر "الهبل").
  const handleMasterReset = async () => {
    if (!isOwnerRole) return;
    if (!window.confirm("هيتم تصفير كل تأثيرات التصميم (الأنوار، الرينبو، الزجاج، الوجه المخصص) والرجوع لشكل نظيف افتراضي للجميع. متأكد؟")) {
      return;
    }
    // 1) إطفاء كل أشرطة النور (الأعمدة/الكتابة/الهيدر + خط النيون)
    clearNeonBeamTargets();
    const tint = loadChaseLightSettings().tintHex || "#6ee7b7";
    commitChaseLightSettings({
      columns: "none",
      composer: "none",
      header: "none",
      neonBeamTargets: [],
      tintHex: tint,
      speedSec: 6,
    });
    resetUDSSettings();
    setUdsSettings(loadUDSSettings());
    const offFx = FX_LIST_2026.reduce(
      (acc, fx) => ({ ...acc, [fx.id]: false }),
      {} as Record<FxId, boolean>,
    );
    try { localStorage.setItem("lamma_fx_on", JSON.stringify(offFx)); } catch { /* non-fatal */ }
    setFxOn(offFx);
    applyFx2026FromLocalStorage();
    resetUiverseScopedStyle();
    setActiveUiverseApplies([]);
    setUiverseResult(null);
    setUiverseUrl("");
    setUiverseStatus("idle");
    setUiverseMessage("");
    commitSidebarWidgetSettings({
      radio: "classic",
      music: "classic",
      divider: "classic",
      storeText: "#f8fafc",
      radioText: "#f8fafc",
      musicText: "#f8fafc",
    });
    commitPmBubbleStyle("classic");
    commitBubbleShape("default");
    commitColumnCardStyle("neon-ring", loadGlassFormTint());
    setNeonBeamPicks([]);
    try { localStorage.removeItem("lamma_text_color_preset"); } catch { /* non-fatal */ }
    // 2) إرجاع الزجاج الافتراضي
    applyGlassForm(null);
    // 3) إيقاف الوجه المخصص (نظام ثيمات)
    try {
      const f = { ...loadFace(), enabled: false };
      saveFace(f);
      applyFace(f);
    } catch { /* ignore */ }
    // 4) Wait for DOM updates to complete before applying theme
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 5) ثيم نظيف افتراضي + حفظ للكل
    if (previewDesignConfig) {
      previewDesignConfig(createDefaultUniversalStyle());
      if (flushAllDesignPersistence) {
        const result = await flushAllDesignPersistence();
        if (!result.ok && !result.localOnly) {
          alert("⚠️ حدث خطأ أثناء حفظ التغييرات. حاول مرة أخرى.");
          return;
        }
      } else if (commitPendingDesignPreview) {
        const result = await commitPendingDesignPreview();
        if (!result.ok) {
          alert("⚠️ حدث خطأ أثناء حفظ التغييرات. حاول مرة أخرى.");
          return;
        }
        scheduleDesignOverlaysSync();
      }
    } else {
      scheduleDesignOverlaysSync();
    }
    
    // 6) Wait for theme to apply to DOM
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 7) خلفية افتراضية
    onResetDefaultChatBackground?.();
    
    // 8) Wait for background to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 9) إعادة ضبط حالة السلايدرز
    syncSlidersFromBase(createDefaultUniversalStyle());
    setActiveGlassFormId(null);
    setChaseSettings(loadChaseLightSettings());
    scheduleDesignOverlaysSync();
    
    // 10) Final verification before showing success
    await new Promise(resolve => setTimeout(resolve, 100));
    alert("✅ تم رجوع التصميم لوضع نظيف افتراضي. اختر ثيم 2026 من جديد لو حبيت.");
  };

  // الخلفية لازم تتغير في طبقة backgrounds.global (مش بس palette.bg) عشان تظهر فعلاً.
  // Helper function to calculate color luminance
  const getLuminance = (hex: string): number => {
    const rgb = hex.replace('#', '').match(/.{2}/g);
    if (!rgb || rgb.length !== 3) return 0;
    
    const [r, g, b] = rgb.map(x => {
      const val = parseInt(x, 16) / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // Helper function to check contrast ratio
  const getContrastRatio = (color1: string, color2: string): number => {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const applyBgColor = (hex: string) => {
    if (!previewDesignConfig || !isOwnerRole) return;
    setSliderBg(hex);
    const base = getBase();
    
    // Check contrast with current surface color
    const surfaceColor = base.palette.surface;
    const contrast = getContrastRatio(hex, surfaceColor);
    
    // If contrast is poor (below WCAG AA standard of 4.5:1), suggest better surface color
    if (contrast < 4.5) {
      const bgLum = getLuminance(hex);
      // Choose appropriate surface color based on background luminance
      const suggestedSurface = bgLum > 0.5 
        ? 'rgba(15, 23, 42, 0.85)'  // Dark surface for light background
        : 'rgba(243, 244, 246, 0.85)'; // Light surface for dark background
      
      if (window.confirm(`⚠️ تباين ضعيف بين الخلفية والبطاقات (${contrast.toFixed(1)}:1).\n\nنقترح تغيير لون البطاقات لتحسين القراءة. هل تريد التطبيق؟`)) {
        previewAndTrack({
          ...base,
          palette: { 
            ...base.palette, 
            bg: hex, 
            surface: suggestedSurface,
            text: bgLum > 0.5 ? '#0f172a' : '#f8fafc' // Adjust text color too
          },
          backgrounds: {
            ...base.backgrounds,
            global: { kind: "color", value: hex, overlayOpacity: 0, blurPx: 0 },
          },
        });
        return;
      }
    }
    
    previewAndTrack({
      ...base,
      palette: { ...base.palette, bg: hex },
      backgrounds: {
        ...base.backgrounds,
        global: { kind: "color", value: hex, overlayOpacity: 0, blurPx: 0 },
      },
    });
  };

  const stopDrag = (event: React.PointerEvent) => event.stopPropagation();

  const handleColumnImageUpload = async (
    file: File,
    folder: string,
    imageKey: "leftImage" | "centerImage" | "rightImage",
  ) => {
    if (!uploadDesignImage) {
      alert("⚠️ رفع الصور غير متاح حالياً.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("⚠️ الملف اللي اخترته مش صورة.");
      return;
    }
    setColumnUploading(imageKey);
    try {
      const url = await uploadDesignImage(file, folder);
      if (!url) {
        alert("⚠️ تعذر رفع الصورة حالياً. جرّب صورة أخرى أو حاول لاحقاً.");
        return;
      }
      const next = { ...loadFace(), [imageKey]: url, enabled: true };
      saveFace(next);
      applyFace(next);
      scheduleDesignOverlaysSync();
      flushDesignOverlaysSync();
      alert("✅ تم رفع صورة العمود وتطبيقها على الشات.");
    } catch (err) {
      console.warn("[DesignCenter] Column image upload failed:", err);
      alert("⚠️ فشل رفع صورة العمود. تأكد من الاتصال وحاول مرة أخرى.");
    } finally {
      setColumnUploading(null);
    }
  };

  const cancelShapePreviews = () => {
    if (previewKind === "glass" || isGlassPreviewing) {
      cancelGlassPreview();
      setIsGlassPreviewing(false);
      setPendingGlassFormId(null);
      setActiveGlassFormId(loadGlassFormId());
      setGlassTintColor(loadGlassFormTint());
    }
    if (previewKind === "chase") {
      cancelChaseLightPreview();
      setChaseSettings(loadChaseLightSettings());
      setNeonBeamPicks(getActiveNeonBeamTargets());
    }
    setPreviewKind(null);
    setDesignPreviewActive(false);
  };

  const cancelAllPreviews = () => {
    cancelShapePreviews();
  };

  /** Switch tabs — flush pending color save, cancel shape-only previews. */
  const changeSection = (next: DesignSection) => {
    if (next === section) return;
    if (section === "ultimate" && next !== "ultimate" && udsPreviewActive) {
      applyUDSSettings(loadUDSSettings());
      setUdsSettings(loadUDSSettings());
      setUdsPreviewActive(false);
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      void flushSave();
    }
    cancelShapePreviews();
    setSection(next);
  };

  /** UDS: commit + sync immediately (no preview-only trap). */
  const applyUdsLive = (settings: UDSSettings) => {
    setUdsSettings(settings);
    commitUDSSettings(settings);
    setUdsPreviewActive(false);
  };

  const applyUdsNeonStyle = (neonBorder: UDSSettings["neonBorder"]) => {
    applyUdsLive({
      ...udsSettings,
      neonBorder,
      applyToContainers:
        neonBorder === "none" ? udsSettings.applyToContainers : true,
    });
  };

  const applyUdsGlassStyle = (glassTexture: UDSSettings["glassTexture"]) => {
    applyUdsLive({
      ...udsSettings,
      glassTexture,
      applyToContainers:
        glassTexture === "none" ? udsSettings.applyToContainers : true,
    });
  };

  const handleApplyGlassFormPreset = (formId: GlassFormId) => {
    if (!isOwnerRole) return;
    cancelAllPreviews();
    if (commitGlassForm(formId, glassTintColor)) {
      setActiveGlassFormId(formId);
      setPendingGlassFormId(null);
      setIsGlassPreviewing(false);
      setPreviewKind(null);
      scheduleDesignOverlaysSync();
    } else {
      alert("⚠️ تعذر التطبيق — تأكد إن الشات مفتوح.");
    }
  };

  const handleGlassTintChange = (hex: string) => {
    if (!isOwnerRole) return;
    setGlassTintColor(hex);
    const formId = pendingGlassFormId ?? activeGlassFormId ?? loadGlassFormId();
    if (!formId) return;
    if (commitGlassForm(formId, hex)) {
      setActiveGlassFormId(formId);
      setIsGlassPreviewing(false);
      setPendingGlassFormId(null);
      setPreviewKind(null);
      scheduleDesignOverlaysSync();
    }
  };

  const toggleNeonBeamTarget = (target: NeonBeamTargetId) => {
    if (!isOwnerRole) return;
    const next = neonBeamPicks.includes(target)
      ? neonBeamPicks.filter((id) => id !== target)
      : [...neonBeamPicks, target];
    setNeonBeamPicks(next);
    const applied = commitNeonBeamTargets(next, { speedSec: 4 });
    const active = getActiveNeonBeamTargets();
    setNeonBeamPicks(active);
    setChaseSettings(loadChaseLightSettings());
    if (!applied) {
      alert("⚠️ افتح غرفة الشات أولاً لتطبيق إطار النيون.");
      return;
    }
    ensureChaseLightApplied();
      setPreviewKind(null);
      setDesignPreviewActive(false);
    scheduleDesignOverlaysSync();
    void flushDesignOverlaysSync();
  };

  const handleClearNeonBeam = () => {
    if (!isOwnerRole) return;
    setNeonBeamPicks([]);
    const applied = clearNeonBeamTargets();
    setNeonBeamPicks(getActiveNeonBeamTargets());
    setChaseSettings(loadChaseLightSettings());
    if (!applied) {
      alert("⚠️ افتح غرفة الشات أولاً لإيقاف إطار النيون.");
      return;
    }
    ensureChaseLightApplied();
      setPreviewKind(null);
      setDesignPreviewActive(false);
    scheduleDesignOverlaysSync();
    void flushDesignOverlaysSync();
  };

  const handleCancelGlassPreview = () => {
    cancelAllPreviews();
  };

  const handleResetGlassForm = () => {
    if (previewKind === "glass") {
      cancelAllPreviews();
    }
    applyGlassForm(null);
    setActiveGlassFormId(null);
    alert("✅ رجّعنا فورم الشفافية للوضع الافتراضي.");
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      cancelGlassPreview();
      cancelFacePreview();
      cancelColumnCardPreview();
      cancelChaseLightPreview();
      if (hasPendingRef.current) {
        void flushSave();
      }
      setDesignPreviewActive(false);
    };
  }, []);

  const FX_LIST = FX_LIST_2026;
  const [fxOn, setFxOn] = useState<Record<FxId, boolean>>(() => {
    try {
      const saved = localStorage.getItem("lamma_fx_on");
      const parsed = saved ? (JSON.parse(saved) as Partial<Record<FxId, boolean>>) : {};
      return FX_LIST.reduce(
        (acc, fx) => ({ ...acc, [fx.id]: parsed[fx.id] ?? false }),
        {} as Record<FxId, boolean>,
      );
    } catch {
      return FX_LIST.reduce((acc, fx) => ({ ...acc, [fx.id]: false }), {} as Record<FxId, boolean>);
    }
  });

  useEffect(() => {
    try { localStorage.setItem("lamma_fx_on", JSON.stringify(fxOn)); } catch { /* non-fatal */ }
    applyFx2026FromLocalStorage();
  }, [fxOn]);

  const toggleFx = (id: FxId) => {
    if (!isOwnerRole) return;
    setFxOn((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      applyFx2026ToBody(next);
      markFx2026LocalEdit();
      scheduleDesignOverlaysSync();
      void flushDesignOverlaysSync();
      return next;
    });
  };

  const persistMegaThemeBundle = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    scheduleDesignOverlaysSync();
    syncSlidersFromBase();
    await flushSave();
  };

  const applyMegaTheme = (theme: typeof MEGA_THEMES_2026[number]) => {
    if (!isOwnerRole) return;
    applyThemePreset(theme.colors, { resetOverlays: true });
    // 2) زجاج
    commitGlassForm(theme.glass.id, theme.glass.tint);
    setActiveGlassFormId(theme.glass.id);
    // 3) أعمدة
    commitColumnCardStyle(theme.column.id, theme.column.tint);
    // 4) أنوار النور 2026
    commitChaseLightSettings(theme.chase);
    setChaseSettings(loadChaseLightSettings());
    setNeonBeamPicks(getActiveNeonBeamTargets());
    // 5) تأثيرات FX
    const nextFx = theme.fx;
    try { localStorage.setItem("lamma_fx_on", JSON.stringify(nextFx)); } catch { /* non-fatal */ }
    setFxOn(nextFx as Record<FxId, boolean>);
    applyFx2026FromLocalStorage();
    // 6) UDS
    commitUDSSettings(theme.uds);
    setUdsSettings(theme.uds);
    // 7) sync للكل (ألوان + overlays معاً)
    void persistMegaThemeBundle();
  };

  const applyBot2026 = (preset: "neon-glass" | "ios-liquid") => {
    if (!isOwnerRole) return;
    if (preset === "neon-glass") {
      applyThemePreset({
        name: "نيون زجاجي",
        bg: "#0a0014",
        surface: "rgba(20,5,35,0.75)",
        text: "#f0e6ff",
        accent: "#ff00ff",
        accent2: "#00ffff",
      });
      commitGlassForm("smoke-dark", "#ff00ff");
      setActiveGlassFormId("smoke-dark");
      commitNeonBeamTargets(
        ["store", "radio", "music", "rooms", "members", "composer"],
        { speedSec: 4 },
      );
      setChaseSettings(loadChaseLightSettings());
      setNeonBeamPicks(getActiveNeonBeamTargets());
      commitUDSSettings({
        neonBorder: "none",
        neonBorderColor: "cyberpunk-pink",
        glassTexture: "crystal-glow",
        glassTint: "cyberpunk-pink",
        palette: "cyberpunk-pink",
        applyToBody: false,
        applyToContainers: true,
      });
      setUdsSettings(loadUDSSettings());
      void persistMegaThemeBundle();
    } else {
      applyThemePreset({
        name: "آيفون زجاجي",
        bg: "#0a1628",
        surface: "rgba(22,30,48,0.65)",
        text: "#e2e8f0",
        accent: "#6366f1",
        accent2: "#818cf8",
      });
      commitGlassForm("ios-liquid", "#818cf8");
      setActiveGlassFormId("ios-liquid");
      commitUDSSettings({
        neonBorder: "none",
        neonBorderColor: "deep-space-blue",
        glassTexture: "ios-ultra-blur",
        glassTint: "deep-space-blue",
        palette: "deep-space-blue",
        applyToBody: false,
        applyToContainers: true,
      });
      setUdsSettings(loadUDSSettings());
      void persistMegaThemeBundle();
    }
  };

  return (
    <>
                  <div className="space-y-4 select-none" dir="rtl" ref={designScrollAnchorRef}>
                    <div className="p-4 rounded-2xl lamma-section-card">
                      <div className="text-white text-xs font-black">
                        🎨 مركز التصميم
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-1">
                        ابدأ من ⚡ سحر 2026 (بوت + Mega + ألوان + FX) — ثم عدّل يدوياً من 🎨 تخصيص · 🔷 الشكل · 💫 Ultimate.
                      </div>
                      {isOwnerRole && (
                        <div
                          className={`mt-2 text-[9px] font-bold px-2 py-1.5 rounded-lg whitespace-pre-wrap ${
                            saveStatus === "saved"
                              ? "text-emerald-300 bg-emerald-500/10"
                              : saveStatus === "preview"
                                ? "text-cyan-300 bg-cyan-500/10"
                                : saveStatus === "saving" || isApplyingStyle
                                  ? "text-amber-300 bg-amber-500/10"
                                  : saveStatus === "local-only"
                                    ? "text-orange-300 bg-orange-500/10"
                                    : saveStatus === "error"
                                      ? "text-rose-300 bg-rose-500/10"
                                      : ownerWriteAccessOk === false
                                        ? "text-rose-300 bg-rose-500/10"
                                        : "text-gray-500 bg-white/5"
                          }`}
                        >
                          {isApplyingStyle || saveStatus === "saving"
                            ? "⏳ جاري الحفظ على السيرفر…"
                            : saveMessage ||
                              (ownerWriteAccessOk === false
                                ? "⚠️ صلاحية المالك على Supabase مش متاحة — الحفظ هيكون محلي فقط."
                                : hasPendingDesignPreview
                                  ? "👀 معاينة نشطة — شوف الشات (إطار cyan) ثم يُحفظ تلقائياً."
                                  : "✅ جاهز — عدّل أي لون/سلاider وشوف الشات يتغيّر فوراً.")}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-2xl lamma-section-card overflow-x-auto">
                      {([
                        ["mega", "⚡ سحر 2026"],
                        ["colors", "🎨 تخصيص"],
                        ["shapes", "🔷 الشكل"],
                        ["ultimate", "💫 Ultimate"],
                        ["uiverse", "✨ UIverse"],
                        ["uploads", "📤 الصور"],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => changeSection(id)}
                          onPointerDown={stopDrag}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black shrink-0 transition-all cursor-pointer ${
                            section === id
                              ? "lamma-accent-btn text-white"
                              : "lamma-tab-soft hover:text-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* ✨ UIverse scoped import */}
                    {section === "uiverse" && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div>
                            <div className="text-[12px] text-cyan-300 font-black">✨ استيراد UIverse للشات</div>
                            <div className="text-[9px] text-gray-400 font-bold mt-1">
                              الصق رابط UIverse، اختر هدف التطبيق، وسيتم حصر الـ CSS على عناصر الشات فقط بدون لمس باقي الصفحة.
                            </div>
                          </div>

                          <div className="space-y-2">
                            <input
                              type="url"
                              value={uiverseUrl}
                              onChange={(e) => setUiverseUrl(e.target.value)}
                              onPointerDown={stopDrag}
                              disabled={!isOwnerRole || uiverseStatus === "loading"}
                              placeholder="https://uiverse.io/author/component-name"
                              dir="ltr"
                              className="w-full text-[11px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                            />
                            <input
                              type="text"
                              value={uiverseTarget}
                              onChange={(e) => setUiverseTarget(e.target.value)}
                              onPointerDown={stopDrag}
                              disabled={!isOwnerRole || uiverseStatus === "loading"}
                              placeholder="مثال: الأزرار، الأيقونات، الخلفية، بطاقات المتصلين"
                              dir="rtl"
                              className="w-full text-[11px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onPointerDown={stopDrag}
                              onClick={() => void handleFetchUiverse()}
                              disabled={!isOwnerRole || !uiverseUrl.trim() || uiverseStatus === "loading"}
                              className="py-2 rounded-xl text-[10px] font-black lamma-accent-btn text-white disabled:opacity-40"
                            >
                              {uiverseStatus === "loading" ? "جاري الجلب..." : "جلب CSS"}
                            </button>
                            <button
                              type="button"
                              onPointerDown={stopDrag}
                              onClick={handleApplyUiverse}
                              disabled={!isOwnerRole || !uiverseResult || uiverseStatus === "loading"}
                              className="py-2 rounded-xl text-[10px] font-black lamma-tab-soft hover:text-white disabled:opacity-40"
                            >
                              تطبيق على الشات
                            </button>
                            <button
                              type="button"
                              onPointerDown={stopDrag}
                              onClick={handleClearUiverse}
                              disabled={!isOwnerRole || activeUiverseApplies.length === 0}
                              className="py-2 rounded-xl text-[10px] font-black lamma-tab-soft hover:text-white disabled:opacity-40"
                            >
                              إزالة UIverse
                            </button>
                          </div>

                          {uiverseMessage && (
                            <div
                              className={`text-[10px] font-bold px-3 py-2 rounded-xl whitespace-pre-wrap ${
                                uiverseStatus === "error"
                                  ? "text-rose-300 bg-rose-500/10"
                                  : uiverseStatus === "applied"
                                    ? "text-emerald-300 bg-emerald-500/10"
                                    : "text-cyan-300 bg-cyan-500/10"
                              }`}
                            >
                              {uiverseMessage}
                            </div>
                          )}

                          {uiverseResult && (
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-white font-black">
                                  {uiverseResult.title ?? "UIverse CSS"}
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold">
                                  {uiverseResult.source}
                                </span>
                              </div>
                              <div className="text-[9px] text-gray-500 font-bold mt-1">
                                {Math.round(uiverseResult.css.length / 1024)}KB CSS جاهز للتطبيق.
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-2xl lamma-section-card space-y-2">
                          <div className="text-[11px] text-emerald-300 font-black">التطبيقات النشطة</div>
                          {activeUiverseApplies.length === 0 ? (
                            <div className="text-[10px] text-gray-500 font-bold">
                              لا توجد تطبيقات UIverse نشطة حالياً.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {activeUiverseApplies.map((entry) => (
                                <div
                                  key={`${entry.region}-${entry.subTarget}-${entry.styleId}`}
                                  className="p-2 rounded-xl bg-white/5 border border-white/10"
                                >
                                  <div className="text-[10px] text-white font-black">{entry.targetLabel}</div>
                                  <div className="text-[9px] text-gray-500 font-bold truncate">{entry.sourceUrl}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ⚡ ثيمات Mega 2026 */}
                    {section === "mega" && (
                      <div className="space-y-4">
                        {!isOwnerRole && (
                          <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-[10px] text-amber-300 font-black text-center">
                            👑 الثيمات الكاملة للمالك بس
                          </div>
                        )}

                        {/* ── Mega 2026 — ثيمات سحرية ضغطة واحدة ── */}
                        <div className="p-4 rounded-2xl space-y-3" style={{ background: "linear-gradient(135deg, rgba(5,0,15,0.85), rgba(10,5,25,0.85))", border: "1px solid rgba(139,92,246,0.28)" }}>
                          <div>
                            <div className="text-[12px] text-purple-300 font-black">⚡ Mega 2026 — سحر كامل</div>
                            <div className="text-[9px] text-gray-400 font-bold mt-0.5">
                              كل ثيم يضبط: ألوان + زجاج + أعمدة + نيون + FX + Ultimate — دفعة واحدة للجميع
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {MEGA_THEMES_2026.map((theme) => (
                              <button
                                key={theme.id}
                                type="button"
                                onPointerDown={stopDrag}
                                onClick={() => applyMegaTheme(theme)}
                                disabled={!isOwnerRole}
                                title={theme.hint}
                                className="group flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all disabled:opacity-40 hover:scale-[1.05] active:scale-[0.96]"
                                style={{ background: theme.preview, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
                              >
                                <span className="text-xl leading-none">{theme.emoji}</span>
                                <span className="text-[9px] text-white font-black text-center leading-tight">{theme.name}</span>
                                <span className="text-[7px] text-white/50 font-bold text-center leading-tight">{theme.hint}</span>
                                <span className="flex gap-1 mt-0.5">
                                  <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ background: theme.colors.accent }} />
                                  <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ background: theme.colors.accent2 }} />
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ── بوت التصميم السريع ── */}
                        <div className="p-4 rounded-2xl space-y-3" style={{ background: "linear-gradient(135deg, rgba(10,0,20,0.7), rgba(15,5,30,0.7))", border: "1px solid rgba(255,0,255,0.18)" }}>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-emerald-300 font-black">🤖 بوت التصميم السريع</span>
                            <span className="text-[9px] text-gray-500 font-bold px-2 py-0.5 rounded-full bg-white/5">ضغطة = ثيم كامل</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onPointerDown={stopDrag}
                              onClick={() => applyBot2026("neon-glass")}
                              disabled={!isOwnerRole}
                              className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-[0.97]"
                              style={{ background: "linear-gradient(135deg, #0a0014, #200040)", border: "1px solid rgba(255,0,255,0.35)", boxShadow: "0 0 20px rgba(255,0,255,0.12)" }}
                            >
                              <div className="w-full h-12 rounded-xl flex items-center justify-center gap-3" style={{ background: "linear-gradient(135deg, #0a0014, #200040)" }}>
                                <span className="w-5 h-5 rounded-full" style={{ background: "#ff00ff", boxShadow: "0 0 14px #ff00ff" }} />
                                <span className="w-5 h-5 rounded-full" style={{ background: "#00ffff", boxShadow: "0 0 14px #00ffff" }} />
                              </div>
                              <span className="text-[10px] text-fuchsia-300 font-black">💠 Neon Glassmorphism</span>
                              <span className="text-[8px] text-gray-500">RGB Wave · Crystal Glass</span>
                            </button>
                            <button
                              type="button"
                              onPointerDown={stopDrag}
                              onClick={() => applyBot2026("ios-liquid")}
                              disabled={!isOwnerRole}
                              className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-[0.97]"
                              style={{ background: "linear-gradient(135deg, #0a1628, #1a2860)", border: "1px solid rgba(99,102,241,0.35)", boxShadow: "0 0 20px rgba(99,102,241,0.12)" }}
                            >
                              <div className="w-full h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a1628, #1a2860)" }}>
                                <span className="text-2xl">🧧</span>
                              </div>
                              <span className="text-[10px] text-indigo-300 font-black">🧧 iOS Liquid Glass</span>
                              <span className="text-[8px] text-gray-500">Ultra Blur · Squircle</span>
                            </button>
                          </div>
                        </div>

                        {/* ── ثيمات الألوان السريعة ── */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">🌈 ثيمات الألوان السريعة</div>
                          <div className="text-[9px] text-gray-400">كل ثيم يضبط الألوان فوراً — مع زجاج/عمود/فقاعة بدون مسح الـ FX.</div>
                          <div className="grid grid-cols-3 gap-2">
                            {MODERN_THEME_PRESETS.map((preset) => {
                              const isActive =
                                sliderAccent.toLowerCase() === preset.accent.toLowerCase() &&
                                sliderBg.toLowerCase() === preset.bg.toLowerCase();
                              return (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onPointerDown={stopDrag}
                                  onClick={() => applyThemePreset(preset, { resetOverlays: false })}
                                  disabled={!isOwnerRole}
                                  title={preset.name}
                                  className={`group flex flex-col items-center gap-1 p-2 rounded-xl transition-all disabled:opacity-40 ${
                                    isActive ? "ring-1 ring-cyan-400/60 bg-white/10" : "hover:bg-white/5"
                                  }`}
                                >
                                  <span
                                    className="w-full h-9 rounded-lg border border-white/10 flex items-center justify-center gap-1.5"
                                    style={{ background: preset.bg }}
                                  >
                                    <span className="w-3.5 h-3.5 rounded-full shadow-inner" style={{ background: preset.accent }} />
                                    <span className="w-3.5 h-3.5 rounded-full shadow-inner" style={{ background: preset.accent2 }} />
                                  </span>
                                  <span className="text-[8px] text-gray-300 font-bold truncate w-full text-center">{preset.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 🪄 سحر التصميم 2026 — تأثيرات FX */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-violet-300 font-black">🪄 سحر التصميم 2026 — FX</span>
                          </div>
                          <div className="text-[10px] text-gray-500">كل تأثير مستقل — فعّل وأوقف كل واحد بشكل منفصل.</div>
                          <div className="grid grid-cols-2 gap-2">
                            {FX_LIST.map((fx) => (
                              <button
                                key={fx.id}
                                type="button"
                                onPointerDown={stopDrag}
                                onClick={() => toggleFx(fx.id)}
                                disabled={!isOwnerRole}
                                className={`p-3 rounded-xl text-right transition-all disabled:opacity-40 ${
                                  fxOn[fx.id]
                                    ? "bg-violet-500/20 border border-violet-400/40 shadow-[0_0_12px_rgba(139,92,246,0.2)]"
                                    : "lamma-tab-soft hover:bg-white/5 border border-transparent"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-black">{fx.emoji} {fx.label}</span>
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                                    fxOn[fx.id] ? "bg-emerald-400 shadow-[0_0_6px_#10b981]" : "bg-gray-600"
                                  }`} />
                                </div>
                                <div className="text-[9px] text-gray-500">{fx.hint}</div>
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            disabled={!isOwnerRole}
                            onClick={handleTurnOffLightEffects}
                            className="w-full py-2 rounded-xl text-[10px] font-black lamma-tab-soft hover:text-white disabled:opacity-40"
                          >
                            🚫 إطفاء الأنوار والـ FX فقط (الألوان تفضل)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── تحكم مباشر بالسلايدرات + Gemini AI ── */}
                    {section === "colors" && isOwnerRole && (
                      <div className="space-y-4">
                        {/* تصفية شاملة */}
                        <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] text-amber-300 font-black">🧹 تصفية شاملة</div>
                            <div className="text-[9px] text-gray-400 font-bold">امسح كل الأنوار/الرينبو/التأثيرات المتداخلة وارجع نظيف.</div>
                          </div>
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => void handleMasterReset()}
                            className="px-3 py-2 rounded-xl text-[10px] font-black lamma-danger-btn shrink-0"
                          >
                            رجوع نظيف
                          </button>
                        </div>

                        {/* شريط النيون — خط على الحافة + اختيار البطاقات */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-fuchsia-300 font-black">💠 إطار نيون</div>
                          <div className="text-[10px] text-gray-400 font-bold">
                            خط رفيع يلف على محيط البطاقة/الحافة — مش رينبو كامل. اختار كل عنصر لوحده.
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
                            <div className="lamma-neon-beam-preview shrink-0" aria-hidden="true" />
                            <div className="flex-1 w-full space-y-2">
                              <div className="grid grid-cols-2 gap-1.5">
                                {NEON_BEAM_ALL_TARGETS.map((targetId) => {
                                  const active = neonBeamPicks.includes(targetId);
                                  return (
                                    <button
                                      key={targetId}
                                      type="button"
                                      onPointerDown={stopDrag}
                                      onClick={() => toggleNeonBeamTarget(targetId)}
                                      className={`px-2.5 py-2 rounded-xl text-[9px] font-black border transition-all text-right ${
                                        active
                                          ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_10px_rgba(236,72,153,0.2)]"
                                          : "border-white/10 text-gray-400 hover:text-white hover:border-white/25"
                                      }`}
                                    >
                                      {NEON_BEAM_TARGET_LABELS[targetId]}
                                    </button>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                onPointerDown={stopDrag}
                                onClick={handleClearNeonBeam}
                                className="w-full py-2 rounded-xl text-[10px] font-black lamma-tab-soft text-gray-400 hover:text-white"
                              >
                                ⬜ إيقاف خط النيون
                              </button>
                              <p className="text-[9px] text-gray-500 font-bold text-center">
                                يُطبَّق فوراً عند اختيار كل بطاقة
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Gemini AI */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">✨ Gemini AI — اكتب أي أمر تصميم</div>
                          <div className="text-[10px] text-gray-400">مثل: «اجعل الخلفية زرقاء داكنة»، «زود الشفافية»، «زوايا حادة»</div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                void runDesignAiPrompt();
                              }}
                              onPointerDown={stopDrag}
                              placeholder={isOwnerRole ? "اكتب أمر التصميم واضغط Enter…" : "Gemini متاح للمالك فقط"}
                              dir="rtl"
                              disabled={aiStatus === "loading" || !isOwnerRole}
                              className="flex-1 text-[11px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50"
                            />
                            <button
                              type="button"
                              onPointerDown={stopDrag}
                              disabled={aiStatus === "loading" || !aiPrompt.trim() || !isOwnerRole}
                              onClick={() => void runDesignAiPrompt()}
                              className="px-3 py-2 rounded-xl text-[10px] font-black lamma-accent-btn text-white disabled:opacity-40"
                            >
                              {aiStatus === "loading" ? "…" : "✨"}
                            </button>
                          </div>
                          {aiLastSummary && (
                            <div className={`text-[10px] font-bold px-2 py-1 rounded-lg ${aiStatus === "ok" ? "text-emerald-300 bg-emerald-500/10" : "text-rose-300 bg-rose-500/10"}`}>
                              {aiLastSummary}
                            </div>
                          )}
                        </div>

                        {/* Glass sliders */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-4">
                          <div className="text-[11px] text-cyan-300 font-black">🪟 الزجاج (Glass)</div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                              <span>تعتيم الزجاج</span>
                              <span>{Math.round(sliderGlassOpacity * 100)}%</span>
                            </div>
                            <input
                              type="range" min={0.02} max={0.42} step={0.01}
                              value={sliderGlassOpacity}
                              onPointerDown={stopDrag}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                setSliderGlassOpacity(v);
                                applySliderGlassPatch({ opacity: v });
                              }}
                              className="w-full accent-cyan-400"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                              <span>ضبابية الزجاج</span>
                              <span>{sliderGlassBlur}px</span>
                            </div>
                            <input
                              type="range" min={4} max={40} step={1}
                              value={sliderGlassBlur}
                              onPointerDown={stopDrag}
                              onChange={(e) => {
                                const v = parseInt(e.target.value);
                                setSliderGlassBlur(v);
                                applySliderGlassPatch({ blurPx: v });
                              }}
                              className="w-full accent-cyan-400"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                              <span>حدة الحدود</span>
                              <span>{Math.round(sliderGlassBorder * 100)}%</span>
                            </div>
                            <input
                              type="range" min={0.02} max={0.5} step={0.01}
                              value={sliderGlassBorder}
                              onPointerDown={stopDrag}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                setSliderGlassBorder(v);
                                applySliderGlassPatch({ borderOpacity: v });
                              }}
                              className="w-full accent-cyan-400"
                            />
                          </div>
                        </div>

                        {/* Glass presets */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">🪟 نماذج الزجاج</div>
                          <div className="text-[9px] text-gray-400">شكل بطاقات الشات — للهالة على الجسم: 💫 Ultimate.</div>
                          <div className="grid grid-cols-3 gap-2">
                            {GLASS_FORM_PRESETS.map((preset) => {
                              const isActive = activeGlassFormId === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onPointerDown={stopDrag}
                                  onClick={() => handleApplyGlassFormPreset(preset.id)}
                                  disabled={!isOwnerRole}
                                  title={`${preset.title} - ${preset.subtitle}`}
                                  className={`group flex flex-col items-center gap-1 p-2 rounded-xl transition-all disabled:opacity-40 ${
                                    isActive ? "ring-1 ring-cyan-400/60 bg-white/10" : "hover:bg-white/5"
                                  }`}
                                >
                                  <span
                                    className="w-full h-9 rounded-lg border border-white/10 flex items-center justify-center text-lg"
                                    style={{
                                      background: preset.previewPanelBg,
                                      backdropFilter: preset.previewPanelBlur,
                                      borderColor: preset.previewPanelBorder,
                                    }}
                                  >
                                    {preset.emoji}
                                  </span>
                                  <span className="text-[8px] text-gray-300 font-bold truncate w-full text-center">{preset.title}</span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="space-y-1">
                            <div className="text-[9px] text-gray-400">لون حافة البطاقات (مع النموذج المختار)</div>
                            <div className="flex flex-wrap gap-2">
                              {GLASS_TINT_SWATCHES.map((hex) => (
                                <button
                                  key={hex}
                                  type="button"
                                  onPointerDown={stopDrag}
                                  disabled={!isOwnerRole}
                                  onClick={() => handleGlassTintChange(hex)}
                                  title={hex}
                                  className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 disabled:opacity-40 ${
                                    glassTintColor.toLowerCase() === hex.toLowerCase()
                                      ? "border-white ring-1 ring-cyan-400"
                                      : "border-white/20"
                                  }`}
                                  style={{ background: hex }}
                                />
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            disabled={!isOwnerRole}
                            onClick={handleResetGlassForm}
                            className="w-full py-2 rounded-xl text-[10px] font-black lamma-tab-soft hover:text-white disabled:opacity-40"
                          >
                            🔄 رجوع للوضع الافتراضي
                          </button>
                        </div>

                        {/* Button / input sliders */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-4">
                          <div className="text-[11px] text-cyan-300 font-black">🔘 الأزرار</div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                              <span>زوايا الأزرار</span>
                              <span>{sliderBtnRadius}px</span>
                            </div>
                            <input
                              type="range" min={0} max={28} step={1}
                              value={sliderBtnRadius}
                              onPointerDown={stopDrag}
                              onChange={(e) => {
                                const v = parseInt(e.target.value);
                                setSliderBtnRadius(v);
                                const base = getBase();
                                previewAndTrack({ ...base, buttons: { ...base.buttons, radiusPx: v } });
                              }}
                              className="w-full accent-cyan-400"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-bold">توهج الأزرار</span>
                            <button
                              type="button"
                              onPointerDown={stopDrag}
                              onClick={() => {
                                const next = !sliderBtnGlow;
                                setSliderBtnGlow(next);
                                const base = getBase();
                                previewAndTrack({ ...base, buttons: { ...base.buttons, glow: next } });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${sliderBtnGlow ? "lamma-accent-btn text-white" : "lamma-tab-soft text-gray-400"}`}
                            >
                              {sliderBtnGlow ? "✅ مفعّل" : "⭕ معطّل"}
                            </button>
                          </div>
                        </div>

                        {/* Color pickers */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">🎨 الألوان الرئيسية</div>
                          <div className="flex items-center gap-3">
                            <label className="text-[10px] text-gray-400 font-bold w-20 shrink-0">اللون الأساسي</label>
                            <input
                              type="color"
                              value={sliderAccent}
                              onPointerDown={stopDrag}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSliderAccent(v);
                                const base = getBase();
                                previewAndTrack({ ...base, palette: { ...base.palette, accent: v } });
                              }}
                              className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">{sliderAccent}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-[10px] text-gray-400 font-bold w-20 shrink-0">اللون الثانوي</label>
                            <input
                              type="color"
                              value={sliderAccent2}
                              onPointerDown={stopDrag}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSliderAccent2(v);
                                const base = getBase();
                                previewAndTrack({ ...base, palette: { ...base.palette, accent2: v } });
                              }}
                              className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">{sliderAccent2}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-[10px] text-gray-400 font-bold w-20 shrink-0">الخلفية (غامق)</label>
                            <input
                              type="color"
                              value={sliderBg}
                              onPointerDown={stopDrag}
                              onChange={(e) => {
                                applyBgColor(e.target.value);
                              }}
                              className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">{sliderBg}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-[10px] text-gray-400 font-bold w-20 shrink-0">لون البطاقات</label>
                            <input
                              type="color"
                              value={sliderSurface}
                              onPointerDown={stopDrag}
                              onChange={(e) => {
                                const hex = e.target.value;
                                setSliderSurface(hex);
                                applyPalettePatch({ surface: hexToRgba(hex, 0.72) });
                              }}
                              className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            />
                            <span className="text-[10px] text-gray-500 font-bold">شفافية زجاجية تلقائية</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-[10px] text-gray-400 font-bold w-20 shrink-0">لون الكتابة</label>
                            <input
                              type="color"
                              value={sliderText}
                              onPointerDown={stopDrag}
                              onChange={(e) => {
                                const base = getBase();
                                const readable = ensureReadablePalette({
                                  ...base.palette,
                                  text: e.target.value,
                                });
                                setSliderText(readable.text);
                                applyPalettePatch({ text: readable.text });
                              }}
                              className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">{sliderText}</span>
                          </div>
                        </div>

                        {/* Apply / Cancel bar for sliders */}
                        <div className="sticky top-0 z-20 flex gap-2 p-3 rounded-2xl border border-cyan-400/30 bg-[#0a1218]/95 backdrop-blur-xl">
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => {
                              if (autoSaveTimerRef.current) {
                                clearTimeout(autoSaveTimerRef.current);
                                autoSaveTimerRef.current = null;
                              }
                              void flushSave();
                            }}
                            disabled={isApplyingStyle || saveStatus === "saving"}
                            className="flex-1 py-2.5 rounded-xl text-[10px] font-black lamma-accent-btn text-white disabled:opacity-50"
                          >
                            {isApplyingStyle || saveStatus === "saving"
                              ? "⏳ جاري الحفظ…"
                              : hasPendingDesignPreview
                                ? "💾 حفظ الآن للجميع"
                                : "✅ محفوظ على السيرفر"}
                          </button>
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => {
                              if (autoSaveTimerRef.current) {
                                clearTimeout(autoSaveTimerRef.current);
                                autoSaveTimerRef.current = null;
                              }
                              cancelPendingDesignPreview?.();
                              cancelShapePreviews();
                              applyUDSSettings(loadUDSSettings());
                              setUdsSettings(loadUDSSettings());
                              setUdsPreviewActive(false);
                              syncSlidersFromBase();
                              setSaveStatus("idle");
                              setSaveMessage("تم إلغاء المعاينة والرجوع لآخر تصميم محفوظ.");
                            }}
                            className="px-4 py-2.5 rounded-xl text-[10px] font-black lamma-tab-soft"
                          >
                            ❌ إلغاء
                          </button>
                        </div>
                      </div>
                    )}

                    {section === "shapes" && (
                      <DesignShapesPanel onStartInspectMode={onStartInspectMode} isOwnerRole={isOwnerRole} />
                    )}

                    {section === "ultimate" && isOwnerRole && (
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="p-4 rounded-2xl lamma-section-card">
                          <div className="text-white text-xs font-black">
                            ✨ Ultimate Design System 2026
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold mt-1">
                            تأثيرات على جسم الصفحة والحاويات — للبطاقات الزجاجية استخدم 🎨 تخصيص → نماذج الزجاج.
                          </div>
                        </div>

                        {/* Neon Borders & Effects */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">💫 أشرطة النيون والمؤثرات</div>
                          <div className="text-[10px] text-gray-400">تأثيرات حدود إضافية (خط النيون الدوار على البطاقات: تبويب 🎨 الألوان)</div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "none" as const, label: "بدون" },
                              { id: "led-strip" as const, label: "شريط LED متحرك" },
                              { id: "pulsing-glow" as const, label: "نبض إضاءة" },
                              { id: "border-aura" as const, label: "هالة ضوئية" },
                              { id: "static-cyber" as const, label: "خط سيبر ثابت" },
                            ].map((style) => (
                                <button
                                key={style.id}
                                  type="button"
                                  onPointerDown={stopDrag}
                                onClick={() => {
                                  applyUdsNeonStyle(style.id);
                                }}
                                className={`p-3 rounded-xl text-[10px] font-black transition-all ${
                                  udsSettings.neonBorder === style.id
                                    ? "bg-cyan-500/20 border border-cyan-400/50 text-cyan-300"
                                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                                }`}
                              >
                                {style.label}
                              </button>
                            ))}
                          </div>

                          {/* Neon Border Color */}
                          {udsSettings.neonBorder !== "none" && (
                            <div className="mt-3 p-3 rounded-xl bg-white/5 space-y-2">
                              <div className="text-[10px] text-gray-400 font-bold">لون النيون</div>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { id: "cyberpunk-pink" as const, color: "#ff006e" },
                                  { id: "neon-cyan" as const, color: "#00f5d4" },
                                  { id: "aurora-green" as const, color: "#06d6a0" },
                                  { id: "electric-violet" as const, color: "#7209b7" },
                                  { id: "gold-eclipse" as const, color: "#ffd60a" },
                                ].map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onPointerDown={stopDrag}
                                    onClick={() => {
                                      applyUdsLive({ ...udsSettings, neonBorderColor: c.id });
                                    }}
                                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                                      udsSettings.neonBorderColor === c.id
                                        ? "border-white scale-110"
                                        : "border-white/20 hover:border-white/50"
                                    }`}
                                    style={{ backgroundColor: c.color }}
                                    title={getPaletteLabel(c.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Apply to Body Toggle */}
                          {udsSettings.neonBorder === "led-strip" && (
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-gray-400 font-bold">تطبيق على جسم الصفحة</span>
                              <button
                                type="button"
                                onPointerDown={stopDrag}
                                onClick={() => {
                                  applyUdsLive({ ...udsSettings, applyToBody: !udsSettings.applyToBody });
                                }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                                  udsSettings.applyToBody
                                    ? "lamma-accent-btn text-white"
                                    : "lamma-tab-soft text-gray-400"
                                }`}
                              >
                                {udsSettings.applyToBody ? "✅ مفعّل" : "⭕ معطّل"}
                                </button>
                          </div>
                          )}

                          {/* Apply to Containers Toggle for all neon effects */}
                          {udsSettings.neonBorder !== "none" && (
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-gray-400 font-bold">تطبيق على البطاقات الجانبية</span>
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => {
                                  applyUdsLive({
                                    ...udsSettings,
                                    applyToContainers: !udsSettings.applyToContainers,
                              });
                            }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                                  udsSettings.applyToContainers
                                    ? "lamma-accent-btn text-white"
                                    : "lamma-tab-soft text-gray-400"
                                }`}
                              >
                                {udsSettings.applyToContainers ? "✅ مفعّل" : "⭕ معطّل"}
                          </button>
                            </div>
                          )}
                        </div>

                        {/* Glassmorphic Textures */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">🪟 تأثيرات الزجاج الكريستالي</div>
                          <div className="text-[10px] text-gray-400">اختر نسيج الزجاج الشفاف</div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "none" as const, label: "بدون" },
                              { id: "ios-ultra-blur" as const, label: "iOS Ultra Blur" },
                              { id: "crystal-glow" as const, label: "زجاج كريستالي" },
                              { id: "soft-frosted" as const, label: "زجاج مطفأ" },
                              { id: "dark-mirror" as const, label: "مرآة داكنة" },
                              { id: "velvet-blur" as const, label: "زجاج مخملي" },
                            ].map((style) => (
                          <button
                                key={style.id}
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => {
                                  applyUdsGlassStyle(style.id);
                                }}
                                className={`p-3 rounded-xl text-[10px] font-black transition-all ${
                                  udsSettings.glassTexture === style.id
                                    ? "bg-cyan-500/20 border border-cyan-400/50 text-cyan-300"
                                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                                }`}
                              >
                                {style.label}
                          </button>
                            ))}
                          </div>

                          {/* Glass Tint */}
                          {udsSettings.glassTexture !== "none" && (
                            <div className="mt-3 p-3 rounded-xl bg-white/5 space-y-2">
                              <div className="text-[10px] text-gray-400 font-bold">صبغة الزجاج</div>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { id: "none" as const, label: "بدون", color: "#ffffff" },
                                  { id: "cyberpunk-pink" as const, label: "وردي", color: "#ff006e" },
                                  { id: "neon-cyan" as const, label: "سماوي", color: "#00f5d4" },
                                  { id: "aurora-green" as const, label: "أخضر", color: "#06d6a0" },
                                  { id: "electric-violet" as const, label: "بنفسجي", color: "#7209b7" },
                                  { id: "gold-eclipse" as const, label: "ذهبي", color: "#ffd60a" },
                                ].map((c) => (
                          <button
                                    key={c.id}
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => {
                                      applyUdsLive({ ...udsSettings, glassTint: c.id });
                                    }}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${
                                      udsSettings.glassTint === c.id
                                        ? "border-white text-white"
                                        : "border-white/20 text-gray-400 hover:border-white/50"
                                    }`}
                                    style={{ backgroundColor: c.color + "20" }}
                                  >
                                    {c.label}
                          </button>
                                ))}
                        </div>
                      </div>
                    )}

                          {/* Apply to Containers Toggle */}
                          {udsSettings.glassTexture !== "none" && (
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-gray-400 font-bold">تطبيق على الحاويات</span>
                              <button
                                type="button"
                                onPointerDown={stopDrag}
                                onClick={() => {
                                  applyUdsLive({
                                    ...udsSettings,
                                    applyToContainers: !udsSettings.applyToContainers,
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                                  udsSettings.applyToContainers
                                    ? "lamma-accent-btn text-white"
                                    : "lamma-tab-soft text-gray-400"
                                }`}
                              >
                                {udsSettings.applyToContainers ? "✅ مفعّل" : "⭕ معطّل"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Futuristic Palette 2026 */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">🎨 لوحة ألوان المستقبل 2026</div>
                          <div className="text-[10px] text-gray-400">اختر اللون الأساسي للتصميم</div>
                          
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { id: "cyberpunk-pink" as const, color: "#ff006e" },
                              { id: "neon-cyan" as const, color: "#00f5d4" },
                              { id: "aurora-green" as const, color: "#06d6a0" },
                              { id: "electric-violet" as const, color: "#7209b7" },
                              { id: "gold-eclipse" as const, color: "#ffd60a" },
                              { id: "carbon-dark" as const, color: "#0a0a0a" },
                              { id: "minimalist-white" as const, color: "#ffffff" },
                              { id: "deep-space-blue" as const, color: "#03045e" },
                            ].map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onPointerDown={stopDrag}
                                onClick={() => {
                                  applyUdsLive({ ...udsSettings, palette: c.id });
                                }}
                                className={`w-full aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                                  udsSettings.palette === c.id
                                    ? "border-white scale-105 shadow-lg"
                                    : "border-white/20 hover:border-white/50"
                                }`}
                                style={{ backgroundColor: c.color }}
                                title={getPaletteLabel(c.id)}
                              >
                                <div className="w-6 h-6 rounded-full border-2 border-white/30" style={{ backgroundColor: c.color }} />
                              </button>
                            ))}
                          </div>
                          
                          <div className="text-[10px] text-gray-400 font-bold text-center mt-2">
                            اللون المحدد: {getPaletteLabel(udsSettings.palette)}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/5">
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => {
                              resetUDSSettings();
                              setUdsSettings(loadUDSSettings());
                              setUdsPreviewActive(false);
                              scheduleDesignOverlaysSync();
                              alert("✅ تم إعادة تعيين Ultimate للافتراضي.");
                            }}
                            className="w-full py-2.5 rounded-xl text-[10px] font-black lamma-tab-soft hover:text-white"
                          >
                            ↺ إعادة تعيين Ultimate
                          </button>
                          <p className="text-[9px] text-gray-500 font-bold text-center mt-2">
                            كل اختيار فوق يُطبَّق ويُحفظ فوراً — مفيش خطوة حفظ منفصلة.
                          </p>
                        </div>
                      </div>
                    )}

                    {section === "ultimate" && !isOwnerRole && (
                      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-center">
                        <div className="text-[11px] text-amber-300 font-black">👑 Ultimate Design System للمالك بس</div>
                        <div className="text-[9px] text-gray-400 font-bold mt-1">نظام تصميم متقدم — أشرطة نيون، زجاج كريستالي، لوحة ألوان المستقبل</div>
                      </div>
                    )}

                    {section === "uploads" && isOwnerRole && (
                      <>
                    <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                      <div className="text-[11px] text-cyan-300 font-black">
                        الشعار
                      </div>
                      <div className="flex items-center justify-center rounded-xl p-3 lamma-admin-card">
                        <img
                          src={brandLogoUrl || "/images/lamma-wordmark.svg"}
                          alt="LAMMA CHAT"
                          className="h-10 sm:h-12 w-auto"
                          draggable={false}
                        />
                      </div>
                      <div className="flex gap-2 p-1.5 rounded-lg lamma-admin-card">
                        <input
                          ref={designLogoUploadRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDesignLogoUpload}
                          className="hidden"
                        />
                        <input
                          type="text"
                          id="leadership_logo_url_input"
                          value={designLogoInput}
                          onChange={(e) => setDesignLogoInput(e.target.value)}
                          placeholder="رابط الشعار (URL)..."
                          className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => designLogoUploadRef.current?.click()}
                          onPointerDown={stopDrag}
                          className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-tab-soft hover:text-white"
                        >
                          رفع
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (designLogoInput.trim() !== "") {
                              setBrandLogoUrl(designLogoInput.trim());
                            } else {
                              setBrandLogoUrl(null);
                            }
                          }}
                          className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-accent-btn"
                        >
                          تطبيق
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                      <div className="text-[11px] text-cyan-300 font-black">
                        خلفية الغرفة الحالية
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold">
                        {openRooms.find((r) => r.id === activeRoomId)?.name ||
                          activeRoomId}
                      </div>
                      <div className="flex gap-2 p-1.5 rounded-lg lamma-admin-card">
                        <input
                          ref={designRoomBgUploadRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDesignRoomBgUpload}
                          className="hidden"
                        />
                        <input
                          type="text"
                          id="leadership_room_bg_url_input"
                          value={designRoomBgInput}
                          onChange={(e) => setDesignRoomBgInput(e.target.value)}
                          placeholder="رابط صورة خلفية لهذه الغرفة (URL)..."
                          className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => designRoomBgUploadRef.current?.click()}
                          onPointerDown={stopDrag}
                          className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-tab-soft hover:text-white"
                        >
                          رفع
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = designRoomBgInput.trim();
                            const updated = { ...roomBgMap };
                            if (next) updated[activeRoomId] = next;
                            else delete updated[activeRoomId];
                            setRoomBgMap(updated);
                          }}
                          className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-accent-btn"
                        >
                          تطبيق
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...roomBgMap };
                          delete updated[activeRoomId];
                          setRoomBgMap(updated);
                            setDesignRoomBgInput("");
                        }}
                        className="w-full py-2.5 rounded-xl font-black text-[10px] transition-all lamma-danger-btn"
                      >
                        حذف خلفية الغرفة
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                      <div className="text-[11px] text-cyan-300 font-black">
                        الخلفية الافتراضية
                      </div>
                      <div className="flex gap-2 p-1.5 rounded-lg lamma-admin-card">
                        <input
                          ref={designOwnerBgUploadRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDesignOwnerBgUpload}
                          className="hidden"
                        />
                        <input
                          type="text"
                          id="leadership_bg_url_input"
                          value={designOwnerBgInput}
                          onChange={(e) => setDesignOwnerBgInput(e.target.value)}
                          placeholder="رابط صورة الخلفية (URL)..."
                          className="flex-1 bg-transparent border-none text-[11px] text-white px-2 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => designOwnerBgUploadRef.current?.click()}
                          onPointerDown={stopDrag}
                          className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-tab-soft hover:text-white"
                        >
                          رفع
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (designOwnerBgInput.trim() !== "") {
                              setOwnerBgImage(designOwnerBgInput.trim());
                            } else {
                              setOwnerBgImage(null);
                            }
                          }}
                          className="px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all whitespace-nowrap lamma-accent-btn"
                        >
                          تطبيق
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          cancelAllPreviews();
                          if (onResetDefaultChatBackground) {
                            void onResetDefaultChatBackground();
                          } else {
                            setOwnerBgImage(null);
                            setDesignOwnerBgInput("");
                            alert("✅ رجّعت خلفية الشات للافتراضي (/MAN.png).");
                          }
                        }}
                        className="w-full py-2.5 rounded-xl font-black text-[10px] transition-all lamma-tab-soft hover:text-white"
                      >
                        ↩ رجوع للخلفية الافتراضية (/MAN.png)
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                      <div className="text-[11px] text-cyan-300 font-black">
                        صور خلفية الأعمدة
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold leading-relaxed">
                        ارفع صورة لكل عمود — يتم تفعيل الوجه المخصص تلقائياً بعد الرفع.
                      </div>
                      <div className="grid md:grid-cols-3 gap-2">
                        {([
                          ["rightImage", "👥 العمود الأيمن", "columns/right", rightColUploadRef],
                          ["centerImage", "💬 عمود الشات", "columns/center", centerColUploadRef],
                          ["leftImage", "🛍️ العمود الأيسر", "columns/left", leftColUploadRef],
                        ] as const).map(([key, label, folder, ref]) => (
                          <div key={key} className="p-3 rounded-xl lamma-admin-card space-y-2">
                            <div className="text-[10px] font-black text-white">{label}</div>
                            <input
                              ref={ref}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) void handleColumnImageUpload(file, folder, key);
                              }}
                              className="hidden"
                            />
                            <button
                              type="button"
                              disabled={columnUploading === key}
                              onClick={() => ref.current?.click()}
                              onPointerDown={stopDrag}
                              className="w-full py-2 rounded-xl text-[10px] font-black lamma-tab-soft hover:text-white disabled:opacity-50"
                            >
                              {columnUploading === key ? "جاري الرفع..." : "رفع صورة"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                      </>
                    )}

                    {section === "uploads" && !isOwnerRole && (
                      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-center">
                        <div className="text-[11px] text-amber-300 font-black">👑 رفع الصور للمالك بس</div>
                        <div className="text-[9px] text-gray-400 font-bold mt-1">شعار الغرفة، خلفيات الغرف، صور الأعمدة</div>
                      </div>
                    )}

                    {section === "colors" && !isOwnerRole && (
                      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-center">
                        <div className="text-[11px] text-amber-300 font-black">👑 تعديل الألوان للمالك بس</div>
                        <div className="text-[9px] text-gray-400 font-bold mt-1">سلايدرات الزجاج، الأزرار، الألوان الرئيسية</div>
                      </div>
                    )}

                    {section === "mega" && !isOwnerRole && (
                      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-center">
                        <div className="text-[11px] text-amber-300 font-black">👑 الثيمات الكاملة للمالك بس</div>
                        <div className="text-[9px] text-gray-400 font-bold mt-1">بوت التصميم، Mega 2026، ثيمات الألوان السريعة</div>
                      </div>
                    )}

                  </div>
    </>
  );
};
