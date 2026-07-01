# Cleanup And Development Roadmap

خطة عملية لتنظيف وتطوير مشروع `Lamma Chat` بناءً على حالة الكود الحالية بعد تثبيت مشاكل التشغيل الأساسية.

## 1. الهدف

هذه الخطة لا تركز على "إعادة كتابة المشروع" بالكامل، بل على:

- تثبيت التشغيل والإطلاق
- تقليل الديون التقنية
- فصل المسؤوليات تدريجيًا
- تقليل احتمالات الأعطال عند إضافة مزايا جديدة
- تجهيز المشروع ليكون أسهل في الصيانة والتسليم

## 2. الوضع الحالي

### 2.1 ما هو جيد الآن

- التطبيق يعمل محليًا وبناء الإنتاج ينجح
- النشر على `Vercel` يعمل
- مسار دخول الزائر والشات عاد للعمل
- تكامل `Supabase` موجود فعليًا
- هناك توثيق معماري في `CODE_WIKI.md`

### 2.2 ما هو مقلق الآن

- `src/components/ChatScreen.tsx` ضخم جدًا (~13K سطر) — orchestration owner/moderation لسه داخله
- إدارة الحالة تعتمد على `useState`/`useEffect` بكثافة داخل ChatScreen
- bundle `chat-screen` ~498KB gzip — يحتاج تقسيم lazy إضافي

### 2.3 ما اتحسّن (2026)

- طبقة `src/services/` (~70 ملف) — chat, auth, design, calls, store, social
- hooks مستخرجة: `useChatMessages`, `usePrivateMessages`, `useWebRTCCalls`, `useRoomComposer`, …
- `npm run verify:all` — lint + build + hardening + live + smoke + design
- `public/login.html` — redirect إلى `/` فقط (لا ازدواجية دخول)

## 3. الأولويات

### 3.1 أولوية حرجة

هذه البنود يجب تنفيذها أولًا لأنها تؤثر على الاستقرار:

1. تقليل orchestration المتبقي في `ChatScreen.tsx` (owner sync، moderation realtime)
2. تقسيم bundle ChatScreen (lazy panels إضافية)
3. unit tests للـ services الحرجة
4. ~~توحيد نقطة الدخول~~ — **تم**: `login.html` → redirect `/`

### 3.2 أولوية متوسطة

1. توحيد نظام الثيمات والتخصيص
2. فصل المودالات الإدارية عن منطق الشات العام
3. تنظيم الثوابت وأنواع البيانات بشكل أوضح حسب كل feature

### 3.3 أولوية منخفضة

1. تحسين أسماء بعض الملفات والهياكل
2. إضافة diagrams أعمق للتوثيق
3. تحسين تجربة المطور Developer Experience

## 4. خطة التنفيذ

## المرحلة 1: تثبيت الأساس

الهدف: حماية المشروع من الأعطال المتكررة قبل أي refactor كبير.

### المهام

- تثبيت المتغيرات البيئية المطلوبة ومراجعتها
- مراجعة `vercel.json` و`vite.config.ts` و`api/auth-config.js`
- مراجعة دورة `PWA` والتأكد أن تفعيلها اختياري ومقصود
- إضافة اختبارات smoke بسيطة لمسارات:
  - فتح التطبيق
  - الدخول كزائر
  - تحميل واجهة الشات
- مراجعة كل الملفات غير المستخدمة أو التجريبية في الجذر والمجلدات

### الملفات المستهدفة

- `vercel.json`
- `vite.config.ts`
- `api/auth-config.js`
- `src/hooks/useServiceWorker.ts`
- `README.md`

### نتيجة المرحلة

- المشروع يظل قابلًا للتشغيل بثقة
- أي تغيير لاحق يصبح أقل خطورة

## المرحلة 2: تفكيك ChatScreen

الهدف: تقسيم `ChatScreen.tsx` إلى وحدات قابلة للصيانة.

### لماذا هذه المرحلة مهمة

`ChatScreen.tsx` حاليًا يجمع:

- الرسائل
- الغرف
- الرسائل الخاصة
- الحظر
- الإدارة
- الثيمات
- الوسائط
- الراديو
- المتجر
- popups وmodals

وهذا يجعل أي تعديل صغير عالي المخاطرة.

### التقسيم المقترح

إنشاء مجلد feature-oriented مثل:

```text
src/features/chat/
  components/
  hooks/
  services/
  utils/
  types/
```

### أول فصل مقترح

1. `hooks/useChatMessages.ts`
   - جلب الرسائل
   - الاشتراك في realtime
   - الإرسال
   - التحديث المحلي

2. `hooks/useRooms.ts`
   - الغرفة الحالية
   - فتح/إغلاق الغرف
   - عدادات الغرف

3. `hooks/usePrivateMessages.ts`
   - الرسائل الخاصة
   - الحالات غير المقروءة

4. `hooks/useModeration.ts`
   - الحظر
   - التحقق من المستخدمين
   - الصلاحيات الأساسية

5. `hooks/useMediaUpload.ts`
   - رفع الصور
   - رفع الفيديو
   - رفع الصوت

6. `hooks/useDesignSettings.ts`
   - الخلفيات
   - الشعارات
   - room background map
   - owner settings المتعلقة بالشكل

### نتيجة المرحلة

- تصغير `ChatScreen.tsx`
- تقليل التشابك
- تسهيل إصلاح الأعطال

## المرحلة 3: طبقة Services ✅ (جزئي — مستمر)

**الحالة:** ~70 service file موجود. Slice G (2026-06) نقل من ChatScreen:
- `userProfileMetadataService` — temp entry topic + nickname metadata
- `nicknameChangeService` — طلبات تغيير الاسم
- `ownerActivityLogService` — سجل نشاط المالك
- `messagesService` — media + gift persist
- `mediaStorageService` — public room media + design assets upload
- `privateMessagesService.sendAdminPmMessage`

**المتبقي (Phase 7+):** owner sync slices، layout hooks إضافية، unit tests.

---

## ✅ إغلاق المرحلة 4 — Architecture & Services (2026-06-30)

| البند | الحالة |
|---|---|
| Slice G — media, PM admin, nickname, activity logs | ✅ |
| Slice H — owner dashboard load/sync + banned_users CRUD | ✅ |
| login.html → redirect `/` | ✅ |
| `verify:phase4` static architecture gate | ✅ |
| `verify:all` (lint + build + hardening + live + smoke + design) | ✅ |
| CODE_WIKI + CLEANUP_ROADMAP محدّث | ✅ |

**Services الجديدة:** `userProfileMetadataService`, `nicknameChangeService`, `ownerActivityLogService`, `ownerDashboardService` + توسيع `messagesService`, `mediaStorageService`, `moderationService`, `privateMessagesService`.

## ✅ إغلاق المرحلة 5 — Layout Hooks + Bundle Split (2026-06-30)

| البند | الحالة |
|---|---|
| Slice B — `useRoomNavigation` (غرف، تبويبات، كلمة مرور، realtime) | ✅ |
| Slice F — `useStoreSubscription` (اشتراك، متجر، bot monitor) | ✅ |
| Lazy-load `SocialFeedPanel` + `Suspense` | ✅ |
| إزالة duplicates من `ChatScreen.tsx` | ✅ |
| `verify:phase5` static layout gate | ✅ |
| `verify:all` (lint + build + phase4 + phase5 + hardening + live + smoke + design) | ✅ |

**Hooks الجديدة:** `useRoomNavigation`, `useStoreSubscription`.

## ✅ إغلاق المرحلة 6 — Moderation Hook + Social Bundle (2026-06-30)

| البند | الحالة |
|---|---|
| Slice C — `useModeration` (حظر، sync، megaban check، add/remove ban) | ✅ |
| Lazy `SocialFeedPanel` في `UserProfilePageModal` + `Suspense` | ✅ |
| إزالة duplicates moderation من `ChatScreen.tsx` | ✅ |
| `verify:phase6` static moderation gate | ✅ |
| `verify:all` (lint + build + phase4–6 + hardening + live + smoke + design) | ✅ |

**Hook الجديد:** `useModeration`.

## ✅ إغلاق المرحلة 7 — Owner Member Access + Unit Tests (2026-06-30)

| البند | الحالة |
|---|---|
| Slice D — `useOwnerMemberAccess` (صلاحيات/cosmetics + realtime + persist) | ✅ |
| Unit tests — `authProfile`, `inviteAccess`, `chatHelpers` | ✅ |
| `verify:phase7` + `verify:unit` gates | ✅ |
| `verify:all` (lint + build + phase4–7 + hardening + live + smoke + design) | ✅ |

**Hook الجديد:** `useOwnerMemberAccess`.

**المتبقي (Phase 8+):** owner settings sync hook، layout slices إضافية.

## المرحلة 4: توحيد نظام الدخول ✅

**الحالة:** `public/login.html` يعيد التوجيه إلى `/`. الدخول الرسمي: `LoginScreen.tsx` فقط.

~~اختيار واحد من اثنين~~ — **تم**: React هو المسار الوحيد؛ `login.html` redirect للروابط القديمة.

## المرحلة 5: الاختبارات

الهدف: تغطية المسارات الحرجة بدل الاعتماد الكامل على التجربة اليدوية.

### أين نبدأ

ابدأ باختبارات عالية القيمة فقط:

1. دخول الزائر
2. الدخول بالبريد عند وجود إعدادات Supabase
3. تحميل الشات بعد الدخول
4. إرسال رسالة
5. رفع صورة أو ملف
6. فتح غرفة

### نوع الاختبارات المقترح

- Unit tests للمساعدات:
  - `authProfile.ts`
  - `chatHelpers.ts`
  - `storage.ts`
- Integration tests للهوكس أو الخدمات
- E2E tests لمسارات الواجهة الأساسية

### ملاحظة

لا تضف اختبارات كثيرة شكلية؛ الأفضل عدد أقل لكن مؤثر.

## المرحلة 6: تحسين الثيمات والتخصيص

الهدف: تقليل تشتت منطق المظهر.

### المشكلة

حاليًا يوجد:

- `useTheme.ts`
- `themes.ts`
- أجزاء تخصيص داخل `ChatScreen.tsx`
- إعدادات owner/design منتشرة

### المقترح

- فصل ثيم التطبيق العام عن ثيمات الشات الخاصة
- توحيد أسماء المتغيرات البصرية
- إنشاء model واضح:
  - `app theme`
  - `chat theme`
  - `room background`
  - `owner custom branding`

### نتيجة المرحلة

- فهم أسهل للنظام البصري
- تقليل الأعطال المرتبطة بالمظهر

## المرحلة 7: تنظيف البنية

الهدف: إزالة الأشياء المؤقتة والقديمة والملفات المربكة.

### قائمة تنظيف مقترحة

- حذف الملفات المؤقتة أو غير المستخدمة
- إزالة النسخ الاحتياطية من داخل `src`
- مراجعة ملفات الجذر غير الضرورية
- مراجعة `public` للتأكد أن كل ملف ما زال مستخدمًا
- توحيد naming conventions

### أمثلة على ما يحتاج مراجعة

- ملفات الفحص المؤقتة في الجذر
- النسخ الاحتياطية مثل `.bak`
- أي صفحة legacy لم تعد مستخدمة

## 5. تقسيم العمل إلى Sprintات

## Sprint 1

- تثبيت التشغيل
- مراجعة ملفات النشر
- إضافة smoke tests
- تنظيف الملفات المؤقتة

## Sprint 2

- استخراج `useChatMessages`
- استخراج `useRooms`
- استخراج `usePrivateMessages`
- تقليل حجم `ChatScreen.tsx`

## Sprint 3

- بناء `services` لـ Supabase
- ربط الواجهة بالخدمات الجديدة
- تقليل الاستدعاءات المباشرة من المكونات

## Sprint 4

- توحيد مسار الدخول
- إزالة legacy login إن لم يعد مطلوبًا
- مراجعة التخصيص والثيمات

## Sprint 5

- إضافة اختبارات E2E
- تحسين جودة التوثيق
- مراجعة الأداء والباندلز

## 6. تعريف النجاح

تعتبر الخطة نجحت عندما يصبح:

- `ChatScreen.tsx` أصغر بشكل ملحوظ
- التعامل مع `Supabase` موجود في `services` أو `hooks` واضحة
- الدخول والشات مغطى باختبارات حرجة
- لا توجد ملفات legacy غير مفهومة بدون سبب
- المطور الجديد يستطيع تتبع أي feature بسرعة

## 7. المخاطر

### مخاطر أثناء التنفيذ

- كسر سلوك قائم داخل الشات بسبب refactor سريع
- نقل منطق Supabase بدون تغطية كافية
- حذف صفحة أو ملف قديم ما زال مستخدمًا ضمنيًا

### كيفية تقليل المخاطر

- نفّذ refactor على مراحل صغيرة
- اختبر بعد كل مرحلة
- لا تحذف legacy flow إلا بعد التحقق من عدم استخدامه
- حافظ على commits صغيرة وواضحة

## 8. ترتيب التنفيذ المقترح الآن

إذا بدأنا من هذه اللحظة، فالترتيب الأفضل هو:

1. تنظيف الملفات المؤقتة والجوانب المربكة
2. إضافة اختبارات تشغيل أساسية
3. استخراج hooks من `ChatScreen.tsx`
4. بناء طبقة services
5. توحيد مسار الدخول
6. تحسين نظام الثيمات

## 9. أول 3 خطوات عملية أنصح بها فورًا

1. استخراج `useChatMessages.ts` من `ChatScreen.tsx`
2. إنشاء `messagesService.ts` و`authService.ts`
3. إضافة اختبار E2E واحد لمسار: `landing -> guest login -> chat room`

## 10. الخلاصة

المشروع لا يحتاج إعادة كتابة كاملة الآن.

الذي يحتاجه فعلًا هو:

- تنظيم
- فصل مسؤوليات
- تثبيت نقاط الدخول
- تغطية اختبارية للمسارات الحرجة

لو نُفذت هذه الخطة على مراحل صغيرة، فالمشروع سيتحول من مشروع "شغال لكن حساس" إلى مشروع "قابل للصيانة والتوسع".
