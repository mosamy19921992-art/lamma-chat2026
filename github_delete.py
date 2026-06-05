#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHub Repository Deletion Tool
لحذف مستودعات GitHub مع التأكيد
"""

import requests
import sys
import json

# إعدادات API
GITHUB_TOKEN = "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"
BASE_URL = "https://api.github.com"
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}


def load_repos():
    """تحميل المستودعات من الملف"""
    try:
        with open('github_repos_list.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return None


def delete_repository(owner, repo_name):
    """حذف مستودع"""
    url = f"{BASE_URL}/repos/{owner}/{repo_name}"
    response = requests.delete(url, headers=HEADERS)
    
    if response.status_code == 204:
        return True, "تم الحذف بنجاح"
    else:
        return False, f"خطأ {response.status_code}: {response.text}"


def main():
    """البرنامج الرئيسي"""
    print("=" * 80)
    print("🗑️ GitHub Repository Deletion Tool")
    print("=" * 80)
    
    # تحميل المستودعات
    repos = load_repos()
    if repos is None:
        print("❌ لم يتم العثور على ملف github_repos_list.json")
        print("يرجى تشغيل github_list_only.py أولاً")
        sys.exit(1)
    
    if not repos:
        print("📂 لا توجد مستودعات للحذف.")
        sys.exit(0)
    
    # عرض المستودعات
    print("\n📋 المستودعات المتاحة:")
    print("-" * 80)
    for i, repo in enumerate(repos, 1):
        private = "🔒" if repo['private'] else "🌐"
        print(f"  {i}. {private} {repo['name']}")
    print("-" * 80)
    
    # طلب الأرقام للحذف
    print("\n🗑️  أدخل أرقام المستودعات للحذف (مفصولة بفواصل):")
    user_input = input("➡️  اختيارك: ").strip()
    
    if not user_input:
        print("⚠️  لم يتم إدخال أي رقم. إلغاء العملية.")
        sys.exit(0)
    
    # معالجة الأرقام
    try:
        indices = [int(x.strip()) for x in user_input.split(',') if x.strip()]
        indices = [i for i in indices if 1 <= i <= len(repos)]
        
        if not indices:
            print("⚠️  لا توجد أرقام صالحة.")
            sys.exit(0)
        
    except ValueError:
        print("❌ خطأ: يرجى إدخال أرقام صحيحة.")
        sys.exit(1)
    
    # تأكيد الحذف
    print("\n" + "=" * 80)
    print("⚠️  تأكيد الحذف")
    print("=" * 80)
    
    selected_repos = [(i, repos[i-1]) for i in indices]
    
    for idx, repo in selected_repos:
        print(f"\n  {idx}. {repo['name']}")
        print(f"     🔗 {repo['html_url']}")
    
    print("\n" + "-" * 80)
    print("⚠️  هذا الإجراء لا يمكن التراجع عنه!")
    print("-" * 80)
    
    # تأكيد نهائي
    confirm = input("\n➡️  اكتب 'DELETE' للتأكيد أو أي شيء آخر للإلغاء: ").strip()
    
    if confirm != "DELETE":
        print("\n❌ تم إلغاء العملية.")
        sys.exit(0)
    
    # تنفيذ الحذف
    print("\n" + "=" * 80)
    print("🗑️  جاري الحذف...")
    print("=" * 80)
    
    results = []
    for idx, repo in selected_repos:
        repo_name = repo['name']
        owner = repo['owner']['login']
        
        print(f"\n  ⏳ جاري حذف {repo_name}...")
        success, message = delete_repository(owner, repo_name)
        
        if success:
            print(f"  ✅ تم حذف {repo_name}")
            results.append((repo_name, True, message))
        else:
            print(f"  ❌ فشل حذف {repo_name}: {message}")
            results.append((repo_name, False, message))
    
    # ملخص النتائج
    print("\n" + "=" * 80)
    print("📊 ملخص النتائج:")
    print("=" * 80)
    
    successful = [r for r in results if r[1]]
    failed = [r for r in results if not r[1]]
    
    print(f"\n✅ ناجح: {len(successful)} مستودع")
    for name, _, _ in successful:
        print(f"   ✓ {name}")
    
    if failed:
        print(f"\n❌ غير ناجح: {len(failed)} مستودع")
        for name, _, reason in failed:
            print(f"   ✗ {name} - {reason}")
    
    print("\n" + "=" * 80)
    print("✨ انتهت العملية!")
    print("=" * 80)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  تم إلغاء البرنامج من قبل المستخدم.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ خطأ غير متوقع: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
