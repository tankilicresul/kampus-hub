// KAMPÜS HUB — Service Worker
// Sürüm: 2026-07-24 (bu satırı değiştirmek SW güncellemesini tetikler)
const CACHE_NAME = 'kampus-hub-v4';

// ── Install: hemen kontrolü al ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate: eski cache'leri temizle, tüm client'ları devral ────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Network-first, cache fallback ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini yakala
  if (event.request.method !== 'GET') return;

  // Chrome extension isteklerini atla
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı yanıtı cache'e ekle (html hariç — html her zaman taze olmalı)
        if (response.ok && !event.request.url.includes('supabase')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network yoksa cache'ten dön
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/') || new Response('Çevrimdışısınız.', { status: 503 });
          }
          return new Response('', { status: 503 });
        });
      })
  );
});

// ── Push Notification: Arka planda bildirim göster ───────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Kampüs Hub', body: event.data.text() };
  }

  const title = data.title || 'Kampüs Hub';
  const options = {
    body: data.body || '',
    icon: '/logo.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'kampus-hub-notif',
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Aç' },
      { action: 'dismiss', title: 'Kapat' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click: Uygulamayı aç ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Uygulama zaten açıksa odaklan
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if (client.navigate) client.navigate(targetUrl);
            return;
          }
        }
        // Kapalıysa yeni pencere aç
        return clients.openWindow(targetUrl);
      })
  );
});

// ── Skip Waiting Message: Sayfa güncelleme isteği ────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
