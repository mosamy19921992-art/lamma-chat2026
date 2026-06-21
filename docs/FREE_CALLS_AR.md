# مكالمات مجانية بأعلى جودة ممكنة — بدون اشتراك مدفوع

## الحقيقة باختصار

| المكوّن | مجاني؟ | الجودة |
|---------|--------|--------|
| **STUN** (اتصال مباشر P2P) | ✅ نعم | ⭐⭐⭐⭐⭐ الأفضل — صوت/فيديو بدون وسيط |
| **TURN مجاني مشترك** (Open Relay) | ✅ نعم | ⭐⭐⭐ جيد — محدود ~50 GB/شهر ومشارك مع آلاف التطبيقات |
| **TURN خاص (coturn)** | ✅ تقريباً | ⭐⭐⭐⭐⭐ — **أفضل حل مجاني** إذا عندك VPS مجاني |

**TURN = relay** — يمرّر الصوت/الفيدio عبر سيرفر عندما الشبكة تمنع الاتصال المباشر.  
**STUN = كشف العنوان** — يساعد الجهازين يتصلوا **مباشرة** (أفضل جودة وأقل تأخير).

التطبيق الآن يستخدم **4 STUN + relay مجاني + bundle احتياطي** — من أقوى الإعدادات المجانية بدون سيرفر خاص.

---

## ما تم في الكود (مجاني 100%)

1. **STUN متعدد** — Google ×4 + Cloudflare + Mozilla + Nextcloud + Blackberry  
2. **Relay مجاني** — Open Relay (Metered) مع UDP + TCP + TLS  
3. **Failover أسرع** — 2.5 ثانية بدل 4  
4. **ICE pool** — جمع المرشحين أسرع عند بدء المكالمة  
5. **max-bundle** — أقل overhead على الشبكة  

**على Vercel:** متغيرات `VITE_TURN_*` مضبوطة على Open Relay — **لا تحتاج تدفع**.

---

## متى تكفي الخطة المجانية الحالية؟

✅ مناسبة إذا:
- مئات المكالمات/اليوم (مش آلاف)
- غالبية المستخدمين شبكات عادية (Wi‑Fi / 4G)
- مقبول أن 5–15% من المكالمات قد تحتاج relay مشترك

⚠️ قد تحتاج upgrade (أو coturn خاص) إذا:
- آلاف المكالمات يومياً
- relay المجاني بطيء أو منقطع في أوقات الذروة

---

## أفضل حل مجاني على المدى الطويل: coturn على VPS مجاني

**تكلفة شهرية: 0$** — تحتاج ساعة إعداد مرة واحدة.

### خيارات VPS مجاني (2025–2026)

| مزود | الخطة | ملاحظة |
|------|-------|--------|
| [Oracle Cloud Always Free](https://www.oracle.com/cloud/free/) | ARM 4 OCPU / 24 GB | **الأفضل** لـ coturn |
| Google Cloud | $300 trial 90 يوم | مؤقت |
| AWS | Free tier 12 شهر | مؤقت |

### خطوات سريعة (Oracle + Docker)

1. أنشئ VM Ubuntu على Oracle (Always Free)
2. افتح ports: `3478` UDP/TCP، `49152-65535` UDP (relay range)
3. على السيرفر:

```bash
sudo apt update && sudo apt install -y docker.io
sudo docker run -d --name coturn --restart=always --network=host \
  -e TURN_REALM=lamma.chat \
  -e TURN_USER=lamma \
  -e TURN_PASSWORD=YOUR_STRONG_PASSWORD \
  instrumentisto/coturn
```

4. في **Vercel → Environment Variables** (Production):

```
VITE_TURN_URL=turn:YOUR_VM_IP:3478,turns:YOUR_VM_IP:5349
VITE_TURN_USERNAME=lamma
VITE_TURN_CREDENTIAL=YOUR_STRONG_PASSWORD
```

5. **Redeploy**

→ مكالماتك على **سيرفرك** — بدون حد 50GB مشترك، بدون اشتراك Metered.

---

## نصائح لرفع الجودة بدون فلوس

1. **Wi‑Fi أفضل من 4G** للفيدio — اقترح على المستخدمين
2. **صوت قبل فيdeo** — أقل bandwidth
3. **مكالمة من شبكتين مختلفتين** عند الاختبار (Wi‑Fi + 4G)
4. **لا تعتمد على relay فقط** — STUN المتعدد يزيد فرصة P2P المباشر

---

## الخلاصة

| الهدف | الحل |
|-------|------|
| **دلوقتي، بدون دفع، بدون إعداد** | ✅ Open Relay + STUN محسّن (مفعّل على Vercel) |
| **أعلى جودة مجانية** | coturn على Oracle Always Free |
| **مدفوع** | Metered / Twilio — فقط لو عدّيت حدود المجاني |

**مش محتاج تدفع دلوقتي** — الإعداد الحالي من أقوى ما يمكن مجاناً.  
لو عدّى الاستخدام، Oracle + coturn = نفس جودة المدفوع بدون اشتراك شهري.
