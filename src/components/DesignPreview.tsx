import React from 'react';

/**
 * DesignPreview — مكوّن معاينة مؤقت فقط.
 * الغرض منه عرض اتجاه التصميم الجديد لشاشة الدخول (لامة شات)
 * في نافذة الـ Preview ليوافق عليه المستخدم قبل تطبيقه على LoginScreen الحقيقي.
 * لا يحتوي على أي منطق تسجيل دخول فعلي.
 */
export default function DesignPreview() {
  return (
    <div
      dir="rtl"
      className="dp-root"
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        fontFamily: "'Cairo', system-ui, sans-serif",
        color: '#f7efe2',
        overflow: 'hidden',
        backgroundColor: '#1a0d12',
      }}
    >
      {/* خلفية: شباب وبنات بالتليفونات */}
      <img
        src="/preview/hero-youth.png"
        alt="شباب وبنات يمسكون هواتف عليها لامة شات"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.42,
        }}
      />
      {/* تعتيم متدرّج لإبراز المحتوى */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 35%, rgba(60,20,30,0.35), rgba(20,8,12,0.92))',
        }}
      />

      {/* badge المعاينة */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          insetInlineStart: 16,
          zIndex: 5,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(212,175,55,0.5)',
          color: '#e8c873',
          fontSize: 11,
          fontWeight: 800,
          padding: '6px 12px',
          borderRadius: 999,
          letterSpacing: '0.5px',
        }}
      >
        معاينة التصميم — قبل التنفيذ
      </div>

      {/* المحتوى */}
      <div
        style={{
          position: 'relative',
          zIndex: 4,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          padding: '48px 20px',
        }}
      >
        {/* الكارت الدهبي الكبير بحرفين A M */}
        <div
          style={{
            position: 'relative',
            width: 'min(360px, 86vw)',
            aspectRatio: '5 / 7',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow:
              '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.35)',
          }}
        >
          <img
            src="/preview/am-monogram-card.png"
            alt="كارت دهبي مروم بحرفين A M"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* لمعة ضوئية خفيفة */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 38%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* اسم التطبيق */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'clamp(34px, 8vw, 56px)',
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.1,
              background: 'linear-gradient(180deg, #f3d98a, #c89b3c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 30px rgba(212,175,55,0.25)',
            }}
          >
            لَامّة شات
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(247,239,226,0.7)',
            }}
          >
            مكان السهرة والونس — لمّة العمر كلها
          </p>
        </div>

        {/* فورم زجاجي بحدود دهبية (مثال) */}
        <div
          style={{
            width: 'min(380px, 90vw)',
            borderRadius: 20,
            padding: 20,
            background: 'rgba(28,14,18,0.55)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <FieldMock label="اسمك في اللمة" placeholder="اكتب اسمك..." />
          <FieldMock label="كلمة السر" placeholder="••••••••" />
          <button
            style={{
              marginTop: 4,
              width: '100%',
              padding: '13px 16px',
              borderRadius: 14,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 15,
              color: '#2a1410',
              background: 'linear-gradient(180deg, #f3d98a, #c89b3c)',
              boxShadow: '0 8px 24px rgba(212,175,55,0.35)',
            }}
          >
            يلا ادخل اللمة
          </button>
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 2,
            }}
          >
            <GhostBtn label="دخول بـ Google" />
            <GhostBtn label="دخول كضيف" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldMock({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label style={{ display: 'block' }}>
      <span
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 6,
          color: 'rgba(247,239,226,0.75)',
        }}
      >
        {label}
      </span>
      <div
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(212,175,55,0.25)',
          color: 'rgba(247,239,226,0.5)',
          fontSize: 14,
        }}
      >
        {placeholder}
      </div>
    </label>
  );
}

function GhostBtn({ label }: { label: string }) {
  return (
    <button
      style={{
        flex: 1,
        padding: '11px 10px',
        borderRadius: 12,
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 12.5,
        color: '#e8c873',
        background: 'rgba(212,175,55,0.08)',
        border: '1px solid rgba(212,175,55,0.35)',
      }}
    >
      {label}
    </button>
  );
}
