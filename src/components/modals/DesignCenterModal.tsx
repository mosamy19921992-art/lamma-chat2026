import React, { useEffect, useRef, useState } from 'react';
import { DesignStudioModal } from './DesignStudioModal';
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

type DesignSection = "uploads" | "studio" | "library" | "assistant";

export const DesignCenterModal = ({ isOwnerRole, runAssistantAudit, queueAssistantProposal, previewAssistantPreset, commitAssistantPreset, cancelAssistantPreview, previewRecommendedAssistantTemplate, assistantAudit, assistantFindings, assistantProposal, handleApplyAssistantProposal, setAssistantProposal, lastAppliedDesignSnapshot, handleRestoreLastDesignSnapshot, brandLogoUrl, designLogoUploadRef, handleDesignLogoUpload, designLogoInput, setDesignLogoInput, setBrandLogoUrl, activeRoomId, openRooms, designRoomBgUploadRef, handleDesignRoomBgUpload, designRoomBgInput, setDesignRoomBgInput, roomBgMap, setRoomBgMap, designOwnerBgUploadRef, handleDesignOwnerBgUpload, designOwnerBgInput, setDesignOwnerBgInput, setOwnerBgImage, onResetDefaultChatBackground, uploadDesignImage, designPresets, designPresetName, setDesignPresetName, handleSaveDesignPreset, applyDesignPreset, handleDeleteDesignPreset, onStartInspectMode, previewDesignPrompt, cancelPendingDesignPreview, commitPendingDesignPreview }: any) => {
  type PreviewKind = "glass" | "face" | "template" | "column" | "import-pack" | null;

  const [section, setSection] = useState<DesignSection>("uploads");
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
  const rightColUploadRef = useRef<HTMLInputElement>(null);
  const centerColUploadRef = useRef<HTMLInputElement>(null);
  const leftColUploadRef = useRef<HTMLInputElement>(null);

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

  const cancelAllPreviews = () => {
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
      cancelPendingDesignPreview?.();
      setPendingImportPack(null);
    }
    setPreviewKind(null);
    setDesignPreviewActive(false);
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
  };

  const handlePreviewColumnStyle = (styleId: ColumnCardStyleId) => {
    cancelAllPreviews();
    setPreviewKind("column");
    setPendingColumnStyleId(styleId);
    previewColumnCardStyle(styleId, columnTintColor);
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
    if (pack.templateId) {
      const info = previewAssistantPreset?.(pack.templateId);
      if (info) {
        setPendingTemplateId(info.id);
        setPendingTemplateSummary(info.summary);
      }
    }
    if (pack.stylePrompt && previewDesignPrompt) {
      previewDesignPrompt(pack.stylePrompt);
    }
    setDesignPreviewActive(true);
  };

  const handleCommitImportPack = async () => {
    if (!pendingImportPack) return;
    const pack = pendingImportPack;
    const title = pack.title;
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
  };

  const handleCancelPreview = () => {
    cancelAllPreviews();
  };

  const handleCommitPreview = () => {
    if (previewKind === "glass") handleCommitGlassForm();
    else if (previewKind === "face") handleCommitFacePreset();
    else if (previewKind === "template") handleCommitTemplate();
    else if (previewKind === "column") handleCommitColumnStyle();
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
      cancelGlassPreview();
      cancelFacePreview();
      cancelAssistantPreview?.();
      cancelColumnCardPreview();
      cancelImportPackVisualPreview();
      cancelPendingDesignPreview?.();
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
                        ارفع الصور أولاً، ثم غيّر الألوان من الاستوديو، أو استخدم
                        الاقتراحات الذكية.
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-2xl lamma-section-card overflow-x-auto">
                      {([
                        ["uploads", "📤 رفع الصور"],
                        ["studio", "🎛️ الألوان والثيمات"],
                        ["library", "📚 مكتبة الثيمات"],
                        ["assistant", "🤖 المساعد الذكي"],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSection(id)}
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

                    {section === "studio" && isOwnerRole && (
                      <DesignStudioModal
                        isOwnerRole={isOwnerRole}
                        uploadDesignImage={uploadDesignImage}
                      />
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

                    {section === "library" && isOwnerRole && (
                      <div className="space-y-4">
                        {previewKind === "import-pack" && pendingImportPack && (
                          <DesignPreviewBar
                            kind="import-pack"
                            label={`Pack: ${pendingImportPack.emoji} ${pendingImportPack.title}`}
                            detail={describeImportPackLayers(pendingImportPack)}
                            tintHex={getImportPackTint(pendingImportPack)}
                            onCommit={() => void handleCommitImportPack()}
                            onCancel={handleCancelPreview}
                          />
                        )}
                        <DesignImportLibrary
                          onPreviewPack={handlePreviewImportPack}
                          pendingPackId={pendingImportPack?.id}
                          activePackId={activeImportPackId}
                        />
                        <DesignTemplateGallery
                          onPreviewTemplate={handlePreviewTemplate}
                          onPreviewFacePreset={handlePreviewFacePreset}
                          onPreviewGlassForm={handlePreviewGlassForm}
                          onPreviewColumnStyle={handlePreviewColumnStyle}
                          onCommitPreview={handleCommitPreview}
                          onCancelPreview={handleCancelPreview}
                          onTintChange={(hex: string) => {
                            handleGlassTintChange(hex);
                            handleColumnTintChange(hex);
                          }}
                          onResetGlassForm={handleResetGlassForm}
                          previewKind={previewKind === "import-pack" ? null : previewKind}
                          activeGlassFormId={activeGlassFormId}
                          pendingGlassFormId={pendingGlassFormId}
                          tintColor={glassTintColor}
                          pendingColumnStyleId={pendingColumnStyleId}
                          activeColumnStyleId={activeColumnStyleId}
                          pendingFacePresetId={pendingFacePresetId}
                          activeFacePresetId={activeFacePresetId}
                          pendingTemplateId={pendingTemplateId}
                          activeTemplateId={activeTemplateId}
                          pendingTemplateSummary={pendingTemplateSummary}
                          designPresets={designPresets}
                          applyDesignPreset={applyDesignPreset}
                          handleDeleteDesignPreset={handleDeleteDesignPreset}
                          designPresetName={designPresetName}
                          setDesignPresetName={setDesignPresetName}
                          handleSaveDesignPreset={handleSaveDesignPreset}
                        />
                      </div>
                    )}

                    {section === "assistant" && isOwnerRole && (
                      <div className="space-y-4">
                        <div className="p-5 rounded-2xl space-y-3 lamma-section-card border border-emerald-500/25">
                          <div className="text-[12px] font-black text-emerald-300">
                            ✨ Universal Visual AI Style Engine
                          </div>
                          <p className="text-[10px] text-gray-300 leading-relaxed font-bold">
                            النظام القديم للأوامر الصلبة اتلغى. افتح{" "}
                            <span className="text-emerald-200">غرفة المالك (Owner)</span>{" "}
                            واكتب بالعربي أو الإنجليزي — مثلاً:{" "}
                            <span className="text-white/90">
                              make the site cyberpunk neon
                            </span>{" "}
                            أو{" "}
                            <span className="text-white/90">fabulous glassmorphic look</span>.
                          </p>
                          <ul className="text-[10px] text-gray-400 space-y-1.5 font-bold list-disc list-inside">
                            <li>معاينة Sandbox داخل الشات قبل أي تطبيق global</li>
                            <li>Refine متعدد الجولات (مثلاً: make buttons rounder)</li>
                            <li>Apply Globally يحفظ في Supabase لكل المستخدمين + PWA</li>
                            <li>خلفيات صورة/فيديو مع overlay تلقائي للقراءة</li>
                            <li>اكتب «اقتراحات» أو «الألوان مش مناسبة» — البوت يحلل ويقترح إصلاحات</li>
                            <li>«مكتبة ثيمات» أو «liquid glass» — packs جاهزة iOS + استيراد JSON من النت</li>
                          </ul>
                          <p className="text-[9px] text-gray-500">
                            تبويب Studio أعلاه لرفع الخلفيات اليدوي — المساعد الذكي الآن في الشات فقط.
                          </p>
                          {onStartInspectMode ? (
                            <button
                              type="button"
                              onClick={() => onStartInspectMode()}
                              onPointerDown={stopDrag}
                              className="w-full mt-2 py-3 rounded-xl font-black text-[11px] transition-all cursor-pointer lamma-accent-btn text-white shadow-[0_0_24px_rgba(16,185,129,0.25)]"
                            >
                              🎯 حدّد بالماوس (Inspect Mode)
                            </button>
                          ) : null}
                          <p className="text-[9px] text-gray-500 mt-2 leading-relaxed">
                            انقر على أي جزء في الشات — هيدر، أعمدة، رسائل، خلفية، أو شريط
                            الكتابة — ثم طبّق أوامر سريعة مع معاينة حية قبل الحفظ.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
    </>
  );
};
