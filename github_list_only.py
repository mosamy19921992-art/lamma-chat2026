#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHub Repository Lister
لعرض قائمة مستودعات GitHub فقط
"""

import requests
import json

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


def main():
    """البرنامج الرئيسي"""
    print("=" * 100)
    print("🚀 GitHub Repository Lister")
    print("=" * 100)
    
    print("\n⏳ جاري جلب قائمة المستودعات...\n")
    repos = get_user_repos()
    
    if repos is None:
        print("❌ فشل في جلب المستودعات.")
        return
    
    if not repos:
        print("📂 لا توجد مستودعات.")
        return
    
    # طباعة القائمة
    print("=" * 100)
    print(f"📋 قائمة المستودعات ({len(repos)} مستودع)")
    print("=" * 100)
    print()
    
    for i, repo in enumerate(repos, 1):
        name = repo['name']
        private = "🔒 خاص" if repo['private'] else "🌐 عام"
        fork = "🍴 فرع" if repo['fork'] else ""
        language = repo.get('language') or "غير محدد"
        size_kb = repo['size']
        created = repo['created_at'][:10]
        updated = repo['updated_at'][:10]
        url = repo['html_url']
        
        print(f"{i:3d}. {name}")
        print(f"     النوع: {private} {fork}")
        print(f"     اللغة: {language} | الحجم: {size_kb:,} KB")
        print(f"     إنشاء: {created} | آخر تحديث: {updated}")
        print(f"     الرابط: {url}")
        print()
    
    print("=" * 100)
    
    # حفظ البيانات في ملف JSON
    output_file = "github_repos_list.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(repos, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 تم حفظ البيانات الكاملة في: {output_file}")


if __name__ == "__main__":
    main()
