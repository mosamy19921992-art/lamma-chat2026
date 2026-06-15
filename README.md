# Lamma Chat | شات لمة

تطبيق دردشة عربي مبني باستخدام `React` و`TypeScript` و`Vite`، ويعتمد على `Supabase`
للمصادقة، قاعدة البيانات، الرسائل الفورية، ورفع الوسائط. المشروع مهيأ كذلك للعمل
كتطبيق `PWA` وللنشر على `Vercel`.

## التقنيات الأساسية

- `React 19`
- `TypeScript`
- `Vite`
- `Supabase`
- `Tailwind CSS v4`
- `Motion`

## التشغيل المحلي

### المتطلبات

- `Node.js`
- `npm`

### 1. تثبيت الاعتماديات

```bash
npm install
```

### 2. إعداد متغيرات البيئة

أنشئ ملف `.env.local` أو `.env` اعتماداً على `.env.example`، وأضف القيم التالية:

```env
VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
VITE_APP_URL="http://localhost:5173"
VITE_ENABLE_PWA="false"
VITE_GEMINI_SEARCH_ENDPOINT=""
VITE_BRAND_NAME="Lamma Chat"
VITE_BRAND_CREDIT="Your Name"
VITE_LOGIN_HERO_BG="/images/login-hero.jpg"
```

ملاحظات:

- `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` مطلوبان لتشغيل المصادقة والرسائل
  والوسائط بشكل كامل.
- `VITE_ENABLE_PWA` معطّل افتراضياً لتجنب مشاكل الكاش القديمة بعد إعادة النشر.
  فعّله فقط إذا كنت تحتاج تثبيت التطبيق والعمل دون اتصال.
- `VITE_GEMINI_SEARCH_ENDPOINT` اختياري.
- المشروع لا يعتمد حالياً على `GEMINI_API_KEY` كمتطلب أساسي للتشغيل المحلي.

### 3. تشغيل بيئة التطوير

```bash
npm run dev
```

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

ملاحظة: أمر `lint` هنا ينفذ `tsc --noEmit`، وليس `ESLint`.

## هيكل المشروع

```text
api/                 دوال سيرفر بسيطة مخصصة للنشر
public/              ملفات ثابتة وملفات PWA
src/
  components/        شاشات ومكونات الواجهة
  hooks/             hooks عامة مثل الثيم و service worker
  lib/               أنواع وثوابت ومساعدات وتكامل Supabase
  App.tsx            منسق التطبيق والجلسة
  main.tsx           نقطة الدخول
supabase-schema.sql  جداول وسياسات قاعدة البيانات
supabase-storage.sql إعداد bucket الوسائط
vercel.json          إعدادات النشر والرؤوس الأمنية
```

## مراجع مهمة

- التوثيق المعماري الكامل: `CODE_WIKI.md`
- تعريف قاعدة البيانات: `supabase-schema.sql`
- مثال البيئة: `.env.example`

## حالة التشغيل الحالية

تم التحقق عملياً من التالي داخل هذا المستودع:

- `npm install` يعمل بنجاح
- `npm run lint` ينجح
- `npm run build` ينجح
- `npm run dev` يقلع محلياً

لكن توجد ملاحظتان مهمتان قبل الاعتماد على إطلاق كامل للإنتاج:

- بدون ضبط متغيرات `Supabase` سيعمل التطبيق بوضع ناقص الوظائف فقط
- ظهرت ملاحظة runtime مرتبطة بالثيمات في المتصفح أثناء فحص الإقلاع، لذلك يفضّل
  مراجعة منطق الثيمات قبل اعتماد الإطلاق النهائي
