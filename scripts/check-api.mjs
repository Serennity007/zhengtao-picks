import { readFileSync, readdirSync } from 'node:fs';

const dtsPath = 'node_modules/obsidian/obsidian.d.ts';
let dts;
try {
  dts = readFileSync(dtsPath, 'utf8');
} catch {
  console.error('找不到 node_modules/obsidian/obsidian.d.ts，先执行 npm install（obsidian 是 devDependency）。');
  process.exit(1);
}

const exported = new Set();
for (const match of dts.matchAll(/^export\s+(?:declare\s+)?(?:abstract\s+)?(class|function|const|let|var|interface|type|enum)\s+([A-Za-z0-9_$]+)/gm)) {
  exported.add(match[2]);
}

const unknown = [];
const used = new Set();
for (const file of readdirSync('src').filter((name) => name.endsWith('.js'))) {
  const source = readFileSync(`src/${file}`, 'utf8');
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'obsidian'/g)) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0];
      if (!name) continue;
      used.add(name);
      if (!exported.has(name)) unknown.push(`${file}: ${name}`);
    }
  }
}

console.log(`obsidian 导出校验：src 使用 ${used.size} 个符号，${exported.size} 个官方导出可读`);
if (unknown.length) {
  console.error(`以下符号在 obsidian.d.ts 中不存在，运行时会是 undefined：\n  ${unknown.join('\n  ')}`);
  process.exit(1);
}
console.log('全部符号存在。');
