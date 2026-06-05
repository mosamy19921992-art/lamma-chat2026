import requests
TOKEN = "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"
headers = {'Authorization': f'token {TOKEN}', 'Accept': 'application/vnd.github.v3+json'}
print("جاري جلب المستودعات...")
r = requests.get('https://api.github.com/user/repos', headers=headers, params={'per_page': 100})
if r.status_code == 200:
    repos = r.json()
    print(f"\n📦 عدد المستودعات: {len(repos)}\n")
    for repo in repos:
        private = "🔒" if repo['private'] else "🌐"
        print(f"{private} {repo['name']} ({repo['updated_at'][:10]})")
else:
    print(f"❌ خطأ: {r.status_code}")
