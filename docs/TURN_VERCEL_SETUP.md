# إعداد TURN للمكالمات على Vercel

المكالمات الصوتية/المرئية تحتاج **STUN + TURN** للعمل خلف NAT وشبكات الجوال. بدون TURN إنتاجي، المكالمات قد تفشل لجزء من المستخدمين.

## 1) احصل على خادم TURN

خيارات شائعة:

- [Metered.ca Open Relay](https://www.metered.ca/tools/openrelay/) — مجاني للتجربة (محدود)
- [Metered.ca TURN](https://www.metered.ca/stun-turn) — مدفوع للإنتاج
- Twilio Network Traversal / Cloudflare Calls TURN — حسب ميزانيتك

سجّل **URL + username + credential** من لوحة المزود.

## 2) أضف المتغيرات في Vercel

1. افتح [Vercel Dashboard](https://vercel.com) → مشروع **lamma-arabic-chat-room**
2. **Settings** → **Environment Variables**
3. أضف للبيئات **Production** و **Preview**:

| Variable | مثال | Sensitive |
|----------|------|-----------|
| `VITE_TURN_URL` | `turn:global.relay.metered.ca:443` | No |
| `VITE_TURN_USERNAME` | من لوحة Metered | **Yes** |
| `VITE_TURN_CREDENTIAL` | من لوحة Metered | **Yes** |
| `VITE_TURN_URL_2` | (اختياري) خادم احتياطي | No |
| `VITE_TURN_USERNAME_2` | (اختياري) | **Yes** |
| `VITE_TURN_CREDENTIAL_2` | (اختياري) | **Yes** |

4. **Redeploy** المشروع (Deployments → ⋮ → Redeploy) — متغيرات `VITE_*` تُدمَج وقت البناء فقط.

## 3) CLI (بديل)

```bash
vercel env add VITE_TURN_URL production
vercel env add VITE_TURN_USERNAME production
vercel env add VITE_TURN_CREDENTIAL production
vercel --prod
```

## 4) تحقق

بعد النشر، افتح المكالمة من جهازين على شبكات مختلفة (مثلاً Wi‑Fi + 4G). في واجهة المكالمة يظهر اسم السيرفر — إذا رأيت **`+ TURN-1`** فالإعداد يعمل.

## 5) السلوك في الكود

- إذا **`VITE_TURN_URL`** موجود → يُستخدم TURN الإنتاجي و**لا** يُستخدم relay العام المشترك.
- إذا غير موجود → fallback على relay عام (مناسب للتطوير فقط).

راجع أيضاً `.env.example` للتطوير المحلي.
