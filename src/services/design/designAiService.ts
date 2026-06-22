/**
 * Design AI Service — client side
 * Calls /api/gemini-design to translate natural-language prompts into
 * UniversalStyleConfig patches. Falls back gracefully if the API is
 * unavailable (network error, missing key, etc.).
 */

import type { UniversalStyleConfig } from "./universalStyleTypes";

export interface DesignAiPatch {
  palette?: Partial<UniversalStyleConfig["palette"]>;
  glass?: Partial<UniversalStyleConfig["glass"]>;
  buttons?: Partial<UniversalStyleConfig["buttons"]>;
  inputs?: Partial<UniversalStyleConfig["inputs"]>;
}

export interface DesignAiResult {
  summary: string;
  patch: DesignAiPatch;
  /** true when Gemini actually understood and returned changes */
  hasChanges: boolean;
  /** true when the call failed or timed out */
  error?: string;
}

const ENDPOINT = "/api/gemini-design";
const TIMEOUT_MS = 12_000;

/**
 * Ask Gemini to parse a natural-language design command.
 * Always resolves — never throws.
 */
export async function askDesignAi(
  prompt: string,
  currentConfig?: UniversalStyleConfig | null,
): Promise<DesignAiResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        currentConfig: currentConfig
          ? {
              glass: currentConfig.glass,
              palette: {
                accent: currentConfig.palette.accent,
                bg: currentConfig.palette.bg,
              },
            }
          : undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({})) as { error?: string; status?: number };
      const msg = errData.error ?? `خطأ ${res.status}`;
      return {
        summary: msg,
        patch: {},
        hasChanges: false,
        error: msg,
      };
    }

    const data = (await res.json()) as { summary: string; patch: DesignAiPatch };
    const hasChanges = Object.keys(data.patch ?? {}).length > 0;
    return {
      summary: data.summary ?? "",
      patch: data.patch ?? {},
      hasChanges,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error)?.name === "AbortError";
    return {
      summary: isAbort ? "⏳ انتهت مهلة Gemini" : "❌ خطأ في الاتصال",
      patch: {},
      hasChanges: false,
      error: isAbort ? "timeout" : String(err),
    };
  }
}

/**
 * Apply a Gemini patch on top of an existing UniversalStyleConfig.
 * Returns a new config object (no mutation).
 */
export function applyDesignAiPatch(
  base: UniversalStyleConfig,
  patch: DesignAiPatch,
): UniversalStyleConfig {
  return {
    ...base,
    palette: patch.palette ? { ...base.palette, ...patch.palette } : base.palette,
    glass: patch.glass ? { ...base.glass, ...patch.glass } : base.glass,
    buttons: patch.buttons ? { ...base.buttons, ...patch.buttons } : base.buttons,
    inputs: patch.inputs ? { ...base.inputs, ...patch.inputs } : base.inputs,
  };
}
