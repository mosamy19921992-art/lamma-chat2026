import { useCallback, useEffect, useRef, useState } from "react";
import { pickVoiceRecorderMimeType } from "../services/chat/voiceMessageService";

export const MAX_VOICE_RECORD_SECONDS = 120;

export function useVoiceMessageRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const finalizeBlob = useCallback((): Blob | null => {
    const chunks = chunksRef.current;
    if (!chunks.length) return null;
    return new Blob(chunks, { type: mimeTypeRef.current });
  }, []);

  const stopRecorderInternal = useCallback(
    (resolve: (blob: Blob | null) => void) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        const blob = finalizeBlob();
        cleanupStream();
        resolve(blob && blob.size > 0 ? blob : null);
        return;
      }

      recorder.onstop = () => {
        const blob = finalizeBlob();
        cleanupStream();
        resolve(blob && blob.size > 0 ? blob : null);
      };

      try {
        recorder.stop();
      } catch {
        cleanupStream();
        resolve(null);
      }
    },
    [cleanupStream, finalizeBlob],
  );

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("UNSUPPORTED");
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickVoiceRecorderMimeType();
      mimeTypeRef.current = mimeType || "audio/webm";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setDurationSec(0);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDurationSec((s) => {
          const next = s + 1;
          if (next >= MAX_VOICE_RECORD_SECONDS) {
            const active = mediaRecorderRef.current;
            if (active && active.state === "recording") {
              stopRecorderInternal(() => {});
            }
            return MAX_VOICE_RECORD_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      // Ensure mic is released if MediaRecorder construction or any setup fails
      if (stream && streamRef.current !== stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      throw err;
    }
  }, [isRecording, stopRecorderInternal]);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      stopRecorderInternal(resolve);
    });
  }, [stopRecorderInternal]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    chunksRef.current = [];
    setDurationSec(0);
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => cleanupStream();
      try {
        recorder.stop();
      } catch {
        cleanupStream();
      }
    } else {
      cleanupStream();
    }
  }, [cleanupStream]);

  return {
    isRecording,
    durationSec,
    maxDurationSec: MAX_VOICE_RECORD_SECONDS,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
