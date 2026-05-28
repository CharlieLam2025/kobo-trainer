// 口播练习器 service worker
// v3: 不再依赖任何外部 CDN · 所有首屏资源同源 · 第一次访问也能离线
// 策略：app shell + vendor + bundle 都走 cache-first；其它走 network-first
const CACHE = 'kobo-trainer-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  // 本地化的关键运行时（替代 jsdelivr / unpkg）
  './vendor/react.production.min.js',
  './vendor/react-dom.production.min.js',
  // 预编译产物：JS 走 esbuild · CSS 走 Tailwind CLI（仅含实际用到的 class）
  './bundle.js',
  './styles.css',
  // 字体
  './fonts/YandexSansDisplay-Bold.woff2',
  './fonts/YandexSansDisplay-Regular.woff2',
  './fonts/YandexSansDisplay-Light.woff2',
  './fonts/YandexSansText-Bold.woff2',
  './fonts/YandexSansText-Medium.woff2',
  './fonts/YandexSansText-Regular.woff2',
  './fonts/YandexSansText-Light.woff2',
  // 图标
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 不拦截 DeepSeek API 或任何非 GET
  if (e.request.method !== 'GET') return;
  if (/api\.deepseek\.com/i.test(url.host)) return;
  // Sentry 上报也不缓存（即便 DSN 配上了）
  if (/sentry/i.test(url.host)) return;

  // 同源资源（app shell + vendor + bundle + mediapipe + fonts + icons）: cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
        if (r.ok && r.type === 'basic') {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // 第三方资源（理论上现在已经没有首屏依赖了）：network-first
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
