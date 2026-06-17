import { useEffect } from "react";

interface DeepLinkHandlers {
  onOpenRadio?: () => void;
  onSharedText?: (text: string) => void;
}

function cleanSearchParams(params: URLSearchParams, keys: string[]) {
  keys.forEach((key) => params.delete(key));
  const query = params.toString();
  window.history.replaceState({}, "", query ? `/?${query}` : "/");
}

/** Handles PWA manifest shortcuts (?feature=radio) and Web Share Target (?share=true). */
export function useDeepLinkParams({ onOpenRadio, onSharedText }: DeepLinkHandlers) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    let consumed = false;

    if (params.get("feature") === "radio") {
      onOpenRadio?.();
      params.delete("feature");
      consumed = true;
    }

    if (params.get("share") === "true") {
      const sharedText =
        params.get("text")?.trim() ||
        params.get("title")?.trim() ||
        params.get("url")?.trim() ||
        "";
      if (sharedText) {
        onSharedText?.(sharedText);
      }
      cleanSearchParams(params, ["share", "text", "title", "url"]);
      return;
    }

    if (consumed) {
      cleanSearchParams(params, ["feature"]);
    }
  }, [onOpenRadio, onSharedText]);
}
