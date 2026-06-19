import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { UserSession } from "../lib/chatTypes";
import type { SocialPost } from "../lib/socialTypes";
import { subscribeChannelWithRetry } from "../services/chat/realtimeUtils";
import {
  addPostComment,
  createSocialPost,
  fetchSocialFeed,
  togglePostLike,
} from "../services/social/socialPostsService";

interface UseSocialFeedOptions {
  currentUser: UserSession;
  enabled?: boolean;
}

export function useSocialFeed({
  currentUser,
  enabled = true,
}: UseSocialFeedOptions) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(false);
  const reloadRequestIdRef = useRef(0);

  const myUid = currentUser.uid || "";

  const reload = useCallback(async () => {
    if (!enabled || !myUid || currentUser.authProvider !== "supabase") {
      setPosts([]);
      return;
    }

    const requestId = ++reloadRequestIdRef.current;
    setLoading(true);
    try {
      const next = await fetchSocialFeed(myUid);
      if (requestId !== reloadRequestIdRef.current) return;
      setPosts(next);
    } finally {
      if (requestId === reloadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentUser.authProvider, enabled, myUid]);

  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!enabled || !supabase || !myUid || currentUser.authProvider !== "supabase") {
      return;
    }

    const unsubPosts = subscribeChannelWithRetry(() =>
      supabase
        .channel(`social_posts_feed_${myUid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "social_posts" },
          () => {
            void reloadRef.current();
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "social_posts" },
          (payload) => {
            const deletedId = (payload.old as { id?: string }).id;
            if (!deletedId) return;
            setPosts((prev) => prev.filter((post) => post.id !== deletedId));
          },
        ),
    );

    const unsubLikes = subscribeChannelWithRetry(() =>
      supabase
        .channel(`social_likes_feed_${myUid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "post_likes" },
          (payload) => {
            const row = payload.new as { post_id?: string; user_id?: string };
            if (!row.post_id) return;
            setPosts((prev) =>
              prev.map((post) =>
                post.id === row.post_id
                  ? {
                      ...post,
                      likeCount: post.likeCount + 1,
                      likedByMe:
                        row.user_id === myUid ? true : post.likedByMe,
                    }
                  : post,
              ),
            );
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "post_likes" },
          (payload) => {
            const row = payload.old as { post_id?: string; user_id?: string };
            if (!row.post_id) return;
            setPosts((prev) =>
              prev.map((post) =>
                post.id === row.post_id
                  ? {
                      ...post,
                      likeCount: Math.max(0, post.likeCount - 1),
                      likedByMe:
                        row.user_id === myUid ? false : post.likedByMe,
                    }
                  : post,
              ),
            );
          },
        ),
    );

    const unsubComments = subscribeChannelWithRetry(() =>
      supabase
        .channel(`social_comments_feed_${myUid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "post_comments" },
          () => {
            void reloadRef.current();
          },
        ),
    );

    return () => {
      unsubPosts();
      unsubLikes();
      unsubComments();
    };
  }, [currentUser.authProvider, enabled, myUid]);

  const publishPost = useCallback(
    async (payload: {
      text: string;
      type?: SocialPost["type"];
      mediaUrl?: string;
    }) => {
      const created = await createSocialPost(currentUser, payload);
      setPosts((prev) => {
        if (prev.some((post) => post.id === created.id)) return prev;
        return [created, ...prev];
      });
      return created;
    },
    [currentUser],
  );

  const likePost = useCallback(
    async (postId: string) => {
      if (!myUid) return;
      const target = posts.find((post) => post.id === postId);
      if (!target) return;

      const nextLiked = !target.likedByMe;
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likedByMe: nextLiked,
                likeCount: Math.max(0, post.likeCount + (nextLiked ? 1 : -1)),
              }
            : post,
        ),
      );

      try {
        await togglePostLike(postId, myUid, target.likedByMe);
      } catch (error) {
        console.warn("togglePostLike failed:", error);
        void reloadRef.current();
      }
    },
    [myUid, posts],
  );

  const commentOnPost = useCallback(
    async (postId: string, text: string) => {
      const comment = await addPostComment(postId, currentUser, text);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, comment] }
            : post,
        ),
      );
      return comment;
    },
    [currentUser],
  );

  const profilePosts = useMemo(() => posts, [posts]);

  return {
    posts,
    profilePosts,
    loading,
    reload,
    publishPost,
    likePost,
    commentOnPost,
  };
}

export async function fetchProfileTimeline(
  currentUserUid: string,
  authorUid: string,
): Promise<SocialPost[]> {
  return fetchSocialFeed(currentUserUid, { authorUid, limit: 30 });
}

export default useSocialFeed;
