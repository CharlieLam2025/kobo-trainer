// 共享工具：拿到全部前端源码（拆分成多模块后 · verify 脚本不再只读 src/app.jsx）
// 返回 src/ 下所有 .jsx / .mjs 文件按路径排序后的拼接文本。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

export const projectRoot = resolve(import.meta.dirname, '..');

export function listSourceFiles(root = projectRoot) {
  const srcDir = resolve(root, 'src');
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(jsx|mjs)$/.test(name)) out.push(p);
    }
  };
  walk(srcDir);
  return out;
}

export function readAllSource(root = projectRoot) {
  return listSourceFiles(root).map(p => readFileSync(p, 'utf8')).join('\n');
}

export function readSourceFile(rel, root = projectRoot) {
  return readFileSync(resolve(root, rel), 'utf8');
}
