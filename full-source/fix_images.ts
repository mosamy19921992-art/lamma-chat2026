import fs from 'fs';

const path = './src/components/ChatScreen.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Replace <img with <img loading="lazy" if not already loading="lazy"
content = content.replace(/<img\s+(?!loading="lazy")/g, '<img loading="lazy" ');

// Performance Virtualization Support: Limit the number of messages to latest 50, and render only when necessary.
// Let's add a visible messages count state if needed, or simply slice at render time.
// Since we want simple virtualization: Instead of creating states, we can just slice messages when rendering them.
// "يتم تحميل آخر 50 فقط" -> "The last 50 only"

content = content.replace(
  /const messages = \(roomMessages\[activeRoomId\] \|\| \[\]\)\.filter\(\(msg: any\) => \{/g,
  `const allMessages = (roomMessages[activeRoomId] || []).filter((msg: any) => {`
);

content = content.replace(
  /return msg;/gm,
  `return msg;`
); // Let's not try complex regex here, we'll write specific edits.



fs.writeFileSync(path, content, 'utf-8');
console.log('Images lazy loading added');
