/** Play a live radio/icecast stream without CORS mode (crossOrigin breaks many streams). */
export async function playLiveStream(
  audio: HTMLAudioElement,
  url: string,
): Promise<void> {
  audio.removeAttribute("crossorigin");
  audio.crossOrigin = null;

  if (audio.src === url && audio.readyState >= 2) {
    await audio.play();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onError);
      window.clearTimeout(timer);
    };

    const onReady = () => {
      cleanup();
      audio.play().then(resolve).catch(reject);
    };

    const onError = () => {
      cleanup();
      reject(new Error("stream-load-failed"));
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("stream-timeout"));
    }, 12000);

    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.src = url;
    audio.load();
  });
}

export async function playStreamWithFallbacks(
  audio: HTMLAudioElement,
  urls: string[],
): Promise<string> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      await playLiveStream(audio, url);
      return url;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("all-streams-failed");
}
