// Helper component for rendering text messages with embedded media (YouTube, images, videos).
// Extracted from ChatScreen.tsx — pure refactor, no behavior change.

import React from "react";
import { getYoutubeId } from "./chatHelpers.ts";

const INLINE_FORMAT_REGEX =
  /(\[color=(#[0-9a-fA-F]{3,8})\]([\s\S]*?)\[\/color\]|\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*)/g;

function renderInlineFormattedText(text: string): React.ReactNode[] {
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

    if (colorValue && typeof colorText === "string") {
      nodes.push(
        <span key={key} style={{ color: colorValue }}>
          {renderInlineFormattedText(colorText)}
        </span>,
      );
    } else if (typeof boldText === "string") {
      nodes.push(<strong key={key}>{renderInlineFormattedText(boldText)}</strong>);
    } else if (typeof italicText === "string") {
      nodes.push(<em key={key}>{renderInlineFormattedText(italicText)}</em>);
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

  // Regex to find URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);

  // Split text to make URLs clickable first
  const parts = text.split(urlRegex);
  const clickableText = parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline font-semibold break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{renderInlineFormattedText(part)}</span>;
  });

  // Now, parse and extract media previews to render UNDER the text
  const mediaPreviews: React.ReactNode[] = [];

  if (urls) {
    urls.forEach((url, idx) => {
      // 1. YouTube Link Extraction
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
        return; // don't render it as double if it matches Youtube
      }

      // 2. Image Link Detection
      const isImg = url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || url.includes("img");
      if (isImg) {
        mediaPreviews.push(
          <div
            key={`img-${idx}`}
            className="mt-2.5 max-w-[160px] overflow-hidden rounded-xl border border-green-500/10 shadow-lg bg-black/40 group relative"
          >
            <img
              loading="lazy"
              src={url}
              alt="Embedded Link Attachment"
              referrerPolicy="no-referrer"
              className="w-full max-h-40 object-cover rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer"
            />
          </div>,
        );
        return;
      }

      // 3. Video Link Detection
      const isVid =
        url.match(/\.(mp4|webm|ogg|mov)/i) || url.includes("assets.mixkit.co");
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
        return;
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
