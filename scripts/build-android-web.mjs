import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('node', ['build.mjs']);
run('node', ['scripts/prepare-android-web.mjs']);
run('node', ['scripts/verify-android-package.mjs']);
