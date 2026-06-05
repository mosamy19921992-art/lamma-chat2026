#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHub Repository Manager
لإدارة مستودعات GitHub - عرض وحذف المستودعات
"""

import requests
import sys

# إعدادات API
GITHUB_TOKEN = "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"
BASE_URL = "https://api.github.com"
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}


def get_user_repos():
    """جلب جميع مستودعات المستخدم"""
    repos = []
    page = 1
    
    while True:
        url = f"{BASE_URL}/user/repos"
        params = {
            "page": page,
            "per_page": 100,
            "sort": "updated",
            "direction": "desc"
        }
        
        response = requests.get(url, headers=HEADERS, params=params)
        
        if response.status_code != 200:
            print(f"❌ خطأ في جلب المستودعات: {response.status_code}")
            print(f"التفاصيل: {response.text}")
            return None
        
        page_repos = response.json()
        if not page_repos:
            break
            
        repos.extend(page_repos)
        page += 1
    
    return repos


def display_repos(repos):
    """عرض قائمة المستودعات"""
    if not repos:
        print("\n📂 لا توجد مستودعات لعرضها.")
        return
    
    print("\n" + "=" * 100)
    print(f"📋 قائمة المستودعات ({len(repos)} مستودع)")
    print("=" * 100)
    print()
    
    for i, repo in enumerate(repos, 1):
        name = repo['name']
        private = "🔒" if repo['private'] else "🌐"
        fork = "🍴" if repo['fork'] else ""
        language = repo.get('language') or "غير محدد"
        size_kb = repo['size']
        created = repo['created_at'][:10]
        updated = repo['updated_at'][:10]
        url = repo['html_url']
        
        print(f"{i:3d}. {private} {fork} {name:<40} | اللغة: {language:<12} | الحجم: {size_kb:,} KB")
        print(f"      📅 إنشاء: {created} | 🔄 آخر تحديث: {updated}")
        print(f"      🔗 {url}")
        print()
    
    print("=" * 100)
    print("📝 المفتاح: 🔒 خاص | 🌐 عام | 🍴 فرع (fork)")
    print("=" * 100)


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
    print("🚀 GitHub Repository Manager")
    print("إدارة مستودعات GitHub - عرض وحذف المستودعات")
    print("=" * 80)
    
    # الخطوة 1: جلب المستودعات
    print("\n⏳ جاري جلب قائمة المستودعات...")
    repos = get_user_repos()
    
    if repos is None:
        print("❌ فشل في جلب المستودعات. يرجى التحقق من التوكن.")
        sys.exit(1)
    
    # الخطوة 2: عرض المستودعات
    display_repos(repos)
    
    if not repos:
        print("\n✅ لا توجد مستودعات للحذف.")
        sys.exit(0)
    
    # الخطوة 3: طلب المستودعات للحذف
    print("\n" + "-" * 80)
    print("🗑️  حذف المستودعات")
    print("-" * 80)
    print("أدخل أرقام المستودعات التي تريد حذفها (مفصولة بفواصل أو مسافات)")
    print("مثال: 1, 3, 5 أو 1 3 5")
    print("أو اكتب 'skip' للتخطي بدون حذف")
    
    user_input = input("\n➡️  اختيارك: ").strip().lower()
    
    if user_input in ['skip', 's', 'تخطي', '']:
        print("\n✅ تم التخطي. لم يتم حذف أي مستودع.")
        sys.exit(0)
    
    # معالجة الأرقام المدخلة
    try:
        # دعم الفواصل والمسافات كفواصل
        selected_indices = []
        for part in user_input.replace(',', ' ').split():
            if part.strip():
                idx = int(part.strip())
                if 1 <= idx <= len(repos):
                    selected_indices.append(idx)
                else:
                    print(f"⚠️  الرقم {idx} خارج النطاق، سيتم تجاهله")
        
        selected_indices = list(set(selected_indices))  # إزالة التكرار
        selected_indices.sort()
        
        if not selected_indices:
            print("\n⚠️  لم يتم اختيار أي مستودع صالح للحذف.")
            sys.exit(0)
        
    except ValueError:
        print("\n❌ خطأ: يرجى إدخال أرقام صحيحة فقط.")
        sys.exit(1)
    
    # عرض المستودعات المختارة للحذف
    print("\n" + "=" * 80)
    print("🗑️  المستودعات المختارة للحذف:")
    print("=" * 80)
    
    repos_to_delete = []
    for idx in selected_indices:
        repo = repos[idx - 1]  # -1 لأن القائمة تبدأ من 1
        repos_to_delete.append((idx, repo))
        owner = repo['owner']['login']
        print(f"\n  {idx}. {repo['name']}")
        print(f"     👤 المالك: {owner}")
        print(f"     🔗 الرابط: {repo['html_url']}")
    
    print("\n" + "=" * 80)
    print("⚠️  تحذير: هذا الإجراء لا يمكن التراجع عنه!")
    print("=" * 80)
    
    # تأكيد الحذف لكل مستودع
    deletion_results = []
    
    for idx, repo in repos_to_delete:
        repo_name = repo['name']
        owner = repo['owner']['login']
        full_name = f"{owner}/{repo_name}"
        
        print(f"\n" + "-" * 60)
        print(f"🔐 تأكيد حذف: {repo_name}")
        print("-" * 60)
        print(f"لتأكيد الحذف، اكتب اسم المستودع بالكامل: {repo_name}")
        print("(أو اكتب 'skip' للتخطي)")
        
        confirm = input(f"➡️  تأكيد: ").strip()
        
        if confirm == repo_name:
            print(f"⏳ جاري حذف {repo_name}...")
            success, message = delete_repository(owner, repo_name)
            
            if success:
                print(f"✅ تم حذف {repo_name} بنجاح!")
                deletion_results.append((repo_name, True, message))
            else:
                print(f"❌ فشل حذف {repo_name}: {message}")
                deletion_results.append((repo_name, False, message))
        
        elif confirm.lower() in ['skip', 's', 'تخطي']:
            print(f"⏭️  تم تخطي حذف {repo_name}")
            deletion_results.append((repo_name, False, "تم التخطي"))
        
        else:
            print(f"⚠️  اسم المستودع غير صحيح. تم إلغاء حذف {repo_name}")
            deletion_results.append((repo_name, False, "تم الإلغاء - تأكيد خاطئ"))
    
    # ملخص النتائج
    print("\n" + "=" * 80)
    print("📊 ملخص نتائج الحذف:")
    print("=" * 80)
    
    successful = [r for r in deletion_results if r[1]]
    failed = [r for r in deletion_results if not r[1]]
    
    print(f"\n✅ ناجح: {len(successful)} مستودع")
    for name, _, _ in successful:
        print(f"   ✓ {name}")
    
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
        sys.exit(1)
