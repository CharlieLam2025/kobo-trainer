// 口播练习器 · 构建脚本
// 并行产出两个产物：
//   bundle.js  — esbuild 预编译 src/app.jsx 入口（已模块化：data/ lib/ hooks/ components/ modes/）→ IIFE
//   styles.css — Tailwind v3 CLI 扫描实际用到的 class，仅生成必需的 CSS
import * as esbuild from 'esbuild';
import { execSync, spawn } from 'node:child_process';
import { statSync } from 'node:fs';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const jsOpts = {
  entryPoints: ['src/app.jsx'],
  outfile: 'bundle.js',
  bundle: true,
  format: 'iife',
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

// Tailwind CLI 在 Windows 下是 .cmd；用 npx 统一两端
const tailwindCmd = (watchMode) =>
  `npx tailwindcss -i src/styles.css -o styles.css --minify${watchMode ? ' --watch' : ''}`;

const t0 = Date.now();
if (watch) {
  // watch 模式：esbuild + tailwind 各自起一个常驻进程
  const ctx = await esbuild.context(jsOpts);
  await ctx.watch();
  console.log('[build] watching src/app.jsx → bundle.js ...');
  // tailwind --watch 是子进程，stdout 透传
  spawn(tailwindCmd(true), { stdio: 'inherit', shell: true });
} else {
  // 一次性构建：顺序跑 JS + CSS，降低 Windows + Gradle daemon 场景下的内存峰值。
  await esbuild.build(jsOpts);
  execSync(tailwindCmd(false), { stdio: 'inherit', shell: true });
  const jsSize  = statSync('bundle.js').size;
  const cssSize = statSync('styles.css').size;
  console.log(
    `[build] bundle.js ${(jsSize / 1024).toFixed(1)} KB · ` +
    `styles.css ${(cssSize / 1024).toFixed(1)} KB · ` +
    `${Date.now() - t0} ms`
  );
}
