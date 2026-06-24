import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'capacitor.config.json',
  'www/index.html',
  'www/bundle.js',
  'www/styles.css',
  'www/sw.js',
  'www/manifest.webmanifest',
  'www/vendor/react.production.min.js',
  'www/vendor/react-dom.production.min.js',
  'www/icons/icon-192.png',
  'www/icons/icon-512.png',
  'www/mediapipe/vision_bundle.mjs',
  'www/mediapipe/vision_wasm_internal.wasm',
  'www/mediapipe/face_landmarker.task',
  'www/mediapipe/selfie_segmenter.tflite',
];

const forbiddenInWww = [
  'www/src',
  'www/node_modules',
  'www/.git',
  'www/output',
  'www/docs',
];

function fail(message) {
  console.error(`[verify-android] ${message}`);
  process.exitCode = 1;
}

for (const rel of requiredFiles) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    fail(`missing required file: ${rel}`);
    continue;
  }
  if (statSync(abs).isFile() && statSync(abs).size === 0) {
    fail(`empty required file: ${rel}`);
  }
}

for (const rel of forbiddenInWww) {
  if (existsSync(join(root, rel))) {
    fail(`www contains source or non-runtime directory: ${rel}`);
  }
}

if (existsSync(join(root, 'capacitor.config.json'))) {
  const config = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));
  if (config.appId !== 'com.charlielam.kobotrain') fail('unexpected Capacitor appId');
  if (config.appName !== '口播练习器') fail('unexpected Capacitor appName');
  if (config.webDir !== 'www') fail('Capacitor webDir must be www');
}

if (existsSync(join(root, 'index.html'))) {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  if (!html.includes('window.Capacitor')) {
    fail('index.html should gate service worker registration in Capacitor');
  }
}

if (existsSync(join(root, 'src/app.jsx'))) {
  const app = readFileSync(join(root, 'src/app.jsx'), 'utf8');
  for (const needle of [
    '@capacitor/filesystem',
    '@capacitor/local-notifications',
    '@capacitor-community/speech-recognition',
    'KOBO_NATIVE',
    'Filesystem.writeFile',
    'Directory.Documents',
  ]) {
    if (!app.includes(needle)) fail(`src/app.jsx missing native bridge marker: ${needle}`);
  }
}

if (existsSync(join(root, 'package.json'))) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  for (const script of ['build:web', 'prepare:android-web', 'build:android-web', 'android:sync', 'android:apk', 'android:apk:release']) {
    if (!pkg.scripts?.[script]) fail(`missing package script: ${script}`);
  }
  for (const dep of ['@capacitor/core', '@capacitor/android', '@capacitor/filesystem', '@capacitor/local-notifications', '@capacitor-community/speech-recognition']) {
    if (!pkg.dependencies?.[dep]) fail(`missing runtime dependency: ${dep}`);
  }
  if (!pkg.devDependencies?.['@capacitor/cli']) fail('missing dev dependency: @capacitor/cli');
}

if (existsSync(join(root, 'android/app/src/main/AndroidManifest.xml'))) {
  const manifest = readFileSync(join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
  for (const permission of [
    'android.permission.INTERNET',
    'android.permission.RECORD_AUDIO',
    'android.permission.CAMERA',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.WAKE_LOCK',
  ]) {
    if (!manifest.includes(permission)) fail(`AndroidManifest.xml missing permission: ${permission}`);
  }
  for (const feature of ['android.hardware.camera.any', 'android.hardware.microphone']) {
    if (!manifest.includes(feature)) fail(`AndroidManifest.xml missing feature declaration: ${feature}`);
  }
}

if (existsSync(join(root, 'android/app/src/main/res'))) {
  const notificationIcon = join(root, 'android/app/src/main/res/drawable/ic_stat_icon_config_sample.xml');
  if (!existsSync(notificationIcon)) fail('missing Android notification icon drawable');
}

if (!process.exitCode) {
  console.log('[verify-android] Android packaging checks passed');
}
