# Lamma Chat | شات لمة — مواصفات كاملة لإعادة البناء (Build.new / AI Builder)

> **الغرض:** هذا الملف يصف المشروع الحالي بالكامل حتى يُعاد بناؤه باحترافية أعلى (نفس الوظائف + UX/UI أفضل).
> **الموقع الحي:** https://lamma-arabic-chat-room.vercel.app
> **اللغة:** عربي (RTL) — لهجة مصرية في النصوص داخل التطبيق
> **التاريخ:** يونيو 2026

---

## 1. ملخص المنتج (Product Summary)

**Lamma Chat** منصة دردشة عربية اجتماعية (SPA + PWA) تجمع:

- غرف شات عامة متعددة (مصر، العرب، فرفشة، …)
- رسائل خاصة (PM) مع realtime
- منشورات اجتماعية (feed)
- متجر VIP / اشتراكات / مظهر (cosmetics)
- مكالمات صوت/فيديو WebRTC
- DJ / بث موسيقى للغرفة (المالك يشغّل — الباقي يسمع متزامن)
- لوحة تحكم للمالك (Owner) والإدارة (Admin)
- **بوت تصميم AI** — المالك يكتب أوامر طبيعية لتغيير شكل الموقع (ألوان، زجاج، خلفيات، هيدر، …)
- PWA للموبايل مع شريط سفلي وdrawers

**الجمهور:** مستخدمون عرب (مصر والوطن العربي)، دخول سريع كزائر أو حساب كامل.

**ما المطلوب من Build.new:**
إعادة بناء نفس المنتج بواجهة **أكثر احترافية** (Typography، spacing، animations، performance، فصل مكونات ChatScreen الضخم) مع **الحفاظ على كل الميزات** و**Supabase** كbackend.

---

## 2. الهوية البصرية (Brand — لا تغيّر بدون إذن)

| العنصر | القيمة |
|--------|--------|
| الاسم | Lamma Chat \| شات لمة |
| الاتجاه | RTL (`dir="rtl"`) |
| الخلفية الأساسية | `#050806` / `#060a12` |
| Accent رئيسي | `#10b981` (أخضر emerald) |
| Accent ثانوي | `#a3e635` / `#06b6d4` |
| نص | `#f8fafc` / muted `#94a3b8` |
| VIP / ذهب | `#eab308`, `#fbbf24` |
| Danger | `#ef4444` |
| أسلوب UI | **Frosted glass** — blur، borders شفافة، glow خفيف |
| خلفية الشات الافتراضية | `/MAN.png` (صورة في `public/`) |
| الشعار | `AMLogo`, `BossSigil` — assets في `public/images/` |
| Theme color PWA | `#060a12` |

**CSS tokens** (مصدر: `src/index.css`):

```css
:root {
  --bg-primary: #050806;
  --bg-secondary: #0b120d;
  --accent-primary: #10b981;
  --accent-secondary: #a3e635;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --danger: #ef4444;
  --warning: #f59e0b;
  --glass-bg: rgba(255, 255, 255, 0.04);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glow-color: rgba(16, 185, 129, 0.18);
}
```

**Utilities:** `.lamma-glass`, `.lamma-header` (64px fixed), `.lamma-message`, `.lamma-neutral-glass`

---

## 3. التقنيات (Tech Stack)

| الطبقة | التقنية |
|--------|---------|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS v4, CSS modules في `index.css` + ملفات `src/styles/` |
| Animation | Motion (framer-motion successor) |
| Icons | lucide-react |
| Backend | **Supabase** (Auth, Postgres, Realtime, Storage) |
| Deploy | Vercel (SPA rewrites + serverless `api/`) |
| PWA | Service Worker `public/sw.js`, `manifest.json` |
| Calls | WebRTC + Supabase `call_signals` للإشارة |
| Optional | Gemini endpoint للبحث الذكي |

**لا Next.js** — المشروع الحالي Vite SPA. Build.new يمكنه اختيار Next.js أو Vite؛ المهم الحفاظ على Supabase client-side + RLS.

---

## 4. هيكل التطبيق (Architecture)

```
Browser
  → index.html → main.tsx → App.tsx
       → LoginScreen (no session)
       → ChatScreen (lazy loaded, ~12k lines — يحتاج تقسيم)
       → hooks (messages, PM, calls, presence, style engine, PWA)
       → services (chat, auth, calls, store, social, design)
       → Supabase (REST + Realtime + Storage)
  → /api/auth-config (Vercel)
  → /api/sitemap (SEO)
```

### 4.1 جلسة المستخدم

- **Guest:** anonymous Supabase auth + `localStorage` nickname/uid/color
- **Registered:** Email/password أو Google OAuth
- **Nickname إجباري** لحسابات Supabase (user_metadata)
- **Roles:** `owner`, `admin`, `mod`, `user` — من `user_roles` + metadata

### 4.2 App.tsx

- يقرأ guest session من localStorage
- `supabase.auth.getSession()` + `onAuthStateChange`
- Theme: `primaryTheme` = `dark` | `amoled` (inline، لا theme system منفصل)
- PWA: `UpdateBanner`, `OnlineStatus`, `InstallPrompt`

---

## 5. الشاشات والتخطيط (Pages & Layout)

### 5.1 LoginScreen

- Hero background (`VITE_LOGIN_HERO_BG`)
- تبويبات: زائر | دخول | تسجيل
- Google OAuth
- إكمال nickname للحسابات الناقصة
- PWA install prompt
- Branding من env (`VITE_BRAND_NAME`, `VITE_BRAND_CREDIT`)

### 5.2 ChatScreen — التخطيط Desktop (≥ xl)

**3 أعمدة** (الشات في الوسط — الأوسع):

| العمود | المحتوى |
|--------|---------|
| **يسار** | Widgets متعددة الأقسام: VIP store، راديو، خدمات، … (نسب قابلة للسحب) |
| **وسط** | الشات الرئيسي: header غرفة، رسائل، composer |
| **يمين** | غرف + متصلون (sections قابلة للresize) |

- Header علوي ثابت ~64px
- خلفية wallpaper layer: `activeRoomBg` = `roomBgMap[room]` → `ownerBgImage` → `/MAN.png`
- Universal Style Engine يمكنه overlay فيديو/صورة/global CSS

### 5.3 ChatScreen — Mobile / PWA

- `lamma-pwa-app-shell`
- شريط سفلي: غرف، PM، إعدادات، …
- Sidebars → drawers/sheets
- `useVisualViewportOffset` لشريط الكتابة مع لوحة المفاتيح
- **Critical:** composer لا يختفي خلف keyboard؛ لا black void

---

## 6. الغرف (Rooms)

| ID | الاسم | ملاحظات |
|----|-------|---------|
| `egypt` | مصر 🇪🇬 | افتراضي |
| `arab` | كل العرب 🌍 | |
| `youth` | لمة شباب وبنات 👫 | |
| `palestine` | فلسطين 🇵🇸 | |
| `posts-feed` | المنشورات 📰 | Social feed — ليس شات تقليدي |
| `fun` | فرفشة 🥳 | |
| `games` | Games 🎮 | بوت ألعاب |
| `romance` | رومانسية 💖 | |
| `admin` | الإدارة والشكاوى 🛡️ | |
| `owner` | بوت التصميم AI 🎨 | **ownerOnly** — أوامر تصميم |

- غرف مخصصة: `customRooms` في localStorage
- Deep link: `?room=egypt`
- PWA shortcuts: مصر، العرب، راديو

---

## 7. الميزات التفصيلية (Feature List)

### 7.1 الشات العام

- [ ] رسائل نصية realtime (Supabase postgres_changes)
- [ ] Reactions JSON على الرسائل
- [ ] رفع صور → Storage bucket `chat-media`
- [ ] Rate limit: 3 وسائط/دقيقة
- [ ] رسائل صوتية (voice recorder hook)
- [ ] YouTube embed في الرسائل
- [ ] هدايا (gift types: وردة، قلب، تاج، …)
- [ ] @mention + إشعار + badge
- [ ] صوت تنبيه + browser notification (`messageAlertService`)
- [ ] Toast عند رسالة جديدة
- [ ] حذف: owner/admin أو صاحب الرسالة
- [ ] بوت صيانة: `/clear`, `/guard`, `/status`
- [ ] Word wall — كلمات ممنوعة من owner_settings
- [ ] Anti-links, anti-spam, swear filter (bot rules)
- [ ] قراءة آخر 100 رسالة (desc + reverse)
- [ ] Identity binding: sender_uid من السيرفر (trigger) — لا spoof

### 7.2 رسائل خاصة (PM)

- [ ] `pm_messages` table
- [ ] Realtime channel (insert/update/delete)
- [ ] Mark read — receiver فقط `is_read`
- [ ] Trigger: receiver لا يعدّل نص الرسالة
- [ ] Threads في localStorage (per user)
- [ ] PM list dropdown + unread count
- [ ] رفع صورة PM: `pm/<nickname>/...`
- [ ] Spy mode للمالك (channel واحد)

### 7.3 المكالمات WebRTC

- [ ] Audio / Video calls
- [ ] Signaling عبر `call_signals` + Realtime
- [ ] Identity binding على from_uid
- [ ] TURN/STUN (env optional + public relays)
- [ ] صلاحيات per-member: `calls_allowed`

### 7.4 DJ / موسيقى الغرفة

- [ ] Owner يشغّل — listeners sync (`roomDjService`)
- [ ] `startedAtMs` aligned مع playback
- [ ] Drift correction, preload
- [ ] `room_dj_map`, `dj_library` في owner_settings

### 7.5 المنشورات (Social)

- [ ] `social_posts`, `post_likes`, `post_comments`, `user_profiles`
- [ ] Feed room `posts-feed`
- [ ] Hook: `useSocialFeed`

### 7.6 المتجر والاشتراكات

- [ ] VIP subscriptions
- [ ] `subscription_orders` — user_id = auth.uid()
- [ ] Store panel: VIP, skins, badges
- [ ] Owner store management
- [ ] Cosmetics grants: frames VIP/platinum

### 7.7 لوحات الإدارة

**Owner Leadership Modal** (tabs):

| Tab | الوظيفة |
|-----|---------|
| quick | OwnerPanel — ghost, spy, maintenance, mute, bot, … |
| features | صلاحيات أعضاء (recording, calls, radio, rooms, images, youtube) |
| cosmetics | إطارات VIP للأعضاء |
| guard | Word wall + bans |
| store | إعدادات المتجر |
| design | DesignCenter — خلفيات، شعار، presets، glass، face |
| owner_store | إدارة منتجات المالك |
| stats | إحصائيات |

**Admin Panel:** شكاوى، moderators  
**Guard Panel:** bans list

### 7.8 بوت التصميم AI (Universal Visual Style Engine)

- غرفة `owner` — المالك فقط
- يكتب أوامر عربية/إنجليزية طبيعية
- Parser: `universalStyleEngine.ts` + `chatDesignVocabulary.ts`
- معاينة حية على DOM + بطاقة StyleSandbox في الشات
- أزرار: **تطبيق على الكل** | **إلغاء / تعديل**
- حفظ في `owner_settings.universal_style_config` (jsonb) + localStorage
- أمثلة أوامر:
  - «زجاج أكثر ضباب»
  - «شريط نور على بطاقات الأعمدة»
  - «رجّع الخلفية الافتراضية»
  - «مصطلحات» — قائمة أجزاء الشات
- Design Center: زر **↩ رجوع للخلفية الافterاضية (/MAN.png)**

### 7.9 ملفات شخصية

- [ ] UserProfileModal / Page / Bio popup
- [ ] Avatar upload
- [ ] Friends, block, ignore lists (localStorage scoped per user)

### 7.10 PWA

- [ ] manifest.json — standalone, RTL, shortcuts
- [ ] Service worker caching
- [ ] Update banner بعد deploy
- [ ] Offline page
- [ ] `VITE_ENABLE_PWA=true` on Vercel only

### 7.11 أخرى

- [ ] Invite-only mode
- [ ] Reading mode
- [ ] Chat layout prefs (column section percentages)
- [ ] Custom face presets (column background images)
- [ ] Glass form presets, column card styles
- [ ] Activity logs للمالك
- [ ] Nickname change requests
- [ ] Gemini search (optional endpoint)
- [ ] Share modal + deep links
- [ ] Create custom room modal

---

## 8. قاعدة البيانات Supabase

**Project ref:** `detvapbvkabvdjsdttfy`

### 8.1 الجداول الرئيسية

| Table | الغرض |
|-------|--------|
| `messages` | رسائل الغرف |
| `pm_messages` | رسائل خاصة |
| `banned_users` | المحظورون |
| `user_roles` | owner/admin/mod/user |
| `owner_settings` | إعدادات المالك global (row id=`global`) |
| `owner_member_permissions` | صلاحيات per nickname |
| `owner_member_cosmetics` | VIP frames per nickname |
| `owner_activity_logs` | سجل نشاط |
| `nickname_change_requests` | طلبات تغيير اسم |
| `vip_subscriptions` | اشتراكات |
| `subscription_orders` | طلبات VIP |
| `call_signals` | WebRTC signaling |
| `guest_sessions` | جلسات الزوار |
| `social_posts`, `post_likes`, `post_comments`, `user_profiles` | شبكة اجتماعية |

### 8.2 owner_settings — حقول مهمة

```text
ghost_mode, spy_mode, maintenance_mode, global_mute, global_mic_mute
vip_only_images, bot_silent, ads_enabled, greetings_enabled
banned_words (jsonb), owner_bg_image, custom_logo_url
room_bg_map (jsonb), design_presets (jsonb)
room_dj_map, dj_library (jsonb)
bot_enabled, bot_rule_anti_links, bot_rule_anti_spam, bot_rule_swear_filter
invite_only_mode, universal_style_config (jsonb)
chat_theme, wall_theme, glow_color
```

### 8.3 Storage

- Bucket: `chat-media` (public read)
- Paths: room media, PM, design uploads, avatars

### 8.4 SQL migrations (بالترتيب للإنتاج)

1. `supabase-schema.sql`
2. `supabase-storage.sql`
3. `supabase-production-hardening.sql`
4. `supabase-social-network.sql`
5. `supabase-security-audit-fixes.sql`
6. `supabase-identity-hardening.sql`
7. `supabase-universal-style.sql`
8. `supabase-launch-hardening.sql`

أو: `node scripts/apply-production-setup.mjs` مع `SUPABASE_ACCESS_TOKEN`

### 8.5 أمان (Production hardening)

- RLS على كل الجداول
- Anonymous auth للزوار
- Triggers: identity binding messages, PM read-only updates, call_signals
- `is_message_clean` — moderation function
- Verify: `node scripts/verify-production-hardening.mjs` (9 checks)

---

## 9. Realtime & Hooks

| Hook / Service | المسؤولية |
|----------------|-----------|
| `useChatMessages` | fetch + subscribe messages, batch inserts |
| `usePrivateMessages` | PM threads, mark read debounce |
| `useOnlinePresence` | presence channel |
| `useWebRTCCalls` | calls lifecycle |
| `useUniversalStyleEngine` | design bot preview/apply/cancel |
| `useSocialFeed` | posts feed |
| `useRoomComposer` | input, bot commands, style prompts |
| `useVoiceMessageRecorder` | mic recording |
| `useServiceWorker` | PWA updates |
| `useVisualViewportOffset` | mobile keyboard |
| `useIsMobileViewport` | responsive breakpoints |
| `messagesService` | CRUD + realtime |
| `roomDjService` | DJ sync |
| `messageAlertService` | sound + notifications |

---

## 10. Environment Variables

```env
# Required
VITE_SUPABASE_URL=https://detvapbvkabvdjsdttfy.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_APP_URL=https://lamma-arabic-chat-room.vercel.app

# Production PWA (Vercel build.env)
VITE_ENABLE_PWA=true

# Optional
VITE_GEMINI_SEARCH_ENDPOINT=
VITE_BRAND_NAME="Lamma Chat"
VITE_BRAND_CREDIT="..."
VITE_LOGIN_HERO_BG="/images/login-hero.jpg"
VITE_TURN_URL / USERNAME / CREDENTIAL (WebRTC)
```

---

## 11. API Routes (Vercel)

| Route | الوظيفة |
|-------|---------|
| `api/auth-config.js` | يمرر Supabase URL/key للـ OAuth config |
| `api/sitemap.js` | SEO sitemap |

---

## 12. الملفات الحرجة (Critical Files)

| File | ملاحظة |
|------|--------|
| `src/components/ChatScreen.tsx` | ~12k سطر — **أولوية تقسيم** |
| `src/components/LoginScreen.tsx` | دخول |
| `src/App.tsx` | Session orchestrator |
| `src/index.css` | Design tokens + glass system |
| `src/styles/universal-style-engine.css` | Design bot CSS |
| `src/lib/chatConstants.ts` | Rooms, gifts, emoticons |
| `src/lib/chatTypes.ts` | TypeScript contracts |
| `src/lib/supabase.ts` | Client + types |

---

## 13. User Flows (للمصمم / Build.new)

### Flow 1: زائر سريع
1. Login → «دخول كزائر»
2. يختار nickname + لون
3. ChatScreen → غرفة مصر
4. يكتب رسالة → realtime للجميع

### Flow 2: تسجيل + Google
1. Sign up email أو Google
2. إكمال nickname إن لزم
3. Full features: PM, posts, store

### Flow 3: مالك — تصميم
1. يفتح غرفة «بوت التصميم AI»
2. يكتب: «خلفية زرقاء dark glass»
3. معاينة حية → تطبيق على الكل → يحفظ Supabase
4. إلغاء → يرجع للستايل المحفوظ + `/MAN.png`

### Flow 4: PM
1. ضغط على عضو → «رسالة خاصة»
2. محادثة realtime
3. إشعار + صوت عند رسالة جديدة

### Flow 5: مكالمة
1. من بروفايل العضو → اتصال صوت/فideo
2. Signaling → WebRTC connect

---

## 14. ما يُفترض تحسينه في إعادة البناء (Professional Upgrade)

Build.new / الفريق الجديد يركز على:

1. **تقسيم ChatScreen** إلى modules: `ChatLayout`, `MessageList`, `Composer`, `Sidebars`, `ModalsHost`, `OwnerPanels`
2. **State management** أوضح (Zustand/React Query للـ Supabase cache)
3. **Design system** موحد (tokens → components: Button, GlassCard, Modal, Bubble)
4. **Accessibility:** aria-live للرسائل، focus trap في modals
5. **Performance:** virtualized message list، code-split modals
6. **Mobile-first QA:** PWA shell, keyboard, safe-area
7. **Error boundaries** per section
8. **i18n ready** (Arabic first)
9. **E2E tests** للـ flows الحرجة (login, send message, PM, cancel design preview)
10. **احترافية UI:** micro-interactions، loading skeletons، empty states

**لا تغيّر:** Supabase schema contracts، RLS policies، brand colors/logo، room IDs (deep links + PWA shortcuts).

---

## 15. Prompt جاهز لـ Build.new (انسخه كما هو)

```
Build an Arabic RTL social chat platform "Lamma Chat | شات لمة" — professional rebuild of an existing Vite+React+Supabase app.

PRODUCT:
- Multi-room public chat (rooms: egypt, arab, youth, palestine, fun, games, romance, admin, posts-feed, owner-design-bot)
- Private messages with realtime, read receipts, media upload
- Social posts feed
- VIP store & subscriptions
- WebRTC audio/video calls with Supabase signaling (call_signals table)
- Room DJ: owner plays music, listeners hear synchronized playback
- Owner admin panel: ghost/spy/maintenance, word wall, member permissions, cosmetics, stats
- AI Design Bot room (owner only): natural language commands change live site theme (glass, colors, backgrounds, sidebar neon chase, chat header styles) with preview + apply/cancel + persist to Supabase owner_settings.universal_style_config
- PWA mobile app shell with bottom nav, drawers, keyboard-safe composer

STACK:
- React 19, TypeScript, Vite, Tailwind v4, Motion, lucide-react
- Supabase Auth (guest anonymous + email + Google OAuth), Postgres, Realtime, Storage bucket chat-media
- Deploy Vercel SPA + api/auth-config + api/sitemap
- RTL Arabic UI, Egyptian Arabic copy tone

DESIGN:
- Dark frosted glass aesthetic
- Primary accent #10b981, bg #060a12, text #f8fafc
- Default chat wallpaper /MAN.png
- Desktop: 3 columns (left widgets | center chat hero | right rooms+online)
- Mobile: PWA bottom bar, side drawers, fixed 64px header
- Do NOT change brand logo assets concept

DATABASE (Supabase):
Tables: messages, pm_messages, banned_users, user_roles, owner_settings, owner_member_permissions, owner_member_cosmetics, call_signals, social_posts, post_likes, post_comments, user_profiles, vip_subscriptions, subscription_orders, guest_sessions
RLS hardened with identity triggers — preserve security model

KEY UX:
- Login: guest / email / Google / mandatory nickname
- Message reactions, gifts, youtube embeds, voice notes, image upload (3/min rate limit)
- Message alerts: sound + browser notification + toast when tab unfocused
- Design preview cancel must fully restore previous style AND default wallpaper /MAN.png
- Owner can reset wallpaper via design center button or bot command "رجّع الخلفية الافterاضية"

Improve over original: split monolithic ChatScreen, better typography/spacing, virtualized messages, cleaner component architecture, loading/empty states — same feature parity.

Production URL reference: https://lamma-arabic-chat-room.vercel.app
Supabase project: detvapbvkabvdjsdttfy
```

---

## 16. مراجع داخل الريpo

| ملف | محتوى |
|-----|--------|
| `README.md` | تشغيل محلي |
| `AGENTS.md` | Cloud agents + env |
| `CODE_WIKI.md` | معمارية (بعض أقسام قديمة) |
| `DESIGNER_BRIEF.md` | UI handoff rules |
| `NOTES.md` | سجل features done/todo |
| `.env.example` | env template |

---

## 17. Checklist قبل Go-Live لإعادة البناء

- [ ] كل الغرف تعمل + deep links
- [ ] Guest + registered + Google auth
- [ ] Realtime messages + PM
- [ ] Image upload + storage policies
- [ ] Owner settings sync
- [ ] Design bot preview/apply/cancel/reset wallpaper
- [ ] PWA install + mobile composer
- [ ] WebRTC calls (至少 audio)
- [ ] DJ sync
- [ ] RLS verification 9/9
- [ ] CSP headers (vercel.json pattern)
- [ ] Production on lamma-arabic-chat-room.vercel.app

---

*نهاية المواصفات — Lamma Chat rebuild spec v1*
