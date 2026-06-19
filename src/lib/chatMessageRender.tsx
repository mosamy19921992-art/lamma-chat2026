// Helper component for rendering text messages with embedded media (YouTube, images, videos).

import React from "react";
import { getYoutubeId, isSafeHttpUrl, sanitizeHexColor } from "./chatHelpers.ts";

const INLINE_FORMAT_REGEX =
  /(\[color=(#[0-9a-fA-F]{3,8})\]([\s\S]*?)\[\/color\]|\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*)/g;

const MAX_INLINE_FORMAT_DEPTH = 8;
const MAX_MESSAGE_RENDER_LENGTH = 8000;

function renderInlineFormattedText(
  text: string,
  depth = 0,
): React.ReactNode[] {
  if (depth > MAX_INLINE_FORMAT_DEPTH) {
    return [text];
  }

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_FORMAT_REGEX.lastIndex = 0;

  while ((match = INLINE_FORMAT_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const [fullMatch, _whole, colorValue, colorText, boldText, italicText] = match;
    const key = `${match.index}-${fullMatch.length}-${nodes.length}`;

    const safeColor = colorValue ? sanitizeHexColor(colorValue) : null;
    if (safeColor && typeof colorText === "string") {
      nodes.push(
        <span key={key} style={{ color: safeColor }}>
          {renderInlineFormattedText(colorText, depth + 1)}
        </span>,
      );
    } else if (typeof boldText === "string") {
      nodes.push(
        <strong key={key}>{renderInlineFormattedText(boldText, depth + 1)}</strong>,
      );
    } else if (typeof italicText === "string") {
      nodes.push(
        <em key={key}>{renderInlineFormattedText(italicText, depth + 1)}</em>,
      );
    } else {
      nodes.push(fullMatch);
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function renderTextMessageWithMedia(text: string) {
  if (!text) return null;

  const safeText =
    text.length > MAX_MESSAGE_RENDER_LENGTH
      ? `${text.slice(0, MAX_MESSAGE_RENDER_LENGTH)}…`
      : text;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = safeText.match(urlRegex);

  const parts = safeText.split(urlRegex);
  const clickableText = parts.map((part, index) => {
    if (part.match(urlRegex)) {
      if (!isSafeHttpUrl(part)) {
        return (
          <span key={index} className="text-gray-400 break-all">
            {part}
          </span>
        );
      }
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer nofollow"
          className="text-cyan-400 hover:text-cyan-300 underline font-semibold break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{renderInlineFormattedText(part)}</span>;
  });

  const mediaPreviews: React.ReactNode[] = [];

  if (urls) {
    urls.forEach((url, idx) => {
      if (!isSafeHttpUrl(url)) return;

      const yid = getYoutubeId(url);
      if (yid) {
        mediaPreviews.push(
          <div
            key={`yt-${idx}`}
            className="mt-2.5 max-w-[280px] overflow-hidden rounded-xl border border-red-500/20 shadow-lg bg-black/80"
          >
            <div className="relative pb-[56.25%] h-0">
              <iframe
                title="YouTube Video Player"
                src={`https://www.youtube.com/embed/${yid}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full rounded-xl"
              />
            </div>
          </div>,
        );
        return;
      }

      const isImg = url.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/i);
      if (isImg) {
        mediaPreviews.push(
          <div
            key={`img-${idx}`}
            className="mt-2.5 max-w-[160px] overflow-hidden rounded-xl border border-green-500/10 shadow-lg bg-black/40 group relative"
          >
            <img
              loading="lazy"
              decoding="async"
              src={url}
              alt="Embedded Link Attachment"
              referrerPolicy="no-referrer"
              className="w-full max-h-40 object-cover rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer"
            />
          </div>,
        );
        return;
      }

      const isVid =
        url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) ||
        url.includes("assets.mixkit.co");
      if (isVid) {
        mediaPreviews.push(
          <div
            key={`vid-${idx}`}
            className="mt-2.5 max-w-[180px] overflow-hidden rounded-xl border border-blue-500/15 shadow-lg bg-black/50"
          >
            <video
              src={url}
              controls
              className="w-full max-h-40 object-cover rounded-xl"
            />
          </div>,
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-1 text-right">
      <div className="leading-snug text-[11px] text-gray-100 break-words whitespace-pre-line">
        {clickableText}
      </div>
      {mediaPreviews.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">{mediaPreviews}</div>
      )}
    </div>
  );
}
