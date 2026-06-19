import { supabase } from "../../lib/supabase";
import { isSafeHttpUrl } from "../../lib/chatHelpers";
import type { PostComment, SocialPost } from "../../lib/socialTypes";
import type { UserSession } from "../../lib/chatTypes";

function formatPostTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

function mapPostRow(
  row: {
    id: string;
    created_at: string;
    author_uid: string;
    author_nickname: string;
    text?: string | null;
    type?: string | null;
    media_url?: string | null;
    color?: string | null;
  },
  likeCount: number,
  likedByMe: boolean,
  comments: PostComment[],
): SocialPost {
  return {
    id: row.id,
    createdAt: row.created_at,
    authorUid: row.author_uid,
    authorNickname: row.author_nickname,
    text: row.text || "",
    type: (row.type as SocialPost["type"]) || "text",
    mediaUrl: row.media_url || undefined,
    color: row.color || undefined,
    likeCount,
    likedByMe,
    comments,
  };
}

export async function fetchSocialFeed(
  currentUserUid: string,
  options?: { authorUid?: string; limit?: number },
): Promise<SocialPost[]> {
  if (!supabase) return [];

  const limit = options?.limit ?? 50;
  let query = supabase
    .from("social_posts")
    .select("id, created_at, author_uid, author_nickname, text, type, media_url, color")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.authorUid) {
    query = query.eq("author_uid", options.authorUid);
  }

  const { data: posts, error } = await query;
  if (error || !posts?.length) {
    if (error) console.warn("fetchSocialFeed:", error.message);
    return [];
  }

  const postIds = posts.map((p) => p.id);

  const [{ data: likes }, { data: comments }] = await Promise.all([
    supabase.from("post_likes").select("post_id, user_uid").in("post_id", postIds),
    supabase
      .from("post_comments")
      .select("id, post_id, author_uid, author_nickname, text, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
  ]);

  const likeCountByPost = new Map<string, number>();
  const likedByMe = new Set<string>();
  (likes || []).forEach((like) => {
    likeCountByPost.set(like.post_id, (likeCountByPost.get(like.post_id) || 0) + 1);
    if (like.user_uid === currentUserUid) {
      likedByMe.add(like.post_id);
    }
  });

  const commentsByPost = new Map<string, PostComment[]>();
  (comments || []).forEach((comment) => {
    const mapped: PostComment = {
      id: comment.id,
      postId: comment.post_id,
      authorUid: comment.author_uid,
      authorNickname: comment.author_nickname,
      text: comment.text,
      createdAt: comment.created_at,
    };
    const list = commentsByPost.get(comment.post_id) || [];
    list.push(mapped);
    commentsByPost.set(comment.post_id, list);
  });

  return posts.map((row) =>
    mapPostRow(
      row,
      likeCountByPost.get(row.id) || 0,
      likedByMe.has(row.id),
      commentsByPost.get(row.id) || [],
    ),
  );
}

export async function createSocialPost(
  currentUser: UserSession,
  payload: {
    text: string;
    type?: SocialPost["type"];
    mediaUrl?: string;
  },
): Promise<SocialPost> {
  if (!supabase || !currentUser.uid) {
    throw new Error("النشر متاح للحسابات المسجلة فقط.");
  }

  const trimmedText = payload.text.trim().slice(0, 4000);
  if (!trimmedText && !payload.mediaUrl) {
    throw new Error("اكتب نصاً أو أرفق وسائط.");
  }

  const safeMedia =
    payload.mediaUrl && isSafeHttpUrl(payload.mediaUrl)
      ? payload.mediaUrl.slice(0, 2048)
      : null;

  const { data, error } = await supabase
    .from("social_posts")
    .insert([
      {
        author_uid: currentUser.uid,
        text: trimmedText,
        type: payload.type || "text",
        media_url: safeMedia,
        color: currentUser.color || "#10b981",
      },
    ])
    .select("id, created_at, author_uid, author_nickname, text, type, media_url, color")
    .single();

  if (error || !data) {
    throw error || new Error("تعذر نشر المنشور.");
  }

  return mapPostRow(data, 0, false, []);
}

export async function togglePostLike(
  postId: string,
  userUid: string,
  currentlyLiked: boolean,
): Promise<void> {
  if (!supabase) return;

  if (currentlyLiked) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_uid", userUid);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("post_likes").insert([
    { post_id: postId, user_uid: userUid },
  ]);
  if (error) throw error;
}

export async function addPostComment(
  postId: string,
  currentUser: UserSession,
  text: string,
): Promise<PostComment> {
  if (!supabase || !currentUser.uid) {
    throw new Error("التعليق متاح للحسابات المسجلة فقط.");
  }

  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) {
    throw new Error("اكتب تعليقاً أولاً.");
  }

  const { data, error } = await supabase
    .from("post_comments")
    .insert([
      {
        post_id: postId,
        author_uid: currentUser.uid,
        text: trimmed,
      },
    ])
    .select("id, post_id, author_uid, author_nickname, text, created_at")
    .single();

  if (error || !data) {
    throw error || new Error("تعذر إضافة التعليق.");
  }

  return {
    id: data.id,
    postId: data.post_id,
    authorUid: data.author_uid,
    authorNickname: data.author_nickname,
    text: data.text,
    createdAt: data.created_at,
  };
}

export async function deleteSocialPost(postId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("social_posts").delete().eq("id", postId);
  if (error) throw error;
}

export { formatPostTime };
