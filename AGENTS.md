# AGENTS.md — Lamma Chat | شات لمة

دليل للـ AI Agents (محلي + Cursor Cloud Agents).

## المشروع

| | |
|---|---|
| **الاسم** | Lamma Chat \| شات لمة |
| **Stack** | React 19, TypeScript, Vite, Tailwind v4, Supabase, Motion |
| **Production URL** | https://lamma-arabic-chat-room.vercel.app |
| **GitHub** | https://github.com/mosamy19921992-art/lamma-chat2026 |
| **Vercel project** | `lamma-arabic-chat-room` |
| **Supabase ref** | `detvapbvkabvdjsdttfy` |

> **تحذير:** اسم الريبو على GitHub `lamma-chat2026` — ده مش URL النشر. الموقع الحي على `lamma-arabic-chat-room.vercel.app`.

## Cursor Cloud specific instructions

### 1. Secrets (Dashboard → Cloud Agents → Environment → Secrets)

أضفهم كـ environment-scoped secrets قبل أي مهمة تحتاج شات/auth:

```env
VITE_SUPABASE_URL=https://detvapbvkabvdjsdttfy.supabase.co
VITE_SUPABASE_ANON_KEY=<from Supabase dashboard>
VITE_APP_URL=https://lamma-arabic-chat-room.vercel.app
```

للتطوير المحلي داخل الـ cloud VM، استخدم:

```env
VITE_APP_URL=http://localhost:5173
```

### 2. Bootstrap

```bash
npm install
cp .env.example .env.local   # ثم املأ القيم من Secrets
npm run lint
npm run build
```

### 3. Dev server

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

- مسارات `api/*` (مثل `/api/auth-config`) **لا تعمل** مع Vite dev — تحتاج Vercel أو `vercel dev`.
- التطبيق React الرئيسي في `src/` يقرأ `VITE_*` مباشرة من env.

### 4. Network access

الـ Cloud Agent يحتاج الوصول لـ:

- `*.supabase.co` (HTTPS + WSS)
- `*.vercel.app` (لو بتختبر production)

### 5. بعد أي تعديل

```bash
npm run lint && npm run build
```

### 6. قواعد التعديل

- **لا** ميزات جديدة بدون إذن المستخدم
- **لا** تغيير هوية/شعار/ألوان `src/index.css` بدون إذن
- **لا** تعديل `src/lib/*` أو `src/hooks/*` بدون موافقة
- **لا** commit/push إلا بطلب صريح

## متغيرات البيئة

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes (full app) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes (full app) | Public anon key |
| `VITE_APP_URL` | Yes (OAuth) | Production: `https://lamma-arabic-chat-room.vercel.app` |
| `VITE_ENABLE_PWA` | No | `false` locally; Vercel sets `true` in production via `vercel.json` |
| `VITE_GEMINI_SEARCH_ENDPOINT` | No | Optional smart search |
| `VITE_BRAND_NAME` | No | Branding |
| `VITE_BRAND_CREDIT` | No | Branding |
| `VITE_LOGIN_HERO_BG` | No | Login hero image path |
| `VITE_TURN_URL` | No | Optional custom TURN for WebRTC |
| `VITE_TURN_USERNAME` | No | With TURN |
| `VITE_TURN_CREDENTIAL` | No | With TURN |

## هيكل المشروع

```text
api/                    Vercel serverless (auth-config, sitemap)
public/                 Static + PWA assets
scripts/                Production setup helpers
src/
  components/           UI (ChatScreen, LoginScreen, modals, pwa)
  hooks/                React hooks (approval needed to edit)
  lib/                  Types, constants, Supabase client (approval needed)
  services/             Supabase/WebRTC business logic
  App.tsx               Session orchestrator
  main.tsx              Entry point
supabase-*.sql          Database schema, storage, hardening
vercel.json             Deploy config + CSP headers
.cursor/
  environment.json      Cloud Agent environment recipe
  rules/lamma-project.mdc  Project rules for AI
```

## Supabase setup (production)

1. Run `supabase-schema.sql` + `supabase-storage.sql`
2. Run `supabase-production-hardening.sql`
3. Or use: `SUPABASE_ACCESS_TOKEN=... node scripts/apply-production-setup.mjs`

## أوامر سريعة

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
npx vercel --prod --yes
```

## توثيق إضافي

- `README.md` — تشغيل محلي
- `CODE_WIKI.md` — معمارية (راجع قسم «تحديثات 2026» في الأعلى)
- `NOTES.md` — سجل جلسات وميزات
- `.env.example` — قالب env
