# إعداد TURN للمكالمات على Vercel

> **بدون دفع؟** راجع [`FREE_CALLS_AR.md`](./FREE_CALLS_AR.md) — Open Relay مجاني مضبوط على Production.

المكالمات تحتاج **STUN + TURN** خلف NAT. **STUN مجاني دائماً**؛ **TURN** إما relay مجاني (Open Relay) أو سيرفرك (coturn).

## الخيار المجاني (مفعّل حالياً على Production)

| Variable | القيمة |
|----------|--------|
| `VITE_TURN_URL` | `turn:openrelay.metered.ca:443,turn:openrelay.metered.ca:80` |
| `VITE_TURN_USERNAME` | `openrelayproject` |
| `VITE_TURN_CREDENTIAL` | `openrelayproject` |

حد تقريبي ~50 GB/شهر — كافي لمعظم التطبيقات الصغيرة/المتوسطة.

## ترقية مجانية (أفضل جودة — coturn)

Oracle Always Free + coturn — خطوات كاملة في **`FREE_CALLS_AR.md`**.

## ترقية مدفوعة (اختياري)

- [Metered.ca TURN](https://www.metered.ca/stun-turn) — عند تجاوز حدود المجاني

## Redeploy

متغيرات `VITE_*` تُدمَج وقت الـ build فقط → بعد أي تغيير: **Redeploy**.

## تحقق

مكالمة من Wi‑Fi + 4G — في الواجهة: **`Google STUN + relay مجاني`** أو **`+ TURN-1`** إذا coturn خاص.
