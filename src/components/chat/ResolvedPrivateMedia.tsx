import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../../services/storage/mediaStorageService";

type ResolvedPrivateMediaProps = {
  mediaRef: string;
  kind: "image" | "video";
  className?: string;
  imgClassName?: string;
};

/** Lazy-resolve private bucket refs or expired signed URLs for PM / room playback. */
export function ResolvedPrivateMedia({
  mediaRef,
  kind,
  className,
  imgClassName,
}: ResolvedPrivateMediaProps) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveMediaUrl(mediaRef).then((url) => {
      if (!cancelled) setPlayUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [mediaRef]);

  if (!playUrl) {
    return (
      <div
        className={
          className ||
          "max-w-[220px] h-16 rounded-xl bg-white/5 animate-pulse mb-1.5"
        }
      />
    );
  }

  if (kind === "image") {
    return (
      <img
        src={playUrl}
        alt="مرفق"
        loading="lazy"
        decoding="async"
        className={
          imgClassName ||
          "max-w-[220px] max-h-[220px] rounded-xl mb-1.5 object-cover"
        }
      />
    );
  }

  return (
    <video
      src={playUrl}
      controls
      preload="none"
      playsInline
      className={
        className ||
        "max-w-[220px] rounded-xl mb-1.5 border border-white/10"
      }
    />
  );
}
