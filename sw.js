const CACHE_NAME = 'achero-trazabilidad-v1.3.7';
const ASSETS = [
  './menu-soldadura.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './assets/icon.svg',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap',
  './js/jsQR.min.js',
  './js/qrious.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (event.request.method !== 'GET') return;

  // Bypass cache for Google Apps Script API
  if (url.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'network_error' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp && resp.ok) {
          const sameOrigin = new URL(event.request.url).origin === self.location.origin;
          if (sameOrigin) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
        }
        return resp;
      });
    })
  );
});
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});


self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => (k === CACHE_NAME ? null : caches.delete(k)))
    )).then(() => self.clients.claim())
  );
});
