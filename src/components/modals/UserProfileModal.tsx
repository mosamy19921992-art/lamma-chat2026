import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LinkIcon, Shield, Mic, Phone, Video, Radio, Compass, Lock, Ghost, Trash2, Image, Tv, Upload, Loader2 } from 'lucide-react';
import { type BanInfo, type MemberRole } from "../../lib/chatTypes.ts";
import { MemberAvatar } from "../MemberAvatar";
import { PROFILE_AVATAR_EMOJIS } from "../../lib/avatarDisplay";
import { OwnerIdCard } from "../OwnerIdCard";
import { isOwnerChatRole } from "../../lib/ownerIdentity";
import {
  isGlobalPromotionRole,
  rolePromotionScopeLabel,
} from "../../lib/memberRoleResolution";
import { postRoomSystemMessage } from "../../services/chat/moderationService";
import {
  canGrantRole,
  canPromoteMembers,
  canUseOwnerExclusiveTools,
  canUseStaffTools,
  getGrantableRoles,
  ROLE_CHIP_CLASS,
  ROLE_LABELS,
  type RoleGrantsPolicy,
} from "../../lib/rolePolicy";

const PROMOTE_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "يجب تسجيل الدخول أولاً.",
  not_authorized: "ليس لديك صلاحية الترقية.",
  only_owner_can_grant_owner: "المالك فقط يمكنه منح رتبة المالك.",
  only_owner_can_grant_admin: "المالك فقط يمكنه منح رتبة الأدمن.",
  cannot_demote_owner: "لا يمكن تخفيض رتبة المالك.",
  only_owner_can_demote_admin: "المالك فقط يمكنه تخفيض الأدمن.",
  invalid_target_id: "لا يمكن حفظ الرتبة — العضو يحتاج حساباً مسجلاً متصلاً.",
  promote_failed: "فشل حفظ الرتبة على السيرفر.",
  role_disabled: "هذه الرتبة موقوفة من المالك في لوحة نظام الرتب.",
  cannot_grant_role: "رتبتك لا تسمح بمنح هذه الرتبة للعضو.",
};

export const UserProfileModal = ({ showProfileModal, selectedProfileMember, setShowProfileModal, setSelectedProfileMember, myActiveSession, currentUser, isOwnerRole, isRegisteredAccount, tempEntryTopicInput, setTempEntryTopicInput, setTempEntryTopicStatusText, tempEntryTopicEnabled, setTempEntryTopicEnabled, handleSaveTempEntryTopic, tempEntryTopicStatusText, nicknameRequestInput, setNicknameRequestInput, nicknameRequestLoading, handleSubmitNicknameChangeRequest, nicknameRequestStatusText, nicknameRequests, setRoomMessages, activeRoomId, addSystemActivityLog, addLammaBotMessage, bannedUsersList, removeBanEntries, addBanEntry, chatMembers, setChatMembers, memberCustomPermissions, setMemberCustomPermissions, myCustomBio, setMyCustomBio, handleSelectProfileEmoji, handleProfileAvatarUploadChange, profileAvatarInputRef, profileAvatarSaving, profileAvatarStatus, onSendPrivateMessage, onPromoteMemberRole, roomLabel, myEffectiveRole, roleGrantsPolicy, roomTempGrantsByUserId }: any) => {
  const [rolePromoteLoading, setRolePromoteLoading] = useState(false);
  const [grantTemporary, setGrantTemporary] = useState(false);
  const isOwnProfile =
    selectedProfileMember?.nickname === myActiveSession.nickname;
  const granterRole = (myEffectiveRole || currentUser.role) as MemberRole;
  const showStaffTools = canUseStaffTools(granterRole) && !isOwnProfile;
  const showPromoteTools = canPromoteMembers(granterRole) && !isOwnProfile && !!onPromoteMemberRole;
  const isOwnerProfile = isOwnerChatRole(selectedProfileMember?.role);
  const promotionRoomId = roomLabel || activeRoomId;
  const policy: RoleGrantsPolicy = roleGrantsPolicy;
  const grantableRoles = getGrantableRoles(granterRole, policy);
  const isTempGrant =
    selectedProfileMember?.id &&
    roomTempGrantsByUserId?.[selectedProfileMember.id];

  const handleRolePromotion = async (targetRole: MemberRole) => {
    if (!selectedProfileMember || !onPromoteMemberRole) return;
    const prevRole = selectedProfileMember.role as MemberRole;
    if (targetRole === prevRole) return;

    if (!canGrantRole(granterRole, targetRole, policy)) {
      alert(PROMOTE_ERROR_MESSAGES.cannot_grant_role);
      return;
    }

    setRolePromoteLoading(true);
    try {
      await onPromoteMemberRole({
        targetUserId: selectedProfileMember.id,
        targetNickname: selectedProfileMember.nickname,
        newRole: targetRole,
        previousRole: prevRole,
        temporary: grantTemporary && targetRole !== "user" && targetRole !== "guest",
      });

      const scopeLabel = rolePromotionScopeLabel(
        targetRole,
        promotionRoomId,
        grantTemporary,
      );
      addSystemActivityLog(
        "promote",
        selectedProfileMember.nickname,
        `تغيير رتبة إلى [${targetRole}] — ${scopeLabel}`,
      );

      const roleLabel: Record<string, string> = {
        owner: "👑 مالك",
        admin: "🛡️ أدمن",
        mod: "🔰 مشرف",
        host: "🎤 هوست",
        platinum_vip: "💎 VIP بلاتيني",
        vip: "💎 VIP",
        user: "👤 عضو",
        guest: "👤 زائر",
      };
      const isStaffUpgrade =
        ["admin", "mod", "host", "owner"].includes(targetRole) &&
        !["admin", "mod", "host", "owner"].includes(prevRole);

      if (isStaffUpgrade || grantTemporary) {
        addLammaBotMessage(
          "admin",
          grantTemporary
            ? `⏳ منح مؤقت لـ [${selectedProfileMember.nickname}] → ${roleLabel[targetRole] || targetRole} بواسطة ${currentUser.nickname}. (${scopeLabel})`
            : `🎉 تمت ترقية [${selectedProfileMember.nickname}] إلى ${roleLabel[targetRole] || targetRole} بواسطة ${currentUser.nickname}. (${scopeLabel})`,
        );
      } else if (targetRole === "user" || targetRole === "guest") {
        addLammaBotMessage(
          "admin",
          `📋 تم تغيير رتبة [${selectedProfileMember.nickname}] إلى ${roleLabel[targetRole] || targetRole} بواسطة ${currentUser.nickname}.`,
        );
      }

      alert(
        `تم حفظ الرتبة [${roleLabel[targetRole] || targetRole}] — ${scopeLabel}`,
      );
      setSelectedProfileMember((prev: typeof selectedProfileMember) =>
        prev ? { ...prev, role: targetRole } : null,
      );
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "promote_failed";
      alert(
        PROMOTE_ERROR_MESSAGES[code] ||
          "تعذر حفظ الرتبة. تأكد من تشغيل migration على Supabase.",
      );
    } finally {
      setRolePromoteLoading(false);
    }
  };

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
                      ? isOwnerProfile
                        ? "بطاقة BOSS • المالك"
                        : "بطاقتي الشخصية والإعدادات"
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
                {isOwnerProfile ? (
                  <div className="space-y-3">
                    <OwnerIdCard
                      nickname={selectedProfileMember.nickname}
                      tagline={
                        isOwnProfile
                          ? "غرفة القيادة • بطاقتي الرسمية"
                          : "مالك المنصة • LAMMA CHAT"
                      }
                    />
                    {isOwnProfile && (
                      <p className="text-[10px] text-amber-200/80 font-bold text-center leading-relaxed px-2">
                        هذه بطاقتك التعريفية الرسمية كمالك — تظهر لكل الأعضاء
                        عند فتح ملفك.
                      </p>
                    )}
                    {!isOwnProfile && onSendPrivateMessage && (
                      <button
                        type="button"
                        onClick={() => onSendPrivateMessage(selectedProfileMember)}
                        className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-center text-[10px] font-black transition-all cursor-pointer lamma-accent-btn"
                      >
                        💬 محادثة خاصة مع المالك
                      </button>
                    )}
                  </div>
                ) : (
                <>
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
                          ROLE_CHIP_CLASS[selectedProfileMember.role as MemberRole] ||
                          "lamma-role-chip"
                        } ${isTempGrant ? "ring-1 ring-amber-400/60" : ""}`}
                      >
                        {isTempGrant ? "⏳ " : ""}
                        {(selectedProfileMember.role as MemberRole) === "host"
                          ? "HOST"
                          : (selectedProfileMember.role as MemberRole) === "platinum_vip"
                            ? "PLATINUM VIP"
                            : (selectedProfileMember.role as MemberRole) === "owner"
                              ? "BOSS"
                              : (selectedProfileMember.role as string).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold font-mono">
                      {selectedProfileMember.email ||
                        "حساب ضيف بدون بريد إلكتروني"}
                    </div>
                  </div>
                </div>
                </>
                )}

                {isOwnProfile && isRegisteredAccount && !isOwnerProfile && (
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
                        IP:
                      </span>{" "}
                      <span className="text-gray-500 text-[9px]">
                        غير متاح
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

                  {/* Staff moderation block (host / mod / admin / owner) */}
                  <div className="space-y-3.5">
                      {/* Grid 1: Basic controls */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* 1. Warn */}
                        <button
                          onClick={() => {
                            const textMsg = `🔥 [تنبيه أمني رسمي] من LC-Fire لـ [${selectedProfileMember.nickname}]: يرجى التقيد بالآداب والأخلاق العامة للشات وعدم الخروج عن إطار الحديث المتزن وإلا سيتم الطرد التلقائي 🛡️.`;
                            void postRoomSystemMessage({
                              roomId: activeRoomId,
                              text: textMsg,
                              color: "#f59e0b",
                            }).then((result) => {
                              if (!result.ok) {
                                alert(
                                  `تعذر إرسال التحذير على السيرفر: ${result.error || "unknown"}`,
                                );
                                return;
                              }
                              addSystemActivityLog(
                                "demote",
                                selectedProfileMember.nickname,
                                `تم إصدار إنذار وتحذير أمني علني للعضو في غرفة [${activeRoomId}]`,
                              );
                              alert(
                                `تم إرسال التحذير بنجاح كرسالة نظام في الغرفة.`,
                              );
                              setShowProfileModal(false);
                            });
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
                                  selectedProfileMember.id ||
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
                            const kickBan: BanInfo = {
                              id: `kick-${Date.now()}`,
                              nickname: selectedProfileMember.nickname,
                              email: selectedProfileMember.email,
                              fingerprint: selectedProfileMember.fingerprint,
                              browserSignature:
                                selectedProfileMember.browserSignature,
                              ip: selectedProfileMember.ip,
                              localStorageId:
                                selectedProfileMember.id ||
                                selectedProfileMember.localStorageId,
                              type: "kick",
                              roomId: activeRoomId,
                              banner: currentUser.nickname,
                              reason: "طرد مؤقت من الغرفة (30 دقيقة)",
                              time: new Date().toLocaleTimeString("ar-EG", {
                                hour: "numeric",
                                minute: "numeric",
                              }),
                            };
                            void addBanEntry(kickBan, { sync: true });
                            const sysText = `🚪 [طرد أمني عاجل] من المشرف لـ [${selectedProfileMember.nickname}]: تم الطرد فوراً لتنظيم الغرفة! 👋`;
                            void postRoomSystemMessage({
                              roomId: activeRoomId,
                              text: sysText,
                              color: "#ef4444",
                              author: "بوابة الطرد 🚪",
                            });
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

                      {/* Rank promotions — Kalamngy-style hierarchy */}
                      {showPromoteTools && (
                        <div className="space-y-3 pt-2 border-t border-white/5 font-sans">
                          <div className="grid grid-cols-2 gap-2">
                            {(granterRole === "owner" ||
                              granterRole === "admin" ||
                              granterRole === "mod") && (
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
                                    selectedProfileMember.id ||
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
                            )}

                            <div className={`flex flex-col gap-1 text-right ${granterRole === "host" ? "col-span-2" : ""}`}>
                              <span className="text-[8.5px] text-gray-500 font-extrabold pr-1">
                                ترقية ومنح ({ROLE_LABELS[granterRole]}):
                              </span>
                              <span className="text-[7.5px] text-emerald-400/80 font-bold pr-1">
                                host/mod/vip = غرفة «{promotionRoomId}» · admin/owner = كل الغرف
                              </span>
                              <label className="flex items-center gap-1.5 text-[8px] text-amber-200/90 cursor-pointer pr-1">
                                <input
                                  type="checkbox"
                                  checked={grantTemporary}
                                  onChange={(e) => setGrantTemporary(e.target.checked)}
                                  className="accent-amber-400"
                                />
                                ⏳ تاج/رتبة مؤقتة (تنتهي عند خروج العضو)
                              </label>
                              <select
                                id="profile-role-select"
                                name="profileRoleSelect"
                                value={selectedProfileMember.role}
                                disabled={rolePromoteLoading}
                                onChange={(e) => {
                                  void handleRolePromotion(
                                    e.target.value as MemberRole,
                                  );
                                }}
                                className="bg-black/60 border border-green-500/25 p-1 rounded-xl text-[9px] text-[#a3e635] font-black focus:ring-0 focus:outline-none focus:border-green-500 disabled:opacity-50"
                              >
                                <option value="user">👨 MEMBER (إزالة)</option>
                                {grantableRoles.map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_LABELS[r]}
                                    {isGlobalPromotionRole(r) ? " (كل الغرف)" : ""}
                                  </option>
                                ))}
                              </select>
                              {rolePromoteLoading && (
                                <span className="text-[8px] text-amber-300 font-bold pr-1 inline-flex items-center gap-1">
                                  <Loader2 size={10} className="animate-spin" />
                                  جاري الحفظ على السيرفر...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                          {/* Owner absolute Superbans */}
                          {canUseOwnerExclusiveTools(granterRole) && (
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
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-300 gap-2">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <Compass
                                        size={14}
                                        className="text-yellow-300"
                                      />
                                      <span>إنشاء غرف خاصة:</span>
                                    </div>
                                    <select
                                      value={
                                        memberCustomPermissions[
                                          selectedProfileMember.nickname
                                        ]?.roomCreationQuota ?? 0
                                      }
                                      onChange={(e) => {
                                        const quota = Number(e.target.value);
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
                                              roomCreationQuota: 0,
                                            }),
                                            roomCreationAllowed: quota > 0,
                                            roomCreationQuota: quota,
                                          },
                                        }));
                                        addSystemActivityLog(
                                          "promote",
                                          selectedProfileMember.nickname,
                                          quota > 0
                                            ? `منح ${quota} غرفة/غرف لـ ${selectedProfileMember.nickname}`
                                            : `إلغاء صلاحية إنشاء الغرف لـ ${selectedProfileMember.nickname}`,
                                        );
                                      }}
                                      className="px-2 py-1 rounded-lg text-[9px] font-extrabold bg-black/40 border border-white/10 text-white"
                                    >
                                      <option value={0}>معطّل</option>
                                      <option value={1}>غرفة واحدة 🔒</option>
                                      <option value={2}>غرفتين 🔒</option>
                                      <option value={3}>3 غرف 🔒</option>
                                      <option value={5}>5 غرف 🔒</option>
                                    </select>
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
                                        selectedProfileMember.id ||
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
                </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
    </>
  );
};
