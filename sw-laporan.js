// Service worker Laporan Keuangan: bisa di-install DAN bisa dibuka offline.
// Yang disimpan di sini hanya "cangkang" aplikasi (HTML, ikon, font, library Firebase).
// Data keuangan TIDAK lewat sini: disimpan terpisah di IndexedDB oleh halaman.
const CACHE = 'laporan-v2';

// Aset lokal yang selalu disimpan saat install (gagal satu tidak membatalkan install).
const PRECACHE = ['./', 'manifest-laporan.json', 'ikon-laporan.png', 'logo.png'];

// Hanya host ini yang disimpan otomatis. Trafik database Firebase (firebaseio.com) sengaja dilewati.
const CACHEABLE_HOSTS = [
  self.location.hostname,
  'www.gstatic.com',        // firebase-app.js, firebase-database.js
  'fonts.googleapis.com',   // CSS font
  'fonts.gstatic.com'       // file font
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('laporan-') && k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;
  if (!CACHEABLE_HOSTS.includes(url.hostname)) return; // biarkan browser menangani sisanya

  event.respondWith(networkFirst(req));
});

// Network-first: online selalu dapat versi terbaru, offline dapat salinan terakhir.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await cache.match('./');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
