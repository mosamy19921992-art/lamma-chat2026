import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type VideoTarget = "global" | "feed" | "sidebar";

interface VideoLayer {
  target: VideoTarget;
  src: string;
}

const ROOT_SELECTOR = ".lamma-neutral-glass";
const VIDEO_ATTRS = ["data-us-global-video", "data-us-feed-video", "data-us-sidebar-video"] as const;

const HOST_SELECTORS: Record<VideoTarget, string> = {
  global: ROOT_SELECTOR,
  feed: ".lamma-chat-core-shell",
  sidebar: ".sidebar-container",
};

function readVideoLayers(): VideoLayer[] {
  if (typeof document === "undefined") return [];
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return [];

  const layers: VideoLayer[] = [];
  const mapping: Record<(typeof VIDEO_ATTRS)[number], VideoTarget> = {
    "data-us-global-video": "global",
    "data-us-feed-video": "feed",
    "data-us-sidebar-video": "sidebar",
  };

  for (const attr of VIDEO_ATTRS) {
    const src = root.getAttribute(attr)?.trim();
    if (src) layers.push({ target: mapping[attr], src });
  }
  return layers;
}

function VideoBg({ target, src }: VideoLayer) {
  const host =
    typeof document !== "undefined"
      ? document.querySelector(HOST_SELECTORS[target])
      : null;

  const video = (
    <video
      className={`lamma-us-video-bg lamma-us-video-${target}`}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden
    />
  );

  if (host) return createPortal(video, host);
  return video;
}

/** Renders conflict-free video backgrounds driven by universal style data attributes. */
export function UniversalStyleVideoLayer() {
  const [layers, setLayers] = useState<VideoLayer[]>(() => readVideoLayers());

  useEffect(() => {
    const sync = () => setLayers(readVideoLayers());
    sync();

    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [...VIDEO_ATTRS],
    });
    return () => observer.disconnect();
  }, []);

  if (layers.length === 0) return null;

  return (
    <>
      {layers.map((layer) => (
        <VideoBg key={`${layer.target}-${layer.src}`} {...layer} />
      ))}
    </>
  );
}

export default UniversalStyleVideoLayer;
