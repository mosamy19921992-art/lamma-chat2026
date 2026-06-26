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

## 🟡 ناقص / مفتوح للنقاش
1) رفع فيديو/صوت من الجهاز
2) PM Real-time كامل
3) Edit رسالة
4) Typing indicator
5) Sound toggle
6) Max length 500 حرف
7) Drag & drop للصور
8) بوت AI (Gemini)
9) معاينة قبل الإرسال
10) Ctrl+Enter

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
**Commits:** (بعد push)  
**Deploy:** (بعد deploy)

| البند | المحتوى |
|---|---|
| **Reply** | ↩️ رد على رسالة الغرفة · شريط preview فوق composer · quote في الفقاعة · `supabase-message-reply.sql` |
| **PM موبايل** | `pmInputText` في `useVisualViewportLayout` — الكيبoard ما يغطيش شريط الخاص |
| **Supabase** | شغّل `supabase-message-reply.sql` ثم راجع `supabase-production-hardening.sql` على SQL Editor |

**ملفات:** `ChatMessageRow.tsx`, `ChatScreen.tsx`, `useRoomComposer.ts`, `messagesService.ts`, `useVisualViewportOffset.ts`

**اختبار يدوي:** رد على نص/صورة · إلغاء الرد · غرفة مختلفة تمسح الرد · PM keyboard على iPhone

## 💬 لهجة المستخدم
- عامية مصرية
- ناقش قبل التنفيذ الكبير
