import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LinkIcon, Shield, Mic, Phone, Video, Radio, Compass, Lock, Ghost, Trash2, Image, Tv, Upload, Loader2 } from 'lucide-react';
import { type BanInfo } from "../../lib/chatTypes.ts";
import { MemberAvatar } from "../MemberAvatar";
import { PROFILE_AVATAR_EMOJIS } from "../../lib/avatarDisplay";

export const UserProfileModal = ({ showProfileModal, selectedProfileMember, setShowProfileModal, setSelectedProfileMember, myActiveSession, currentUser, isOwnerRole, isRegisteredAccount, tempEntryTopicInput, setTempEntryTopicInput, setTempEntryTopicStatusText, tempEntryTopicEnabled, setTempEntryTopicEnabled, handleSaveTempEntryTopic, tempEntryTopicStatusText, nicknameRequestInput, setNicknameRequestInput, nicknameRequestLoading, handleSubmitNicknameChangeRequest, nicknameRequestStatusText, nicknameRequests, setRoomMessages, activeRoomId, addSystemActivityLog, addLammaBotMessage, bannedUsersList, removeBanEntries, addBanEntry, chatMembers, setChatMembers, memberCustomPermissions, setMemberCustomPermissions, myCustomBio, setMyCustomBio, handleSelectProfileEmoji, handleProfileAvatarUploadChange, profileAvatarInputRef, profileAvatarSaving, profileAvatarStatus }: any) => {
  const isOwnProfile =
    selectedProfileMember?.nickname === myActiveSession.nickname;
  const isStaffViewer =
    currentUser.role === "owner" ||
    currentUser.role === "admin" ||
    currentUser.role === "mod";
  const showStaffTools = isStaffViewer && !isOwnProfile;

  return (
    <>
        {showProfileModal && selectedProfileMember && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-20 left-4 md:left-auto md:right-32 w-[340px] rounded-3xl overflow-hidden flex flex-col z-[100] cursor-move lamma-modal-shell"
            style={{
              resize: "both",
              overflow: "hidden",
              minWidth: "300px",
              minHeight: "450px",
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
            dir="rtl"
          >
            <div
              className="flex-1 flex flex-col overflow-y-auto"
              onPointerDownCapture={(e) => e.stopPropagation()}
            >
              {/* Profile Header */}
              <div className="flex items-center justify-between p-4 lamma-modal-header">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👤</span>
                  <h3 className="font-sans font-black text-white text-xs">
                    {isOwnProfile
                      ? "بطاقتي الشخصية والإعدادات"
                      : showStaffTools
                        ? `الملف التعريفي والرقابة • ${selectedProfileMember.nickname}`
                        : `الملف التعريفي • ${selectedProfileMember.nickname}`}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setSelectedProfileMember(null);
                  }}
                  className="p-1.5 rounded-xl text-red-400 transition-all cursor-pointer lamma-danger-btn"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Profile Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-right">
                {/* Visual Avatar Card */}
                <div className="p-4 rounded-2xl flex items-center gap-3 lamma-section-card">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 lamma-quiet-power-btn">
                    <MemberAvatar
                      avatar={selectedProfileMember.avatar}
                      size="lg"
                      className="w-full h-full"
                      imageClassName="w-full h-full rounded-2xl"
                    />
                  </div>
                  <div className="flex-grow space-y-1">
                    <div className="text-sm font-black text-white flex items-center gap-2">
                      <span>{selectedProfileMember.nickname}</span>
                      <span
                        className={`text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider lamma-role-chip ${
                          selectedProfileMember.role === "platinum_vip"
                            ? "lamma-role-plat"
                            : selectedProfileMember.role === "owner"
                              ? "lamma-role-owner"
                              : selectedProfileMember.role === "admin"
                                ? "lamma-role-admin"
                                : selectedProfileMember.role === "mod"
                                  ? "lamma-role-mod"
                                  : selectedProfileMember.role === "vip"
                                    ? "lamma-role-vip"
                                    : ""
                        }`}
                      >
                        {selectedProfileMember.role === "platinum_vip"
                          ? "PLATINUM VIP"
                          : selectedProfileMember.role === "owner"
                            ? "OWNER"
                            : selectedProfileMember.role === "admin"
                              ? "ADMIN"
                              : selectedProfileMember.role === "mod"
                                ? "MODERATOR"
                                : selectedProfileMember.role === "vip"
                                  ? "VIP"
                                  : selectedProfileMember.role === "user"
                                    ? "MEMBER"
                                    : "GUEST"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold font-mono">
                      {selectedProfileMember.email ||
                        "حساب ضيف بدون بريد إلكتروني"}
                    </div>
                  </div>
                </div>

                {isOwnProfile && isRegisteredAccount && (
                  <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-black text-emerald-300">
                      <Image size={13} className="text-emerald-300" />
                      <span>صورة البطاقة الشخصية</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      اختر إيموجي أو ارفع صورة حقيقية من جهازك — تظهر في
                      الهيدر وقائمة الأعضاء.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PROFILE_AVATAR_EMOJIS.map((emoji) => {
                        const isActive =
                          selectedProfileMember.avatar === emoji;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            disabled={profileAvatarSaving}
                            onClick={() => handleSelectProfileEmoji?.(emoji)}
                            className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer border ${
                              isActive
                                ? "border-emerald-400/50 bg-emerald-500/15 scale-105"
                                : "border-white/10 bg-white/5 hover:bg-white/10"
                            }`}
                            title={`استخدام ${emoji}`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={profileAvatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleProfileAvatarUploadChange}
                      />
                      <button
                        type="button"
                        disabled={profileAvatarSaving}
                        onClick={() => profileAvatarInputRef?.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
                      >
                        {profileAvatarSaving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Upload size={14} />
                        )}
                        <span>
                          {profileAvatarSaving
                            ? "جاري الرفع..."
                            : "رفع صورة من الجهاز"}
                        </span>
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-500 font-bold">
                      JPG / PNG / WebP / GIF — حد أقصى 3MB
                    </p>
                    {profileAvatarStatus && (
                      <div className="text-[10px] text-emerald-300 font-bold">
                        {profileAvatarStatus}
                      </div>
                    )}
                  </div>
                )}

                {isOwnProfile && !isRegisteredAccount && (
                  <div className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-100 leading-relaxed font-bold">
                    لتخصيص صورة بطاقتك (إيموجي أو صورة حقيقية)، سجّل حساباً
                    بالإيميل أو Google من شاشة الدخول.
                  </div>
                )}

                {selectedProfileMember.nickname === myActiveSession.nickname &&
                  currentUser.authProvider === "supabase" && (
                    <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                      <div className="flex items-center gap-2 text-[11px] font-black text-cyan-300">
                        <LinkIcon size={13} className="text-cyan-300" />
                        <span>التوبيك المؤقت وقت الدخول</span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        اكتب عبارة قصيرة تظهر جنب اسمك لحظات وقت دخولك للشات أو
                        عند دخول غرفة.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tempEntryTopicInput}
                          maxLength={60}
                          onChange={(e) => {
                            setTempEntryTopicInput(e.target.value);
                            setTempEntryTopicStatusText(null);
                          }}
                          placeholder="مثال: مساء الخير على الجميع"
                          className="flex-1 rounded-xl p-2 text-xs text-white lamma-input-shell"
                        />
                        <button
                          type="button"
                          onClick={() => setTempEntryTopicEnabled((prev) => !prev)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                            tempEntryTopicEnabled
                              ? "text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {tempEntryTopicEnabled ? "مفعل" : "معطل"}
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] text-gray-500">
                          {tempEntryTopicInput.trim().length}/60
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveTempEntryTopic}
                          className="px-3 py-2 rounded-xl text-[10px] font-black text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all cursor-pointer"
                        >
                          حفظ التوبيك
                        </button>
                      </div>
                      {tempEntryTopicStatusText && (
                        <div className="text-[10px] text-emerald-300 font-bold">
                          {tempEntryTopicStatusText}
                        </div>
                      )}
                      {tempEntryTopicInput.trim() && (
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
                          <span>المعاينة:</span>
                          <span className="text-cyan-200">
                            {myActiveSession.nickname}
                          </span>
                          <span className="max-w-[160px] truncate rounded-full border border-cyan-400/25 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] text-cyan-200">
                            {tempEntryTopicInput.trim()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                {selectedProfileMember.nickname === myActiveSession.nickname &&
                  currentUser.authProvider === "supabase" &&
                  !isOwnerRole && (
                    <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                      <div className="text-[11px] font-black text-cyan-300">
                        طلب تغيير الاسم (يعتمد من المالك)
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        اكتب الاسم الجديد وسيصل طلبك للمالك للموافقة أو الرفض.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={nicknameRequestInput}
                          onChange={(e) =>
                            setNicknameRequestInput(e.target.value)
                          }
                          placeholder="اكتب الاسم الجديد المطلوب..."
                          className="flex-1 rounded-xl p-2 text-xs text-white lamma-input-shell"
                        />
                        <button
                          type="button"
                          disabled={nicknameRequestLoading}
                          onClick={handleSubmitNicknameChangeRequest}
                          className="px-3 py-2 rounded-xl text-[10px] font-black text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all cursor-pointer"
                        >
                          إرسال
                        </button>
                      </div>
                      {nicknameRequestStatusText && (
                        <div className="text-[10px] text-emerald-300 font-bold">
                          {nicknameRequestStatusText}
                        </div>
                      )}
                      {nicknameRequests
                        .filter((request) => request.user_id === currentUser.uid)
                        .slice(0, 1)
                        .map((request) => (
                          <div
                            key={request.id}
                            className="text-[10px] text-gray-400 font-bold"
                          >
                            آخر طلب: {request.current_nickname} →{" "}
                            {request.requested_nickname} (
                            {request.status === "pending"
                              ? "قيد المراجعة"
                              : request.status === "approved"
                                ? "تمت الموافقة"
                                : "مرفوض"}
                            )
                          </div>
                        ))}
                    </div>
                  )}

                {isOwnProfile && (
                  <div className="p-4 rounded-2xl lamma-section-card space-y-3">
                    <div className="text-[11px] font-black text-[#a3e635]">
                      السيرة الذاتية (Bio)
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      اكتب نبذة قصيرة عنك تظهر في ملفك الشخصي.
                    </p>
                    <textarea
                      value={myCustomBio || ""}
                      onChange={(e) => setMyCustomBio?.(e.target.value)}
                      maxLength={280}
                      rows={4}
                      placeholder="مثال: أحب الدردشة الهادئة والموسيقى..."
                      className="w-full rounded-xl p-2.5 text-xs text-white lamma-input-shell resize-none"
                    />
                    <div className="text-[10px] text-gray-500 text-left font-mono">
                      {(myCustomBio || "").trim().length}/280
                    </div>
                  </div>
                )}

                {/* Fingerprint Metadata Section — staff viewing other members only */}
                {showStaffTools && (
                <div className="space-y-1.5">
                  <div className="text-[9px] font-black text-[#a3e635] tracking-wide uppercase">
                    بصمة المعرف الرقمي ومواصفات الاتصال الفني (Device Signature)
                  </div>
                  <div className="p-3 rounded-2xl space-y-2 text-[10px] font-mono text-gray-300 lamma-section-card">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-gray-500 select-none">
                        ID المعرف:
                      </span>{" "}
                      <span>{selectedProfileMember.id}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-gray-500 select-none">
                        بصمة الجهاز الفنية:
                      </span>{" "}
                      <span className="text-[#a3e635]">
                        {selectedProfileMember.fingerprint}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-gray-500 select-none">
                        عنوان الـ IP الحالي:
                      </span>{" "}
                      <span className="text-red-400 font-bold">
                        {selectedProfileMember.ip}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-gray-500 select-none">
                        نوع المتصفح والاتصال:
                      </span>{" "}
                      <span
                        className="truncate max-w-[180px] text-gray-400"
                        title={selectedProfileMember.browserSignature}
                      >
                        {selectedProfileMember.browserSignature}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 select-none">
                        مفتاح الحفظ المحلي:
                      </span>{" "}
                      <span className="text-gray-400 text-[8.5px] truncate max-w-[180px]">
                        {selectedProfileMember.localStorageId}
                      </span>
                    </div>
                  </div>
                </div>
                )}

                {/* Administration controls strictly based on current user role */}
                {showStaffTools && (
                <div className="space-y-2 select-none">
                  <div className="text-[9px] font-black text-red-500 tracking-wide uppercase">
                    إجراءات الرقابة والإدارة السريعة (Administrative Control
                    Block)
                  </div>

                  {/* Permissions check block */}
                  {currentUser.role === "owner" ||
                  currentUser.role === "admin" ||
                  currentUser.role === "mod" ? (
                    <div className="space-y-3.5">
                      {/* Grid 1: Basic controls */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* 1. Warn */}
                        <button
                          onClick={() => {
                            const textMsg = `🔥 [تنبيه أمني رسمي] من LC-Fire لـ [${selectedProfileMember.nickname}]: يرجى التقيد بالآداب والأخلاق العامة للشات وعدم الخروج عن إطار الحديث المتزن وإلا سيتم الطرد التلقائي 🛡️.`;
                            setRoomMessages((prev) => ({
                              ...prev,
                              [activeRoomId]: [
                                ...(prev[activeRoomId] || []),
                                {
                                  id: `sys-warn-${Date.now()}`,
                                  author: "LC-Fire 🔥",
                                  text: textMsg,
                                  color: "#f59e0b",
                                  isOwn: false,
                                  time: new Date().toLocaleTimeString("ar-EG", {
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true,
                                  }),
                                  type: "system",
                                },
                              ],
                            }));
                            addSystemActivityLog(
                              "demote",
                              selectedProfileMember.nickname,
                              `تم إصدار إنذار وتحذير أمني علني للعضو في غرفة [${activeRoomId}]`,
                            );
                            alert(
                              `تم إرسال التحذير بنجاح كرسالة نظام في الغرفة.`,
                            );
                            setShowProfileModal(false);
                          }}
                          className="py-2 px-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-bold text-[10px] rounded-xl border border-yellow-500/20 text-center transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          ⚠️ إنذار وتحذير
                        </button>

                        {/* 2. Mute toggle */}
                        <button
                          onClick={() => {
                            const isCurrentlyMuted = bannedUsersList.some(
                              (b) =>
                                b.nickname.toLowerCase() ===
                                  selectedProfileMember.nickname.toLowerCase() &&
                                b.type === "mute",
                            );
                            if (isCurrentlyMuted) {
                              void removeBanEntries(
                                (ban) =>
                                  ban.nickname.toLowerCase() ===
                                    selectedProfileMember.nickname.toLowerCase() &&
                                  ban.type === "mute",
                                { sync: true },
                              );
                              addSystemActivityLog(
                                "promote",
                                selectedProfileMember.nickname,
                                `تم إلغاء كتم الصوت عن العضو ${selectedProfileMember.nickname} من قبل المشرف.`,
                              );
                              alert(`تم إلغاء الكتم بنجاح!`);
                            } else {
                              const muteBan: BanInfo = {
                                id: `mute-${Date.now()}`,
                                nickname: selectedProfileMember.nickname,
                                email: selectedProfileMember.email,
                                fingerprint: selectedProfileMember.fingerprint,
                                browserSignature:
                                  selectedProfileMember.browserSignature,
                                ip: selectedProfileMember.ip,
                                localStorageId:
                                  selectedProfileMember.localStorageId,
                                type: "mute",
                                banner: currentUser.nickname,
                                reason: "مخالفة معايير النقاش الهادئ",
                                time: new Date().toLocaleTimeString("ar-EG", {
                                  hour: "numeric",
                                  minute: "numeric",
                                }),
                              };
                              void addBanEntry(muteBan, { sync: true });
                              addSystemActivityLog(
                                "ban",
                                selectedProfileMember.nickname,
                                `تم كتم صوت العضو ${selectedProfileMember.nickname} وإيقاف رخصة حديثه.`,
                              );
                              alert(
                                `تم كتم العضو [${selectedProfileMember.nickname}] من التحدث بنجاح!`,
                              );
                            }
                            setShowProfileModal(false);
                          }}
                          className="py-2 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold text-[10px] rounded-xl border border-purple-500/20 text-center transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          {bannedUsersList.some(
                            (b) =>
                              b.nickname.toLowerCase() ===
                                selectedProfileMember.nickname.toLowerCase() &&
                              b.type === "mute",
                          )
                            ? "🔊 إلغاء كتم الصوت"
                            : "🔇 كتم حديث العضو"}
                        </button>

                        {/* 3. Kick */}
                        <button
                          onClick={() => {
                            const sysText = `🚪 [طرد أمني عاجل] من المشرف لـ [${selectedProfileMember.nickname}]: تم الطرد فوراً لتنظيم الغرفة! 👋`;
                            setRoomMessages((prev) => ({
                              ...prev,
                              [activeRoomId]: [
                                ...(prev[activeRoomId] || []),
                                {
                                  id: `sys-kick-${Date.now()}`,
                                  author: "بوابة الطرد 🚪",
                                  text: sysText,
                                  color: "#ef4444",
                                  isOwn: false,
                                  time: new Date().toLocaleTimeString("ar-EG", {
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true,
                                  }),
                                  type: "system",
                                },
                              ],
                            }));
                            setChatMembers((prev) =>
                              prev.filter(
                                (m) =>
                                  m.nickname.toLowerCase() !==
                                  selectedProfileMember.nickname.toLowerCase(),
                              ),
                            );
                            addSystemActivityLog(
                              "ban",
                              selectedProfileMember.nickname,
                              `طرد فوري (Kick) للعضو الفوضوي من غرفة الدردشة.`,
                            );
                            alert(
                              `تم إخضاع العضو للطرد الفوري خارج الغرفة بالتأكيد!`,
                            );
                            setShowProfileModal(false);
                          }}
                          className="py-2 px-3 text-orange-300 font-bold text-[10px] rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 lamma-soft-warn"
                        >
                          🚪 طرد فوري (Kick)
                        </button>

                        {/* 4. Delete messages */}
                        <button
                          onClick={() => {
                            setRoomMessages((prev) => {
                              const activeMsgs = prev[activeRoomId] || [];
                              const filtered = activeMsgs.filter(
                                (m) =>
                                  m.author
                                    .replace(
                                      /\s*\({0,1}(VIP|vip|أدمن|Admin|المالك|Owner)\){0,1}/g,
                                      "",
                                    )
                                    .trim()
                                    .toLowerCase() !==
                                  selectedProfileMember.nickname.toLowerCase(),
                              );
                              return {
                                ...prev,
                                [activeRoomId]: filtered,
                              };
                            });
                            addSystemActivityLog(
                              "demote",
                              selectedProfileMember.nickname,
                              `تم مسح وسحب جميع رسائل العضو في غرفة [${activeRoomId}]`,
                            );
                            alert(
                              `تم تصفية ومسح جميع رسائل العضو [${selectedProfileMember.nickname}] من شات الغرفة بنجاح!`,
                            );
                            setShowProfileModal(false);
                          }}
                          className="py-2 px-3 text-red-400 font-bold text-[10px] rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 lamma-danger-btn"
                        >
                          🗑️ حذف رسائله
                        </button>
                      </div>

                      {/* Extended Admin / Owner features */}
                      {(currentUser.role === "owner" ||
                        currentUser.role === "admin") && (
                        <div className="space-y-3 pt-2 border-t border-white/5 font-sans">
                          {/* Room specific bans and Rank promotions */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Room ban button */}
                            <button
                              onClick={() => {
                                const rb: BanInfo = {
                                  id: `roomban-${Date.now()}`,
                                  nickname: selectedProfileMember.nickname,
                                  email: selectedProfileMember.email,
                                  fingerprint:
                                    selectedProfileMember.fingerprint,
                                  browserSignature:
                                    selectedProfileMember.browserSignature,
                                  ip: selectedProfileMember.ip,
                                  localStorageId:
                                    selectedProfileMember.localStorageId,
                                  type: "room",
                                  roomId: activeRoomId,
                                  banner: currentUser.nickname,
                                  reason:
                                    "مخالفة آداب النقاش في الغرفة المحددة",
                                  time: new Date().toLocaleTimeString("ar-EG", {
                                    hour: "numeric",
                                    minute: "numeric",
                                  }),
                                };
                                void addBanEntry(rb, { sync: true });
                                addSystemActivityLog(
                                  "ban",
                                  selectedProfileMember.nickname,
                                  `تم فرض حظر دخول الغرفة لـ ${selectedProfileMember.nickname} من غرفة [${activeRoomId}]`,
                                );
                                alert(
                                  `تم حظر العضو بنجاح من دخول الغرفة الحالية [${activeRoomId}].`,
                                );
                                setShowProfileModal(false);
                              }}
                              className="py-2 px-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 font-bold text-[9.5px] rounded-xl border border-pink-500/20 text-center transition-all cursor-pointer"
                            >
                              🚫 حظر غرف (Room Ban)
                            </button>

                            {/* Dropdown for role changes */}
                            <div className="flex flex-col gap-1 text-right">
                              <span className="text-[8.5px] text-gray-500 font-extrabold pr-1">
                                ترقية ومنح الصلاحيات:
                              </span>
                              <select
                                id="profile-role-select"
                                name="profileRoleSelect"
                                value={selectedProfileMember.role}
                                onChange={(e) => {
                                  const targetRole = e.target.value as any;
                                  const prevRole = selectedProfileMember.role;
                                  setChatMembers((prev) =>
                                    prev.map((m) => {
                                      if (
                                        m.nickname.toLowerCase() ===
                                        selectedProfileMember.nickname.toLowerCase()
                                      ) {
                                        return { ...m, role: targetRole };
                                      }
                                      return m;
                                    }),
                                  );
                                  addSystemActivityLog(
                                    "promote",
                                    selectedProfileMember.nickname,
                                    `تغيير وتعيين رتبة لعضو الشات إلى [${targetRole}]`,
                                  );

                                  // إعلان في غرفة الإدارة عند الترقية
                                  const isUpgrade =
                                    ["admin", "mod", "owner"].includes(targetRole) &&
                                    !["admin", "mod", "owner"].includes(prevRole);
                                  const isDowngrade =
                                    ["admin", "mod", "owner"].includes(prevRole) &&
                                    !["admin", "mod", "owner"].includes(targetRole);
                                  const roleLabel: Record<string, string> = {
                                    owner: "👑 مالك",
                                    admin: "🛡️ أدمن",
                                    mod: "🔰 مشرف",
                                    vip: "💎 VIP",
                                    user: "👤 عضو",
                                    guest: "👤 زائر",
                                  };
                                  if (isUpgrade) {
                                    addLammaBotMessage(
                                      "admin",
                                      `🎉 مرحباً بالعضو [${selectedProfileMember.nickname}] في فريق الإدارة! تمت ترقيته لرتبة ${roleLabel[targetRole] || targetRole} بواسطة ${currentUser.nickname}. أهلاً وسهلاً 🛡️`,
                                    );
                                  } else if (isDowngrade) {
                                    addLammaBotMessage(
                                      "admin",
                                      `📋 تم تغيير رتبة [${selectedProfileMember.nickname}] من ${roleLabel[prevRole] || prevRole} إلى ${roleLabel[targetRole] || targetRole} بواسطة ${currentUser.nickname}.`,
                                    );
                                  }

                                  alert(
                                    `تم تغيير وتحديث صلاحيات العضو إلى [${targetRole}] بنجاح!`,
                                  );
                                  setSelectedProfileMember((prev) =>
                                    prev ? { ...prev, role: targetRole } : null,
                                  );
                                }}
                                className="bg-black/60 border border-green-500/25 p-1 rounded-xl text-[9px] text-[#a3e635] font-black focus:ring-0 focus:outline-none focus:border-green-500"
                              >
                                <option value="guest">👤 GUEST</option>
                                <option value="user">👨 MEMBER</option>
                                <option value="vip">💎 VIP MEMBER</option>
                                <option value="mod">🛡️ CHAT MODERATOR</option>
                                <option value="admin">
                                  🛡️ SYSTEM ADMIN
                                </option>
                                <option value="owner">👑 SYSTEM OWNER</option>
                              </select>
                            </div>
                          </div>

                          {/* Owner absolute Superbans */}
                          {currentUser.role === "owner" && (
                            <div className="pt-2.5 border-t border-white/5 space-y-3">
                              {/* Custom Permissions Controls exclusively handled by owner */}
                              <div className="p-3 bg-black/60 border border-green-500/25 rounded-2xl space-y-2.5">
                                <div className="text-[10px] font-black text-[#a3e635] flex items-center gap-1.5 border-b border-green-500/10 pb-1.5">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Shield
                                      size={13}
                                      className="text-lime-300"
                                    />
                                    صلاحيات المالك الحصرية للعضو:
                                  </span>
                                </div>
                                <div className="space-y-2 text-right">
                                  {/* 1. Voice messages (WhatsApp-style) */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Mic
                                        size={14}
                                        className="text-emerald-300"
                                      />
                                      <span>رسائل صوتية (مثل واتساب):</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.recordingAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              callsAllowed: false,
                                              videoCallsAllowed: false,
                                              musicRadioAllowed: false,
                                              roomCreationAllowed: false,
                                            }),
                                            recordingAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} رسائل صوتية لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.recordingAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.recordingAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>

                                  {/* 2. Audio calls */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Phone
                                        size={14}
                                        className="text-sky-300"
                                      />
                                      <span>مكالمات صوتية:</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.callsAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              recordingAllowed: false,
                                              videoCallsAllowed: false,
                                              musicRadioAllowed: false,
                                              roomCreationAllowed: false,
                                            }),
                                            callsAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} مكالمات صوتية لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.callsAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.callsAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>

                                  {/* 3. Video / camera calls */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Video
                                        size={14}
                                        className="text-violet-300"
                                      />
                                      <span>مكالمات فيdeo / الكاميرا:</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.videoCallsAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              recordingAllowed: false,
                                              callsAllowed: false,
                                              musicRadioAllowed: false,
                                              roomCreationAllowed: false,
                                            }),
                                            videoCallsAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} مكالمات فيdeo لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.videoCallsAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.videoCallsAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>

                                  {/* 4. Music/Radio access */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Radio
                                        size={14}
                                        className="text-cyan-300"
                                      />
                                      <span>
                                        تشغيل الراديو ومكتبة الموسيقى:
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.musicRadioAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              recordingAllowed: false,
                                              callsAllowed: false,
                                              roomCreationAllowed: false,
                                            }),
                                            musicRadioAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} صلاحية الموسيقى والراديو لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.musicRadioAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.musicRadioAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>

                                  {/* 4. Image upload */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Image
                                        size={14}
                                        className="text-blue-300"
                                      />
                                      <span>رفع الصور ومشاركة روابطها:</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.imagesAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              recordingAllowed: false,
                                              callsAllowed: false,
                                              videoCallsAllowed: false,
                                              musicRadioAllowed: false,
                                              roomCreationAllowed: false,
                                              imagesAllowed: false,
                                              youtubeAllowed: false,
                                            }),
                                            imagesAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} صلاحية رفع الصور لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.imagesAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.imagesAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>

                                  {/* 5. YouTube / video */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Tv size={14} className="text-red-300" />
                                      <span>مشاركة يوتيوب / فيdeo:</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.youtubeAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              recordingAllowed: false,
                                              callsAllowed: false,
                                              videoCallsAllowed: false,
                                              musicRadioAllowed: false,
                                              roomCreationAllowed: false,
                                              imagesAllowed: false,
                                              youtubeAllowed: false,
                                            }),
                                            youtubeAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} صلاحية يوتيوب/فيديو لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.youtubeAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.youtubeAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>

                                  {/* 6. Room Creation */}
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                      <Compass
                                        size={14}
                                        className="text-yellow-300"
                                      />
                                      <span>إتاحة إنشاء غرف خاصة:</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentVal =
                                          memberCustomPermissions[
                                            selectedProfileMember.nickname
                                          ]?.roomCreationAllowed || false;
                                        setMemberCustomPermissions((prev) => ({
                                          ...prev,
                                          [selectedProfileMember.nickname]: {
                                            ...(prev[
                                              selectedProfileMember.nickname
                                            ] || {
                                              recordingAllowed: false,
                                              callsAllowed: false,
                                              musicRadioAllowed: false,
                                              roomCreationAllowed: false,
                                            }),
                                            roomCreationAllowed: !currentVal,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          `${!currentVal ? "تنشيط" : "إلغاء"} صلاحية إنشاء الغرف لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.roomCreationAllowed
                                          ? "bg-green-500/15 border-green-500/30 text-green-400"
                                          : "bg-red-500/15 border-red-500/30 text-red-400"
                                      }`}
                                    >
                                      {memberCustomPermissions[
                                        selectedProfileMember.nickname
                                      ]?.roomCreationAllowed
                                        ? "مفعلة بنجاح ✅"
                                        : "معطلة ❌"}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="text-[8.5px] font-black text-red-500 select-none pr-1">
                                💥 حظر المالك الأعلى المطلق:
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {/* Mega Ban */}
                                <button
                                  onClick={() => {
                                    const mb: BanInfo = {
                                      id: `megaban-${Date.now()}`,
                                      nickname: selectedProfileMember.nickname,
                                      email: selectedProfileMember.email,
                                      fingerprint:
                                        selectedProfileMember.fingerprint,
                                      browserSignature:
                                        selectedProfileMember.browserSignature,
                                      ip: selectedProfileMember.ip,
                                      localStorageId:
                                        selectedProfileMember.localStorageId,
                                      type: "megaban",
                                      banner: currentUser.nickname,
                                      reason:
                                        "تطبيق الحظر الكلي والكامل والأبدي (Mega Ban Lockdown)",
                                      time: new Date().toLocaleTimeString(
                                        "ar-EG",
                                        { hour: "numeric", minute: "numeric" },
                                      ),
                                    };
                                    void addBanEntry(mb, { sync: true });
                                    addSystemActivityLog(
                                      "ban",
                                      selectedProfileMember.nickname,
                                      `حظر كامل شامل ومطلق (Mega Ban) طمس وتجميد بصمته رقم: [${selectedProfileMember.fingerprint}]`,
                                    );

                                    const mbText = `🚨 [Mega Ban Lockdown]: أصدر المالك قراراً بالبتر الفني التام والمؤبد للعضو [${selectedProfileMember.nickname}] وتجميد بصمة جهازه والـ IP والحظر التلقائي لكافة الكوكيز والبيانات المحلية لديه! 🛑`;
                                    setRoomMessages((prev) => ({
                                      ...prev,
                                      [activeRoomId]: [
                                        ...(prev[activeRoomId] || []),
                                        {
                                          id: `sys-megaban-${Date.now()}`,
                                          author: "المجلس الأعلى 👑",
                                          text: mbText,
                                          color: "#dc2626",
                                          isOwn: false,
                                          time: new Date().toLocaleTimeString(
                                            "ar-EG",
                                            {
                                              hour: "numeric",
                                              minute: "numeric",
                                              hour12: true,
                                            },
                                          ),
                                          type: "system",
                                        },
                                      ],
                                    }));
                                    setChatMembers((prev) =>
                                      prev.filter(
                                        (m) =>
                                          m.nickname.toLowerCase() !==
                                          selectedProfileMember.nickname.toLowerCase(),
                                      ),
                                    );
                                    alert(
                                      `تم إخضاع العضو المشاغب فوراً للحظر المطلق Mega Ban وتجميد كافة بيانات اتصاله!`,
                                    );
                                    setShowProfileModal(false);
                                  }}
                                  className="py-2.5 bg-red-600/25 hover:bg-red-600/35 text-red-400 font-extrabold text-[9.5px] rounded-xl border border-red-500/30 text-center transition-all cursor-pointer"
                                >
                                  🚨 حظر شامل (Mega Ban)
                                </button>

                                {/* Shadow Ban */}
                                <button
                                  onClick={() => {
                                    const isShadow = bannedUsersList.some(
                                      (b) =>
                                        b.nickname.toLowerCase() ===
                                          selectedProfileMember.nickname.toLowerCase() &&
                                        b.type === "shadow",
                                    );
                                    if (isShadow) {
                                      void removeBanEntries(
                                        (ban) =>
                                          ban.nickname.toLowerCase() ===
                                            selectedProfileMember.nickname.toLowerCase() &&
                                          ban.type === "shadow",
                                        { sync: true },
                                      );
                                      addSystemActivityLog(
                                        "promote",
                                        selectedProfileMember.nickname,
                                        `تم إلغاء الحظر الخفي (Shadow Ban) عن العضو ${selectedProfileMember.nickname}.`,
                                      );
                                      alert(`تم إلغاء الحظر الخفي.`);
                                    } else {
                                      const sb: BanInfo = {
                                        id: `shadow-${Date.now()}`,
                                        nickname:
                                          selectedProfileMember.nickname,
                                        email: selectedProfileMember.email,
                                        fingerprint:
                                          selectedProfileMember.fingerprint,
                                        browserSignature:
                                          selectedProfileMember.browserSignature,
                                        ip: selectedProfileMember.ip,
                                        localStorageId:
                                          selectedProfileMember.localStorageId,
                                        type: "shadow",
                                        banner: currentUser.nickname,
                                        reason: "تطبيق حظر خفي شبكي من المالك",
                                        time: new Date().toLocaleTimeString(
                                          "ar-EG",
                                          {
                                            hour: "numeric",
                                            minute: "numeric",
                                          },
                                        ),
                                      };
                                      void addBanEntry(sb, { sync: true });
                                      addSystemActivityLog(
                                        "ban",
                                        selectedProfileMember.nickname,
                                        `تطبيق الحظر الخفي الشبح (Shadow Ban) للعضو.`,
                                      );
                                      alert(
                                        `تم تفعيل الحظر الشبح (Shadow Ban) بنجاح.`,
                                      );
                                    }
                                    setShowProfileModal(false);
                                  }}
                                  className="py-2.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 font-extrabold text-[9.5px] rounded-xl border border-gray-500/20 text-center transition-all cursor-pointer"
                                >
                                  {bannedUsersList.some(
                                    (b) =>
                                      b.nickname.toLowerCase() ===
                                        selectedProfileMember.nickname.toLowerCase() &&
                                      b.type === "shadow",
                                  )
                                    ? "👻 إلغاء حظر شبحي"
                                    : "👻 حظر خفي (Shadow)"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-2xl text-[9.5px] text-red-400 leading-relaxed font-sans font-semibold">
                      🔒 هذه المنطقة الرقابية محمية ومقيدة للأدمنية والمشرفين
                      وملاك الشات وتأسيسيه فقط. رتبتك غير مصرحة لتطبيق العقوبات
                      أو التعديلات.
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
    </>
  );
};
