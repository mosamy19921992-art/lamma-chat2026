import React, { useRef, useState } from "react";
import { Heart, MessageCircle, Sparkles, Send } from "lucide-react";
import AMLogo from "../AMLogo";
import BossSigil from "../BossSigil";
import { OwnerAvatarAura } from "../OwnerPrestige";
import { VoiceNoteBubble } from "../VoiceNoteBubble";
import { renderTextMessageWithMedia } from "../../lib/chatMessageRender";
import {
  getCrownRoleForDisplay,
  getFrameFromAuthor,
  getPrestigeNameClass,
  getRoleFromAuthor,
  getShortenedNickname,
  getStoreVipChip,
  getYoutubeId,
  isOwnerAuthor,
  isSafeHttpUrl,
  type StoreCosmeticsSnapshot,
} from "../../lib/chatHelpers";
import { OWNER_DISPLAY_BADGE } from "../../lib/ownerIdentity";
import { formatPostTime } from "../../services/social/socialPostsService";
import type { PostComment, SocialPost } from "../../lib/socialTypes";
import type { ChatMember, UserSession } from "../../lib/chatTypes";
import type { MemberCosmeticGrant } from "../../lib/chatTypes";
import { ChatMessageVirtualList } from "../chat/ChatMessageVirtualList";

const VIRTUAL_POST_THRESHOLD = 10;
const VIRTUAL_COMMENT_THRESHOLD = 24;

function getNameGlassCardClass({
  isSelf,
  isBoss,
}: {
  isSelf: boolean;
  isBoss: boolean;
}) {
  if (isBoss) return "lamma-name-glass-boss";
  if (isSelf) return "lamma-name-glass-self";
  return "lamma-name-glass";
}

function PostCommentList({ comments }: { comments: PostComment[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);

  if (comments.length === 0) return null;

  if (comments.length <= VIRTUAL_COMMENT_THRESHOLD) {
    return (
      <>
        {comments.map((comment) => (
          <div key={comment.id} className="text-[10px] text-gray-200">
            <span className="font-black text-emerald-300">
              {comment.authorNickname}
            </span>
            <span className="text-gray-500 mx-1">•</span>
            <span>{comment.text}</span>
          </div>
        ))}
      </>
    );
  }

  return (
    <div ref={viewportRef} className="max-h-44 overflow-y-auto">
      <ChatMessageVirtualList
        messages={comments}
        parentRef={viewportRef}
        estimateSize={28}
        renderMessage={(comment) => (
          <div className="pb-2 text-[10px] text-gray-200">
            <span className="font-black text-emerald-300">
              {comment.authorNickname}
            </span>
            <span className="text-gray-500 mx-1">•</span>
            <span>{comment.text}</span>
          </div>
        )}
      />
    </div>
  );
}

interface SocialFeedPanelProps {
  posts: SocialPost[];
  currentSession: UserSession;
  chatMembers: ChatMember[];
  storeSnapshot: StoreCosmeticsSnapshot;
  cosmeticGrants: Record<string, MemberCosmeticGrant>;
  isCompactView: boolean;
  isChatColumnExpanded: boolean;
  canInteract: boolean;
  scrollParentRef?: React.RefObject<HTMLDivElement | null>;
  onOpenProfile: (nickname: string) => void;
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string) => Promise<unknown>;
  onDeletePost?: (post: SocialPost) => void;
  canDeletePost?: (post: SocialPost) => boolean;
}

export function SocialFeedPanel({
  posts,
  currentSession,
  chatMembers,
  storeSnapshot,
  cosmeticGrants,
  isCompactView,
  isChatColumnExpanded,
  canInteract,
  scrollParentRef,
  onOpenProfile,
  onLike,
  onComment,
  onDeletePost,
  canDeletePost,
}: SocialFeedPanelProps) {
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const renderPost = (post: SocialPost) => {
    const role = getRoleFromAuthor(
      post.authorNickname,
      currentSession,
      chatMembers,
    );
    const cleanName = getShortenedNickname(post.authorNickname);
    const nameColor =
      post.authorNickname === currentSession.nickname
        ? currentSession.color
        : post.color || "#10b981";
    const storeForAuthor =
      post.authorNickname === currentSession.nickname ? storeSnapshot : null;
    const prestigeClass = getPrestigeNameClass(
      post.authorNickname,
      currentSession,
      chatMembers,
      storeForAuthor,
      cosmeticGrants,
    );
    const isOwnerAuthorRow = isOwnerAuthor(
      post.authorNickname,
      currentSession,
      chatMembers,
    );
    const storeVipChip = getStoreVipChip(
      post.authorNickname,
      currentSession,
      storeForAuthor,
      cosmeticGrants,
    );
    const showComments = openComments[post.id];
    const safeMediaUrl =
      post.mediaUrl && isSafeHttpUrl(post.mediaUrl) ? post.mediaUrl : null;

    return (
      <article key={post.id} className="lamma-post-card pb-3">
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 cursor-pointer"
            onClick={() => onOpenProfile(post.authorNickname)}
          >
            <OwnerAvatarAura active={isOwnerAuthorRow}>
              <AMLogo
                size={isCompactView ? 26 : 34}
                variant="circular"
                glow={post.authorNickname === currentSession.nickname}
                frame={getFrameFromAuthor(
                  post.authorNickname,
                  currentSession,
                  chatMembers,
                  cosmeticGrants,
                )}
                crownRole={getCrownRoleForDisplay(
                  post.authorNickname,
                  currentSession,
                  chatMembers,
                  storeForAuthor,
                  cosmeticGrants,
                )}
              />
            </OwnerAvatarAura>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div
                className="cursor-pointer min-w-0"
                onClick={() => onOpenProfile(post.authorNickname)}
              >
                <div
                  className={`lamma-author-line ${getNameGlassCardClass({
                    isSelf: post.authorNickname === currentSession.nickname,
                    isBoss: isOwnerAuthorRow,
                  })}`}
                >
                  <span
                    style={prestigeClass ? undefined : { color: nameColor }}
                    className={`font-bold text-[12px] lamma-author-name ${prestigeClass}`}
                  >
                    {cleanName}
                  </span>
                  {isOwnerAuthorRow && (
                    <BossSigil size={14} className="opacity-95" />
                  )}
                  {isOwnerAuthorRow && (
                    <span className="text-[7px] lamma-role-chip lamma-role-owner lamma-boss-badge">
                      👑 {OWNER_DISPLAY_BADGE}
                    </span>
                  )}
                  {storeVipChip === "platinum" && (
                    <span className="text-[7px] lamma-role-chip lamma-role-plat">
                      PLATINUM VIP
                    </span>
                  )}
                  {storeVipChip === "vip" && (
                    <span className="text-[7px] lamma-role-chip lamma-role-vip">
                      VIP
                    </span>
                  )}
                  {role === "admin" && (
                    <span className="text-[7px] lamma-role-chip lamma-role-admin">
                      أدمن
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-400">
                  <span>{formatPostTime(post.createdAt)}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{post.isLegacy ? "منشور قديم" : "منشور يومي"}</span>
                </div>
              </div>

              {canDeletePost?.(post) && onDeletePost && (
                <button
                  type="button"
                  onClick={() => onDeletePost(post)}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded-lg cursor-pointer lamma-soft-action"
                >
                  حذف
                </button>
              )}
            </div>

            <div
              className={`lamma-post-body ${
                isChatColumnExpanded ? "max-w-full" : "max-w-[min(820px,100%)]"
              }`}
            >
              {post.text && renderTextMessageWithMedia(post.text)}

              {post.type === "image" && safeMediaUrl && (
                <div className="mt-3">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={safeMediaUrl}
                    alt="Post attachment"
                    referrerPolicy="no-referrer"
                    className="rounded-2xl max-w-[280px] max-h-[220px] object-cover border border-white/10 bg-black/10"
                  />
                </div>
              )}

              {post.type === "video" && safeMediaUrl && (
                <div className="mt-3">
                  {getYoutubeId(safeMediaUrl) ? (
                    <div className="relative pb-[56.25%] h-0 w-[420px] max-w-full rounded-2xl overflow-hidden border border-red-500/20 shadow-lg">
                      <iframe
                        title="Post YouTube Video Player"
                        src={`https://www.youtube.com/embed/${getYoutubeId(safeMediaUrl)}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full"
                      />
                    </div>
                  ) : (
                    <video
                      src={safeMediaUrl}
                      controls
                      className="rounded-2xl max-w-[420px] border border-white/10"
                    />
                  )}
                </div>
              )}

              {post.type === "audio" && safeMediaUrl && (
                <VoiceNoteBubble src={safeMediaUrl} />
              )}
            </div>

            {!post.isLegacy && (
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={!canInteract}
                  onClick={() => onLike(post.id)}
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all ${
                    post.likedByMe
                      ? "bg-rose-500/15 border-rose-400/30 text-rose-200"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <Heart size={12} className={post.likedByMe ? "fill-current" : ""} />
                  {post.likeCount > 0 ? post.likeCount : "إعجاب"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOpenComments((prev) => ({
                      ...prev,
                      [post.id]: !prev[post.id],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-xl border bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                >
                  <MessageCircle size={12} />
                  {post.comments.length > 0
                    ? `${post.comments.length} تعليق`
                    : "تعليق"}
                </button>
              </div>
            )}

            {showComments && !post.isLegacy && (
              <div className="mt-3 space-y-2 rounded-2xl border border-white/8 bg-black/20 p-3">
                <PostCommentList comments={post.comments} />

                {canInteract && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={commentDrafts[post.id] || ""}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && commentDrafts[post.id]?.trim()) {
                          void onComment(post.id, commentDrafts[post.id]).then(() => {
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: "" }));
                          });
                        }
                      }}
                      placeholder="اكتب تعليقاً..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none"
                    />
                    <button
                      type="button"
                      disabled={!commentDrafts[post.id]?.trim()}
                      onClick={() => {
                        const text = commentDrafts[post.id]?.trim();
                        if (!text) return;
                        void onComment(post.id, text).then(() => {
                          setCommentDrafts((prev) => ({ ...prev, [post.id]: "" }));
                        });
                      }}
                      className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-200 flex items-center justify-center"
                    >
                      <Send size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    );
  };

  if (posts.length === 0) {
    return (
      <div className="lamma-post-feed-shell">
        <div className="lamma-post-hero">
          <div className="flex items-center gap-2 text-amber-200">
            <Sparkles size={16} />
            <span className="text-sm font-black">مجتمع لمة</span>
          </div>
          <p className="text-[11px] text-gray-200 leading-relaxed mt-2">
            اكتب أول منشور يومي وشاركه مع الأعضاء — تفاعل، إعجاب، وتعليقات
            مباشرة.
          </p>
        </div>
        <div className="lamma-post-empty">
          <div className="text-3xl">📰</div>
          <div className="text-sm font-black text-white">لا توجد منشورات بعد</div>
          <div className="text-[11px] text-gray-300 leading-relaxed">
            سجّل دخولك وابدأ النشر في هذا الروم.
          </div>
        </div>
      </div>
    );
  }

  const useVirtualPosts =
    posts.length >= VIRTUAL_POST_THRESHOLD && Boolean(scrollParentRef);

  return (
    <div className="lamma-post-feed-shell">
      <div className="lamma-post-hero">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-200">
            <Sparkles size={16} />
            <span className="text-sm font-black">روم المنشورات</span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            {posts.length} منشور
          </span>
        </div>
        <p className="text-[11px] text-gray-200 leading-relaxed mt-2">
          منشورات يومية مع إعجابات وتعليقات فورية — بدون ما تغيّر تجربة الغرف.
        </p>
      </div>

      {useVirtualPosts && scrollParentRef ? (
        <ChatMessageVirtualList
          messages={posts}
          parentRef={scrollParentRef}
          estimateSize={240}
          renderMessage={(post) => renderPost(post)}
        />
      ) : (
        posts.map((post) => renderPost(post))
      )}
    </div>
  );
}

export default SocialFeedPanel;
