import React, { useEffect, useRef, useState } from 'react';
import { DesignShapesPanel } from './DesignShapesPanel';
import { DesignTemplateGallery } from './DesignTemplateGallery';
import { DesignImportLibrary } from '../design/DesignImportLibrary';
import { DesignPreviewBar } from './DesignGlassPreviewBar';
import type { DesignImportPack } from '../../services/design/designImportCatalog';
import {
  previewImportPackVisuals,
  commitImportPackVisuals,
  cancelImportPackVisualPreview,
  describeImportPackLayers,
  getImportPackTint,
  resolveImportPackStyleConfig,
} from '../../services/design/designImportApplyService';
import { applyFace, loadFace, saveFace, FACE_PRESETS, cancelFacePreview, commitFacePreset, getFacePresetLabel, previewFacePreset } from '../../lib/customFace';
import type { DesignAssistantProposalId } from '../../lib/chatTypes';
import { setDesignPreviewActive } from '../../services/design/designPreviewDom';
import {
  applyGlassForm,
  cancelGlassPreview,
  commitGlassForm,
  loadGlassFormId,
  loadGlassFormTint,
  previewGlassForm,
  GLASS_FORM_PRESETS,
  type GlassFormId,
} from '../../services/design/glassTransparencyService';
import {
  cancelColumnCardPreview,
  commitColumnCardStyle,
  loadColumnCardStyleId,
  loadColumnCardTint,
  previewColumnCardStyle,
  COLUMN_CARD_STYLE_PRESETS,
  getColumnCardStyleLabel,
  type ColumnCardStyleId,
} from '../../services/design/columnCardStyleService';
import {
  previewBubbleShape,
  commitBubbleShape,
  cancelBubbleShapePreview,
  loadBubbleShapeId,
  getBubbleShapeLabel,
  type BubbleShapeId,
} from '../../services/design/bubbleShapeService';
import {
  previewChaseLightForTarget,
  previewChaseLightPatch,
  commitChaseLightSettings,
  cancelChaseLightPreview,
  loadChaseLightSettings,
  updateChaseLightTintPreview,
  type ChaseLightSettings,
  type ChaseLightStyleId,
  type ChaseLightTarget,
} from '../../services/design/chaseLightBarService';

import {
  applyDesignAiPatch,
  askDesignAi,
} from '../../services/design/designAiService';
import {
  createDefaultUniversalStyle,
  normalizeUniversalStyleConfig,
  type UniversalStyleConfig,
} from '../../services/design/universalStyleTypes';
import { hexToRgba } from '../../lib/chatHelpers';

import {
  commitSidebarWidgetSettings,
} from '../../services/design/sidebarWidgetStyleService';
import { commitPmBubbleStyle } from '../../services/design/pmBubbleStyleService';
import {
  loadUDSSettings,
  saveUDSSettings,
  previewUDSSettings,
  commitUDSSettings,
  resetUDSSettings,
  getNeonBorderLabel,
  getGlassTextureLabel,
  getPaletteLabel,
  getPaletteHex,
  type UDSSettings,
  type UDSNeonBorderStyle,
  type UDSGlassTextureStyle,
  type UDSPaletteColor,
} from '../../services/design/ultimateDesignSystemService';

type DesignSection = "colors" | "shapes" | "uploads" | "ultimate";

/** ثيمات 2026 كاملة — كل ثيم يضبط الخلفية (الغامق) + البطاقات + الكتابة + الأساسي + الثانوي معاً. */
const MODERN_THEME_PRESETS: {
  name: string;
  bg: string;
  surface: string;
  text: string;
  accent: string;
  accent2: string;
}[] = [
  { name: "ميدنايت أزرق", bg: "#060a12", surface: "rgba(18,24,32,0.72)", text: "#f1f5f9", accent: "#3b82f6", accent2: "#06b6d4" },
  { name: "فحمي بنفسجي", bg: "#0a0710", surface: "rgba(26,18,38,0.72)", text: "#f5f3ff", accent: "#a855f7", accent2: "#6366f1" },
  { name: "أسود زمردي", bg: "#05080a", surface: "rgba(12,22,18,0.72)", text: "#ecfdf5", accent: "#10b981", accent2: "#34d399" },
  { name: "جرافيت ذهبي", bg: "#0a0a0a", surface: "rgba(24,22,16,0.75)", text: "#fafaf9", accent: "#f59e0b", accent2: "#fbbf24" },
  { name: "نبيذي وردي", bg: "#100509", surface: "rgba(34,12,20,0.72)", text: "#fdf2f8", accent: "#ec4899", accent2: "#f472b6" },
  { name: "نيلي عميق", bg: "#070815", surface: "rgba(16,18,40,0.72)", text: "#eef2ff", accent: "#6366f1", accent2: "#818cf8" },
  { name: "تركواز ليلي", bg: "#04100f", surface: "rgba(10,28,26,0.72)", text: "#f0fdfa", accent: "#14b8a6", accent2: "#2dd4bf" },
  { name: "رمادي حديث", bg: "#0b0d10", surface: "rgba(22,26,32,0.74)", text: "#f8fafc", accent: "#64748b", accent2: "#94a3b8" },
  { name: "أحمر فحمي", bg: "#0e0507", surface: "rgba(32,12,14,0.72)", text: "#fef2f2", accent: "#ef4444", accent2: "#fb7185" },
  { name: "برتقالي غروب", bg: "#100a05", surface: "rgba(34,22,12,0.72)", text: "#fff7ed", accent: "#f97316", accent2: "#fb923c" },
  { name: "سماوي جليدي", bg: "#050d12", surface: "rgba(12,26,34,0.72)", text: "#ecfeff", accent: "#06b6d4", accent2: "#22d3ee" },
  { name: "ماجنتا ليلي", bg: "#0c0510", surface: "rgba(28,12,34,0.72)", text: "#fdf4ff", accent: "#d946ef", accent2: "#e879f9" },
];

export const DesignCenterModal = ({ isOwnerRole, runAssistantAudit, queueAssistantProposal, previewAssistantPreset, commitAssistantPreset, cancelAssistantPreview, previewRecommendedAssistantTemplate, assistantAudit, assistantFindings, assistantProposal, handleApplyAssistantProposal, setAssistantProposal, lastAppliedDesignSnapshot, handleRestoreLastDesignSnapshot, brandLogoUrl, designLogoUploadRef, handleDesignLogoUpload, designLogoInput, setDesignLogoInput, setBrandLogoUrl, activeRoomId, openRooms, designRoomBgUploadRef, handleDesignRoomBgUpload, designRoomBgInput, setDesignRoomBgInput, roomBgMap, setRoomBgMap, designOwnerBgUploadRef, handleDesignOwnerBgUpload, designOwnerBgInput, setDesignOwnerBgInput, setOwnerBgImage, onResetDefaultChatBackground, uploadDesignImage, designPresets, designPresetName, setDesignPresetName, handleSaveDesignPreset, applyDesignPreset, handleDeleteDesignPreset, onStartInspectMode, previewDesignPrompt, previewDesignPromptAi, previewDesignConfig, committedConfig, getEditableDesignConfig, cancelPendingDesignPreview, commitPendingDesignPreview, flushAllDesignPersistence, verifyDesignPreviewDom, hasPendingDesignPreview, isApplyingStyle, ownerWriteAccessOk }: any) => {
  type PreviewKind = "glass" | "face" | "template" | "column" | "import-pack" | "bubble" | "chase" | null;
  type SaveStatus = "idle" | "preview" | "saving" | "saved" | "local-only" | "error";

  const [section, setSection] = useState<DesignSection>("colors");
  const [previewKind, setPreviewKind] = useState<PreviewKind>(null);
  const [activeGlassFormId, setActiveGlassFormId] = useState<GlassFormId | null>(
    () => loadGlassFormId(),
  );
  const [pendingGlassFormId, setPendingGlassFormId] = useState<GlassFormId | null>(null);
  const [isGlassPreviewing, setIsGlassPreviewing] = useState(false);
  const [glassTintColor, setGlassTintColor] = useState(() => loadGlassFormTint());
  const [pendingFacePresetId, setPendingFacePresetId] = useState<string | null>(null);
  const [activeFacePresetId, setActiveFacePresetId] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<DesignAssistantProposalId | null>(null);
  const [pendingTemplateSummary, setPendingTemplateSummary] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState<DesignAssistantProposalId | null>(null);
  const [pendingColumnStyleId, setPendingColumnStyleId] = useState<ColumnCardStyleId | null>(null);
  const [activeColumnStyleId, setActiveColumnStyleId] = useState<ColumnCardStyleId | null>(
    () => loadColumnCardStyleId(),
  );
  const [columnTintColor, setColumnTintColor] = useState(() => loadColumnCardTint());
  const [columnUploading, setColumnUploading] = useState<string | null>(null);
  const [pendingImportPack, setPendingImportPack] = useState<DesignImportPack | null>(null);
  const [activeImportPackId, setActiveImportPackId] = useState<string | null>(null);
  const [pendingBubbleShapeId, setPendingBubbleShapeId] = useState<BubbleShapeId | null>(null);
  const [activeBubbleShapeId, setActiveBubbleShapeId] = useState<BubbleShapeId>(() =>
    loadBubbleShapeId(),
  );
  const [chaseSettings, setChaseSettings] = useState<ChaseLightSettings>(() =>
    loadChaseLightSettings(),
  );
  const [pendingChaseSummary, setPendingChaseSummary] = useState("");
  const rightColUploadRef = useRef<HTMLInputElement>(null);
  const centerColUploadRef = useRef<HTMLInputElement>(null);
  const leftColUploadRef = useRef<HTMLInputElement>(null);

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

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [aiLastSummary, setAiLastSummary] = useState("");

  useEffect(() => {
    if (!committedConfig) return;
    const base = normalizeUniversalStyleConfig(committedConfig);
    setSliderGlassBlur(base.glass.blurPx);
    setSliderGlassOpacity(base.glass.opacity);
    setSliderGlassBorder(base.glass.borderOpacity);
    setSliderBtnRadius(base.buttons.radiusPx);
    setSliderBtnGlow(base.buttons.glow);
    setSliderAccent(base.palette.accent);
    setSliderAccent2(base.palette.accent2);
    setSliderBg(base.palette.bg);
    setSliderText(base.palette.text);
  }, [committedConfig]);

  const applySliderGlassPatch = (glassPatch: Partial<UniversalStyleConfig["glass"]>) => {
    if (!previewDesignConfig || !isOwnerRole) return;
    const base = getBase();
    previewAndTrack({ ...base, glass: { ...base.glass, ...glassPatch } });
  };

  const applyThemePreset = (preset: typeof MODERN_THEME_PRESETS[number]) => {
    if (!previewDesignConfig || !isOwnerRole) return;
    setSliderAccent(preset.accent);
    setSliderAccent2(preset.accent2);
    setSliderBg(preset.bg);
    setSliderText(preset.text);
    // ثيم نظيف بالكامل: نبدأ من الإعدادات الافتراضية (بدون أنوار/رينبو/تأثيرات عالقة)،
    // ونضبط الألوان + خلفية لون صلبة ظاهرة فعلاً (مش طبقة صورة فوقها).
    const fresh = createDefaultUniversalStyle();
    previewAndTrack({
      ...fresh,
      label: preset.name,
      palette: {
        ...fresh.palette,
        bg: preset.bg,
        surface: preset.surface,
        text: preset.text,
        accent: preset.accent,
        accent2: preset.accent2,
      },
      backgrounds: {
        ...fresh.backgrounds,
        global: { kind: "color", value: preset.bg, overlayOpacity: 0, blurPx: 0 },
      },
    });
  };

  const applyPalettePatch = (patch: Partial<UniversalStyleConfig["palette"]>) => {
    if (!previewDesignConfig || !isOwnerRole) return;
    const base = getBase();
    previewAndTrack({ ...base, palette: { ...base.palette, ...patch } });
  };

  // تصفية شاملة — تصفّر كل أنظمة التنسيق المتداخلة دفعة واحدة (مصدر "الهبل").
  const handleMasterReset = async () => {
    if (!isOwnerRole) return;
    if (!window.confirm("هيتم تصفير كل تأثيرات التصميم (الأنوار، الرينبو، الزجاج، الوجه المخصص) والرجوع لشكل نظيف افتراضي للجميع. متأكد؟")) {
      return;
    }
    // 1) إطفاء كل أشرطة النور (الأعمدة/الكتابة/الهيدر)
    const tint = loadChaseLightSettings().tintHex || "#6ee7b7";
    commitChaseLightSettings({ columns: "none", composer: "none", header: "none", tintHex: tint, speedSec: 6 });
    commitSidebarWidgetSettings({
      radio: "classic",
      music: "classic",
      divider: "classic",
      storeText: "#f8fafc",
      radioText: "#f8fafc",
      musicText: "#f8fafc",
    });
    commitPmBubbleStyle("classic");
    // 2) إرجاع الزجاج الافتراضي
    applyGlassForm(null);
    // 3) إيقاف الوجه المخصص (نظام ثيمات)
    try {
      const f = { ...loadFace(), enabled: false };
      saveFace(f);
      applyFace(f);
    } catch { /* ignore */ }
    // 4) ثيم نظيف افتراضي + حفظ للكل
    if (previewDesignConfig) {
      previewDesignConfig(createDefaultUniversalStyle());
      if (commitPendingDesignPreview) await commitPendingDesignPreview();
    }
    // 5) خلفية افتراضية
    onResetDefaultChatBackground?.();
    // إعادة ضبط حالة السلايدرز
    const d = createDefaultUniversalStyle();
    setSliderGlassBlur(d.glass.blurPx);
    setSliderGlassOpacity(d.glass.opacity);
    setSliderGlassBorder(d.glass.borderOpacity);
    setSliderBtnRadius(d.buttons.radiusPx);
    setSliderBtnGlow(d.buttons.glow);
    setSliderAccent(d.palette.accent);
    setSliderAccent2(d.palette.accent2);
    setSliderBg(d.palette.bg);
    setSliderText(d.palette.text);
    setActiveGlassFormId(null);
    setChaseSettings(loadChaseLightSettings());
    alert("✅ تم رجوع التصميم لوضع نظيف افتراضي. اختر ثيم 2026 من جديد لو حبيت.");
  };

  // الخلفية لازم تتغير في طبقة backgrounds.global (مش بس palette.bg) عشان تظهر فعلاً.
  const applyBgColor = (hex: string) => {
    if (!previewDesignConfig || !isOwnerRole) return;
    setSliderBg(hex);
    const base = getBase();
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
      if (!url) return;
      const next = { ...loadFace(), [imageKey]: url, enabled: true };
      saveFace(next);
      applyFace(next);
      alert("✅ تم رفع صورة العمود وتطبيقها على الشات.");
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
    if (previewKind === "face") {
      cancelFacePreview();
      setPendingFacePresetId(null);
    }
    if (previewKind === "template") {
      cancelAssistantPreview?.();
      setPendingTemplateId(null);
      setPendingTemplateSummary("");
    }
    if (previewKind === "column") {
      cancelColumnCardPreview();
      setPendingColumnStyleId(null);
      setActiveColumnStyleId(loadColumnCardStyleId());
      setColumnTintColor(loadColumnCardTint());
    }
    if (previewKind === "import-pack") {
      cancelImportPackVisualPreview();
      setPendingImportPack(null);
    }
    if (previewKind === "bubble") {
      cancelBubbleShapePreview();
      setPendingBubbleShapeId(null);
      setActiveBubbleShapeId(loadBubbleShapeId());
    }
    if (previewKind === "chase") {
      cancelChaseLightPreview();
      setChaseSettings(loadChaseLightSettings());
      setPendingChaseSummary("");
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
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      void flushSave();
    }
    cancelShapePreviews();
    setSection(next);
  };

  const handlePreviewGlassForm = (formId: GlassFormId) => {
    cancelAllPreviews();
    setPreviewKind("glass");
    setPendingGlassFormId(formId);
    setIsGlassPreviewing(true);
    previewGlassForm(formId, glassTintColor);
  };

  const handleGlassTintChange = (hex: string) => {
    setGlassTintColor(hex);
    if (pendingGlassFormId) {
      previewGlassForm(pendingGlassFormId, hex);
    }
  };

  const handleColumnTintChange = (hex: string) => {
    setColumnTintColor(hex);
    if (pendingColumnStyleId) {
      previewColumnCardStyle(pendingColumnStyleId, hex);
    }
    if (previewKind === "chase") {
      updateChaseLightTintPreview(hex);
      setChaseSettings((s) => ({ ...s, tintHex: hex }));
    }
  };

  const handlePreviewBubbleShape = (shapeId: BubbleShapeId) => {
    cancelAllPreviews();
    // تطبيق فوري عند الضغط (بدل معاينة تحتاج تأكيد منفصل).
    if (commitBubbleShape(shapeId)) {
      setActiveBubbleShapeId(shapeId);
      setPendingBubbleShapeId(null);
      setPreviewKind(null);
      setDesignPreviewActive(false);
    } else {
      alert("⚠️ افتح غرفة شات عادية (مش غرفة القيادة) عشان تشوف شكل الفقاعات يتغيّر.");
    }
  };

  const handleCommitBubbleShape = () => {
    if (!pendingBubbleShapeId) return;
    const label = getBubbleShapeLabel(pendingBubbleShapeId);
    if (commitBubbleShape(pendingBubbleShapeId)) {
      setActiveBubbleShapeId(pendingBubbleShapeId);
      setPendingBubbleShapeId(null);
      setPreviewKind(null);
      setDesignPreviewActive(false);
      alert(`✅ تم تطبيق شكل الفقاعات «${label}».`);
    } else {
      alert("⚠️ تعذر التطبيق — تأكد إن الشات مفتوح.");
    }
  };

  const handlePreviewChaseLight = (
    target: ChaseLightTarget,
    styleId: ChaseLightStyleId,
  ) => {
    if (previewKind !== "chase") {
      cancelAllPreviews();
    }
    setPreviewKind("chase");
    previewChaseLightForTarget(target, styleId);
    setChaseSettings((prev) => {
      const base = previewKind === "chase" ? prev : loadChaseLightSettings();
      return { ...base, [target]: styleId };
    });
    const targetLabel =
      target === "columns" ? "الأعمدة" : target === "composer" ? "الكتابة" : "الهيدر";
    setPendingChaseSummary(`${targetLabel}: ${styleId}`);
    setDesignPreviewActive(true);
  };

  const handleCommitChaseLight = () => {
    previewChaseLightPatch(chaseSettings);
    if (commitChaseLightSettings(chaseSettings)) {
      setChaseSettings(loadChaseLightSettings());
      setPendingChaseSummary("");
      setPreviewKind(null);
      setDesignPreviewActive(false);
      alert("✅ تم تطبيق أشرطة النور.");
    } else {
      alert("⚠️ تعذر التطبيق — تأكد إن الشات مفتوح.");
    }
  };

  const handlePreviewColumnStyle = (styleId: ColumnCardStyleId) => {
    cancelAllPreviews();
    // تطبيق فوري عند الضغط (بدل معاينة تحتاج تأكيد منفصل).
    if (commitColumnCardStyle(styleId, columnTintColor)) {
      setActiveColumnStyleId(styleId === "neon-ring" ? null : styleId);
      setPendingColumnStyleId(null);
      setPreviewKind(null);
      setDesignPreviewActive(false);
    } else {
      alert("⚠️ افتح غرفة شات عادية (مش غرفة القيادة) عشان تشوف شكل البطاقات يتغيّر.");
    }
  };

  const handleCommitColumnStyle = () => {
    if (!pendingColumnStyleId) return;
    const label = getColumnCardStyleLabel(pendingColumnStyleId);
    if (commitColumnCardStyle(pendingColumnStyleId, columnTintColor)) {
      setActiveColumnStyleId(
        pendingColumnStyleId === "neon-ring" ? null : pendingColumnStyleId,
      );
      setPendingColumnStyleId(null);
      setPreviewKind(null);
      alert(`✅ تم تطبيق شكل بطاقات الأعمدة «${label}».`);
    } else {
      alert("⚠️ تعذر التطبيق — تأكد إن الشات مفتوح.");
    }
  };

  const handleCommitGlassForm = () => {
    if (!pendingGlassFormId) return;
    const preset = GLASS_FORM_PRESETS.find((p) => p.id === pendingGlassFormId);
    const label = preset?.title ?? pendingGlassFormId;
    if (commitGlassForm(pendingGlassFormId, glassTintColor)) {
      setActiveGlassFormId(pendingGlassFormId);
      setIsGlassPreviewing(false);
      setPendingGlassFormId(null);
      setPreviewKind(null);
      alert(`✅ تم تطبيق فورم «${label}» بلون البطاقة اللي اخترته.`);
    } else {
      alert("⚠️ تعذر التطبيق — تأكد إن الشات مفتوح.");
    }
  };

  const handleCancelGlassPreview = () => {
    cancelAllPreviews();
  };

  const handlePreviewFacePreset = (presetId: string) => {
    cancelAllPreviews();
    if (previewFacePreset(presetId)) {
      setPreviewKind("face");
      setPendingFacePresetId(presetId);
      setDesignPreviewActive(true);
    }
  };

  const handleCommitFacePreset = () => {
    if (!pendingFacePresetId) return;
    const label = getFacePresetLabel(pendingFacePresetId);
    if (commitFacePreset(pendingFacePresetId)) {
      setActiveFacePresetId(pendingFacePresetId);
      setPendingFacePresetId(null);
      setPreviewKind(null);
      setDesignPreviewActive(false);
      alert(`✅ تم تطبيق سمة «${label}».`);
    }
  };

  const handlePreviewTemplate = (templateId: DesignAssistantProposalId) => {
    cancelAllPreviews();
    const info = previewAssistantPreset?.(templateId);
    if (!info) return;
    setPreviewKind("template");
    setPendingTemplateId(info.id);
    setPendingTemplateSummary(info.summary);
  };

  const handleCommitTemplate = () => {
    if (!pendingTemplateId) return;
    const title = commitAssistantPreset?.(pendingTemplateId);
    if (title) {
      setActiveTemplateId(pendingTemplateId);
      setPendingTemplateId(null);
      setPendingTemplateSummary("");
      setPreviewKind(null);
      alert(`✅ تم تطبيق «${title}».`);
    }
  };

  const handleSmartRecommendPreview = () => {
    cancelAllPreviews();
    const info = previewRecommendedAssistantTemplate?.();
    if (!info) return;
    setPreviewKind("template");
    setPendingTemplateId(info.id);
    setPendingTemplateSummary(info.summary);
  };

  const handlePreviewImportPack = (pack: DesignImportPack) => {
    cancelAllPreviews();
    setPreviewKind("import-pack");
    setPendingImportPack(pack);
    previewImportPackVisuals(pack);
    const styleConfig = resolveImportPackStyleConfig(pack);
    if (previewDesignConfig) {
      previewDesignConfig(styleConfig);
    } else if (previewDesignPrompt && pack.stylePrompt) {
      previewDesignPrompt(pack.stylePrompt);
    }
    if (pack.templateId) {
      const info = previewAssistantPreset?.(pack.templateId);
      if (info) {
        setPendingTemplateId(info.id);
        setPendingTemplateSummary(info.summary);
      }
    }
    setDesignPreviewActive(true);
  };

  const handleCommitImportPack = async () => {
    if (!pendingImportPack) return;
    const pack = pendingImportPack;
    const title = pack.title;
    try {
      if (ownerWriteAccessOk === false && pack.stylePrompt) {
        alert(
          "⚠️ الزجاج والبطاقات تُحفظ محلياً — لكن الألوان العامة تحتاج صلاحية owner على Supabase (user_roles).",
        );
      }
      commitImportPackVisuals(pack);
      if (pack.templateId) {
        commitAssistantPreset?.(pack.templateId);
      }
      if (pack.stylePrompt && commitPendingDesignPreview) {
        await commitPendingDesignPreview();
      }
      setActiveImportPackId(pack.id);
      setPendingImportPack(null);
      setPendingTemplateId(null);
      setPendingTemplateSummary("");
      setPreviewKind(null);
      setDesignPreviewActive(false);
      alert(`✅ تم تطبيق pack «${title}» (${describeImportPackLayers(pack)}).`);
    } catch {
      alert("⚠️ تعذر إكمال التطبيق — جرّب «إلغاء» ثم أعد المعاينة.");
    }
  };

  const handleCancelPreview = () => {
    cancelAllPreviews();
  };

  const handleCommitPreview = () => {
    if (previewKind === "glass") handleCommitGlassForm();
    else if (previewKind === "face") handleCommitFacePreset();
    else if (previewKind === "template") handleCommitTemplate();
    else if (previewKind === "column") handleCommitColumnStyle();
    else if (previewKind === "bubble") handleCommitBubbleShape();
    else if (previewKind === "chase") handleCommitChaseLight();
    else if (previewKind === "import-pack") void handleCommitImportPack();
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
      cancelAssistantPreview?.();
      cancelColumnCardPreview();
      cancelImportPackVisualPreview();
      cancelBubbleShapePreview();
      cancelChaseLightPreview();
      if (hasPendingRef.current) {
        void flushSave();
      }
      setDesignPreviewActive(false);
    };
  }, []);

  return (
    <>
                  <div className="space-y-4 select-none" dir="rtl">
                    <div className="p-4 rounded-2xl lamma-section-card">
                      <div className="text-white text-xs font-black">
                        🎨 مركز التصميم
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-1">
                        معاينة live على الشات → حفظ تلقائي للسيرفر (أو زر حفظ الآن).
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
                        ["uploads", "📤 الصور"],
                        ["colors", "🎨 الألوان"],
                        ["shapes", "🔷 الشكل"],
                        ["ultimate", "✨ Ultimate"],
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

                        {/* Gemini AI */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">✨ Gemini AI — اكتب أي أمر تصميم</div>
                          <div className="text-[10px] text-gray-400">مثل: «اجعل الخلفية زرقاء داكنة»، «زود الشفافية»، «زوايا حادة»</div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key !== "Enter" || !aiPrompt.trim()) return;
                                setAiStatus("loading");
                                const base = getBase();
                                const result = await askDesignAi(aiPrompt.trim(), base);
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
                                } else {
                                  setAiLastSummary(result.summary || result.error || "لم أفهم الأمر");
                                  setAiStatus("error");
                                }
                              }}
                              onPointerDown={stopDrag}
                              placeholder="اكتب أمر التصميم واضغط Enter…"
                              dir="rtl"
                              className="flex-1 text-[11px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50"
                            />
                            <button
                              type="button"
                              onPointerDown={stopDrag}
                              disabled={aiStatus === "loading" || !aiPrompt.trim()}
                              onClick={async () => {
                                if (!aiPrompt.trim()) return;
                                setAiStatus("loading");
                                const base = getBase();
                                const result = await askDesignAi(aiPrompt.trim(), base);
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
                                } else {
                                  setAiLastSummary(result.summary || result.error || "لم أفهم الأمر");
                                  setAiStatus("error");
                                }
                              }}
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
                                previewDesignConfig?.({ ...base, palette: { ...base.palette, accent: v } });
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
                                previewDesignConfig?.({ ...base, palette: { ...base.palette, accent2: v } });
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
                              onPointerDown={stopDrag}
                              onChange={(e) => {
                                applyPalettePatch({ surface: hexToRgba(e.target.value, 0.72) });
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
                                const v = e.target.value;
                                setSliderText(v);
                                applyPalettePatch({ text: v });
                              }}
                              className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">{sliderText}</span>
                          </div>
                        </div>

                        {/* ثيمات 2026 الكاملة — ضغطة واحدة */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">🌈 ثيمات 2026 — اختر بضغطة</div>
                          <div className="text-[10px] text-gray-400">كل ثيم يضبط الخلفية الغامقة + البطاقات + الكتابة + الألوان معاً (معاينة)، ثم «تطبيق نهائي».</div>
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
                                  onClick={() => applyThemePreset(preset)}
                                  title={preset.name}
                                  className={`group flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
                                    isActive ? "bg-white/10 ring-1 ring-cyan-400/60" : "hover:bg-white/5"
                                  }`}
                                >
                                  <span
                                    className="w-full h-8 rounded-lg shadow-inner border border-white/10 flex items-center justify-center gap-1"
                                    style={{ background: preset.bg }}
                                  >
                                    <span className="w-3 h-3 rounded-full" style={{ background: preset.accent }} />
                                    <span className="w-3 h-3 rounded-full" style={{ background: preset.accent2 }} />
                                  </span>
                                  <span className="text-[8px] text-gray-400 font-bold truncate w-full text-center">
                                    {preset.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => {
                              if (!previewDesignConfig || !isOwnerRole) return;
                              const base = getBase();
                              const fresh = createDefaultUniversalStyle();
                              // تصفير كل التأثيرات + الـ regions (الرينبو/الشريط/الأنوار) مع الحفاظ على الألوان.
                              previewAndTrack({
                                ...base,
                                effects: { ...fresh.effects },
                                regions: fresh.regions,
                              });
                            }}
                            className="w-full py-2 rounded-xl text-[10px] font-black lamma-tab-soft hover:text-white"
                          >
                            🚫 إطفاء كل الأنوار والرينبو والتأثيرات
                          </button>
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
                            disabled={isApplyingStyle}
                            className="flex-1 py-2.5 rounded-xl text-[10px] font-black lamma-accent-btn text-white disabled:opacity-50"
                          >
                            {isApplyingStyle
                              ? "⏳ جاري الحفظ…"
                              : hasPendingDesignPreview
                                ? "💾 حفظ الآن للجميع"
                                : "✅ محفوظ على السيرفر"}
                          </button>
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => {
                              cancelPendingDesignPreview?.();
                              const base = getBase();
                              setSliderGlassBlur(base.glass.blurPx);
                              setSliderGlassOpacity(base.glass.opacity);
                              setSliderGlassBorder(base.glass.borderOpacity);
                              setSliderBtnRadius(base.buttons.radiusPx);
                              setSliderBtnGlow(base.buttons.glow);
                              setSliderAccent(base.palette.accent);
                              setSliderAccent2(base.palette.accent2);
                              setSliderBg(base.palette.bg);
                              setSliderText(base.palette.text);
                            }}
                            className="px-4 py-2.5 rounded-xl text-[10px] font-black lamma-tab-soft"
                          >
                            ❌ إلغاء
                          </button>
                        </div>
                      </div>
                    )}

                    {section === "shapes" && isOwnerRole && (
                      <DesignShapesPanel onStartInspectMode={onStartInspectMode} />
                    )}

                    {section === "ultimate" && (
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="p-4 rounded-2xl lamma-section-card">
                          <div className="text-white text-xs font-black">
                            ✨ Ultimate Design System 2026
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold mt-1">
                            مكتبة تصميم شاملة: أشرطة نيون متحركة، زجاج كريستالي، لوحة ألوان المستقبل
                          </div>
                        </div>

                        {/* Neon Borders & Effects */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">💫 أشرطة النيون والمؤثرات</div>
                          <div className="text-[10px] text-gray-400">اختر تأثير الحدود النيون المتحرك</div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "none" as const, label: "بدون" },
                              { id: "led-strip" as const, label: "شريط LED متحرك" },
                              { id: "pulsing-glow" as const, label: "نبض إضاءة" },
                              { id: "border-aura" as const, label: "هالة ضوئية" },
                              { id: "rgb-wave" as const, label: "موجة RGB" },
                              { id: "static-cyber" as const, label: "خط سيبر ثابت" },
                            ].map((style) => (
                              <button
                                key={style.id}
                                type="button"
                                onPointerDown={stopDrag}
                                onClick={() => {
                                  const newSettings = { ...udsSettings, neonBorder: style.id };
                                  setUdsSettings(newSettings);
                                  previewUDSSettings(newSettings);
                                  setUdsPreviewActive(true);
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
                                      const newSettings = { ...udsSettings, neonBorderColor: c.id };
                                      setUdsSettings(newSettings);
                                      previewUDSSettings(newSettings);
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
                                  const newSettings = { ...udsSettings, applyToBody: !udsSettings.applyToBody };
                                  setUdsSettings(newSettings);
                                  previewUDSSettings(newSettings);
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
                                  const newSettings = { ...udsSettings, applyToContainers: !udsSettings.applyToContainers };
                                  setUdsSettings(newSettings);
                                  previewUDSSettings(newSettings);
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
                                  const newSettings = { ...udsSettings, glassTexture: style.id };
                                  setUdsSettings(newSettings);
                                  previewUDSSettings(newSettings);
                                  setUdsPreviewActive(true);
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
                                      const newSettings = { ...udsSettings, glassTint: c.id };
                                      setUdsSettings(newSettings);
                                      previewUDSSettings(newSettings);
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
                                  const newSettings = { ...udsSettings, applyToContainers: !udsSettings.applyToContainers };
                                  setUdsSettings(newSettings);
                                  previewUDSSettings(newSettings);
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
                                  const newSettings = { ...udsSettings, palette: c.id };
                                  setUdsSettings(newSettings);
                                  previewUDSSettings(newSettings);
                                  setUdsPreviewActive(true);
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

                        {/* Preview Cards */}
                        <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                          <div className="text-[11px] text-cyan-300 font-black">👁️ معاينة سريعة</div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { style: "led-strip" as const, label: "LED Strip" },
                              { style: "pulsing-glow" as const, label: "Pulsing Glow" },
                              { style: "border-aura" as const, label: "Border Aura" },
                            ].map((preview) => (
                              <div
                                key={preview.style}
                                className={`uds-preview-card ${udsSettings.neonBorder === preview.style ? "active" : ""} ${
                                  preview.style === "led-strip" ? "uds-neon-led-strip" :
                                  preview.style === "pulsing-glow" ? "uds-pulsing-glow" :
                                  "uds-border-aura"
                                }`}
                                onClick={() => {
                                  const newSettings = { ...udsSettings, neonBorder: preview.style };
                                  setUdsSettings(newSettings);
                                  previewUDSSettings(newSettings);
                                  setUdsPreviewActive(true);
                                }}
                                style={{ backgroundColor: "#0a0a0a" }}
                              >
                                {preview.label}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { style: "ios-ultra-blur" as const, label: "iOS Blur" },
                              { style: "crystal-glow" as const, label: "Crystal" },
                              { style: "soft-frosted" as const, label: "Frosted" },
                            ].map((preview) => (
                              <div
                                key={preview.style}
                                className={`uds-preview-card ${udsSettings.glassTexture === preview.style ? "active" : ""} ${
                                  preview.style === "ios-ultra-blur" ? "uds-ios-ultra-blur" :
                                  preview.style === "crystal-glow" ? "uds-crystal-glow" :
                                  "uds-soft-frosted"
                                }`}
                                onClick={() => {
                                  const newSettings = { ...udsSettings, glassTexture: preview.style };
                                  setUdsSettings(newSettings);
                                  previewUDSSettings(newSettings);
                                  setUdsPreviewActive(true);
                                }}
                                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                              >
                                {preview.label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Save / Apply / Reset Bar */}
                        <div className="sticky top-0 z-20 flex gap-2 p-3 rounded-2xl border border-cyan-400/30 bg-[#0a1218]/95 backdrop-blur-xl">
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => {
                              commitUDSSettings(udsSettings);
                              setUdsPreviewActive(false);
                              alert("✅ تم حفظ إعدادات Ultimate Design System وتطبيقها بنجاح!");
                            }}
                            className="flex-1 py-2.5 rounded-xl text-[10px] font-black lamma-accent-btn text-white"
                          >
                            💾 حفظ وتطبيق
                          </button>
                          <button
                            type="button"
                            onPointerDown={stopDrag}
                            onClick={() => {
                              resetUDSSettings();
                              setUdsSettings(loadUDSSettings());
                              setUdsPreviewActive(false);
                              alert("✅ تم إعادة تعيين الإعدادات للافتراضي.");
                            }}
                            className="px-4 py-2.5 rounded-xl text-[10px] font-black lamma-tab-soft"
                          >
                            ↺ إعادة تعيين
                          </button>
                        </div>

                        {/* Preview Status */}
                        {udsPreviewActive && (
                          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30">
                            <div className="text-[10px] text-cyan-300 font-bold text-center">
                              👀 معاينة نشطة - اضغط "حفظ وتطبيق" للتثبيت
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {section === "uploads" && (
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

                  </div>
    </>
  );
};
