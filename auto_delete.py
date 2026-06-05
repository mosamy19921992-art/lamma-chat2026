#!/usr/bin/env python3
"""حذف تلقائي للمستودعات غير المستخدمة"""

import requests

TOKEN = "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"
OWNER = "mosamy19921992-art"

# القائمة: المستودع + هل نحذفه؟
REPOS_TO_DELETE = ["lamma-chat27"]  # نحذف ده
REPOS_TO_KEEP = ["lamma-chat2026"]   # نسيب ده

headers = {
    'Authorization': f'token {TOKEN}',
    'Accept': 'application/vnd.github.v3+json'
}

print("="*60)
print("🧹 تنظيف تلقائي للمستودعات")
print("="*60)

# جلب كل المستودعات أولاً
print("\n📥 جاري جلب قائمة المستودعات...")
response = requests.get(
    'https://api.github.com/user/repos',
    headers=headers,
    params={'per_page': 100}
)

if response.status_code != 200:
    print(f"❌ خطأ في جلب المستودعات: {response.status_code}")
    exit(1)

all_repos = response.json()
print(f"✅ تم العثور على {len(all_repos)} مستودع")

# عرض التحليل
print("\n" + "="*60)
print("📊 تحليل المستودعات:")
print("="*60)

for repo in all_repos:
    name = repo['name']
    if name in REPOS_TO_DELETE:
        status = "🗑️  سيتم الحذف"
    elif name in REPOS_TO_KEEP:
        status = "✅ سيتم الاحتفاظ"
    else:
        status = "⚠️  غير مصنف"
    
    print(f"  • {name}: {status}")

# تنفيذ الحذف
print("\n" + "="*60)
print("🗑️  تنفيذ الحذف:")
print("="*60)

deleted = []
failed = []

for repo in all_repos:
    name = repo['name']
    
    if name in REPOS_TO_DELETE:
        print(f"\n🗑️  حذف {name}...")
        
        response = requests.delete(
            f'https://api.github.com/repos/{OWNER}/{name}',
            headers=headers
        )
        
        if response.status_code == 204:
            print(f"   ✅ تم الحذف بنجاح")
            deleted.append(name)
        else:
            print(f"   ❌ فشل الحذف: {response.status_code}")
            failed.append(name)

# النتيجة النهائية
print("\n" + "="*60)
print("📋 النتيجة النهائية:")
print("="*60)

if deleted:
    print(f"\n✅ تم حذف {len(deleted)} مستودع:")
    for name in deleted:
        print(f"  • {name}")

if failed:
    print(f"\n❌ فشل حذف {len(failed)} مستودع:")
    for name in failed:
        print(f"  • {name}")

kept = [r['name'] for r in all_repos if r['name'] in REPOS_TO_KEEP]
if kept:
    print(f"\n✅ تم الاحتفاظ بـ {len(kept)} مستودع:")
    for name in kept:
        print(f"  • {name}")

print("\n" + "="*60)
print("👋 انتهت عملية التنظيف!")
print("="*60)
