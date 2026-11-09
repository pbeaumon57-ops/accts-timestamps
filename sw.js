// Offline support. With signal, pages and files always load fresh (so updates show straight away) and a copy is
// saved on the phone. With no signal, or a very slow one, the saved copy is used instead.
const C = 'accts-v11';
const FILES = ['./', 'index.html', 'lead.html', 'style.css', 'config.js', 'common.js', 'manifest.json',
  'icon-180.png', 'icon-192.png', 'icon-512.png',
  'vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js', 'vendor/firebase-firestore-compat.js', 'vendor/firebase-functions-compat.js', 'vendor/jsQR.js', 'vendor/qrcode.js', 'functions/profiles.js'];
const WAIT_MS = 4000; // how long to wait for the network before using the saved copy

self.addEventListener('install', (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Firebase traffic goes straight to the network
  if (/\/demo\.html$/.test(url.pathname)) return; // the shareable demo isn't part of the app: never save it
  e.respondWith((async () => {
    const c = await caches.open(C);
    const saved = () => c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request, { cache: 'no-cache' }).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; });
    try {
      return await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('slow')), WAIT_MS))]);
    } catch (err) {
      return (await saved()) || net; // offline or slow: saved copy, else keep waiting for the network
    }
  })());
});
