import React, { memo } from "react";
import { ResolvedPrivateMedia } from "./ResolvedPrivateMedia";
import type { PMThreadMessage } from "../../lib/chatTypes";
import {
  filterSafeMediaUrl,
  getYoutubeId,
  isPrivateStorageRef,
} from "../../lib/chatHelpers";
import { LazyYoutubeEmbed, renderTextMessageWithMedia } from "../../lib/chatMessageRender";
import { VoiceNoteBubble } from "../VoiceNoteBubble";

export type PmMessageRowProps = {
  msg: PMThreadMessage;
  targetNickname: string;
  spySenderLabel: string | null;
  fontScale?: number;
};

function PmMessageRowInner({
  msg,
  targetNickname,
  spySenderLabel,
  fontScale = 1,
}: PmMessageRowProps) {
  const bubbleFontPx = 12 * fontScale;
  const metaFontPx = 9 * fontScale;
  const isSpyThread = targetNickname.startsWith("🕵️");
  const safePmMediaUrl = filterSafeMediaUrl(msg.mediaUrl);
  const legacyUrl = filterSafeMediaUrl(msg.mediaUrl);
  const youtubeId = safePmMediaUrl ? getYoutubeId(safePmMediaUrl) : null;

  return (
    <div
      className={`flex flex-col max-w-[85%] pb-3 ${msg.isOwn ? "mr-auto items-start" : "ml-auto items-end"}`}
    >
      {spySenderLabel && (
        <span
          className="text-purple-300 font-bold mb-0.5 px-1"
          style={{ fontSize: `${8 * fontScale}px` }}
        >
          {spySenderLabel}
        </span>
      )}
      <div
        className={`p-2.5 leading-normal lamma-message break-words min-w-0 overflow-wrap-anywhere ${
          isSpyThread
            ? msg.isOwn
              ? "lamma-pm-bubble-own bg-blue-500/15 border border-blue-500/20 text-blue-100 rounded-tr-none"
              : "lamma-pm-bubble-incoming bg-rose-500/15 border border-rose-500/20 text-rose-100 rounded-tl-none"
            : msg.isOwn
              ? "lamma-pm-bubble-own lamma-msg-bubble-own bg-white/12 border border-white/10 text-white font-extrabold"
              : "lamma-pm-bubble-incoming bg-black/40 border border-white/8 text-gray-100"
        } ${msg.pending ? "opacity-80" : ""}`}
        style={{ fontSize: `${bubbleFontPx}px` }}
      >
        {safePmMediaUrl && msg.type === "image" ? (
          isPrivateStorageRef(safePmMediaUrl) ? (
            <ResolvedPrivateMedia mediaRef={safePmMediaUrl} kind="image" />
          ) : (
            <img
              src={safePmMediaUrl}
              alt="مرفق"
              className="max-w-[220px] max-h-[220px] rounded-xl mb-1.5 object-cover"
              loading="lazy"
              decoding="async"
            />
          )
        ) : null}

        {safePmMediaUrl && msg.type === "audio" ? (
          <VoiceNoteBubble src={safePmMediaUrl} />
        ) : null}

        {safePmMediaUrl && msg.type === "video" ? (
          youtubeId ? (
            <LazyYoutubeEmbed
              videoId={youtubeId}
              containerClassName="w-[220px] max-w-full overflow-hidden rounded-xl mb-1.5 border border-red-500/15 bg-black/80 shadow-lg"
              buttonClassName="block w-[220px] max-w-full aspect-video rounded-xl mb-1.5 border border-red-500/20 bg-black/80 text-red-300 text-xs font-bold hover:bg-black/90 transition-colors"
            />
          ) : isPrivateStorageRef(safePmMediaUrl) ? (
            <ResolvedPrivateMedia mediaRef={safePmMediaUrl} kind="video" />
          ) : (
            <video
              src={safePmMediaUrl}
              controls
              preload="none"
              playsInline
              className="max-w-[220px] rounded-xl mb-1.5 border border-white/10"
            />
          )
        ) : null}

        {legacyUrl && !msg.type ? (
          isPrivateStorageRef(legacyUrl) ? (
            <ResolvedPrivateMedia mediaRef={legacyUrl} kind="image" />
          ) : (
            <img
              src={legacyUrl}
              alt="مرفق"
              className="max-w-[220px] max-h-[220px] rounded-xl mb-1.5 object-cover"
              loading="lazy"
              decoding="async"
            />
          )
        ) : null}

        {msg.text ? (
          <div className="m-0 text-right">{renderTextMessageWithMedia(msg.text)}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        <span
          className="text-gray-500 font-mono"
          style={{ fontSize: `${metaFontPx}px` }}
        >
          {msg.time}
        </span>
        {msg.isOwn && (
          <span
            className={`${
              msg.status === "read"
                ? "text-blue-400"
                : msg.status === "delivered"
                  ? "text-gray-300"
                  : "text-gray-500"
            }`}
            style={{ fontSize: `${10 * fontScale}px` }}
          >
            {msg.pending
              ? "…"
              : msg.status === "read"
                ? "✓✓"
                : msg.status === "delivered"
                  ? "✓✓"
                  : "✓"}
          </span>
        )}
      </div>
    </div>
  );
}

function pmMessageEqual(a: PMThreadMessage, b: PMThreadMessage): boolean {
  return (
    a.text === b.text &&
    a.mediaUrl === b.mediaUrl &&
    a.type === b.type &&
    a.time === b.time &&
    a.isOwn === b.isOwn &&
    a.status === b.status &&
    a.pending === b.pending &&
    a.dbId === b.dbId &&
    a.clientId === b.clientId
  );
}

export const PmMessageRow = memo(PmMessageRowInner, (prev, next) => {
  if (!pmMessageEqual(prev.msg, next.msg)) return false;
  if (prev.targetNickname !== next.targetNickname) return false;
  if (prev.spySenderLabel !== next.spySenderLabel) return false;
  if (prev.fontScale !== next.fontScale) return false;
  return true;
});
