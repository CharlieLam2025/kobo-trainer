// 串行跑全部 verify 脚本 · 任一失败则以非 0 退出
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const scriptsDir = resolve(import.meta.dirname);
const files = readdirSync(scriptsDir)
  .filter(name => /^verify-.+\.mjs$/.test(name) && name !== 'verify-all.mjs')
  .sort();

let failed = 0;
for (const file of files) {
  const rel = join('scripts', file);
  process.stdout.write(`\n── ${rel} ──\n`);
  const r = spawnSync(process.execPath, [join(scriptsDir, file)], {
    cwd: resolve(scriptsDir, '..'),
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    failed += 1;
    console.error(`[verify-all] FAIL ${rel} (exit ${r.status ?? 'signal'})`);
  }
}

if (failed) {
  console.error(`\n[verify-all] ${failed}/${files.length} failed`);
  process.exit(1);
}
console.log(`\n[verify-all] all ${files.length} checks passed`);
