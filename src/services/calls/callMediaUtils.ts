export type CallMediaType = "audio" | "video";

export function isCallMediaSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof RTCPeerConnection !== "undefined"
  );
}

function buildVideoConstraints(): MediaTrackConstraints {
  return {
    facingMode: { ideal: "user" },
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 24, max: 30 },
  };
}

function buildAudioConstraints(): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
}

export async function requestCallMedia(
  type: CallMediaType,
): Promise<MediaStream> {
  if (!isCallMediaSupported()) {
    throw new Error("UNSUPPORTED");
  }

  const attempts: MediaStreamConstraints[] =
    type === "video"
      ? [
          { audio: buildAudioConstraints(), video: buildVideoConstraints() },
          { audio: true, video: { facingMode: "user" } },
          { audio: true, video: true },
        ]
      : [{ audio: buildAudioConstraints() }, { audio: true }];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("MEDIA_DENIED");
}

export function describeMediaError(error: unknown, type: CallMediaType): string {
  const name =
    error instanceof DOMException
      ? error.name
      : error instanceof Error
        ? error.message
        : "";

  if (name === "UNSUPPORTED" || name.includes("UNSUPPORTED")) {
    return "⚠️ المتصفح أو الجهاز لا يدعم المكالمات. جرّب Chrome أو Safari/Edge على أحدث إصدار.";
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return type === "video"
      ? "⚠️ تم رفض الكاميرا أو المايك. افتح إعدادات الموقع في المتصفح واسمح بالكاميرا والمايك، ثم أعد المحاولة."
      : "⚠️ تم رفض المايك. افتح إعدادات الموقع في المتصفح واسمح بالمايك، ثم أعد المحاولة.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return type === "video"
      ? "⚠️ لم يُعثر على كاميرا أو مايك. تأكد أن الجهاز متصل وغير مستخدم بتطبيق آخر."
      : "⚠️ لم يُعثر على مايك. تأكد أنه متصل وغير مستخدم بتطبيق آخر.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "⚠️ الكاميرا أو المايك مستخدم حالياً من برنامج آخر. أغلق Zoom/Teams/Camera ثم حاول مجدداً.";
  }
  if (name === "OverconstrainedError") {
    return "⚠️ إعدادات الكاميرا غير مدعومة على هذا الجهاز. جرّب مكالمة صوتية أو متصفحاً آخر.";
  }
  if (name === "SecurityError") {
    return "⚠️ المكالمات تعمل فقط عبر HTTPS. افتح الموقع من الرابط الرسمي lamma-arabic-chat-room.vercel.app";
  }
  return type === "video"
    ? "⚠️ تعذر فتح الكاميرا والمايك. تأكد من السماح للمتصفح بالوصول ثم أعد المحاولة."
    : "⚠️ تعذر فتح المايك. تأكد من السماح للمتصفح بالوصول ثم أعد المحاولة.";
}

export async function playRemoteMedia(
  element: HTMLMediaElement | null,
  stream: MediaStream | null,
): Promise<void> {
  if (!element || !stream) return;
  element.srcObject = stream;
  element.muted = false;
  try {
    await element.play();
  } catch {
    // iOS may require an extra tap — caller should retry on user gesture.
  }
}
