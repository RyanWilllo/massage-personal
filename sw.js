
const CACHE = 'massage-personal-21ab2bdb0d81d241';
const BASE = "/massage-personal/";
const FILES = ["/massage-personal/index.html","/massage-personal/assets/index-RrbGSBom.css","/massage-personal/assets/Dashboard-hAhABgn6.css","/massage-personal/assets/Statistics-B_v_LHQz.css","/massage-personal/assets/DailyServiceList-Dc6CmAvm.css","/massage-personal/assets/RecordDetail-C9OUea3x.css","/massage-personal/assets/More-B6euJXjW.css","/massage-personal/assets/PageHeader-BY5I4r7b.css","/massage-personal/assets/Rules-BM6GbbV9.css","/massage-personal/assets/Projects-DOm22Jda.css","/massage-personal/assets/Settings-D7EhbUJZ.css","/massage-personal/assets/SettingsPageShell-DV1n8I1r.css","/massage-personal/assets/PageNavBar-DsPolgCO.css","/massage-personal/assets/PageState-DDiZPnF_.css","/massage-personal/assets/MenuCard-CURbwYsi.css","/massage-personal/assets/index-EmU9gYU5.js","/massage-personal/assets/Dashboard-QH_m8gZA.js","/massage-personal/assets/Statistics-_QOLL2eY.js","/massage-personal/assets/DailyServiceList-Cq6Cw4nj.js","/massage-personal/assets/RecordDetail-BVVhLsMK.js","/massage-personal/assets/records-MU4YTZfw.js","/massage-personal/assets/More-Cw_VnowX.js","/massage-personal/assets/PageHeader-BgyaRJMF.js","/massage-personal/assets/Rules-qsEEsELj.js","/massage-personal/assets/format-D4amIXh1.js","/massage-personal/assets/Projects-Cje8RwHb.js","/massage-personal/assets/useFeedback-BJ3j_tqL.js","/massage-personal/assets/Settings-C4HQetRK.js","/massage-personal/assets/SettingsPageShell-Cp-Xg7PS.js","/massage-personal/assets/PageNavBar-lnZuBIxj.js","/massage-personal/assets/PageState-C8Qp9Dv6.js","/massage-personal/assets/MenuCard-DQFUD1Kp.js","/massage-personal/icon-192.png","/massage-personal/icon-512.png","/massage-personal/apple-touch-icon.png","/massage-personal/manifest.webmanifest"];
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
