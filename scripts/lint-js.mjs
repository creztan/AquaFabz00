import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import esbuild from 'esbuild';

const nodeFiles = ['server.js', 'server/db.js', 'vite.config.js', 'src/lib/api.js'];

for (const file of nodeFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

const jsxFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.jsx') || full.endsWith('.js')) jsxFiles.push(full);
  }
}
walk('src');

for (const file of jsxFiles) {
  const code = fs.readFileSync(file, 'utf8');
  esbuild.transformSync(code, {
    loader: file.endsWith('.jsx') ? 'jsx' : 'js',
    format: 'esm',
  });
}

console.log(`JavaScript syntax check passed (${nodeFiles.length + jsxFiles.length} files).`);
