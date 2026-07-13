import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'src/app.jsx'), 'utf8');

for (const marker of [
  "const CAMERA_PREFS_KEY = 'kobo.cameraPreferences.v1'",
  'const cameraVideoConstraints',
  'const CAMERA_OUTPUT_WIDTH = 720',
  'const CAMERA_OUTPUT_HEIGHT = 1280',
  'const getCoverCrop',
  'const formatMediaDeviceError',
  'const switchCamera = useCallback',
  'const cameraSessionRef = useRef(0)',
  "data-testid=\"switch-camera\"",
  "data-testid=\"toggle-mirror\"",
  "data-testid=\"toggle-composition-guide\"",
  "data-testid=\"camera-device-check\"",
  "data-testid=\"composition-guide\"",
  "previewMirrored: cameraFacing === 'user' && mirrorPreview",
  '摄像头或麦克风权限被关闭',
  '居中裁成真正的 9:16',
]) {
  assert.ok(source.includes(marker), `src/app.jsx missing camera experience marker: ${marker}`);
}

const cameraHook = source.slice(source.indexOf('function useCamera()'), source.indexOf('function useRecorder()'));
assert.ok(!cameraHook.includes('ctx.scale(-1, 1)'), 'recording canvas must not burn selfie mirroring into video');
assert.ok(cameraHook.includes('videoElRef.current.srcObject = canvasStream'), 'preview must use the processed recording stream');
assert.ok(cameraHook.includes('audio: false'), 'camera switching must preserve the existing microphone track');
assert.ok(cameraHook.includes('sessionId !== cameraSessionRef.current'), 'late camera-switch results must not revive a stopped session');
assert.ok(cameraHook.includes('ctx.drawImage(hv, crop.x, crop.y, crop.width, crop.height, 0, 0, W, H)'), 'recording output must use the same centered 9:16 crop as preview');

const frameUsages = [...source.matchAll(/<CameraFrame\b[^>]*>/g)].map(match => match[0]);
assert.ok(frameUsages.length >= 5, `expected at least 5 CameraFrame usages, found ${frameUsages.length}`);
assert.ok(frameUsages.every(usage => usage.includes('cam={cam}')), 'every CameraFrame usage must receive shared camera controls');

const readyUsages = [...source.matchAll(/<ReadyOverlay\b[^>]*\/>/g)].map(match => match[0]);
assert.ok(readyUsages.length >= 3, `expected at least 3 ReadyOverlay usages, found ${readyUsages.length}`);
assert.ok(readyUsages.every(usage => usage.includes('cam={cam}')), 'every ReadyOverlay usage must receive device status and camera controls');

console.log('Camera switching, preview, composition guide and device preflight verified.');
