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

function isHookCall(node) {
  if (ts.isCallExpression(node)) {
    const expr = node.expression;
    if (ts.isIdentifier(expr) && expr.text.startsWith("use") && expr.text !== "userScopedStorageKey") {
      return expr.text;
    }
  }
  return null;
}

function traverse(node) {
  const hookName = isHookCall(node);
  if (hookName) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    let p = node.parent;
    let inFunction = false;
    while (p) {
      if (ts.isFunctionDeclaration(p) || ts.isArrowFunction(p) || ts.isFunctionExpression(p)) {
        inFunction = true;
      }
      p = p.parent;
    }
    if (!inFunction) {
      console.log(`HOOK AT MODULE LEVEL: ${hookName} at line ${line + 1}`);
    }
  }
  ts.forEachChild(node, traverse);
}

traverse(sourceFile);
