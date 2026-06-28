# Lamma Chat | شات لمة

تطبيق دردشة عربي مبني باستخدام `React` و`TypeScript` و`Vite`، ويعتمد على `Supabase`
للمصادقة، قاعدة البيانات، الرسائل الفورية، ورفع الوسائط. المشروع مهيأ كذلك للعمل
كتطبيق `PWA` وللنشر على `Vercel`.

**Production:** https://lamma-arabic-chat-room.vercel.app

## التقنيات الأساسية

- `React 19`
- `TypeScript`
- `Vite`
- `Supabase`
- `Tailwind CSS v4`
- `Motion`

## التشغيل المحلي

### المتطلبات

- `Node.js` 20+
- `npm`

### 1. تثبيت الاعتماديات

```bash
npm install
```

### 2. إعداد متغيرات البيئة

انسخ `.env.example` إلى `.env.local` وأضف القيم:

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
VITE_APP_URL="http://localhost:5173"
VITE_ENABLE_PWA="false"
VITE_GEMINI_SEARCH_ENDPOINT=""
VITE_BRAND_NAME="Lamma Chat"
VITE_BRAND_CREDIT="Your Name"
VITE_LOGIN_HERO_BG="/images/login-hero.jpg"
```

ملاحظات:

- `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` مطلوبان للمصادقة والرسائل والوسائط.
- على **Vercel** ضع نفس المتغيرات + `VITE_APP_URL=https://lamma-arabic-chat-room.vercel.app`.
- `VITE_ENABLE_PWA` معطّل محلياً؛ الإنتاج يفعّله `vercel.json` تلقائياً.
- `VITE_GEMINI_SEARCH_ENDPOINT` اختياري.
- WebRTC TURN اختياري — انظر `.env.example`.

### 3. تشغيل بيئة التطوير

```bash
npm run dev
```

يفتح على `http://localhost:5173` (أو المنفذ التالي لو 5173 مشغول).

> مسارات `api/*` لا تعمل مع Vite dev — تحتاج Vercel. التطبيق في `src/` يقرأ env مباشرة.

### 4. بناء نسخة الإنتاج

```bash
npm run build
```

### 5. معاينة نسخة الإنتاج

```bash
npm run preview
```

### 6. فحص TypeScript

```bash
npm run lint
```

### 7. التحقق من الإنتاج

```bash
npm run verify:all
```

أو خطوة بخطوة:

```bash
npm run verify:hardening   # RLS + أمان Supabase
npm run verify:live        # homepage + public_chat_settings + RPC
npm run verify:smoke       # bundle UX + قراءة رسائل + منع insert
```

يتطلب `.env.local` مع `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`.

على GitHub Actions: أضف نفس المتغيرين كـ repository secrets لتفعيل job `verify-production` على `main`. راجع `.github/SECRETS_SETUP.md`.

### 8. ESLint

```bash
npm run lint:eslint
```

## Cursor Cloud Agents

- إعداد البيئة: `.cursor/environment.json`
- دليل الـ AI: `AGENTS.md`
- قواعد المشروع: `.cursor/rules/lamma-project.mdc`
- Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`

## هيكل المشروع

```text
api/                 دوال Vercel (sitemap)
public/              ملفات ثابتة و PWA
scripts/             إعداد production (Supabase hardening)
src/
  components/        شاشات ومكونات الواجهة
  hooks/             React hooks
  lib/               أنواع، ثوابت، Supabase client
  services/          منطق الأعمال (chat, calls, auth, store)
  App.tsx            منسق التطبيق والجلسة
  main.tsx           نقطة الدخول
supabase-schema.sql          جداول وسياسات
supabase-storage.sql         bucket الوسائط
supabase-production-hardening.sql          RLS إضافي
supabase-participation-hardening.sql       حظر/invite/calls على السيرفر
supabase-private-media.sql                 bucket خاص للوسائط الحساسة
vercel.json                  إعدادات النشر
AGENTS.md                    دليل AI agents
```

## مراجع مهمة

- `AGENTS.md` — دليل Cloud Agents والـ env
- `CODE_WIKI.md` — معمارية (راجع «تحديثات 2026»)
- `supabase-schema.sql` — قاعدة البيانات
- `.env.example` — قالب البيئة

## النشر

```bash
npx vercel --prod --yes
```

أو setup Supabase كامل:

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-production-setup.mjs
```

## حالة التشغيل

- `npm install` ✓
- `npm run lint` ✓
- `npm run build` ✓
- `npm run dev` ✓

بدون Supabase env vars التطبيق يقلع بوضع محدود (بدون auth/شات كامل).
