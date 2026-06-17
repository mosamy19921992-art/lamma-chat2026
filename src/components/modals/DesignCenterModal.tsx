import React, { useEffect, useRef, useState } from 'react';
import { DesignStudioModal } from './DesignStudioModal';
import { DesignTemplateGallery } from './DesignTemplateGallery';
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

type DesignSection = "uploads" | "studio" | "assistant";

export const DesignCenterModal = ({ isOwnerRole, runAssistantAudit, queueAssistantProposal, previewAssistantPreset, commitAssistantPreset, cancelAssistantPreview, previewRecommendedAssistantTemplate, assistantAudit, assistantFindings, assistantProposal, handleApplyAssistantProposal, setAssistantProposal, lastAppliedDesignSnapshot, handleRestoreLastDesignSnapshot, brandLogoUrl, designLogoUploadRef, handleDesignLogoUpload, designLogoInput, setDesignLogoInput, setBrandLogoUrl, activeRoomId, openRooms, designRoomBgUploadRef, handleDesignRoomBgUpload, designRoomBgInput, setDesignRoomBgInput, roomBgMap, setRoomBgMap, designOwnerBgUploadRef, handleDesignOwnerBgUpload, designOwnerBgInput, setDesignOwnerBgInput, setOwnerBgImage, uploadDesignImage, designPresets, designPresetName, setDesignPresetName, handleSaveDesignPreset, applyDesignPreset, handleDeleteDesignPreset }: any) => {
  type PreviewKind = "glass" | "face" | "template" | null;

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
  const [columnUploading, setColumnUploading] = useState<string | null>(null);
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

  const handleCancelPreview = () => {
    cancelAllPreviews();
  };

  const handleCommitPreview = () => {
    if (previewKind === "glass") handleCommitGlassForm();
    else if (previewKind === "face") handleCommitFacePreset();
    else if (previewKind === "template") handleCommitTemplate();
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

                    {section === "assistant" && isOwnerRole && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] text-emerald-300 font-black">
                                🤖 المساعد الذكي — معرض التصاميم
                              </div>
                              <div className="text-[10px] text-gray-400 font-bold mt-1">
                                بطاقات زجاجية جاهزة — اختار تصميم وطبّقه كمالك بضغطة واحدة.
                              </div>
                            </div>
                            <span className="px-2 py-1 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
                              Safe Mode
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={runAssistantAudit}
                              onPointerDown={stopDrag}
                              className="px-4 py-2 rounded-xl text-[10px] font-black lamma-tab-soft hover:text-white"
                            >
                              🔍 فحص الشات
                            </button>
                            <button
                              type="button"
                              onClick={handleSmartRecommendPreview}
                              onPointerDown={stopDrag}
                              className="px-4 py-2 rounded-xl text-[10px] font-black lamma-accent-btn text-white"
                            >
                              ✨ اقتراح ذكي
                            </button>
                            {lastAppliedDesignSnapshot && (
                              <button
                                type="button"
                                onClick={handleRestoreLastDesignSnapshot}
                                onPointerDown={stopDrag}
                                className="px-4 py-2 rounded-xl text-[10px] font-black lamma-danger-btn"
                              >
                                ↩️ تراجع
                              </button>
                            )}
                          </div>

                          {assistantAudit && (
                            <div className="rounded-2xl p-3 lamma-admin-card">
                              <div className="text-[10px] text-gray-400 font-black">تقييم المظهر</div>
                              <div className="text-2xl font-black text-emerald-300 mt-1">
                                {assistantAudit.score}/100
                              </div>
                              <div className="text-[10px] text-gray-300 font-bold mt-1">
                                {assistantAudit.verdict}
                              </div>
                            </div>
                          )}
                        </div>

                        <DesignTemplateGallery
                          onPreviewTemplate={handlePreviewTemplate}
                          onPreviewFacePreset={handlePreviewFacePreset}
                          onPreviewGlassForm={handlePreviewGlassForm}
                          onCommitPreview={handleCommitPreview}
                          onCancelPreview={handleCancelPreview}
                          onGlassTintChange={handleGlassTintChange}
                          onResetGlassForm={handleResetGlassForm}
                          previewKind={previewKind}
                          activeGlassFormId={activeGlassFormId}
                          pendingGlassFormId={pendingGlassFormId}
                          glassTintColor={glassTintColor}
                          pendingFacePresetId={pendingFacePresetId}
                          activeFacePresetId={activeFacePresetId}
                          pendingTemplateId={pendingTemplateId}
                          activeTemplateId={activeTemplateId}
                          pendingTemplateSummary={pendingTemplateSummary}
                          recommendedPresetId={assistantAudit?.recommendedPreset}
                          designPresets={designPresets}
                          designPresetName={designPresetName}
                          setDesignPresetName={setDesignPresetName}
                          handleSaveDesignPreset={handleSaveDesignPreset}
                          applyDesignPreset={applyDesignPreset}
                          handleDeleteDesignPreset={handleDeleteDesignPreset}
                        />

                        {assistantProposal && (
                          <div className="p-4 rounded-2xl space-y-3 lamma-section-card border border-cyan-500/20">
                            <div className="text-[11px] font-black text-cyan-300">
                              📋 مقترح قيد المراجعة: {assistantProposal.title}
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold">
                              {assistantProposal.summary}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleApplyAssistantProposal}
                                onPointerDown={stopDrag}
                                className="flex-1 py-2.5 rounded-xl text-[10px] font-black lamma-accent-btn"
                              >
                                ✅ تطبيق المقترح
                              </button>
                              <button
                                type="button"
                                onClick={() => setAssistantProposal(null)}
                                onPointerDown={stopDrag}
                                className="px-4 py-2.5 rounded-xl text-[10px] font-black lamma-tab-soft"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
    </>
  );
};
