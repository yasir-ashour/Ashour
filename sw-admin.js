const CACHE_NAME = 'ashour-admin-v1';
const urlsToCache = [
  './admin.html',
  './logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // تجاهل طلبات الـ API حتى لا تتعطل لوحة التحكم
  if (event.request.url.includes('api.github.com') || event.request.url.includes('api.imgbb.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// 🌟 الكود الجديد: التفاعل مع النقر على الإشعار
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // إغلاق الإشعار عند الضغط عليه

  // فتح لوحة التحكم أو التركيز عليها إذا كانت مفتوحة
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // إذا كانت لوحة التحكم مفتوحة بالفعل، قم بجعلها في المقدمة
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('admin.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // إذا لم تكن مفتوحة، افتحها في نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow('./admin.html');
      }
    })
  );
});
