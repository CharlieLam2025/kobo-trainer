import { spawnSync } from 'node:child_process';

const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 'C:\\Android\\sdk';
const result = spawnSync('npx', ['cap', 'sync', 'android'], {
  env: {
    ...process.env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
