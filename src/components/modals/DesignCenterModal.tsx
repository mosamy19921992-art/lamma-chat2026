import React from 'react';
import { DesignStudioModal } from './DesignStudioModal';

export const DesignCenterModal = ({ isOwnerRole, runAssistantAudit, queueAssistantProposal, queueRecommendedAssistantProposal, assistantAudit, assistantFindings, assistantProposal, handleApplyAssistantProposal, setAssistantProposal, lastAppliedDesignSnapshot, handleRestoreLastDesignSnapshot, setWallTheme, wallTheme, designPresetName, setDesignPresetName, handleSaveDesignPreset, designPresets, applyDesignPreset, handleDeleteDesignPreset, brandLogoUrl, designLogoUploadRef, handleDesignLogoUpload, designLogoInput, setDesignLogoInput, setBrandLogoUrl, chatTheme, setChatTheme, glowColor, setGlowColor, activeRoomId, openRooms, designRoomBgUploadRef, handleDesignRoomBgUpload, designRoomBgInput, setDesignRoomBgInput, roomBgMap, setRoomBgMap, designOwnerBgUploadRef, handleDesignOwnerBgUpload, designOwnerBgInput, setDesignOwnerBgInput, setOwnerBgImage }: any) => {
  return (
    <>
                  <div className="space-y-4 select-none" dir="rtl">
                    <div className="p-4 rounded-2xl lamma-section-card">
                      <div className="text-white text-xs font-black">
                        🎨 مركز التصميم
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-1">
                        تحكم في الهوية البصرية: اللوجو، الخلفيات، وبعض عناصر
                        الواجهة.
                      </div>
                    </div>

                    {isOwnerRole && <DesignStudioModal isOwnerRole={isOwnerRole} />}

                    {isOwnerRole && (
                      <div className="p-4 rounded-2xl space-y-3 lamma-section-card">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[11px] text-emerald-300 font-black">
                              🤖 المساعد الذكي الآمن
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold mt-1">
                              يفحص ويقترح فقط. لا يغيّر أي شيء إلا بعد موافقتك.
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Safe Mode
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                          <button
                            type="button"
                            onClick={runAssistantAudit}
                            className="py-2 rounded-xl text-[10px] font-black transition-all lamma-tab-soft hover:text-white"
                          >
                            فحص الشات
                          </button>
                          <button
                            type="button"
                            onClick={queueRecommendedAssistantProposal}
                            className="py-2 rounded-xl text-[10px] font-black transition-all text-white lamma-accent-btn"
                          >
                            اقتراح ذكي
                          </button>
                          <button
                            type="button"
                            onClick={() => queueAssistantProposal("premium")}
                            className="py-2 rounded-xl text-[10px] font-black transition-all lamma-tab-soft hover:text-white"
                          >
                            اقتراح فاخر
                          </button>
                          <button
                            type="button"
                            onClick={() => queueAssistantProposal("calm")}
                            className="py-2 rounded-xl text-[10px] font-black transition-all lamma-tab-soft hover:text-white"
                          >
                            اقتراح هادئ
                          </button>
                          <button
                            type="button"
                            onClick={() => queueAssistantProposal("night")}
                            className="py-2 rounded-xl text-[10px] font-black transition-all lamma-tab-soft hover:text-white"
                          >
                            اقتراح ليلي
                          </button>
                          <button
                            type="button"
                            onClick={() => queueAssistantProposal("room-focus")}
                            className="py-2 rounded-xl text-[10px] font-black transition-all lamma-tab-soft hover:text-white"
                          >
                            اقتراح للغرفة
                          </button>
                          <button
                            type="button"
                            onClick={() => queueAssistantProposal("identity-refresh")}
                            className="py-2 rounded-xl text-[10px] font-black transition-all lamma-tab-soft hover:text-white"
                          >
                            تحديث الهوية
                          </button>
                          <button
                            type="button"
                            onClick={() => queueAssistantProposal("immersive")}
                            className="py-2 rounded-xl text-[10px] font-black transition-all lamma-tab-soft hover:text-white"
                          >
                            وضع الغمر
                          </button>
                        </div>

                        {assistantAudit && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="rounded-2xl p-3 lamma-admin-card">
                              <div className="text-[10px] text-gray-400 font-black">
                                تقييم المظهر
                              </div>
                              <div className="text-2xl font-black text-emerald-300 mt-1">
                                {assistantAudit.score}/100
                              </div>
                              <div className="text-[10px] text-gray-300 font-bold mt-1">
                                {assistantAudit.verdict}
                              </div>
                            </div>
                            <div className="rounded-2xl p-3 lamma-admin-card">
                              <div className="text-[10px] text-gray-400 font-black">
                                الغرفة المستهدفة
                              </div>
                              <div className="text-[14px] font-black text-cyan-300 mt-2">
                                {assistantAudit.roomLabel}
                              </div>
                              <div className="text-[10px] text-gray-300 font-bold mt-1">
                                المساعد يراجع الغرفة المفتوحة الآن ويحسب اقتراحه عليها.
                              </div>
                            </div>
                            <div className="rounded-2xl p-3 lamma-admin-card">
                              <div className="text-[10px] text-gray-400 font-black">
                                خلاصة سريعة
                              </div>
                              <div className="space-y-1.5 mt-2">
                                {assistantAudit.highlights.map((item, index) => (
                                  <div
                                    key={`${item}-${index}`}
                                    className="text-[10px] text-gray-300 font-bold"
                                  >
                                    • {item}
                                  </div>
                                ))}
                              </div>
                            </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              <div className="rounded-2xl p-3 lamma-admin-card">
                                <div className="text-[10px] text-gray-400 font-black">الهوية</div>
                                <div className="text-lg font-black text-amber-300 mt-1">
                                  {assistantAudit.identityScore}/100
                                </div>
                              </div>
                              <div className="rounded-2xl p-3 lamma-admin-card">
                                <div className="text-[10px] text-gray-400 font-black">القراءة</div>
                                <div className="text-lg font-black text-sky-300 mt-1">
                                  {assistantAudit.readabilityScore}/100
                                </div>
                              </div>
                              <div className="rounded-2xl p-3 lamma-admin-card">
                                <div className="text-[10px] text-gray-400 font-black">الغرفة</div>
                                <div className="text-lg font-black text-violet-300 mt-1">
                                  {assistantAudit.roomScore}/100
                                </div>
                              </div>
                              <div className="rounded-2xl p-3 lamma-admin-card">
                                <div className="text-[10px] text-gray-400 font-black">الصقل</div>
                                <div className="text-lg font-black text-emerald-300 mt-1">
                                  {assistantAudit.polishScore}/100
                                </div>
                              </div>
                              <div className="rounded-2xl p-3 lamma-admin-card">
                                <div className="text-[10px] text-gray-400 font-black">الخطوة الأنسب</div>
                                <div className="text-[10px] text-gray-200 font-black mt-2 leading-5">
                                  {assistantAudit.nextAction}
                                </div>
                              </div>
                            </div>
                            {assistantAudit.quickWins.length > 0 && (
                              <div className="rounded-2xl p-3 border border-cyan-500/20 bg-cyan-500/[0.04] space-y-2">
                                <div className="text-[10px] text-cyan-300 font-black">
                                  أسرع خطوات تخليك أقرب لشكل احترافي
                                </div>
                                <div className="space-y-1.5">
                                  {assistantAudit.quickWins.map((item, index) => (
                                    <div
                                      key={`${item}-${index}`}
                                      className="text-[10px] text-cyan-100 font-bold"
                                    >
                                      {index + 1}. {item}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {assistantFindings.length > 0 && (
                          <div className="rounded-2xl p-3 space-y-2 lamma-admin-card">
                            <div className="text-[10px] text-cyan-300 font-black">
                              نتيجة الفحص
                            </div>
                            <div className="space-y-1.5">
                              {assistantFindings.map((finding, index) => (
                                <div
                                  key={`${finding.text}-${index}`}
                                  className={`text-[10px] font-bold rounded-xl px-2.5 py-2 border ${
                                    finding.tone === "critical"
                                      ? "text-red-200 border-red-500/20 bg-red-500/5"
                                      : finding.tone === "warn"
                                        ? "text-yellow-200 border-yellow-500/20 bg-yellow-500/5"
                                        : "text-emerald-200 border-emerald-500/20 bg-emerald-500/5"
                                  }`}
                                >
                                  {finding.tone === "critical"
                                    ? "⛔"
                                    : finding.tone === "warn"
                                      ? "⚠️"
                                      : "✅"}{" "}
                                  <span className="font-black">{finding.title}:</span>{" "}
                                  {finding.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {assistantProposal && (
                          <div className="rounded-2xl p-3 space-y-3 border border-fuchsia-500/20 bg-fuchsia-500/[0.04]">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-[11px] text-fuchsia-300 font-black">
                                  {assistantProposal.title}
                                </div>
                                <div className="text-[10px] text-gray-300 font-bold mt-1">
                                  {assistantProposal.summary}
                                </div>
                              </div>
                              <span className="px-2 py-1 rounded-full text-[9px] font-black bg-fuchsia-500/10 text-fuchsia-200 border border-fuchsia-500/20">
                                بانتظار إذنك
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="rounded-xl p-2 text-[10px] font-bold lamma-admin-card">
                                مجال التركيز: {assistantProposal.focusArea}
                              </div>
                              <div className="rounded-xl p-2 text-[10px] font-bold lamma-admin-card">
                                الأثر: {assistantProposal.impact}
                              </div>
                              <div className="rounded-xl p-2 text-[10px] font-bold lamma-admin-card">
                                الثقة: {assistantProposal.confidence}%
                              </div>
                              <div className="rounded-xl p-2 text-[10px] font-bold lamma-admin-card">
                                النتيجة المتوقعة: {assistantProposal.expectedScore}/100
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="rounded-2xl p-3 lamma-admin-card">
                                <div className="text-[10px] text-gray-400 font-black">
                                  قبل التطبيق
                                </div>
                                <div className="text-[10px] text-gray-200 font-bold mt-2 leading-5">
                                  {assistantProposal.beforeState}
                                </div>
                              </div>
                              <div className="rounded-2xl p-3 border border-emerald-500/20 bg-emerald-500/[0.05]">
                                <div className="text-[10px] text-emerald-300 font-black">
                                  بعد التطبيق
                                </div>
                                <div className="text-[10px] text-emerald-100 font-bold mt-2 leading-5">
                                  {assistantProposal.afterState}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {assistantProposal.changes.chatTheme && (
                                <div className="rounded-xl p-2 text-[10px] font-bold lamma-admin-card">
                                  ثيم الشات: {assistantProposal.changes.chatTheme}
                                </div>
                              )}
                              {assistantProposal.changes.wallTheme && (
                                <div className="rounded-xl p-2 text-[10px] font-bold lamma-admin-card">
                                  ألوان الجدران: {assistantProposal.changes.wallTheme}
                                </div>
                              )}
                              {assistantProposal.changes.glowColor && (
                                <div className="rounded-xl p-2 text-[10px] font-bold lamma-admin-card flex items-center justify-between gap-2">
                                  <span>الإضاءة: {assistantProposal.changes.glowColor}</span>
                                  <span
                                    className="w-4 h-4 rounded-full border border-white/15"
                                    style={{
                                      backgroundColor: assistantProposal.changes.glowColor,
                                    }}
                                  />
                                </div>
                              )}
                              {typeof assistantProposal.changes.brandLogoUrl !== "undefined" && (
                                <div className="rounded-xl p-2 text-[10px] font-bold lamma-admin-card">
                                  الشعار: {assistantProposal.changes.brandLogoUrl ? "سيتم توحيد الشعار الحالي" : "الرجوع للافتراضي"}
                                </div>
                              )}
                              {typeof assistantProposal.changes.roomBgCurrent !== "undefined" && (
                                <div className="rounded-xl p-2 text-[10px] font-bold lamma-admin-card">
                                  خلفية الغرفة الحالية: {assistantProposal.changes.roomBgCurrent ? "تحديث" : "إزالة التخصيص"}
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              {assistantProposal.reasoning.map((reason, index) => (
                                <div
                                  key={`${assistantProposal.id}-${index}`}
                                  className="text-[10px] text-gray-300 font-bold"
                                >
                                  • {reason}
                                </div>
                              ))}
                            </div>

                            <div className="rounded-2xl p-3 border border-white/10 bg-white/[0.03] space-y-1.5">
                              <div className="text-[10px] text-white font-black">
                                خطوات التنفيذ الاحترافية
                              </div>
                              {assistantProposal.implementationSteps.map((step, index) => (
                                <div
                                  key={`${assistantProposal.id}-step-${index}`}
                                  className="text-[10px] text-gray-200 font-bold"
                                >
                                  {index + 1}. {step}
                                </div>
                              ))}
                            </div>

                            {assistantProposal.warnings.length > 0 && (
                              <div className="rounded-2xl p-3 border border-yellow-500/20 bg-yellow-500/[0.05] space-y-1.5">
                                <div className="text-[10px] text-yellow-200 font-black">
                                  ملاحظات قبل التطبيق
                                </div>
                                {assistantProposal.warnings.map((warning, index) => (
                                  <div
                                    key={`${assistantProposal.id}-warning-${index}`}
                                    className="text-[10px] text-yellow-100 font-bold"
                                  >
                                    • {warning}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={handleApplyAssistantProposal}
                                className="py-2 rounded-xl text-[10px] font-black text-white transition-all lamma-accent-btn"
                              >
                                تطبيق المقترح
                              </button>
                              <button
                                type="button"
                                onClick={() => setAssistantProposal(null)}
                                className="py-2 rounded-xl text-[10px] font-black transition-all lamma-tab-soft hover:text-white"
                              >
                                تجاهل المقترح
                              </button>
                              <button
                                type="button"
                                disabled={!lastAppliedDesignSnapshot}
                                onClick={handleRestoreLastDesignSnapshot}
                                className={`py-2 rounded-xl text-[10px] font-black transition-all ${
                                  lastAppliedDesignSnapshot
                                    ? "lamma-danger-btn"
                                    : "opacity-50 cursor-not-allowed lamma-tab-soft"
                                }`}
                              >
                                استعادة آخر شكل
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}


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
                  </div>
    </>
  );
};
