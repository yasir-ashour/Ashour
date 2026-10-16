/* ============================================
   Service Worker - مركز عاشور للتجارة
   يجعل الموقع يعمل بدون إنترنت
   ============================================ */

const CACHE_VERSION = 'ashour-v1.0.0';
const CACHE_NAME = `ashour-cache-${CACHE_VERSION}`;
const OFFLINE_URL = 'offline.html';

// الملفات الأساسية التي تُحفظ للتشغيل بدون إنترنت
const CORE_ASSETS = [
  '/Ashour/',
  '/Ashour/index.html',
  '/Ashour/offline.html',
  '/Ashour/manifest.json',
  '/Ashour/logo.png',
  '/Ashour/catalog-data.js'
];

/* ============================================
   التثبيت - تحميل الملفات الأساسية
   ============================================ */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching core assets');
        return cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[Service Worker] Failed to cache some assets:', err);
      })
  );
});

/* ============================================
   التنشيط - حذف الكاشات القديمة
   ============================================ */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('ashour-cache-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

/* ============================================
   الجلب - استراتيجيات مختلفة
   ============================================ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات التي ليست GET
  if (request.method !== 'GET') return;

  // تجاهل الطلبات الخارجية (API, ImgBB, Google Fonts)
  const externalHosts = [
    'api.imgbb.com',
    'api.github.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
    'cdn.tailwindcss.com',
    'images.weserv.nl',
    'wsrv.nl'
  ];
  
  if (externalHosts.some(host => url.hostname.includes(host))) {
    return; // اتركها تمر مباشرة
  }

  // تجاهل طلبات Chrome extensions
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // استراتيجية مختلفة حسب نوع الملف
  if (request.mode === 'navigate' || request.destination === 'document') {
    // صفحات HTML: Network First
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
            .then((offline) => offline || caches.match('/Ashour/index.html'));
        })
    );
    return;
  }

  // ملفات ثابتة (CSS, JS, صور): Cache First
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          // حدّث الكاش في الخلفية (Stale While Revalidate)
          fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
              }
            })
            .catch(() => { /* تجاهل */ });
          return cached;
        }

        // إذا لم يكن محفوظًا، اجلبه من الإنترنت
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(() => {
            // إذا فشل الكل، وأكان طلب صورة، أظهر بديلًا
            if (request.destination === 'image') {
              return caches.match('/Ashour/logo.png');
            }
            throw new Error('Offline');
          });
      })
  );
});

/* ============================================
   رسائل من الصفحة الرئيسية
   ============================================ */
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Loaded');
