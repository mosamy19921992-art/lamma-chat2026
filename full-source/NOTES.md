# ملاحظات جلسات LAMMA CHAT (ذاكرة دائمة)

## 📌 المشروع
- **الاسم:** Lamma Chat | شات لمة
- **Stack:** React + TypeScript + Vite + TailwindCSS + Supabase
- **الموقع:** https://lamma-chat2026.vercel.app/
- **Supabase Project:** `detvapbvkabvdjsdttfy`
- **GitHub:** mosamy19921992-art/lamma-chat2026
- **الـ env vars:** `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` على Vercel
- **Bucket:** `chat-media` (Public) — يستخدم في رفع الصور

## 🎯 قواعد مهمة في الكود (ممنوع نكسرها)
- ممنوع نضيف features من غير إذن المستخدم: "مش تعملى حاجه الا لما اقولك اعملى"
- ممنوع تغيير الهوية/الشعار/الفافيكون/ألوان `src/index.css`
- اللينت بيشتغل بـ `npm.cmd run lint` (PowerShell ExecutionPolicy بيكسر، بس tsc شغال)
- اللينت = `tsc --noEmit` (0 = تمام)
- الرفع = `git add -A; git commit -m "..."; git push origin main`
- الملفات المسموح نعدل فيها: `src/components/LoginScreen.tsx`, `src/components/ChatScreen.tsx`, `src/index.css`
- ممنوع: `src/lib/*`, `src/hooks/*` إلا بموافقة

## ✅ اللي اتعمل (Status: Done)
1. **دخول Supabase:**
   - Email/password + Google OAuth + Guest
   - Supabase Auth: Google Provider Enabled
   - OAuth Client ID: `629244985666-qpau1s8bf6r86llrabbdtb0c97i5hn75.apps.googleusercontent.com`
   - Authorized redirect URI: `https://detvapbvkabvdjsdttfy.supabase.co/auth/v1/callback`
   - Vercel + localhost origins
2. **اسم إجباري:**
   - إجباري وقت Signup (input جديد `signupNickname`)
   - إجباري لأول دخول للحسابات القديمة (مودال `showProfileNicknameModal`)
   - بيُحفظ في `user_metadata.nickname` عبر `supabase.auth.updateUser({ data: { nickname } })`
3. **رفع الصور:**
   - زر (+) → "رفع صورة" (Supabase Storage) + "رابط صورة" (prompt)
   - رفع من الجهاز → `chat-media` bucket → `media_url` في messages
   - **قفل:** مسجلين فقط (`authProvider === "supabase"`)
   - حد أقصى 5MB، نوع image/* فقط
4. **رفع صورة PM:**
   - dropdown الـ PM → صورة → input ملف
   - بتترفع على `pm/<nickname>/...` في `chat-media`
   - تعرض في الفقاعات
5. **Rate limit:** 3 وسائط / دقيقة لكل مستخدم (rooms + pm)
6. **حذف رسائل (#3):**
   - زر 🗑️ في popover التفاعل
   - للـ Owner/Admin/صاحب الرسالة
   - بيمسح من state + localStorage + Supabase
   - RLS DELETE policy في `supabase-schema.sql`
7. **إشعارات (#6):**
   - dropdown ديناميكي (mention + رسائل + badge بعدد unread)
   - يحفظ في localStorage
   - أزرار: "تحديد الكل كمقروء" + "مسح الكل"
8. **صوت (#7):**
   - Web Audio API (sine wave 880→440 Hz)
   - يشتغل بس لو الـ tab مش في الـ focus
9. **بوتات + حماية:** قائمة بحدود، /clear, /guard, /status
10. **LocalStorage fallback** + **Real-time** (Supabase postgres_changes)

## 🟡 ناقص / ممكن نعمل (مفتوح للنقاش)
1) رفع فيديو/صوت من الجهاز (مش رابط)
2) PM مع Real-time
3) Edit رسالة
4) Typing indicator في العام
5) Sound toggle (On/Off) للمستخدم
6) Max length للرسالة (500 حرف)
7) Drag & drop للصور
8) بوت AI (Gemini) في أوضة — ينتج صور/نصوص في الشات مباشرة
9) معاينة قبل الإرسال
10) اختصار Ctrl+Enter

## 📁 Commits المهمة
- `3c69dd0` — feat(chat): delete msg, in-app notifications + sound, mentions
- `e7c63b5` — feat(chat): pm image upload + room image-url option + media rate limit
- `46313c2` — feat(chat): upload images via Supabase Storage (registered users only)
- `auth: require username on signup and first login`

## 🖼 التصميم
- الهوية: أخضر لامع + أسود + ذهب VIP
- الفونت: Cairo / Tajawal (مفروض)
- خلفية الشات: صورة Castle + Crescent Moon
- الـ Layout: 3 أعمدة (متجر يسار، شات وسط، غرف يمين)
- Tokens في `src/index.css`:
  - `--accent-primary: #10b981`
  - `--accent-secondary: #a3e635`

## 🛠 أدوات متاحة / غير متاحة
- ✅ File: Read/Edit/Write
- ✅ Terminal (PowerShell — بعض أوامر ps1 بتتعارض مع ExecutionPolicy)
- ✅ WebSearch / WebFetch
- ❌ Integrated Browser MCP (مش متاحة كأداة أقدر أندهها في Session الحالي)
- ❌ AskUserQuestion (بيتعطل أحيانًا)
- ⏳ Schedule (متاحة)

## 💬 لهجة المستخدم
- عامية مصرية
- بيحب نتناقش الأول قبل ما نعمل
- أسلوبه: "خشى ... كملى ... مش تعملى حاجه الا لما اقولك"
- قراراته تصميمية بحتة أحيانًا
