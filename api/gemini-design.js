/**
 * Vercel Serverless Function — /api/gemini-design
 * Translates a natural-language design command into a UniversalStyleConfig patch.
 * GEMINI_API_KEY stays server-side; callers must present a valid Supabase JWT.
 */

import {
  checkRateLimit,
  getClientIp,
  sanitizeDesignPatch,
  sanitizeSummaryText,
  verifySupabaseJwt,
} from "./_lib/apiSecurity.js";

const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

const MAX_PROMPT_LEN = 500;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function geminiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const SYSTEM_PROMPT = `أنت مساعد تصميم واجهات لتطبيق شات اسمه "لمة". 
مهمتك: تحليل أمر التصميم وإرجاع JSON مباشرة (بدون markdown أو شرح).

الـ JSON يجب أن يكون بهذا الشكل بالضبط:
{
  "summary": "وصف قصير جداً لما تغيّر",
  "patch": {
    "palette": { "bg": "#hex", "accent": "#hex", "accent2": "#hex", "text": "#hex", "muted": "#hex", "surface": "rgba(...)" },
    "glass": { "blurPx": 8-40, "opacity": 0.05-0.4, "borderOpacity": 0.05-0.3 },
    "buttons": { "radiusPx": 4-28, "glow": true/false, "neon": true/false },
    "inputs": { "radiusPx": 4-24, "borderOpacity": 0.05-0.3 }
  }
}

قواعد:
- أرجع فقط الـ fields التي يجب تغييرها (لا تضع كل الـ fields).
- palette.surface = rgba(r,g,b,opacity) — لون سطح الزجاج.
- glass.opacity: شفافية الزجاج — كلما كان أكبر كلما كان أغمق.
- إذا الأمر عن "شفافية/شفاف" → قلل glass.opacity (e.g. 0.06).
- إذا الأمر عن "تعتيم/غامق/داكن" → زود glass.opacity (e.g. 0.28).
- إذا الأمر عن ألوان → غيّر palette فقط.
- إذا الأمر عن زوايا/أزرار → غيّر buttons.radiusPx.
- إذا مفيش أمر تصميم واضح → أرجع {"summary":"لم أفهم الأمر","patch":{}}.
- لا تضع شرح أو markdown — فقط JSON نقي.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`gemini:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return res.status(429).json({ error: "طلبات كثيرة — انتظر دقيقة وحاول تاني" });
  }

  const user = await verifySupabaseJwt(req);
  if (!user) {
    return res.status(401).json({ error: "يجب تسجيل الدخول لاستخدام تصميم AI" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Gemini API key not configured" });
  }

  const { prompt, currentConfig } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt required" });
  }

  const safePrompt = String(prompt.trim()).slice(0, MAX_PROMPT_LEN);
  if (!safePrompt) {
    return res.status(400).json({ error: "prompt required" });
  }

  const userContent = currentConfig
    ? `الأمر: "${safePrompt}"\n\nالإعدادات الحالية:\nglass.opacity=${currentConfig.glass?.opacity ?? 0.12}, glass.blurPx=${currentConfig.glass?.blurPx ?? 18}, accent="${currentConfig.palette?.accent ?? "#10b981"}"`
    : `الأمر: "${safePrompt}"`;

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let geminiRes = null;
  let usedModel = null;

  try {
    for (const model of GEMINI_MODELS) {
      geminiRes = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: requestBody,
      });
      if (geminiRes.ok || (geminiRes.status !== 429 && geminiRes.status !== 404)) {
        usedModel = model;
        break;
      }
      console.warn(`Model ${model} returned ${geminiRes.status}, trying next...`);
    }

    if (!geminiRes || !geminiRes.ok) {
      const status = geminiRes?.status ?? 0;
      console.error("Gemini all models failed:", status);
      const isAuth = status === 401 || status === 403;
      return res.status(502).json({
        error: isAuth
          ? "🔑 خطأ في مفتاح Gemini — تواصل مع المالك"
          : "⏳ Gemini مشغول دلوقتي — جرّب تاني بعد شوية",
      });
    }

    console.log("Gemini ok via model:", usedModel, "user:", user.id);
    const data = await geminiRes.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const rawText = String(parts.map((p) => p?.text ?? "").join("")).trim() || "{}";

    const cleaned = String(rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")).trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "خطأ في التحليل", patch: {} };
    }

    return res.status(200).json({
      summary: sanitizeSummaryText(parsed.summary ?? ""),
      patch: sanitizeDesignPatch(parsed.patch ?? {}),
    });
  } catch (err) {
    console.error("gemini-design error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
