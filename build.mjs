// 口播练习器 · 构建脚本
//   bundle.js + chunks/*  — esbuild ESM 分包（模式懒加载）
//   styles.css            — Tailwind v3 CLI 仅生成用到的 class
import * as esbuild from 'esbuild';
import { execSync, spawn } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const watch = process.argv.includes('--watch');
const chunksDir = join(process.cwd(), 'chunks');

/** @type {import('esbuild').BuildOptions} */
const jsOpts = {
  entryPoints: ['src/app.jsx'],
  outdir: '.',
  entryNames: 'bundle',
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  format: 'esm',
  splitting: true,
  target: 'es2018',
  loader: { '.jsx': 'jsx' },
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
};

const tailwindCmd = (watchMode) =>
  `npx tailwindcss -i src/styles.css -o styles.css --minify${watchMode ? ' --watch' : ''}`;

const cleanChunks = () => {
  if (existsSync(chunksDir)) rmSync(chunksDir, { recursive: true, force: true });
};

const t0 = Date.now();
if (watch) {
  cleanChunks();
  const ctx = await esbuild.context(jsOpts);
  await ctx.watch();
  console.log('[build] watching src/app.jsx → bundle.js + chunks/ ...');
  spawn(tailwindCmd(true), { stdio: 'inherit', shell: true });
} else {
  cleanChunks();
  await esbuild.build(jsOpts);
  execSync(tailwindCmd(false), { stdio: 'inherit', shell: true });
  const jsSize = statSync('bundle.js').size;
  const cssSize = statSync('styles.css').size;
  console.log(
    `[build] bundle.js ${(jsSize / 1024).toFixed(1)} KB · ` +
    `styles.css ${(cssSize / 1024).toFixed(1)} KB · ` +
    `${Date.now() - t0} ms`
  );
}
