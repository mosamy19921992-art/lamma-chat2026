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
- Tokens في `src/index.css`: `--accent-primary`, `--accent-secondary`

## 💬 لهجة المستخدم
- عامية مصرية
- ناقش قبل التنفيذ الكبير
