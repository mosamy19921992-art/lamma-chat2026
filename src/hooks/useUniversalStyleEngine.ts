import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "../lib/chatTypes";
import {
  applyUniversalStyleToDom,
  clearUniversalStylePreview,
  getGlobalBackgroundForShell,
} from "../services/design/universalStyleApply";
import { parseOwnerStylePrompt } from "../services/design/universalStyleEngine";
import {
  loadUniversalStyleFromSupabase,
  saveUniversalStyleLocal,
  syncUniversalStyleToSupabase,
} from "../services/design/universalStyleStorage";
import {
  createDefaultUniversalStyle,
  normalizeUniversalStyleConfig,
  type StyleSandboxSession,
  type UniversalStyleConfig,
} from "../services/design/universalStyleTypes";

const OWNER_ROOM_ID = "owner";
const STYLE_PROMPT_COOLDOWN_MS = 350;
const MAX_STYLE_SANDBOX_SESSIONS = 12;

interface UseUniversalStyleEngineOptions {
  activeRoomId: string;
  isOwner: boolean;
  defaultAmbientBg: string;
  ownerSettingsRowId?: string;
  setOwnerBgImage?: (url: string | null) => void;
  addLammaBotMessage: (roomId: string, text: string) => void;
  appendStyleSandboxMessage: (
    roomId: string,
    session: StyleSandboxSession,
    botReply: string,
  ) => void;
}

export function useUniversalStyleEngine({
  activeRoomId,
  isOwner,
  defaultAmbientBg,
  ownerSettingsRowId = "global",
  setOwnerBgImage,
  addLammaBotMessage,
  appendStyleSandboxMessage,
}: UseUniversalStyleEngineOptions) {
  const [committedConfig, setCommittedConfig] = useState<UniversalStyleConfig | null>(
    null,
  );
  const previewMemoryRef = useRef<UniversalStyleConfig | null>(null);
  const previewSnapshotRef = useRef<UniversalStyleConfig | null>(null);
  const stylePromptCooldownRef = useRef(0);
  const applyInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadUniversalStyleFromSupabase(ownerSettingsRowId);
      if (cancelled || !loaded) return;
      const normalized = normalizeUniversalStyleConfig(loaded);
      setCommittedConfig(normalized);
      applyUniversalStyleToDom(normalized, { preview: false });
      const bg = getGlobalBackgroundForShell(normalized, defaultAmbientBg);
      if (bg && setOwnerBgImage) setOwnerBgImage(bg);
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultAmbientBg, ownerSettingsRowId, setOwnerBgImage]);

  const beginLivePreview = useCallback(
    (config: UniversalStyleConfig) => {
      if (!previewSnapshotRef.current) {
        previewSnapshotRef.current = committedConfig;
      }
      applyUniversalStyleToDom(config, { preview: true });
      const bg = getGlobalBackgroundForShell(config, defaultAmbientBg);
      if (bg && setOwnerBgImage) setOwnerBgImage(bg);
    },
    [committedConfig, defaultAmbientBg, setOwnerBgImage],
  );

  const rollbackLivePreview = useCallback(() => {
    clearUniversalStylePreview();
    const restore =
      previewSnapshotRef.current ??
      committedConfig ??
      createDefaultUniversalStyle();
    applyUniversalStyleToDom(restore, { preview: false });
    const bg = getGlobalBackgroundForShell(restore, defaultAmbientBg);
    if (bg && setOwnerBgImage) setOwnerBgImage(bg);
    previewSnapshotRef.current = null;
  }, [committedConfig, defaultAmbientBg, setOwnerBgImage]);

  const tryHandleOwnerStylePrompt = useCallback(
    (rawPrompt: string): boolean => {
      if (!isOwner || activeRoomId !== OWNER_ROOM_ID) return false;

      const trimmed = rawPrompt.trim();
      if (!trimmed || trimmed.startsWith("/")) return false;

      const now = Date.now();
      if (now - stylePromptCooldownRef.current < STYLE_PROMPT_COOLDOWN_MS) {
        return true;
      }
      stylePromptCooldownRef.current = now;

      const previous = previewMemoryRef.current || committedConfig;
      const parsed = parseOwnerStylePrompt(trimmed, previous);
      previewMemoryRef.current = parsed.config;
      const prevFx = previous?.effects;
      const nextFx = parsed.config.effects;
      const intentChanged =
        Boolean(previous) &&
        (prevFx?.sidebarCardChase !== nextFx?.sidebarCardChase ||
          prevFx?.chatHeaderStyle !== nextFx?.chatHeaderStyle);
      if (intentChanged) {
        previewSnapshotRef.current = committedConfig;
      }

      beginLivePreview(parsed.config);

      const session: StyleSandboxSession = {
        id: `style-${now}`,
        createdAt: now,
        prompt: trimmed,
        summary: parsed.summary,
        config: parsed.config,
        applied: false,
      };

      const botReply = parsed.summary.startsWith("📖")
        ? parsed.summary
        : parsed.summary.startsWith("🎯")
          ? `${parsed.summary}\n\n👀 شوف التغيير على «${parsed.config.label}» في الموقع.\n\n✅ «تطبيق على الكل» للحفظ | ✖ «إلغاء / تعديل» للتراجع\n💡 اكتب «مصطلحات» لقائمة أجزاء الشات`
          : parsed.config.effects?.sidebarCardChase
        ? `🎨 ${parsed.summary}\n\n👀 بص على الأعمدة الجانبية (VIP، الراديو، الغرف) — المفروض تشوف شريط النور بيلف حوالين كل بطاقة.\n\n✅ «تطبيق على الكل» للحفظ | ✖ «إلغاء / تعديل» للتراجع\n💡 بعد كده عدّل: «أبطأ» أو «أسرع» أو «لون أخضر»`
        : parsed.config.effects?.chatHeaderStyle &&
            parsed.config.effects.chatHeaderStyle !== "none"
          ? `🎨 ${parsed.summary}\n\n👀 بص على الشريط العلوي للموقع وهيدر الغرفة.\n\n✅ «تطبيق على الكل» للحفظ | ✖ «إلغاء / تعديل» للتراجع\n💡 طلب جديد مختلف؟ اكتبه مباشرة — البوت هيبدأ من جديد.`
        : parsed.refined
        ? `🎨 تم تحديث المعاينة على الموقع + بطاقة الشات.\n${parsed.summary}\n\n✅ اضغط «تطبيق على الكل» للحفظ للجميع، أو «إلغاء / تعديل» للتراجع.`
        : `🎨 شغّلت معاينة حية لستايل «${parsed.config.label}» — شوف الموقع والبطاقة تحت رسالتك.\n${parsed.summary}\n\n✅ «تطبيق على الكل» = حفظ | ✖ «إلغاء / تعديل» = تراجع`;

      appendStyleSandboxMessage(activeRoomId, session, botReply);
      return true;
    },
    [
      activeRoomId,
      addLammaBotMessage,
      appendStyleSandboxMessage,
      beginLivePreview,
      committedConfig,
      isOwner,
    ],
  );

  const applyStyleGlobally = useCallback(
    async (session: StyleSandboxSession): Promise<boolean> => {
      if (session.applied || applyInFlightRef.current) return false;
      applyInFlightRef.current = true;

      try {
        const config = session.config;
        setCommittedConfig(config);
        saveUniversalStyleLocal(config);
        clearUniversalStylePreview();
        applyUniversalStyleToDom(config, { preview: false });
        previewSnapshotRef.current = null;
        previewMemoryRef.current = config;

        const bg = getGlobalBackgroundForShell(config, defaultAmbientBg);
        if (bg && setOwnerBgImage) setOwnerBgImage(bg);

        await syncUniversalStyleToSupabase(config, ownerSettingsRowId);

        addLammaBotMessage(
          activeRoomId,
          `✅ تم تطبيق «${config.label}» — ${config.effects?.sidebarCardChase ? "شريط النور على بطاقات الأعمدة شغّال للجميع." : "كل المستخدمين هيشوفوه."}`,
        );
        return true;
      } catch (error) {
        console.warn("[UniversalStyle] apply failed:", error);
        addLammaBotMessage(
          activeRoomId,
          "⚠️ فشل الحفظ على السيرفر — المعاينة لسه على جهازك. تأكد من صلاحيات المالك في Supabase.",
        );
        return false;
      } finally {
        applyInFlightRef.current = false;
      }
    },
    [
      activeRoomId,
      addLammaBotMessage,
      defaultAmbientBg,
      ownerSettingsRowId,
      setOwnerBgImage,
    ],
  );

  const cancelStyleSandbox = useCallback(
    (sandboxId?: string) => {
      rollbackLivePreview();
      previewMemoryRef.current = null;
      addLammaBotMessage(
        activeRoomId,
        sandboxId
          ? "↩️ تم إلغاء المعاينة وإرجاع الموقع. اكتب طلب جديد (مثلاً: خلّي الأزرار أكثر استدارة)."
          : "↩️ تم إلغاء آخر معاينة.",
      );
    },
    [activeRoomId, addLammaBotMessage, rollbackLivePreview],
  );

  return {
    committedConfig,
    tryHandleOwnerStylePrompt,
    applyStyleGlobally,
    cancelStyleSandbox,
  };
}

export function buildStyleSandboxMessage(
  session: StyleSandboxSession,
  botReply: string,
  authorNick: string,
): Message[] {
  const time = new Date().toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  return [
    {
      id: `bot-style-${session.id}`,
      author: "🤖 مساعد تصميم لمة",
      text: botReply,
      color: "#10b981",
      isOwn: false,
      time,
      type: "system",
    },
    {
      id: session.id,
      author: authorNick,
      text: session.prompt,
      color: "#34d399",
      isOwn: true,
      time,
      type: "style_sandbox",
      styleSandboxId: session.id,
      styleSandboxConfig: session.config,
      styleSandboxSummary: session.summary,
      styleSandboxApplied: session.applied,
    },
  ];
}

export { OWNER_ROOM_ID, MAX_STYLE_SANDBOX_SESSIONS };
