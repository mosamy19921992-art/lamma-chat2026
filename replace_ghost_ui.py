import sys
import re

file_path = r'c:\Users\DELL\Downloads\New folder (2)\repo-final\src\components\ChatScreen.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_str = """                          <div className="p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all lamma-admin-card">
                            <div className="flex flex-col gap-1">
                              <span className="text-white text-xs font-black">
                                إخفاء التواجد (وضع التخفي)
                              </span>
                              <span className="text-[9px] text-gray-400 font-bold">
                                إخفاء حالتك "متصل الآن" (ميزة VIP)
                              </span>
                            </div>
                            <div className="w-10 h-5 rounded-full relative lamma-tab-soft">
                              <div className="w-4 h-4 bg-gray-400 rounded-full absolute top-0.5 left-0.5"></div>
                            </div>
                          </div>"""

new_str = """                          <div 
                            className="p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all lamma-admin-card"
                            onClick={() => {
                              if (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'vip') {
                                setIsGhostMode(!isGhostMode);
                              } else {
                                alert("هذه الميزة متاحة فقط للإدارة والـ VIP");
                              }
                            }}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-white text-xs font-black">
                                إخفاء التواجد (وضع التخفي)
                              </span>
                              <span className="text-[9px] text-gray-400 font-bold">
                                إخفاء حالتك "متصل الآن" (ميزة VIP/إدارة)
                              </span>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${isGhostMode ? 'bg-green-500' : 'lamma-tab-soft'}`}>
                              <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${isGhostMode ? 'right-0.5 bg-white' : 'left-0.5 bg-gray-400'}`}></div>
                            </div>
                          </div>"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done replacing Ghost Mode switch UI!")
else:
    # Try with regex for spacing variations
    old_regex = r'<div className="p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all lamma-admin-card">\s*<div className="flex flex-col gap-1">\s*<span className="text-white text-xs font-black">\s*إخفاء التواجد \(وضع التخفي\)\s*</span>\s*<span className="text-\[9px\] text-gray-400 font-bold">\s*إخفاء حالتك "متصل الآن" \(ميزة VIP\)\s*</span>\s*</div>\s*<div className="w-10 h-5 rounded-full relative lamma-tab-soft">\s*<div className="w-4 h-4 bg-gray-400 rounded-full absolute top-0.5 left-0.5"></div>\s*</div>\s*</div>'
    if re.search(old_regex, content):
        content = re.sub(old_regex, new_str, content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Done replacing Ghost Mode switch UI via regex!")
    else:
        print("Error: Could not find the Ghost Mode switch block.")
        sys.exit(1)
