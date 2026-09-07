// Service Worker for Push Notifications & Offline Cache - Plantão Pro
// IMPORTANT: bump APP_VERSION on every UI/theme/header/footer release so that
// installed clients evict the previous cached shell and apply changes without
// reload loops.
// Service Worker for Push Notifications & Offline Cache - Plantão Pro
// IMPORTANT: bump APP_VERSION on every UI/theme/header/footer release so that
// installed clients evict the previous cached shell and apply changes without
// reload loops.
const APP_VERSION = 'v20-2026-07-12-pwa-title-fix';
const STATIC_CACHE = `plantao-pro-static-${APP_VERSION}`;
const DYNAMIC_CACHE = `plantao-pro-dynamic-${APP_VERSION}`;
const VALID_CACHES = new Set([STATIC_CACHE, DYNAMIC_CACHE]);

// Only truly static binary assets are precached. HTML, JS and CSS are NEVER
// precached/cached so theme + layout changes always reach the user.
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
  '/apple-touch-icon.png'
];

// Install: precache only safe binary assets, then activate immediately.
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', APP_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('[SW] Some static assets failed to cache:', err);
      })
    )
  );
  self.skipWaiting();
});

// Activate: nuke every cache that doesn't match the current APP_VERSION,
// then notify open clients ONCE so they can refresh without loops.
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', APP_VERSION);
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    // 1) Delete any cache from a previous APP_VERSION
    await Promise.all(
      cacheNames
        .filter((name) => !VALID_CACHES.has(name))
        .map((name) => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
    );
    // 2) Defensive: purge index.html, root navigation and splash assets from
    //    any remaining cache (including current-version caches), so a stale
    //    HTML/splash response can never resurface after an update.
    const purgePatterns = [
      /\/index\.html(\?|$)/i,
      /\/$/,
      /plantaopro-splash\.(avif|webp|jpg|jpeg|png)(\?|$)/i,
    ];
    const remaining = await caches.keys();
    await Promise.all(remaining.map(async (name) => {
      const cache = await caches.open(name);
      const reqs = await cache.keys();
      await Promise.all(reqs.map((req) => {
        if (purgePatterns.some((rx) => rx.test(req.url))) {
          console.log('[SW] Purging stale entry:', req.url, 'from', name);
          return cache.delete(req);
        }
        return Promise.resolve();
      }));
    }));
    await self.clients.claim();
    const wins = await self.clients.matchAll({ type: 'window' });
    wins.forEach((client) => client.postMessage({ type: 'SW_ACTIVATED', version: APP_VERSION }));
  })());
});


// ---------------------------------------------------------------------------
// Fetch strategy (coherent + timeout-safe)
// ---------------------------------------------------------------------------
// - Navigations (HTML)   : network-first with 4s timeout, no caching
// - Supabase /auth/v1    : pass-through (never cache, never intercept errors)
// - Supabase other GETs  : stale-while-revalidate (SWR) with 6s timeout
// - Same-origin static   : cache-first (images/fonts/audio)
// - Same-origin JS/CSS   : stale-while-revalidate (fast repeat loads)
// - Everything else      : network pass-through
// ---------------------------------------------------------------------------

const NAV_TIMEOUT_MS = 4000;
const API_TIMEOUT_MS = 6000;

function timedFetch(request, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('sw-timeout')), ms);
    fetch(request)
      .then((r) => { clearTimeout(t); resolve(r); })
      .catch((e) => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1) HTML navigations: network-first w/ timeout, no cache write
  if (request.mode === 'navigate') {
    event.respondWith(
      timedFetch(request, NAV_TIMEOUT_MS).catch(
        () => new Response(
          '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
          '<body style="background:#0a0f1a;color:#f59e0b;font-family:sans-serif;' +
          'display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">' +
          '<div><h1>Sem conexão</h1><p>Recarregue quando a rede voltar.</p></div>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      )
    );
    return;
  }

  // 2) Supabase auth: never touch
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/auth/v1')) {
    return; // let the browser handle it directly
  }

  // 3) Supabase data GETs: stale-while-revalidate
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE, API_TIMEOUT_MS));
    return;
  }

  // 4) Same-origin
  if (url.origin === self.location.origin) {
    if (isStaticAsset(url.pathname)) {
      event.respondWith(cacheFirst(request));
    } else if (/\.(js|css|json)$/.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE, API_TIMEOUT_MS));
    }
    // otherwise: let browser handle
    return;
  }
});

function isStaticAsset(pathname) {
  return /\.(png|jpe?g|gif|svg|ico|woff2?|ttf|otf|mp3|mp4)$/i.test(pathname);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await timedFetch(request, API_TIMEOUT_MS);
    if (res.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

// Stale-while-revalidate: serve cache instantly, refresh in background.
// If no cache exists, wait for network (with timeout) and cache on success.
async function staleWhileRevalidate(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = timedFetch(request, timeoutMs)
    .then((res) => {
      if (res && res.ok) {
        cache.put(request, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    // fire-and-forget refresh
    networkPromise.catch(() => {});
    return cached;
  }

  const fresh = await networkPromise;
  if (fresh) return fresh;

  return new Response(
    JSON.stringify({ error: 'offline', cached: false }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}


// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'Plantão Pro',
    body: 'Você tem uma nova notificação',
    icon: '/icon-192.png',
    badge: '/favicon.ico',
    tag: 'default',
    url: '/agent-panel'
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/agent-panel',
      type: data.type || 'general'
    },
    actions: getActionsForType(data.type),
    requireInteraction: true,
    tag: data.tag || 'plantao-pro-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Get appropriate actions based on notification type
function getActionsForType(type) {
  switch (type) {
    case 'birthday':
      return [
        { action: 'view', title: '🎉 Ver Perfil' },
        { action: 'close', title: 'Fechar' }
      ];
    case 'shift':
      return [
        { action: 'view', title: '📋 Ver Plantão' },
        { action: 'close', title: 'Fechar' }
      ];
    case 'shift-reminder':
      return [
        { action: 'view', title: '⏰ Ver Detalhes' },
        { action: 'close', title: 'Fechar' }
      ];
    default:
      return [
        { action: 'view', title: 'Ver' },
        { action: 'close', title: 'Fechar' }
      ];
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/agent-panel';

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(url);
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// Periodic sync for background checks (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNotifications());
  }
  if (event.tag === 'sync-data') {
    event.waitUntil(syncCachedData());
  }
});

async function checkForNotifications() {
  console.log('[SW] Checking for notifications...');
}

async function syncCachedData() {
  console.log('[SW] Syncing cached data...');
  // This would sync any pending offline changes
}

// Background sync for pending offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-pending-changes') {
    event.waitUntil(syncPendingChanges());
  }
});

async function syncPendingChanges() {
  console.log('[SW] Syncing pending changes...');
  // Notify clients that we're syncing
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_STARTED' });
  });
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, url, notificationType } = event.data;
    
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: tag || 'message-notification',
      data: { url: url || '/agent-panel', type: notificationType },
      actions: getActionsForType(notificationType),
      requireInteraction: true,
      renotify: true
    });
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
});
