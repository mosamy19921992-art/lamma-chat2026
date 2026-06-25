import React, { memo } from "react";
import BossSigil from "../BossSigil";
import AMLogo from "../AMLogo";
import { MemberPrestigeBadges } from "../MemberPrestigeBadges";
import { OwnerAvatarAura } from "../OwnerPrestige";
import { StyleSandboxCard } from "../design/StyleSandboxCard";
import { VoiceNoteBubble } from "../VoiceNoteBubble";
import { ResolvedPrivateMedia } from "./ResolvedPrivateMedia";
import type { StyleSandboxSession } from "../../services/design/universalStyleTypes";
import type {
  ChatMember,
  MemberCosmeticGrant,
  Message,
  UserSession,
} from "../../lib/chatTypes";
import {
  filterSafeMediaUrl,
  getCrownRoleForDisplay,
  getFrameFromAuthor,
  getPrestigeNameClass,
  getRoleFromAuthor,
  getShortenedNickname,
  getYoutubeId,
  isOwnerAuthor,
  isPrivateStorageRef,
  type StoreCosmeticsSnapshot,
} from "../../lib/chatHelpers";
import { renderTextMessageWithMedia, LazyYoutubeEmbed } from "../../lib/chatMessageRender";

function getNameGlassCardClass(options: {
  isSelf?: boolean;
  isBoss?: boolean;
  compact?: boolean;
}) {
  return [
    "lamma-name-glass-card",
    options.isSelf && "lamma-name-glass-card-own",
    options.isBoss && "lamma-name-glass-card-boss",
    options.compact && "lamma-name-glass-card-compact",
  ]
    .filter(Boolean)
    .join(" ");
}

export type ChatMessageRowProps = {
  msg: Message;
  isCompactView: boolean;
  isChatColumnExpanded: boolean;
  myActiveSession: UserSession;
  chatMembers: ChatMember[];
  subscription: StoreCosmeticsSnapshot | null;
  memberCosmeticGrants: Record<string, MemberCosmeticGrant>;
  activeTempEntryTopic: string | null;
  openReactionMsgId: string | null;
  applyingStyleSandboxId: string | null;
  activeRoomId: string;
  onMemberTap: (nickname: string) => void;
  onToggleReaction: (messageId: string) => void;
  onAddReaction: (roomId: string, messageId: string, emoji: string) => void;
  onDeleteMessage: (msg: Message) => void;
  canDeleteMessage: (msg: Message) => boolean;
  onReportMessage?: (msg: Message) => void;
  canReportMessage?: (msg: Message) => boolean;
  resolveStyleSandboxSession: (msg: Message) => StyleSandboxSession | null;
  onApplyStyleSandbox: (session: StyleSandboxSession) => void;
  onCancelStyleSandbox: (sandboxId: string | undefined) => void;
};

function ChatMessageRowInner({
  msg,
  isCompactView,
  isChatColumnExpanded,
  myActiveSession,
  chatMembers,
  subscription,
  memberCosmeticGrants,
  activeTempEntryTopic,
  openReactionMsgId,
  applyingStyleSandboxId,
  activeRoomId,
  onMemberTap,
  onToggleReaction,
  onAddReaction,
  onDeleteMessage,
  canDeleteMessage,
  onReportMessage,
  canReportMessage,
  resolveStyleSandboxSession,
  onApplyStyleSandbox,
  onCancelStyleSandbox,
}: ChatMessageRowProps) {
  const isSystem = msg.type === "system";
  const safeMediaUrl = filterSafeMediaUrl(msg.mediaUrl);
  const authorRole = isSystem
    ? "admin"
    : getRoleFromAuthor(msg.author, myActiveSession, chatMembers);
  const storeForAuthor =
    msg.author === myActiveSession.nickname ? subscription : null;
  const cleanName = getShortenedNickname(msg.author);
  const nameColor = isSystem
    ? "#10b981"
    : msg.author === myActiveSession.nickname
      ? myActiveSession.color
      : msg.color;
  const prestigeClass = getPrestigeNameClass(
    msg.author,
    myActiveSession,
    chatMembers,
    storeForAuthor,
    memberCosmeticGrants,
  );
  const ownerRow = isOwnerAuthor(msg.author, myActiveSession, chatMembers);
  const authorMember =
    chatMembers.find((member) => member.nickname === msg.author) ?? {
      nickname: msg.author,
      role: authorRole === "none" ? "user" : authorRole,
      badge:
        msg.author === myActiveSession.nickname
          ? myActiveSession.badge
          : undefined,
      title:
        msg.author === myActiveSession.nickname
          ? myActiveSession.title
          : undefined,
    };
  const styleSandboxSession =
    msg.type === "style_sandbox" && msg.styleSandboxId
      ? resolveStyleSandboxSession(msg)
      : null;

  return (
    <div
      className={`flex items-start max-w-full rounded transition-colors ${
        isCompactView ? "gap-1.5 py-0.5 px-1" : "gap-2.5 py-1 px-2"
      } ${isSystem ? "my-1" : "hover:bg-white/5"}`}
    >
      <div
        className="flex-shrink-0 cursor-pointer mt-1 group/author animate-fadeIn"
        onClick={() => onMemberTap(msg.author)}
      >
        <OwnerAvatarAura
          active={isOwnerAuthor(msg.author, myActiveSession, chatMembers)}
        >
          <AMLogo
            size={isCompactView ? 16 : 22}
            variant="circular"
            glow={
              msg.author === myActiveSession.nickname ||
              isOwnerAuthor(msg.author, myActiveSession, chatMembers)
            }
            frame={getFrameFromAuthor(
              msg.author,
              myActiveSession,
              chatMembers,
              memberCosmeticGrants,
            )}
            crownRole={getCrownRoleForDisplay(
              msg.author,
              myActiveSession,
              chatMembers,
              storeForAuthor,
              memberCosmeticGrants,
            )}
          />
        </OwnerAvatarAura>
      </div>

      <div
        className="flex flex-col items-start cursor-pointer group/author shrink-0 pt-0"
        onClick={() => onMemberTap(msg.author)}
      >
        <div className="flex flex-col items-start truncate min-w-0 max-w-full">
          <div
            className={`flex items-center gap-1 flex-wrap ${getNameGlassCardClass({
              isSelf: msg.author === myActiveSession.nickname,
              isBoss: ownerRow,
              compact: true,
            })}`}
          >
            <span
              style={{ color: nameColor }}
              className={`font-bold text-[11px] group-hover/author:underline lamma-author-name ${prestigeClass}`}
            >
              {cleanName}
            </span>
            {ownerRow && <BossSigil size={12} className="opacity-95 shrink-0" />}
            {msg.author === myActiveSession.nickname && activeTempEntryTopic && (
              <span className="max-w-[110px] truncate rounded-full border border-cyan-400/25 bg-cyan-500/10 px-1.5 py-0.5 text-[7px] text-cyan-200">
                {activeTempEntryTopic}
              </span>
            )}
          </div>
          {!isSystem && (
            <div className="relative group/msgactions flex items-center gap-1 flex-wrap max-w-full">
              <MemberPrestigeBadges
                member={authorMember}
                currentUser={myActiveSession}
                chatMembers={chatMembers}
                subscription={subscription}
                memberCosmeticGrants={memberCosmeticGrants}
                size="sm"
                highlightYou
              />
              {msg.type === "text" && (
                <button
                  type="button"
                  aria-label="تفاعلات الرسالة"
                  aria-expanded={openReactionMsgId === msg.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleReaction(msg.id);
                  }}
                  className="text-[8px] font-mono font-black text-gray-500/90 hover:text-green-300 transition-colors leading-none p-0 border-0 bg-transparent shadow-none cursor-pointer shrink-0 group-hover/author:text-green-300"
                >
                  +
                </button>
              )}
              <div
                className={`absolute top-full mt-0.5 start-0 p-1.5 rounded-lg flex-row gap-2 z-50 w-max items-center lamma-popover-shell ${
                  openReactionMsgId === msg.id
                    ? "flex"
                    : "hidden group-hover/msgactions:flex"
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddReaction(activeRoomId, msg.id, "❤️");
                  }}
                  className="text-[11px] md:text-[13px] hover:scale-125 transition-transform cursor-pointer"
                >
                  ❤️
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddReaction(activeRoomId, msg.id, "😂");
                  }}
                  className="text-[11px] md:text-[13px] hover:scale-125 transition-transform cursor-pointer"
                >
                  😂
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddReaction(activeRoomId, msg.id, "👍");
                  }}
                  className="text-[11px] md:text-[13px] hover:scale-125 transition-transform cursor-pointer"
                >
                  👍
                </button>
                {canReportMessage?.(msg) && onReportMessage && (
                  <>
                    <div className="w-[1px] h-3 bg-white/20 mx-0.5" />
                    <button
                      type="button"
                      title="بلاغ عن الرسالة"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReportMessage(msg);
                      }}
                      className="text-[10px] hover:scale-110 transition-transform cursor-pointer"
                    >
                      🚩
                    </button>
                  </>
                )}
                {canDeleteMessage(msg) && (
                  <>
                    <div className="w-[1px] h-3 bg-white/20 mx-0.5" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            "🗑️ حذف الرسالة؟\n\nلو الرسالة مرفوعة على Supabase هتتمسح هناك كمان.",
                          )
                        ) {
                          onDeleteMessage(msg);
                        }
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold px-1 cursor-pointer"
                      title="حذف الرسالة"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="lamma-author-meta">
          <span className="text-[10px] font-mono lamma-msg-meta" dir="ltr">
            {msg.time}
          </span>
          {msg.sendPending ? (
            <span
              className="text-[8px] text-amber-400/90 font-bold"
              title="في انتظار الإرسال"
            >
              ⏳
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 min-w-0 pt-0">
        <div
          className={`lamma-message ${isCompactView ? "text-[11px] px-3 py-2.5" : "text-[12px] px-3 py-2.5"} leading-relaxed break-words ${
            isChatColumnExpanded
              ? "max-w-full"
              : "max-w-[min(820px,100%)]"
          } ${
            isSystem
              ? "lamma-msg-bubble-system"
              : msg.author === myActiveSession.nickname
                ? "lamma-msg-bubble-own"
                : ""
          }`}
          data-design-region="message-bubbles"
        >
          {msg.type === "style_sandbox" && msg.styleSandboxId ? (
            <div className="space-y-2">
              <p className="text-[10px] text-emerald-200/90 font-bold">
                🎨 طلب تصميم: {msg.text}
              </p>
              {!styleSandboxSession ? (
                <p className="text-[10px] text-amber-300/90">
                  ⚠️ بطاقة المعاينة غير متاحة — أعد إرسال الطلب.
                </p>
              ) : (
                <StyleSandboxCard
                  config={styleSandboxSession.config}
                  summary={styleSandboxSession.summary}
                  prompt={styleSandboxSession.prompt}
                  disabled={styleSandboxSession.applied}
                  isApplying={applyingStyleSandboxId === styleSandboxSession.id}
                  onApply={() => void onApplyStyleSandbox(styleSandboxSession)}
                  onCancel={() => onCancelStyleSandbox(msg.styleSandboxId)}
                />
              )}
            </div>
          ) : null}

          {msg.type === "text" && renderTextMessageWithMedia(msg.text)}

          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div className="flex gap-1 mt-2 items-center">
              {Object.entries(msg.reactions).map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="text-[9px] bg-white/10 rounded px-1 select-none flex items-center gap-0.5"
                >
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}

          {isSystem && (
            <div className="text-right leading-relaxed font-semibold text-[10px] text-gray-200 mt-0.5 select-none font-mono lamma-system-note">
              <span className="lamma-system-label flex items-center gap-1 mb-0.5 text-[10px]">
                🛡️{" "}
                {msg.author === "🔥 LC-Fire" ? "إشعار LC-Fire:" : "إشعار نظام:"}
              </span>
              <div className="whitespace-pre-line text-[10.5px] font-sans text-gray-300 leading-relaxed">
                {msg.text}
              </div>
            </div>
          )}

          {msg.type === "gift" && (
            <div className="flex items-center gap-1.5">
              <span className="text-lg animate-bounce">{msg.giftIcon}</span>
              <span className="font-bold text-white text-[9px]">{msg.text}</span>
            </div>
          )}

          {msg.type === "image" && safeMediaUrl && (
            <div className="mt-2">
              {isPrivateStorageRef(safeMediaUrl) ? (
                <ResolvedPrivateMedia
                  mediaRef={safeMediaUrl}
                  kind="image"
                  imgClassName="rounded-xl max-w-[180px] max-h-[120px] object-cover border border-white/10 bg-black/10"
                />
              ) : (
                <img
                  loading="lazy"
                  src={safeMediaUrl}
                  alt="Attachment"
                  className="rounded-xl max-w-[180px] max-h-[120px] object-cover border border-white/10 bg-black/10"
                />
              )}
            </div>
          )}

          {msg.type === "video" && safeMediaUrl && (
            <div className="mt-2">
              {getYoutubeId(safeMediaUrl) ? (
                <LazyYoutubeEmbed
                  videoId={getYoutubeId(safeMediaUrl)!}
                  containerClassName="max-w-[360px] w-full overflow-hidden rounded-2xl border border-red-500/20 shadow-lg bg-black/80"
                  buttonClassName="block w-full max-w-[360px] aspect-video rounded-2xl border border-red-500/20 bg-black/80 text-red-300 text-xs font-bold hover:bg-black/90 transition-colors"
                />
              ) : isPrivateStorageRef(safeMediaUrl) ? (
                <ResolvedPrivateMedia
                  mediaRef={safeMediaUrl}
                  kind="video"
                  className="rounded-2xl max-w-[360px] border border-white/10"
                />
              ) : (
                <video
                  src={safeMediaUrl}
                  controls
                  preload="none"
                  playsInline
                  className="rounded-2xl max-w-[360px] border border-white/10"
                />
              )}
            </div>
          )}

          {msg.type === "audio" && safeMediaUrl && (
            <VoiceNoteBubble src={safeMediaUrl} />
          )}
        </div>
      </div>
    </div>
  );
}

function reactionsEqual(
  a: Message["reactions"],
  b: Message["reactions"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

function messageContentEqual(prev: Message, next: Message): boolean {
  return (
    prev.id === next.id &&
    prev.text === next.text &&
    prev.mediaUrl === next.mediaUrl &&
    prev.type === next.type &&
    prev.author === next.author &&
    prev.color === next.color &&
    prev.time === next.time &&
    prev.giftIcon === next.giftIcon &&
    prev.styleSandboxId === next.styleSandboxId &&
    prev.styleSandboxApplied === next.styleSandboxApplied &&
    prev.styleSandboxSummary === next.styleSandboxSummary &&
    prev.styleSandboxConfig === next.styleSandboxConfig &&
    prev.sendPending === next.sendPending &&
    reactionsEqual(prev.reactions, next.reactions)
  );
}

export const ChatMessageRow = memo(ChatMessageRowInner, (prev, next) => {
  if (!messageContentEqual(prev.msg, next.msg)) return false;

  const prevReactionOpen = prev.openReactionMsgId === prev.msg.id;
  const nextReactionOpen = next.openReactionMsgId === next.msg.id;
  if (prevReactionOpen !== nextReactionOpen) return false;

  const prevApplying =
    prev.applyingStyleSandboxId === prev.msg.styleSandboxId;
  const nextApplying =
    next.applyingStyleSandboxId === next.msg.styleSandboxId;
  if (prevApplying !== nextApplying) return false;

  if (prev.isCompactView !== next.isCompactView) return false;
  if (prev.isChatColumnExpanded !== next.isChatColumnExpanded) return false;
  if (prev.activeRoomId !== next.activeRoomId) return false;

  const prevOwnTopic =
    prev.msg.author === prev.myActiveSession.nickname
      ? prev.activeTempEntryTopic
      : null;
  const nextOwnTopic =
    next.msg.author === next.myActiveSession.nickname
      ? next.activeTempEntryTopic
      : null;
  if (prevOwnTopic !== nextOwnTopic) return false;

  if (prev.myActiveSession.nickname !== next.myActiveSession.nickname) {
    return false;
  }
  if (prev.myActiveSession.color !== next.myActiveSession.color) return false;
  if (prev.myActiveSession.badge !== next.myActiveSession.badge) return false;
  if (prev.myActiveSession.title !== next.myActiveSession.title) return false;

  if (prev.chatMembers !== next.chatMembers) return false;
  if (prev.subscription !== next.subscription) return false;
  if (prev.memberCosmeticGrants !== next.memberCosmeticGrants) return false;

  return true;
});
