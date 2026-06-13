import sys

file_path = r'c:\Users\DELL\Downloads\New folder (2)\repo-final\src\components\ChatScreen.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add rateLimitRef
content = content.replace(
    'const pmEndRef = useRef<HTMLDivElement>(null);',
    'const pmEndRef = useRef<HTMLDivElement>(null);\n  const rateLimitRef = useRef<number[]>([]);'
)

# 2. Add Throttle to handleSendMessage
old_send_msg = """  const handleSendMessage = () => {
    if (!inputText.trim()) return;"""

new_send_msg = """  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const now = Date.now();
    rateLimitRef.current = rateLimitRef.current.filter((t) => now - t < 1000);
    if (rateLimitRef.current.length >= 3) {
      alert("⚠️ الرجاء الانتظار، لا يمكنك إرسال أكثر من 3 رسائل في الثانية الواحدة لحماية الشات من الإزعاج!");
      return;
    }
    rateLimitRef.current.push(now);"""

content = content.replace(old_send_msg, new_send_msg)

# 3. Add Throttle to handleSendPM
old_send_pm = """  const handleSendPM = async () => {
    if (!pmInputText.trim()) return;"""

new_send_pm = """  const handleSendPM = async () => {
    if (!pmInputText.trim()) return;

    const now = Date.now();
    rateLimitRef.current = rateLimitRef.current.filter((t) => now - t < 1000);
    if (rateLimitRef.current.length >= 3) {
      alert("⚠️ الرجاء الانتظار، لا يمكنك إرسال أكثر من 3 رسائل في الثانية الواحدة لحماية الشات من الإزعاج!");
      return;
    }
    rateLimitRef.current.push(now);"""

content = content.replace(old_send_pm, new_send_pm)

# 4. Limit PMs in localStorage
old_local = """  useEffect(() => {
    localStorage.setItem(pmThreadsStorageKey, JSON.stringify(pmThreads));
  }, [pmThreads, pmThreadsStorageKey]);"""

new_local = """  useEffect(() => {
    const trimmedThreads: Record<string, any[]> = {};
    Object.keys(pmThreads).forEach((user) => {
      trimmedThreads[user] = pmThreads[user].slice(-100);
    });
    localStorage.setItem(pmThreadsStorageKey, JSON.stringify(trimmedThreads));
  }, [pmThreads, pmThreadsStorageKey]);"""

content = content.replace(old_local, new_local)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done updating ChatScreen.tsx')