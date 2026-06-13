# Code Wiki - Lamma Chat

## 1. الهدف من المشروع

`Lamma Chat` هو تطبيق دردشة عربي أحادي الصفحة `SPA` مبني بـ `React` و`TypeScript`
ويستخدم `Supabase` كمزود رئيسي للمصادقة، قاعدة البيانات، التزامن الفوري
`Realtime`، ورفع الوسائط. الواجهة موجّهة للأجهزة المحمولة بشكل واضح، مع دعم
تثبيت التطبيق كتطبيق `PWA`، ونشر مباشر على `Vercel`.

الخصائص البارزة:

- تسجيل دخول كضيف أو بحساب `Supabase`
- غرف عامة وخاصة ومنشورات ورسائل خاصة
- رسائل نصية، صور، فيديو، صوت، هدايا، وروابط غنية
- ثيمات متعددة وتخصيص بصري واسع
- دعم `PWA` للتثبيت والتحديث والعمل الجزئي دون اتصال
- أدوات إدارة وإشراف ومتجر واشتراكات

الملاحظة المعمارية الأهم: أغلب منطق الأعمال الفعلي متمركز داخل
`src/components/ChatScreen.tsx`، لذلك فهو يمثل قلب التطبيق الحقيقي.

---

## 2. المعمارية العامة

### 2.1 صورة كبيرة

```text
index.html
  -> src/main.tsx
      -> App.tsx
          -> LoginScreen.tsx
          -> ChatScreen.tsx (lazy-loaded)
          -> ErrorBoundary
          -> PWA UI components

Shared runtime services
  -> hooks/useTheme.ts
  -> hooks/useServiceWorker.ts
  -> lib/supabase.ts
  -> lib/storage.ts
  -> lib/chatTypes.ts
  -> lib/chatConstants.ts
  -> lib/chatHelpers.ts
  -> lib/chatMessageRender.tsx
  -> lib/themes.ts

External systems
  -> Supabase Auth
  -> Supabase Database
  -> Supabase Realtime
  -> Supabase Storage
  -> Optional Gemini search endpoint
  -> Vercel hosting / serverless api
```

### 2.2 النمط المعماري

المشروع يتبع نمطًا مباشرًا بسيطًا بدل طبقات domain/services/repositories:

- طبقة العرض: مكونات React
- طبقة الحالة: `useState`, `useEffect`, `localStorage`
- طبقة التكامل الخارجي: استدعاءات `Supabase` مباشرة من الواجهة
- طبقة المساعدة: أنواع وثوابت ومساعدات صغيرة في `src/lib`

هذا يجعل التطوير سريعًا، لكنه يرفع درجة التشابك داخل الملفات الكبيرة خصوصًا
`ChatScreen.tsx`.

---

## 3. خريطة التشغيل

### 3.1 نقطة الدخول

- `index.html`
  - يوفّر العنصر `#root`
  - يحمّل `src/main.tsx`

- `src/main.tsx`
  - يركّب تطبيق React
  - يحمّل `App`

### 3.2 منسق التطبيق

- `src/App.tsx`
  - يستعيد جلسة الضيف من `localStorage`
  - يجلب جلسة `Supabase` الحالية
  - يستمع لتغيّر المصادقة عبر `onAuthStateChange`
  - يقرر عرض `LoginScreen` أو `ChatScreen`
  - يشغل `useTheme()` و`useServiceWorker()`
  - يلف التطبيق داخل `ErrorBoundary`

### 3.3 مسار الدخول

```text
User not authenticated
  -> LoginScreen
      -> guest login
      -> email/password login
      -> registration
      -> Google OAuth
  -> onLogin callback
  -> App stores normalized UserSession
  -> ChatScreen
```

### 3.4 مسار الشات

```text
ChatScreen
  -> determine current room
  -> restore local preferences / local caches
  -> fetch room messages from Supabase
  -> subscribe to realtime updates
  -> send text/media/gift/private messages
  -> update UI state and local storage
```

---

## 4. هيكل المستودع

```text
api/
  auth-config.js

public/
  assets/
  images/
  manifest.json
  offline.html
  robots.txt
  sitemap.xml
  sw.js

src/
  components/
    modals/
    pwa/
    AMLogo.tsx
    BossSigil.tsx
    ChatScreen.tsx
    ErrorBoundary.tsx
    LoginScreen.tsx
    SimpleLoginScreen.tsx
  hooks/
    useServiceWorker.ts
    useTheme.ts
  lib/
    chatConstants.ts
    chatHelpers.ts
    chatMessageRender.tsx
    chatTypes.ts
    storage.ts
    supabase.ts
    themes.ts
  App.tsx
  index.css
  main.tsx

supabase-schema.sql
supabase-storage.sql
vercel.json
package.json
.env.example
README.md
CODE_WIKI.md
```

### 4.1 مجلد `src/components`

- `LoginScreen.tsx`
  - شاشة الدخول المتقدمة
  - تدعم الضيف، البريد وكلمة المرور، والتسجيل، و`Google OAuth`

- `SimpleLoginScreen.tsx`
  - واجهة دخول مبسطة بغلاف بصري مختلف
  - يمكنها التحويل لاحقاً إلى `LoginScreen`

- `ChatScreen.tsx`
  - أكبر ملف في المشروع
  - يجمع منطق الغرف، الرسائل، الرسائل الخاصة، الرفع، الإشراف، والمتجر

- `ErrorBoundary.tsx`
  - حاجز أخطاء React على مستوى التطبيق

- `components/modals/*`
  - نوافذ منبثقة مثل إنشاء غرفة، مشاركة، بروفايل، وسياق المستخدم

- `components/pwa/*`
  - عناصر حالة الاتصال، تحديث التطبيق، التثبيت، وإعدادات الثيم

### 4.2 مجلد `src/hooks`

- `useTheme.ts`
  - يطبق ثيم التطبيق العام عبر متغيرات CSS

- `useServiceWorker.ts`
  - يسجل `sw.js`
  - يتابع حالة التثبيت والتحديث والاتصال

### 4.3 مجلد `src/lib`

- `chatTypes.ts`
  - أنواع العقود الأساسية للواجهة

- `chatConstants.ts`
  - الغرف الافتراضية، التصنيفات، الهدايا، الإيموجي، وثوابت الواجهة

- `chatHelpers.ts`
  - دوال مساعدة لتحليل الروابط، الأدوار، والأسماء

- `chatMessageRender.tsx`
  - يحول نص الرسالة إلى محتوى تفاعلي مع معاينات YouTube/صورة/فيديو

- `storage.ts`
  - غلاف آمن لـ `localStorage`

- `supabase.ts`
  - تجهيز عميل `Supabase` والتحقق من الإعدادات

- `themes.ts`
  - تعريف الثيمات الجاهزة والثيم المخصص

### 4.4 `public`

- `manifest.json`
  - تعريف `PWA`

- `sw.js`
  - خدمة التخزين المؤقت والعمل دون اتصال جزئيًا

- `offline.html`
  - واجهة fallback عند فقدان الاتصال

- `images/*`
  - الشعارات والخلفيات والصور الثابتة

### 4.5 `api`

- `auth-config.js`
  - endpoint بسيط يعيد حالة إعداد `Supabase`
  - يستخدم عند النشر على `Vercel`

### 4.6 ملفات البنية التحتية

- `supabase-schema.sql`
  - الجداول وسياسات `RLS` و`Realtime`

- `supabase-storage.sql`
  - إعداد bucket الوسائط وسياسات القراءة/الرفع

- `vercel.json`
  - رؤوس الأمان والسياسات الخاصة بالنشر

---

## 5. الوحدات الرئيسية ومسؤولياتها

## 5.1 `src/App.tsx`

هذا الملف هو منسق دورة حياة التطبيق.

المسؤوليات:

- تحميل الجلسة الحالية
- التفريق بين جلسة ضيف وجلسة `Supabase`
- تحويل مستخدم `Supabase` إلى `UserSession`
- تمرير callbacks الخاصة بالدخول والخروج
- تشغيل `ErrorBoundary` و`PWA` والثيم

الدوال الأساسية:

- `readGuestSession()`
  - يقرأ جلسة الضيف من `localStorage`

- `writeGuestSession()`
  - يحفظ جلسة الضيف

- `clearGuestSession()`
  - يمسح جلسة الضيف

- `normalizeAuthRole()`
  - يوحد الأدوار القادمة من metadata

- `getStoredNickname()`
  - يقرأ `nickname` من metadata

- `needsProfileNickname()`
  - يحدد هل الحساب يحتاج اسمًا ظاهرًا قبل دخول الشات

- `sessionToUserSession()`
  - يحول مستخدم `Supabase` إلى `UserSession`

- `handleLogin()`
  - ينشئ `UserSession` ويخزن جلسة الضيف عند الحاجة

- `handleLogout()`
  - يمسح الجلسة محليًا ويستدعي `supabase.auth.signOut()`

اعتمادياته المباشرة:

- `LoginScreen`
- `ChatScreen`
- `ErrorBoundary`
- `useServiceWorker`
- `useTheme`
- `supabase`
- `UserSession`

## 5.2 `src/components/LoginScreen.tsx`

طبقة الدخول الرسمية للتطبيق.

المسؤوليات:

- دخول كضيف
- تسجيل دخول بالبريد وكلمة المرور
- إنشاء حساب جديد
- بدء `Google OAuth`
- استكمال اسم المستخدم بعد أول تسجيل دخول
- عرض رسائل feedback والحالة

أهم الدوال:

- `normalizeAuthRole()`
  - نسخة محلية لتوحيد الدور

- `getSupabaseRole()`
  - تقرأ الدور من metadata

- `randomGuestId()`
  - تولد اسم ضيف افتراضي

- `randomColor()`
  - تعين لونًا افتراضيًا للاسم

- `showFeedback()`
  - تدير التنبيهات المؤقتة

- `handleGuestLogin()`
  - ينفذ دخول الضيف ويرسل النتيجة إلى `App`

- `handleGoogleLogin()`
  - يبدأ تسجيل دخول Google عبر Supabase

- `handleLoginSubmit()`
  - يسجل الدخول بالبريد وكلمة المرور

- `handleRegisterSubmit()`
  - ينشئ حسابًا جديدًا

- `handleSaveProfileNickname()`
  - يكمل الملف الشخصي عند غياب `nickname`

الملاحظة المهمة:

- يوجد تكرار جزئي لمنطق `normalizeAuthRole()` بين هذا الملف و`App.tsx`

## 5.3 `src/components/ChatScreen.tsx`

هذا الملف هو قلب التطبيق الفعلي، ويجمع كثيرًا من منطق الأعمال.

المسؤوليات الرئيسية:

- إدارة الغرفة الحالية والتنقل بين الغرف
- تحميل الرسائل العامة من `Supabase`
- الاشتراك في `Realtime`
- إرسال الرسائل النصية
- إرسال الصور والفيديو والصوت
- إدارة الرسائل الخاصة `PM`
- إدارة الأعضاء، الحظر، والسياق الإداري
- إدارة منشورات `posts-feed`
- إدارة المتجر والاشتراكات والعناصر التجميلية
- إدارة الثيمات الخاصة بالشات والخلفيات والقراءة
- إدارة الحالة المحلية وكمية كبيرة من التفضيلات في `localStorage`

وحدات داخلية بارزة:

- `MobileBottomSheet`
  - عنصر واجهة مساعد للموبايل

- `PostsFeedRoom`
  - تمثيل خاص لغرفة المنشورات

دوال ومنطق بارز:

- `handleSwitchRoom()`
  - يبدل الغرفة الحالية ويضبط الحالة المصاحبة

- `handleSendMessage()`
  - يعالج الإرسال النصي ويحتوي قيودًا وسياقات متعددة

- `sendMediaMessage()`
  - يرسل رسالة وسائط بعد تجهيز بياناتها

- `uploadAndSendImage()`
  - يرفع الملف إلى `Supabase Storage` ثم ينشئ رسالة

- `handlePmImageUploadChange()`
  - يرفع وسائط الرسائل الخاصة

- `openMemberProfile()`
  - يفتح سياق/بروفايل العضو

- `addSystemActivityLog()`
  - يضيف سجل نشاط داخلي

ملاحظة معمارية:

- الملف ضخم جدًا ومتعدد المسؤوليات، ويمثل أهم نقطة يجب تفكيكها مستقبلاً

## 5.4 `src/hooks/useTheme.ts`

هذا hook مسؤول عن ثيم التطبيق العام.

المسؤوليات:

- قراءة الثيم من `localStorage`
- حفظ الثيم بعد تغييره
- تطبيق متغيرات CSS على `document.documentElement`
- تحديث `meta[name="theme-color"]`
- دعم الثيمات الجاهزة والثيمات المخصصة

الدوال الأساسية:

- `readSavedTheme()`
- `applyTheme()`
- `saveTheme()`
- `setThemeById()`
- `applyCustomPalette()`
- `resetTheme()`

## 5.5 `src/lib/themes.ts`

ملف تعريف نظام الثيم.

يعرف:

- `ThemePalette`
- `Theme`
- `PRESETS`
- `DEFAULT_THEME`
- `CUSTOM_THEME_ID`
- `buildCustomTheme()`
- `paletteFromHex()`
- `rgbFromHex()`

الثيم الافتراضي هو `lamma`.

## 5.6 `src/hooks/useServiceWorker.ts`

المسؤوليات:

- تسجيل `sw.js`
- كشف وجود تحديث جديد
- تمرير callback للتثبيت
- تتبع حالة الشبكة `online/offline`
- تنفيذ التحديث عبر `SKIP_WAITING`

القيم الأساسية التي يعيدها:

- `needRefresh`
- `isInstalled`
- `installPromptEvent`
- `isOnline`
- `promptInstall()`
- `update()`

## 5.7 `src/lib/supabase.ts`

مسؤول عن بوابة التكامل مع `Supabase`.

المسؤوليات:

- قراءة `VITE_SUPABASE_URL`
- قراءة `VITE_SUPABASE_ANON_KEY`
- إنشاء العميل عند اكتمال الإعدادات
- التحذير عند نقص الإعدادات
- توفير `getClientUid()`
- تعريف `SupabaseMessage`

مهم:

- عند غياب إعدادات `Supabase` يصبح `supabase` مساويًا `null`
- التطبيق يظل يقلع، لكن بوظائف ناقصة

## 5.8 `src/lib/storage.ts`

غلاف آمن حول `localStorage`.

الدوال:

- `get()`
- `set()`
- `getString()`
- `setString()`
- `remove()`
- `update()`

الفائدة:

- يمنع كسر التطبيق عند JSON تالف أو أخطاء quota

## 5.9 `src/lib/chatHelpers.ts`

مساعدات خفيفة قابلة لإعادة الاستخدام.

الدوال:

- `getYoutubeId()`
  - يستخرج معرف فيديو YouTube من الرابط

- `hexToRgba()`
  - يحول hex إلى `rgba()`

- `getRoleFromAuthor()`
  - يحدد الدور من بيانات موثوقة بدل اسم العرض

- `getFrameFromAuthor()`
  - يعيد إطارًا بصريًا مناسبًا حسب الدور

- `getShortenedNickname()`
  - يختصر أسماء الضيوف ويزيل الألقاب الزائدة

## 5.10 `src/lib/chatMessageRender.tsx`

المسؤولية:

- تحويل نص الرسالة إلى روابط قابلة للنقر
- إظهار معاينة YouTube
- إظهار معاينة صور وفيديوهات مضمنة داخل النص

الدالة الرئيسية:

- `renderTextMessageWithMedia()`

## 5.11 `src/components/ErrorBoundary.tsx`

الكلاس الصريح الأهم في المشروع.

المسؤوليات:

- التقاط أخطاء React غير المعالجة
- تسجيل الخطأ في الـ console
- عرض fallback للمستخدم
- إتاحة إعادة المحاولة أو إعادة تحميل الصفحة

الدوال الأساسية:

- `getDerivedStateFromError()`
- `componentDidCatch()`
- `handleReset()`
- `handleReload()`

---

## 6. نماذج البيانات الأساسية

### 6.1 `MemberRole`

القيم المدعومة:

- `guest`
- `user`
- `vip`
- `platinum_vip`
- `mod`
- `admin`
- `owner`

### 6.2 `UserSession`

يمثل المستخدم الحالي داخل التطبيق:

- `nickname`
- `role`
- `color`
- `uid`
- `email`
- `authProvider`
- `frame`
- `title`
- `badge`
- `avatar`

### 6.3 `Message`

يمثل رسالة الواجهة:

- `id`
- `author`
- `text`
- `color`
- `isOwn`
- `time`
- `type`
- `mediaUrl`
- `giftIcon`
- `giftName`
- `youtubeId`
- `reactions`

### 6.4 `ChatMember`

يمثل عضوًا ظاهرًا في الغرفة:

- `id`
- `nickname`
- `role`
- `color`
- `avatar`
- `status`
- `badge`
- `title`
- `fingerprint`
- `browserSignature`
- `localStorageId`
- `bio`

### 6.5 أنواع أخرى

- `PMThreadMessage`
- `MemberCustomPermissions`
- `BanInfo`
- `ActivityLog`
- `ChatScreenProps`
- `ProductTab`
- `ProductType`

---

## 7. التبعيات والعلاقات

### 7.1 شجرة التبعيات الأساسية

```text
main.tsx
  -> App.tsx
      -> LoginScreen.tsx
      -> ChatScreen.tsx
      -> ErrorBoundary.tsx
      -> hooks/useServiceWorker.ts
      -> hooks/useTheme.ts

ChatScreen.tsx
  -> lib/chatTypes.ts
  -> lib/chatConstants.ts
  -> lib/chatHelpers.ts
  -> lib/chatMessageRender.tsx
  -> lib/storage.ts
  -> lib/supabase.ts
  -> components/modals/*
  -> components/pwa/*

LoginScreen.tsx
  -> lib/supabase.ts
  -> App.onLogin callback
```

### 7.2 تدفق المصادقة

```text
LoginScreen
  -> supabase.auth.signInWithPassword / signInWithOAuth / signUp
  -> App.handleLogin
  -> UserSession
  -> ChatScreen
```

### 7.3 تدفق الجلسة

```text
Guest session
  -> localStorage
  -> App.readGuestSession()

Supabase session
  -> supabase.auth.getSession()
  -> supabase.auth.onAuthStateChange()
  -> App.sessionToUserSession()
```

### 7.4 تدفق الرسائل العامة

```text
ChatScreen
  -> fetch messages from Supabase
  -> subscribe to realtime inserts
  -> update local room state
  -> render message list
```

### 7.5 تدفق الوسائط

```text
User selects file
  -> upload to Supabase Storage bucket chat-media
  -> insert message row with media_url
  -> realtime propagates the new message
```

### 7.6 تدفق الثيم

```text
ThemeSettings / ThemeFab
  -> useTheme()
  -> write CSS variables on :root
  -> components consume variables

ChatScreen
  -> applies additional in-chat styling layers
  -> index.css overrides parts of the shell
```

---

## 8. قاعدة البيانات والبنية الخلفية

### 8.1 الجداول الأساسية في `supabase-schema.sql`

- `messages`
  - المصدر الرئيسي لرسائل الغرف
  - يضم النص، نوع الرسالة، `media_url`, `gift_*`, `youtube_id`, `reactions`

- `banned_users`
  - سجل الحظر والكتم والمنع الإداري

- `vip_subscriptions`
  - تخزين الاشتراكات الفعالة وعناصر مثل `badge` و`avatar`

- `pm_messages`
  - الرسائل الخاصة الدائمة بين المستخدمين

### 8.2 سياسات الأمان

- `messages`
  - القراءة متاحة للجميع
  - الإدخال متاح للمستخدم الموثق أو الضيف مع `sender_uid`

- `banned_users`
  - الإدخال والحذف مقيدان عبر `is_admin()`

- `vip_subscriptions`
  - المستخدم يقرأ اشتراكه فقط
  - الإدارة للأدمن فقط

- `pm_messages`
  - القراءة للمُرسِل أو المُستقبِل
  - الإدخال للمُرسِل فقط

### 8.3 التخزين

في `supabase-storage.sql`:

- bucket: `chat-media`
- القراءة عامة
- الرفع للمستخدمين الموثقين فقط

### 8.4 الـ realtime

المنشورات المضافة إلى `supabase_realtime`:

- `messages`
- `banned_users`
- `vip_subscriptions`
- `pm_messages`

---

## 9. الواجهات الخارجية

### 9.1 Supabase

الاستخدامات:

- `Auth`
- `Database`
- `Realtime`
- `Storage`

المتغيرات المطلوبة:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 9.2 Gemini Search Endpoint

متغير اختياري:

- `VITE_GEMINI_SEARCH_ENDPOINT`

إذا لم يكن موجودًا فميزة البحث الذكي تكون غير مفعلة.

### 9.3 Vercel

الاستخدامات:

- استضافة الواجهة
- تشغيل `api/auth-config.js`
- تطبيق رؤوس الأمان في `vercel.json`

### 9.4 PWA

العناصر الأساسية:

- `public/manifest.json`
- `public/sw.js`
- `src/hooks/useServiceWorker.ts`
- `src/components/pwa/*`

---

## 10. الثيمات والتصميم

يوجد مستويان للتصميم:

### 10.1 ثيم التطبيق العام

مصدره:

- `useTheme.ts`
- `themes.ts`

يعتمد على متغيرات مثل:

- `--theme-primary`
- `--theme-accent`
- `--theme-bg-1`
- `--theme-bg-2`
- `--theme-bg-3`
- `--theme-text`

### 10.2 ثيم الشات الداخلي

مصدره:

- حالات داخل `ChatScreen.tsx`
- قواعد كثيرة في `src/index.css`

من أمثلته:

- `data-chat-theme`
- `data-clear-bg`
- `data-reading-mode`
- `lamma-neutral-glass`

الملاحظة المهمة:

- منطق الثيم موزع بين الثيم العام وطبقات CSS داخل الشات، لذلك قد تظهر تداخلات
  أو سلوك بصري غير متوقع إذا لم تُراجع التغييرات بعناية

---

## 11. كيفية تشغيل المشروع

### 11.1 تثبيت الاعتماديات

```bash
npm install
```

### 11.2 إعداد البيئة

أنشئ ملف `.env.local` أو `.env` بالقيم التالية:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=http://localhost:5173
VITE_GEMINI_SEARCH_ENDPOINT=
VITE_BRAND_NAME=Lamma Chat
VITE_BRAND_CREDIT=Your Name
VITE_LOGIN_HERO_BG=/images/login-hero.jpg
```

### 11.3 تشغيل التطوير

```bash
npm run dev
```

### 11.4 بناء الإنتاج

```bash
npm run build
```

### 11.5 معاينة نسخة الإنتاج

```bash
npm run preview
```

### 11.6 فحص TypeScript

```bash
npm run lint
```

ملاحظة:

- `lint` هنا ينفذ `tsc --noEmit` وليس ESLint

---

## 12. التحقق العملي من قابلية الإطلاق

تم تنفيذ الفحص العملي التالي على المستودع:

### 12.1 ما الذي نجح

- `npm install`
- `npm run lint`
- `npm run build`
- `npm run dev -- --host 127.0.0.1 --port 4173`

### 12.2 نتيجة التشغيل

- خادم Vite أقلع بنجاح
- الصفحة استجابت على `http://127.0.0.1:4173/`
- الواجهة الأساسية ظهرت في المتصفح

### 12.3 التحذيرات والملاحظات

- تحذير متوقع عند غياب إعدادات `Supabase`
  - التطبيق يقلع لكن بقدرات ناقصة

- ظهرت ملاحظة runtime مرتبطة بالثيمات في الـ console
  - الرسالة تتعلق باستدعاء `getThemeColors` ومحاولة قراءة قيمة غير معرفة
  - هذا لا يمنع إقلاع Vite أو البناء، لكنه يشير إلى خلل واجهي يجب مراجعته قبل
    اعتماد إطلاق إنتاجي كامل

- البناء ينجح مع تحذيرين من محسن CSS
  - التحذيران مرتبطان بمحددات CSS مركبة داخل `index.css`
  - لا يوقفان عملية البناء حالياً

### 12.4 الحكم النهائي

- المشروع قابل للإقلاع محلياً من ناحية التثبيت والبناء وتشغيل خادم التطوير
- المشروع غير جاهز كإطلاق إنتاجي كامل بدون:
  - ضبط متغيرات `Supabase`
  - مراجعة خطأ runtime المرتبط بالثيمات
  - تحديث التوثيق والمتغيرات البيئية ليطابقا الكود الفعلي

---

## 13. المخاطر والديون التقنية

### 13.1 نقاط القوة

- بنية تشغيل واضحة
- دمج فعلي جيد مع `Supabase`
- دعم `PWA`
- تجربة عربية غنية وتخصيص بصري قوي

### 13.2 نقاط الضعف

- `ChatScreen.tsx` ملف ضخم جدًا ومتعدد المسؤوليات
- لا توجد اختبارات آلية
- جزء من التوثيق كان قديمًا وغير مطابق
- منطق الثيم موزع بين عدة طبقات

### 13.3 أولويات التحسين

1. تفكيك `ChatScreen.tsx` إلى hooks وخدمات ومكونات فرعية
2. توحيد منطق الأدوار بين `App.tsx` و`LoginScreen.tsx`
3. توحيد نظام الثيم لتجنب أخطاء runtime والتداخل البصري
4. إضافة اختبارات مركزة لمسارات الدخول والإرسال والوسائط
5. إنشاء طبقة `services` أو `repositories` لتقليل منطق Supabase داخل الواجهة

---

## 14. مسار قراءة مقترح للمطور

لفهم المشروع بسرعة:

1. ابدأ بـ `src/main.tsx`
2. اقرأ `src/App.tsx`
3. اقرأ `src/components/LoginScreen.tsx`
4. اقرأ `src/components/ChatScreen.tsx` على مراحل
5. راجع `src/lib/chatTypes.ts`
6. راجع `src/lib/supabase.ts`
7. راجع `src/lib/chatHelpers.ts` و`src/lib/chatMessageRender.tsx`
8. اختم بـ `src/hooks/useTheme.ts`, `src/hooks/useServiceWorker.ts`, و`src/index.css`

بهذا الترتيب ستحصل على:

- دورة حياة التطبيق
- مسار المصادقة
- منطق الرسائل والوسائط
- التبعيات الخارجية
- بنية الثيم والتجربة البصرية
