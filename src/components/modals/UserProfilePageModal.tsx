import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import AMLogo from "../AMLogo";
import { SocialFeedPanel } from "../social/SocialFeedPanel";
import type { ChatMember, UserSession } from "../../lib/chatTypes";
import type { MemberCosmeticGrant } from "../../lib/chatTypes";
import type { SocialPost, UserProfileRecord } from "../../lib/socialTypes";
import type { StoreCosmeticsSnapshot } from "../../lib/chatHelpers";
import {
  fetchUserProfileByNickname,
  updateUserBio,
} from "../../services/social/userProfileService";
import { fetchProfileTimeline } from "../../hooks/useSocialFeed";

interface UserProfilePageModalProps {
  isOpen: boolean;
  member: ChatMember | null;
  currentUser: UserSession;
  storeSnapshot: StoreCosmeticsSnapshot;
  cosmeticGrants: Record<string, MemberCosmeticGrant>;
  chatMembers: ChatMember[];
  onClose: () => void;
  onSendPM: (member: ChatMember) => void;
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string) => Promise<unknown>;
}

export function UserProfilePageModal({
  isOpen,
  member,
  currentUser,
  storeSnapshot,
  cosmeticGrants,
  chatMembers,
  onClose,
  onSendPM,
  onLike,
  onComment,
}: UserProfilePageModalProps) {
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [timeline, setTimeline] = useState<SocialPost[]>([]);
  const [bioDraft, setBioDraft] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  const isSelf =
    member?.nickname.toLowerCase() === currentUser.nickname.toLowerCase();

  useEffect(() => {
    if (!isOpen || !member) return;

    let cancelled = false;

    const load = async () => {
      const fetchedProfile = await fetchUserProfileByNickname(member.nickname);
      if (cancelled) return;

      setProfile(fetchedProfile);
      setBioDraft(fetchedProfile?.bio || "");

      if (currentUser.uid && fetchedProfile?.userUid) {
        const posts = await fetchProfileTimeline(
          currentUser.uid,
          fetchedProfile.userUid,
        );
        if (!cancelled) setTimeline(posts);
      } else {
        setTimeline([]);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [currentUser.uid, isOpen, member]);

  const handleSaveBio = async () => {
    if (!isSelf || !currentUser.uid) return;
    setSavingBio(true);
    try {
      await updateUserBio(currentUser.uid, bioDraft);
      setProfile((prev) =>
        prev
          ? { ...prev, bio: bioDraft.trim().slice(0, 500) }
          : {
              userUid: currentUser.uid,
              nickname: currentUser.nickname,
              bio: bioDraft.trim().slice(0, 500),
            },
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? `❌ تعذر حفظ النبذة: ${error.message}`
          : "❌ تعذر حفظ النبذة.",
      );
    } finally {
      setSavingBio(false);
    }
  };

  if (!member) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[92vh] overflow-hidden rounded-t-[28px] sm:rounded-[28px] border border-white/10 bg-[#0b1410]/95 shadow-2xl flex flex-col"
            dir="rtl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-emerald-200">
                <Sparkles size={16} />
                <span className="text-sm font-black">ملف العضو</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl text-gray-400 flex items-center justify-center lamma-soft-action"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-5 border-b border-white/8 bg-gradient-to-br from-emerald-500/10 to-transparent">
                <div className="flex items-start gap-4">
                  <AMLogo size={56} variant="circular" glow={isSelf} />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-white truncate">
                      {member.nickname}
                    </h2>
                    <p className="text-[10px] text-gray-400 mt-1">
                      عضو مسجّل • جدار شخصي
                    </p>

                    {isSelf ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={bioDraft}
                          onChange={(e) => setBioDraft(e.target.value.slice(0, 500))}
                          rows={3}
                          placeholder="اكتب نبذة عنك تظهر في ملفك..."
                          className="w-full rounded-2xl bg-black/30 border border-white/10 px-3 py-2 text-[11px] text-white outline-none resize-none"
                        />
                        <button
                          type="button"
                          disabled={savingBio}
                          onClick={() => void handleSaveBio()}
                          className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-emerald-500/20 text-emerald-100 border border-emerald-400/20"
                        >
                          {savingBio ? "جاري الحفظ..." : "حفظ النبذة"}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-[11px] text-gray-200 leading-relaxed">
                        {profile?.bio?.trim() ||
                          "لم يكتب هذا العضو نبذة بعد."}
                      </p>
                    )}

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => onSendPM(member)}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black bg-green-500/15 text-green-200 border border-green-400/20"
                      >
                        <MessageCircle size={12} />
                        رسالة خاصة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3">
                <SocialFeedPanel
                  posts={timeline}
                  currentSession={currentUser}
                  chatMembers={chatMembers}
                  storeSnapshot={storeSnapshot}
                  cosmeticGrants={cosmeticGrants}
                  isCompactView={false}
                  isChatColumnExpanded={false}
                  canInteract={currentUser.authProvider === "supabase"}
                  onOpenProfile={() => {}}
                  onLike={onLike}
                  onComment={onComment}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UserProfilePageModal;
