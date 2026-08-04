import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// 启动信号：bundle.js 一旦被浏览器执行就立刻置 true
// （boot 诊断用这个区分「bundle 没下载到」vs「下载了但渲染挂掉」）
window.__KOBO_BOOTED = true;

export const KOBO_NATIVE = (() => {
  const cap = window.Capacitor || Capacitor;
  const isNative = !!cap?.isNativePlatform?.();
  if (isNative) {
    const target = window.Capacitor || cap;
    target.Plugins = {
      ...(target.Plugins || {}),
      Filesystem,
      LocalNotifications,
      SpeechRecognition,
    };
    window.Capacitor = target;
  }
  window.KOBO_NATIVE = { Capacitor: cap, Filesystem, Directory, LocalNotifications, SpeechRecognition, isNative };
  return window.KOBO_NATIVE;
})();

export { Capacitor, Filesystem, Directory, LocalNotifications, SpeechRecognition };
