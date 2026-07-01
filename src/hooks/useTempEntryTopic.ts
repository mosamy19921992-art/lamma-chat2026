import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  buildTempEntryTopicStorageKey,
  persistTempEntryTopic,
  readStoredTempEntryTopic,
  sanitizeTempEntryTopic,
  TEMP_ENTRY_TOPIC_MAX_LEN,
} from "../lib/tempEntryTopicStorage";
import {
  fetchTempEntryTopicMetadata,
  updateTempEntryTopicMetadata,
} from "../services/auth/userProfileMetadataService";

interface UseTempEntryTopicOptions {
  userId: string | undefined;
  userNickname: string;
  isRegisteredAccount: boolean;
  activeRoomId: string;
}

export function useTempEntryTopic({
  userId,
  userNickname,
  isRegisteredAccount,
  activeRoomId,
}: UseTempEntryTopicOptions) {
  const storageKey = buildTempEntryTopicStorageKey(userId || userNickname);
  const [tempEntryTopicInput, setTempEntryTopicInput] = useState("");
  const [tempEntryTopicEnabled, setTempEntryTopicEnabled] = useState(false);
  const [tempEntryTopicStatusText, setTempEntryTopicStatusText] = useState<
    string | null
  >(null);
  const [visibleTempEntryTopic, setVisibleTempEntryTopic] = useState<
    string | null
  >(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTriggerRef = useRef("");

  const clearVisibleTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flashVisibleTopic = useCallback(
    (topic: string) => {
      clearVisibleTimer();
      setVisibleTempEntryTopic(topic);
      timerRef.current = setTimeout(() => {
        setVisibleTempEntryTopic(null);
        timerRef.current = null;
      }, 5000);
    },
    [clearVisibleTimer],
  );

  useEffect(() => {
    const stored = readStoredTempEntryTopic(storageKey);
    setTempEntryTopicInput(stored.text);
    setTempEntryTopicEnabled(stored.enabled);
    setTempEntryTopicStatusText(null);
    lastTriggerRef.current = "";

    if (!isRegisteredAccount || !supabase) {
      setVisibleTempEntryTopic(null);
      return;
    }

    let cancelled = false;
    const syncTempEntryTopic = async () => {
      const metadata = await fetchTempEntryTopicMetadata();
      if (cancelled || !metadata) return;

      setTempEntryTopicInput(metadata.text);
      setTempEntryTopicEnabled(metadata.enabled);
      persistTempEntryTopic(storageKey, metadata.text, metadata.enabled);
    };

    void syncTempEntryTopic();

    return () => {
      cancelled = true;
    };
  }, [isRegisteredAccount, storageKey, userId, userNickname]);

  useEffect(() => {
    clearVisibleTimer();

    if (!isRegisteredAccount) {
      setVisibleTempEntryTopic(null);
      return;
    }

    const nextTopic = tempEntryTopicInput.trim();
    if (!tempEntryTopicEnabled || !nextTopic) {
      setVisibleTempEntryTopic(null);
      return;
    }

    const triggerKey = `${userId || userNickname}:${activeRoomId}`;
    if (lastTriggerRef.current === triggerKey) {
      return;
    }

    lastTriggerRef.current = triggerKey;
    flashVisibleTopic(nextTopic);

    return clearVisibleTimer;
  }, [
    activeRoomId,
    clearVisibleTimer,
    flashVisibleTopic,
    isRegisteredAccount,
    tempEntryTopicEnabled,
    tempEntryTopicInput,
    userId,
    userNickname,
  ]);

  const handleSaveTempEntryTopic = useCallback(async () => {
    const rawTopic = tempEntryTopicInput.trim();
    if (rawTopic.length > TEMP_ENTRY_TOPIC_MAX_LEN) {
      alert("اجعل التوبيك المؤقت 60 حرفاً أو أقل.");
      return;
    }

    if (!supabase || !isRegisteredAccount || !userId) {
      alert("هذه الميزة متاحة للحسابات المسجلة فقط.");
      return;
    }

    const sanitizedTopic = sanitizeTempEntryTopic(rawTopic);
    const nextEnabled = tempEntryTopicEnabled && Boolean(sanitizedTopic);
    setTempEntryTopicStatusText(null);

    const { error } = await updateTempEntryTopicMetadata(
      sanitizedTopic,
      nextEnabled,
    );

    if (error) {
      alert("تعذر حفظ التوبيك المؤقت حالياً.");
      console.warn("Failed to save temp entry topic:", error.message);
      return;
    }

    setTempEntryTopicInput(sanitizedTopic);
    setTempEntryTopicEnabled(nextEnabled);
    persistTempEntryTopic(storageKey, sanitizedTopic, nextEnabled);
    lastTriggerRef.current = "";
    clearVisibleTimer();

    if (nextEnabled && sanitizedTopic) {
      flashVisibleTopic(sanitizedTopic);
    } else {
      setVisibleTempEntryTopic(null);
    }

    setTempEntryTopicStatusText(
      sanitizedTopic
        ? nextEnabled
          ? "تم حفظ التوبيك المؤقت وسيظهر جنب اسمك لحظات وقت الدخول."
          : "تم حفظ النص، لكن ظهوره معطل حالياً حتى تفعله."
        : "تم مسح التوبيك المؤقت من حسابك.",
    );
  }, [
    clearVisibleTimer,
    flashVisibleTopic,
    isRegisteredAccount,
    storageKey,
    tempEntryTopicEnabled,
    tempEntryTopicInput,
    userId,
  ]);

  const activeTempEntryTopic = visibleTempEntryTopic?.trim() || "";

  return {
    tempEntryTopicInput,
    setTempEntryTopicInput,
    tempEntryTopicEnabled,
    setTempEntryTopicEnabled,
    tempEntryTopicStatusText,
    setTempEntryTopicStatusText,
    handleSaveTempEntryTopic,
    activeTempEntryTopic,
  };
}
