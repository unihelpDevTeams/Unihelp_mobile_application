const fs = require('fs');
const path = require('path');
const root = process.cwd();
const barrelFile = path.join(root, 'services', 'firestoreSync.js');
const barrel = fs.readFileSync(barrelFile, 'utf8');
const exportNames = new Set();
const exportMatch = barrel.match(/export\s*\{([\s\S]*?)\}\s*from/);
if (exportMatch) {
  exportMatch[1].split(',').map((s) => s.trim()).forEach((entry) => {
    if (!entry) return;
    const aliasMatch = entry.match(/^(.*) as (.*)$/);
    exportNames.add(aliasMatch ? aliasMatch[2].trim() : entry);
  });
}
const files = [];
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) {
      walk(file);
    } else if (/\.(js|jsx|ts|tsx)$/.test(name)) {
      files.push(file);
    }
  }
};
walk(root);
const importNames = new Set();
const importRegex = /import \{([^}]*)\} from ['"][^'"]*services\/firestoreSync['"]/g;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = importRegex.exec(content))) {
    match[1].split(',').map((s) => s.trim()).forEach((name) => {
      if (name) importNames.add(name);
    });
  }
}
const missing = [...importNames].filter((name) => !exportNames.has(name));
console.log(JSON.stringify({ exportNames: [...exportNames].sort(), importNames: [...importNames].sort(), missing: missing.sort() }, null, 2));
