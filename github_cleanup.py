#!/usr/bin/env python3
"""
GitHub Repository Cleanup Tool
تنظيف مستودعات GitHub - أداة عربية سهلة الاستخدام
"""

import requests
import json
import sys
import os
from datetime import datetime
from typing import List, Dict, Optional

class GitHubCleaner:
    def __init__(self, token: str):
        self.token = token
        self.headers = {
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        self.base_url = 'https://api.github.com'
        self.user = self._get_user()
    
    def _get_user(self) -> str:
        """الحصول على اسم المستخدم"""
        response = requests.get(f'{self.base_url}/user', headers=self.headers)
        if response.status_code == 200:
            return response.json()['login']
        else:
            print("❌ خطأ: التوكن غير صالح أو منتهي الصلاحية")
            sys.exit(1)
    
    def get_all_repos(self) -> List[Dict]:
        """جلب كل المستودعات"""
        repos = []
        page = 1
        while True:
            response = requests.get(
                f'{self.base_url}/user/repos',
                headers=self.headers,
                params={'per_page': 100, 'page': page, 'sort': 'updated'}
            )
            if response.status_code == 200:
                page_repos = response.json()
                if not page_repos:
                    break
                repos.extend(page_repos)
                page += 1
            else:
                print(f"❌ خطأ في جلب المستودعات: {response.status_code}")
                break
        return repos
    
    def display_repo_info(self, repo: Dict, index: int):
        """عرض معلومات المستودع"""
        name = repo['name']
        updated = repo['updated_at'][:10]
        created = repo['created_at'][:10]
        size = repo['size']
        private = "🔒" if repo['private'] else "🌐"
        fork = "🍴 Fork" if repo['fork'] else "📦 Original"
        language = repo.get('language') or "Unknown"
        
        print(f"\n{'='*60}")
        print(f"{index}. {private} {name}")
        print(f"   📅 Created: {created} | 🔄 Updated: {updated}")
        print(f"   💾 Size: {size} KB | 🗣️ Language: {language}")
        print(f"   {fork}")
        print(f"   🔗 URL: {repo['html_url']}")
        print(f"{'='*60}")
    
    def delete_repo(self, owner: str, repo_name: str) -> bool:
        """حذف مستودع"""
        print(f"\n⚠️  تحذير: سيتم حذف المستودع '{repo_name}' نهائيًا!")
        print("⚠️  هذا الإجراء لا يمكن التراجع عنه!")
        
        confirm = input(f"\nاكتب '{repo_name}' للتأكيد: ")
        if confirm != repo_name:
            print("❌ لم يتم التأكيد، إلغاء العملية")
            return False
        
        response = requests.delete(
            f'{self.base_url}/repos/{owner}/{repo_name}',
            headers=self.headers
        )
        
        if response.status_code == 204:
            print(f"✅ تم حذف المستودع '{repo_name}' بنجاح")
            return True
        else:
            print(f"❌ فشل حذف المستودع: {response.status_code}")
            print(response.json())
            return False
    
    def export_repos(self, repos: List[Dict]):
        """تصدير قائمة المستودعات"""
        filename = f"github_repos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(repos, f, ensure_ascii=False, indent=2)
        print(f"✅ تم تصدير القائمة إلى: {filename}")

def main():
    print("="*70)
    print("  🧹 GitHub Repository Cleanup Tool")
    print("  أداة تنظيف مستودعات GitHub")
    print("="*70)
    
    # الحصول على التوكن
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        token = input("\n🔑 أدخل GitHub Token: ").strip()
    
    if not token:
        print("❌ يجب إدخال توكن صالح")
        sys.exit(1)
    
    # إنشاء الكائن
    cleaner = GitHubCleaner(token)
    print(f"\n✅ تم تسجيل الدخول كـ: {cleaner.user}")
    
    # جلب المستودعات
    print("\n📥 جاري جلب المستودعات...")
    repos = cleaner.get_all_repos()
    print(f"✅ تم العثور على {len(repos)} مستودع")
    
    # القائمة الرئيسية
    while True:
        print("\n" + "="*70)
        print("  📋 القائمة الرئيسية")
        print("="*70)
        print("  1. عرض كل المستودعات")
        print("  2. عرض تفاصيل مستودع محدد")
        print("  3. حذف مستودع")
        print("  4. تصدير القائمة (JSON)")
        print("  5. خروج")
        print("="*70)
        
        choice = input("\nاختر رقم (1-5): ").strip()
        
        if choice == '1':
            print(f"\n📦 قائمة المستودعات ({len(repos)}):")
            for i, repo in enumerate(repos, 1):
                private = "🔒" if repo['private'] else "🌐"
                print(f"  {i}. {private} {repo['name']}")
                
        elif choice == '2':
            idx = input("\nأدخل رقم المستودع: ").strip()
            try:
                idx = int(idx) - 1
                if 0 <= idx < len(repos):
                    cleaner.display_repo_info(repos[idx], idx + 1)
                else:
                    print("❌ رقم غير صالح")
            except ValueError:
                print("❌ يجب إدخال رقم")
                
        elif choice == '3':
            idx = input("\nأدخل رقم المستودع للحذف: ").strip()
            try:
                idx = int(idx) - 1
                if 0 <= idx < len(repos):
                    repo = repos[idx]
                    cleaner.display_repo_info(repo, idx + 1)
                    confirm = input("\nهل أنت متأكد من الحذف؟ (yes/no): ").strip().lower()
                    if confirm == 'yes':
                        if cleaner.delete_repo(cleaner.user, repo['name']):
                            repos.pop(idx)
                    else:
                        print("❌ تم إلغاء الحذف")
                else:
                    print("❌ رقم غير صالح")
            except ValueError:
                print("❌ يجب إدخال رقم")
                
        elif choice == '4':
            cleaner.export_repos(repos)
            
        elif choice == '5':
            print("\n👋 مع السلامة!")
            break
            
        else:
            print("❌ خيار غير صالح")

if __name__ == '__main__':
    main()
