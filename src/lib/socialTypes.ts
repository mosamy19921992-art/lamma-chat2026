export interface UserProfileRecord {
  userUid: string;
  nickname: string;
  bio: string;
  avatarUrl?: string;
  updatedAt?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorUid: string;
  authorNickname: string;
  text: string;
  createdAt: string;
}

export interface SocialPost {
  id: string;
  createdAt: string;
  authorUid: string;
  authorNickname: string;
  text: string;
  type: "text" | "image" | "video" | "audio";
  mediaUrl?: string;
  color?: string;
  likeCount: number;
  likedByMe: boolean;
  comments: PostComment[];
  isLegacy?: boolean;
}

export type PrivateMessageType = "text" | "image" | "video" | "audio";

export interface PersistedPrivateMessage {
  id: string;
  created_at?: string;
  text: string;
  type?: PrivateMessageType;
  media_url?: string;
}
