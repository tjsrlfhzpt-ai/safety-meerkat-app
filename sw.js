/* ============================================================
   안전 미어캣 Pro — Service Worker
   ------------------------------------------------------------
   전략: 앱 셸(HTML/아이콘/핵심 CDN 스크립트)은 설치 시 미리 캐싱하고,
   이후 요청은 "캐시 우선 응답 + 백그라운드 갱신"(stale-while-revalidate)
   방식으로 처리합니다. 오프라인에서는 캐시로 폴백합니다.

   ⚠️ 파일을 수정한 뒤에는 반드시 CACHE_VERSION 문자열을 바꿔주세요.
   버전을 바꾸지 않으면 사용자 기기에 예전 버전이 계속 캐시된 채로
   남아 "업데이트했는데 옛날 화면이 보이는" 문제가 발생합니다.
   ============================================================ */
const CACHE_VERSION = 'safety-meerkat-shell-v5.18';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // 리소스 하나(특히 외부 CDN)가 실패해도 전체 설치가 죽지 않도록 개별 처리
      const results = await Promise.allSettled(
        CORE_ASSETS.map((url) => cache.add(new Request(url, { mode: url.startsWith('http') ? 'no-cors' : 'same-origin' })))
      );
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn('[SW] 사전캐싱 실패(무시하고 계속):', CORE_ASSETS[i], r.reason);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached); // 오프라인이면 캐시로 폴백

      return cached || network;
    })
  );
});
