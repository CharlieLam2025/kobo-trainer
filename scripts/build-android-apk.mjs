import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 'C:\\Android\\sdk';
const env = {
  ...process.env,
  ANDROID_HOME: sdkRoot,
  ANDROID_SDK_ROOT: sdkRoot,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('node', ['scripts/build-android-web.mjs']);

if (!existsSync(join(root, 'android'))) {
  run('npx', ['cap', 'add', 'android']);
} else {
  run('npx', ['cap', 'sync', 'android']);
}

run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['assembleDebug'], {
  cwd: join(root, 'android'),
});

const apk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
console.log(`[android:apk] ${apk}`);
