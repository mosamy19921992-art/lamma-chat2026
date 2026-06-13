import sys

file_path = r'c:\Users\DELL\Downloads\New folder (2)\repo-final\src\components\ChatScreen.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# To handle \r\n vs \n
import re

old_pattern = r"""  const handleSendPM = \(\) => {
    if \(!pmInputText\.trim\(\)\) return;
    const timeStr = new Date\(\)\.toLocaleTimeString\("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }\);
    const targetNickname = pmTarget\.nickname;

    const updatedThread = \[
      \.\.\.\(pmThreads\[targetNickname\] \|\| \[\]\),
      {
        text: pmInputText,
        isOwn: true,
        time: timeStr,
        status: "delivered" as const,
      },
    \];

    setPmThreads\(\(prev\) => \({
      \.\.\.prev,
      \[targetNickname\]: updatedThread,
    }\)\);
    setPmInputText\(""\);

    // Sarah/Target replies automatically after 1\.5s
    setTimeout\(\(\) => {
      const replyText = getDynamicReply\(targetNickname\);
      setPmThreads\(\(prev\) => \({
        \.\.\.prev,
        \[targetNickname\]: \[
          \.\.\.\(prev\[targetNickname\] \|\| \[\]\),
          {
            text: replyText,
            isOwn: false,
            time: new Date\(\)\.toLocaleTimeString\("en-US", {
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            }\),
          },
        \],
      }\)\);
    }, 1500\);
  };"""

new_str = """  const handleSendPM = async () => {
    if (!pmInputText.trim()) return;
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    const targetNickname = pmTarget.nickname;
    const textToSend = pmInputText;

    const updatedThread = [
      ...(pmThreads[targetNickname] || []),
      {
        text: textToSend,
        isOwn: true,
        time: timeStr,
        status: "delivered" as const,
      },
    ];

    setPmThreads((prev) => ({
      ...prev,
      [targetNickname]: updatedThread,
    }));
    setPmInputText("");

    if (supabase) {
      const { error } = await supabase.from("pm_messages").insert([
        {
          sender: currentUser.nickname,
          receiver: targetNickname,
          text: textToSend,
        },
      ]);
      if (error) console.error("PM insert error:", error);
    }

    // Sarah/Target replies automatically after 1.5s
    setTimeout(() => {
      const replyText = getDynamicReply(targetNickname);
      if (supabase) {
        supabase.from("pm_messages").insert([
          {
            sender: targetNickname,
            receiver: currentUser.nickname,
            text: replyText,
          },
        ]);
      } else {
        setPmThreads((prev) => ({
          ...prev,
          [targetNickname]: [
            ...(prev[targetNickname] || []),
            {
              text: replyText,
              isOwn: false,
              time: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
            },
          ],
        }));
      }
    }, 1500);
  };"""

content = re.sub(old_pattern.replace('\n', '\r?\n'), new_str, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
