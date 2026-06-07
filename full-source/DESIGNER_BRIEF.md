# LAMMA CHAT — Designer Handoff (UI Only)

هدف الملف ده إن مصمم UI/UX يقدر يظبط “الشكل” للصفحة الخارجية والداخلية بدون ما يبوّظ أي منطق/Features.

## الرسالة المختصرة التي سيتم تنفيذها

نفّذ الصورة المرجعية التي تم اعتمادها كـDesktop Target UI (مرجع بصري)، لكن:

- التزم بالهوية والـtokens الموجودة في `src/index.css` (ممنوع تغيير الشعار/الفافيكون/ألوان الهوية الأساسية).
- شغلك UI فقط: spacing / typography / glass cards / message bubbles / responsive.
- ممنوع تغيير ترتيب/معنى الأيقونات أو أي منطق/وظائف.
- التعديل يكون فقط داخل:
  - `src/components/LoginScreen.tsx`
  - `src/components/ChatScreen.tsx`
  - `src/index.css` (للـclasses العامة فقط عند الحاجة)

## الصفحات المطلوبة

- صفحة الدخول/التسجيل: `src/components/LoginScreen.tsx`
- صفحة الشات (الصفحة الداخلية): `src/components/ChatScreen.tsx`

## قواعد ممنوع كسرها (غير قابلة للنقاش)

- ممنوع تغيير الهوية: الشعار/الفافيكون/ألوان الهوية الأساسية.
- ممنوع حذف أيقونات أو تغيير معانيها أو نقلها لمكان يغيّر الـUX.
- ممنوع تغيير أسماء الـstate/hooks/handlers أو تعديل أي منطق إرسال/استقبال/فتح رومات/Realtime.
- ممنوع إضافة Features جديدة.
- ممنوع تغيير مسارات الصور داخل `public/images/*` أو استبدالها بدون الرجوع.
- ممنوع إضافة dependencies جديدة (UI libraries أو غيره).

## المسموح (شغل تصميم فقط)

- تعديل الـspacing والـtypography والألوان داخل حدود الـtokens.
- تعديل Tailwind classes أو إضافة classes مساعدة (CSS) بشرط عدم لمس المنطق.
- تعديل شكل الكروت (Glass / Borders / Radius / Shadows) لتطابق الـStyle Guide.
- تحسين الـresponsive: على الموبايل/التابلت/الديسكتوب بدون ما الشات يتغطى.

## الـStyle Guide (Tokens)

المصدر الرئيسي للـtokens والـutilities:
- `src/index.css`

### Design Tokens

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

### Utilities (موجودة بالفعل)

- `.lamma-header` (Header ثابت 64px + blur)
- `.lamma-glass` (Glass base)
- `.lamma-soft-glow` (Glow خفيف)
- `.lamma-message` (Bubble للرسائل)

المطلوب استخدام الموجود وعدم اختراع Theme جديد.

## Layout Target (Desktop vs Mobile)

### Desktop (≥ xl)

- 3 أعمدة ثابتة (مش 4):
  - **اليسار**: عمود واحد (Widgets) **متقسم Sections** (مثلاً: متجر / راديو / خدمات)
  - **الوسط**: الشات (البطل الرئيسي) — لازم يكون أوسع عمود
  - **اليمين**: عمود واحد **متقسم Sections** (غرف فوق / متصلون تحت)
- الشات لازم يبقى أوسع عمود (Main focus).

### Mobile / Tablet

- الأعمدة الجانبية تتحول إلى Drawer/Sheets.
- ممنوع أي Drawer يغطي الشات بشكل مزعج أو يخفي الـheader.
- الـHeader ثابت 64px ولا يختفي على الموبايل.

## نقاط UI حساسة لازم تفضل كما هي (Stable Areas)

### ChatScreen.tsx

المنطقة دي حساسة من ناحية منطق، يُسمح فقط بتعديل الـclasses/الـstyling:
- Header (العلوي)
- 3 أعمدة الديسكتوب (asides)
- Message list + message bubble styling
- Bottom input bar

### LoginScreen.tsx

مسموح:
- تحسين الكارد/الهوفر/الحواف/توازن العناصر
- الحفاظ على الـlogo والهوية

## المطلوب تسليمه من المصمم (Deliverables)

- تصميم نهائي للـLogin والـChat (نفس الهوية) مع قواعد responsive واضحة.
- قائمة تغييرات واضحة (قبل/بعد) على:
  - spacing
  - font sizes
  - card styles
  - message bubble styles
- عدم إدخال أي dependency جديدة.
- Screenshots قبل/بعد للـDesktop/Tablet/Mobile.

## طريقة تنفيذ التغييرات في الكود (Developer Notes)

- استخدم Tailwind classes داخل `ChatScreen.tsx` / `LoginScreen.tsx` قدر الإمكان.
- لو احتجنا class جديدة عامة، تُضاف في `src/index.css` فقط.
- ممنوع تعديل أي ملفات Supabase/Auth/Realtime لأغراض تصميم.
  - ممنوع تعديل: `src/lib/*` أو `src/hooks/*` (إلا لو طُلب صراحة وبموافقة).

## QA سريع بعد أي تعديل تصميم

- Desktop: 1440px / 1280px: 3 أعمدة ظاهرة، الشات هو الأوسع، لا overflow مزعج.
- Tablet: 1024px/768px: الشات واضح، الدروار يفتح/يقفل بدون تغطية مستمرة.
- Mobile: 390px: الشات usable، الهيدر ثابت، input واضح، لا عناصر تتداخل.
