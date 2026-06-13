import sys
import re

file_path = r'c:\Users\DELL\Downloads\New folder (2)\repo-final\src\components\ChatScreen.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace line 1061 (0-indexed)
if 'const [chatMembers, setChatMembers]' in lines[1061]:
    lines[1061] = lines[1061].replace('const [chatMembers, setChatMembers]', 'const [rawChatMembers, setChatMembers]')
else:
    print("Error: line 1062 mismatch")
    sys.exit(1)

# Replace line 1848
if 'chatMembers.find(' in lines[1848]:
    lines[1848] = lines[1848].replace('chatMembers.find(', 'rawChatMembers.find(')
else:
    print("Error: line 1849 mismatch")
    sys.exit(1)

# Insert after isGhostMode definition
# Let's find isGhostMode definition
insert_idx = -1
for i, line in enumerate(lines):
    if 'const [isGhostMode, setIsGhostMode]' in line:
        insert_idx = i
        break

if insert_idx != -1:
    # Find the end of useEffect for isGhostMode
    # It looks like:
    #   useEffect(() => {
    #     localStorage.setItem("lamma_ghost_mode", String(isGhostMode));
    #   }, [isGhostMode]);
    for i in range(insert_idx, insert_idx + 20):
        if '}, [isGhostMode]);' in lines[i]:
            insert_idx = i + 1
            break
    
    # Insert the derived chatMembers
    lines.insert(insert_idx, '\n  // Derived chatMembers: hide current user if Ghost Mode is active\n  const chatMembers = isGhostMode ? rawChatMembers.filter(m => m.nickname !== currentUser.nickname) : rawChatMembers;\n')
else:
    print("Error: isGhostMode not found")
    sys.exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done replacing chatMembers!")
