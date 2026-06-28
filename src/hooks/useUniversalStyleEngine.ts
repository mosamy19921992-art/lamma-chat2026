import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { setDesignPreviewActive } from "../services/design/designPreviewDom";
import {
  checkOwnerWriteAccessWithClaim,
  formatOwnerWriteDeniedMessage,
} from "../services/auth/ownerWriteAccessService";
import {
  previewImportPackVisuals,
  commitImportPackVisuals,
  cancelImportPackVisualPreview,
} from "../services/design/designImportApplyService";
import type { DesignImportPack } from "../services/design/designImportCatalog";
import type { Message } from "../lib/chatTypes";
import {
  applyUniversalStyleToDom,
  clearUniversalStylePreviewDomOnly,
  ensureTextColorPresetApplied,
  ensureUniversalStyleApplied,
} from "../services/design/universalStyleApply";
import { readUniversalStyleDomState } from "../services/design/designPreviewDom";
import { parseOwnerStylePrompt } from "../services/design/universalStyleEngine";
import {
  askDesignAi,
  applyDesignAiPatch,
} from "../services/design/designAiService";
import {
  isDefaultWallpaperConfig,
  loadUniversalStyleLocal,
  resetConfigWallpaperToDefault,
  saveUniversalStyleLocal,
  syncUniversalStyleToSupabase,
} from "../services/design/universalStyleStorage";
import { attachOverlaysToConfig } from "../services/design/designOverlayBundle";
import { flushDesignOverlaysSync } from "../services/design/designOverlaySync";
import { resetRemoteDesignThemePrefetch } from "../services/design/designThemeBoot";
import {
  createDefaultUniversalStyle,
  normalizeUniversalStyleConfig,
  type StyleSandboxSession,
  type UniversalStyleConfig,
} from "../services/design/universalStyleTypes";

const OWNER_ROOM_ID = "owner";
const STYLE_PROMPT_COOLDOWN_MS = 350;
const MAX_STYLE_SANDBOX_SESSIONS = 12;

export interface DesignCommitResult {
  ok: boolean;
  message: string;
  localOnly?: boolean;
  previewApplied?: boolean;
}

interface UseUniversalStyleEngineOptions {
  activeRoomId: string;
  isOwner: boolean;
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
  ownerSettingsRowId = "global",
  setOwnerBgImage,
  addLammaBotMessage,
  appendStyleSandboxMessage,
}: UseUniversalStyleEngineOptions) {
  const [committedConfig, setCommittedConfig] = useState<UniversalStyleConfig | null>(
    null,
  );
  const [hasPendingDesignPreview, setHasPendingDesignPreview] = useState(false);
  const [isApplyingStyle, setIsApplyingStyle] = useState(false);
  const previewMemoryRef = useRef<UniversalStyleConfig | null>(null);
  const previewSnapshotRef = useRef<UniversalStyleConfig | null>(null);
  const pendingImportPackRef = useRef<DesignImportPack | null>(null);
  const stylePromptCooldownRef = useRef(0);
  const applyInFlightRef = useRef(false);

  const resolveCommittedConfig = useCallback((): UniversalStyleConfig => {
    return normalizeUniversalStyleConfig(
      committedConfig ?? loadUniversalStyleLocal() ?? createDefaultUniversalStyle(),
    );
  }, [committedConfig]);

  /** Latest in-progress preview or last committed — for Design Center edits. */
  const getEditableDesignConfig = useCallback((): UniversalStyleConfig => {
    return normalizeUniversalStyleConfig(
      previewMemoryRef.current ??
        committedConfig ??
        loadUniversalStyleLocal() ??
        createDefaultUniversalStyle(),
    );
  }, [committedConfig]);

  const captureRollbackSnapshot = useCallback((): UniversalStyleConfig => {
    return structuredClone(resolveCommittedConfig());
  }, [resolveCommittedConfig]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { prefetchRemoteDesignTheme } = await import(
        "../services/design/designThemeBoot"
      );
      const loaded = await prefetchRemoteDesignTheme(ownerSettingsRowId);
      if (cancelled) return;
      setCommittedConfig(normalizeUniversalStyleConfig(loaded));
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerSettingsRowId]);

  /** ChatThemeGate applies the resolved theme before reveal; here we only sync text preset. */
  useLayoutEffect(() => {
    ensureTextColorPresetApplied();
  }, []);

  const beginLivePreview = useCallback(
    (config: UniversalStyleConfig): boolean => {
      if (!previewSnapshotRef.current) {
        previewSnapshotRef.current = captureRollbackSnapshot();
      }
      return ensureUniversalStyleApplied(config, { preview: true });
    },
    [captureRollbackSnapshot],
  );

  const rollbackLivePreview = useCallback(() => {
    cancelImportPackVisualPreview();
    pendingImportPackRef.current = null;
    const restore = structuredClone(
      previewSnapshotRef.current ?? captureRollbackSnapshot(),
    );
    previewSnapshotRef.current = null;

    applyUniversalStyleToDom(restore, { preview: false });
    clearUniversalStylePreviewDomOnly();
  }, [captureRollbackSnapshot]);

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
      pendingImportPackRef.current = parsed.importPack ?? null;
      if (parsed.importPack) {
        previewImportPackVisuals(parsed.importPack);
      }
      const prevFx = previous?.effects;
      const nextFx = parsed.config.effects;
      const intentChanged =
        Boolean(previous) &&
        (prevFx?.sidebarCardChase !== nextFx?.sidebarCardChase ||
          prevFx?.chatHeaderStyle !== nextFx?.chatHeaderStyle);
      if (intentChanged) {
        previewSnapshotRef.current = captureRollbackSnapshot();
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

      const botReply = parsed.summary.startsWith("📚")
        ? parsed.summary
        : parsed.summary.startsWith("📦")
          ? `${parsed.summary}\n\n👀 شوف الزجاج والبطاقات والألوان على الموقع.\n\n✅ «تطبيق على الكل» للحفظ | ✖ «إلغاء» للتراجع`
          : parsed.summary.startsWith("📖")
        ? parsed.summary
        : parsed.summary.startsWith("🎯")
          ? `${parsed.summary}\n\n👀 شوف التغيير على «${parsed.config.label}» في الموقع.\n\n✅ «تطبيق على الكل» للحفظ | ✖ «إلغاء / تعديل» للتراجع\n💡 اكتب «مصطلحات» لقائمة أجزاء الشات`
          : parsed.summary.startsWith("↩️")
            ? `${parsed.summary}\n\n👀 المفروض تشوف /MAN.png رجعت. ✅ «تطبيق على الكل» للحفظ | ✖ «إلغاء» للتراجع`
          : parsed.config.effects?.sidebarCardChase
        ? `🎨 ${parsed.summary}\n\n👀 بص على الأعمدة الجانبية (VIP، الراديو، الغرف) — المفروض تشوف شريط النور بيلف حوالين كل بطاقة.\n\n✅ «تطبيق على الكل» للحفظ | ✖ «إلغاء / تعديل» للتراجع\n💡 بعد كده عدّل: «أبطأ» أو «أسرع» أو «لون أخضر»`
        : parsed.config.effects?.chatHeaderStyle &&
            parsed.config.effects.chatHeaderStyle !== "none"
          ? `🎨 ${parsed.summary}\n\n👀 بص على الشريط العلوي للموقع وهيدر الغرفة.\n\n✅ «تطبيق على الكل» للحفظ | ✖ «إلغاء / تعديل» للتراجع\n💡 طلب جديد مختلف؟ اكتبه مباشرة — البوت هيبدأ من جديد.`
        : parsed.refined
        ? `🎨 تم تحديث المعاينة على الموقع + بطاقة الشات.\n${parsed.summary}\n\n✅ اضغط «تطبيق على الكل» للحفظ للجميع، أو «إلغاء / تعديل» للتراجع.`
        : `🎨 شغّلت معاينة حية لستايل «${parsed.config.label}» — شوف الموقع والبطاقة تحت رسالتك.\n${parsed.summary}\n\n✅ «تطبيق على الكل» = حفظ | ✖ «إلغاء / تعديل» = تراجع`;

      appendStyleSandboxMessage(activeRoomId, session, botReply);

      // NOTE: Gemini no longer auto-overrides the deterministic preview here.
      // The rule-based result is predictable (what you ask = what you get).
      // AI is opt-in via Design Center → «تحكم مباشر» → ✨ Gemini box.

      return true;
    },
    [
      activeRoomId,
      addLammaBotMessage,
      appendStyleSandboxMessage,
      beginLivePreview,
      captureRollbackSnapshot,
      committedConfig,
      isOwner,
    ],
  );

  const applyStyleGlobally = useCallback(
    async (
      session: StyleSandboxSession,
      options?: { silent?: boolean },
    ): Promise<DesignCommitResult> => {
      if (session.applied || applyInFlightRef.current) {
        return { ok: false, message: "عملية حفظ أخرى شغّالة — انتظر ثانية." };
      }
      applyInFlightRef.current = true;
      setIsApplyingStyle(true);

      try {
        const access = await checkOwnerWriteAccessWithClaim();
        const merged = attachOverlaysToConfig(
          normalizeUniversalStyleConfig(session.config),
        );

        setCommittedConfig(merged);
        saveUniversalStyleLocal(merged);
        clearUniversalStylePreviewDomOnly();
        ensureUniversalStyleApplied(merged, { preview: false });
        previewSnapshotRef.current = null;
        previewMemoryRef.current = merged;

        if (pendingImportPackRef.current) {
          commitImportPackVisuals(pendingImportPackRef.current);
          pendingImportPackRef.current = null;
        }

        if (setOwnerBgImage && isDefaultWallpaperConfig(merged)) {
          setOwnerBgImage(null);
        }

        if (!access.ok) {
          const msg = formatOwnerWriteDeniedMessage(access.reason);
          if (!options?.silent) {
            addLammaBotMessage(activeRoomId, msg);
          }
          return {
            ok: false,
            message: msg,
            localOnly: true,
          };
        }

        await syncUniversalStyleToSupabase(merged, ownerSettingsRowId);
        resetRemoteDesignThemePrefetch();

        const successMsg = isDefaultWallpaperConfig(merged)
          ? "✅ رجّعت الخلفية الافتراضية (/MAN.png) للجميع."
          : `✅ تم حفظ «${merged.label}» على السيرفر — كل المستخدمين هيشوفوه.`;

        if (!options?.silent) {
          addLammaBotMessage(activeRoomId, successMsg);
        }
        return { ok: true, message: successMsg };
      } catch (error) {
        console.warn("[UniversalStyle] apply failed:", error);
        const msg =
          error instanceof Error ? error.message : "خطأ غير معروف";
        const formatted = formatOwnerWriteDeniedMessage(msg);
        if (!options?.silent) {
          addLammaBotMessage(activeRoomId, formatted);
        }
        return {
          ok: false,
          message: formatted,
          localOnly: true,
        };
      } finally {
        applyInFlightRef.current = false;
        setIsApplyingStyle(false);
      }
    },
    [activeRoomId, addLammaBotMessage, ownerSettingsRowId, setOwnerBgImage],
  );

  const resetChatBackgroundToDefault = useCallback(async (): Promise<boolean> => {
    if (applyInFlightRef.current) return false;
    applyInFlightRef.current = true;

    try {
      previewSnapshotRef.current = null;
      previewMemoryRef.current = null;
      const config = resetConfigWallpaperToDefault(resolveCommittedConfig());
      setCommittedConfig(config);
      saveUniversalStyleLocal(config);
      clearUniversalStylePreviewDomOnly();
      applyUniversalStyleToDom(config, { preview: false });
      if (setOwnerBgImage) setOwnerBgImage(null);

      await syncUniversalStyleToSupabase(config, ownerSettingsRowId);
      return true;
    } catch (error) {
      console.warn("[UniversalStyle] reset wallpaper failed:", error);
      return false;
    } finally {
      applyInFlightRef.current = false;
    }
  }, [ownerSettingsRowId, resolveCommittedConfig, setOwnerBgImage]);

  const cancelStyleSandbox = useCallback(
    (sandboxId?: string) => {
      rollbackLivePreview();
      previewMemoryRef.current = null;
      setHasPendingDesignPreview(false);
      setDesignPreviewActive(false);
      addLammaBotMessage(
        activeRoomId,
        sandboxId
          ? "↩️ تم إلغاء المعاينة وإرجاع الموقع. اكتب طلب جديد (مثلاً: خلّي الأزرار أكثر استدارة)."
          : "↩️ تم إلغاء آخر معاينة.",
      );
    },
    [activeRoomId, addLammaBotMessage, rollbackLivePreview],
  );

  const previewDesignConfig = useCallback(
    (
      config: UniversalStyleConfig,
    ): { summary: string; config: UniversalStyleConfig; previewApplied: boolean } | null => {
      if (!isOwner) return null;
      previewMemoryRef.current = config;
      if (!previewSnapshotRef.current) {
        previewSnapshotRef.current = captureRollbackSnapshot();
      }
      const previewApplied = beginLivePreview(config);
      setHasPendingDesignPreview(true);
      setDesignPreviewActive(true);
      return { summary: config.label, config, previewApplied };
    },
    [beginLivePreview, captureRollbackSnapshot, isOwner],
  );

  const previewDesignPrompt = useCallback(
    (rawPrompt: string): { summary: string; config: UniversalStyleConfig } | null => {
      if (!isOwner) return null;

      const trimmed = rawPrompt.trim();
      if (!trimmed) return null;

      const previous = previewMemoryRef.current || committedConfig;
      const parsed = parseOwnerStylePrompt(trimmed, previous);
      previewMemoryRef.current = parsed.config;
      beginLivePreview(parsed.config);
      setHasPendingDesignPreview(true);
      setDesignPreviewActive(true);
      return { summary: parsed.summary, config: parsed.config };
    },
    [beginLivePreview, committedConfig, isOwner],
  );

  /**
   * Async variant: sends the prompt to Gemini Flash, applies the AI patch,
   * and live-previews the result. Falls back to the rule-based parser on error.
   */
  const previewDesignPromptAi = useCallback(
    async (
      rawPrompt: string,
    ): Promise<{ summary: string; config: UniversalStyleConfig; fromAi: boolean } | null> => {
      if (!isOwner) return null;
      const trimmed = rawPrompt.trim();
      if (!trimmed) return null;

      const previous = normalizeUniversalStyleConfig(
        previewMemoryRef.current || committedConfig,
      );

      const aiResult = await askDesignAi(trimmed, previous);

      if (aiResult.hasChanges) {
        const patched = applyDesignAiPatch(previous, aiResult.patch);
        patched.promptHistory = [...(previous.promptHistory ?? []), trimmed].slice(-20);
        previewMemoryRef.current = patched;
        beginLivePreview(patched);
        setHasPendingDesignPreview(true);
        setDesignPreviewActive(true);
        return { summary: aiResult.summary, config: patched, fromAi: true };
      }

      // Fallback to rule-based parser
      const parsed = parseOwnerStylePrompt(trimmed, previous);
      previewMemoryRef.current = parsed.config;
      beginLivePreview(parsed.config);
      setHasPendingDesignPreview(true);
      setDesignPreviewActive(true);
      return { summary: parsed.summary, config: parsed.config, fromAi: false };
    },
    [beginLivePreview, committedConfig, isOwner],
  );

  const commitPendingDesignPreview = useCallback(async (): Promise<DesignCommitResult> => {
    const config = previewMemoryRef.current;
    if (!config || !isOwner) {
      return { ok: false, message: "لا توجد معاينة للحفظ." };
    }

    const session: StyleSandboxSession = {
      id: `inspect-${Date.now()}`,
      createdAt: Date.now(),
      prompt: "design-center",
      summary: config.label || "مركز التصميم",
      config,
      applied: false,
    };

    const result = await applyStyleGlobally(session, { silent: true });
    if (result.ok) {
      setHasPendingDesignPreview(false);
      setDesignPreviewActive(false);
    }
    return result;
  }, [applyStyleGlobally, isOwner]);

  /** Flush pending colors + shape overlays before closing design UI or leaving page. */
  const flushAllDesignPersistence = useCallback(async (): Promise<DesignCommitResult> => {
    let colorResult: DesignCommitResult | null = null;
    if (previewMemoryRef.current) {
      colorResult = await commitPendingDesignPreview();
    }
    try {
      await flushDesignOverlaysSync(ownerSettingsRowId);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "فشل حفظ إعدادات الشكل";
      const formatted = formatOwnerWriteDeniedMessage(msg);
      return (
        colorResult ?? {
          ok: false,
          message: formatted,
          localOnly: true,
        }
      );
    }
    if (colorResult && !colorResult.ok) {
      return colorResult;
    }
    return {
      ok: true,
      message:
        colorResult?.message ?? "✅ تم حفظ إعدادات الشكل على السيرفر.",
    };
  }, [commitPendingDesignPreview, ownerSettingsRowId]);

  useEffect(() => {
    if (!isOwner || typeof window === "undefined") return;
    const onPageHide = () => {
      void flushAllDesignPersistence();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [flushAllDesignPersistence, isOwner]);

  const verifyDesignPreviewDom = useCallback((): DesignCommitResult => {
    const state = readUniversalStyleDomState();
    if (!state) {
      return {
        ok: false,
        message: "⚠️ شاشة الشات مش جاهزة — افتح غرفة شات عادية (مش القيادة فقط).",
        previewApplied: false,
      };
    }
    if (!state.shellReady) {
      return {
        ok: false,
        message: "⚠️ محرك التصميم مش متصل بالشات بعد.",
        previewApplied: false,
      };
    }
    if (hasPendingDesignPreview && !state.preview) {
      return {
        ok: false,
        message: "⚠️ المعاينة لم تصل للشاشة — جرّب refresh أو غرفة شات.",
        previewApplied: false,
      };
    }
    return {
      ok: true,
      message: state.preview
        ? "👀 المعاينة شغّالة على الشات — اضغط حفظ للجميع."
        : "✅ التصميم مطبّق على الشات.",
      previewApplied: state.preview,
    };
  }, [hasPendingDesignPreview]);

  const cancelPendingDesignPreview = useCallback(() => {
    rollbackLivePreview();
    previewMemoryRef.current = null;
    setHasPendingDesignPreview(false);
    setDesignPreviewActive(false);
  }, [rollbackLivePreview]);

  return {
    committedConfig,
    getEditableDesignConfig,
    tryHandleOwnerStylePrompt,
    applyStyleGlobally,
    cancelStyleSandbox,
    resetChatBackgroundToDefault,
    previewDesignPrompt,
    previewDesignPromptAi,
    previewDesignConfig,
    commitPendingDesignPreview,
    cancelPendingDesignPreview,
    flushAllDesignPersistence,
    verifyDesignPreviewDom,
    hasPendingDesignPreview,
    isApplyingStyle,
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
