#!/usr/bin/env python3
"""حذف مستودع lamma-chat27 مباشرة"""

import requests

TOKEN = "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"
OWNER = "mosamy19921992-art"
REPO = "lamma-chat27"

headers = {
    'Authorization': f'token {TOKEN}',
    'Accept': 'application/vnd.github.v3+json'
}

print("="*60)
print("🗑️  حذف مستودع lamma-chat27")
print("="*60)

# التأكد من وجود المستودع
response = requests.get(
    f'https://api.github.com/repos/{OWNER}/{REPO}',
    headers=headers
)

if response.status_code == 404:
    print("ℹ️  المستودع غير موجود (قد تم حذفه بالفعل)")
    exit(0)
elif response.status_code != 200:
    print(f"❌ خطأ: {response.status_code}")
    print(response.json())
    exit(1)

repo_data = response.json()
print(f"\n📦 اسم المستودع: {repo_data['name']}")
print(f"🔒 خاص: {'نعم' if repo_data['private'] else 'لا'}")
print(f"📅 تاريخ الإنشاء: {repo_data['created_at'][:10]}")
print(f"🔄 آخر تحديث: {repo_data['updated_at'][:10]}")
print(f"💾 الحجم: {repo_data['size']} KB")

print("\n" + "="*60)
print("⚠️  تنبيه: سيتم حذف المستودع نهائيًا!")
print("⚠️  هذا الإجراء لا يمكن التراجع عنه!")
print("="*60)

# الحذف
print("\n🗑️  جاري الحذف...")
response = requests.delete(
    f'https://api.github.com/repos/{OWNER}/{REPO}',
    headers=headers
)

if response.status_code == 204:
    print("="*60)
    print("✅ تم حذف المستودع بنجاح!")
    print("="*60)
else:
    print(f"❌ فشل الحذف: {response.status_code}")
    if response.text:
        print(response.json())
