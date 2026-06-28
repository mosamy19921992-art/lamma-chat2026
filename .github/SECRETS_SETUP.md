# GitHub Secrets — تفعيل فحص الإنتاج التلقائي

أضف هذين الـ secrets في: **Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret | القيمة |
|---|---|
| `VITE_SUPABASE_URL` | `https://detvapbvkabvdjsdttfy.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | من Supabase Dashboard → Project Settings → API → anon public |

## ماذا يفعّل؟

- **CI (`ci.yml`)** — job `verify-production` على كل push لـ `main` (`continue-on-error: true` لو الـ secrets ناقصة)
- **Scheduled (`verify-scheduled.yml`)** — فحص أسبوعي + تشغيل يدوي من Actions tab

## محلي

```bash
npm run verify:all
```

يتطلب `.env.local` بنفس المتغيرين.
