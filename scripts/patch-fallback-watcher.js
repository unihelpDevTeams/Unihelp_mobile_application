const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../node_modules/@expo/metro-file-map/build/watchers/FallbackWatcher.js');
if (fs.existsSync(target)) {
  let content = fs.readFileSync(target, 'utf8');
  if (!content.includes("dir.includes('/node_modules')")) {
    content = content.replace(
      '#watchdir = (dir) => {\n        if (this.#watched[dir]) {',
      "#watchdir = (dir) => {\n        if (dir.includes('/node_modules') || dir.includes('\\\\node_modules')) {\n            return false;\n        }\n        if (this.#watched[dir]) {"
    );
    fs.writeFileSync(target, content, 'utf8');
    console.log('[termux-patch] Patched FallbackWatcher to ignore node_modules fs.watch');
  }
}
