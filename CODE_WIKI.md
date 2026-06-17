# Code Wiki

مرجع تقني منظم لمشروع `Lamma Chat | شات لمة`.

## تحديثات 2026 (اقرأ أولاً)

هذا الملف فيه أقسام قديمة. **المصادر الأحدث:**

| الموضوع | المصدر الصحيح |
|---|---|
| Production URL | `https://lamma-arabic-chat-room.vercel.app` |
| Cloud Agents / env | `AGENTS.md`, `.cursor/environment.json` |
| تشغيل محلي | `README.md`, `.env.example` |
| قواعد AI | `.cursor/rules/lamma-project.mdc` |

**تغييرات معمارية منذ كتابة الأقسام القديمة:**

- الثيم: `useTheme.ts` و `themes.ts` **اتمسحوا** — الثيم الآن inline في `App.tsx` (`primaryTheme`: dark \| amoled)
- طبقة `src/services/` **موجودة** (18 ملف: chat, calls, auth, store, profile, design)
- PWA: `UpdateBanner`, `OnlineStatus`, `InstallPrompt` فقط — لا `ThemeFab` ولا `ThemeSettings`
- `api/sitemap.js` موجود للـ SEO
- `supabase-production-hardening.sql` + `scripts/apply-production-setup.mjs` للإنتاج

## 1. نظرة عامة

المشروع عبارة عن تطبيق دردشة عربي أحادي الصفحة `SPA` مبني باستخدام:

- `React 19`
- `TypeScript`
- `Vite`
- `Supabase`
- `Tailwind CSS v4`
- `Motion`

الهدف من المشروع هو تقديم منصة دردشة عربية بواجهة غنية، مع غرف عامة، رسائل خاصة، تخصيصات بصرية، إدارة صلاحيات، دعم وسائط، ودعم `PWA`.

## 2. المعمارية العامة

المعمارية الحالية تعتمد على واجهة React مع تكامل مباشر مع Supabase، بدون طبقة backend تقليدية كاملة. يوجد فقط endpoint خفيف على Vercel لتمرير إعدادات المصادقة إلى الواجهة.

### 2.1 مخطط معماري مختصر

```text
Browser
  -> index.html
  -> src/main.tsx
  -> src/App.tsx
       -> LoginScreen / ChatScreen
       -> hooks العامة (service worker)
       -> src/services/* (chat, calls, auth, store)
       -> Supabase Auth Session
             -> Database
             -> Realtime
             -> Storage
  -> /api/auth-config (Vercel serverless function)
```

### 2.2 طبقات المشروع

- طبقة العرض: `src/components`
- طبقة تنسيق التطبيق والجلسة: `src/App.tsx`
- طبقة الهوكس العامة: `src/hooks`
- طبقة العقود والمساعدات والثوابت: `src/lib`
- طبقة الملفات الثابتة وPWA: `public`
- طبقة منطق الأعمال: `src/services`
- طبقة endpoint السيرفري الخفيف: `api` (`auth-config.js`, `sitemap.js`)
- طبقة البنية البيانية: `supabase-schema.sql` و`supabase-storage.sql`

## 3. مسار التشغيل

### 3.1 بدء التطبيق

1. المتصفح يحمل `index.html`
2. الملف `src/main.tsx` ينشئ React root
3. الملف `src/App.tsx` يقرر هل المستخدم:
   - ضيف
   - مستخدم Supabase موثق
   - أو يحتاج استكمال nickname
4. عند غياب الجلسة يعرض `LoginScreen`
5. عند وجود الجلسة يحمّل `ChatScreen` بشكل lazy

### 3.2 إدارة الجلسة

`App.tsx` يجمع بين نوعين من الجلسات:

- جلسة ضيف محفوظة في `localStorage`
- جلسة Supabase يتم استرجاعها من `supabase.auth.getSession()`

كما يستمع إلى تغيّر المصادقة عبر `onAuthStateChange` ويحوّل مستخدم Supabase إلى `UserSession` موحد داخل التطبيق.

## 4. هيكل الملفات

```text
api/
  auth-config.js

public/
  manifest.json
  sw.js
  offline.html
  login.html
  images / assets / seo files

src/
  App.tsx
  main.tsx
  index.css
  components/
    ChatScreen.tsx
    LoginScreen.tsx
    SimpleLoginScreen.tsx
    ErrorBoundary.tsx
    AMLogo.tsx
    BossSigil.tsx
    modals/
    pwa/
  hooks/
    useServiceWorker.ts
    useChatMessages.ts
    useWebRTCCalls.ts
    (and others)
  services/
    chat/ calls/ auth/ store/ profile/ design/
  lib/
    supabase.ts
    chatTypes.ts
    chatConstants.ts
    chatHelpers.ts
    chatMessageRender.tsx
    authProfile.ts
    storage.ts

supabase-schema.sql
supabase-storage.sql
vercel.json
vite.config.ts
README.md
```

## 5. مسؤوليات الموديولات الرئيسية

### 5.1 `src/main.tsx`

نقطة الدخول الأساسية للتطبيق. مسؤوليته الوحيدة تقريبًا هي تركيب `App` داخل DOM.

### 5.2 `src/App.tsx`

المكوّن المنسق للتطبيق. مسؤولياته:

- قراءة جلسة الضيف من `localStorage`
- استرجاع جلسة Supabase الحالية
- متابعة تغيّر حالة المصادقة
- تحديد ما إذا كان يجب عرض `LoginScreen` أو `ChatScreen`
- تشغيل `useServiceWorker()` وإدارة `primaryTheme` (dark / amoled)
- عرض بانرات `PWA` مثل `UpdateBanner` و`OnlineStatus`

أهم الدوال:

- `readGuestSession()`: قراءة جلسة الضيف المحلية
- `writeGuestSession()`: حفظ جلسة الضيف
- `clearGuestSession()`: حذف جلسة الضيف
- `readDevSession()`: تحميل جلسة تطوير محلية عند العمل على بيئة التطوير
- `sessionToUserSession()`: توحيد شكل مستخدم Supabase إلى `UserSession`
- `needsProfileNickname()`: تحديد هل المستخدم يحتاج استكمال nickname

### 5.3 `src/components/LoginScreen.tsx`

شاشة الدخول الرئيسية.

مسؤولياتها:

- دخول الزائر
- تسجيل الدخول بالبريد وكلمة المرور
- إنشاء حساب جديد
- تسجيل الدخول عبر Google OAuth
- استكمال nickname للحسابات التي تحتاج ذلك
- عرض رسائل نجاح/فشل للمستخدم
- دعم تثبيت التطبيق عند توفر `PWA install prompt`

أهم الدوال:

- `getSupabaseRole()`: استخراج الرتبة من بيانات المستخدم
- `resolveOwnerGhostMode()`: تطبيق حالة ghost mode للمالك
- `randomGuestId()`: توليد اسم زائر افتراضي
- `randomColor()`: اختيار لون افتراضي للضيف
- `handleGoogleLogin()`: بدء Google OAuth
- `handleLoginSubmit()`: تسجيل الدخول بالبريد
- `handleRegisterSubmit()`: إنشاء حساب جديد
- `handleSaveProfileNickname()`: حفظ nickname للحسابات الناقصة

### 5.4 `src/components/ChatScreen.tsx`

هذا هو الموديول المركزي الأكبر والأكثر مسؤولية في المشروع.

مسؤولياته:

- إدارة الغرف الحالية والغرفة النشطة
- تحميل الرسائل من Supabase
- الاشتراك في Realtime لتحديث الرسائل
- إرسال الرسائل النصية والوسائط
- الرسائل الخاصة
- قوائم الأعضاء والحظر
- لوحات الإدارة والمالك والحرس
- مركز التصميم والثيمات والخلفيات
- الراديو والموسيقى والتسجيل الصوتي
- المتجر والمنتجات والاشتراكات

أهم الدوال والمساعدات داخل الملف:

- `isUuidLike()`: تمييز ما إذا كانت القيمة تشبه UUID
- `createBanSignature()`: بناء بصمة فريدة لسجل الحظر
- `mergeBanLists()`: دمج قوائم المحظورين بدون تكرار
- `serializeBanRowReason()`: توحيد سبب الحظر عند التخزين
- `parseBannedUserRow()`: تحويل صف Supabase إلى `BanInfo`
- `sanitizeRoomBgMap()`: تنظيف تعيين الخلفيات لكل غرفة

ملاحظة مهمة:

- الملف ضخم جدًا ومتعدد المسؤوليات، وهو أكبر نقطة دين تقني في المشروع.

### 5.5 `src/lib/supabase.ts`

هذا الملف هو بوابة Supabase داخل التطبيق.

مسؤولياته:

- تهيئة عميل Supabase
- التحقق من اكتمال متغيرات البيئة
- ضبط خصائص المصادقة:
  - `persistSession`
  - `autoRefreshToken`
  - `detectSessionInUrl`
  - `storageKey`
- تعريف أنواع الصفوف الأساسية القادمة من قاعدة البيانات

أهم الدوال والأنواع:

- `isSupabaseConfigured`: يحدد هل البيئة جاهزة
- `supabase`: عميل Supabase أو `null`
- `getClientUid()`: معرف عميل محلي ثابت
- `SupabaseMessage`
- `OwnerSettingsRow`
- `OwnerMemberPermissionRow`
- `OwnerActivityLogRow`
- `BannedUserRow`
- `NicknameChangeRequestRow`

### 5.6 `src/lib/authProfile.ts`

طبقة تطبيع بيانات المستخدم القادمة من Supabase.

أهم الدوال:

- `normalizeAuthRole()`: توحيد الرتبة إلى `owner` أو `admin` أو `guard` أو `vip` أو `member`
- `getResolvedSupabaseNickname()`: استخراج nickname فعلي من metadata أو البريد
- `getResolvedSupabaseColor()`: استخراج أو توليد لون ثابت للمستخدم
- `hasPlaceholderSupabaseNickname()`: كشف nicknames الافتراضية غير المناسبة

### 5.7 `src/lib/chatTypes.ts`

هذا الملف يحتوي العقود المركزية للبيانات.

من أهم الأنواع:

- `UserRole`
- `UserSession`
- `ChatMessage`
- `ChatMember`
- `BanInfo`
- `ChatRoom`
- `PrivateMessage`
- `ProductItem`
- `ProductType`
- `ProductTab`
- `OwnerActivityLog`

أهمية هذا الملف أنه يحدد اللغة المشتركة بين أغلب مكونات التطبيق.

### 5.8 `src/lib/chatConstants.ts`

ملف الثوابت العامة للشات.

من أهم ما يحتويه:

- `ROOMS_DEF`: الغرف الافتراضية
- `EMOJIS`: قائمة الإيموجي
- `GIFTS`: الهدايا
- ثوابت واجهية وتجريبية تستخدم داخل `ChatScreen`

### 5.9 `src/lib/chatHelpers.ts`

أدوات مساعدة عامة للشات.

أهم الدوال:

- `getYoutubeId()`: استخراج معرف فيديو YouTube من الرابط
- `hexToRgba()`: تحويل لون Hex إلى RGBA
- `getShortenedNickname()`: تنظيف الاسم المختصر من ألقاب مثل VIP أو Admin

### 5.10 `src/lib/chatMessageRender.tsx`

مسؤول عن تنسيق النصوص والرسائل عند العرض.

أهم دواله:

- `renderInlineFormattedText()`: تنسيق النص إلى أجزاء React
- `renderTextMessageWithMedia()`: رندر الرسالة مع معاينات الوسائط والروابط

### 5.11 الثيم (محدّث)

> **ملاحظة:** `useTheme.ts` و `themes.ts` لم يعودا موجودين. الثيم يُدار من `App.tsx` عبر `primaryTheme` (dark \| amoled) و CSS variables في `src/index.css`.

### 5.12 `src/hooks/useServiceWorker.ts`

هوك `PWA` الرئيسي.

مسؤولياته:

- تسجيل `Service Worker` عند تفعيل `VITE_ENABLE_PWA`
- تنظيف التسجيلات القديمة والكاشات عند تعطيل `PWA`
- كشف التحديثات الجديدة
- كشف حالة الاتصال `online/offline`
- التعامل مع `beforeinstallprompt`

أهم الدوال:

- `clearLammaCaches()`
- `unregisterAllServiceWorkers()`
- `useServiceWorker()`

### 5.13 `src/components/pwa/*`

مكونات `PWA` المساندة:

- `UpdateBanner.tsx`: إشعار بوجود تحديث
- `OnlineStatus.tsx`: عرض حالة الاتصال
- `InstallPrompt.tsx`: دعوة لتثبيت التطبيق

### 5.15 `src/components/modals/*`

مجموعة مودالات تدعم سلوك الشات والإدارة:

- `CreateRoomModal`: إنشاء غرفة
- `ShareModal`: مشاركة رابط التطبيق
- `UserContextPopup`: إجراءات سريعة على عضو
- `UserProfileBioPopup`: عرض Bio مختصر
- `UserProfileModal`: ملف العضو وإجراءاته
- `OwnerPanelModal`: لوحة المالك
- `AdminPanelModal`: لوحة الأدمن
- `GuardPanelModal`: لوحة الحرس/الحماية
- `StorePanelModal`: المتجر
- `DesignCenterModal`: مركز التصميم
- `StatsModal`: الإحصاءات

## 6. الملفات الثابتة والبنية التحتية

### 6.1 `api/auth-config.js`

Endpoint خفيف يعمل على Vercel.

وظيفته:

- قراءة `VITE_SUPABASE_URL`
- قراءة `VITE_SUPABASE_ANON_KEY`
- قراءة `VITE_APP_URL`
- إرجاع `configured=true/false`
- منع الكاش لهذه الاستجابة

هذا الملف مهم خصوصًا لصفحة الدخول الثابتة في `public/login.html` و`public/assets/login.js`.

### 6.2 `public/sw.js`

Service Worker فعلي يحتوي:

- إصدار كاش `VERSION`
- `PRECACHE_URLS`
- استراتيجيات:
  - `cacheFirst`
  - `networkFirst`
  - `networkOnlyDocument`
- دعم رسائل مثل `SKIP_WAITING` و`CLEAR_CACHES`

### 6.3 `public/manifest.json`

يعرّف التطبيق كتجربة `PWA`، بما في ذلك:

- الاسم
- الأيقونات
- اختصارات الغرف
- ألوان النظام

### 6.4 `public/login.html`

صفحة دخول HTML مستقلة ما زالت موجودة داخل المشروع. تبدو كواجهة موازية أو legacy login page، بينما نقطة الدخول الأساسية الحالية ما زالت عبر React من `src/main.tsx`.

## 7. العلاقات بين الموديولات

### 7.1 تبعيات منطقية

- `main.tsx` يعتمد على `App.tsx`
- `App.tsx` يعتمد على:
  - `LoginScreen.tsx`
  - `ChatScreen.tsx`
  - `useTheme.ts`
  - `useServiceWorker.ts`
  - `supabase.ts`
  - `authProfile.ts`
- `LoginScreen.tsx` يعتمد على:
  - `supabase.ts`
  - `authProfile.ts`
  - أيقونات `lucide-react`
- `ChatScreen.tsx` يعتمد على:
  - `chatTypes.ts`
  - `chatConstants.ts`
  - `chatHelpers.ts`
  - `chatMessageRender.tsx`
  - `supabase.ts`
  - `modals/*`
  - بعض مكونات `pwa/*`
- `useTheme.ts` يعتمد على `themes.ts`
- `api/auth-config.js` يعتمد على متغيرات البيئة الخاصة بالنشر

### 7.2 التبعيات الخارجية

- `React`: الواجهة وحالة المكونات
- `Vite`: البناء والتطوير
- `Supabase`: Auth + DB + Realtime + Storage
- `Tailwind CSS`: التنسيق
- `Motion`: الحركات
- `lucide-react`: الأيقونات

## 8. قاعدة البيانات والتخزين

### 8.1 الجداول الأساسية

بحسب `supabase-schema.sql`، من الجداول المهمة:

- `messages`
- `banned_users`
- `vip_subscriptions`
- `pm_messages`
- `owner_settings`
- `owner_member_permissions`
- `owner_activity_logs`
- `nickname_change_requests`

### 8.2 التخزين

بحسب `supabase-storage.sql`، يتم استخدام Buckets مثل:

- `chat-media`
- `design-assets`

ويتم رفع الوسائط والتصميمات إليها من الواجهة.

## 9. إعدادات البناء والنشر

### 9.1 `package.json`

الأوامر الأساسية:

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

ملاحظة:

- `npm run lint` ينفذ `tsc --noEmit` وليس ESLint

### 9.2 `vite.config.ts`

الإعدادات المهمة:

- إضافة `react()` و`tailwindcss()`
- alias باسم `@`
- تقسيم الحزم يدويًا عبر `manualChunks` لتخفيف الحمل الأولي

### 9.3 `vercel.json`

الإعدادات الحالية تشمل:

- `rewrites` لدعم `SPA`
- رؤوس أمان مثل `CSP`
- إعدادات خاصة بـ `sw.js` و`manifest.json`

## 10. متغيرات البيئة

المتغيرات الأساسية:

```env
VITE_APP_URL=
VITE_ENABLE_PWA=false
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_SEARCH_ENDPOINT=
VITE_BRAND_NAME=
VITE_BRAND_CREDIT=
VITE_LOGIN_HERO_BG=
```

الأهم تشغيليًا:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

## 11. طريقة التشغيل

### 11.1 محليًا

1. ثبّت الاعتماديات:

```bash
npm install
```

2. أنشئ `.env` أو `.env.local` بناءً على `.env.example`

3. ضع قيم Supabase:

```env
VITE_SUPABASE_URL="..."
VITE_SUPABASE_ANON_KEY="..."
VITE_APP_URL="http://localhost:5173"
VITE_ENABLE_PWA="false"
```

4. شغّل التطبيق:

```bash
npm run dev
```

### 11.2 بناء الإنتاج

```bash
npm run build
npm run preview
```

### 11.3 النشر

#### Vercel

- اربط المستودع بـ Vercel
- اضبط متغيرات البيئة نفسها داخل إعدادات المشروع
- سيعمل endpoint `/api/auth-config` تلقائيًا

#### Supabase

- أنشئ مشروع Supabase
- نفّذ `supabase-schema.sql`
- نفّذ `supabase-storage.sql`
- انسخ `URL` و`Anon Key` إلى متغيرات البيئة

## 12. نقاط القوة

- بنية تشغيل واضحة نسبيًا
- تكامل فعلي مع Supabase
- دعم `PWA`
- تخصيص بصري قوي
- تجربة دخول مرنة بين ضيف ومستخدم موثق

## 13. نقاط الضعف

- `ChatScreen.tsx` ضخم جدًا ومتعدد المسؤوليات
- منطق الأعمال موزع بين الواجهة أكثر من اللازم
- `ChatScreen.tsx` لا يزال ضخماً رغم وجود `src/services/` جزئياً
- لا توجد اختبارات آلية واضحة
- توجد بقايا بنية legacy مثل `public/login.html`

## 14. توصيات تحسين

1. تفكيك `ChatScreen.tsx` إلى features أو hooks فرعية
2. مواصلة استخراج منطق من `ChatScreen.tsx` إلى `src/services/`
3. توحيد منطق الدخول بين شاشة React وصفحة `public/login.html`
4. إضافة اختبارات مركزة لمسارات:
   - الدخول
   - إرسال الرسائل
   - رفع الوسائط
   - صلاحيات الإدارة
5. تقليل الاعتماد على الحالة المحلية العملاقة داخل شاشة الشات

## 15. مسار قراءة مقترح لمطور جديد

إذا كنت جديدًا على المشروع، ابدأ بهذا الترتيب:

1. `README.md`
2. `src/main.tsx`
3. `src/App.tsx`
4. `src/lib/supabase.ts`
5. `src/components/LoginScreen.tsx`
6. `src/components/ChatScreen.tsx`
7. `src/lib/chatTypes.ts`
8. `src/lib/chatConstants.ts`
9. `src/services/chat/messagesService.ts`
10. `src/hooks/useServiceWorker.ts`
11. `AGENTS.md`

## 16. خلاصة

`Lamma Chat` مشروع واجهة دردشة غني بالخصائص وموجّه للنشر السريع باستخدام `Vercel + Supabase`. المعمارية الحالية عملية وتنجز المطلوب، لكنها تعتمد بشكل كبير على مكونات مركزية ضخمة، خصوصًا `ChatScreen.tsx`. لذلك فالمشروع مناسب حاليًا للتشغيل والتوسع المحدود، لكنه سيستفيد كثيرًا من إعادة تنظيم داخلية تدريجية مع نمو المزايا.
