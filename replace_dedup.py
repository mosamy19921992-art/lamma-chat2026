import sys

file_path = r'c:\Users\DELL\Downloads\New folder (2)\repo-final\src\components\ChatScreen.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_str = """            setPmThreads(prev => {
              const currentThread = prev[otherPerson] || [];
              return {
                ...prev,
                [otherPerson]: [
                  ...currentThread,
                  {
                    text: sMsg.text,
                    isOwn: sMsg.sender === currentUser.nickname,
                    time: new Date(sMsg.created_at).toLocaleTimeString("ar-EG", {
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    }),
                    status: "read"
                  }
                ]
              };
            });"""

new_str = """            setPmThreads(prev => {
              const currentThread = prev[otherPerson] || [];
              // Prevent duplication
              const exists = currentThread.some(m => m.text === sMsg.text && m.isOwn === (sMsg.sender === currentUser.nickname));
              if (exists) return prev;

              return {
                ...prev,
                [otherPerson]: [
                  ...currentThread,
                  {
                    text: sMsg.text,
                    isOwn: sMsg.sender === currentUser.nickname,
                    time: new Date(sMsg.created_at).toLocaleTimeString("ar-EG", {
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    }),
                    status: "read"
                  }
                ]
              };
            });"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done adding deduplication logic to PM Realtime callback!")
else:
    print("Error: Could not find the target string in ChatScreen.tsx.")
    sys.exit(1)
