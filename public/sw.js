const STATIC_CACHE = 'elyo-static-v1'
const RUNTIME_CACHE = 'elyo-runtime-v1'
const OFFLINE_URL = '/offline.html'
const CHECKIN_SYNC_TAG = 'checkin-sync'
const DB_NAME = 'elyo-offline'
const DB_VERSION = 1
const STORE_NAME = 'checkins'

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openCheckinDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

function getAllCheckins(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

function deleteCheckin(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = (e) => reject(e.target.error)
  })
}

// ── Install: precache offline page ──────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL]))
  )
  self.skipWaiting()
})

// ── Activate: clear old caches ───────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first for API, stale-while-revalidate for navigation ──────

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request)
      const fetchPromise = fetch(event.request)
        .then((res) => {
          if (res.ok) cache.put(event.request, res.clone())
          return res
        })
        .catch(() => null)
      return cached ?? (await fetchPromise) ?? caches.match(OFFLINE_URL)
    })
  )
})

// ── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === CHECKIN_SYNC_TAG) {
    event.waitUntil(syncOfflineCheckins())
  }
})

async function syncOfflineCheckins() {
  const db = await openCheckinDB()
  const items = await getAllCheckins(db)
  for (const item of items) {
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      })
      if (res.ok) await deleteCheckin(db, item.id)
    } catch {
      // retry on next sync
    }
  }
}

// ── Push Notifications (Phase 2.7) ──────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'ELYO'
  const options = {
    body: data.body ?? '',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    data: { url: data.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
