
const CACHE = 'massage-personal-45908d7255e1710d';
const BASE = "/massage-personal/";
const FILES = ["/massage-personal/index.html","/massage-personal/assets/index-B6SQkQOG.css","/massage-personal/assets/Dashboard-C5s7a7uG.css","/massage-personal/assets/Statistics--wnm7OJe.css","/massage-personal/assets/DailyServiceList-Cx5SQR7c.css","/massage-personal/assets/RecordDetail-11DK9io6.css","/massage-personal/assets/More-B6euJXjW.css","/massage-personal/assets/PageHeader-wShYbPD-.css","/massage-personal/assets/Rules-DZ6R8o9U.css","/massage-personal/assets/Projects-smZC8RQ5.css","/massage-personal/assets/Settings-AUAPn7Ng.css","/massage-personal/assets/SettingsPageShell-DV1n8I1r.css","/massage-personal/assets/PageNavBar-DnuWFTya.css","/massage-personal/assets/PageState-BAnpA26f.css","/massage-personal/assets/MenuCard-CURbwYsi.css","/massage-personal/assets/index-C7eGbfoF.js","/massage-personal/assets/Dashboard-D4fNuiZ9.js","/massage-personal/assets/Statistics-2zWG-JOJ.js","/massage-personal/assets/DailyServiceList-Dc_8j50N.js","/massage-personal/assets/RecordDetail-DY4e4pf_.js","/massage-personal/assets/records-DYR7SE-B.js","/massage-personal/assets/More-Dg2cqMV2.js","/massage-personal/assets/PageHeader-7fPaM7Y_.js","/massage-personal/assets/Rules-B9B24Z7u.js","/massage-personal/assets/format-D4amIXh1.js","/massage-personal/assets/Projects-CMpCe8IB.js","/massage-personal/assets/useFeedback-BfmYgWwe.js","/massage-personal/assets/Settings-C2FxCzsS.js","/massage-personal/assets/SettingsPageShell-Bm1iSiH0.js","/massage-personal/assets/PageNavBar-3wwlBgr3.js","/massage-personal/assets/PageState-PrhVii16.js","/massage-personal/assets/MenuCard-H0flRXcQ.js","/massage-personal/icon-192.png","/massage-personal/icon-512.png","/massage-personal/apple-touch-icon.png","/massage-personal/manifest.webmanifest"];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  try { await cache.addAll(FILES); } catch (error) { await caches.delete(CACHE); throw error; }
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('massage-personal-') && key !== CACHE).map(key => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(BASE + 'index.html')).then(response => response || fetch(event.request)));
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(response => response || fetch(event.request)));
  }
});
