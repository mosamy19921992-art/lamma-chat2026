# ملاحظات جلسات LAMMA CHAT (ذاكرة دائمة)

## 📌 المشروع
- **الاسم:** Lamma Chat | شات لمة
- **Stack:** React + TypeScript + Vite + TailwindCSS + Supabase
- **الموقع الحي:** https://lamma-arabic-chat-room.vercel.app/
- **Supabase Project:** `detvapbvkabvdjsdttfy`
- **GitHub:** mosamy19921992-art/lamma-chat2026 (اسم الريبو — مش URL النشر)
- **Vercel project:** `lamma-arabic-chat-room`
- **الـ env vars على Vercel:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`
- **Bucket:** `chat-media` (Public) — يستخدم في رفع الصور

> ⚠️ `lamma-chat2026.vercel.app` رابط قديم ويرجع 404 — لا تستخدمه.

## 🎯 قواعد مهمة في الكود (ممنوع نكسرها)
- ممنوع نضيف features من غير إذن المستخدم
- ممنوع تغيير الهوية/الشعار/الفافيكون/ألوان `src/index.css` بدون إذن
- `src/lib/*` و `src/hooks/*` — تعديل بموافقة فقط
- اللينت = `npm run lint` (= `tsc --noEmit`)
- بعد كل تعديل: `npm run build`
- commit/push بس لما المستخدم يطلب

## ✅ اللي اتعمل (Status: Done)
1. **دخول Supabase:**
   - Email/password + Google OAuth + Guest
   - Supabase Auth: Google Provider Enabled
   - Authorized redirect URI: `https://detvapbvkabvdjsdttfy.supabase.co/auth/v1/callback`
   - Vercel + localhost origins
2. **اسم إجباري:**
   - إجباري وقت Signup
   - إجباري لأول دخول للحسابات القديمة
   - بيُحفظ في `user_metadata.nickname`
3. **رفع الصور:** Supabase Storage → `chat-media` bucket
4. **رفع صورة PM:** `pm/<nickname>/...`
5. **Rate limit:** 3 وسائط / دقيقة
6. **حذف رسائل:** Owner/Admin/صاحب الرسالة
7. **إشعارات:** mention + unread badge
8. **صوت:** Web Audio API لما الـ tab مش focused
9. **بوتات + حماية:** /clear, /guard, /status
10. **LocalStorage fallback** + **Real-time**
11. **طبقة services:** `src/services/` (chat, calls, auth, store, profile)

## 🟡 ناقص / مفتوح للنقاش (محدّث — يونيو 2026)
1) **رفع فيديو ملف في الغرف العامة** — PM فيه فيdeo ملف؛ الغرف: رابط YouTube/MP4 فقط
2) ~~PM Real-time كامل~~ → **جزئي:** tab leader + poll 8s (Real-time Hardening ✅)
3) Edit رسالة — scope لاحق
4) Typing indicator — غير مُنفَّذ (اتشال المعطّل)
5) Sound toggle — صوت الإشعارات بدون زر إيقاف
6) Max length 500 حرف — غير مفعّل في composer
7) Drag & drop للصور — غير موجود
8) بوت AI دردشة (Gemini) — **تصميم AI للمالك فقط** في Design Center؛ مفيش بوت شات عام
9) معاينة قبل الإرسال
10) Ctrl+Enter

### 🔒 Supabase / إطلاق (تحقق دوري)
```bash
npm run verify:hardening          # سلوك RLS — يحتاج .env.local
node scripts/apply-production-setup.mjs   # سلسلة SQL كاملة — يحتاج SUPABASE_ACCESS_TOKEN
```
**ملاحظة:** `apply-production-setup.mjs` يطبّق سلسلة `SQL_MIGRATIONS.md` + reply + pen-test — شغّله فقط لما تكون جاهز؛ SQL idempotent في أغلب الأجزاء.

## 🖼 التصميم
- الهوية: أخضر لامع + أسود + ذهب VIP
- Tokens في `src/index.css`: `--accent-primary`, `--accent-secondary`, `--lamma-header-accent-rgb`

### ✅ UI/UX Polish — مرحلة 1 + 2 (مغلقة — يونيو 2026)
**Production:** https://lamma-arabic-chat-room.vercel.app  
**Commits:** `d4f6e1e` (Phase 1) · `0437cbf` (Phase 1 close) · `021e6dc` (Phase 2)  
**Deploy:** `dpl_BYzYspFLSaZELL3NrUrHz8JcMuzP`

| المرحلة | المحتوى |
|---|---|
| **1** | PWA composer 44px touch · input 16px (iOS) · Admin accent tokens · mobile FX تخفيف |
| **2** | توحيد accent في chrome (هيدر، قوائم، composer، مكالمات) + `lamma-modal-shell` + أزرار primary/muted |

**ملفات رئيسية:** `src/styles/ui-polish-audit.css`, `pwa-mobile-premium.css`, `ios-magic.css`, `design-fx-2026-fixes.css`, `AdminPanelModal.tsx`, `ChatScreen.tsx` (chrome فقط)

**كلاسات tokens:** `lamma-accent-text`, `lamma-accent-text-soft`, `lamma-accent-tab-active`, `lamma-accent-bg-soft/medium`, `lamma-accent-border-soft`

**متعمد لم يُمس:** `AMLogo.tsx` (هوية) · ألوان نيك المستخدمين في الرسائل · إشعارات yellow/blue/red

**اختبار يدوي على موبايل (PWA/Safari):** شريط الكتابة · zoom · أزرار composer · help room `/complaint`

### ✅ فحص منطق الشات المتقدم (يونيو 2026)
- إشعارات/صوت لما `document.hidden` (تاب في الخلفية) حتى في نفس الغرفة
- PM: إشعار لما التاب مخفي حتى لو المحادثة مفتوحة
- spinner «جاري رفع الملف…» أثناء `isUploadingImage`
- إزالة typing indicator المعطّل (PM typing غير مُنفَّذ بعد)
- rollback حذف رسالة: يعيد الرسالة المحذوفة فقط (مش snapshot كامل الغرفة)

**غير مُنفَّذ (scope لاحق):** تعديل رسالة · PM typing broadcast · progress bar بنسبة

### ✅ مرحلة الاستقرار + Reply (يونيو 2026 — مغلقة)
**Commits:** `44986a6` · `42186fe`  
**Deploy:** `dpl_c2TfrLmyHtv8bi6gTKE6kjM47Cf9` → https://lamma-arabic-chat-room.vercel.app

| البند | المحتوى |
|---|---|
| **Reply** | ↩️ رد على رسالة الغرفة · شريط preview فوق composer · quote في الفقاعة · `supabase-message-reply.sql` |
| **PM موبايل** | `pmInputText` في `useVisualViewportLayout` — الكيبoard ما يغطيش شريط الخاص |
| **Supabase** | شغّل `supabase-message-reply.sql` ثم راجع `supabase-production-hardening.sql` على SQL Editor |

**ملفات:** `ChatMessageRow.tsx`, `ChatScreen.tsx`, `useRoomComposer.ts`, `messagesService.ts`, `useVisualViewportOffset.ts`

**اختبار يدوي:** رد على نص/صورة · إلغاء الرد · غرفة مختلفة تمسح الرد · PM keyboard على iPhone

### ✅ Realtime Hardening — فحص + إصلاح P0 (يونيو 2026 — مغلقة)
**Commits:** `712d612` · `c26abd1`  
**Deploy:** `dpl_5wrEDSDHMCq47UZTfChQjGb4EcGp` → https://lamma-arabic-chat-room.vercel.app

| البند | المحتوى |
|---|---|
| **Refetch gap** | `useChatMessages`: refetch بعد `online` · `visibilitychange` · أول `SUBSCRIBED` بعد انقطاع realtime |
| **Tab leader** | `tabLeaderService` + `useTabLeader` — tab واحد للـ PM realtime + calls + إشعارات صوت/توست |
| **Presence** | مفتاح `uid_tabSessionId` — بدون flicker join/leave بين تبويبات |
| **Follower PM** | tab غير leader: fetch أولي + poll كل 8s لو PM مفتوح |
| **VIP subs** | `subscribeToMySubscription` / `subscribeToNewOrders` يرجعوا `() => void` |

**ملفات:** `tabLeaderService.ts`, `useTabLeader.ts`, `useChatMessages.ts`, `usePrivateMessages.ts`, `useOnlinePresence.ts`, `useWebRTCCalls.ts`, `subscriptionService.ts`, `ChatScreen.tsx`

**اختبار يدوي:** انقطاع نت → رجوع → رسائل الغرفة تظهر · تبويبين → صوت/رنين مرة واحدة · presence مستقر

**Scope لاحق:** دمج global channels في ChatScreen · tab leader للـ admin channels

### ✅ Security Pen-Test Fixes — P0 + P1 (يونيو 2026 — مغلقة)
**Commits:** `5c0be7a`  
**Deploy:** `dpl_ByoHCtNVM8VZbPrgqWXVJRGmiuuN` → https://lamma-arabic-chat-room.vercel.app

| البند | المحتوى |
|---|---|
| **P0 — Role escalation** | `current_app_role()` يقرأ من `user_roles` فقط — مش `user_metadata.role` القابل للتعديل |
| **P1 — Private rooms IDOR** | جدول `private_room_grants` + `can_access_private_room()` + RLS على `messages` SELECT/INSERT |
| **Password verify** | `verify_private_room_password` يسجّل grant على السيرفر (30 يوم) — مش sessionStorage بس |
| **P3 — XSS defense** | `sanitizeHexColor(msg.color)` في `ChatMessageRow` |

**SQL:** `supabase-security-pen-test-fixes.sql` — شغّل عبر `node scripts/apply-security-pen-test-fixes.mjs`

**ملفات:** `supabase-security-pen-test-fixes.sql`, `scripts/apply-security-pen-test-fixes.mjs`, `ChatMessageRow.tsx`

**اختبار يدوي:** محاولة رفع صلاحية عبر metadata → تفشل · غرفة خاصة مقفولة بدون باس → ما تظهرش رسائل · بعد الباس → تظهر

### ✅ Perceived Performance — scroll + render + pagination (يونيو 2026 — مغلقة)
**Commits:** `577014d`  
**Deploy:** `dpl_CQMLby3NRCAt1AtuzbYnR3W2w4dN` → https://lamma-arabic-chat-room.vercel.app

| البند | المحتوى |
|---|---|
| **Auto-scroll** | `scrollToIndex` للقوائم الافتراضية · `auto` فقط (بدون smooth مزدوج على موبايل) · stick-to-bottom محفوظ |
| **Infinite scroll غرف** | عند scroll-up (< 120px) → +50 رسالة مع scroll anchoring · الزر اليدوي لسه موجود |
| **PM fetch** | أول fetch: 150 رسالة · `loadOlderPmHistory` دفعات 100 · prepend صحيح للأقدم |
| **Render** | `getRoomMessageEstimateSize` في `useCallback` · ref على `ChatMessageVirtualList` |

**ملفات:** `ChatMessageVirtualList.tsx`, `ChatScreen.tsx`, `usePrivateMessages.ts`

**اختبار يدوي:** إرسال/استقبال → الشات ينزل بدون لمعان · scroll لفوق → رسائل أقدم تظهر · PM → تحميل أقدم

### ✅ Schema / RLS Hardening — DB audit fixes (يونيو 2026 — مغلقة)
**Commits:** `2967e50`  
**Deploy:** `dpl_5dTd1tm6NqgSbbZqyGGSkR9YePY6` → https://lamma-arabic-chat-room.vercel.app

| البند | المحتوى |
|---|---|
| **Orphan private rooms** | `can_access_private_room`: `pr-*` بدون صف في الجدول → deny (مش public read) |
| **password_hash** | Column grants — clients يقرأوا metadata بس بدون hash |
| **حذف غرفة** | `delete_private_chat_room` يمسح `messages` + `private_room_grants` |
| **حذف حساب** | Trigger `on_auth_user_deleted` ينظّف messages/PM/profile/social |
| **PM unread** | `is_read` على المستقبل + نقطة خضراء في قائمة PM (client-side، بدون COUNT query) |

**SQL:** `supabase-schema-rls-hardening.sql` — `node scripts/apply-schema-rls-hardening.mjs`

**ملفات:** `supabase-schema-rls-hardening.sql`, `scripts/apply-schema-rls-hardening.mjs`, `usePrivateMessages.ts`, `ChatScreen.tsx`

**اختبار يدوي:** حذف غرفة خاصة → رسائلها مش ظاهرة · PM غير مقروء → نقطة خضراء · حذف user من Auth → مفيش orphan spam

### ✅ إصلاح بطاقة البروفايل على الموبايل — admin/owner (يونيو 2026 — مغلقة)
**Commits:** `8dca44d`  
**Deploy:** `dpl_C3sHFTpHM6ioJ6jQjNr37F1gFXjs` → https://lamma-arabic-chat-room.vercel.app

| البند | المحتوى |
|---|---|
| **السبب** | `drag` + `resize` على المودال + خلفية PWA لسه بتscroll |
| **الإصلاح** | bottom sheet على الموبايل · `lamma-modal-open` لما البروفايل مفتوح · OwnerIdCard compact |

**ملفات:** `UserProfileModal.tsx`, `ChatScreen.tsx`

## 💬 لهجة المستخدم
- عامية مصرية
- ناقش قبل التنفيذ الكبير
