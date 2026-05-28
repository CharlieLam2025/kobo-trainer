// 口播练习器 · esbuild build script
// 把 src/app.jsx (11400+ 行 JSX) 预编译成 bundle.js
// 这样浏览器不再需要下载 Babel Standalone + runtime transpile
import * as esbuild from 'esbuild';
import { readFileSync, statSync } from 'node:fs';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const opts = {
  entryPoints: ['src/app.jsx'],
  outfile: 'bundle.js',
  bundle: true,
  format: 'iife',
  target: 'es2018',           // 覆盖 iOS Safari 12+ / Android Chrome 70+
  loader: { '.jsx': 'jsx' },
  jsx: 'transform',           // 经典 React.createElement，匹配 UMD 全局 React
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  minify: true,
  sourcemap: false,           // GitHub Pages 部署，source map 会泄露源码体积
  legalComments: 'none',
  logLevel: 'info',
  // src/app.jsx 把 React / ReactDOM 当全局用，esbuild 不会去解析它们
  // bundle 出来的 IIFE 自然引用 window.React / window.ReactDOM
};

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log('[esbuild] watching src/app.jsx → bundle.js ...');
} else {
  const t0 = Date.now();
  await esbuild.build(opts);
  const size = statSync('bundle.js').size;
  console.log(`[esbuild] bundle.js · ${(size / 1024).toFixed(1)} KB · ${Date.now() - t0} ms`);
}
