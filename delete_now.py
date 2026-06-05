import requests
TOKEN = "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"
OWNER = "mosamy19921992-art"
REPO = "lamma-chat27"
headers = {'Authorization': f'token {TOKEN}', 'Accept': 'application/vnd.github.v3+json'}
print("حذف lamma-chat27...")
r = requests.delete(f'https://api.github.com/repos/{OWNER}/{REPO}', headers=headers)
print("تم" if r.status_code == 204 else f"فشل: {r.status_code}")
