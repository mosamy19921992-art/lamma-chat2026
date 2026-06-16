const ts = require("typescript");
const fs = require("fs");

const file = fs.readFileSync("src/components/ChatScreen.tsx", "utf8");
const sourceFile = ts.createSourceFile(
  "ChatScreen.tsx",
  file,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

function traverse(node) {
  if (ts.isReturnStatement(node)) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    
    // Check if it's directly inside ChatScreen
    let p = node.parent;
    let isDirectlyInsideChatScreen = false;
    let funcCount = 0;
    while (p) {
      if (ts.isFunctionDeclaration(p) || ts.isArrowFunction(p) || ts.isFunctionExpression(p)) {
        funcCount++;
        if (ts.isFunctionDeclaration(p) && p.name && p.name.text === "ChatScreen" && funcCount === 1) {
          isDirectlyInsideChatScreen = true;
        }
      }
      p = p.parent;
    }
    
    if (isDirectlyInsideChatScreen) {
      console.log(`RETURN at line ${line + 1}`);
    }
  }
  ts.forEachChild(node, traverse);
}

traverse(sourceFile);
