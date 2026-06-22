/**
 * Vercel Serverless Function — /api/gemini-design
 * Translates a natural-language design command (Arabic/English) into
 * a structured UniversalStyleConfig patch using Gemini Flash.
 *
 * The GEMINI_API_KEY env var is kept server-side and never exposed to the browser.
 */

const GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
];

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API key not configured" });
  }

  const { prompt, currentConfig } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt required" });
  }

  const userContent = currentConfig
    ? `الأمر: "${prompt}"\n\nالإعدادات الحالية:\nglass.opacity=${currentConfig.glass?.opacity ?? 0.12}, glass.blurPx=${currentConfig.glass?.blurPx ?? 18}, accent="${currentConfig.palette?.accent ?? "#10b981"}"`
    : `الأمر: "${prompt}"`;

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
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
      const errText = geminiRes ? await geminiRes.text() : "no response";
      const status = geminiRes?.status ?? 0;
      console.error("Gemini all models failed:", status, errText);
      const isAuth = status === 401 || status === 403;
      return res.status(502).json({
        error: isAuth
          ? "🔑 خطأ في مفتاح Gemini — تواصل مع المالك"
          : "⏳ Gemini مشغول دلوقتي — جرّب تاني بعد شوية",
        status,
        detail: errText.slice(0, 300),
      });
    }

    console.log("Gemini ok via model:", usedModel);
    const data = await geminiRes.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const rawText = parts.map((p) => p?.text ?? "").join("").trim() || "{}";

    // Strip optional markdown code fences (```json ... ```)
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "خطأ في التحليل", patch: {} };
    }

    return res.status(200).json({
      summary: parsed.summary ?? "",
      patch: parsed.patch ?? {},
    });
  } catch (err) {
    console.error("gemini-design error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
