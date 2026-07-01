import { useCallback, useEffect, useState } from "react";
import { supabase, type NicknameChangeRequestRow } from "../lib/supabase";
import { updateAuthNicknameMetadata } from "../services/auth/userProfileMetadataService";
import { nicknameRequestAppliedStorageKey } from "../lib/nicknameRequestStorage";
import {
  fetchNicknameChangeRequests,
  processNicknameChangeRequest,
  submitNicknameChangeRequest,
} from "../services/profile/nicknameChangeService";
import { subscribeChannelWithRetry } from "../services/chat/realtimeUtils";

interface UseNicknameChangeRequestsOptions {
  userId: string | undefined;
  userEmail: string | null | undefined;
  authProvider: string | undefined;
  currentNickname: string;
  sessionNickname: string | undefined;
  isOwnerRole: boolean;
  operatorNickname: string;
  onSessionNicknameUpdate: (nickname: string) => void;
}

export function useNicknameChangeRequests({
  userId,
  userEmail,
  authProvider,
  currentNickname,
  sessionNickname,
  isOwnerRole,
  operatorNickname,
  onSessionNicknameUpdate,
}: UseNicknameChangeRequestsOptions) {
  const [nicknameRequests, setNicknameRequests] = useState<
    NicknameChangeRequestRow[]
  >([]);
  const [nicknameRequestInput, setNicknameRequestInput] = useState("");
  const [nicknameRequestLoading, setNicknameRequestLoading] = useState(false);
  const [nicknameRequestStatusText, setNicknameRequestStatusText] = useState<
    string | null
  >(null);

  const effectiveNickname = sessionNickname || currentNickname;

  const refreshNicknameRequests = useCallback(async () => {
    if (!supabase || authProvider !== "supabase" || !userId) {
      setNicknameRequests([]);
      return;
    }

    const data = await fetchNicknameChangeRequests({
      userId,
      isOwner: isOwnerRole,
    });
    setNicknameRequests(data);
  }, [authProvider, isOwnerRole, userId]);

  useEffect(() => {
    void refreshNicknameRequests();
  }, [refreshNicknameRequests]);

  useEffect(() => {
    if (!supabase || authProvider !== "supabase" || !userId) return;

    const channelName = isOwnerRole
      ? "nickname_change_requests_owner_sync"
      : `nickname_change_requests_user_${userId}`;

    const filter = isOwnerRole ? undefined : `user_id=eq.${userId}`;

    let isCancelled = false;

    const unsubscribe = subscribeChannelWithRetry(() => {
      const channel = supabase.channel(channelName).on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nickname_change_requests",
          ...(filter ? { filter } : {}),
        },
        () => {
          if (isCancelled) return;
          void refreshNicknameRequests();
        },
      );
      return channel;
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [authProvider, isOwnerRole, refreshNicknameRequests, userId]);

  useEffect(() => {
    if (!supabase || authProvider !== "supabase" || !userId) return;

    const approvedRequest = nicknameRequests.find(
      (request) => request.user_id === userId && request.status === "approved",
    );

    if (!approvedRequest?.id) return;

    const appliedKey = nicknameRequestAppliedStorageKey(
      userId,
      approvedRequest.id,
    );
    if (sessionStorage.getItem(appliedKey)) return;

    const requestedNickname = approvedRequest.requested_nickname.trim();
    if (!requestedNickname) return;

    const applyApprovedNickname = async () => {
      if (requestedNickname.toLowerCase() === effectiveNickname.toLowerCase()) {
        sessionStorage.setItem(appliedKey, "1");
        return;
      }

      const { error } = await updateAuthNicknameMetadata(requestedNickname);

      if (error) {
        console.warn("Failed to apply approved nickname request:", error.message);
        return;
      }

      sessionStorage.setItem(appliedKey, "1");
      onSessionNicknameUpdate(requestedNickname);
      setNicknameRequestStatusText(
        `تم اعتماد طلب تغيير الاسم إلى ${requestedNickname} بنجاح.`,
      );
    };

    void applyApprovedNickname();
  }, [
    authProvider,
    effectiveNickname,
    nicknameRequests,
    onSessionNicknameUpdate,
    userId,
  ]);

  const handleSubmitNicknameChangeRequest = useCallback(async () => {
    const requestedNickname = nicknameRequestInput.trim();

    if (!requestedNickname) {
      alert("اكتب الاسم الجديد المطلوب أولاً.");
      return;
    }

    if (requestedNickname.toLowerCase() === effectiveNickname.toLowerCase()) {
      alert("الاسم الجديد هو نفسه الاسم الحالي.");
      return;
    }

    if (!supabase || authProvider !== "supabase" || !userId) {
      alert("هذه الميزة متاحة للحسابات المسجلة فقط.");
      return;
    }

    const hasPendingRequest = nicknameRequests.some(
      (request) => request.user_id === userId && request.status === "pending",
    );

    if (hasPendingRequest) {
      alert("لديك طلب تغيير اسم قيد المراجعة بالفعل.");
      return;
    }

    setNicknameRequestLoading(true);
    setNicknameRequestStatusText(null);

    const { error } = await submitNicknameChangeRequest({
      userId,
      userEmail: userEmail ?? null,
      currentNickname: effectiveNickname,
      requestedNickname,
    });

    setNicknameRequestLoading(false);

    if (error) {
      alert("تعذر إرسال طلب تغيير الاسم حالياً.");
      console.warn("Failed to submit nickname request:", error.message);
      return;
    }

    setNicknameRequestInput("");
    setNicknameRequestStatusText(
      "تم إرسال طلب تغيير الاسم للمالك وسيظهر له للمراجعة.",
    );
    await refreshNicknameRequests();
  }, [
    authProvider,
    effectiveNickname,
    nicknameRequestInput,
    nicknameRequests,
    refreshNicknameRequests,
    userEmail,
    userId,
  ]);

  const handleProcessNicknameRequest = useCallback(
    async (requestId: string, status: "approved" | "rejected") => {
      if (!supabase || !isOwnerRole) return;

      setNicknameRequestLoading(true);
      const { error } = await processNicknameChangeRequest({
        requestId,
        status,
        processedBy: operatorNickname,
      });

      setNicknameRequestLoading(false);

      if (error) {
        alert("تعذر تحديث حالة الطلب حالياً.");
        console.warn("Failed to process nickname request:", error.message);
        return;
      }

      await refreshNicknameRequests();
    },
    [isOwnerRole, operatorNickname, refreshNicknameRequests],
  );

  return {
    nicknameRequests,
    nicknameRequestInput,
    setNicknameRequestInput,
    nicknameRequestLoading,
    nicknameRequestStatusText,
    handleSubmitNicknameChangeRequest,
    handleProcessNicknameRequest,
    refreshNicknameRequests,
  };
}
