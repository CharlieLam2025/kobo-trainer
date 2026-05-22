// 口播练习器 service worker
// 策略：app shell + 字体走 cache-first；CDN 资源走 stale-while-revalidate；其它走 network-first。
const CACHE = 'kobo-trainer-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './fonts/YandexSansDisplay-Bold.woff2',
  './fonts/YandexSansDisplay-Regular.woff2',
  './fonts/YandexSansDisplay-Light.woff2',
  './fonts/YandexSansText-Bold.woff2',
  './fonts/YandexSansText-Medium.woff2',
  './fonts/YandexSansText-Regular.woff2',
  './fonts/YandexSansText-Light.woff2',
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
  // Don't intercept the DeepSeek API or anything POSTish
  if (e.request.method !== 'GET') return;
  if (/api\.deepseek\.com/i.test(url.host)) return;

  // CDN libs (tailwind / react / babel): stale-while-revalidate
  if (/cdn\.tailwindcss\.com|unpkg\.com|jsdelivr\.net/i.test(url.host)) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        const fetched = fetch(e.request).then(r => {
          if (r.ok) cache.put(e.request, r.clone());
          return r;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  // App shell + fonts + icons: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
      if (r.ok && r.type === 'basic') {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return r;
    }).catch(() => caches.match('./index.html')))
  );
});
