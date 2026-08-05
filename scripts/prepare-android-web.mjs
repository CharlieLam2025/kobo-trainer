import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'www');

const files = [
  'index.html',
  'bundle.js',
  'styles.css',
  'sw.js',
  'manifest.webmanifest',
];

const dirs = [
  'vendor',
  'fonts',
  'icons',
  'mediapipe',
  'chunks', // esbuild 模式懒加载分包
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const file of files) {
  const from = join(root, file);
  if (!existsSync(from)) throw new Error(`Missing build asset: ${file}`);
  cpSync(from, join(outDir, file));
}

for (const dir of dirs) {
  const from = join(root, dir);
  if (!existsSync(from)) {
    if (dir === 'chunks') continue; // 允许空（旧构建）
    continue;
  }
  cpSync(from, join(outDir, dir), { recursive: true });
}

console.log(`[prepare-android-web] copied runtime assets to ${outDir}`);
